<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Eye, Plus, RefreshCw } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppModal from '@/components/ui/AppModal.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import AppDataTable, { type DataTableColumn } from '@/components/data/AppDataTable.vue'
import SchemaFields from '@/components/data/SchemaFields.vue'
import StatusBadge from '@/components/data/StatusBadge.vue'
import StructuredData from '@/components/data/StructuredData.vue'
import { apiClient } from '@/services/api-client'
import { endpoints } from '@/config/endpoints'
import { errorMessage, normalizeList } from '@/utils/api'
import type { ApiSchema } from '@/types/resource'

interface DirectAcquisition extends Record<string, unknown> {
  acquisition_id: number
  acquisition_no: string
  item_name: string
  serial_no: string
  asset_tag: string
  location_name: string
  acquisition_type: string
  status: string
}

const rows = ref<DirectAcquisition[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const notice = ref('')
const search = ref('')
const page = ref(1)
const perPage = ref(25)
const formOpen = ref(false)
const detailOpen = ref(false)
const selected = ref<Record<string, unknown> | null>(null)
const form = ref<Record<string, unknown>>({})
const assignImmediately = ref(false)
const assignment = ref<Record<string, unknown>>({})

const columns: DataTableColumn[] = [
  { key: 'acquisition_no', label: 'Nomor Perolehan', sortable: true },
  { key: 'item_code', label: 'Kode Item', sortable: true },
  { key: 'item_name', label: 'Item', sortable: true },
  { key: 'serial_no', label: 'Nomor Seri', sortable: true },
  { key: 'asset_tag', label: 'Label Aset', sortable: true },
  { key: 'location_name', label: 'Lokasi', sortable: true },
  { key: 'acquisition_type', label: 'Sumber', sortable: true },
  { key: 'status', label: 'Status', sortable: true, width: '130px' },
]

const schema: ApiSchema = {
  type: 'object',
  required: ['item_id', 'location_id', 'acquisition_type', 'serial_no', 'asset_tag'],
  properties: {
    item_id: { type: 'integer' },
    part_id: { type: 'integer' },
    uom_id: { type: 'integer' },
    location_id: { type: 'integer' },
    supplier_id: { type: 'integer' },
    acquisition_type: {
      type: 'string',
      enum: ['PURCHASE_DIRECT', 'HIBAH', 'TRANSFER_IN', 'OTHER'],
    },
    serial_no: { type: 'string' },
    asset_tag: { type: 'string' },
    qr_code: { type: 'string' },
    purchase_date: { type: 'string', format: 'date' },
    purchase_cost: { type: 'number', minimum: 0 },
    warranty_expired_at: { type: 'string', format: 'date' },
    useful_life_months: { type: 'integer', minimum: 1 },
    asset_condition: {
      type: 'string',
      enum: ['NEW', 'GOOD', 'FAIR', 'DAMAGED', 'UNUSABLE'],
    },
    invoice_no: { type: 'string' },
    notes: { type: 'string' },
  },
}

const assignmentSchema: ApiSchema = {
  type: 'object',
  required: ['responsibility_type', 'assigned_condition'],
  properties: {
    responsibility_type: {
      type: 'string',
      enum: ['LOCATION', 'DIVISION', 'EMPLOYEE', 'VEHICLE'],
    },
    responsibility_location_id: { type: 'integer' },
    responsibility_division_id: { type: 'integer' },
    responsibility_employee_id: { type: 'integer' },
    responsibility_vehicle_id: { type: 'integer' },
    assigned_at: { type: 'string', format: 'date-time' },
    expected_return_at: { type: 'string', format: 'date-time' },
    assigned_condition: {
      type: 'string',
      enum: ['NEW', 'GOOD', 'FAIR', 'DAMAGED', 'UNUSABLE'],
    },
    handover_notes: { type: 'string' },
  },
}

function resetForm() {
  form.value = {
    acquisition_type: 'PURCHASE_DIRECT',
    asset_condition: 'GOOD',
  }
  assignImmediately.value = false
  assignment.value = {
    responsibility_type: 'EMPLOYEE',
    assigned_condition: 'GOOD',
  }
  error.value = ''
  notice.value = ''
}

function openCreate() {
  resetForm()
  formOpen.value = true
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const payload = await apiClient.get(endpoints.assets.directAcquisitions)
    rows.value = normalizeList<DirectAcquisition>(payload)
  } catch (cause) {
    rows.value = []
    error.value = errorMessage(cause, 'Aset langsung tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    const payload = {
      ...form.value,
      initial_assignment: assignImmediately.value ? assignment.value : undefined,
    }
    const data = await apiClient.post<Record<string, unknown>>(
      endpoints.assets.directAcquisitions,
      payload,
    )
    formOpen.value = false
    notice.value = 'Aset langsung berhasil diregistrasikan tanpa menambah saldo warehouse.'
    selected.value = data
    detailOpen.value = true
    await load()
  } catch (cause) {
    error.value = errorMessage(cause, 'Registrasi aset langsung gagal.')
  } finally {
    saving.value = false
  }
}

async function openDetail(row: DirectAcquisition) {
  loading.value = true
  try {
    selected.value = await apiClient.get<Record<string, unknown>>(
      `${endpoints.assets.directAcquisitions}/${row.acquisition_id}`,
    )
    detailOpen.value = true
  } catch (cause) {
    error.value = errorMessage(cause, 'Detail aset langsung tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

onMounted(load)
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Aset Langsung"
      description="Registrasi aset yang dikirim langsung ke lokasi dan tidak pernah menambah saldo warehouse."
    >
      <template #actions>
        <AppButton variant="ghost" :loading="loading" @click="load">
          <RefreshCw :size="17" /> Muat Ulang
        </AppButton>
        <AppButton @click="openCreate"><Plus :size="17" /> Tambah Aset Langsung</AppButton>
      </template>
    </PageHeader>

    <div v-if="notice" class="notice notice--success">{{ notice }}</div>
    <div v-if="error && !formOpen" class="notice notice--danger">{{ error }}</div>

    <AppCard
      title="Daftar Aset Langsung"
      subtitle="Unit dibentuk tanpa transaksi stok warehouse."
      flush
    >
      <AppDataTable
        v-model:search="search"
        :rows="rows"
        :columns="columns"
        :loading="loading"
        :page="page"
        :per-page="perPage"
        show-actions
        row-key="acquisition_id"
        search-placeholder="Cari nomor, item, serial, asset tag, atau lokasi…"
        @update:per-page="perPage = $event"
        @page-change="page = $event"
        @refresh="load"
        @row-dblclick="openDetail($event as DirectAcquisition)"
      >
        <template #cell="{ row, column }">
          <StatusBadge v-if="column.key === 'status'" :value="row.status" />
          <template v-else>{{ display(row[column.key]) }}</template>
        </template>
        <template #actions="{ row }">
          <AppButton variant="ghost" size="sm" @click="openDetail(row as DirectAcquisition)">
            <Eye :size="15" /> Detail
          </AppButton>
        </template>
      </AppDataTable>
    </AppCard>

    <AppModal
      :open="formOpen"
      title="Tambah Aset Langsung"
      description="QR akan dibuat otomatis ketika dikosongkan. Aset dapat ditugaskan setelah registrasi."
      size="xl"
      :busy="saving"
      @close="formOpen = false"
    >
      <div v-if="error" class="notice notice--danger">{{ error }}</div>
      <SchemaFields v-model="form" :schema="schema" />
      <section class="direct-asset-assignment">
        <label class="checkbox-control direct-asset-assignment__toggle">
          <input v-model="assignImmediately" type="checkbox" />
          <span>Langsung tugaskan aset setelah registrasi</span>
        </label>
        <div v-if="assignImmediately" class="direct-asset-assignment__form">
          <p class="field__hint">
            Aset akan langsung berstatus ASSIGNED tanpa membuat saldo warehouse palsu.
          </p>
          <SchemaFields v-model="assignment" :schema="assignmentSchema" />
        </div>
      </section>
      <template #footer>
        <AppButton variant="ghost" :disabled="saving" @click="formOpen = false">Batal</AppButton>
        <AppButton :loading="saving" @click="save">Simpan Aset</AppButton>
      </template>
    </AppModal>

    <AppModal :open="detailOpen" title="Detail Aset Langsung" size="lg" @close="detailOpen = false">
      <StructuredData v-if="selected" :value="selected" />
      <template #footer>
        <AppButton variant="ghost" @click="detailOpen = false">Tutup</AppButton>
        <RouterLink
          v-if="selected?.unit_id"
          class="app-button app-button--primary"
          to="/assets/register"
        >
          Buka Register Aset
        </RouterLink>
      </template>
    </AppModal>
  </div>
</template>
