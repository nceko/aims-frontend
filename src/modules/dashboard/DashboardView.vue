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
const audit = ref<Record<string, unknown>>({})
const loading = ref(true)
const error = ref('')

const number = (value: unknown): number => Number(value ?? 0) || 0
const pendingTotal = computed<number>(() =>
  Object.values(pending.value).reduce<number>((total, value) => total + number(value), 0),
)
const cards = computed<Array<{ label: string; value: number; icon: unknown; tone: string }>>(() => [
  { label: 'Total Item', value: number(summary.value.total_items), icon: Boxes, tone: 'primary' },
  { label: 'Total Asset', value: number(assets.value.total_assets), icon: Wrench, tone: 'success' },
  {
    label: 'Stock On Hand',
    value: number(summary.value.total_stock_qty),
    icon: PackageCheck,
    tone: 'info',
  },
  {
    label: 'Low Stock',
    value: number(summary.value.low_stock_count),
    icon: AlertTriangle,
    tone: 'warning',
  },
  { label: 'Pending Action', value: pendingTotal.value, icon: ClipboardClock, tone: 'danger' },
  {
    label: 'Dalam Perjalanan',
    value: number(summary.value.in_transit_count),
    icon: Truck,
    tone: 'secondary',
  },
])
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
      dashboardApi.assets(),
      dashboardApi.pendingActions(),
      dashboardApi.stockByLocation(),
      dashboardApi.movementTrend(),
    ])

  if (summaryResult.status === 'fulfilled') summary.value = summaryResult.value
  else
    error.value = errorMessage(summaryResult.reason, 'Sebagian data dashboard belum dapat dimuat.')
  if (assetResult.status === 'fulfilled') assets.value = assetResult.value
  if (pendingResult.status === 'fulfilled') pending.value = pendingResult.value
  if (locationResult.status === 'fulfilled') locations.value = locationResult.value
  if (trendResult.status === 'fulfilled') trend.value = trendResult.value

  if (auth.can('reports.audit.read')) {
    try {
      audit.value = await dashboardApi.audit()
    } catch {
      audit.value = {}
    }
  }
  loading.value = false
}

onMounted(load)
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Dashboard"
      :description="`Selamat datang, ${auth.displayName}. Pantau operasional AIMS pada context aktif.`"
    >
      <template #actions>
        <AppButton variant="ghost" :loading="loading" @click="load">
          <RefreshCw :size="17" /> Refresh
        </AppButton>
      </template>
    </PageHeader>

    <div v-if="error" class="notice notice--warning">{{ error }}</div>

    <section class="metric-grid" aria-label="Ringkasan AIMS">
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
      <AppCard title="Akses cepat" subtitle="Modul sesuai permission Anda.">
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
      <AppCard title="Pending actions" subtitle="Transaksi yang membutuhkan tindak lanjut.">
        <StructuredData v-if="Object.keys(pending).length" :value="pending" />
        <EmptyState v-else title="Tidak ada pending action" />
      </AppCard>
    </div>

    <div class="dashboard-grid">
      <AppCard title="Stock per Location" subtitle="Qty on hand dan available pada scope location.">
        <StructuredData v-if="locations.length" :value="locations" />
        <EmptyState v-else title="Data stock lokasi belum tersedia" />
      </AppCard>
      <AppCard title="Movement 30 Hari" subtitle="Ringkasan pergerakan inventory.">
        <StructuredData v-if="trend.length" :value="trend.slice(-12)" />
        <EmptyState v-else title="Belum ada movement"><Activity :size="20" /></EmptyState>
      </AppCard>
    </div>

    <AppCard
      v-if="auth.can('reports.audit.read')"
      title="Audit & API Activity"
      subtitle="Ringkasan aktivitas teknis backend sesuai context aktif."
    >
      <StructuredData v-if="Object.keys(audit).length" :value="audit" />
      <EmptyState v-else title="Data audit belum tersedia" />
    </AppCard>
  </div>
</template>
