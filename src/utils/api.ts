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
    const response = (error as { response?: { data?: unknown } }).response
    const data = response?.data
    if (data && typeof data === 'object') {
      const value = data as { message?: string; error?: string; detail?: string }
      return value.message || value.error || value.detail || fallback
    }
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      return (error as { message: string }).message
    }
  }
  return fallback
}
