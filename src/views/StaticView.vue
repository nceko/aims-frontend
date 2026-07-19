<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
defineProps<{ title: string; description: string }>()
</script>
<template>
  <div class="page-stack">
    <PageHeader :title :description />
    <AppCard
      ><EmptyState
        title="Modul siap dikembangkan"
        description="Fondasi route dan layout sudah tersedia. Hubungkan form bisnis sesuai endpoint backend."
    /></AppCard>
  </div>
</template>
