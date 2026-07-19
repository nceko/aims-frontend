export interface ApiEnvelope<T> {
  success?: boolean
  message?: string
  data?: T
  meta?: Record<string, unknown>
}

export interface PaginatedResponse<T> {
  items: T[]
  page?: number
  page_size?: number
  total?: number
  total_pages?: number
}

export interface OptionItem {
  id: number | string
  code?: string
  name: string
  label?: string
}
