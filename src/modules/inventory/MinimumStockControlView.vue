<script setup lang="ts">
import { computed, ref } from 'vue'
import { AlertTriangle, SlidersHorizontal } from '@lucide/vue'
import ResourceWorkbenchView from '@/modules/resource/ResourceWorkbenchView.vue'
import { useAuthStore } from '@/modules/auth/auth.store'

const auth = useAuthStore()
const active = ref<'stock-thresholds' | 'low-stock'>('stock-thresholds')
const tabs = computed(() =>
  [
    {
      key: 'stock-thresholds' as const,
      label: 'Pengaturan Minimum',
      description: 'Atur batas minimum stok per warehouse dan item.',
      icon: SlidersHorizontal,
      permission: 'inventory.stock_thresholds.read',
    },
    {
      key: 'low-stock' as const,
      label: 'Barang Stok Rendah',
      description: 'Pantau item yang sudah berada di bawah batas minimum.',
      icon: AlertTriangle,
      permission: 'inventory.stock_thresholds.read',
    },
  ].filter((tab) => auth.can(tab.permission)),
)
</script>

<template>
  <div class="minimum-stock-workspace">
    <div class="workflow-view-tabs" role="tablist" aria-label="Minimum dan low stock">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        :class="{ active: active === tab.key }"
        @click="active = tab.key"
      >
        <component :is="tab.icon" :size="17" />
        <span>
          <strong>{{ tab.label }}</strong>
          <small>{{ tab.description }}</small>
        </span>
      </button>
    </div>
    <ResourceWorkbenchView :key="active" :module-key="active" />
  </div>
</template>
