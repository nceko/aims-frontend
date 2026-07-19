<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Search } from '@lucide/vue'
import StatusBadge from './StatusBadge.vue'
import {
  detailFieldLabel,
  displayablePrimitiveKeys,
  extractRelatedRows,
  formatDetailValue,
  statusField,
} from '@/utils/detail-display'

const props = withDefaults(
  defineProps<{
    value: unknown
    title?: string
    emptyText?: string
    pageSize?: number
  }>(),
  {
    title: 'Data Terkait',
    emptyText: 'Belum ada data terkait.',
    pageSize: 10,
  },
)

const search = ref('')
const page = ref(1)
const rows = computed(() => extractRelatedRows(props.value))
const columns = computed(() => displayablePrimitiveKeys(rows.value))
const filteredRows = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('id-ID')
  if (!keyword) return rows.value
  return rows.value.filter((row) =>
    columns.value.some((key) =>
      formatDetailValue(row[key]).toLocaleLowerCase('id-ID').includes(keyword),
    ),
  )
})
const pageCount = computed(() =>
  Math.max(1, Math.ceil(filteredRows.value.length / Math.max(1, props.pageSize))),
)
const visibleRows = computed(() => {
  const start = (page.value - 1) * props.pageSize
  return filteredRows.value.slice(start, start + props.pageSize)
})

watch(search, () => {
  page.value = 1
})
watch(
  () => props.value,
  () => {
    search.value = ''
    page.value = 1
  },
  { deep: true },
)
watch(pageCount, (count) => {
  if (page.value > count) page.value = count
})
</script>

<template>
  <section class="related-data-table">
    <header class="related-data-table__header">
      <div>
        <h3>{{ title }}</h3>
        <p>{{ filteredRows.length }} dari {{ rows.length }} data ditampilkan.</p>
      </div>
      <label v-if="rows.length > 4" class="related-data-table__search">
        <Search :size="16" />
        <input v-model="search" type="search" :placeholder="`Cari ${title.toLowerCase()}...`" />
      </label>
    </header>

    <div v-if="visibleRows.length && columns.length" class="related-data-table__table-wrap">
      <table class="related-data-table__table">
        <thead>
          <tr>
            <th v-for="column in columns" :key="column">{{ detailFieldLabel(column) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in visibleRows" :key="rowIndex">
            <td v-for="column in columns" :key="column">
              <StatusBadge v-if="statusField(column)" :value="row[column]" />
              <template v-else>{{ formatDetailValue(row[column]) }}</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="related-data-table__empty">
      {{ rows.length ? 'Tidak ada data yang cocok dengan pencarian.' : emptyText }}
    </div>

    <footer v-if="pageCount > 1" class="related-data-table__pagination">
      <button type="button" :disabled="page <= 1" @click="page--">Sebelumnya</button>
      <span>Halaman {{ page }} dari {{ pageCount }}</span>
      <button type="button" :disabled="page >= pageCount" @click="page++">Berikutnya</button>
    </footer>
  </section>
</template>
