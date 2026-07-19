<script setup lang="ts">
defineProps<{ title?: string; subtitle?: string; flush?: boolean }>()
</script>

<template>
  <section class="app-card" :class="{ 'app-card--flush': flush }">
    <header v-if="title || subtitle || $slots.actions" class="app-card__header">
      <div>
        <h2 v-if="title">{{ title }}</h2>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="app-card__actions"><slot name="actions" /></div>
    </header>
    <div class="app-card__body"><slot /></div>
  </section>
</template>
