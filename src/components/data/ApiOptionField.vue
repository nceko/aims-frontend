<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppSelect, { type SelectOption } from '@/components/ui/AppSelect.vue'
import { apiClient } from '@/services/api-client'
import { normalizeList } from '@/utils/api'
import { fieldOptionSources } from '@/config/field-options'

const props = withDefaults(
  defineProps<{
    fieldName: string
    modelValue: unknown
    rootModel: Record<string, unknown>
    multiple?: boolean
    required?: boolean
    disabled?: boolean
    enumValues?: Array<string | number | boolean>
  }>(),
  { multiple: false, required: false, disabled: false, enumValues: () => [] },
)
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()
const options = ref<SelectOption[]>([])
const loading = ref(false)
const source = computed(() => fieldOptionSources[props.fieldName])

const normalizedModelValue = computed<string | string[] | number | boolean>(() => {
  if (props.multiple) return Array.isArray(props.modelValue) ? props.modelValue.map(String) : []
  const value = props.modelValue
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? value
    : ''
})

function firstValue(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys)
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key]
}

function optionLabel(row: Record<string, unknown>, keys: string[]): string {
  const pieces: string[] = []
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && value !== '' && !pieces.includes(String(value)))
      pieces.push(String(value))
  }
  return pieces.slice(0, 2).join(' - ') || String(firstValue(row, ['id', 'value']) ?? 'Option')
}

function resolvePath(path: string): string | null {
  let result = path
  for (const [parameter, modelKey] of Object.entries(source.value?.pathFromModel ?? {})) {
    const value = props.rootModel[modelKey]
    if (value === undefined || value === null || value === '') return null
    result = result.replace(`{${parameter}}`, encodeURIComponent(String(value)))
  }
  return result
}

async function load() {
  if (props.enumValues.length) {
    options.value = props.enumValues.map((value) => ({
      value,
      label: String(value).replaceAll('_', ' '),
    }))
    return
  }
  if (source.value?.staticOptions) {
    options.value = source.value.staticOptions
    return
  }
  if (!source.value?.path) return
  const path = resolvePath(source.value.path)
  if (!path) {
    options.value = []
    return
  }
  const query: Record<string, unknown> = {}
  for (const [parameter, modelKey] of Object.entries(source.value.queryFromModel ?? {})) {
    const value = props.rootModel[modelKey]
    if (value !== undefined && value !== null && value !== '') query[parameter] = value
  }
  query.limit = 200
  query.per_page = 200
  loading.value = true
  try {
    const payload = await apiClient.get<unknown>(path, query)
    const rows = normalizeList<Record<string, unknown>>(payload)
    const valueKeys = source.value.valueKeys ?? ['value', 'id']
    const labelKeys = source.value.labelKeys ?? ['label', 'name', 'code']
    options.value = rows
      .map((row) => ({
        value: (firstValue(row, valueKeys) ?? '') as string | number | boolean,
        label: optionLabel(row, labelKeys),
      }))
      .filter((item) => item.value !== '')
  } catch {
    options.value = []
  } finally {
    loading.value = false
  }
}

function updateValue(value: string | string[]) {
  emit('update:modelValue', value)
}

const dependencies = computed(() =>
  JSON.stringify(
    Object.values({
      ...(source.value?.queryFromModel ?? {}),
      ...(source.value?.pathFromModel ?? {}),
    }).map((key) => props.rootModel[key]),
  ),
)

onMounted(load)
watch(dependencies, load)
watch(() => props.enumValues, load, { deep: true })
</script>

<template>
  <AppSelect
    :model-value="normalizedModelValue"
    :options="options"
    :multiple="multiple"
    :required="required"
    :disabled="disabled"
    :loading="loading"
    searchable
    clearable
    @update:model-value="updateValue"
  />
</template>
