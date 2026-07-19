<script setup lang="ts">
import { X } from '@lucide/vue'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    description?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    busy?: boolean
  }>(),
  { size: 'lg', busy: false },
)
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-backdrop"
      role="presentation"
      @mousedown.self="!busy && emit('close')"
    >
      <section class="app-modal" :class="`app-modal--${size}`" role="dialog" aria-modal="true">
        <header class="app-modal__header">
          <div>
            <h2>{{ title }}</h2>
            <p v-if="description">{{ description }}</p>
          </div>
          <button
            class="icon-button"
            type="button"
            aria-label="Tutup"
            :disabled="busy"
            @click="emit('close')"
          >
            <X :size="19" />
          </button>
        </header>
        <div class="app-modal__body"><slot /></div>
        <footer v-if="$slots.footer" class="app-modal__footer"><slot name="footer" /></footer>
      </section>
    </div>
  </Teleport>
</template>
