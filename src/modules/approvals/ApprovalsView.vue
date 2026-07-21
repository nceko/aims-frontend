<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ClipboardCheck, ExternalLink, RefreshCw } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import AppDataTable, { type DataTableColumn } from '@/components/data/AppDataTable.vue'
import StatusBadge from '@/components/data/StatusBadge.vue'
import { apiClient } from '@/services/api-client'
import { endpoints } from '@/config/endpoints'
import { errorMessage, normalizeList } from '@/utils/api'
import { useAuthStore } from '@/modules/auth/auth.store'
import { useRouter } from 'vue-router'

interface ApprovalRow extends Record<string, unknown> {
  entity_type: string
  entity_id: number
  document_no: string
  title: string
  status: string
  requested_at?: string
  required_permission: string
  frontend_route: string
  description?: string
}

const auth = useAuthStore()
const router = useRouter()
const rows = ref<ApprovalRow[]>([])
const loading = ref(false)
const error = ref('')
const search = ref('')
const page = ref(1)
const perPage = ref(25)

const columns: DataTableColumn[] = [
  { key: 'entity_type', label: 'Jenis', sortable: true },
  { key: 'document_no', label: 'Nomor Dokumen', sortable: true },
  { key: 'title', label: 'Dokumen', sortable: true },
  { key: 'description', label: 'Ringkasan', sortable: true },
  { key: 'status', label: 'Status', sortable: true, width: '150px' },
  { key: 'requested_at', label: 'Diajukan', sortable: true, width: '180px' },
]

const visibleRows = computed(() =>
  rows.value.filter((row) => !row.required_permission || auth.can(row.required_permission)),
)
const shortcuts = computed(() =>
  [
    {
      label: 'Purchase Order',
      to: '/procurement/purchase-orders',
      permission: 'transaction.purchase_orders.update',
    },
    {
      label: 'Permintaan Barang',
      to: '/inventory/item-requests',
      permission: 'transaction.item_requests.approve',
    },
    {
      label: 'Stock Adjustment',
      to: '/inventory/stock-adjustments',
      permission: 'inventory.stock_adjustments.approve',
    },
    {
      label: 'Stock Opname',
      to: '/inventory/stock-opnames',
      permission: 'inventory.stock_opnames.approve',
    },
    {
      label: 'Landed Cost',
      to: '/procurement/landed-costs',
      permission: 'transaction.landed_costs.approve',
    },
    {
      label: 'Kerusakan / Kehilangan Aset',
      to: '/assets/loss-cases',
      permission: 'inventory.asset_losses.approve',
    },
    {
      label: 'Disposal Aset',
      to: '/assets/disposals',
      permission: 'inventory.asset_disposals.approve',
    },
  ].filter((item) => auth.can(item.permission)),
)

function display(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime()))
      return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
  }
  return String(value)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const payload = await apiClient.get(endpoints.approvals.inbox)
    rows.value = normalizeList<ApprovalRow>(payload)
  } catch (cause) {
    rows.value = []
    error.value = errorMessage(cause, 'Daftar approval tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function openApproval(row: ApprovalRow) {
  await router.push({
    path: row.frontend_route,
    query: { document_id: String(row.entity_id), approval: '1' },
  })
}

onMounted(load)
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Approval Center"
      description="Daftar dokumen yang menunggu tindakan sesuai permission dan context aktif."
    >
      <template #actions>
        <AppButton variant="ghost" :loading="loading" @click="load">
          <RefreshCw :size="17" /> Refresh
        </AppButton>
      </template>
    </PageHeader>

    <div v-if="error" class="notice notice--danger">{{ error }}</div>

    <div class="approval-shortcuts">
      <RouterLink v-for="item in shortcuts" :key="item.to" :to="item.to">
        <ClipboardCheck :size="19" /><span>{{ item.label }}</span>
      </RouterLink>
    </div>

    <AppCard
      title="Kotak Masuk Approval"
      :subtitle="`${visibleRows.length} dokumen menunggu tindakan.`"
      flush
    >
      <AppDataTable
        v-if="loading || visibleRows.length"
        v-model:search="search"
        :rows="visibleRows"
        :columns="columns"
        :loading="loading"
        :page="page"
        :per-page="perPage"
        show-actions
        row-key="entity_id"
        search-placeholder="Cari nomor, jenis, atau ringkasan dokumen…"
        @update:per-page="perPage = $event"
        @page-change="page = $event"
        @refresh="load"
        @row-dblclick="openApproval($event as ApprovalRow)"
      >
        <template #cell="{ row, column }">
          <StatusBadge v-if="column.key === 'status'" :value="row.status" />
          <template v-else>{{ display(row[column.key]) }}</template>
        </template>
        <template #actions="{ row }">
          <AppButton variant="ghost" size="sm" @click="openApproval(row as ApprovalRow)">
            <ExternalLink :size="15" /> Buka
          </AppButton>
        </template>
      </AppDataTable>
      <EmptyState
        v-else
        title="Tidak ada approval tertunda"
        description="Semua transaksi pada context aktif sudah ditindaklanjuti."
      >
        <span class="empty-state__success"><ClipboardCheck :size="20" /> Up to date</span>
      </EmptyState>
    </AppCard>
  </div>
</template>
