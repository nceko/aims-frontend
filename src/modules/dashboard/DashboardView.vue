<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { AlertTriangle, Boxes, ClipboardClock, PackageCheck, Truck, Wrench } from '@lucide/vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { dashboardHighlights } from '@/config/navigation'
import { dashboardApi, type DashboardSummary } from './dashboard.api'
import { errorMessage } from '@/utils/api'
import { useAuthStore } from '@/modules/auth/auth.store'

const auth = useAuthStore()
const summary = ref<DashboardSummary>({})
const loading = ref(true)
const error = ref('')

const cards = computed(() => [
  { label: 'Total Item', value: summary.value.total_items, icon: Boxes, tone: 'primary' },
  { label: 'Total Asset', value: summary.value.total_assets, icon: Wrench, tone: 'success' },
  { label: 'Stock Tersedia', value: summary.value.total_stock, icon: PackageCheck, tone: 'info' },
  {
    label: 'Low Stock',
    value: summary.value.low_stock_count,
    icon: AlertTriangle,
    tone: 'warning',
  },
  {
    label: 'Pending Approval',
    value: summary.value.pending_approvals,
    icon: ClipboardClock,
    tone: 'danger',
  },
  {
    label: 'Dalam Perjalanan',
    value: summary.value.in_transit_count,
    icon: Truck,
    tone: 'secondary',
  },
])

onMounted(async () => {
  try {
    summary.value = await dashboardApi.summary()
  } catch (cause) {
    error.value = errorMessage(cause, 'Ringkasan dashboard belum dapat dimuat.')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Dashboard"
      :description="`Selamat datang, ${auth.displayName}. Pantau operasional AIMS dari satu tempat.`"
    />

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
          <strong v-if="!loading">{{ card.value ?? '—' }}</strong>
          <span v-else class="skeleton skeleton--number"></span>
        </div>
      </article>
    </section>

    <div class="dashboard-grid">
      <AppCard title="Akses cepat" subtitle="Modul utama sesuai tanggung jawab Anda.">
        <div class="quick-grid">
          <RouterLink
            v-for="item in dashboardHighlights.slice(0, 8)"
            :key="item.label"
            :to="item.to"
            class="quick-link"
          >
            <span><component :is="item.icon" :size="20" /></span>
            {{ item.label }}
          </RouterLink>
        </div>
      </AppCard>

      <AppCard title="Aktivitas terbaru" subtitle="Transaksi terbaru akan muncul dari API audit.">
        <EmptyState
          title="Belum ada aktivitas untuk ditampilkan"
          description="Aktivitas terbaru akan tampil setelah backend mengirim data dashboard."
        />
      </AppCard>
    </div>
  </div>
</template>
