<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { CheckCircle2, Download, Eye, FileUp, RefreshCw } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppModal from '@/components/ui/AppModal.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import AppDataTable, { type DataTableColumn } from '@/components/data/AppDataTable.vue'
import StatusBadge from '@/components/data/StatusBadge.vue'
import StructuredData from '@/components/data/StructuredData.vue'
import { apiClient } from '@/services/api-client'
import { endpoints } from '@/config/endpoints'
import { errorMessage, normalizeList } from '@/utils/api'
import { useAuthStore } from '@/modules/auth/auth.store'

interface MigrationBatch extends Record<string, unknown> {
  batch_id: number
  batch_no: string
  status: string
  total_rows: number
  valid_rows: number
  invalid_rows: number
  committed_rows: number
  created_at: string
  rows?: MigrationRow[]
}
interface MigrationRow extends Record<string, unknown> {
  row_no: number
  item_id?: number
  item_name?: string
  serial_no?: string
  asset_tag?: string
  location_id?: number
  validation_status: string
  validation_errors?: string[]
  unit_id?: number
}

const auth = useAuthStore()
const batches = ref<MigrationBatch[]>([])
const selected = ref<MigrationBatch | null>(null)
const parsedRows = ref<Record<string, unknown>[]>([])
const loading = ref(false)
const previewing = ref(false)
const committing = ref(false)
const error = ref('')
const notice = ref('')
const notes = ref('')
const detailOpen = ref(false)
const search = ref('')
const page = ref(1)
const perPage = ref(25)
const rowSearch = ref('')
const rowPage = ref(1)
const rowPerPage = ref(25)

const batchColumns: DataTableColumn[] = [
  { key: 'batch_no', label: 'Batch', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'total_rows', label: 'Total', sortable: true },
  { key: 'valid_rows', label: 'Valid', sortable: true },
  { key: 'invalid_rows', label: 'Invalid', sortable: true },
  { key: 'committed_rows', label: 'Committed', sortable: true },
  { key: 'created_at', label: 'Dibuat', sortable: true },
]
const rowColumns: DataTableColumn[] = [
  { key: 'row_no', label: 'Baris', width: '80px', sortable: true },
  { key: 'item_id', label: 'Item ID', sortable: true },
  { key: 'item_name', label: 'Item', sortable: true },
  { key: 'serial_no', label: 'Nomor Seri', sortable: true },
  { key: 'asset_tag', label: 'Label Aset', sortable: true },
  { key: 'location_id', label: 'ID Lokasi', sortable: true },
  { key: 'validation_status', label: 'Validasi', sortable: true },
  { key: 'validation_errors', label: 'Error' },
  { key: 'unit_id', label: 'Unit ID', sortable: true },
]
const canCommit = computed(
  () =>
    Boolean(selected.value) &&
    ['PREVIEWED', 'PARTIAL'].includes(String(selected.value?.status ?? '')) &&
    Number(selected.value?.valid_rows ?? 0) > 0 &&
    auth.can('inventory.asset_migrations.commit'),
)

const templateHeaders = [
  'item_id',
  'part_id',
  'uom_id',
  'location_id',
  'serial_no',
  'asset_tag',
  'qr_code',
  'purchase_date',
  'purchase_cost',
  'accumulated_depreciation',
  'useful_life_months',
  'asset_condition',
  'responsibility_type',
  'responsibility_location_id',
  'responsibility_division_id',
  'responsibility_employee_id',
  'responsibility_vehicle_id',
]

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let value = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"'
        index += 1
      } else quoted = !quoted
    } else if (char === ',' && !quoted) {
      result.push(value.trim())
      value = ''
    } else value += char
  }
  result.push(value.trim())
  return result
}

function numericOrUndefined(value: string): number | undefined {
  if (!value) return undefined
  const result = Number(value)
  return Number.isFinite(result) ? result : undefined
}

function parseCSV(text: string): Record<string, unknown>[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim())
  if (lines.length < 2) throw new Error('CSV harus memiliki header dan minimal satu baris data.')
  const headers = parseCSVLine(lines[0]!).map((header) => header.trim())
  const missing = ['item_id', 'location_id', 'serial_no', 'asset_tag'].filter(
    (field) => !headers.includes(field),
  )
  if (missing.length) throw new Error(`Header wajib belum tersedia: ${missing.join(', ')}`)
  const numericFields = new Set([
    'item_id',
    'part_id',
    'uom_id',
    'location_id',
    'purchase_cost',
    'accumulated_depreciation',
    'useful_life_months',
    'responsibility_location_id',
    'responsibility_division_id',
    'responsibility_employee_id',
    'responsibility_vehicle_id',
  ])
  return lines.slice(1).map((line) => {
    const cells = parseCSVLine(line)
    const row: Record<string, unknown> = {}
    headers.forEach((header, index) => {
      const value = cells[index]?.trim() ?? ''
      if (numericFields.has(header)) {
        const number = numericOrUndefined(value)
        if (number !== undefined) row[header] = number
      } else if (value) row[header] = value
    })
    if (row.accumulated_depreciation === undefined) row.accumulated_depreciation = 0
    if (!row.asset_condition) row.asset_condition = 'GOOD'
    return row
  })
}

async function handleFile(event: Event) {
  error.value = ''
  notice.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    parsedRows.value = parseCSV(await file.text())
    notice.value = `${parsedRows.value.length} baris berhasil dibaca. Jalankan Preview untuk validasi backend.`
  } catch (cause) {
    parsedRows.value = []
    error.value = cause instanceof Error ? cause.message : 'CSV tidak dapat dibaca.'
  } finally {
    input.value = ''
  }
}

function downloadTemplate() {
  const example = [
    '1',
    '',
    '',
    '1',
    'SERIAL-EXAMPLE-001',
    'AST-EXAMPLE-001',
    '',
    '2025-01-01',
    '15000000',
    '3000000',
    '48',
    'GOOD',
    '',
    '',
    '',
    '',
    '',
  ]
  const content = `${templateHeaders.join(',')}\n${example.join(',')}\n`
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'template_asset_migration.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}

async function loadBatches() {
  loading.value = true
  error.value = ''
  try {
    batches.value = normalizeList<MigrationBatch>(await apiClient.get(endpoints.assets.migrations))
  } catch (cause) {
    batches.value = []
    error.value = errorMessage(cause, 'Batch migrasi tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function preview() {
  if (!parsedRows.value.length) {
    error.value = 'Pilih file CSV terlebih dahulu.'
    return
  }
  previewing.value = true
  error.value = ''
  notice.value = ''
  try {
    selected.value = await apiClient.post<MigrationBatch>(
      `${endpoints.assets.migrations}/preview`,
      {
        notes: notes.value || undefined,
        rows: parsedRows.value,
      },
    )
    detailOpen.value = true
    notice.value = `Preview selesai: ${selected.value.valid_rows} valid dan ${selected.value.invalid_rows} invalid.`
    await loadBatches()
  } catch (cause) {
    error.value = errorMessage(cause, 'Preview migrasi gagal.')
  } finally {
    previewing.value = false
  }
}

async function openBatch(row: MigrationBatch) {
  loading.value = true
  error.value = ''
  try {
    selected.value = await apiClient.get<MigrationBatch>(
      `${endpoints.assets.migrations}/${row.batch_id}`,
    )
    detailOpen.value = true
  } catch (cause) {
    error.value = errorMessage(cause, 'Detail batch migrasi tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function commit() {
  if (!selected.value || !canCommit.value) return
  committing.value = true
  error.value = ''
  try {
    selected.value = await apiClient.post<MigrationBatch>(
      `${endpoints.assets.migrations}/${selected.value.batch_id}/commit`,
    )
    notice.value = `${selected.value.committed_rows} aset existing berhasil dimigrasikan.`
    await loadBatches()
  } catch (cause) {
    error.value = errorMessage(
      cause,
      'Commit migrasi gagal. Tidak ada baris yang disimpan sebagian.',
    )
  } finally {
    committing.value = false
  }
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.length ? value.join('; ') : '—'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime()))
      return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
        date,
      )
  }
  return String(value)
}

onMounted(loadBatches)
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Migrasi / Aset Lama"
      description="Preview, validasi, dan commit aset lama tanpa membuat Goods Receipt baru."
    >
      <template #actions>
        <AppButton variant="ghost" @click="downloadTemplate">
          <Download :size="17" /> Template CSV
        </AppButton>
        <AppButton variant="ghost" :loading="loading" @click="loadBatches">
          <RefreshCw :size="17" /> Muat Ulang
        </AppButton>
      </template>
    </PageHeader>

    <div v-if="notice" class="notice notice--success">{{ notice }}</div>
    <div v-if="error" class="notice notice--danger">{{ error }}</div>

    <AppCard
      title="Import Aset Existing"
      subtitle="Data belum membentuk unit aset sebelum Preview valid dan tombol Commit ditekan."
    >
      <div class="schema-form-grid">
        <label class="field schema-field--full">
          <span class="field__label">File CSV</span>
          <input class="field__control" type="file" accept=".csv,text/csv" @change="handleFile" />
          <small>{{ parsedRows.length }} baris siap divalidasi.</small>
        </label>
        <label class="field schema-field--full">
          <span class="field__label">Catatan Batch</span>
          <textarea
            v-model="notes"
            class="field__control"
            rows="3"
            placeholder="Sumber data dan catatan migrasi"
          ></textarea>
        </label>
      </div>
      <div class="form-actions">
        <AppButton :loading="previewing" :disabled="!parsedRows.length" @click="preview">
          <FileUp :size="17" /> Preview & Validasi
        </AppButton>
      </div>
    </AppCard>

    <AppCard
      title="Riwayat Batch Migrasi"
      subtitle="Double-click baris untuk melihat hasil validasi."
      flush
    >
      <AppDataTable
        v-model:search="search"
        :rows="batches"
        :columns="batchColumns"
        :loading="loading"
        :page="page"
        :per-page="perPage"
        show-actions
        row-key="batch_id"
        search-placeholder="Cari nomor batch atau status…"
        @update:per-page="perPage = $event"
        @page-change="page = $event"
        @refresh="loadBatches"
        @row-dblclick="openBatch($event as MigrationBatch)"
      >
        <template #cell="{ row, column }">
          <StatusBadge v-if="column.key === 'status'" :value="row.status" />
          <template v-else>{{ display(row[column.key]) }}</template>
        </template>
        <template #actions="{ row }">
          <AppButton variant="ghost" size="sm" @click="openBatch(row as MigrationBatch)">
            <Eye :size="15" /> Detail
          </AppButton>
        </template>
      </AppDataTable>
    </AppCard>

    <AppModal
      :open="detailOpen"
      title="Hasil Validasi Migrasi"
      :description="
        selected
          ? `${selected.batch_no} · ${selected.valid_rows} valid · ${selected.invalid_rows} invalid`
          : undefined
      "
      size="xl"
      :busy="committing"
      @close="detailOpen = false"
    >
      <StructuredData
        v-if="selected"
        :value="{
          batch_no: selected.batch_no,
          status: selected.status,
          total_rows: selected.total_rows,
          valid_rows: selected.valid_rows,
          invalid_rows: selected.invalid_rows,
          committed_rows: selected.committed_rows,
        }"
      />
      <AppDataTable
        v-if="selected?.rows"
        v-model:search="rowSearch"
        :rows="selected.rows"
        :columns="rowColumns"
        :page="rowPage"
        :per-page="rowPerPage"
        row-key="row_no"
        search-placeholder="Cari baris, serial, atau asset tag…"
        @update:per-page="rowPerPage = $event"
        @page-change="rowPage = $event"
      >
        <template #cell="{ row, column }">
          <StatusBadge v-if="column.key === 'validation_status'" :value="row.validation_status" />
          <template v-else>{{ display(row[column.key]) }}</template>
        </template>
      </AppDataTable>
      <template #footer>
        <AppButton variant="ghost" :disabled="committing" @click="detailOpen = false"
          >Tutup</AppButton
        >
        <AppButton v-if="canCommit" :loading="committing" @click="commit">
          <CheckCircle2 :size="17" /> Commit {{ selected?.valid_rows }} Aset
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>
