<script setup lang="ts">
import { Inbox } from '@lucide/vue'
withDefaults(defineProps<{ title?: string; description?: string }>(), {
  title: 'Belum ada data',
  description: 'Data akan tampil di sini setelah tersedia dari server.',
})
</script>

<template>
  <div class="empty-state">
    <span class="empty-state__icon"><Inbox :size="28" /></span>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <slot />
  </div>
</template>
