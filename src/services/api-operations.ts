import metadata from '@/generated/api-metadata.json'
import { apiClient } from './api-client'
import { http } from './http'
import type { ApiOperation } from '@/types/resource'

const operationMap = metadata.operations as unknown as Record<string, ApiOperation>

export function getOperation(operationId?: string): ApiOperation | undefined {
  if (!operationId) return undefined
  return operationMap[operationId]
}

export function fillPath(
  path: string,
  values: Record<string, string | number | undefined | null>,
): string {
  return path.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    const value = values[name]
    if (value === undefined || value === null || value === '') {
      throw new Error(`Parameter path ${name} belum tersedia.`)
    }
    return encodeURIComponent(String(value))
  })
}

export async function executeOperation<T = unknown>(
  operationId: string,
  options: {
    path?: Record<string, string | number | undefined | null>
    query?: Record<string, unknown>
    body?: unknown
    raw?: boolean
  } = {},
): Promise<T> {
  const operation = getOperation(operationId)
  if (!operation) throw new Error(`Operation ${operationId} tidak ditemukan pada metadata API.`)
  const url = fillPath(operation.path, options.path ?? {})
  switch (operation.method) {
    case 'GET':
      if (options.raw) {
        const { data } = await http.get<T>(url, { params: options.query })
        return data
      }
      return apiClient.get<T>(url, options.query)
    case 'POST':
      return apiClient.post<T>(url, options.body)
    case 'PUT':
      return apiClient.put<T>(url, options.body)
    case 'PATCH':
      return apiClient.patch<T>(url, options.body)
    case 'DELETE':
      return apiClient.delete<T>(url)
    default:
      throw new Error(`HTTP method ${String(operation.method)} belum didukung.`)
  }
}

export function allOperations(): ApiOperation[] {
  return Object.values(operationMap)
}
