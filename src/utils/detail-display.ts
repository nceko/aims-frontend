import { humanizeField } from '@/config/field-options'

const hiddenExactFields = new Set([
  'password',
  'password_hash',
  'access_token',
  'refresh_token',
  'token_type',
  'expires_in',
  'deleted_at',
  'deleted_by',
  'created_by',
  'updated_by',
  'lock_version',
  'row_version',
  'path',
  'lft',
  'rgt',
  'depth',
])

const semanticBaseLabels: Record<string, string> = {
  company: 'Perusahaan',
  location: 'Lokasi',
  location_type: 'Tipe Lokasi',
  parent_location: 'Lokasi Induk',
  owner: 'Pemilik',
  pemilik: 'Pemilik',
  warehouse: 'Gudang',
  category_group: 'Kelompok Kategori',
  category: 'Kategori',
  parent_category: 'Kategori Induk',
  uom: 'UOM',
  brand: 'Brand',
  supplier: 'Supplier',
  item: 'Item',
  part: 'Part Number',
  division: 'Divisi',
  employee: 'Karyawan',
  vehicle: 'Kendaraan',
  user: 'Pengguna',
  role: 'Peran',
  permission: 'Izin',
}

const numericReferenceAliases = new Set([
  'company',
  'location',
  'location_type',
  'parent_location',
  'owner',
  'pemilik',
  'warehouse',
  'category_group',
  'category',
  'parent_category',
  'uom',
  'brand',
  'supplier',
  'item',
  'part',
  'division',
  'employee',
  'vehicle',
  'user',
  'role',
  'permission',
])

function normalizeKey(key: string): string {
  return key.trim().toLocaleLowerCase('id-ID')
}

export function isTechnicalIdField(key: string): boolean {
  const normalized = normalizeKey(key)
  return (
    normalized === 'id' ||
    normalized.endsWith('_id') ||
    normalized.endsWith('_ids') ||
    normalized.startsWith('id_') ||
    /(^|_)(uuid|guid)$/.test(normalized)
  )
}

export function shouldHideDetailField(
  key: string,
  value: unknown,
  _record: Record<string, unknown>,
): boolean {
  const normalized = normalizeKey(key)
  if (hiddenExactFields.has(normalized)) return true
  if (isTechnicalIdField(normalized)) return true

  if (
    numericReferenceAliases.has(normalized) &&
    (typeof value === 'number' || /^\d+$/.test(String(value ?? '')))
  ) {
    return true
  }

  return false
}

export function detailFieldLabel(key: string): string {
  const normalized = normalizeKey(key)

  if (normalized.startsWith('nama_')) {
    const base = normalized.slice(5)
    return semanticBaseLabels[base] ?? humanizeField(base)
  }
  if (normalized.startsWith('label_')) {
    const base = normalized.slice(6)
    return semanticBaseLabels[base] ?? humanizeField(base)
  }

  for (const suffix of ['_name', '_label']) {
    if (normalized.endsWith(suffix)) {
      const base = normalized.slice(0, -suffix.length)
      return semanticBaseLabels[base] ?? humanizeField(base)
    }
  }

  return humanizeField(key)
}

export function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak'
  if (typeof value === 'number') {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(value)
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
    }
  }
  if (Array.isArray(value)) return `${value.length} data`
  if (typeof value === 'object') return 'Detail'
  return String(value)
}

export function statusField(key: string): boolean {
  const normalized = normalizeKey(key)
  return /(^status$|_status$|^is_active$|^active$|^success$)/.test(normalized)
}

export function extractRelatedRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.map((item) =>
      item && typeof item === 'object' && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : { value: item },
    )
  }

  if (!value || typeof value !== 'object') return []
  const root = value as Record<string, unknown>

  for (const key of ['data', 'items', 'rows', 'results', 'list']) {
    const candidate = root[key]
    if (Array.isArray(candidate)) return extractRelatedRows(candidate)
    if (candidate && typeof candidate === 'object') {
      const nested = extractRelatedRows(candidate)
      if (nested.length) return nested
    }
  }

  for (const candidate of Object.values(root)) {
    if (Array.isArray(candidate)) return extractRelatedRows(candidate)
  }

  const hasPrimitiveValue = Object.values(root).some(
    (candidate) => candidate === null || typeof candidate !== 'object',
  )
  return hasPrimitiveValue ? [root] : []
}

export function displayablePrimitiveKeys(rows: Record<string, unknown>[]): string[] {
  const keys: string[] = []
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (keys.includes(key)) continue
      if (shouldHideDetailField(key, value, row)) continue
      if (typeof value === 'object' && value !== null) continue
      keys.push(key)
    }
  }
  return keys
}
