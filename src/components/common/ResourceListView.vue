<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Plus, RefreshCw, Search } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { resources } from '@/config/resources'
import { apiClient } from '@/services/api-client'
import { errorMessage, normalizeList } from '@/utils/api'
import { useAuthStore } from '@/modules/auth/auth.store'

const props = defineProps<{ resourceKey: string }>()
const auth = useAuthStore()
const rows = ref<Record<string, unknown>[]>([])
const loading = ref(false)
const error = ref('')
const search = ref('')

const definition = computed(() => resources[props.resourceKey])
const filteredRows = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  if (!keyword) return rows.value
  return rows.value.filter((row) => JSON.stringify(row).toLowerCase().includes(keyword))
})
const columns = computed(() => {
  const row = filteredRows.value[0] ?? rows.value[0]
  if (!row) return []
  const preferred = Object.keys(row).filter((key) => !['deleted_at', 'password_hash'].includes(key))
  return preferred.slice(0, 7)
})

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Aktif' : 'Tidak'
  if (typeof value === 'object') return Array.isArray(value) ? `${value.length} data` : 'Detail'
  return String(value)
}

function humanize(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

async function load() {
  if (!definition.value) return
  loading.value = true
  error.value = ''
  try {
    const payload = await apiClient.get<unknown>(definition.value.endpoint, {
      page: 1,
      page_size: 50,
    })
    rows.value = normalizeList<Record<string, unknown>>(payload)
  } catch (cause) {
    rows.value = []
    error.value = errorMessage(cause, `Data ${definition.value.title} belum dapat dimuat.`)
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.resourceKey, load)
</script>

<template>
  <div v-if="definition" class="page-stack">
    <PageHeader :title="definition.title" :description="definition.description">
      <template
        v-if="definition.createPermission && auth.can(definition.createPermission)"
        #actions
      >
        <AppButton><Plus :size="17" /> Tambah {{ definition.title }}</AppButton>
      </template>
    </PageHeader>

    <div v-if="error" class="notice notice--warning">{{ error }}</div>

    <AppCard flush>
      <div class="table-toolbar">
        <label class="table-search">
          <Search :size="17" />
          <input v-model="search" type="search" placeholder="Cari pada data yang tampil…" />
        </label>
        <button
          class="icon-button"
          type="button"
          aria-label="Muat ulang"
          :disabled="loading"
          @click="load"
        >
          <RefreshCw :size="18" :class="{ spin: loading }" />
        </button>
      </div>

      <div v-if="loading" class="table-loading">
        <span v-for="item in 5" :key="item" class="skeleton skeleton--row"></span>
      </div>

      <div v-else-if="filteredRows.length" class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th v-for="column in columns" :key="column">{{ humanize(column) }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in filteredRows" :key="String(row.id ?? row.uuid ?? index)">
              <td v-for="column in columns" :key="column" :title="displayValue(row[column])">
                {{ displayValue(row[column]) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <EmptyState v-else :title="`Belum ada ${definition.title}`" />
    </AppCard>
  </div>
</template>
