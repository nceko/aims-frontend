import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import { runtimeConfig } from '@/config/runtime'
import { endpoints } from '@/config/endpoints'
import { tokenStorage } from './token-storage'
import { deviceName } from '@/utils/device-name'
import {
  bearerTokenFor,
  createIdempotencyKey,
  createRequestID,
  isFormData,
  isPublicPath,
  isUrlSearchParams,
  needsIdempotencyKey,
  requestPath,
  requiresBearerToken,
} from './request-policy'

interface RetriableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean
}

const refreshHttp = axios.create({
  baseURL: runtimeConfig.apiBaseUrl,
  timeout: runtimeConfig.apiTimeout,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

export const http = axios.create({
  baseURL: runtimeConfig.apiBaseUrl,
  timeout: runtimeConfig.apiTimeout,
  headers: { Accept: 'application/json' },
})

let refreshing: Promise<string> | null = null

const TRANSIENT_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])

/**
 * Gangguan jaringan, CORS/proxy sementara, timeout, dan masa restart backend tidak
 * boleh dianggap sebagai logout. Token tetap disimpan agar sesi dapat pulih sendiri.
 */
export function isTransientHttpError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  if (error.response) return TRANSIENT_HTTP_STATUSES.has(error.response.status)
  return (
    Boolean(error.request) ||
    ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(error.code ?? '')
  )
}

/** Hanya penolakan eksplisit dari endpoint autentikasi yang mengakhiri sesi. */
export function isSessionRejected(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  return [400, 401, 403].includes(error.response?.status ?? 0)
}

function ensureHeaders(config: InternalAxiosRequestConfig): AxiosHeaders {
  if (config.headers instanceof AxiosHeaders) return config.headers
  const headers = new AxiosHeaders(config.headers)
  config.headers = headers
  return headers
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.refreshToken()
  if (!refreshToken) throw new Error('Refresh token tidak tersedia.')

  const response = await refreshHttp.post(endpoints.auth.refresh, { refresh_token: refreshToken })
  const payload = response.data?.data ?? response.data
  const accessToken = String(payload.access_token || '')
  const nextRefreshToken = String(payload.refresh_token || refreshToken)
  if (!accessToken) throw new Error('Access token baru tidak tersedia.')
  tokenStorage.setSession(accessToken, nextRefreshToken)
  return accessToken
}

function sharedRefreshAccessToken(): Promise<string> {
  refreshing ??= refreshAccessToken().finally(() => {
    refreshing = null
  })
  return refreshing
}

/** Memulihkan access token dari refresh token tanpa menggandakan request refresh. */
export async function restoreAccessToken(): Promise<string> {
  const accessToken = tokenStorage.accessToken()
  if (accessToken) return accessToken
  return sharedRefreshAccessToken()
}

function expireBrowserSession(): void {
  tokenStorage.clear()
  // Memory history menjaga URL browser tetap pada root. Reload root akan membuka
  // halaman login secara internal setelah token yang ditolak sudah dibersihkan.
  window.location.assign('/')
}

http.interceptors.request.use((config) => {
  const headers = ensureHeaders(config)
  const path = requestPath(config.url)

  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  // Correlation ID dibuat di client agar log frontend, proxy, dan backend dapat
  // ditelusuri dengan nilai yang sama. Nilai dipertahankan saat Axios retry.
  if (!headers.has('X-Request-ID')) headers.set('X-Request-ID', createRequestID())

  // Login history menyimpan nama perangkat dalam format ringkas dan aman,
  // misalnya: Chrome 150 / Windows / Desktop.
  if (path === requestPath(endpoints.auth.login) && !headers.has('X-Device-Name')) {
    headers.set('X-Device-Name', deviceName())
  }

  // Public company, login, dan refresh tidak boleh menerima Bearer token.
  // Semua endpoint /api/v1 lain memakai access token aktif; switch-context awal
  // memakai initial token karena access token final belum tersedia.
  const token = bearerTokenFor(path)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  else {
    headers.delete('Authorization')
    if (requiresBearerToken(path)) {
      throw new AxiosError(
        'Access token tidak tersedia. Silakan login kembali.',
        'AUTH_TOKEN_MISSING',
        config,
      )
    }
  }

  // Biarkan browser membuat multipart boundary untuk FormData.
  if (isFormData(config.data)) {
    headers.delete('Content-Type')
  } else if (isUrlSearchParams(config.data)) {
    headers.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8')
  } else if (config.data !== undefined && config.data !== null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  // Satu key untuk satu operasi bisnis. Header yang sama dipertahankan ketika retry.
  if (
    runtimeConfig.enableIdempotencyHeader &&
    needsIdempotencyKey(config.method, path) &&
    !headers.has('Idempotency-Key')
  ) {
    headers.set('Idempotency-Key', createIdempotencyKey())
  }

  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as RetriableRequest | undefined
    const path = requestPath(request?.url)
    const refreshToken = tokenStorage.refreshToken()

    if (
      error.response?.status !== 401 ||
      !request ||
      request._retry ||
      isPublicPath(path) ||
      !refreshToken
    ) {
      return Promise.reject(error)
    }

    request._retry = true
    try {
      const token = await sharedRefreshAccessToken()
      ensureHeaders(request).set('Authorization', `Bearer ${token}`)
      return http(request)
    } catch (refreshError) {
      // Backend yang sedang restart biasanya memberi network error/502/503.
      // Hanya refresh token yang ditolak secara eksplisit yang boleh logout.
      if (isSessionRejected(refreshError)) expireBrowserSession()
      return Promise.reject(refreshError)
    }
  },
)
