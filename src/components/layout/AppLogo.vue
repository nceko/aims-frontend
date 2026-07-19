<script setup lang="ts">
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
  >
    <span class="app-logo__mark" aria-hidden="true">
      <span>A</span>
    </span>
    <span v-if="!compact" class="app-logo__copy">
      <strong>AIMS</strong>
      <small>Aset & Inventory Management System</small>
    </span>
  </RouterLink>
</template>
