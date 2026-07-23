<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { apiClient } from '@/services/api-client'
import { normalizeList } from '@/utils/api'

interface OptionItem {
  value: number
  code: string
  name: string
  label: string
}
interface CompanyAccess {
  company_id: number
  is_default: boolean
  scope_mode: string
}

const props = withDefaults(
  defineProps<{
    modelValue: Record<string, unknown>
    disabled?: boolean
  }>(),
  { disabled: false },
)
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, unknown>] }>()

const loading = ref(false)
const error = ref('')
const companies = ref<OptionItem[]>([])
const locationOptions = reactive<Record<number, OptionItem[]>>({})
const categoryOptions = reactive<Record<number, OptionItem[]>>({})
const loadingCompany = reactive<Record<number, boolean>>({})

const selectedCompanies = computed<CompanyAccess[]>(() =>
  Array.isArray(props.modelValue.companies)
    ? (props.modelValue.companies as Record<string, unknown>[]).map((item) => ({
        company_id: Number(item.company_id),
        is_default: Boolean(item.is_default),
        scope_mode: String(item.scope_mode || 'LOCATION_TREE'),
      }))
    : [],
)
const selectedCompanyIDs = computed(
  () => new Set(selectedCompanies.value.map((item) => item.company_id)),
)
const selectedLocations = computed(() => new Set(arrayNumbers(props.modelValue.location_ids)))
const selectedCategories = computed(
  () => new Set(arrayNumbers(props.modelValue.category_group_ids)),
)

function arrayNumbers(value: unknown): number[] {
  return Array.isArray(value)
    ? value.map(Number).filter((item) => Number.isFinite(item) && item > 0)
    : []
}
function normalizeOptions(payload: unknown): OptionItem[] {
  return normalizeList<Record<string, unknown>>(payload)
    .map((row) => ({
      value: Number(row.value ?? row.id),
      code: String(row.code ?? ''),
      name: String(row.name ?? ''),
      label: String(row.label ?? row.name ?? row.code ?? ''),
    }))
    .filter((item) => Number.isFinite(item.value) && item.value > 0)
}
function patch(value: Partial<Record<string, unknown>>) {
  emit('update:modelValue', { ...props.modelValue, ...value })
}
function companyName(id: number): string {
  return companies.value.find((item) => item.value === id)?.label || `Perusahaan ${id}`
}
function toggleCompany(companyID: number, checked: boolean) {
  if (props.disabled) return
  let next = [...selectedCompanies.value]
  if (checked && !next.some((item) => item.company_id === companyID)) {
    next.push({ company_id: companyID, is_default: next.length === 0, scope_mode: 'LOCATION_TREE' })
  } else if (!checked) {
    next = next.filter((item) => item.company_id !== companyID)
    if (next.length && !next.some((item) => item.is_default)) next[0]!.is_default = true
    const removeLocations = new Set((locationOptions[companyID] ?? []).map((item) => item.value))
    const removeCategories = new Set((categoryOptions[companyID] ?? []).map((item) => item.value))
    patch({
      companies: next,
      location_ids: arrayNumbers(props.modelValue.location_ids).filter(
        (id) => !removeLocations.has(id),
      ),
      category_group_ids: arrayNumbers(props.modelValue.category_group_ids).filter(
        (id) => !removeCategories.has(id),
      ),
    })
    return
  }
  patch({ companies: next })
}
function setDefault(companyID: number) {
  patch({
    companies: selectedCompanies.value.map((item) => ({
      ...item,
      is_default: item.company_id === companyID,
    })),
  })
}
function setScope(companyID: number, scopeMode: string) {
  patch({
    companies: selectedCompanies.value.map((item) =>
      item.company_id === companyID ? { ...item, scope_mode: scopeMode } : item,
    ),
  })
}
function toggleArray(field: 'location_ids' | 'category_group_ids', id: number, checked: boolean) {
  const next = new Set(arrayNumbers(props.modelValue[field]))
  if (checked) next.add(id)
  else next.delete(id)
  patch({ [field]: [...next] })
}

async function loadCompanyOptions(companyID: number) {
  if (locationOptions[companyID] && categoryOptions[companyID]) return
  loadingCompany[companyID] = true
  try {
    const [locations, categories] = await Promise.all([
      apiClient.get<unknown>('/api/v1/locations/options', { company_id: companyID }),
      apiClient.get<unknown>('/api/v1/category-groups/options', { company_id: companyID }),
    ])
    locationOptions[companyID] = normalizeOptions(locations)
    categoryOptions[companyID] = normalizeOptions(categories)
  } catch {
    locationOptions[companyID] = []
    categoryOptions[companyID] = []
    error.value = `Pilihan lokasi atau kelompok kategori untuk ${companyName(companyID)} tidak dapat dimuat.`
  } finally {
    loadingCompany[companyID] = false
  }
}
async function load() {
  loading.value = true
  error.value = ''
  try {
    companies.value = normalizeOptions(await apiClient.get<unknown>('/api/v1/companies/options'))
    await Promise.all(selectedCompanies.value.map((item) => loadCompanyOptions(item.company_id)))
  } catch {
    error.value = 'Pilihan akses perusahaan tidak dapat dimuat.'
  } finally {
    loading.value = false
  }
}

watch(
  () => selectedCompanies.value.map((item) => item.company_id).join(','),
  () => {
    for (const item of selectedCompanies.value) void loadCompanyOptions(item.company_id)
  },
)
onMounted(load)
</script>

<template>
  <div class="access-editor">
    <div v-if="error" class="notice notice--warning">{{ error }}</div>
    <section class="access-section">
      <header>
        <h3>Perusahaan yang Dapat Diakses</h3>
        <p>Pilih perusahaan terlebih dahulu. Tepat satu perusahaan harus menjadi default.</p>
      </header>
      <div v-if="loading" class="access-loading">Memuat perusahaan...</div>
      <div v-else class="company-checks">
        <label v-for="company in companies" :key="company.value" class="check-card">
          <input
            type="checkbox"
            :checked="selectedCompanyIDs.has(company.value)"
            :disabled="disabled"
            @change="toggleCompany(company.value, ($event.target as HTMLInputElement).checked)"
          />
          <span
            ><strong>{{ company.name || company.label }}</strong
            ><small>{{ company.code }}</small></span
          >
        </label>
      </div>
    </section>

    <section
      v-for="access in selectedCompanies"
      :key="access.company_id"
      class="access-section access-company"
    >
      <header class="access-company__header">
        <div>
          <h3>{{ companyName(access.company_id) }}</h3>
          <p>Atur default, cakupan lokasi, dan kelompok kategori.</p>
        </div>
        <label class="default-radio">
          <input
            type="radio"
            name="default-company"
            :checked="access.is_default"
            :disabled="disabled"
            @change="setDefault(access.company_id)"
          />
          Perusahaan Default
        </label>
      </header>
      <label class="scope-field">
        <span>Cakupan Lokasi</span>
        <select
          :value="access.scope_mode"
          :disabled="disabled"
          @change="setScope(access.company_id, ($event.target as HTMLSelectElement).value)"
        >
          <option value="LOCATION_TREE">Lokasi terpilih dan seluruh turunannya</option>
          <option value="COMPANY">Satu lokasi aktif, dapat berpindah lokasi</option>
        </select>
      </label>

      <div v-if="loadingCompany[access.company_id]" class="access-loading">
        Memuat lokasi dan kelompok kategori...
      </div>
      <div v-else class="access-columns">
        <div>
          <strong>Lokasi</strong>
          <p>Pilih lokasi yang dapat digunakan saat berpindah konteks.</p>
          <div class="option-checks">
            <label v-for="item in locationOptions[access.company_id] || []" :key="item.value">
              <input
                type="checkbox"
                :checked="selectedLocations.has(item.value)"
                :disabled="disabled"
                @change="
                  toggleArray(
                    'location_ids',
                    item.value,
                    ($event.target as HTMLInputElement).checked,
                  )
                "
              />
              <span
                ><strong>{{ item.name || item.label }}</strong
                ><small>{{ item.code }}</small></span
              >
            </label>
            <small v-if="!(locationOptions[access.company_id] || []).length"
              >Tidak ada lokasi aktif.</small
            >
          </div>
        </div>
        <div>
          <strong>Kelompok Kategori</strong>
          <p>Pilih kelompok kategori yang boleh digunakan.</p>
          <div class="option-checks">
            <label v-for="item in categoryOptions[access.company_id] || []" :key="item.value">
              <input
                type="checkbox"
                :checked="selectedCategories.has(item.value)"
                :disabled="disabled"
                @change="
                  toggleArray(
                    'category_group_ids',
                    item.value,
                    ($event.target as HTMLInputElement).checked,
                  )
                "
              />
              <span
                ><strong>{{ item.name || item.label }}</strong
                ><small>{{ item.code }}</small></span
              >
            </label>
            <small v-if="!(categoryOptions[access.company_id] || []).length"
              >Tidak ada kelompok kategori aktif.</small
            >
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.access-editor {
  display: grid;
  gap: 14px;
}
.access-section {
  padding: 14px;
  border: 1px solid var(--aims-border);
  border-radius: 13px;
  background: var(--aims-bg);
}
.access-section header h3 {
  margin: 0;
  font-size: 14px;
  color: var(--aims-secondary);
}
.access-section header p,
.access-columns p {
  margin: 3px 0 0;
  color: var(--aims-muted);
  font-size: 11px;
}
.company-checks {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}
.check-card,
.option-checks label {
  display: flex;
  gap: 9px;
  align-items: flex-start;
  padding: 10px;
  border: 1px solid var(--aims-border);
  border-radius: 10px;
  background: var(--aims-card);
}
.check-card input,
.option-checks input,
.default-radio input {
  margin-top: 3px;
  accent-color: var(--aims-primary);
}
.check-card span,
.option-checks span {
  display: grid;
  gap: 2px;
}
.check-card strong,
.option-checks strong {
  font-size: 12px;
}
.check-card small,
.option-checks small {
  color: var(--aims-muted);
  font-size: 10px;
}
.access-company__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.default-radio {
  font-size: 11px;
  white-space: nowrap;
}
.scope-field {
  display: grid;
  gap: 5px;
  max-width: 420px;
  margin-top: 12px;
  font-size: 11px;
  font-weight: 700;
}
.scope-field select {
  min-height: 40px;
  padding: 0 10px;
  border: 1px solid var(--aims-border);
  border-radius: 9px;
  background: var(--aims-card);
  color: inherit;
}
.access-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}
.option-checks {
  display: grid;
  gap: 6px;
  max-height: 250px;
  margin-top: 8px;
  overflow: auto;
}
.access-loading {
  padding: 18px;
  text-align: center;
  color: var(--aims-muted);
}
@media (max-width: 760px) {
  .company-checks,
  .access-columns {
    grid-template-columns: 1fr;
  }
  .access-company__header {
    flex-direction: column;
  }
}
</style>
