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

export function mergeModel(schema: ApiSchema | undefined, data: unknown): unknown {
  if (!schema) return data
  if (schema.type === 'object' || schema.properties) {
    const source =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : {}
    const result: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      if (child.readOnly) continue
      result[key] = key in source ? mergeModel(child, source[key]) : initialValue(child)
    }
    return result
  }
  if (schema.type === 'array') {
    return Array.isArray(data) ? data.map((item) => mergeModel(schema.items, item)) : []
  }
  if (schema.type === 'boolean') return Boolean(data)
  return data ?? ''
}

export function cleanPayload(
  schema: ApiSchema | undefined,
  value: unknown,
  required = false,
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
      const cleaned = cleanPayload(child, source[key], requiredFields.has(key))
      if (cleaned !== undefined) result[key] = cleaned
    }
    return result
  }
  if (schema.type === 'array') {
    const items = Array.isArray(value) ? value : []
    if (!items.length && !required) return undefined
    return items.map((item) => cleanPayload(schema.items, item, true))
  }
  if (schema.type === 'boolean') return Boolean(value)
  if (value === '' || value === null || value === undefined) return required ? value : undefined
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
  if (schema.format === 'date') return 'date'
  if (schema.format === 'date-time') return 'datetime-local'
  if (schema.format === 'email' || /email/i.test(name)) return 'email'
  if (schema.type === 'integer' || schema.type === 'number') return 'number'
  return 'text'
}
