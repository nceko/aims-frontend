<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Eye, Pencil, Plus, QrCode, Trash2, MoreHorizontal } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppConfirmDialog from '@/components/ui/AppConfirmDialog.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import AppDataTable, { type DataTableColumn } from '@/components/data/AppDataTable.vue'
import SchemaFields from '@/components/data/SchemaFields.vue'
import StatusBadge from '@/components/data/StatusBadge.vue'
import StructuredData from '@/components/data/StructuredData.vue'
import DocumentAttachments from '@/components/data/DocumentAttachments.vue'
import RelatedDataTable from '@/components/data/RelatedDataTable.vue'
import UserAccessEditor from '@/components/data/UserAccessEditor.vue'
import GoodsReceiptQrModal, {
  type GoodsReceiptQrLabel,
} from '@/components/data/GoodsReceiptQrModal.vue'
import { resourceModules } from '@/config/modules'
import { resolveOperationFieldOrder } from '@/config/form-layouts'
import { useAuthStore } from '@/modules/auth/auth.store'
import { executeOperation, getOperation } from '@/services/api-operations'
import { apiClient } from '@/services/api-client'
import { errorMessage, normalizeList, unwrapData } from '@/utils/api'
import { cleanPayload, initialValue, mergeModel } from '@/utils/schema'
import { detailFieldLabel, isTechnicalIdField } from '@/utils/detail-display'
import { resolveResourceId, resolveResourcePathValue } from '@/utils/resource-id'
import type { ApiOperation, ResourceActionDefinition } from '@/types/resource'

const props = defineProps<{ moduleKey: string }>()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const definition = computed(() => resourceModules[props.moduleKey])
const displayTitle = computed(() =>
  String(route.meta.pageTitle ?? definition.value?.title ?? 'Data'),
)
const displayDescription = computed(() =>
  String(route.meta.pageDescription ?? definition.value?.description ?? ''),
)
const createButtonLabel = computed(() => String(route.meta.createLabel ?? 'Tambah'))
const routeListQuery = computed<Record<string, unknown>>(() => {
  const value = route.meta.listQuery
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
})
const createDefaults = computed<Record<string, unknown>>(() => {
  const value = route.meta.createDefaults
  const routeDefaults =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  const moduleDefaults: Record<string, unknown> =
    definition.value?.key === 'item-usages'
      ? { issue_mode: 'REQUEST', usage_type: 'OPERATIONAL' }
      : {}
  return { ...moduleDefaults, ...routeDefaults }
})
const rows = ref<Record<string, unknown>[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')
const search = ref('')
const page = ref(1)
const perPage = ref(25)
const total = ref(0)
const hasMore = ref(false)
const selected = ref<Record<string, unknown> | null>(null)
const detail = ref<unknown>(null)
const detailLoading = ref(false)
const childData = ref<Record<string, unknown>>({})
const formMode = ref<'create' | 'edit' | 'action' | null>(null)
const formOperation = ref<ApiOperation | null>(null)
const activeAction = ref<ResourceActionDefinition | null>(null)
const formModel = ref<Record<string, unknown>>({})
const formDescription = computed(() => {
  const title = displayTitle.value.toLocaleLowerCase('id-ID')
  if (formMode.value === 'create') return `Lengkapi informasi untuk menambahkan ${title}.`
  if (formMode.value === 'edit') return `Perbarui informasi ${title} yang dipilih.`
  if (activeAction.value?.operationId === 'ConfirmDeliveryOrderPicking')
    return 'Periksa barang yang sudah diambil dari rak. Quantity mengikuti Surat Jalan dan tidak perlu diisi ulang.'
  if (activeAction.value?.operationId === 'ConfirmDeliveryOrderPacking')
    return 'Periksa barang yang sudah dikemas. Setelah disimpan, lanjutkan melalui Scan Barang Keluar.'
  if (activeAction.value?.label)
    return `Lengkapi data untuk proses ${activeAction.value.label.toLocaleLowerCase('id-ID')}.`
  return 'Lengkapi informasi yang diperlukan untuk melanjutkan proses.'
})

const formFieldOrder = computed<string[]>(() => {
  return resolveOperationFieldOrder(
    formOperation.value?.operationId,
    formOperation.value?.body ?? undefined,
  )
})

const formGroupingContext = computed(
  () =>
    `${definition.value?.key ?? ''} ${displayTitle.value} ${formOperation.value?.operationId ?? ''}`,
)

const deliveryOrderReadyStatuses = new Set([
  'APPROVED',
  'PROCESSING_DELIVERY',
  'PARTIALLY_FULFILLED',
  'SHIPPED',
])

const formDisabledFields = computed<string[]>(() => {
  const properties = formOperation.value?.body?.properties ?? {}
  const disabled = new Set<string>()
  if (!auth.isSuperAdmin) {
    for (const field of [
      'company_id',
      'id_company',
      'category_group_id',
      'location_id',
      'requester_location_id',
      'reported_by_location_id',
    ]) {
      if (field in properties) disabled.add(field)
    }
  }
  if (
    definition.value?.key === 'item-usages' &&
    String(formModel.value.issue_mode ?? '').toUpperCase() === 'REQUEST'
  ) {
    for (const field of ['warehouse_id', 'location_id']) {
      if (field in properties) disabled.add(field)
    }
  }
  if (definition.value?.key === 'delivery-orders') {
    for (const field of ['from_warehouse_id', 'to_warehouse_id']) {
      if (field in properties) disabled.add(field)
    }
  }
  return [...disabled]
})

function activeCompanyId(): number | undefined {
  const selected = auth.selectedCompany
  const raw = selected?.company_id ?? selected?.id_company ?? selected?.id ?? auth.user?.company_id
  const companyId = Number(raw)
  return Number.isFinite(companyId) && companyId > 0 ? companyId : undefined
}

function activeContextDefaults(schema?: ApiOperation['body']): Record<string, unknown> {
  const properties = schema?.properties ?? {}
  const companyId = activeCompanyId()
  const locationId = Number(auth.user?.location_id)
  const categoryGroupId = Number(auth.user?.category_group_id)
  const defaults: Record<string, unknown> = {}
  if (companyId) {
    if ('company_id' in properties) defaults.company_id = companyId
    if ('id_company' in properties) defaults.id_company = companyId
  }
  if (Number.isFinite(locationId) && locationId > 0) {
    for (const field of ['location_id', 'requester_location_id', 'reported_by_location_id']) {
      if (field in properties) defaults[field] = locationId
    }
  }
  if (
    Number.isFinite(categoryGroupId) &&
    categoryGroupId > 0 &&
    'category_group_id' in properties
  ) {
    defaults.category_group_id = categoryGroupId
  }
  return defaults
}
const showDetail = ref(false)
const showForm = ref(false)
const pendingDeleteRow = ref<Record<string, unknown> | null>(null)
const pendingConfirmAction = ref<{
  action: ResourceActionDefinition
  operation: ApiOperation
  row?: Record<string, unknown>
} | null>(null)
const rowMenu = ref<string | null>(null)
const rowMenuRow = ref<Record<string, unknown> | null>(null)
const rowMenuButton = ref<HTMLElement | null>(null)
const rowMenuElement = ref<HTMLElement | null>(null)
const rowMenuPosition = reactive({ top: 0, left: 0, width: 220 })
const query = reactive<Record<string, unknown>>({})
const activeListView = ref('')
const formHint = ref('')
const hydrating = ref(false)
const lastHydratedReference = ref('')
const showQrLabels = ref(false)
const qrLabelBusy = ref(false)
const qrReceipt = ref<Record<string, unknown> | null>(null)
const qrLabels = ref<GoodsReceiptQrLabel[]>([])
const qrLabelNotice = ref('')
let successNoticeTimer: number | undefined
let errorNoticeTimer: number | undefined
let lastAutoOpenedDocument = ''

function clearSuccessNotice(): void {
  window.clearTimeout(successNoticeTimer)
  successNoticeTimer = undefined
  success.value = ''
}

function clearErrorNotice(): void {
  window.clearTimeout(errorNoticeTimer)
  errorNoticeTimer = undefined
  error.value = ''
}

function clearNotices(): void {
  clearSuccessNotice()
  clearErrorNotice()
}

const listOperation = computed(() => getOperation(definition.value?.listOperationId))
const createOperation = computed(() => getOperation(definition.value?.createOperationId))
const updateOperation = computed(() => getOperation(definition.value?.updateOperationId))
const isAuditLogTable = computed(() => definition.value?.key === 'audit-logs')
const visibleColumns = computed(() => {
  if (isAuditLogTable.value) {
    return ['full_name', 'action', 'created_at', 'raw_path', 'status_code']
  }
  const configured = (definition.value?.columns ?? []).filter(
    (column) => !isTechnicalIdField(column),
  )
  const sample = rows.value[0]
  if (!sample) return configured
  const available = configured.filter((column) => column in sample)
  if (available.length >= 3) return available
  const inferred = Object.keys(sample).filter(
    (key) =>
      !['deleted_at', 'password_hash', 'lines', 'items'].includes(key) &&
      !isTechnicalIdField(key) &&
      typeof sample[key] !== 'object',
  )
  return [...new Set([...available, ...inferred])].slice(0, 8)
})
const dataTableColumns = computed<DataTableColumn[]>(() =>
  isAuditLogTable.value
    ? [
        { key: 'full_name', label: 'Pengguna', sortable: false, width: '22%' },
        { key: 'action', label: 'Aktivitas', sortable: false, width: '17%' },
        { key: 'created_at', label: 'Waktu', sortable: true, width: '17%' },
        { key: 'raw_path', label: 'Endpoint', sortable: false },
        { key: 'status_code', label: 'Respons', sortable: true, width: '12%' },
      ]
    : visibleColumns.value.map((column) => ({
        key: column,
        label: detailFieldLabel(column),
        sortable: true,
      })),
)
const rowActions = computed(() =>
  (definition.value?.actions ?? []).filter((action) =>
    (getOperation(action.operationId)?.parameters ?? []).some(
      (parameter) => parameter.in === 'path',
    ),
  ),
)
const globalActions = computed(() =>
  (definition.value?.actions ?? []).filter(
    (action) =>
      !(getOperation(action.operationId)?.parameters ?? []).some(
        (parameter) => parameter.in === 'path',
      ),
  ),
)
const listViews = computed(() => definition.value?.listViews ?? [])
const currentListView = computed(
  () => listViews.value.find((view) => view.key === activeListView.value) ?? listViews.value[0],
)
const visibleDetailActions = computed(() => {
  const allowedOperationIds = Array.isArray(route.meta.detailActionOperationIds)
    ? (route.meta.detailActionOperationIds as string[])
    : []
  const row = selected.value
  return (definition.value?.detailActions ?? []).filter(
    (action) =>
      (!row || actionVisible(action, row)) &&
      (!allowedOperationIds.length || allowedOperationIds.includes(action.operationId)),
  )
})
const groupedDetailActions = computed(() => {
  const groups = new Map<string, ResourceActionDefinition[]>()
  for (const action of visibleDetailActions.value) {
    const label = action.group?.trim() || 'Tindakan'
    groups.set(label, [...(groups.get(label) ?? []), action])
  }
  return [...groups.entries()].map(([label, actions]) => ({ label, actions }))
})
const openRowMenuActions = computed(() =>
  rowMenuRow.value
    ? rowActions.value.filter((action) => actionVisible(action, rowMenuRow.value!))
    : [],
)
const pageCount = computed(() =>
  total.value > 0
    ? Math.max(1, Math.ceil(total.value / perPage.value))
    : Math.max(1, page.value + (hasMore.value ? 1 : 0)),
)

const detailSummary = computed<unknown>(() => {
  const source = asRecord(detail.value)
  const summary = { ...source }
  if (definition.value?.key === 'category-groups') delete summary.categories
  if (definition.value?.key === 'roles') delete summary.permissions
  if (definition.value?.key === 'users') return userDetailSummary(summary)
  return summary
})

function userDetailSummary(source: Record<string, unknown>): Record<string, unknown> {
  const summary = { ...source }
  const access = asRecord(summary.access)
  const companies = (Array.isArray(access.companies) ? access.companies : []).map(asRecord)

  const derivedContextualRoles = companies.flatMap((company) =>
    (Array.isArray(company.category_groups) ? company.category_groups : []).flatMap((rawGroup) => {
      const group = asRecord(rawGroup)
      return (Array.isArray(group.roles) ? group.roles : []).map((rawRole) => {
        const role = asRecord(rawRole)
        return {
          company_code: company.company_code,
          company_name: company.company_name,
          category_group_code: group.category_group_code,
          category_group_name: group.category_group_name,
          role_code: role.role_code ?? role.code,
          role_name: role.role_name ?? role.name,
          description: role.description,
        }
      })
    }),
  )

  const contextualRoles = Array.isArray(summary.contextual_roles)
    ? summary.contextual_roles
    : derivedContextualRoles
  const systemRoles = Array.isArray(summary.system_roles)
    ? summary.system_roles
    : Array.isArray(access.system_roles)
      ? access.system_roles
      : Array.isArray(summary.roles)
        ? summary.roles
        : []

  const companyRows = companies.map((company) => ({
    company_code: company.company_code,
    company_name: company.company_name,
    is_default: company.is_default,
    scope_mode: company.scope_mode,
    location_count: Array.isArray(company.locations) ? company.locations.length : 0,
    category_group_count: Array.isArray(company.category_groups)
      ? company.category_groups.length
      : 0,
  }))
  const locationRows = companies.flatMap((company) =>
    (Array.isArray(company.locations) ? company.locations : []).map((rawLocation) => {
      const location = asRecord(rawLocation)
      return {
        company_code: company.company_code,
        location_code: location.location_code,
        location_name: location.location_name,
      }
    }),
  )
  const categoryGroupRows = companies.flatMap((company) =>
    (Array.isArray(company.category_groups) ? company.category_groups : []).map((rawGroup) => {
      const group = asRecord(rawGroup)
      const roleNames = (Array.isArray(group.roles) ? group.roles : [])
        .map((rawRole) => {
          const role = asRecord(rawRole)
          return String(role.role_name ?? role.name ?? '').trim()
        })
        .filter(Boolean)
      return {
        company_code: company.company_code,
        category_group_code: group.category_group_code,
        category_group_name: group.category_group_name,
        is_default: group.is_default,
        role_names: roleNames.join(', ') || 'Belum diberi peran',
      }
    }),
  )

  delete summary.roles
  delete summary.system_roles
  delete summary.contextual_roles
  delete summary.access

  return {
    ...summary,
    contextual_roles: contextualRoles,
    system_roles: systemRoles,
    companies: companyRows,
    locations: locationRows,
    category_groups: categoryGroupRows,
  }
}

const categoryGroupCategories = computed<unknown>(() => {
  if (definition.value?.key !== 'category-groups') return []
  const child = childData.value['Kategori dalam Group']
  if (child !== undefined) return child
  return asRecord(detail.value).categories ?? []
})

function rowId(row: Record<string, unknown>): string | number | undefined {
  return resolveResourceId(row, definition.value?.idCandidates ?? ['id'])
}
function uniqueRowsByResourceID(
  items: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  const seen = new Set<string>()
  return items.filter((row) => {
    const id = rowId(row)
    if (id === undefined || id === null || id === '') return true
    const key = String(id)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
function rowStatus(row: Record<string, unknown>): string {
  for (const key of definition.value?.statusCandidates ?? ['status']) {
    if (row[key] !== undefined) return String(row[key]).toUpperCase()
  }
  return ''
}
function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak'
  if (typeof value === 'number')
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(value)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime()))
      return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
        date,
      )
  }
  if (typeof value === 'object') return Array.isArray(value) ? `${value.length} data` : 'Detail'
  return String(value)
}
function procurementRouteLabel(value: unknown): string {
  const route = String(value ?? '').toUpperCase()
  const labels: Record<string, string> = {
    CENTRAL_STOCK: 'Stok Pusat',
    LOCAL_STOCK: 'Stok Daerah',
    CENTRAL_REQUEST: 'Request · Pengadaan Pusat',
    LOCAL_REQUEST: 'Request · Pembelian Daerah',
  }
  return labels[route] ?? displayValue(value)
}
function auditActionLabel(value: unknown): string {
  const text = String(value ?? '').trim()
  if (!text) return 'Aktivitas sistem'
  return text.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toLocaleUpperCase('id-ID'))
}
function auditMethodClass(value: unknown): string {
  const method = String(value ?? '').toUpperCase()
  if (method === 'GET') return 'audit-method--read'
  if (method === 'DELETE') return 'audit-method--delete'
  if (method === 'POST') return 'audit-method--create'
  return 'audit-method--update'
}
function auditResponseClass(value: unknown): string {
  const status = Number(value)
  if (status >= 500) return 'audit-response--error'
  if (status >= 400) return 'audit-response--warning'
  if (status >= 200 && status < 300) return 'audit-response--success'
  return 'audit-response--neutral'
}
function isStatusColumn(column: string): boolean {
  return /(^status$|_status$|^is_active$|^success$)/.test(column)
}
function can(permission?: string): boolean {
  return auth.can(permission)
}
function actionVisible(action: ResourceActionDefinition, row: Record<string, unknown>): boolean {
  if (!can(action.permission)) return false
  const status = rowStatus(row)
  if (action.statuses?.length && !action.statuses.includes(status)) return false
  if (action.hideStatuses?.includes(status)) return false
  return true
}
function rowEditable(row: Record<string, unknown>): boolean {
  if (
    !updateOperation.value ||
    !can(definition.value?.updatePermission) ||
    definition.value?.readOnly
  )
    return false
  const statuses = definition.value?.editableStatuses
  return !statuses?.length || statuses.includes(rowStatus(row))
}
function rowDeletable(row: Record<string, unknown>): boolean {
  if (!definition.value?.deleteOperationId || !can(definition.value.deletePermission)) return false
  const statuses = definition.value.deletableStatuses
  return !statuses?.length || statuses.includes(rowStatus(row))
}
function extractTotal(payload: unknown): number {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const raw = payload as Record<string, unknown>
    const meta = raw.meta as Record<string, unknown> | undefined
    const candidates = [raw.total, raw.total_count, raw.count, meta?.total, meta?.total_count]
    for (const value of candidates) if (typeof value === 'number') return value
  }
  const data = unwrapData(payload as never) as unknown
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>
    const meta = obj.meta as Record<string, unknown> | undefined
    for (const value of [obj.total, obj.total_count, obj.count, meta?.total, meta?.total_count]) {
      if (typeof value === 'number') return value
    }
  }
  return 0
}
function pathValues(
  operation: ApiOperation,
  row?: Record<string, unknown>,
  action?: ResourceActionDefinition,
): Record<string, string | number | undefined> {
  const values: Record<string, string | number | undefined> = {}
  for (const parameter of operation.parameters.filter((item) => item.in === 'path')) {
    values[parameter.name] = resolveResourcePathValue(
      parameter.name,
      row,
      definition.value?.idCandidates ?? ['id'],
      action?.pathValueKey,
    )
  }
  return values
}
async function maybeOpenRequestedDocument(): Promise<void> {
  const rawID = Array.isArray(route.query.document_id)
    ? route.query.document_id[0]
    : route.query.document_id
  const id = Number(rawID)
  if (!Number.isFinite(id) || id <= 0 || !definition.value?.detailOperationId) return
  const key = `${props.moduleKey}:${id}`
  if (lastAutoOpenedDocument === key) return
  lastAutoOpenedDocument = key
  const matching = rows.value.find((row) => Number(rowId(row)) === id)
  const idKey = definition.value.idCandidates?.[0] ?? 'id'
  await openDetail(matching ?? { [idKey]: id })
}

async function load() {
  if (!definition.value || !listOperation.value) return
  loading.value = true
  error.value = ''
  try {
    const payload = await executeOperation<unknown>(definition.value.listOperationId, {
      raw: true,
      query: {
        page: page.value,
        per_page: perPage.value,
        page_size: perPage.value,
        search: search.value || undefined,
        ...(currentListView.value?.query ?? {}),
        ...routeListQuery.value,
        ...query,
      },
    })
    const loadedRows = normalizeList<Record<string, unknown>>(payload)
    rows.value = uniqueRowsByResourceID(loadedRows)
    total.value = extractTotal(payload)
    hasMore.value = loadedRows.length >= perPage.value
    await maybeOpenRequestedDocument()
  } catch (cause) {
    rows.value = []
    total.value = 0
    hasMore.value = false
    error.value = errorMessage(cause, `Data ${definition.value.title} belum dapat dimuat.`)
  } finally {
    loading.value = false
  }
}
function openCreate() {
  if (!createOperation.value?.body) return
  formHint.value = ''
  lastHydratedReference.value = ''
  formMode.value = 'create'
  formOperation.value = createOperation.value
  activeAction.value = null
  formModel.value = {
    ...(initialValue(createOperation.value.body) as Record<string, unknown>),
    ...activeContextDefaults(createOperation.value.body),
    ...createDefaults.value,
  }
  showForm.value = true
}
async function openEdit(row: Record<string, unknown>) {
  if (!rowEditable(row) || !updateOperation.value?.body || !definition.value) return
  selected.value = row
  let source: unknown = row
  if (definition.value.detailOperationId) {
    try {
      source = await executeOperation(definition.value.detailOperationId, {
        path: pathValues(getOperation(definition.value.detailOperationId)!, row),
      })
    } catch {
      source = row
    }
  }
  formMode.value = 'edit'
  formOperation.value = updateOperation.value
  activeAction.value = null
  formModel.value = mergeModel(updateOperation.value.body, source) as Record<string, unknown>
  showForm.value = true
}
async function openDetail(row: Record<string, unknown>) {
  selected.value = row
  detail.value = row
  childData.value = {}
  showDetail.value = true
  detailLoading.value = true
  rowMenu.value = null
  try {
    if (definition.value?.detailOperationId) {
      const operation = getOperation(definition.value.detailOperationId)
      if (operation) {
        detail.value = await executeOperation(definition.value.detailOperationId, {
          path: pathValues(operation, row),
        })
        selected.value = { ...row, ...asRecord(detail.value) }
      }
    }
    for (const child of definition.value?.childSections ?? []) {
      if (!auth.can(child.permission)) continue
      const operation = getOperation(child.operationId)
      if (!operation) continue
      try {
        childData.value[child.title] = await executeOperation(child.operationId, {
          path: pathValues(operation, row, {
            operationId: child.operationId,
            label: child.title,
            pathValueKey: child.pathValueKey,
          }),
        })
      } catch {
        childData.value[child.title] = []
      }
    }
  } catch (cause) {
    error.value = errorMessage(cause, 'Detail data tidak dapat dimuat.')
  } finally {
    detailLoading.value = false
  }
}
function remove(row: Record<string, unknown>) {
  if (!definition.value?.deleteOperationId) return
  pendingDeleteRow.value = row
}

function closeDeleteConfirm(): void {
  if (!saving.value) pendingDeleteRow.value = null
}

async function confirmDelete(): Promise<void> {
  const row = pendingDeleteRow.value
  if (!row || !definition.value?.deleteOperationId) return
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const operation = getOperation(definition.value.deleteOperationId)
    if (!operation) return
    await executeOperation(definition.value.deleteOperationId, { path: pathValues(operation, row) })
    success.value = `${definition.value.title} berhasil dipindahkan ke Recycle Bin.`
    pendingDeleteRow.value = null
    await load()
  } catch (cause) {
    error.value = errorMessage(cause, 'Data gagal dihapus.')
  } finally {
    saving.value = false
  }
}

async function openHtmlAction(action: ResourceActionDefinition, row?: Record<string, unknown>) {
  if (!action.openHtmlPath || !row) return
  const id = rowId(row)
  if (id === undefined) {
    error.value = 'ID dokumen tidak ditemukan.'
    return
  }
  const popup = window.open('', '_blank')
  if (!popup) {
    error.value = 'Popup diblokir browser. Izinkan popup untuk mencetak dokumen.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const url = action.openHtmlPath.replace('{id}', encodeURIComponent(String(id)))
    const html = await apiClient.getRaw<string>(url, {
      responseType: 'text',
      accept: 'text/html',
    })
    const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    popup.location.href = blobUrl
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
  } catch (cause) {
    popup.close()
    error.value = errorMessage(cause, `${action.label} gagal dibuka.`)
  } finally {
    saving.value = false
  }
}

function normalizeQrLabels(value: unknown): GoodsReceiptQrLabel[] {
  const candidates = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? ((value as Record<string, unknown>).generated_qr_codes ??
        (value as Record<string, unknown>).data ??
        [])
      : []
  if (!Array.isArray(candidates)) return []
  return candidates
    .map((entry) => asRecord(entry))
    .filter((entry) => typeof entry.qr_code === 'string' && entry.qr_code.trim())
    .map((entry) => ({
      unit_id: entry.unit_id as string | number | undefined,
      receipt_line_id: entry.receipt_line_id as string | number | undefined,
      item_id: entry.item_id as string | number | undefined,
      item_code: typeof entry.item_code === 'string' ? entry.item_code : undefined,
      item_name: typeof entry.item_name === 'string' ? entry.item_name : undefined,
      part_id: entry.part_id as string | number | undefined,
      part_number: typeof entry.part_number === 'string' ? entry.part_number : undefined,
      qr_code: String(entry.qr_code),
      status: typeof entry.status === 'string' ? entry.status : undefined,
    }))
}

function mergeQrLabels(...groups: GoodsReceiptQrLabel[][]): GoodsReceiptQrLabel[] {
  const labels = new Map<string, GoodsReceiptQrLabel>()
  for (const group of groups) {
    for (const label of group) labels.set(label.qr_code, label)
  }
  return [...labels.values()]
}

async function openGoodsReceiptQrLabels(
  row?: Record<string, unknown>,
  generateFirst = false,
): Promise<void> {
  if (!row) return
  const id = rowId(row)
  if (id === undefined) {
    error.value = 'ID Goods Receipt tidak ditemukan.'
    return
  }

  qrLabelBusy.value = true
  error.value = ''
  success.value = ''
  qrLabelNotice.value = ''
  let generated: GoodsReceiptQrLabel[] = []
  let generationError = ''

  try {
    if (generateFirst) {
      try {
        const response = await executeOperation<unknown>('GenerateGoodsReceiptQR', {
          path: { id: String(id) },
        })
        generated = normalizeQrLabels(response)
      } catch (cause) {
        generationError = errorMessage(cause, 'Generate QR gagal diproses.')
      }
    }

    const receipt = asRecord(
      await executeOperation('FindGoodsReceiptByID', { path: { id: String(id) } }),
    )
    const existing = normalizeQrLabels(receipt.generated_qr_codes)
    const labels = mergeQrLabels(existing, generated)

    if (!labels.length) {
      if (generationError) throw new Error(generationError)
      error.value =
        'Belum ada QR yang dapat dicetak. Pastikan line bertipe SERIAL dan accepted quantity lebih dari nol.'
      return
    }

    qrReceipt.value = receipt
    qrLabels.value = labels
    qrLabelNotice.value = generateFirst
      ? generated.length
        ? `${generated.length} QR baru berhasil dibuat. Total ${labels.length} label siap dicetak.`
        : generationError
          ? `QR yang sudah tersimpan berhasil dimuat. Catatan generate: ${generationError}`
          : `Tidak ada QR baru. Semua ${labels.length} QR yang sudah tersedia dimuat untuk dicetak.`
      : `${labels.length} QR yang sudah tersedia dimuat untuk dicetak ulang.`
    showQrLabels.value = true
    success.value = generated.length
      ? `${generated.length} QR baru berhasil dibuat.`
      : 'QR berhasil dimuat untuk dicetak.'
    if (generateFirst) await load()
  } catch (cause) {
    error.value = errorMessage(cause, 'QR Goods Receipt tidak dapat dimuat.')
  } finally {
    qrLabelBusy.value = false
  }
}

function closeQrLabels(): void {
  if (qrLabelBusy.value) return
  showQrLabels.value = false
  qrReceipt.value = null
  qrLabels.value = []
  qrLabelNotice.value = ''
}

async function lookupItemUnitByQr() {
  const qrCode = window.prompt('Masukkan atau scan QR code item unit:')?.trim()
  if (!qrCode) return
  detailLoading.value = true
  error.value = ''
  childData.value = {}
  showDetail.value = true
  try {
    const unit = await executeOperation<Record<string, unknown>>('FindItemUnitByQRCode', {
      path: { qr_code: qrCode },
    })
    selected.value = unit
    detail.value = unit
    try {
      childData.value['Riwayat QR'] = await executeOperation('FindItemUnitHistoryByQRCode', {
        path: { qr_code: qrCode },
      })
    } catch {
      childData.value['Riwayat QR'] = []
    }
  } catch (cause) {
    showDetail.value = false
    error.value = errorMessage(cause, 'QR item unit tidak ditemukan.')
  } finally {
    detailLoading.value = false
  }
}

async function beginAction(action: ResourceActionDefinition, row?: Record<string, unknown>) {
  if (action.handler === 'goods-receipt-scan-in') {
    if (!row) return
    const id = rowId(row)
    if (id === undefined) {
      error.value = 'ID Goods Receipt tidak ditemukan.'
      return
    }
    await router.push(`/procurement/goods-receipts/${encodeURIComponent(String(id))}/scan-in`)
    return
  }
  if (
    action.handler === 'delivery-order-picking' ||
    action.handler === 'delivery-order-scan-out' ||
    action.handler === 'delivery-order-scan-in'
  ) {
    if (!row) return
    const id = rowId(row)
    if (id === undefined) {
      error.value = 'ID Surat Jalan tidak ditemukan.'
      return
    }
    const scanPath =
      action.handler === 'delivery-order-picking'
        ? 'picking'
        : action.handler === 'delivery-order-scan-out'
          ? 'scan-out'
          : 'scan-in'
    await router.push(`/inventory/delivery-orders/${encodeURIComponent(String(id))}/${scanPath}`)
    return
  }
  if (action.handler === 'item-usage-scan') {
    if (!row) return
    const id = rowId(row)
    if (id === undefined) {
      error.value = 'ID pengeluaran barang tidak ditemukan.'
      return
    }
    await router.push(`/inventory/item-usages/${encodeURIComponent(String(id))}/scan`)
    return
  }
  if (action.handler === 'generate-qr-labels') {
    await openGoodsReceiptQrLabels(row, true)
    return
  }
  if (action.handler === 'qr-labels') {
    await openGoodsReceiptQrLabels(row, false)
    return
  }
  if (action.openHtmlPath) {
    await openHtmlAction(action, row)
    return
  }
  const operation = getOperation(action.operationId)
  if (!operation) return
  formHint.value = ''
  selected.value = row ?? null
  activeAction.value = action
  formOperation.value = operation
  if (operation.body?.properties && Object.keys(operation.body.properties).length) {
    formMode.value = 'action'
    let source: unknown = initialValue(operation.body)
    if (
      row &&
      [
        'SetUserAccess',
        'AssignUserCategoryGroups',
        'AssignUserRoles',
        'AssignRolePermissions',
      ].includes(action.operationId)
    ) {
      const id = rowId(row)
      if (id !== undefined) {
        try {
          if (action.operationId === 'SetUserAccess') {
            const current = asRecord(
              await executeOperation('FindUserAccess', { path: { id: String(id) } }),
            )
            source = {
              system_role_ids: (Array.isArray(current.system_roles) ? current.system_roles : [])
                .map((raw) => String(asRecord(raw).role_id ?? ''))
                .filter(Boolean),
              companies: (Array.isArray(current.companies) ? current.companies : []).map((raw) => {
                const company = asRecord(raw)
                return {
                  company_id: Number(company.company_id),
                  is_default: Boolean(company.is_default),
                  scope_mode: String(company.scope_mode || 'LOCATION_TREE'),
                  location_ids: (Array.isArray(company.locations) ? company.locations : [])
                    .map((location) => Number(asRecord(location).location_id))
                    .filter((value) => Number.isFinite(value) && value > 0),
                  category_groups: (Array.isArray(company.category_groups)
                    ? company.category_groups
                    : []
                  ).map((rawGroup) => {
                    const group = asRecord(rawGroup)
                    return {
                      category_group_id: Number(group.category_group_id),
                      is_default: Boolean(group.is_default),
                      role_ids: (Array.isArray(group.roles) ? group.roles : [])
                        .map((role) => String(asRecord(role).role_id ?? ''))
                        .filter(Boolean),
                    }
                  }),
                }
              }),
            }
          } else if (action.operationId === 'AssignUserCategoryGroups') {
            const current = normalizeList<Record<string, unknown>>(
              await executeOperation('FindUserCategoryGroups', { path: { id: String(id) } }),
            )
            source = {
              category_group_ids: current
                .map((item) => Number(item.category_group_id ?? item.id))
                .filter((value) => Number.isFinite(value) && value > 0),
            }
          } else if (action.operationId === 'AssignUserRoles') {
            const current = normalizeList<Record<string, unknown>>(
              await executeOperation('FindUserRoles', { path: { id: String(id) } }),
            )
            source = {
              role_ids: current
                .map((item) => String(item.role_id ?? item.id ?? ''))
                .filter(Boolean),
            }
          } else if (action.operationId === 'AssignRolePermissions') {
            const current = normalizeList<Record<string, unknown>>(
              await executeOperation('FindRolePermissions', { path: { id: String(id) } }),
            )
            source = {
              permission_ids: current
                .map((item) => String(item.permission_id ?? item.id ?? ''))
                .filter(Boolean),
            }
          }
        } catch (cause) {
          formHint.value = errorMessage(cause, 'Data hak akses lama tidak dapat dimuat.')
        }
      }
    }
    if (
      [
        'UpdateGoodsReceiptLines',
        'ApproveItemRequest',
        'ConfirmDeliveryOrderPicking',
        'ConfirmDeliveryOrderPacking',
        'ApproveComplaintReturn',
      ].includes(action.operationId) &&
      row &&
      definition.value?.detailOperationId
    ) {
      const detailOperation = getOperation(definition.value.detailOperationId)
      if (detailOperation) {
        try {
          const actionDetail = asRecord(
            await executeOperation(definition.value.detailOperationId, {
              path: pathValues(detailOperation, row),
            }),
          )
          if (action.operationId === 'ApproveItemRequest') {
            const lines = Array.isArray(actionDetail.lines) ? actionDetail.lines : []
            source = {
              notes: actionDetail.notes ?? '',
              lines: lines.map((raw) => {
                const line = asRecord(raw)
                return {
                  request_line_id: line.request_line_id,
                  item_id: line.item_id,
                  item_code: line.item_code,
                  item_name: line.item_name,
                  part_number: line.part_number,
                  uom_code: line.uom_code,
                  uom_name: line.uom_name,
                  requested_qty: line.requested_qty,
                  available_stock_qty: line.available_stock_qty,
                  line_status: line.line_status,
                  approved_qty:
                    asNumber(line.approved_qty) > 0
                      ? asNumber(line.approved_qty)
                      : asNumber(line.requested_qty),
                }
              }),
            }
          } else if (
            ['ConfirmDeliveryOrderPicking', 'ConfirmDeliveryOrderPacking'].includes(
              action.operationId,
            )
          ) {
            const lines = Array.isArray(actionDetail.lines) ? actionDetail.lines : []
            const packing = action.operationId === 'ConfirmDeliveryOrderPacking'
            source = {
              notes: '',
              lines: lines.map((raw) => {
                const line = asRecord(raw)
                const requested =
                  asNumber(line.qty) || asNumber(line.requested_qty) || asNumber(line.approved_qty)
                const defaultQty = packing
                  ? asNumber(line.packed_qty) || asNumber(line.picked_qty) || requested
                  : asNumber(line.picked_qty) || requested
                return {
                  delivery_line_id: line.delivery_line_id,
                  item_id: line.item_id,
                  item_code: line.item_code,
                  item_name: line.item_name,
                  tracking_type: line.tracking_type,
                  part_number: line.part_number,
                  uom_code: line.uom_code,
                  uom_name: line.uom_name,
                  requested_qty: requested,
                  picked_qty: line.picked_qty,
                  packed_qty: line.packed_qty,
                  qty: defaultQty,
                }
              }),
            }
          } else if (action.operationId === 'ApproveComplaintReturn') {
            const lines = Array.isArray(actionDetail.lines) ? actionDetail.lines : []
            source = {
              resolution_notes: actionDetail.resolution_notes ?? '',
              lines: lines.map((raw) => {
                const line = asRecord(raw)
                return {
                  complaint_line_id: line.complaint_line_id,
                  approved_qty: asNumber(line.approved_qty) || asNumber(line.problem_qty) || 1,
                  action_type: line.action_type || 'REPLACE',
                }
              }),
            }
          } else {
            source = actionDetail
          }
        } catch {
          source = row
        }
      }
    }
    const mergedModel = mergeModel(operation.body, source) as Record<string, unknown>
    if (action.operationId === 'ApproveItemRequest') {
      const approvalLines = asRecord(source).lines
      if (Array.isArray(approvalLines)) {
        // Kolom identitas barang hanya dipakai untuk tampilan. cleanPayload tetap
        // mengirim request_line_id dan approved_qty sesuai kontrak API.
        mergedModel.lines = approvalLines
      }
    }
    formModel.value = mergedModel
    showForm.value = true
    return
  }
  if (action.confirm) {
    pendingConfirmAction.value = { action, operation, row }
    return
  }
  await runAction(action, operation, row)
}
function closeActionConfirm(): void {
  if (!saving.value) pendingConfirmAction.value = null
}

async function confirmPendingAction(): Promise<void> {
  const pending = pendingConfirmAction.value
  if (!pending) return
  pendingConfirmAction.value = null
  await runAction(pending.action, pending.operation, pending.row)
}

async function runAction(
  action: ResourceActionDefinition,
  operation: ApiOperation,
  row?: Record<string, unknown>,
  body?: unknown,
) {
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    await executeOperation(action.operationId, { path: pathValues(operation, row, action), body })
    success.value = action.successMessage ?? `${action.label} berhasil diproses.`
    showForm.value = false
    if (showDetail.value && selected.value) await openDetail(selected.value)
    await load()
  } catch (cause) {
    error.value = errorMessage(cause, `${action.label} gagal diproses.`)
  } finally {
    saving.value = false
  }
}
async function submitForm() {
  if (!formOperation.value || !definition.value) return
  if (formMode.value === 'create' && definition.value.key === 'delivery-orders') {
    const requestStatus = String(formModel.value._delivery_request_status ?? '').toUpperCase()
    const fromWarehouseID = asNumber(formModel.value.from_warehouse_id)
    const toWarehouseID = asNumber(formModel.value.to_warehouse_id)
    const lines = Array.isArray(formModel.value.lines) ? formModel.value.lines : []
    if (!deliveryOrderReadyStatuses.has(requestStatus)) {
      error.value =
        requestStatus === 'STOCK_AVAILABLE'
          ? 'Permintaan baru selesai dicek stok. Jalankan Setujui terlebih dahulu sebelum membuat Surat Jalan.'
          : `Permintaan berstatus ${requestStatus || 'belum diketahui'} dan belum dapat dibuatkan Surat Jalan.`
      return
    }
    if (!fromWarehouseID || !toWarehouseID) {
      error.value =
        'Gudang asal atau gudang tujuan belum termuat. Pilih ulang permintaan barang lalu tunggu detailnya selesai dimuat.'
      return
    }
    if (fromWarehouseID === toWarehouseID) {
      error.value =
        'Gudang asal dan tujuan sama. Gunakan menu Pemakaian Lokal untuk permintaan dalam satu gudang.'
      return
    }
    if (
      lines.length === 0 ||
      lines.some((raw) => {
        const line = asRecord(raw)
        return !asNumber(line.request_line_id) || asNumber(line.qty) <= 0
      })
    ) {
      error.value = 'Barang yang dikirim belum lengkap atau jumlah kirim belum valid.'
      return
    }
  }
  const body = cleanPayload(formOperation.value.body ?? undefined, formModel.value, true)
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    if (formMode.value === 'action' && activeAction.value) {
      await runAction(activeAction.value, formOperation.value, selected.value ?? undefined, body)
      return
    }
    const path =
      formMode.value === 'edit' && selected.value
        ? pathValues(formOperation.value, selected.value)
        : {}
    await executeOperation(formOperation.value.operationId, { path, body })
    success.value = `${definition.value.title} berhasil ${formMode.value === 'create' ? 'dibuat' : 'diperbarui'}.`
    showForm.value = false
    await load()
  } catch (cause) {
    error.value = errorMessage(cause, `${definition.value.title} gagal disimpan.`)
  } finally {
    saving.value = false
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
function asNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
async function hydrateTransactionReference(
  kind: 'po' | 'request' | 'purchase-request' | 'usage-request',
  value: unknown,
) {
  if (formMode.value !== 'create' || value === '' || value === null || value === undefined) return
  const signature = `${definition.value?.key}:${kind}:${String(value)}`
  if (signature === lastHydratedReference.value) return
  lastHydratedReference.value = signature
  hydrating.value = true
  formHint.value = ''
  try {
    if (kind === 'po' && definition.value?.key === 'goods-receipts') {
      const po = asRecord(
        await executeOperation('FindPurchaseOrderByID', { path: { id: String(value) } }),
      )
      const lines = Array.isArray(po.lines)
        ? po.lines
            .map((raw) => {
              const line = asRecord(raw)
              const remaining = Math.max(
                0,
                asNumber(line.ordered_qty) - asNumber(line.received_qty),
              )
              return {
                po_line_id: line.po_line_id,
                item_id: line.item_id,
                part_id: line.part_id || undefined,
                uom_id: line.uom_id,
                lot_no: line.lot_no || undefined,
                ordered_qty: line.ordered_qty,
                received_qty: remaining,
                accepted_qty: remaining,
                rejected_qty: 0,
                condition_status: 'GOOD',
                purchase_unit_price: line.unit_price,
                currency_code: po.currency_code || 'IDR',
                notes: '',
              }
            })
            .filter((line) => asNumber(line.received_qty) > 0)
        : []
      formModel.value = {
        ...formModel.value,
        po_id: po.po_id ?? value,
        supplier_id: po.supplier_id,
        warehouse_id: po.warehouse_id,
        lines,
      }
      formHint.value = lines.length
        ? `${lines.length} baris PO dimuat otomatis. Sesuaikan qty datang, diterima, ditolak, dan kondisi sebelum menyimpan.`
        : 'PO ini tidak memiliki sisa quantity yang dapat diterima.'
    }
    if (kind === 'request' && definition.value?.key === 'delivery-orders') {
      const request = asRecord(
        await executeOperation('FindItemRequestByID', { path: { id: String(value) } }),
      )
      const requestStatus = String(request.status ?? '').toUpperCase()
      const fulfillmentWarehouseID = asNumber(request.fulfillment_warehouse_id)
      const requesterWarehouseID = asNumber(request.requester_warehouse_id)
      if (!deliveryOrderReadyStatuses.has(requestStatus)) {
        formModel.value = {
          ...formModel.value,
          request_id: request.request_id ?? value,
          _delivery_request_status: requestStatus,
          from_warehouse_id: fulfillmentWarehouseID || '',
          from_warehouse_name: request.fulfillment_warehouse ?? '',
          to_warehouse_id: requesterWarehouseID || '',
          to_warehouse_name: request.requester_warehouse ?? '',
          lines: [],
        }
        formHint.value =
          requestStatus === 'STOCK_AVAILABLE'
            ? 'Stok sudah tersedia, tetapi permintaan belum disetujui. Jalankan tindakan Setujui pada Permintaan Barang terlebih dahulu.'
            : `Permintaan berstatus ${requestStatus || 'belum diketahui'} dan belum dapat dibuatkan Surat Jalan.`
        return
      }
      if (!fulfillmentWarehouseID || !requesterWarehouseID) {
        formModel.value = {
          ...formModel.value,
          request_id: request.request_id ?? value,
          _delivery_request_status: requestStatus,
          from_warehouse_id: fulfillmentWarehouseID || '',
          from_warehouse_name: request.fulfillment_warehouse ?? '',
          to_warehouse_id: requesterWarehouseID || '',
          to_warehouse_name: request.requester_warehouse ?? '',
          lines: [],
        }
        formHint.value =
          'Permintaan belum memiliki gudang pemenuh atau gudang pemohon. Jalankan Cek Stok dan periksa master gudang terlebih dahulu.'
        return
      }
      if (fulfillmentWarehouseID === requesterWarehouseID) {
        formModel.value = {
          ...formModel.value,
          request_id: request.request_id ?? value,
          _delivery_request_status: requestStatus,
          from_warehouse_id: fulfillmentWarehouseID,
          from_warehouse_name: request.fulfillment_warehouse ?? '',
          to_warehouse_id: requesterWarehouseID,
          to_warehouse_name: request.requester_warehouse ?? '',
          lines: [],
        }
        formHint.value =
          'Gudang pemenuh sama dengan gudang pemohon. Proses permintaan ini melalui menu Pemakaian Lokal, bukan Surat Jalan.'
        return
      }
      const lines = Array.isArray(request.lines)
        ? request.lines
            .map((raw) => {
              const line = asRecord(raw)
              const remaining =
                asNumber(line.remaining_qty) ||
                Math.max(0, asNumber(line.approved_qty) - asNumber(line.shipped_qty))
              return {
                request_line_id: line.request_line_id,
                item_id: line.item_id,
                item_code: line.item_code,
                item_name: line.item_name,
                tracking_type: line.tracking_type,
                part_number: line.part_number,
                uom_code: line.uom_code,
                uom_name: line.uom_name,
                requested_qty: line.requested_qty,
                approved_qty: line.approved_qty,
                shipped_qty: line.shipped_qty,
                remaining_qty: remaining,
                lot_locked: Boolean(line.lot_no),
                lot_no: line.lot_no || undefined,
                qty: remaining,
                notes: '',
              }
            })
            .filter((line) => asNumber(line.qty) > 0)
        : []
      formModel.value = {
        ...formModel.value,
        request_id: request.request_id ?? value,
        _delivery_request_status: requestStatus,
        from_warehouse_id: fulfillmentWarehouseID,
        from_warehouse_name: request.fulfillment_warehouse ?? '',
        to_warehouse_id: requesterWarehouseID,
        to_warehouse_name: request.requester_warehouse ?? '',
        lines,
      }
      formHint.value = lines.length
        ? `${lines.length} barang dimuat otomatis. Gudang asal diambil dari gudang pemenuh dan gudang tujuan dari gudang pemohon. Keduanya dikunci agar rute pengiriman tidak menyimpang dari permintaan.`
        : 'Permintaan ini tidak memiliki sisa quantity yang dapat dikirim.'
    }
    if (kind === 'purchase-request' && definition.value?.key === 'purchase-orders') {
      const request = asRecord(
        await executeOperation('FindItemRequestByID', { path: { id: String(value) } }),
      )
      const lines = Array.isArray(request.lines)
        ? request.lines
            .map((raw) => {
              const line = asRecord(raw)
              const remaining =
                asNumber(line.remaining_qty) ||
                Math.max(0, asNumber(line.approved_qty) - asNumber(line.shipped_qty))
              const shortage = Math.max(0, remaining - asNumber(line.available_stock_qty))
              return {
                request_line_id: line.request_line_id,
                item_id: line.item_id,
                part_id: line.part_id || undefined,
                uom_id: line.uom_id,
                lot_no: line.lot_no || undefined,
                ordered_qty: shortage,
                _remaining_qty: remaining,
                _central_shortage_qty: shortage,
                unit_price: '',
                notes: '',
              }
            })
            .filter((line) => asNumber(line.ordered_qty) > 0)
        : []
      formModel.value = {
        ...formModel.value,
        source_request_id: request.request_id ?? value,
        warehouse_id: request.fulfillment_warehouse_id,
        _request_status: request.status,
        _requester_warehouse_id: request.requester_warehouse_id,
        _fulfillment_warehouse_id: request.fulfillment_warehouse_id,
        expected_date: request.needed_date,
        lines,
      }
      formHint.value = lines.length
        ? `${lines.length} baris dimuat. Gunakan gudang pemenuh untuk pengadaan pusat, atau pilih gudang pemohon untuk pembelian daerah. Pembelian daerah hanya dapat dilakukan setelah status permintaan menjadi Menunggu Pengadaan dan tetap memerlukan persetujuan pusat.`
        : 'Permintaan ini tidak memiliki sisa quantity yang perlu dibeli.'
    }
    if (kind === 'usage-request' && definition.value?.key === 'item-usages') {
      const request = asRecord(
        await executeOperation('FindItemRequestByID', { path: { id: String(value) } }),
      )
      const requesterWarehouseID = asNumber(request.requester_warehouse_id)
      const fulfillmentWarehouseID = asNumber(request.fulfillment_warehouse_id)
      if (!fulfillmentWarehouseID) {
        formModel.value = {
          ...formModel.value,
          source_request_id: '',
          warehouse_id: '',
          warehouse_name: '',
          location_id: '',
          location_name: '',
          lines: [],
        }
        formHint.value =
          'Permintaan ini belum memiliki gudang pemenuh. Jalankan Cek Stok dan persetujuan terlebih dahulu.'
        return
      }
      if (requesterWarehouseID !== fulfillmentWarehouseID) {
        formModel.value = {
          ...formModel.value,
          source_request_id: '',
          warehouse_id: '',
          warehouse_name: '',
          location_id: '',
          location_name: '',
          lines: [],
        }
        formHint.value = `Permintaan ${String(
          request.request_no ?? '',
        )} adalah pengiriman antar lokasi: ${String(
          request.fulfillment_warehouse ?? 'gudang pemenuh',
        )} → ${String(
          request.requester_warehouse ?? 'gudang pemohon',
        )}. Proses permintaan ini melalui Surat Jalan / Delivery Order, bukan Pengeluaran Berdasarkan Permintaan.`
        return
      }
      const lines = Array.isArray(request.lines)
        ? request.lines
            .map((raw) => {
              const line = asRecord(raw)
              const remaining =
                asNumber(line.remaining_qty) ||
                Math.max(
                  0,
                  asNumber(line.approved_qty) -
                    Math.max(asNumber(line.received_qty), asNumber(line.shipped_qty)),
                )
              return {
                request_line_id: line.request_line_id,
                item_id: line.item_id,
                item_code: line.item_code,
                item_name: line.item_name,
                part_id: line.part_id || undefined,
                part_number: line.part_number,
                uom_id: line.uom_id,
                uom_code: line.uom_code,
                uom_name: line.uom_name,
                lot_no: line.lot_no || undefined,
                qty: remaining,
                remaining_qty: remaining,
                notes: '',
              }
            })
            .filter((line) => asNumber(line.qty) > 0)
        : []
      formModel.value = {
        ...formModel.value,
        source_request_id: request.request_id ?? value,
        issue_mode: 'REQUEST',
        warehouse_id: fulfillmentWarehouseID,
        warehouse_name: request.fulfillment_warehouse ?? '',
        location_id: request.requester_location_id,
        location_name: request.requester_location ?? request.fulfillment_location ?? '',
        responsibility_type: 'LOCATION',
        responsibility_location_id: request.requester_location_id,
        reference_no: request.request_no,
        lines,
      }
      formHint.value = lines.length
        ? `${lines.length} barang dimuat dari permintaan lokal ${String(
            request.request_no ?? '',
          )}. Gudang pengeluaran mengikuti gudang pemenuh pada permintaan dan dikunci agar stok tidak terpotong dari gudang yang salah.`
        : 'Permintaan ini tidak memiliki sisa quantity yang dapat dikeluarkan.'
    }
  } catch (cause) {
    formHint.value = errorMessage(
      cause,
      'Detail referensi tidak dapat dimuat otomatis. Anda masih dapat mengisi form secara manual.',
    )
  } finally {
    hydrating.value = false
  }
}

function closeForm() {
  if (!saving.value) {
    showForm.value = false
    formMode.value = null
    formOperation.value = null
    activeAction.value = null
    formHint.value = ''
    lastHydratedReference.value = ''
  }
}
function closeDetail() {
  showDetail.value = false
  selected.value = null
  detail.value = null
  childData.value = {}
}
function closeRowMenu(): void {
  rowMenu.value = null
  rowMenuRow.value = null
  rowMenuButton.value = null
}

function positionRowMenu(): void {
  const button = rowMenuButton.value
  if (!button || !rowMenu.value) return
  const buttonRect = button.getBoundingClientRect()
  const menuWidth = rowMenuPosition.width
  const menuHeight = rowMenuElement.value?.offsetHeight ?? 220
  const viewportPadding = 12
  const left = Math.min(
    window.innerWidth - menuWidth - viewportPadding,
    Math.max(viewportPadding, buttonRect.right - menuWidth),
  )
  const roomBelow = window.innerHeight - buttonRect.bottom
  const top =
    roomBelow >= menuHeight + 12
      ? buttonRect.bottom + 6
      : Math.max(viewportPadding, buttonRect.top - menuHeight - 6)
  rowMenuPosition.left = left
  rowMenuPosition.top = top
}

async function toggleRowMenu(event: MouseEvent, row: Record<string, unknown>): Promise<void> {
  const id = String(rowId(row))
  if (rowMenu.value === id) {
    closeRowMenu()
    return
  }
  rowMenu.value = id
  rowMenuRow.value = row
  rowMenuButton.value = event.currentTarget as HTMLElement
  await nextTick()
  positionRowMenu()
}

function handleRowMenuOutside(event: MouseEvent): void {
  const target = event.target as Node | null
  if (target && (rowMenuElement.value?.contains(target) || rowMenuButton.value?.contains(target)))
    return
  closeRowMenu()
}

function handleRowMenuKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeRowMenu()
}

function chooseRowAction(action: ResourceActionDefinition, row: Record<string, unknown>) {
  closeRowMenu()
  void beginAction(action, row)
}
function chooseOpenRowAction(action: ResourceActionDefinition): void {
  const row = rowMenuRow.value
  if (!row) return
  chooseRowAction(action, row)
}
function changePage(next: number) {
  page.value = Math.min(Math.max(1, next), pageCount.value)
  void load()
}
function changePageSize(value?: string | string[]) {
  if (typeof value === 'string') perPage.value = Number(value) || 25
  page.value = 1
  void load()
}
function chooseListView(key: string): void {
  if (activeListView.value === key) return
  activeListView.value = key
  page.value = 1
  closeRowMenu()
  void load()
}

watch(success, (message) => {
  window.clearTimeout(successNoticeTimer)
  successNoticeTimer = undefined
  if (!message) return
  successNoticeTimer = window.setTimeout(() => {
    success.value = ''
    successNoticeTimer = undefined
  }, 5000)
})

watch(error, (message) => {
  window.clearTimeout(errorNoticeTimer)
  errorNoticeTimer = undefined
  if (!message) return
  errorNoticeTimer = window.setTimeout(() => {
    error.value = ''
    errorNoticeTimer = undefined
  }, 8000)
})

onMounted(() => {
  void load()
  document.addEventListener('click', handleRowMenuOutside)
  document.addEventListener('keydown', handleRowMenuKeydown)
  document.addEventListener('scroll', closeRowMenu, true)
  window.addEventListener('resize', closeRowMenu)
})

onBeforeUnmount(() => {
  clearNotices()
  window.clearTimeout(searchTimer)
  document.removeEventListener('click', handleRowMenuOutside)
  document.removeEventListener('keydown', handleRowMenuKeydown)
  document.removeEventListener('scroll', closeRowMenu, true)
  window.removeEventListener('resize', closeRowMenu)
})
function resetWorkbench(): void {
  clearNotices()
  activeListView.value = definition.value?.listViews?.[0]?.key ?? ''
  closeRowMenu()
  showDetail.value = false
  showForm.value = false
  showQrLabels.value = false
  pendingDeleteRow.value = null
  pendingConfirmAction.value = null
  page.value = 1
  search.value = ''
  lastAutoOpenedDocument = ''
  void load()
}

watch(() => props.moduleKey, resetWorkbench)
watch(() => route.fullPath, resetWorkbench)
let searchTimer: number | undefined
watch(search, () => {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    page.value = 1
    load()
  }, 450)
})

watch(
  () => formModel.value.po_id,
  (value) => {
    if (definition.value?.key === 'goods-receipts') void hydrateTransactionReference('po', value)
  },
)
watch(
  () => formModel.value.request_id,
  (value) => {
    if (definition.value?.key === 'delivery-orders')
      void hydrateTransactionReference('request', value)
  },
)
watch(
  () => formModel.value.source_request_id,
  (value) => {
    if (definition.value?.key === 'purchase-orders') {
      if (value === '' || value === null || value === undefined) {
        lastHydratedReference.value = ''
        const lines = Array.isArray(formModel.value.lines) ? formModel.value.lines : []
        formModel.value = {
          ...formModel.value,
          _request_status: '',
          _requester_warehouse_id: '',
          _fulfillment_warehouse_id: '',
          lines: lines.map((raw) => ({ ...asRecord(raw), request_line_id: '' })),
        }
        formHint.value = ''
      } else {
        void hydrateTransactionReference('purchase-request', value)
      }
    }
    if (definition.value?.key === 'item-usages' && formModel.value.issue_mode === 'REQUEST')
      void hydrateTransactionReference('usage-request', value)
  },
)

watch(
  () => formModel.value.warehouse_id,
  (value, previous) => {
    if (
      definition.value?.key !== 'purchase-orders' ||
      formMode.value !== 'create' ||
      !formModel.value.source_request_id ||
      value === previous
    )
      return

    const selectedWarehouseID = asNumber(value)
    const requesterWarehouseID = asNumber(formModel.value._requester_warehouse_id)
    const fulfillmentWarehouseID = asNumber(formModel.value._fulfillment_warehouse_id)
    const isLocalPurchase = selectedWarehouseID > 0 && selectedWarehouseID === requesterWarehouseID
    const isCentralPurchase =
      selectedWarehouseID > 0 && selectedWarehouseID === fulfillmentWarehouseID

    if (!isLocalPurchase && !isCentralPurchase) {
      formHint.value =
        'Untuk PO berdasarkan permintaan, gudang harus berupa gudang pemenuh pusat atau gudang pemohon daerah.'
      return
    }

    const lines = Array.isArray(formModel.value.lines) ? formModel.value.lines : []
    formModel.value = {
      ...formModel.value,
      lines: lines.map((raw) => {
        const line = asRecord(raw)
        return {
          ...line,
          ordered_qty: isLocalPurchase
            ? asNumber(line._remaining_qty)
            : asNumber(line._central_shortage_qty),
        }
      }),
    }

    if (isLocalPurchase) {
      const status = String(formModel.value._request_status ?? '').toUpperCase()
      formHint.value = ['WAITING_PURCHASE', 'PARTIALLY_FULFILLED'].includes(status)
        ? 'Mode pembelian daerah aktif. Barang diterima langsung ke gudang pemohon dan setelah diposting akan memenuhi permintaan tanpa Surat Jalan dari pusat.'
        : 'Gudang daerah dipilih, tetapi permintaan belum berstatus Menunggu Pengadaan. Pusat harus menjalankan tindakan Tunggu Pengadaan terlebih dahulu.'
      return
    }

    formHint.value =
      'Mode pengadaan pusat aktif. Barang diterima di gudang pemenuh, lalu dikirim ke daerah menggunakan Surat Jalan / Delivery Order.'
  },
)
</script>

<template>
  <div v-if="definition" class="page-stack page-stack--resource">
    <PageHeader :title="displayTitle" :description="displayDescription">
      <template #actions>
        <div class="page-action-row">
          <AppButton
            v-if="definition.key === 'item-units' && can('inventory.item_units.read')"
            variant="ghost"
            @click="lookupItemUnitByQr"
            ><QrCode :size="17" /> Cari / Scan QR</AppButton
          >
          <AppButton
            v-for="action in globalActions"
            :key="action.operationId"
            :variant="action.tone ?? 'ghost'"
            :disabled="!can(action.permission)"
            @click="beginAction(action)"
            >{{ action.label }}</AppButton
          >
          <AppButton
            v-if="createOperation && can(definition.createPermission) && !definition.readOnly"
            @click="openCreate"
            ><Plus :size="17" /> {{ createButtonLabel }}</AppButton
          >
        </div>
      </template>
    </PageHeader>

    <div v-if="error" class="notice notice--danger notice--dismissible" role="alert">
      <span>{{ error }}</span>
      <button type="button" aria-label="Tutup pesan error" @click="clearErrorNotice">×</button>
    </div>
    <div
      v-if="success"
      class="notice notice--success notice--dismissible"
      role="status"
      aria-live="polite"
    >
      <span>{{ success }}</span>
      <button type="button" aria-label="Tutup pesan sukses" @click="clearSuccessNotice">×</button>
    </div>

    <div
      v-if="listViews.length"
      class="resource-list-views"
      role="tablist"
      aria-label="Filter status dokumen"
    >
      <button
        v-for="view in listViews"
        :key="view.key"
        type="button"
        :class="{ active: currentListView?.key === view.key }"
        @click="chooseListView(view.key)"
      >
        {{ view.label }}
      </button>
    </div>

    <AppCard flush class="resource-table-card">
      <AppDataTable
        v-model:search="search"
        :rows="rows"
        :columns="dataTableColumns"
        :loading="loading"
        :page="page"
        :per-page="perPage"
        :total="total"
        :has-more="hasMore"
        :row-key="(row, index) => String(rowId(row) ?? index)"
        server-side
        show-actions
        :empty-title="`Belum ada ${displayTitle}`"
        empty-description="Data akan muncul setelah tersedia pada backend."
        @update:per-page="changePageSize(String($event))"
        @page-change="changePage"
        @refresh="load"
      >
        <template #cell="{ row, column }">
          <div
            v-if="isAuditLogTable && column.key === 'full_name'"
            class="audit-cell audit-cell--user"
          >
            <strong>{{ displayValue(row.full_name) }}</strong>
            <span>{{ displayValue(row.email) }}</span>
          </div>
          <div
            v-else-if="isAuditLogTable && column.key === 'action'"
            class="audit-cell audit-cell--activity"
          >
            <strong>{{ auditActionLabel(row.action) }}</strong>
            <span class="audit-method" :class="auditMethodClass(row.method)">
              {{ displayValue(row.method) }}
            </span>
          </div>
          <div
            v-else-if="isAuditLogTable && column.key === 'raw_path'"
            class="audit-cell audit-cell--endpoint"
          >
            <code :title="String(row.raw_path ?? row.path ?? '')">
              {{ displayValue(row.raw_path ?? row.path) }}
            </code>
            <span v-if="row.path && row.path !== row.raw_path">{{ displayValue(row.path) }}</span>
          </div>
          <div
            v-else-if="isAuditLogTable && column.key === 'status_code'"
            class="audit-cell audit-cell--response"
          >
            <span class="audit-response" :class="auditResponseClass(row.status_code)">
              {{ displayValue(row.status_code) }}
            </span>
            <span>{{ displayValue(row.latency_ms) }} ms</span>
          </div>
          <template v-else-if="column.key === 'procurement_route'">
            {{ procurementRouteLabel(row[column.key]) }}
          </template>
          <StatusBadge v-else-if="isStatusColumn(column.key)" :value="row[column.key]" />
          <template v-else>{{ displayValue(row[column.key]) }}</template>
        </template>
        <template #actions="{ row }">
          <div class="row-actions">
            <button class="table-action" type="button" title="Detail" @click="openDetail(row)">
              <Eye :size="16" />
            </button>
            <button
              v-if="rowEditable(row)"
              class="table-action"
              type="button"
              title="Edit"
              @click="openEdit(row)"
            >
              <Pencil :size="16" />
            </button>
            <button
              v-if="rowDeletable(row)"
              class="table-action table-action--danger"
              type="button"
              title="Hapus"
              @click="remove(row)"
            >
              <Trash2 :size="16" />
            </button>
            <div v-if="rowActions.some((action) => actionVisible(action, row))" class="action-menu">
              <button
                class="table-action"
                type="button"
                aria-label="Buka aksi lainnya"
                :aria-expanded="rowMenu === String(rowId(row))"
                @click.stop="toggleRowMenu($event, row)"
              >
                <MoreHorizontal :size="17" />
              </button>
            </div>
          </div>
        </template>
      </AppDataTable>
    </AppCard>

    <Teleport to="body">
      <div
        v-if="rowMenu && rowMenuRow"
        ref="rowMenuElement"
        class="action-menu__popover action-menu__popover--portal"
        :style="{
          top: `${rowMenuPosition.top}px`,
          left: `${rowMenuPosition.left}px`,
          width: `${rowMenuPosition.width}px`,
        }"
        role="menu"
        @click.stop
      >
        <button
          v-for="action in openRowMenuActions"
          :key="action.operationId"
          type="button"
          role="menuitem"
          :class="{ 'is-danger': action.tone === 'danger' }"
          @click="chooseOpenRowAction(action)"
        >
          {{ action.label }}
        </button>
      </div>
    </Teleport>

    <GoodsReceiptQrModal
      :open="showQrLabels"
      :receipt="qrReceipt"
      :codes="qrLabels"
      :notice="qrLabelNotice"
      @close="closeQrLabels"
    />

    <AppModal
      :open="showForm"
      :title="
        formMode === 'create'
          ? `${createButtonLabel}`
          : formMode === 'edit'
            ? `Edit ${displayTitle}`
            : (activeAction?.label ?? 'Proses')
      "
      :description="formDescription"
      size="xl"
      :busy="saving"
      :layer="showDetail ? 2 : 1"
      @close="closeForm"
    >
      <div
        v-if="formHint"
        class="notice"
        :class="
          formHint.includes('tidak') || formHint.includes('gagal')
            ? 'notice--warning'
            : 'notice--info'
        "
      >
        {{ formHint }}
      </div>
      <form v-if="formOperation?.body" id="resource-form" @submit.prevent="submitForm">
        <UserAccessEditor
          v-if="activeAction?.operationId === 'SetUserAccess'"
          v-model="formModel"
          :disabled="hydrating"
        />
        <SchemaFields
          v-else
          :schema="formOperation.body"
          v-model="formModel"
          :disabled="hydrating"
          :field-order="formFieldOrder"
          :disabled-fields="formDisabledFields"
          :option-defaults="formMode === 'create' ? definition?.createOptionDefaults : undefined"
          :grouping-context="formGroupingContext"
        />
      </form>
      <div v-else class="notice notice--warning">Action ini tidak membutuhkan data tambahan.</div>
      <template #footer
        ><AppButton variant="ghost" :disabled="saving" @click="closeForm">Batal</AppButton
        ><AppButton
          type="submit"
          form="resource-form"
          :loading="saving"
          @click="!formOperation?.body && submitForm()"
          >Simpan / Proses</AppButton
        ></template
      >
    </AppModal>

    <AppModal
      :open="showDetail"
      :title="`Detail ${displayTitle}`"
      size="xl"
      :busy="detailLoading"
      :layer="1"
      @close="closeDetail"
    >
      <div v-if="detailLoading" class="table-loading">
        <span v-for="item in 5" :key="item" class="skeleton skeleton--row"></span>
      </div>
      <template v-else>
        <div v-if="selected && groupedDetailActions.length" class="detail-action-groups">
          <section
            v-for="group in groupedDetailActions"
            :key="group.label"
            class="detail-action-group"
          >
            <span class="detail-action-group__label">{{ group.label }}</span>
            <div class="detail-actions">
              <AppButton
                v-for="action in group.actions"
                :key="action.operationId"
                :variant="action.tone ?? 'ghost'"
                @click="beginAction(action, selected)"
                >{{ action.label }}</AppButton
              >
            </div>
          </section>
        </div>
        <StructuredData
          :value="detailSummary"
          :grouping-context="`${definition?.key ?? ''} ${displayTitle}`"
        />
        <RelatedDataTable
          v-if="definition.key === 'category-groups'"
          title="Kategori dalam Group"
          :value="categoryGroupCategories"
          empty-text="Belum ada kategori di dalam group ini."
        />
        <template v-else>
          <RelatedDataTable
            v-for="(value, title) in childData"
            :key="title"
            :title="title"
            :value="value"
            :page-size="definition.key === 'roles' ? 8 : 10"
            :empty-text="`Belum ada ${String(title).toLowerCase()}.`"
          />
        </template>
        <DocumentAttachments
          v-if="
            definition.attachmentEntityType &&
            selected &&
            rowId(selected) !== undefined &&
            can('operations.attachments.read')
          "
          :key="`${definition.attachmentEntityType}-${String(rowId(selected))}`"
          :entity-type="definition.attachmentEntityType"
          :entity-id="rowId(selected)!"
        />
      </template>
      <template #footer><AppButton variant="ghost" @click="closeDetail">Tutup</AppButton></template>
    </AppModal>

    <AppConfirmDialog
      :open="Boolean(pendingDeleteRow)"
      title="Konfirmasi soft delete"
      :message="`Hapus ${displayTitle} ini?`"
      detail="Data tidak dihapus permanen. Data mengikuti aturan soft delete backend dan dapat dipulihkan melalui Recycle Bin apabila restore tersedia."
      confirm-label="Ya, hapus"
      tone="danger"
      :busy="saving"
      :layer="3"
      @close="closeDeleteConfirm"
      @confirm="confirmDelete"
    />

    <AppConfirmDialog
      :open="Boolean(pendingConfirmAction)"
      :title="pendingConfirmAction?.action.label ?? 'Konfirmasi tindakan'"
      :message="pendingConfirmAction?.action.confirm ?? 'Lanjutkan tindakan ini?'"
      detail="Periksa kembali data sebelum melanjutkan."
      confirm-label="Ya, lanjutkan"
      tone="warning"
      :busy="saving"
      :layer="3"
      @close="closeActionConfirm"
      @confirm="confirmPendingAction"
    />
  </div>
</template>

<style scoped>
.audit-cell {
  display: grid;
  min-width: 0;
  gap: 0.3rem;
}

.audit-cell strong {
  color: var(--text, #122033);
  font-size: 0.84rem;
  font-weight: 700;
  line-height: 1.3;
}

.audit-cell > span:not(.audit-method, .audit-response) {
  color: var(--text-muted, #66758a);
  font-size: 0.74rem;
  line-height: 1.3;
}

.audit-method,
.audit-response {
  align-items: center;
  border-radius: 999px;
  display: inline-flex;
  font-size: 0.67rem;
  font-weight: 800;
  justify-content: center;
  letter-spacing: 0.05em;
  line-height: 1;
  padding: 0.32rem 0.52rem;
  width: fit-content;
}

.audit-method--read {
  background: #e8f3ff;
  color: #1769aa;
}

.audit-method--create {
  background: #e7f8ef;
  color: #168354;
}

.audit-method--update {
  background: #fff4df;
  color: #a76000;
}

.audit-method--delete {
  background: #ffebee;
  color: #c62828;
}

.audit-cell--endpoint {
  max-width: 34rem;
}

.audit-cell--endpoint code {
  color: var(--text, #233247);
  display: block;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.74rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audit-response--success {
  background: #e7f8ef;
  color: #168354;
}

.audit-response--warning {
  background: #fff4df;
  color: #a76000;
}

.audit-response--error {
  background: #ffebee;
  color: #c62828;
}

.audit-response--neutral {
  background: #edf1f5;
  color: #58677a;
}

html[data-theme='dark'] .audit-cell strong,
html[data-theme='dark'] .audit-cell--endpoint code {
  color: #e9f0f7;
}
</style>
