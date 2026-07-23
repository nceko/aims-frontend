<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Search } from '@lucide/vue'
import { apiClient } from '@/services/api-client'
import { normalizeList } from '@/utils/api'

interface PermissionOption {
  value: string
  code: string
  name: string
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue: unknown
    disabled?: boolean
  }>(),
  { disabled: false },
)
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const loading = ref(false)
const error = ref('')
const search = ref('')
const options = ref<PermissionOption[]>([])

const moduleLabels: Record<string, string> = {
  approvals: 'Persetujuan',
  auth: 'Administrasi & Pengguna',
  catalog: 'Katalog',
  dashboard: 'Dasbor',
  inventory: 'Persediaan & Aset',
  maintenance: 'Pemeliharaan Sistem',
  operations: 'Operasional',
  organization: 'Organisasi',
  reports: 'Laporan',
  transaction: 'Transaksi',
  warehouse: 'Gudang',
  warehouses: 'Gudang (Legacy)',
}

const selected = computed(
  () => new Set(Array.isArray(props.modelValue) ? props.modelValue.map(String) : []),
)
const filtered = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('id-ID')
  if (!term) return options.value
  return options.value.filter((item) =>
    `${item.code} ${item.name} ${item.label}`.toLocaleLowerCase('id-ID').includes(term),
  )
})
const groups = computed(() => {
  const result = new Map<string, PermissionOption[]>()
  for (const item of filtered.value) {
    const module = item.code.split('.')[0] || 'other'
    result.set(module, [...(result.get(module) ?? []), item])
  }
  return [...result.entries()].map(([module, items]) => ({
    module,
    title: moduleLabels[module] ?? module.replaceAll('_', ' '),
    items,
  }))
})

function selectedValues(): string[] {
  return Array.isArray(props.modelValue) ? props.modelValue.map(String) : []
}

function updatePermission(value: string, checked: boolean) {
  if (props.disabled) return
  const next = new Set(selectedValues())
  if (checked) next.add(value)
  else next.delete(value)
  const dashboard = options.value.find((item) => item.code === 'dashboard.read')
  if (dashboard) next.add(dashboard.value)
  emit('update:modelValue', [...next])
}

function setVisible(checked: boolean) {
  if (props.disabled) return
  const next = new Set(selectedValues())
  for (const item of filtered.value) {
    if (checked) next.add(item.value)
    else if (item.code !== 'dashboard.read') next.delete(item.value)
  }
  const dashboard = options.value.find((item) => item.code === 'dashboard.read')
  if (dashboard) next.add(dashboard.value)
  emit('update:modelValue', [...next])
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const payload = await apiClient.get<unknown>('/api/v1/permissions/options')
    options.value = normalizeList<Record<string, unknown>>(payload)
      .map((row) => ({
        value: String(row.value ?? row.id ?? ''),
        code: String(row.code ?? ''),
        name: String(row.name ?? ''),
        label: String(row.label ?? row.name ?? row.code ?? ''),
      }))
      .filter((item) => item.value && item.code)
      .sort((left, right) => left.code.localeCompare(right.code))

    const dashboard = options.value.find((item) => item.code === 'dashboard.read')
    if (dashboard && !selected.value.has(dashboard.value)) {
      emit('update:modelValue', [...selectedValues(), dashboard.value])
    }
  } catch {
    error.value = 'Daftar izin tidak dapat dimuat.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="permission-picker">
    <div class="permission-picker__toolbar">
      <label class="permission-picker__search">
        <Search :size="16" />
        <input v-model="search" type="search" placeholder="Cari kode atau nama izin..." />
      </label>
      <div class="permission-picker__actions">
        <button type="button" :disabled="disabled || loading" @click="setVisible(true)">
          Pilih yang tampil
        </button>
        <button type="button" :disabled="disabled || loading" @click="setVisible(false)">
          Kosongkan yang tampil
        </button>
      </div>
    </div>

    <p class="permission-picker__summary">
      {{ selected.size }} dari {{ options.length }} izin dipilih.
      <span>Izin Dasbor wajib untuk setiap peran.</span>
    </p>
    <div v-if="error" class="notice notice--warning">{{ error }}</div>
    <div v-if="loading" class="permission-picker__loading">Memuat daftar izin...</div>

    <div v-else class="permission-picker__groups">
      <section v-for="group in groups" :key="group.module" class="permission-group">
        <header>
          <strong>{{ group.title }}</strong>
          <span
            >{{ group.items.filter((item) => selected.has(item.value)).length }}/{{
              group.items.length
            }}</span
          >
        </header>
        <div class="permission-group__grid">
          <label v-for="item in group.items" :key="item.value" class="permission-option">
            <input
              type="checkbox"
              :checked="selected.has(item.value)"
              :disabled="disabled || item.code === 'dashboard.read'"
              @change="updatePermission(item.value, ($event.target as HTMLInputElement).checked)"
            />
            <span>
              <strong>{{ item.name || item.code }}</strong>
              <small>{{ item.code }}</small>
            </span>
          </label>
        </div>
      </section>
      <p v-if="!groups.length" class="permission-picker__empty">Izin tidak ditemukan.</p>
    </div>
  </div>
</template>

<style scoped>
.permission-picker {
  display: grid;
  gap: 12px;
}
.permission-picker__toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}
.permission-picker__search {
  min-width: 280px;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid var(--aims-border);
  border-radius: 10px;
  background: var(--aims-card);
}
.permission-picker__search input {
  width: 100%;
  min-height: 40px;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
}
.permission-picker__actions {
  display: flex;
  gap: 8px;
}
.permission-picker__actions button {
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid var(--aims-border);
  border-radius: 9px;
  background: var(--aims-card);
  color: inherit;
  cursor: pointer;
}
.permission-picker__summary {
  margin: 0;
  color: var(--aims-muted);
  font-size: 12px;
}
.permission-picker__summary span {
  margin-left: 8px;
  color: var(--aims-primary);
}
.permission-picker__groups {
  display: grid;
  grid-auto-rows: max-content;
  align-content: start;
  gap: 12px;
  max-height: min(58vh, 720px);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  padding-right: 6px;
}
.permission-group {
  height: max-content;
  align-self: start;
  border: 1px solid var(--aims-border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--aims-card);
}
.permission-group > header {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--aims-bg);
}
.permission-group > header span {
  color: var(--aims-muted);
  font-size: 12px;
}
.permission-group__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  background: var(--aims-border);
}
.permission-option {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 10px 12px;
  background: var(--aims-card);
  cursor: pointer;
}
.permission-option input {
  margin-top: 3px;
  accent-color: var(--aims-primary);
}
.permission-option span {
  min-width: 0;
  display: grid;
  gap: 2px;
}
.permission-option strong {
  font-size: 12px;
  overflow-wrap: anywhere;
}
.permission-option small {
  color: var(--aims-muted);
  font-size: 10px;
  overflow-wrap: anywhere;
}
.permission-picker__loading,
.permission-picker__empty {
  padding: 20px;
  text-align: center;
  color: var(--aims-muted);
}
@media (max-width: 760px) {
  .permission-picker__toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .permission-picker__search {
    min-width: 0;
  }
  .permission-group__grid {
    grid-template-columns: 1fr;
  }
}
</style>
