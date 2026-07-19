const runtime = window.__AIMS_CONFIG__ ?? {}

function toPositiveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const runtimeConfig = Object.freeze({
  appName: runtime.APP_NAME || import.meta.env.VITE_APP_NAME || 'AIMS',
  appFullName:
    runtime.APP_FULL_NAME ||
    import.meta.env.VITE_APP_FULL_NAME ||
    'Aset & Inventory Management System',
  apiBaseUrl: (runtime.API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, ''),
  apiTimeout: toPositiveNumber(runtime.API_TIMEOUT || import.meta.env.VITE_API_TIMEOUT, 30_000),
  enableDevLogin: import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true',
})
