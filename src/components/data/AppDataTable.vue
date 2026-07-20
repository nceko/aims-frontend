<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  RefreshCw,
  Search,
} from '@lucide/vue'
import AppSelect, { type SelectOption } from '@/components/ui/AppSelect.vue'

export type DataTableRow = Record<string, unknown>

export interface DataTableColumn {
  key: string
  label: string
  sortable?: boolean
  hideable?: boolean
  align?: 'left' | 'center' | 'right'
  width?: string
}

const props = withDefaults(
  defineProps<{
    rows: DataTableRow[]
    columns: DataTableColumn[]
    loading?: boolean
    search?: string
    page?: number
    perPage?: number
    total?: number
    hasMore?: boolean
    serverSide?: boolean
    searchable?: boolean
    showActions?: boolean
    rowKey?: string | ((row: DataTableRow, index: number) => string | number)
    searchPlaceholder?: string
    emptyTitle?: string
    emptyDescription?: string
  }>(),
  {
    loading: false,
    search: '',
    page: 1,
    perPage: 25,
    total: 0,
    hasMore: false,
    serverSide: false,
    searchable: true,
    showActions: false,
    rowKey: 'id',
    searchPlaceholder: 'Cari data…',
    emptyTitle: 'Belum ada data',
    emptyDescription: 'Data akan muncul setelah tersedia pada backend.',
  },
)

const emit = defineEmits<{
  'update:search': [value: string]
  'update:perPage': [value: number]
  'page-change': [page: number]
  refresh: []
  'row-click': [row: DataTableRow]
  'row-dblclick': [row: DataTableRow]
}>()

const sortKey = ref('')
const sortDirection = ref<'asc' | 'desc'>('asc')
const columnMenuOpen = ref(false)
const visibleColumnKeys = ref(new Set<string>())
const columnSignature = computed(() => props.columns.map((column) => column.key).join('|'))

const perPageOptions = computed<SelectOption[]>(() =>
  [10, 25, 50, 100].map((value) => ({ value, label: `${value} baris` })),
)

watch(
  columnSignature,
  () => {
    // Setiap modul dibuka dengan seluruh kolom aktif. Pilihan user tetap berlaku
    // selama daftar kolom modul yang sedang dibuka tidak berubah.
    visibleColumnKeys.value = new Set(props.columns.map((column) => column.key))
  },
  { immediate: true },
)

const visibleColumns = computed(() =>
  props.columns.filter(
    (column) => column.hideable === false || visibleColumnKeys.value.has(column.key),
  ),
)

function searchableValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const clientFilteredRows = computed(() => {
  if (props.serverSide) return props.rows
  const query = props.search.trim().toLowerCase()
  if (!query) return props.rows
  return props.rows.filter((row) =>
    props.columns.some((column) => searchableValue(row[column.key]).toLowerCase().includes(query)),
  )
})

function comparable(value: unknown): string | number {
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'string') {
    const timestamp = Date.parse(value)
    if (/^\d{4}-\d{2}-\d{2}/.test(value) && !Number.isNaN(timestamp)) return timestamp
    const numeric = Number(value)
    if (value.trim() !== '' && Number.isFinite(numeric)) return numeric
    return value.toLocaleLowerCase('id-ID')
  }
  return searchableValue(value).toLocaleLowerCase('id-ID')
}

const sortedRows = computed(() => {
  const rows = [...clientFilteredRows.value]
  if (!sortKey.value) return rows
  const direction = sortDirection.value === 'asc' ? 1 : -1
  return rows.sort((left, right) => {
    const a = comparable(left[sortKey.value])
    const b = comparable(right[sortKey.value])
    if (typeof a === 'number' && typeof b === 'number') return (a - b) * direction
    return String(a).localeCompare(String(b), 'id-ID', { numeric: true }) * direction
  })
})

const effectiveTotal = computed(() => (props.serverSide ? props.total : sortedRows.value.length))
const pageCount = computed(() => {
  if (effectiveTotal.value > 0) return Math.max(1, Math.ceil(effectiveTotal.value / props.perPage))
  if (props.serverSide) return Math.max(1, props.page + (props.hasMore ? 1 : 0))
  return 1
})
const displayRows = computed(() => {
  if (props.serverSide) return sortedRows.value
  const start = (props.page - 1) * props.perPage
  return sortedRows.value.slice(start, start + props.perPage)
})
const displayStart = computed(() =>
  effectiveTotal.value === 0 ? 0 : (props.page - 1) * props.perPage + 1,
)
const displayEnd = computed(() =>
  Math.min((props.page - 1) * props.perPage + displayRows.value.length, effectiveTotal.value),
)

function toggleSort(column: DataTableColumn): void {
  if (column.sortable === false) return
  if (sortKey.value !== column.key) {
    sortKey.value = column.key
    sortDirection.value = 'asc'
    return
  }
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
}

function toggleColumn(key: string): void {
  const next = new Set(visibleColumnKeys.value)
  if (next.has(key)) {
    if (next.size <= 1) return
    next.delete(key)
  } else {
    next.add(key)
  }
  visibleColumnKeys.value = next
}

function changePage(page: number): void {
  emit('page-change', Math.min(Math.max(1, page), pageCount.value))
}

function changePerPage(value?: string | string[]): void {
  const raw = Array.isArray(value) ? value[0] : value
  emit('update:perPage', Number(raw) || 25)
  emit('page-change', 1)
}

function resolveRowKey(row: DataTableRow, index: number): string | number {
  if (typeof props.rowKey === 'function') return props.rowKey(row, index)
  const value = row[props.rowKey]
  return typeof value === 'string' || typeof value === 'number' ? value : index
}
</script>

<template>
  <div class="datatable">
    <div class="datatable__toolbar">
      <label v-if="searchable" class="datatable__search">
        <Search :size="17" />
        <input
          :value="search"
          type="search"
          :placeholder="searchPlaceholder"
          @input="emit('update:search', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <div class="datatable__toolbar-actions">
        <div class="datatable__columns">
          <button
            class="datatable__tool-button"
            type="button"
            :aria-expanded="columnMenuOpen"
            @click="columnMenuOpen = !columnMenuOpen"
          >
            <Columns3 :size="17" /> Kolom <ChevronDown :size="14" />
          </button>
          <div v-if="columnMenuOpen" class="datatable__column-menu">
            <strong>Tampilkan kolom</strong>
            <label v-for="column in columns" :key="column.key">
              <input
                type="checkbox"
                :checked="visibleColumnKeys.has(column.key)"
                :disabled="column.hideable === false"
                @change="toggleColumn(column.key)"
              />
              <span>{{ column.label }}</span>
            </label>
          </div>
        </div>
        <AppSelect
          :model-value="String(perPage)"
          :options="perPageOptions"
          placeholder="Jumlah baris"
          compact
          :searchable="false"
          @update:model-value="changePerPage"
        />
        <button
          class="datatable__tool-button datatable__tool-button--icon"
          type="button"
          aria-label="Muat ulang data"
          :disabled="loading"
          @click="emit('refresh')"
        >
          <RefreshCw :size="17" :class="{ spin: loading }" />
        </button>
      </div>
    </div>

    <div v-if="loading" class="table-loading datatable__loading">
      <span v-for="item in 7" :key="item" class="skeleton skeleton--row"></span>
    </div>

    <div v-else-if="displayRows.length" class="table-responsive">
      <table class="data-table datatable__table">
        <thead>
          <tr>
            <th
              v-for="column in visibleColumns"
              :key="column.key"
              :style="{ width: column.width, textAlign: column.align || 'left' }"
            >
              <button
                class="datatable__sort"
                type="button"
                :disabled="column.sortable === false"
                @click="toggleSort(column)"
              >
                <span>{{ column.label }}</span>
                <ArrowUpAZ v-if="sortKey === column.key && sortDirection === 'asc'" :size="14" />
                <ArrowDownAZ
                  v-else-if="sortKey === column.key && sortDirection === 'desc'"
                  :size="14"
                />
              </button>
            </th>
            <th v-if="showActions" class="table-actions-column">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in displayRows"
            :key="resolveRowKey(row, index)"
            @click="emit('row-click', row)"
            @dblclick="emit('row-dblclick', row)"
          >
            <td
              v-for="column in visibleColumns"
              :key="column.key"
              :style="{ textAlign: column.align || 'left' }"
            >
              <slot name="cell" :row="row" :column="column" :value="row[column.key]">
                {{ row[column.key] ?? '—' }}
              </slot>
            </td>
            <td v-if="showActions" class="table-actions-column">
              <slot name="actions" :row="row" :index="index"></slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="datatable__empty">
      <slot name="empty">
        <div class="datatable__empty-icon"><Search :size="23" /></div>
        <strong>{{ emptyTitle }}</strong>
        <p>{{ emptyDescription }}</p>
      </slot>
    </div>

    <div v-if="displayRows.length || effectiveTotal" class="datatable__footer">
      <span v-if="effectiveTotal">
        Menampilkan {{ displayStart }}–{{ displayEnd }} dari {{ effectiveTotal }} data
      </span>
      <span v-else>Halaman {{ page }} · {{ displayRows.length }} data</span>
      <div class="datatable__pagination">
        <button type="button" :disabled="page <= 1" @click="changePage(page - 1)">
          <ChevronLeft :size="16" /> Sebelumnya
        </button>
        <span>Halaman {{ page }} dari {{ pageCount }}</span>
        <button type="button" :disabled="page >= pageCount" @click="changePage(page + 1)">
          Berikutnya <ChevronRight :size="16" />
        </button>
      </div>
    </div>
  </div>
</template>
