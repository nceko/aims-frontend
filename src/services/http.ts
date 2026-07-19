import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { runtimeConfig } from '@/config/runtime'
import { endpoints } from '@/config/endpoints'
import { tokenStorage } from './token-storage'

interface RetriableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean
}

export const http = axios.create({
  baseURL: runtimeConfig.apiBaseUrl,
  timeout: runtimeConfig.apiTimeout,
  headers: { Accept: 'application/json' },
})

let refreshing: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.refreshToken()
  if (!refreshToken) throw new Error('Refresh token tidak tersedia.')

  const response = await axios.post(
    `${runtimeConfig.apiBaseUrl}${endpoints.auth.refresh}`,
    { refresh_token: refreshToken },
    { timeout: runtimeConfig.apiTimeout },
  )
  const payload = response.data?.data ?? response.data
  const accessToken = String(payload.access_token || '')
  const nextRefreshToken = String(payload.refresh_token || refreshToken)
  if (!accessToken) throw new Error('Access token baru tidak tersedia.')
  tokenStorage.setSession(accessToken, nextRefreshToken)
  return accessToken
}

http.interceptors.request.use((config) => {
  const token = tokenStorage.accessToken() || tokenStorage.initialToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as RetriableRequest | undefined
    const isAuthEndpoint =
      request?.url?.includes('/auth/login') || request?.url?.includes('/auth/refresh')

    if (error.response?.status !== 401 || !request || request._retry || isAuthEndpoint) {
      return Promise.reject(error)
    }

    request._retry = true
    try {
      refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null
      })
      const token = await refreshing
      request.headers.Authorization = `Bearer ${token}`
      return http(request)
    } catch (refreshError) {
      tokenStorage.clear()
      if (window.location.pathname !== '/login') window.location.assign('/login')
      return Promise.reject(refreshError)
    }
  },
)
