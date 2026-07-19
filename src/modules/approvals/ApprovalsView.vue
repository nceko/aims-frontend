<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ClipboardCheck, RefreshCw } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StructuredData from '@/components/data/StructuredData.vue'
import { apiClient } from '@/services/api-client'
import { endpoints } from '@/config/endpoints'
import { errorMessage } from '@/utils/api'
import { useAuthStore } from '@/modules/auth/auth.store'

const auth = useAuthStore()
const payload = ref<unknown>(null)
const loading = ref(false)
const error = ref('')
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
      label: 'Asset Hilang',
      to: '/assets/loss-cases',
      permission: 'inventory.asset_losses.approve',
    },
    {
      label: 'Disposal Asset',
      to: '/assets/disposals',
      permission: 'inventory.asset_disposals.approve',
    },
  ].filter((item) => auth.can(item.permission)),
)
async function load() {
  loading.value = true
  error.value = ''
  try {
    payload.value = await apiClient.get(endpoints.dashboard.pendingActions)
  } catch (cause) {
    payload.value = null
    error.value = errorMessage(cause, 'Pending action tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>
<template>
  <div class="page-stack">
    <PageHeader
      title="Approval Center"
      description="Ringkasan transaksi yang menunggu tindakan sesuai permission dan context aktif."
    >
      <template #actions
        ><AppButton variant="ghost" :loading="loading" @click="load"
          ><RefreshCw :size="17" /> Refresh</AppButton
        ></template
      >
    </PageHeader>
    <div v-if="error" class="notice notice--danger">{{ error }}</div>
    <div class="approval-shortcuts">
      <RouterLink v-for="item in shortcuts" :key="item.to" :to="item.to"
        ><ClipboardCheck :size="19" /><span>{{ item.label }}</span></RouterLink
      >
    </div>
    <AppCard
      title="Pending Actions"
      subtitle="Angka dan rincian berasal dari /api/v1/dashboard/pending-actions."
    >
      <div v-if="loading" class="table-loading">
        <span v-for="n in 5" :key="n" class="skeleton skeleton--row"></span>
      </div>
      <StructuredData v-else-if="payload" :value="payload" />
      <EmptyState
        v-else
        title="Tidak ada approval tertunda"
        description="Semua transaksi pada context aktif sudah ditindaklanjuti."
        ><span class="empty-state__success"
          ><ClipboardCheck :size="20" /> Up to date</span
        ></EmptyState
      >
    </AppCard>
  </div>
</template>
