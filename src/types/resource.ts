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
  handler?: 'generate-qr-labels' | 'qr-labels'
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
}

export interface FieldOptionSource {
  path: string
  valueKeys?: string[]
  labelKeys?: string[]
  queryFromModel?: Record<string, string>
  pathFromModel?: Record<string, string>
  staticOptions?: Array<{ value: string | number | boolean; label: string }>
}
