<script setup lang="ts">
import { AlertTriangle, Info, Trash2 } from '@lucide/vue'
import AppButton from './AppButton.vue'
import AppModal from './AppModal.vue'

withDefaults(
  defineProps<{
    open: boolean
    title?: string
    message: string
    detail?: string
    confirmLabel?: string
    cancelLabel?: string
    tone?: 'danger' | 'warning' | 'info'
    busy?: boolean
    layer?: number
  }>(),
  {
    title: 'Konfirmasi tindakan',
    detail: '',
    confirmLabel: 'Lanjutkan',
    cancelLabel: 'Batal',
    tone: 'warning',
    busy: false,
    layer: 3,
  },
)

const emit = defineEmits<{ close: []; confirm: [] }>()
</script>

<template>
  <AppModal
    :open="open"
    :title="title"
    size="sm"
    :busy="busy"
    :layer="layer"
    @close="emit('close')"
  >
    <div class="confirm-dialog" :class="`confirm-dialog--${tone}`">
      <span class="confirm-dialog__icon" aria-hidden="true">
        <Trash2 v-if="tone === 'danger'" :size="22" />
        <AlertTriangle v-else-if="tone === 'warning'" :size="22" />
        <Info v-else :size="22" />
      </span>
      <div class="confirm-dialog__copy">
        <strong>{{ message }}</strong>
        <p v-if="detail">{{ detail }}</p>
      </div>
    </div>
    <template #footer>
      <AppButton variant="ghost" :disabled="busy" @click="emit('close')">
        {{ cancelLabel }}
      </AppButton>
      <AppButton
        :variant="tone === 'danger' ? 'danger' : 'primary'"
        :loading="busy"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </AppButton>
    </template>
  </AppModal>
</template>
