<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset'
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    loading?: boolean
    disabled?: boolean
  }>(),
  { type: 'button', variant: 'primary', loading: false, disabled: false },
)
</script>

<template>
  <button
    class="app-button"
    :class="`app-button--${variant}`"
    :type
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="button-spinner" aria-hidden="true"></span>
    <slot />
  </button>
</template>
