const OPTION_PAGINATION_KEYS = new Set([
  'limit',
  'per_page',
  'page_size',
  'pageSize',
  'take',
  'skip',
  'offset',
])

export function isOptionsEndpoint(url: string): boolean {
  const path = url.split(/[?#]/, 1)[0] ?? ''
  return path.split('/').includes('options')
}

export function sanitizeOptionsParams(
  url: string,
  params?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!params || !isOptionsEndpoint(url)) return params

  const sanitized = Object.fromEntries(
    Object.entries(params).filter(([key]) => !OPTION_PAGINATION_KEYS.has(key)),
  )

  return Object.keys(sanitized).length ? sanitized : undefined
}
