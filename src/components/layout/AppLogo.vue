<script setup lang="ts">
import brandMark from '@/assets/images/aims-brand-mark.png'

withDefaults(defineProps<{ compact?: boolean; inverse?: boolean }>(), {
  compact: false,
  inverse: false,
})
</script>

<template>
  <RouterLink
    class="app-logo"
    :class="{ 'app-logo--compact': compact, 'app-logo--inverse': inverse }"
    to="/"
    aria-label="AIMS - Aset & Inventory Management System"
  >
    <span class="app-logo__mark" aria-hidden="true">
      <img :src="brandMark" alt="" />
    </span>
    <span v-if="!compact" class="app-logo__copy">
      <strong>AIMS</strong>
      <small>Sistem Manajemen Aset & Persediaan</small>
    </span>
  </RouterLink>
</template>
