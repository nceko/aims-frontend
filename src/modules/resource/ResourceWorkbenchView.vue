<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Eye, Pencil, Plus, QrCode, RefreshCw, Search, Trash2, MoreHorizontal } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SchemaFields from '@/components/data/SchemaFields.vue'
import StatusBadge from '@/components/data/StatusBadge.vue'
import StructuredData from '@/components/data/StructuredData.vue'
import DocumentAttachments from '@/components/data/DocumentAttachments.vue'
import { resourceModules } from '@/config/modules'
import { useAuthStore } from '@/modules/auth/auth.store'
import { executeOperation, getOperation } from '@/services/api-operations'
import { http } from '@/services/http'
import { errorMessage, normalizeList, unwrapData } from '@/utils/api'
import { cleanPayload, initialValue, mergeModel } from '@/utils/schema'
import { humanizeField } from '@/config/field-options'
import type { ApiOperation, ResourceActionDefinition } from '@/types/resource'

const props = defineProps<{ moduleKey: string }>()
const auth = useAuthStore()
const definition = computed(() => resourceModules[props.moduleKey])
const rows = ref<Record<string, unknown>[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')
const search = ref('')
const page = ref(1)
const perPage = ref(25)
const perPageOptions = [10, 25, 50, 100].map((value) => ({ value, label: `${value} baris` }))
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
const rowMenu = ref<string | null>(null)
const query = reactive<Record<string, unknown>>({})
const formHint = ref('')
const hydrating = ref(false)
const lastHydratedReference = ref('')

const listOperation = computed(() => getOperation(definition.value?.listOperationId))
const createOperation = computed(() => getOperation(definition.value?.createOperationId))
const updateOperation = computed(() => getOperation(definition.value?.updateOperationId))
const visibleColumns = computed(() => {
  const configured = definition.value?.columns ?? []
  const sample = rows.value[0]
  if (!sample) return configured
  const available = configured.filter((column) => column in sample)
  if (available.length >= 3) return available
  const inferred = Object.keys(sample).filter(
    (key) =>
      !['deleted_at', 'password_hash', 'lines', 'items'].includes(key) &&
      typeof sample[key] !== 'object',
  )
  return [...new Set([...available, ...inferred])].slice(0, 8)
})
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
const pageCount = computed(() =>
  total.value > 0
    ? Math.max(1, Math.ceil(total.value / perPage.value))
    : Math.max(1, page.value + (hasMore.value ? 1 : 0)),
)

function rowId(row: Record<string, unknown>): string | number | undefined {
  for (const key of definition.value?.idCandidates ?? ['id']) {
    const value = row[key]
    if (typeof value === 'string' || typeof value === 'number') return value
  }
  for (const [key, value] of Object.entries(row)) {
    if (key.endsWith('_id') && (typeof value === 'string' || typeof value === 'number'))
      return value
  }
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
  const id = row ? rowId(row) : undefined
  for (const parameter of operation.parameters.filter((item) => item.in === 'path')) {
    const direct = row?.[parameter.name]
    const preferred = action?.pathValueKey ? row?.[action.pathValueKey] : undefined
    values[parameter.name] = (direct ?? preferred ?? id) as string | number | undefined
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
  formModel.value = initialValue(createOperation.value.body) as Record<string, unknown>
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
async function remove(row: Record<string, unknown>) {
  if (!definition.value?.deleteOperationId) return
  if (
    !window.confirm(
      `Hapus ${definition.value.title} ini? Data akan mengikuti aturan soft delete backend.`,
    )
  )
    return
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const operation = getOperation(definition.value.deleteOperationId)
    if (!operation) return
    await executeOperation(definition.value.deleteOperationId, { path: pathValues(operation, row) })
    success.value = `${definition.value.title} berhasil dihapus.`
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
    const response = await http.get<string>(url, { responseType: 'text' })
    const blobUrl = URL.createObjectURL(new Blob([response.data], { type: 'text/html' }))
    popup.location.href = blobUrl
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
  } catch (cause) {
    popup.close()
    error.value = errorMessage(cause, `${action.label} gagal dibuka.`)
  } finally {
    saving.value = false
  }
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
  if (action.confirm && !window.confirm(action.confirm)) return
  await runAction(action, operation, row)
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
function chooseRowAction(action: ResourceActionDefinition, row: Record<string, unknown>) {
  rowMenu.value = null
  void beginAction(action, row)
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

onMounted(load)
watch(
  () => props.moduleKey,
  () => {
    page.value = 1
    search.value = ''
    load()
  },
)
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
  <div v-if="definition" class="page-stack">
    <PageHeader :title="definition.title" :description="definition.description">
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
            ><Plus :size="17" /> Tambah</AppButton
          >
        </div>
      </template>
    </PageHeader>

    <div v-if="error" class="notice notice--danger">{{ error }}</div>
    <div v-if="success" class="notice notice--success">{{ success }}</div>

    <AppCard flush>
      <div class="table-toolbar">
        <label class="table-search"
          ><Search :size="17" /><input v-model="search" type="search" placeholder="Cari data…"
        /></label>
        <div class="table-toolbar__right">
          <AppSelect
            :model-value="String(perPage)"
            :options="perPageOptions"
            placeholder="Jumlah baris"
            compact
            :searchable="false"
            @update:model-value="changePageSize"
          />
          <button
            class="icon-button"
            type="button"
            aria-label="Muat ulang"
            :disabled="loading"
            @click="load"
          >
            <RefreshCw :size="18" :class="{ spin: loading }" />
          </button>
        </div>
      </div>

      <div v-if="loading" class="table-loading">
        <span v-for="item in 7" :key="item" class="skeleton skeleton--row"></span>
      </div>
      <div v-else-if="rows.length" class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th v-for="column in visibleColumns" :key="column">{{ humanizeField(column) }}</th>
              <th class="table-actions-column">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in rows" :key="String(rowId(row) ?? index)">
              <td v-for="column in visibleColumns" :key="column" :title="displayValue(row[column])">
                <StatusBadge v-if="isStatusColumn(column)" :value="row[column]" /><template
                  v-else
                  >{{ displayValue(row[column]) }}</template
                >
              </td>
              <td class="table-actions-column">
                <div class="row-actions">
                  <button
                    class="table-action"
                    type="button"
                    title="Detail"
                    @click="openDetail(row)"
                  >
                    <Eye :size="16" />
                  </button>
                  <button
                    v-if="
                      updateOperation && can(definition.updatePermission) && !definition.readOnly
                    "
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
                  <div
                    v-if="rowActions.some((action) => actionVisible(action, row))"
                    class="action-menu"
                  >
                    <button
                      class="table-action"
                      type="button"
                      @click="rowMenu = rowMenu === String(rowId(row)) ? null : String(rowId(row))"
                    >
                      <MoreHorizontal :size="17" />
                    </button>
                    <div v-if="rowMenu === String(rowId(row))" class="action-menu__popover">
                      <button
                        v-for="action in rowActions.filter((item) => actionVisible(item, row))"
                        :key="action.operationId"
                        type="button"
                        :class="{ 'is-danger': action.tone === 'danger' }"
                        @click="chooseRowAction(action, row)"
                      >
                        {{ action.label }}
                      </button>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <EmptyState
        v-else
        :title="`Belum ada ${definition.title}`"
        description="Data akan muncul setelah tersedia pada backend."
      />
      <div v-if="rows.length" class="pagination-bar">
        <span
          >Halaman {{ page
          }}<template v-if="total"> dari {{ pageCount }} · {{ total }} data</template
          ><template v-else> · {{ rows.length }} data pada halaman ini</template></span
        >
        <div>
          <button :disabled="page <= 1" @click="changePage(page - 1)">Sebelumnya</button
          ><button :disabled="page >= pageCount" @click="changePage(page + 1)">Berikutnya</button>
        </div>
      </div>
    </AppCard>

    <AppModal
      :open="showForm"
      :title="
        formMode === 'create'
          ? `Tambah ${definition.title}`
          : formMode === 'edit'
            ? `Edit ${definition.title}`
            : (activeAction?.label ?? 'Proses')
      "
      :description="formOperation?.summary"
      size="xl"
      :busy="saving"
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
      :title="`Detail ${definition.title}`"
      size="xl"
      :busy="detailLoading"
      @close="closeDetail"
    >
      <div v-if="detailLoading" class="table-loading">
        <span v-for="item in 5" :key="item" class="skeleton skeleton--row"></span>
      </div>
      <template v-else>
        <div v-if="selected && definition.detailActions?.length" class="detail-actions">
          <AppButton
            v-for="action in definition.detailActions.filter((item) => can(item.permission))"
            :key="action.operationId"
            :variant="action.tone ?? 'ghost'"
            @click="beginAction(action, selected)"
            >{{ action.label }}</AppButton
          >
        </div>
        <StructuredData :value="detail" />
        <section v-for="(value, title) in childData" :key="title" class="detail-section">
          <h3>{{ title }}</h3>
          <StructuredData :value="value" />
        </section>
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
  </div>
</template>
