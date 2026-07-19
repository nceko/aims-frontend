import type { ApiEnvelope, PaginatedResponse } from '@/types/api'

export function unwrapData<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const wrapped = payload as ApiEnvelope<T>
    if (wrapped.data !== undefined) return wrapped.data
  }
  return payload as T
}

export function normalizeList<T>(payload: unknown): T[] {
  const data = unwrapData(payload as ApiEnvelope<unknown>)
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object') {
    const candidate = data as Partial<PaginatedResponse<T>> & {
      rows?: T[]
      results?: T[]
      data?: T[]
    }
    return candidate.items ?? candidate.rows ?? candidate.results ?? candidate.data ?? []
  }
  return []
}

export function errorMessage(error: unknown, fallback = 'Terjadi kesalahan.'): string {
  if (typeof error === 'object' && error !== null) {
    const networkError = error as { code?: string; response?: { data?: unknown } }
    if (networkError.code === 'ERR_NETWORK' && !networkError.response) {
      return 'Koneksi ke backend gagal atau request diblokir oleh kebijakan CORS.'
    }
    const response = networkError.response
    const data = response?.data
    if (data && typeof data === 'object') {
      const value = data as {
        code?: string
        message?: string
        error?: unknown
        detail?: string
        details?: unknown
      }
      const detail =
        typeof value.details === 'string'
          ? value.details
          : Array.isArray(value.details)
            ? value.details.map(String).join(', ')
            : value.details && typeof value.details === 'object'
              ? Object.values(value.details as Record<string, unknown>)
                  .map(String)
                  .join(', ')
              : ''
      const nestedError = typeof value.error === 'string' ? value.error : ''
      const message = value.message || nestedError || value.detail || detail || fallback
      return value.code ? `${message} (${value.code})` : message
    }
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      return (error as { message: string }).message
    }
  }
  return fallback
}
