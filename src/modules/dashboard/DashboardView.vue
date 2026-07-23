<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  Activity,
  AlertTriangle,
  Boxes,
  ClipboardClock,
  PackageCheck,
  RefreshCw,
  Truck,
  Wrench,
} from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import StructuredData from '@/components/data/StructuredData.vue'
import { dashboardHighlights } from '@/config/navigation'
import { dashboardApi, type AssetSummary, type DashboardSummary } from './dashboard.api'
import { errorMessage } from '@/utils/api'
import { useAuthStore } from '@/modules/auth/auth.store'

const auth = useAuthStore()
const summary = ref<DashboardSummary>({})
const assets = ref<AssetSummary>({})
const pending = ref<Record<string, number | string>>({})
const locations = ref<Record<string, unknown>[]>([])
const trend = ref<Record<string, unknown>[]>([])
const loading = ref(true)
const error = ref('')

const number = (value: unknown): number => Number(value ?? 0) || 0
const pendingTotal = computed<number>(() =>
  Object.values(pending.value).reduce<number>((total, value) => total + number(value), 0),
)
const canStock = computed(
  () => auth.can('inventory.stocks.read') || auth.can('reports.inventory.read'),
)
const canMovement = computed(
  () => auth.can('inventory.cost_movements.read') || auth.can('reports.inventory.read'),
)
const canPendingActions = computed(() =>
  [
    'transaction.item_requests.approve',
    'transaction.delivery_orders.receive',
    'inventory.stock_opnames.update',
    'inventory.stock_opnames.review',
    'inventory.stock_opnames.approve',
    'inventory.stock_adjustments.update',
    'inventory.stock_adjustments.approve',
  ].some((permission) => auth.can(permission)),
)
const cards = computed<Array<{ label: string; value: number; icon: unknown; tone: string }>>(() => {
  const candidates = [
    {
      label: 'Total Barang',
      value: number(summary.value.total_items),
      icon: Boxes,
      tone: 'primary',
      visible: auth.can('catalog.items.read'),
    },
    {
      label: 'Total Aset',
      value: number(assets.value.total_assets),
      icon: Wrench,
      tone: 'success',
      visible: auth.can('inventory.assets.read'),
    },
    {
      label: 'Stok Tersedia',
      value: number(summary.value.total_stock_qty),
      icon: PackageCheck,
      tone: 'info',
      visible: canStock.value,
    },
    {
      label: 'Stok Habis',
      value: number(summary.value.out_of_stock_count),
      icon: AlertTriangle,
      tone: 'danger',
      visible: canStock.value,
    },
    {
      label: 'Stok Rendah',
      value: number(summary.value.low_stock_count),
      icon: AlertTriangle,
      tone: 'warning',
      visible: auth.can('inventory.stock_thresholds.read') || auth.can('reports.inventory.read'),
    },
    {
      label: 'Tindakan Tertunda',
      value: pendingTotal.value,
      icon: ClipboardClock,
      tone: 'danger',
      visible: canPendingActions.value,
    },
    {
      label: 'Dalam Perjalanan',
      value: number(summary.value.in_transit_count),
      icon: Truck,
      tone: 'secondary',
      visible: auth.can('transaction.delivery_orders.read') || auth.can('reports.inventory.read'),
    },
    {
      label: 'Permintaan Berjalan',
      value: number(summary.value.pending_request_count),
      icon: ClipboardClock,
      tone: 'primary',
      visible: auth.can('transaction.item_requests.read'),
    },
    {
      label: 'Komplain Terbuka',
      value: number(summary.value.open_complaint_count),
      icon: AlertTriangle,
      tone: 'warning',
      visible: auth.can('transaction.complaints.read'),
    },
    {
      label: 'Transaksi Hari Ini',
      value: number(summary.value.transactions_today),
      icon: Activity,
      tone: 'info',
      visible: canMovement.value,
    },
  ]
  return candidates.filter((item) => item.visible)
})
const visibleHighlights = computed(() =>
  dashboardHighlights.filter(
    (item) => (!item.superAdminOnly || auth.isSuperAdmin) && auth.can(item.permission),
  ),
)

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  const [summaryResult, assetResult, pendingResult, locationResult, trendResult] =
    await Promise.allSettled([
      dashboardApi.summary(),
      auth.can('inventory.assets.read') ? dashboardApi.assets() : Promise.resolve({}),
      canPendingActions.value ? dashboardApi.pendingActions() : Promise.resolve({}),
      canStock.value ? dashboardApi.stockByLocation() : Promise.resolve([]),
      canMovement.value ? dashboardApi.movementTrend() : Promise.resolve([]),
    ])

  if (summaryResult.status === 'fulfilled') summary.value = summaryResult.value
  else
    error.value = errorMessage(summaryResult.reason, 'Sebagian data dashboard belum dapat dimuat.')
  if (assetResult.status === 'fulfilled') assets.value = assetResult.value
  if (pendingResult.status === 'fulfilled') pending.value = pendingResult.value
  if (locationResult.status === 'fulfilled') locations.value = locationResult.value
  if (trendResult.status === 'fulfilled') trend.value = trendResult.value

  loading.value = false
}

onMounted(load)
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Dasbor"
      :description="`Selamat datang, ${auth.displayName}. Pantau operasional AIMS pada konteks aktif.`"
    >
      <template #actions>
        <AppButton variant="ghost" :loading="loading" @click="load">
          <RefreshCw :size="17" /> Muat Ulang
        </AppButton>
      </template>
    </PageHeader>

    <div v-if="error" class="notice notice--warning">{{ error }}</div>

    <section v-if="cards.length" class="metric-grid" aria-label="Ringkasan AIMS">
      <article
        v-for="card in cards"
        :key="card.label"
        class="metric-card"
        :class="`metric-card--${card.tone}`"
      >
        <span class="metric-card__icon"><component :is="card.icon" :size="22" /></span>
        <div>
          <span>{{ card.label }}</span>
          <strong v-if="!loading">{{ new Intl.NumberFormat('id-ID').format(card.value) }}</strong>
          <span v-else class="skeleton skeleton--number"></span>
        </div>
      </article>
    </section>

    <div class="dashboard-grid">
      <AppCard title="Akses cepat" subtitle="Modul sesuai izin Anda.">
        <div class="quick-grid">
          <RouterLink
            v-for="item in visibleHighlights"
            :key="item.label"
            :to="item.to"
            class="quick-link"
          >
            <span><component :is="item.icon" :size="20" /></span>{{ item.label }}
          </RouterLink>
        </div>
      </AppCard>
      <AppCard
        v-if="canPendingActions"
        title="Tindakan tertunda"
        subtitle="Hanya menampilkan tindakan yang boleh Anda proses."
      >
        <StructuredData v-if="Object.keys(pending).length" :value="pending" />
        <EmptyState v-else title="Tidak ada tindakan tertunda" />
      </AppCard>
    </div>

    <div v-if="canStock || canMovement" class="dashboard-grid">
      <AppCard
        v-if="canStock"
        title="Stok per Lokasi"
        subtitle="Jumlah fisik dan tersedia pada cakupan lokasi aktif."
      >
        <StructuredData v-if="locations.length" :value="locations" />
        <EmptyState v-else title="Data stock lokasi belum tersedia" />
      </AppCard>
      <AppCard
        v-if="canMovement"
        title="Pergerakan 30 Hari"
        subtitle="Ringkasan pergerakan persediaan pada cakupan aktif."
      >
        <StructuredData v-if="trend.length" :value="trend.slice(-12)" />
        <EmptyState v-else title="Belum ada pergerakan"><Activity :size="20" /></EmptyState>
      </AppCard>
    </div>
  </div>
</template>
