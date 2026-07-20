<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Eye, Pencil, Plus, QrCode, Trash2, MoreHorizontal } from '@lucide/vue'
import { useRoute } from 'vue-router'
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
import GoodsReceiptQrModal, {
  type GoodsReceiptQrLabel,
} from '@/components/data/GoodsReceiptQrModal.vue'
import { resourceModules } from '@/config/modules'
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
const definition = computed(() => resourceModules[props.moduleKey])
const displayTitle = computed(() =>
  String(route.meta.pageTitle ?? definition.value?.title ?? 'Data'),
)
const displayDescription = computed(() =>
  String(route.meta.pageDescription ?? definition.value?.description ?? ''),
)
const createButtonLabel = computed(() => String(route.meta.createLabel ?? 'Tambah'))
const createDefaults = computed<Record<string, unknown>>(() => {
  const value = route.meta.createDefaults
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
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
const visibleColumns = computed(() => {
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
  visibleColumns.value.map((column) => ({
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
const visibleDetailActions = computed(() => {
  const allowedOperationIds = Array.isArray(route.meta.detailActionOperationIds)
    ? (route.meta.detailActionOperationIds as string[])
    : []
  return (definition.value?.detailActions ?? []).filter(
    (action) =>
      can(action.permission) &&
      (!allowedOperationIds.length || allowedOperationIds.includes(action.operationId)),
  )
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
  if (definition.value?.key !== 'category-groups') return detail.value
  const source = asRecord(detail.value)
  const summary = { ...source }
  delete summary.categories
  return summary
})

const categoryGroupCategories = computed<unknown>(() => {
  if (definition.value?.key !== 'category-groups') return []
  const child = childData.value['Kategori dalam Group']
  if (child !== undefined) return child
  return asRecord(detail.value).categories ?? []
})

function rowId(row: Record<string, unknown>): string | number | undefined {
  return resolveResourceId(row, definition.value?.idCandidates ?? ['id'])
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
        ...query,
      },
    })
    rows.value = normalizeList<Record<string, unknown>>(payload)
    total.value = extractTotal(payload)
    hasMore.value = rows.value.length >= perPage.value
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
    ...createDefaults.value,
  }
  showForm.value = true
}
async function openEdit(row: Record<string, unknown>) {
  if (!updateOperation.value?.body || !definition.value) return
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
      if (operation)
        detail.value = await executeOperation(definition.value.detailOperationId, {
          path: pathValues(operation, row),
        })
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
  selected.value = row ?? null
  activeAction.value = action
  formOperation.value = operation
  if (operation.body?.properties && Object.keys(operation.body.properties).length) {
    formMode.value = 'action'
    formModel.value = initialValue(operation.body) as Record<string, unknown>
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
async function hydrateTransactionReference(kind: 'po' | 'request', value: unknown) {
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
      const lines = Array.isArray(request.lines)
        ? request.lines
            .map((raw) => {
              const line = asRecord(raw)
              const remaining =
                asNumber(line.remaining_qty) ||
                Math.max(0, asNumber(line.approved_qty) - asNumber(line.shipped_qty))
              return { request_line_id: line.request_line_id, qty: remaining, notes: '' }
            })
            .filter((line) => asNumber(line.qty) > 0)
        : []
      formModel.value = {
        ...formModel.value,
        request_id: request.request_id ?? value,
        to_warehouse_id: request.requester_warehouse_id,
        lines,
      }
      formHint.value = lines.length
        ? `${lines.length} baris permintaan dimuat otomatis. Pilih warehouse asal dan periksa quantity pengiriman.`
        : 'Permintaan ini tidak memiliki sisa quantity yang dapat dikirim.'
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
  closeRowMenu()
  showDetail.value = false
  showForm.value = false
  showQrLabels.value = false
  pendingDeleteRow.value = null
  pendingConfirmAction.value = null
  page.value = 1
  search.value = ''
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
          <StatusBadge v-if="isStatusColumn(column.key)" :value="row[column.key]" />
          <template v-else>{{ displayValue(row[column.key]) }}</template>
        </template>
        <template #actions="{ row }">
          <div class="row-actions">
            <button class="table-action" type="button" title="Detail" @click="openDetail(row)">
              <Eye :size="16" />
            </button>
            <button
              v-if="updateOperation && can(definition.updatePermission) && !definition.readOnly"
              class="table-action"
              type="button"
              title="Edit"
              @click="openEdit(row)"
            >
              <Pencil :size="16" />
            </button>
            <button
              v-if="definition.deleteOperationId && can(definition.deletePermission)"
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
      :description="formOperation?.summary"
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
        <SchemaFields :schema="formOperation.body" v-model="formModel" :disabled="hydrating" />
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
        <div v-if="selected && visibleDetailActions.length" class="detail-actions">
          <AppButton
            v-for="action in visibleDetailActions"
            :key="action.operationId"
            :variant="action.tone ?? 'ghost'"
            @click="beginAction(action, selected)"
            >{{ action.label }}</AppButton
          >
        </div>
        <StructuredData :value="detailSummary" />
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
