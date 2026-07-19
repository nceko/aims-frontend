export type ResourceIdentifier = string | number

function isIdentifier(value: unknown): value is ResourceIdentifier {
  return (
    (typeof value === 'string' && value.trim().length > 0) ||
    (typeof value === 'number' && Number.isFinite(value))
  )
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

/**
 * Resolve the internal primary key used by API paths without exposing it as a table/detail column.
 * Backend DTOs are not fully uniform: some use company_id, others id_company, and most use id.
 */
export function resolveResourceId(
  row: Record<string, unknown>,
  configuredCandidates: string[] = [],
): ResourceIdentifier | undefined {
  const explicitCandidates = unique([...configuredCandidates, 'id'])

  for (const key of explicitCandidates) {
    const value = row[key]
    if (isIdentifier(value)) return value
  }

  const conventionalKeys = Object.keys(row).filter(
    (key) => key.startsWith('id_') || key.endsWith('_id') || /(^|_)(uuid|guid)$/.test(key),
  )

  for (const key of conventionalKeys) {
    const value = row[key]
    if (isIdentifier(value)) return value
  }

  return undefined
}

/** Resolve a path parameter from the exact field, configured alias, or resource primary key. */
export function resolveResourcePathValue(
  parameterName: string,
  row: Record<string, unknown> | undefined,
  configuredCandidates: string[] = [],
  preferredKey?: string,
): ResourceIdentifier | undefined {
  if (!row) return undefined

  const baseName = parameterName.endsWith('_id')
    ? parameterName.slice(0, -3)
    : parameterName.startsWith('id_')
      ? parameterName.slice(3)
      : parameterName

  const aliases = unique([
    preferredKey ?? '',
    parameterName,
    parameterName.endsWith('_id') ? `id_${baseName}` : '',
    parameterName.startsWith('id_') ? `${baseName}_id` : '',
  ])

  for (const key of aliases) {
    const value = row[key]
    if (isIdentifier(value)) return value
  }

  return resolveResourceId(row, configuredCandidates)
}
