import type { ApiSchema } from '@/types/resource'

export function initialValue(schema?: ApiSchema): unknown {
  if (!schema) return ''
  if (schema.default !== undefined) return structuredClone(schema.default)
  if (schema.type === 'object' || schema.properties) {
    const result: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      if (child.readOnly) continue
      const value = initialValue(child)
      if (value !== undefined) result[key] = value
    }
    return result
  }
  if (schema.type === 'array') return []
  if (schema.type === 'boolean') return false
  return ''
}

export function resolvedSchemaFormat(schema: ApiSchema, name = ''): string | undefined {
  if (schema.format) return schema.format
  const example = typeof schema.example === 'string' ? schema.example.trim() : ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(example)) return 'date'
  if (/^\d{4}-\d{2}-\d{2}T/.test(example)) return 'date-time'
  if (/_at$/i.test(name)) return 'date-time'
  if (/(^|_)date$/i.test(name)) return 'date'
  return undefined
}

function dateTimeLocalValue(value: unknown): unknown {
  if (typeof value !== 'string' || !value.trim()) return value
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function apiDateTimeValue(value: unknown): unknown {
  if (typeof value !== 'string' || !value.trim()) return value
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

export function mergeModel(schema: ApiSchema | undefined, data: unknown, name = ''): unknown {
  if (!schema) return data
  if (schema.type === 'object' || schema.properties) {
    const source =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : {}
    const result: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      if (child.readOnly) continue
      result[key] = key in source ? mergeModel(child, source[key], key) : initialValue(child)
    }
    return result
  }
  if (schema.type === 'array') {
    return Array.isArray(data) ? data.map((item) => mergeModel(schema.items, item, name)) : []
  }
  if (schema.type === 'boolean') return Boolean(data)
  if (resolvedSchemaFormat(schema, name) === 'date-time') return dateTimeLocalValue(data)
  return data ?? ''
}

export function cleanPayload(
  schema: ApiSchema | undefined,
  value: unknown,
  required = false,
  name = '',
): unknown {
  if (!schema) return value
  if (schema.type === 'object' || schema.properties) {
    const source =
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {}
    const result: Record<string, unknown> = {}
    const requiredFields = new Set(schema.required ?? [])
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      if (child.readOnly) continue
      const cleaned = cleanPayload(child, source[key], requiredFields.has(key), key)
      if (cleaned !== undefined) result[key] = cleaned
    }
    return result
  }
  if (schema.type === 'array') {
    const items = Array.isArray(value) ? value : []
    if (!items.length && !required) return undefined
    return items.map((item) => cleanPayload(schema.items, item, true, name))
  }
  if (schema.type === 'boolean') return Boolean(value)
  if (value === '' || value === null || value === undefined) return required ? value : undefined
  if (resolvedSchemaFormat(schema, name) === 'date-time') return apiDateTimeValue(value)
  if (schema.type === 'integer') {
    const number = Number(value)
    return Number.isFinite(number) ? Math.trunc(number) : value
  }
  if (schema.type === 'number') {
    const number = Number(value)
    return Number.isFinite(number) ? number : value
  }
  return value
}

export function isLongTextField(name: string): boolean {
  return /(description|notes|address|alamat|reason|message|remarks|resolution|findings|action_taken)$/i.test(
    name,
  )
}

export function inputType(schema: ApiSchema, name: string): string {
  if (/password/i.test(name)) return 'password'
  const format = resolvedSchemaFormat(schema, name)
  if (format === 'date') return 'date'
  if (format === 'date-time') return 'datetime-local'
  if (schema.format === 'email' || /email/i.test(name)) return 'email'
  if (schema.type === 'integer' || schema.type === 'number') return 'number'
  return 'text'
}
