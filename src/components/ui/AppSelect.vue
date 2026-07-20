<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue'

export interface SelectOption {
  value: string | number | boolean
  label: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | string[] | number | boolean | null
    label?: string
    options: SelectOption[]
    placeholder?: string
    name?: string
    required?: boolean
    disabled?: boolean
    loading?: boolean
    multiple?: boolean
    searchable?: boolean
    clearable?: boolean
    compact?: boolean
    noResultsText?: string
    remoteSearch?: boolean
    minimumInputLength?: number
  }>(),
  {
    modelValue: '',
    placeholder: 'Pilih data',
    name: undefined,
    required: false,
    disabled: false,
    loading: false,
    multiple: false,
    searchable: true,
    clearable: false,
    compact: false,
    noResultsText: 'Data tidak ditemukan',
    remoteSearch: false,
    minimumInputLength: 0,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | string[]]
  change: [value: string | string[]]
  open: []
  close: []
  search: [term: string]
}>()

let selectCounter = 0
const selectId = `select2-${++selectCounter}`
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)
const isOpen = ref(false)
const search = ref('')
const highlightedIndex = ref(-1)
const dropdownStyle = ref<CSSProperties>({})

const normalizedValue = computed<string | string[]>(() => {
  if (props.multiple) {
    return Array.isArray(props.modelValue) ? props.modelValue.map(String) : []
  }
  return props.modelValue === undefined || props.modelValue === null ? '' : String(props.modelValue)
})

const selectedOptions = computed(() => {
  const selected = Array.isArray(normalizedValue.value)
    ? normalizedValue.value
    : normalizedValue.value
      ? [normalizedValue.value]
      : []
  return props.options.filter((option) => selected.includes(String(option.value)))
})

const selectedLabel = computed(() => selectedOptions.value[0]?.label ?? '')

const normalizedSearch = computed(() => search.value.trim())
const remoteSearchNeedsMoreCharacters = computed(
  () =>
    props.remoteSearch &&
    normalizedSearch.value.length > 0 &&
    normalizedSearch.value.length < props.minimumInputLength,
)

const filteredOptions = computed(() => {
  if (remoteSearchNeedsMoreCharacters.value) return []
  if (props.remoteSearch && props.loading) return []
  if (props.remoteSearch) return props.options
  const term = normalizedSearch.value.toLocaleLowerCase('id-ID')
  if (!term) return props.options
  return props.options.filter((option) => option.label.toLocaleLowerCase('id-ID').includes(term))
})

const effectiveDisabled = computed(() => props.disabled || (props.loading && !props.remoteSearch))
const resultsMessage = computed(() => {
  if (props.loading && props.remoteSearch) return 'Mencari data…'
  if (remoteSearchNeedsMoreCharacters.value)
    return `Ketik minimal ${props.minimumInputLength} karakter untuk mencari seluruh data.`
  return props.noResultsText
})

const hasValue = computed(() =>
  props.multiple
    ? Array.isArray(normalizedValue.value) && normalizedValue.value.length > 0
    : Boolean(normalizedValue.value),
)

function isSelected(option: SelectOption): boolean {
  const value = String(option.value)
  return Array.isArray(normalizedValue.value)
    ? normalizedValue.value.includes(value)
    : normalizedValue.value === value
}

function emitValue(value: string | string[]) {
  emit('update:modelValue', value)
  emit('change', value)
}

function choose(option: SelectOption) {
  if (option.disabled) return
  const value = String(option.value)

  if (props.multiple) {
    const current = Array.isArray(normalizedValue.value) ? [...normalizedValue.value] : []
    const index = current.indexOf(value)
    if (index >= 0) current.splice(index, 1)
    else current.push(value)
    emitValue(current)
    search.value = ''
    nextTick(() => searchRef.value?.focus())
    return
  }

  emitValue(value)
  closeDropdown()
}

function removeValue(value: string) {
  if (!props.multiple || props.disabled) return
  const current = Array.isArray(normalizedValue.value)
    ? normalizedValue.value.filter((item) => item !== value)
    : []
  emitValue(current)
}

function clearValue(event?: Event) {
  event?.stopPropagation()
  if (props.disabled) return
  emitValue(props.multiple ? [] : '')
}

function updateDropdownPosition() {
  const trigger = triggerRef.value
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  const viewportPadding = 12
  const availableBelow = window.innerHeight - rect.bottom - viewportPadding
  const availableAbove = rect.top - viewportPadding
  const openAbove = availableBelow < 240 && availableAbove > availableBelow
  const maxHeight = Math.max(
    160,
    Math.min(340, openAbove ? availableAbove - 8 : availableBelow - 8),
  )

  dropdownStyle.value = {
    position: 'fixed',
    left: `${Math.max(viewportPadding, rect.left)}px`,
    top: openAbove ? 'auto' : `${rect.bottom + 6}px`,
    bottom: openAbove ? `${window.innerHeight - rect.top + 6}px` : 'auto',
    width: `${Math.max(rect.width, 220)}px`,
    maxWidth: `calc(100vw - ${viewportPadding * 2}px)`,
    '--select2-max-height': `${maxHeight}px`,
  } as CSSProperties
}

async function openDropdown() {
  if (effectiveDisabled.value || isOpen.value) return
  isOpen.value = true
  search.value = ''
  highlightedIndex.value = Math.max(
    0,
    filteredOptions.value.findIndex((option) => isSelected(option) && !option.disabled),
  )
  updateDropdownPosition()
  emit('open')
  await nextTick()
  updateDropdownPosition()
  if (props.searchable) searchRef.value?.focus()
}

function closeDropdown() {
  if (!isOpen.value) return
  isOpen.value = false
  search.value = ''
  highlightedIndex.value = -1
  emit('close')
}

function toggleDropdown() {
  if (isOpen.value) closeDropdown()
  else void openDropdown()
}

function moveHighlight(direction: 1 | -1) {
  const options = filteredOptions.value
  if (!options.length) return
  let next = highlightedIndex.value
  for (let attempts = 0; attempts < options.length; attempts += 1) {
    next = (next + direction + options.length) % options.length
    if (!options[next]?.disabled) {
      highlightedIndex.value = next
      nextTick(() => {
        dropdownRef.value
          ?.querySelector<HTMLElement>(`[data-option-index="${next}"]`)
          ?.scrollIntoView({ block: 'nearest' })
      })
      return
    }
  }
}

function onTriggerKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!isOpen.value) void openDropdown()
    else moveHighlight(event.key === 'ArrowDown' ? 1 : -1)
    return
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    if (!isOpen.value) void openDropdown()
    else {
      const option = filteredOptions.value[highlightedIndex.value]
      if (option) choose(option)
    }
    return
  }
  if (event.key === 'Escape') closeDropdown()
  if (event.key === 'Backspace' && props.multiple && !search.value) {
    const values = Array.isArray(normalizedValue.value) ? normalizedValue.value : []
    const last = values.at(-1)
    if (last) removeValue(last)
  }
}

function onSearchKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    moveHighlight(event.key === 'ArrowDown' ? 1 : -1)
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    const option = filteredOptions.value[highlightedIndex.value]
    if (option) choose(option)
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    closeDropdown()
    triggerRef.value?.focus()
  }
}

function onDocumentPointerDown(event: PointerEvent) {
  const target = event.target as Node | null
  if (!target) return
  if (rootRef.value?.contains(target) || dropdownRef.value?.contains(target)) return
  closeDropdown()
}

function onViewportChange() {
  if (isOpen.value) updateDropdownPosition()
}

watch(effectiveDisabled, (disabled) => {
  if (disabled) closeDropdown()
})

watch(search, (term) => {
  if (props.remoteSearch && isOpen.value) emit('search', term)
})

watch(filteredOptions, (options) => {
  if (!options.length) highlightedIndex.value = -1
  else if (highlightedIndex.value < 0 || highlightedIndex.value >= options.length)
    highlightedIndex.value = options.findIndex((option) => !option.disabled)
})

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
})
</script>

<template>
  <div ref="rootRef" class="field select2-field" :class="{ 'select2-field--compact': compact }">
    <label v-if="label" class="field__label" :for="selectId">
      {{ label }} <b v-if="required">*</b>
    </label>

    <select
      :id="selectId"
      class="select2-native-control"
      :name="name"
      :multiple="multiple"
      :required="required"
      :disabled="effectiveDisabled"
      :value="multiple ? undefined : normalizedValue"
      tabindex="-1"
      aria-hidden="true"
      @change="
        emitValue(
          multiple
            ? Array.from(($event.target as HTMLSelectElement).selectedOptions).map(
                (option) => option.value,
              )
            : ($event.target as HTMLSelectElement).value,
        )
      "
    >
      <option v-if="!multiple" value="">{{ placeholder }}</option>
      <option
        v-for="option in options"
        :key="String(option.value)"
        :value="String(option.value)"
        :selected="multiple && isSelected(option)"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </option>
    </select>

    <button
      ref="triggerRef"
      class="select2-container select2-container--aims"
      :class="{
        'select2-container--open': isOpen,
        'select2-container--disabled': effectiveDisabled,
        'select2-container--multiple': multiple,
        'select2-container--compact': compact,
      }"
      type="button"
      role="combobox"
      :aria-expanded="isOpen"
      :aria-controls="`${selectId}-results`"
      :aria-disabled="effectiveDisabled"
      :disabled="effectiveDisabled"
      @click="toggleDropdown"
      @keydown="onTriggerKeydown"
    >
      <span class="selection">
        <span
          class="select2-selection"
          :class="multiple ? 'select2-selection--multiple' : 'select2-selection--single'"
        >
          <span v-if="loading && !remoteSearch" class="select2-selection__placeholder"
            >Memuat…</span
          >

          <template v-else-if="multiple">
            <span v-if="selectedOptions.length" class="select2-selection__rendered">
              <span
                v-for="option in selectedOptions"
                :key="String(option.value)"
                class="select2-selection__choice"
              >
                <span>{{ option.label }}</span>
                <span
                  class="select2-selection__choice__remove"
                  role="button"
                  tabindex="-1"
                  :aria-label="`Hapus ${option.label}`"
                  @click.stop="removeValue(String(option.value))"
                  >×</span
                >
              </span>
            </span>
            <span v-else class="select2-selection__placeholder">{{ placeholder }}</span>
          </template>

          <span v-else class="select2-selection__rendered">
            <span v-if="selectedLabel">{{ selectedLabel }}</span>
            <span v-else class="select2-selection__placeholder">{{ placeholder }}</span>
          </span>

          <span
            v-if="clearable && hasValue && !disabled"
            class="select2-selection__clear"
            role="button"
            tabindex="-1"
            aria-label="Kosongkan pilihan"
            @click.stop="clearValue"
            >×</span
          >
          <span class="select2-selection__arrow" aria-hidden="true"><b></b></span>
        </span>
      </span>
    </button>
  </div>

  <Teleport to="body">
    <div
      v-if="isOpen"
      ref="dropdownRef"
      class="select2-dropdown select2-dropdown--aims"
      :style="dropdownStyle"
    >
      <div v-if="searchable" class="select2-search select2-search--dropdown">
        <input
          ref="searchRef"
          v-model="search"
          class="select2-search__field"
          type="search"
          autocomplete="off"
          placeholder="Cari pilihan…"
          aria-label="Cari pilihan"
          @keydown="onSearchKeydown"
        />
      </div>

      <div :id="`${selectId}-results`" class="select2-results" role="listbox">
        <ul class="select2-results__options">
          <li
            v-for="(option, index) in filteredOptions"
            :key="String(option.value)"
            class="select2-results__option"
            :class="{
              'select2-results__option--selected': isSelected(option),
              'select2-results__option--highlighted': highlightedIndex === index,
              'select2-results__option--disabled': option.disabled,
            }"
            :data-option-index="index"
            :aria-selected="isSelected(option)"
            :aria-disabled="option.disabled"
            role="option"
            @mouseenter="highlightedIndex = index"
            @click="choose(option)"
          >
            <span>{{ option.label }}</span>
            <span v-if="isSelected(option)" class="select2-results__check">✓</span>
          </li>
          <li
            v-if="loading && remoteSearch"
            class="select2-results__message select2-results__message--loading"
          >
            {{ resultsMessage }}
          </li>
          <li v-else-if="!filteredOptions.length" class="select2-results__message">
            {{ resultsMessage }}
          </li>
        </ul>
      </div>
    </div>
  </Teleport>
</template>
