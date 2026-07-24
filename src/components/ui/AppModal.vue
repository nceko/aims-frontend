<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { X } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    description?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    busy?: boolean
    layer?: number
  }>(),
  { size: 'lg', busy: false, layer: 1 },
)
const emit = defineEmits<{ close: [] }>()
const modalRef = ref<HTMLElement | null>(null)
let focusFrame = 0

function focusFirstField(): void {
  window.cancelAnimationFrame(focusFrame)
  focusFrame = window.requestAnimationFrame(() => {
    const modal = modalRef.value
    if (!modal || !props.open) return
    const field = modal.querySelector<HTMLElement>(
      [
        '[data-autofocus]:not([disabled])',
        '.app-modal__body input:not([type="hidden"]):not([disabled]):not([readonly])',
        '.app-modal__body textarea:not([disabled]):not([readonly])',
        '.app-modal__body button.select2-trigger:not([disabled])',
        '.app-modal__body [contenteditable="true"]',
      ].join(','),
    )
    field?.focus({ preventScroll: true })
  })
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    await nextTick()
    focusFirstField()
  },
  { immediate: true },
)

onBeforeUnmount(() => window.cancelAnimationFrame(focusFrame))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-backdrop"
      :style="{ zIndex: 90 + Math.max(0, layer - 1) * 20 }"
      role="presentation"
      @mousedown.self="!busy && emit('close')"
    >
      <section
        ref="modalRef"
        class="app-modal"
        :class="`app-modal--${size}`"
        role="dialog"
        aria-modal="true"
      >
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
