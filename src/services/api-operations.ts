import metadata from '@/generated/api-metadata.json'
import { apiClient } from './api-client'
import type { ApiOperation, ApiSchema } from '@/types/resource'
import { operationSchemaOverrides } from '@/config/operation-schema-overrides'

const operationMap = metadata.operations as unknown as Record<string, ApiOperation>

function mergeSchema(base?: ApiSchema | null, override?: ApiSchema | null): ApiSchema | null {
  if (override === null) return null
  if (!base) return override ?? null
  if (!override) return base
  const properties: Record<string, ApiSchema> = { ...(base.properties ?? {}) }
  for (const [key, value] of Object.entries(override.properties ?? {})) {
    properties[key] = mergeSchema(properties[key], value) ?? value
  }
  return {
    ...base,
    ...override,
    required: [...new Set([...(base.required ?? []), ...(override.required ?? [])])],
    properties: Object.keys(properties).length ? properties : undefined,
    items: mergeSchema(base.items, override.items) ?? undefined,
  }
}

export function getOperation(operationId?: string): ApiOperation | undefined {
  if (!operationId) return undefined
  const operation = operationMap[operationId]
  if (!operation) return undefined
  const override = operationSchemaOverrides[operationId]
  if (!override) return operation
  return {
    ...operation,
    ...override,
    operationId: operation.operationId,
    method: override.method ?? operation.method,
    path: override.path ?? operation.path,
    summary: override.summary ?? operation.summary,
    tags: override.tags ?? operation.tags,
    parameters: override.parameters ?? operation.parameters,
    body: mergeSchema(operation.body, override.body),
    response: mergeSchema(operation.response, override.response),
  }
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
        return apiClient.getRaw<T>(url, { params: options.query })
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
