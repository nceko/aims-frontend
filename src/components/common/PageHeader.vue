<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <div class="page-title-block">
    <div>
      <span class="page-title-block__eyebrow">AIMS</span>
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="page-title-block__actions"><slot name="actions" /></div>
  </div>
</template>
