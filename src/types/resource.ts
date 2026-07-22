export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiSchema {
  type?: string
  format?: string
  description?: string
  enum?: Array<string | number | boolean>
  example?: unknown
  default?: unknown
  minimum?: number
  maximum?: number
  ref?: string
  required?: string[]
  properties?: Record<string, ApiSchema>
  readOnly?: boolean
  items?: ApiSchema
}

export interface ApiParameter {
  name: string
  in: 'path' | 'query' | 'header' | string
  type?: string
  format?: string
  required?: boolean
  description?: string
  enum?: Array<string | number | boolean>
  default?: unknown
}

export interface ApiOperation {
  operationId: string
  method: HttpMethod
  path: string
  summary: string
  description?: string
  tags: string[]
  parameters: ApiParameter[]
  body?: ApiSchema | null
  response?: ApiSchema | null
}

export interface ResourceActionDefinition {
  operationId: string
  label: string
  group?: string
  permission?: string
  icon?: string
  tone?: 'primary' | 'secondary' | 'ghost' | 'danger'
  statuses?: string[]
  hideStatuses?: string[]
  confirm?: string
  successMessage?: string
  pathValueKey?: string
  opensDetail?: boolean
  openHtmlPath?: string
  handler?:
    | 'generate-qr-labels'
    | 'qr-labels'
    | 'goods-receipt-scan-in'
    | 'delivery-order-scan-out'
    | 'delivery-order-scan-in'
}

export interface ResourceModuleDefinition {
  key: string
  title: string
  description: string
  group: string
  listOperationId: string
  detailOperationId?: string
  createOperationId?: string
  updateOperationId?: string
  deleteOperationId?: string
  restorePath?: string
  readPermission?: string
  createPermission?: string
  updatePermission?: string
  deletePermission?: string
  superAdminOnly?: boolean
  route: string
  idCandidates?: string[]
  statusCandidates?: string[]
  columns?: string[]
  searchableFields?: string[]
  listViews?: Array<{
    key: string
    label: string
    query?: Record<string, string | number | boolean>
  }>
  editableStatuses?: string[]
  deletableStatuses?: string[]
  actions?: ResourceActionDefinition[]
  detailActions?: ResourceActionDefinition[]
  childSections?: Array<{
    title: string
    operationId: string
    permission?: string
    pathValueKey?: string
  }>
  readOnly?: boolean
  hideFromNavigation?: boolean
  attachmentEntityType?: string
  /** Resolve an empty create-form option by a stable business code after its options load. */
  createOptionDefaults?: Record<string, string>
}

export interface FieldOptionSource {
  path: string
  valueKeys?: string[]
  labelKeys?: string[]
  queryFromModel?: Record<string, string>
  pathFromModel?: Record<string, string>
  staticOptions?: Array<{ value: string | number | boolean; label: string }>
  /** Use backend-side search instead of filtering a potentially large option list in the browser. */
  remoteSearch?: boolean
  /** Query parameter accepted by the backend options endpoint. */
  searchParam?: string
  /** Minimum non-empty search length before a remote request is sent. */
  minimumInputLength?: number
  /** Delay before sending a remote search request. */
  debounceMs?: number
}

export interface FieldResourcePickerSource {
  operationId: string
  detailOperationId?: string
  valueKey: string
  labelKeys: string[]
  /** Present the first label as primary text and the second label below it. */
  stackedLabel?: boolean
  columns: Array<{ key: string; label: string; width?: string }>
  searchPlaceholder?: string
  title?: string
  description?: string
  queryFromModel?: Record<string, string>
  pathFromModel?: Record<string, string>
  fixedQuery?: Record<string, string | number | boolean>
  selectionEffects?: Record<string, string>
  clearFields?: string[]
}
