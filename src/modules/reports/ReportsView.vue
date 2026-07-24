<script setup lang="ts">
import { computed, ref } from 'vue'
import { Download, FileBarChart } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import AppDataTable, { type DataTableColumn } from '@/components/data/AppDataTable.vue'
import StatusBadge from '@/components/data/StatusBadge.vue'
import { useAuthStore } from '@/modules/auth/auth.store'
import { apiClient } from '@/services/api-client'
import { errorMessage, normalizeList } from '@/utils/api'
import { humanizeField } from '@/config/field-options'

type ReportGroupKey = 'inventory' | 'procurement' | 'usage' | 'assets' | 'audit'

interface ReportDefinition {
  key: string
  title: string
  description: string
  path: string
  permission: string
  group: ReportGroupKey
  exportable?: boolean
  columns?: string[]
}

const reportGroups: Array<{ key: ReportGroupKey; label: string; description: string }> = [
  {
    key: 'inventory',
    label: 'Persediaan',
    description: 'Saldo, pergerakan, stok minimum, dan valuasi.',
  },
  {
    key: 'procurement',
    label: 'Pengadaan',
    description: 'Pesanan pembelian, penerimaan, pemasok, dan biaya perolehan.',
  },
  {
    key: 'usage',
    label: 'Pemakaian & Distribusi',
    description: 'Pengeluaran, transfer, dan barang dalam perjalanan.',
  },
  {
    key: 'assets',
    label: 'Aset',
    description: 'Register, penanggung jawab, perawatan, dan nilai aset.',
  },
  { key: 'audit', label: 'Audit', description: 'Posting, reversal, dan aktivitas transaksi.' },
]
const reports: ReportDefinition[] = [
  {
    key: 'stock-balances',
    group: 'inventory',
    title: 'Saldo Stok',
    description: 'Posisi stok per gudang, item, part, lot, dan UOM.',
    path: '/api/v1/reports/stock-balances',
    permission: 'reports.inventory.read',
    exportable: true,
  },
  {
    key: 'stock-movements',
    group: 'inventory',
    title: 'Pergerakan Stok',
    description: 'Riwayat seluruh pergerakan stok.',
    path: '/api/v1/reports/stock-movements',
    permission: 'reports.inventory.read',
    exportable: true,
  },
  {
    key: 'low-stock',
    group: 'inventory',
    title: 'Stok Rendah',
    description: 'Barang di bawah batas stok minimum.',
    path: '/api/v1/reports/low-stock',
    permission: 'reports.inventory.read',
    exportable: true,
  },
  {
    key: 'in-transit',
    group: 'usage',
    title: 'Dalam Perjalanan',
    description: 'Barang yang masih dalam perjalanan.',
    path: '/api/v1/reports/in-transit',
    permission: 'reports.inventory.read',
    exportable: true,
  },
  {
    key: 'delivery-orders',
    group: 'usage',
    title: 'Surat Jalan',
    description: 'Pengiriman dan penerimaan antar gudang.',
    path: '/api/v1/reports/delivery-orders',
    permission: 'reports.inventory.read',
    exportable: true,
  },
  {
    key: 'item-request-fulfillment',
    group: 'usage',
    title: 'Kinerja Pemenuhan Permintaan',
    description:
      'Waktu persetujuan, pemenuhan pertama, pemenuhan total, tingkat pemenuhan, keterlambatan, pengiriman bertahap, dan keterkaitan PO.',
    path: '/api/v1/reports/item-request-fulfillment',
    permission: 'reports.inventory.read',
    exportable: true,
  },
  {
    key: 'item-usages',
    group: 'usage',
    title: 'Pemakaian Barang',
    description: 'Pemakaian barang.',
    path: '/api/v1/reports/item-usages',
    permission: 'reports.inventory.read',
    exportable: true,
  },
  {
    key: 'usage-responsibility',
    group: 'usage',
    title: 'Pemakaian Berdasarkan Penanggung Jawab',
    description: 'Pemakaian berdasarkan karyawan, divisi, lokasi, atau kendaraan.',
    path: '/api/v1/reports/item-usages-by-responsibility',
    permission: 'reports.responsibilities.read',
    exportable: true,
  },
  {
    key: 'inventory-valuation',
    group: 'inventory',
    title: 'Valuasi Persediaan',
    description: 'Jumlah, biaya rata-rata, dan nilai persediaan.',
    path: '/api/v1/reports/inventory-valuation',
    permission: 'reports.inventory_valuation.read',
    exportable: true,
  },
  {
    key: 'assets-responsibility',
    group: 'assets',
    title: 'Aset Berdasarkan Penanggung Jawab',
    description: 'Aset berdasarkan penanggung jawab.',
    path: '/api/v1/reports/assets-by-responsibility',
    permission: 'reports.assets.read',
    exportable: true,
  },
  {
    key: 'asset-maintenances',
    group: 'assets',
    title: 'Perawatan Aset',
    description: 'Riwayat perawatan aset.',
    path: '/api/v1/reports/asset-maintenances',
    permission: 'reports.asset_maintenances.read',
    exportable: true,
  },
  {
    key: 'asset-valuation',
    group: 'assets',
    title: 'Valuasi Aset',
    description: 'Biaya perolehan, penyusutan, dan nilai buku bersih.',
    path: '/api/v1/reports/asset-valuation',
    permission: 'reports.asset_valuation.read',
    exportable: true,
  },
  {
    key: 'asset-depreciation',
    group: 'assets',
    title: 'Penyusutan Aset',
    description: 'Perhitungan penyusutan per aset.',
    path: '/api/v1/reports/asset-depreciation',
    permission: 'inventory.asset_depreciation.read',
  },
  {
    key: 'purchase-orders',
    group: 'procurement',
    title: 'Pesanan Pembelian',
    description: 'Status, nilai, penerimaan, dan sisa Pesanan Pembelian.',
    path: '/api/v1/reports/purchase-orders',
    permission: 'reports.procurement.read',
    exportable: true,
  },
  {
    key: 'purchase-order-fulfillment',
    group: 'procurement',
    title: 'Pemenuhan Pesanan Pembelian',
    description: 'Pemenuhan jumlah per baris pesanan dan sisa yang belum diterima.',
    path: '/api/v1/reports/purchase-order-fulfillment',
    permission: 'reports.procurement.read',
    exportable: true,
  },
  {
    key: 'goods-receipts',
    group: 'procurement',
    title: 'Penerimaan Barang',
    description: 'Riwayat penerimaan vendor, pemeriksaan, dan posting ke stok.',
    path: '/api/v1/reports/goods-receipts',
    permission: 'reports.procurement.read',
    exportable: true,
  },
  {
    key: 'landed-costs',
    group: 'procurement',
    title: 'Biaya Perolehan',
    description: 'Biaya tambahan pengadaan dan nilai yang sudah dialokasikan.',
    path: '/api/v1/reports/landed-costs',
    permission: 'reports.procurement.read',
    exportable: true,
  },
  {
    key: 'vendor-complaints',
    group: 'procurement',
    title: 'Komplain Vendor',
    description: 'Barang rusak, salah, kurang, retur, dan status penyelesaian.',
    path: '/api/v1/reports/vendor-complaints',
    permission: 'reports.procurement.read',
    exportable: true,
  },
  {
    key: 'supplier-performance',
    group: 'procurement',
    title: 'Kinerja Supplier',
    description: 'Rasio pemenuhan PO, penerimaan, dan jumlah komplain supplier.',
    path: '/api/v1/reports/supplier-performance',
    permission: 'reports.procurement.read',
    exportable: true,
  },
  {
    key: 'posting-history',
    group: 'audit',
    title: 'Riwayat Posting',
    description: 'Aktivitas posting dan persetujuan transaksi.',
    path: '/api/v1/reports/posting-history',
    permission: 'reports.audit.read',
    exportable: true,
  },
  {
    key: 'reversals',
    group: 'audit',
    title: 'Riwayat Reversal',
    description: 'Aktivitas pembalikan transaksi dan stok.',
    path: '/api/v1/reports/reversals',
    permission: 'reports.audit.read',
    exportable: true,
  },
  {
    key: 'document-status-history',
    group: 'audit',
    title: 'Riwayat Status Dokumen',
    description: 'Perubahan status seluruh dokumen operasional.',
    path: '/api/v1/reports/document-status-history',
    permission: 'reports.audit.read',
    exportable: true,
  },
  {
    key: 'failed-transactions',
    group: 'audit',
    title: 'Transaksi Gagal',
    description: 'Permintaan transaksi yang gagal beserta kode respons dan kesalahan.',
    path: '/api/v1/reports/failed-transactions',
    permission: 'reports.audit.read',
    exportable: true,
  },
  {
    key: 'stock-corrections',
    group: 'audit',
    title: 'Koreksi Stok',
    description: 'Pergerakan penyesuaian, opname, dan pembalikan yang mengoreksi stok.',
    path: '/api/v1/reports/stock-corrections',
    permission: 'reports.audit.read',
    exportable: true,
  },
]
const auth = useAuthStore()
const visibleReports = computed(() => reports.filter((item) => auth.can(item.permission)))
const activeGroup = ref<ReportGroupKey>('inventory')
const groupedReports = computed(() =>
  visibleReports.value.filter((item) => item.group === activeGroup.value),
)
const active = ref<ReportDefinition | null>(
  visibleReports.value.find((item) => item.group === activeGroup.value) ??
    visibleReports.value[0] ??
    null,
)
const activeGroupInfo = computed(
  () => reportGroups.find((group) => group.key === activeGroup.value) ?? reportGroups[0],
)
const rows = ref<Record<string, unknown>[]>([])
const loading = ref(false)
const exporting = ref(false)
const error = ref('')
const search = ref('')
const asOf = ref('')
const page = ref(1)
const perPage = ref(25)
const columns = computed(() => {
  const row = rows.value[0]
  if (!row) return []
  return Object.keys(row)
    .filter((key) => typeof row[key] !== 'object' && !['deleted_at'].includes(key))
    .slice(0, 12)
})
const dataTableColumns = computed<DataTableColumn[]>(() =>
  columns.value.map((column) => ({
    key: column,
    label: humanizeField(column),
    sortable: true,
  })),
)
function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak'
  if (typeof value === 'number')
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(value)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime()))
      return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
  }
  return String(value)
}
function isStatus(key: string) {
  return /(^status$|_status$|^condition$)/.test(key)
}
async function load() {
  if (!active.value) return
  page.value = 1
  loading.value = true
  error.value = ''
  try {
    const payload = await apiClient.get<unknown>(active.value.path, {
      search: search.value || undefined,
      as_of: asOf.value || undefined,
    })
    rows.value = normalizeList(payload)
  } catch (cause) {
    rows.value = []
    error.value = errorMessage(cause, 'Laporan belum dapat dimuat.')
  } finally {
    loading.value = false
  }
}
async function exportReport(format: 'csv' | 'xlsx') {
  if (!active.value) return
  exporting.value = true
  error.value = ''
  try {
    const response = await apiClient.download(
      active.value.path,
      { search: search.value || undefined, as_of: asOf.value || undefined, format },
      format === 'csv'
        ? 'text/csv'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    const url = URL.createObjectURL(response.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${active.value.key}.${format}`
    a.click()
    URL.revokeObjectURL(url)
  } catch (cause) {
    error.value = errorMessage(cause, 'Export laporan gagal.')
  } finally {
    exporting.value = false
  }
}
function chooseGroup(group: ReportGroupKey) {
  activeGroup.value = group
  active.value = visibleReports.value.find((item) => item.group === group) ?? null
  rows.value = []
  error.value = ''
  page.value = 1
}

function choose(report: ReportDefinition) {
  active.value = report
  rows.value = []
  error.value = ''
  page.value = 1
  load()
}
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Reports"
      description="Laporan dikelompokkan berdasarkan inventory, pengadaan, pemakaian dan distribusi, aset, serta audit."
    />
    <div class="report-group-tabs" role="tablist" aria-label="Kelompok laporan">
      <button
        v-for="group in reportGroups"
        :key="group.key"
        type="button"
        :class="{ active: activeGroup === group.key }"
        @click="chooseGroup(group.key)"
      >
        <strong>{{ group.label }}</strong>
        <small>{{ group.description }}</small>
      </button>
    </div>

    <div v-if="error" class="notice notice--danger">{{ error }}</div>
    <div class="reports-layout">
      <aside v-if="groupedReports.length" class="report-selector">
        <button
          v-for="report in groupedReports"
          :key="report.key"
          type="button"
          :class="{ active: active?.key === report.key }"
          @click="choose(report)"
        >
          <FileBarChart :size="18" /><span
            ><strong>{{ report.title }}</strong
            ><small>{{ report.description }}</small></span
          >
        </button>
      </aside>
      <AppCard
        v-if="!groupedReports.length"
        title="Laporan tidak tersedia untuk akses Anda"
        :subtitle="activeGroupInfo?.description"
      >
        <div class="report-group-empty">
          Endpoint laporan untuk kelompok ini sudah tersedia, tetapi akun Anda belum mempunyai
          permission laporan yang diperlukan.
        </div>
      </AppCard>
      <AppCard v-else-if="active" flush>
        <div class="report-heading-toolbar">
          <div>
            <strong>{{ active.title }}</strong>
            <small>{{ active.description }}</small>
          </div>
          <div class="report-filters">
            <input v-model="asOf" class="compact-input" type="date" title="As of date" />
            <AppButton variant="ghost" :disabled="loading" @click="load">Muat Laporan</AppButton>
            <AppButton
              v-if="active.exportable"
              variant="ghost"
              :loading="exporting"
              @click="exportReport('xlsx')"
              ><Download :size="16" /> XLSX</AppButton
            >
            <AppButton
              v-if="active.exportable"
              variant="ghost"
              :loading="exporting"
              @click="exportReport('csv')"
              ><Download :size="16" /> CSV</AppButton
            >
          </div>
        </div>
        <AppDataTable
          v-model:search="search"
          :rows="rows"
          :columns="dataTableColumns"
          :loading="loading"
          :page="page"
          :per-page="perPage"
          search-placeholder="Cari pada laporan…"
          empty-title="Pilih dan muat laporan"
          empty-description="Gunakan tombol Muat Laporan untuk mengambil data terbaru dari backend."
          @update:per-page="perPage = $event"
          @page-change="page = $event"
          @refresh="load"
        >
          <template #cell="{ row, column }">
            <StatusBadge v-if="isStatus(column.key)" :value="row[column.key]" />
            <template v-else>{{ display(row[column.key]) }}</template>
          </template>
        </AppDataTable>
      </AppCard>
    </div>
  </div>
</template>
