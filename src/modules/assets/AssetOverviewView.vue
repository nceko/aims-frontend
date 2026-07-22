<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { AlertTriangle, Boxes, PackageCheck, RefreshCw, ShieldCheck, Wrench } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { dashboardApi, type AssetSummary } from '@/modules/dashboard/dashboard.api'
import { errorMessage } from '@/utils/api'

const summary = ref<AssetSummary>({})
const loading = ref(true)
const error = ref('')

const number = (value: unknown): number => Number(value ?? 0) || 0
const cards = computed(() => [
  {
    label: 'Total Aset',
    value: number(summary.value.total_assets),
    icon: Boxes,
    tone: 'primary',
  },
  {
    label: 'Tersedia',
    value: number(summary.value.available_assets),
    icon: PackageCheck,
    tone: 'success',
  },
  {
    label: 'Sedang Digunakan',
    value: number(summary.value.assigned_assets),
    icon: ShieldCheck,
    tone: 'info',
  },
  {
    label: 'Perawatan',
    value: number(summary.value.maintenance_assets),
    icon: Wrench,
    tone: 'warning',
  },
  {
    label: 'Hilang',
    value: number(summary.value.lost_assets),
    icon: AlertTriangle,
    tone: 'danger',
  },
  {
    label: 'Dilepas',
    value: number(summary.value.disposed_assets),
    icon: Boxes,
    tone: 'secondary',
  },
])

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    summary.value = await dashboardApi.assets()
  } catch (cause) {
    summary.value = {}
    error.value = errorMessage(cause, 'Ringkasan aset belum dapat dimuat dari backend.')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Ringkasan Aset"
      description="Pantau jumlah aset tersedia, ditugaskan, maintenance, hilang, dan sudah dihapuskan."
    >
      <template #actions>
        <AppButton variant="ghost" :loading="loading" @click="load">
          <RefreshCw :size="17" /> Muat Ulang
        </AppButton>
      </template>
    </PageHeader>

    <div v-if="error" class="notice notice--warning">{{ error }}</div>

    <section class="metric-grid" aria-label="Ringkasan status aset">
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
      <AppCard title="Register Aset" subtitle="Kelola sumber dan status registrasi aset.">
        <div class="workflow-link-grid">
          <RouterLink class="workflow-link" to="/assets/register">
            <strong>Semua Aset</strong>
            <span>Lihat seluruh aset dan buka detail lifecycle.</span>
          </RouterLink>
          <RouterLink class="workflow-link" to="/assets/from-warehouse">
            <strong>Aset dari Gudang</strong>
            <span>Lengkapi profil unit bernomor seri yang sudah masuk stok.</span>
          </RouterLink>
          <RouterLink class="workflow-link" to="/assets/direct-acquisitions">
            <strong>Aset Langsung</strong>
            <span>Persiapan registrasi aset yang tidak melewati gudang.</span>
          </RouterLink>
          <RouterLink class="workflow-link" to="/assets/migrations">
            <strong>Migrasi Aset Existing</strong>
            <span>Persiapan input aset lama ke AIMS.</span>
          </RouterLink>
        </div>
      </AppCard>

      <AppCard title="Operasional Aset" subtitle="Akses tindakan berdasarkan lifecycle aset.">
        <div class="workflow-link-grid">
          <RouterLink class="workflow-link" to="/assets/assignments">
            <strong>Penugasan Aktif</strong>
            <span>Tugaskan aset kepada pegawai, divisi, lokasi, atau kendaraan.</span>
          </RouterLink>
          <RouterLink class="workflow-link" to="/assets/returns">
            <strong>Pengembalian</strong>
            <span>Proses aset kembali ke warehouse dan pemeriksaan kondisi.</span>
          </RouterLink>
          <RouterLink class="workflow-link" to="/assets/transfers">
            <strong>Transfer Penanggung Jawab</strong>
            <span>Pindahkan tanggung jawab tanpa mengubah stok warehouse.</span>
          </RouterLink>
          <RouterLink class="workflow-link" to="/assets/maintenances">
            <strong>Perawatan Aset</strong>
            <span>Kelola perbaikan dan riwayat perawatan.</span>
          </RouterLink>
        </div>
      </AppCard>
    </div>

    <EmptyState
      v-if="!loading && !error && !summary.total_assets"
      title="Belum ada data aset"
      description="Aset dari gudang akan muncul setelah unit serial diposting ke stok dan profil aset dilengkapi."
    />
  </div>
</template>
