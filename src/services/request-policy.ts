import type { Method } from 'axios'
import { runtimeConfig } from '@/config/runtime'
import { tokenStorage } from './token-storage'

const PUBLIC_PREFIX = '/public/'
const AUTH_WITHOUT_BEARER = new Set(['/api/v1/auth/login', '/api/v1/auth/refresh'])
const AUTH_PREFIX = '/api/v1/auth/'
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function requestPath(url?: string): string {
  if (!url) return ''
  try {
    const base = runtimeConfig.apiBaseUrl || window.location.origin
    return new URL(url, base).pathname
  } catch {
    return url.split('?')[0] ?? url
  }
}

export function isPublicPath(url?: string): boolean {
  const path = requestPath(url)
  return path.startsWith(PUBLIC_PREFIX) || AUTH_WITHOUT_BEARER.has(path)
}

export function isAuthPath(url?: string): boolean {
  return requestPath(url).startsWith(AUTH_PREFIX)
}

export function requiresBearerToken(url?: string): boolean {
  const path = requestPath(url)
  return path.startsWith('/api/v1/') && !isPublicPath(path)
}

export function bearerTokenFor(url?: string): string | null {
  if (isPublicPath(url)) return null
  return tokenStorage.accessToken() || tokenStorage.initialToken()
}

export function isMutation(method?: Method | string): boolean {
  return MUTATING_METHODS.has(String(method || 'GET').toUpperCase())
}

/**
 * Endpoint bisnis yang mengubah data memperoleh satu Idempotency-Key per request.
 * Key tetap menempel pada config Axios ketika request di-retry setelah refresh token,
 * sehingga backend tidak memproses transaksi yang sama dua kali.
 */
export function needsIdempotencyKey(method?: Method | string, url?: string): boolean {
  const path = requestPath(url)
  return isMutation(method) && path.startsWith('/api/v1/') && !isAuthPath(path)
}

export function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random()
    .toString(16)
    .slice(2)}`
}

export function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData
}

export function isUrlSearchParams(value: unknown): value is URLSearchParams {
  return typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams
}
