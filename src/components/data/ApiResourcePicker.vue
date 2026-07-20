<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Check, Search } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppDataTable, { type DataTableColumn } from './AppDataTable.vue'
import StatusBadge from './StatusBadge.vue'
import { executeOperation } from '@/services/api-operations'
import { errorMessage, normalizeList, unwrapData } from '@/utils/api'
import type { FieldResourcePickerSource } from '@/types/resource'

const props = defineProps<{
  fieldName: string
  modelValue: unknown
  rootModel: Record<string, unknown>
  source: FieldResourcePickerSource
  required?: boolean
  disabled?: boolean
}>()
const emit = defineEmits<{
  'update:modelValue': [value: unknown]
  select: [row: Record<string, unknown>]
}>()

const open = ref(false)
const loading = ref(false)
const selectedLoading = ref(false)
const error = ref('')
const rows = ref<Record<string, unknown>[]>([])
const selectedRow = ref<Record<string, unknown> | null>(null)
const highlighted = ref<Record<string, unknown> | null>(null)
const search = ref('')
const page = ref(1)
const perPage = ref(25)
const total = ref(0)
const hasMore = ref(false)
let searchTimer: number | undefined

const columns = computed<DataTableColumn[]>(() =>
  props.source.columns.map((column) => ({
    key: column.key,
    label: column.label,
    width: column.width,
    sortable: true,
  })),
)

const selectedLabel = computed(() => {
  const row = selectedRow.value
  if (!row) return props.modelValue ? `ID ${String(props.modelValue)}` : ''
  const values = props.source.labelKeys
    .map((key) => row[key])
    .filter((value) => value !== undefined && value !== null && value !== '')
    .map(String)
  return [...new Set(values)].join(' — ')
})

function extractTotal(payload: unknown): number {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const raw = payload as Record<string, unknown>
    const meta = raw.meta as Record<string, unknown> | undefined
    for (const value of [raw.total, raw.total_count, raw.count, meta?.total, meta?.total_count]) {
      if (typeof value === 'number') return value
    }
  }
  const data = unwrapData(payload as never) as unknown
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const raw = data as Record<string, unknown>
    const meta = raw.meta as Record<string, unknown> | undefined
    for (const value of [raw.total, raw.total_count, raw.count, meta?.total, meta?.total_count]) {
      if (typeof value === 'number') return value
    }
  }
  return 0
}

function queryFromModel(): Record<string, unknown> {
  const query: Record<string, unknown> = {}
  for (const [parameter, modelKey] of Object.entries(props.source.queryFromModel ?? {})) {
    const value = props.rootModel[modelKey]
    if (value !== undefined && value !== null && value !== '') query[parameter] = value
  }
  return query
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const payload = await executeOperation<unknown>(props.source.operationId, {
      raw: true,
      query: {
        page: page.value,
        per_page: perPage.value,
        search: search.value || undefined,
        ...queryFromModel(),
      },
    })
    rows.value = normalizeList<Record<string, unknown>>(payload)
    total.value = extractTotal(payload)
    hasMore.value = rows.value.length >= perPage.value
  } catch (cause) {
    rows.value = []
    total.value = 0
    hasMore.value = false
    error.value = errorMessage(cause, 'Data pilihan tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function hydrateSelected(): Promise<void> {
  const value = props.modelValue
  if (!value) {
    selectedRow.value = null
    return
  }
  if (selectedRow.value && String(selectedRow.value[props.source.valueKey]) === String(value))
    return
  if (!props.source.detailOperationId) return
  selectedLoading.value = true
  try {
    selectedRow.value = await executeOperation<Record<string, unknown>>(
      props.source.detailOperationId,
      { path: { id: String(value) } },
    )
  } catch {
    selectedRow.value = null
  } finally {
    selectedLoading.value = false
  }
}

async function openPicker(): Promise<void> {
  if (props.disabled) return
  open.value = true
  highlighted.value = selectedRow.value
  page.value = 1
  await load()
}

function closePicker(): void {
  if (loading.value) return
  open.value = false
  highlighted.value = null
}

function choose(row: Record<string, unknown>): void {
  const value = row[props.source.valueKey]
  if (value === undefined || value === null || value === '') return
  selectedRow.value = row
  emit('update:modelValue', value)
  emit('select', row)
  open.value = false
}

function clear(): void {
  selectedRow.value = null
  emit('update:modelValue', '')
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak'
  if (typeof value === 'number') return new Intl.NumberFormat('id-ID').format(value)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T?/.test(value)) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime()))
      return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date)
  }
  return String(value)
}

function changePage(next: number): void {
  page.value = next
  void load()
}
function changePerPage(value: number): void {
  perPage.value = value
  page.value = 1
  void load()
}

watch(
  () => props.modelValue,
  () => void hydrateSelected(),
  { immediate: true },
)
watch(search, () => {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    page.value = 1
    void load()
  }, 350)
})

onMounted(() => void hydrateSelected())
</script>

<template>
  <div class="resource-picker-field">
    <button
      type="button"
      class="resource-picker-field__trigger"
      :disabled="disabled"
      @click="openPicker"
    >
      <span v-if="selectedLoading" class="resource-picker-field__placeholder">Memuat pilihan…</span>
      <span v-else-if="selectedLabel" class="resource-picker-field__value">{{
        selectedLabel
      }}</span>
      <span v-else class="resource-picker-field__placeholder">Pilih data dari tabel</span>
      <Search :size="16" />
    </button>
    <button
      v-if="modelValue && !required && !disabled"
      type="button"
      class="resource-picker-field__clear"
      aria-label="Kosongkan pilihan"
      @click="clear"
    >
      ×
    </button>

    <AppModal
      :open="open"
      :title="source.title || 'Pilih Data'"
      :description="source.description"
      size="xl"
      :busy="loading"
      :layer="4"
      @close="closePicker"
    >
      <div v-if="error" class="notice notice--danger">{{ error }}</div>
      <AppDataTable
        v-model:search="search"
        :rows="rows"
        :columns="columns"
        :loading="loading"
        :page="page"
        :per-page="perPage"
        :total="total"
        :has-more="hasMore"
        server-side
        show-actions
        :row-key="(row) => String(row[source.valueKey])"
        :search-placeholder="source.searchPlaceholder || 'Cari data…'"
        empty-title="Data tidak ditemukan"
        empty-description="Ubah kata pencarian atau periksa context aktif."
        @update:per-page="changePerPage"
        @page-change="changePage"
        @refresh="load"
        @row-click="highlighted = $event"
        @row-dblclick="choose($event)"
      >
        <template #cell="{ row, column }">
          <StatusBadge
            v-if="column.key === 'status' || column.key.endsWith('_status')"
            :value="row[column.key]"
          />
          <template v-else>{{ display(row[column.key]) }}</template>
        </template>
        <template #actions="{ row }">
          <AppButton variant="ghost" @click.stop="choose(row)">
            <Check :size="15" /> Pilih
          </AppButton>
        </template>
      </AppDataTable>
      <template #footer>
        <span class="resource-picker-field__hint"
          >Klik dua kali pada baris untuk langsung memilih.</span
        >
        <AppButton variant="ghost" @click="closePicker">Tutup</AppButton>
        <AppButton :disabled="!highlighted" @click="highlighted && choose(highlighted)"
          >Pilih Data</AppButton
        >
      </template>
    </AppModal>
  </div>
</template>
