<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppSelect, { type SelectOption } from '@/components/ui/AppSelect.vue'
import { apiClient } from '@/services/api-client'
import { normalizeList } from '@/utils/api'
import { fieldOptionSources } from '@/config/field-options'
import { useAuthStore } from '@/modules/auth/auth.store'
import type { FieldOptionSource } from '@/types/resource'

const props = withDefaults(
  defineProps<{
    fieldName: string
    modelValue: unknown
    rootModel: Record<string, unknown>
    multiple?: boolean
    required?: boolean
    disabled?: boolean
    enumValues?: Array<string | number | boolean>
    sourceOverride?: FieldOptionSource
    defaultCode?: string
    clearable?: boolean
  }>(),
  {
    multiple: false,
    required: false,
    disabled: false,
    enumValues: () => [],
    clearable: true,
  },
)
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()
const auth = useAuthStore()

interface CachedOptions {
  storedAt: number
  options: SelectOption[]
}

const OPTION_CACHE_TTL_MS = 5 * 60 * 1000
const optionCache = new Map<string, CachedOptions>()

const options = ref<SelectOption[]>([])
const loading = ref(false)
const source = computed(() => props.sourceOverride ?? fieldOptionSources[props.fieldName])
let defaultApplied = false
let debounceTimer: number | undefined
let activeController: AbortController | undefined
let requestSequence = 0

const normalizedModelValue = computed<string | string[] | number | boolean>(() => {
  if (props.multiple) return Array.isArray(props.modelValue) ? props.modelValue.map(String) : []
  const value = props.modelValue
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? value
    : ''
})

const isRemoteSearch = computed(() => Boolean(source.value?.remoteSearch))
const minimumInputLength = computed(() => source.value?.minimumInputLength ?? 2)
const debounceMs = computed(() => source.value?.debounceMs ?? 350)
const remoteNoResultsText = computed(
  () => `Data tidak ditemukan. Coba kata kunci lain minimal ${minimumInputLength.value} karakter.`,
)

function firstValue(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys)
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key]
}

function normalizeLabelPart(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function compactCompositeLabel(value: string): string {
  const segments = value
    .split(/\s-\s|\s•\s|\s\|\s/)
    .map((segment) => normalizeLabelPart(segment))
    .filter(Boolean)
  const cleaned: string[] = []
  for (const segment of segments) {
    const normalizedSegment = segment.toLocaleLowerCase('id-ID')
    const duplicated = cleaned.some((existing) => {
      const normalizedExisting = existing.toLocaleLowerCase('id-ID')
      return (
        normalizedExisting === normalizedSegment ||
        normalizedExisting.includes(normalizedSegment) ||
        normalizedSegment.includes(normalizedExisting)
      )
    })
    if (!duplicated) cleaned.push(segment)
  }
  return cleaned.join(' - ') || normalizeLabelPart(value)
}

function optionLabel(row: Record<string, unknown>, keys: string[]): string {
  const explicitLabel = normalizeLabelPart(row.label)
  if (explicitLabel) return compactCompositeLabel(explicitLabel)

  const pieces: string[] = []
  for (const key of keys) {
    const value = normalizeLabelPart(row[key])
    if (!value) continue
    const duplicate = pieces.some((piece) => {
      const current = piece.toLocaleLowerCase('id-ID')
      const next = value.toLocaleLowerCase('id-ID')
      return current === next || current.includes(next) || next.includes(current)
    })
    if (!duplicate) pieces.push(value)
  }
  return (
    compactCompositeLabel(pieces.slice(0, 2).join(' - ')) ||
    String(firstValue(row, ['id', 'value']) ?? 'Option')
  )
}

function optionDescription(row: Record<string, unknown>): string | undefined {
  const label = normalizeLabelPart(row.label)
  const name = normalizeLabelPart(
    firstValue(row, ['name', 'category_name', 'item_name', 'supplier_name']),
  )
  const code = normalizeLabelPart(
    firstValue(row, ['code', 'category_code', 'item_code', 'supplier_code']),
  )
  const description = normalizeLabelPart(firstValue(row, ['description', 'notes']))

  if (label) {
    if (code && !label.toLocaleLowerCase('id-ID').includes(code.toLocaleLowerCase('id-ID')))
      return code
    if (name && !label.toLocaleLowerCase('id-ID').includes(name.toLocaleLowerCase('id-ID')))
      return name
    return description || undefined
  }

  if (code && name && code !== name) return code
  return description || undefined
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

function selectedValues(): string[] {
  if (props.multiple) return Array.isArray(props.modelValue) ? props.modelValue.map(String) : []
  return props.modelValue === undefined || props.modelValue === null || props.modelValue === ''
    ? []
    : [String(props.modelValue)]
}

function selectedFallbackOptions(): SelectOption[] {
  const values = selectedValues()
  if (!values.length) return []

  const base = props.fieldName.replace(/_ids?$/, '')
  const labelPieces = [
    props.rootModel[`${base}_code`],
    props.rootModel[`${base}_name`],
    props.rootModel[`${base}_label`],
    props.rootModel[`${base}_no`],
  ]
    .filter((value) => value !== undefined && value !== null && value !== '')
    .map((value) => normalizeLabelPart(value))
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index)

  if (!labelPieces.length) return []
  const label = compactCompositeLabel(labelPieces.slice(0, 2).join(' - '))
  return values.map((value) => ({ value, label }))
}

function mergeWithSelected(nextOptions: SelectOption[]): SelectOption[] {
  const selected = new Set(selectedValues())
  const merged = new Map<string, SelectOption>()

  for (const option of nextOptions) merged.set(String(option.value), option)
  for (const option of options.value)
    if (selected.has(String(option.value))) merged.set(String(option.value), option)
  for (const option of selectedFallbackOptions())
    if (!merged.has(String(option.value))) merged.set(String(option.value), option)

  return [...merged.values()]
}

function normalizeOptions(payload: unknown): SelectOption[] {
  const rows = normalizeList<Record<string, unknown>>(payload)
  const valueKeys = source.value?.valueKeys ?? ['value', 'id']
  const labelKeys = source.value?.labelKeys ?? ['label', 'name', 'code']
  const normalized = rows
    .map((row) => ({
      value: (firstValue(row, valueKeys) ?? '') as string | number | boolean,
      label: optionLabel(row, labelKeys),
      description: optionDescription(row),
    }))
    .filter((item) => item.value !== '')

  if (
    props.defaultCode &&
    !defaultApplied &&
    (props.modelValue === undefined || props.modelValue === null || props.modelValue === '')
  ) {
    const expected = props.defaultCode.trim().toLocaleUpperCase('id-ID')
    const index = rows.findIndex((row) => {
      const code = firstValue(row, [
        'code',
        'warehouse_code',
        'item_code',
        'supplier_code',
        'category_code',
      ])
      return (
        String(code ?? '')
          .trim()
          .toLocaleUpperCase('id-ID') === expected
      )
    })
    const match = normalized[index]
    if (match) {
      defaultApplied = true
      emit('update:modelValue', match.value)
    }
  }

  return normalized
}

function buildQuery(searchTerm: string): Record<string, unknown> {
  const query: Record<string, unknown> = {}
  for (const [parameter, modelKey] of Object.entries(source.value?.queryFromModel ?? {})) {
    if (parameter === 'company_id' && !auth.isSuperAdmin) continue
    const value = props.rootModel[modelKey]
    if (value !== undefined && value !== null && value !== '') query[parameter] = value
  }

  const term = searchTerm.trim()
  if (isRemoteSearch.value && term.length >= minimumInputLength.value) {
    query[source.value?.searchParam ?? 'search'] = term
  }
  return query
}

function cacheKey(path: string, query: Record<string, unknown>): string {
  return `${path}?${JSON.stringify(
    Object.entries(query).sort(([left], [right]) => left.localeCompare(right)),
  )}`
}

function isCanceledRequest(cause: unknown): boolean {
  if (!cause || typeof cause !== 'object') return false
  const error = cause as { code?: string; name?: string }
  return (
    error.code === 'ERR_CANCELED' || error.name === 'CanceledError' || error.name === 'AbortError'
  )
}

async function load(searchTerm = '', force = false) {
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

  const term = searchTerm.trim()
  if (isRemoteSearch.value && term.length > 0 && term.length < minimumInputLength.value) return

  const path = resolvePath(source.value.path)
  if (!path) {
    options.value = mergeWithSelected([])
    return
  }

  const query = buildQuery(term)
  const key = cacheKey(path, query)
  const cached = optionCache.get(key)
  if (!force && cached && Date.now() - cached.storedAt < OPTION_CACHE_TTL_MS) {
    options.value = mergeWithSelected(cached.options)
    return
  }

  activeController?.abort()
  const controller = new AbortController()
  activeController = controller
  const sequence = ++requestSequence
  loading.value = true

  try {
    const payload = await apiClient.get<unknown>(path, query, { signal: controller.signal })
    if (sequence !== requestSequence) return
    const nextOptions = normalizeOptions(payload)
    optionCache.set(key, { storedAt: Date.now(), options: nextOptions })
    options.value = mergeWithSelected(nextOptions)
  } catch (cause) {
    if (!isCanceledRequest(cause) && sequence === requestSequence) {
      options.value = mergeWithSelected([])
    }
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

function scheduleRemoteSearch(term: string) {
  if (!isRemoteSearch.value) return
  if (debounceTimer) window.clearTimeout(debounceTimer)
  activeController?.abort()

  const normalized = term.trim()
  if (normalized.length > 0 && normalized.length < minimumInputLength.value) return

  debounceTimer = window.setTimeout(() => {
    void load(normalized)
  }, debounceMs.value)
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

onMounted(() => void load(props.defaultCode ?? ''))
watch(dependencies, () => {
  activeController?.abort()
  options.value = mergeWithSelected([])
  void load()
})
watch(
  () => props.enumValues,
  () => void load(),
  { deep: true },
)
watch(
  () => props.modelValue,
  () => {
    options.value = mergeWithSelected(options.value)
  },
  { deep: true },
)

onBeforeUnmount(() => {
  activeController?.abort()
  if (debounceTimer) window.clearTimeout(debounceTimer)
})
</script>

<template>
  <AppSelect
    :model-value="normalizedModelValue"
    :options="options"
    :multiple="multiple"
    :required="required"
    :disabled="disabled"
    :loading="loading"
    :remote-search="isRemoteSearch"
    :minimum-input-length="minimumInputLength"
    :no-results-text="remoteNoResultsText"
    searchable
    :clearable="clearable"
    @search="scheduleRemoteSearch"
    @update:model-value="updateValue"
  />
</template>
