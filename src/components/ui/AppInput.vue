<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string | number
    label?: string
    type?: string
    placeholder?: string
    required?: boolean
    autocomplete?: string
    error?: string
    disabled?: boolean
  }>(),
  { modelValue: '', type: 'text', required: false, disabled: false },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const inputId = computed(() => `input-${Math.random().toString(36).slice(2, 9)}`)
</script>

<template>
  <label class="field" :for="inputId">
    <span v-if="label" class="field__label">{{ label }} <b v-if="required">*</b></span>
    <input
      :id="inputId"
      class="field__control"
      :class="{ 'field__control--error': error }"
      :value="modelValue"
      :type
      :placeholder
      :required
      :autocomplete
      :disabled
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span v-if="error" class="field__error">{{ error }}</span>
  </label>
</template>
