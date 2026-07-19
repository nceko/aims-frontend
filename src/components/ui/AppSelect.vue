<script setup lang="ts">
import { computed } from 'vue'

export interface SelectOption {
  value: string | number
  label: string
}

withDefaults(
  defineProps<{
    modelValue?: string | number
    label?: string
    options: SelectOption[]
    placeholder?: string
    required?: boolean
    disabled?: boolean
  }>(),
  { modelValue: '', placeholder: 'Pilih data', required: false, disabled: false },
)
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const selectId = computed(() => `select-${Math.random().toString(36).slice(2, 9)}`)
</script>

<template>
  <label class="field" :for="selectId">
    <span v-if="label" class="field__label">{{ label }} <b v-if="required">*</b></span>
    <select
      :id="selectId"
      class="field__control"
      :value="modelValue"
      :required
      :disabled
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="" disabled>{{ placeholder }}</option>
      <option v-for="option in options" :key="String(option.value)" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </label>
</template>
