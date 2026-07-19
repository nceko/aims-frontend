<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ClipboardCheck } from '@lucide/vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { apiClient } from '@/services/api-client'
import { endpoints } from '@/config/endpoints'
import { normalizeList } from '@/utils/api'

const items = ref<Record<string, unknown>[]>([])
onMounted(async () => {
  try {
    items.value = normalizeList(await apiClient.get(endpoints.dashboard.pendingActions))
  } catch {
    items.value = []
  }
})
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Approval Center"
      description="Satu tempat untuk melihat transaksi yang menunggu tindakan Anda."
    />
    <AppCard>
      <EmptyState
        v-if="!items.length"
        title="Tidak ada approval tertunda"
        description="Semua transaksi sudah ditindaklanjuti."
      >
        <span class="empty-state__success"><ClipboardCheck :size="20" /> Up to date</span>
      </EmptyState>
      <div v-else class="approval-list">
        <article v-for="(item, index) in items" :key="index">
          <pre>{{ item }}</pre>
        </article>
      </div>
    </AppCard>
  </div>
</template>
