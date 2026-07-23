<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { apiClient } from '@/services/api-client'
import { errorMessage, normalizeList } from '@/utils/api'

interface OptionItem<T extends string | number = number> {
  value: T
  code: string
  name: string
  label: string
}
interface CategoryAccess {
  category_group_id: number
  is_default: boolean
  role_ids: string[]
}
interface CompanyAccess {
  company_id: number
  is_default: boolean
  scope_mode: string
  location_ids: number[]
  category_groups: CategoryAccess[]
}

const props = withDefaults(
  defineProps<{ modelValue: Record<string, unknown>; disabled?: boolean }>(),
  { disabled: false },
)
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, unknown>] }>()

const loading = ref(false)
const error = ref('')
const companies = ref<OptionItem<number>[]>([])
const roles = ref<OptionItem<string>[]>([])
const locationOptions = reactive<Record<number, OptionItem<number>[]>>({})
const categoryOptions = reactive<Record<number, OptionItem<number>[]>>({})
const loadingCompany = reactive<Record<number, boolean>>({})
const companyErrors = reactive<Record<number, string>>({})
const locationSearch = reactive<Record<number, string>>({})

function numberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.map(Number).filter((item) => Number.isFinite(item) && item > 0)
    : []
}
function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}
function normalizeNumericOptions(payload: unknown): OptionItem<number>[] {
  return normalizeList<Record<string, unknown>>(payload)
    .map((row) => ({
      value: Number(row.value ?? row.id),
      code: String(row.code ?? ''),
      name: String(row.name ?? ''),
      label: String(row.label ?? row.name ?? row.code ?? ''),
    }))
    .filter((item) => Number.isFinite(item.value) && item.value > 0)
}
function normalizeRoleOptions(payload: unknown): OptionItem<string>[] {
  return normalizeList<Record<string, unknown>>(payload)
    .map((row) => ({
      value: String(row.value ?? row.id ?? ''),
      code: String(row.code ?? ''),
      name: String(row.name ?? ''),
      label: String(row.label ?? row.name ?? row.code ?? ''),
    }))
    .filter((item) => Boolean(item.value))
}
function normalizeGroups(value: unknown): CategoryAccess[] {
  if (!Array.isArray(value)) return []
  return value.map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>
    const rawRoles = Array.isArray(item.role_ids)
      ? item.role_ids
      : Array.isArray(item.roles)
        ? item.roles.map((role) => (role as Record<string, unknown>).role_id)
        : []
    return {
      category_group_id: Number(item.category_group_id),
      is_default: Boolean(item.is_default),
      role_ids: stringArray(rawRoles),
    }
  })
}

const selectedCompanies = computed<CompanyAccess[]>(() => {
  if (!Array.isArray(props.modelValue.companies)) return []
  return (props.modelValue.companies as Record<string, unknown>[]).map((item) => ({
    company_id: Number(item.company_id),
    is_default: Boolean(item.is_default),
    scope_mode: String(item.scope_mode || 'LOCATION_TREE'),
    location_ids: numberArray(item.location_ids),
    category_groups: normalizeGroups(item.category_groups),
  }))
})
const selectedCompanyIDs = computed(
  () => new Set(selectedCompanies.value.map((item) => item.company_id)),
)
const systemRoleIDs = computed(() => new Set(stringArray(props.modelValue.system_role_ids)))
const systemRoles = computed(() =>
  roles.value.filter((role) => ['SUPER_ADMIN', 'SUPERADMIN'].includes(role.code.toUpperCase())),
)
const contextualRoles = computed(() =>
  roles.value.filter((role) => !['SUPER_ADMIN', 'SUPERADMIN'].includes(role.code.toUpperCase())),
)

function patch(value: Partial<Record<string, unknown>>) {
  emit('update:modelValue', { ...props.modelValue, ...value })
}
function updateCompanies(companiesValue: CompanyAccess[]) {
  patch({ companies: companiesValue })
}
function companyName(id: number): string {
  return companies.value.find((item) => item.value === id)?.label || `Perusahaan ${id}`
}
function companyByID(id: number): CompanyAccess | undefined {
  return selectedCompanies.value.find((item) => item.company_id === id)
}
function updateCompany(companyID: number, updater: (value: CompanyAccess) => CompanyAccess) {
  updateCompanies(
    selectedCompanies.value.map((company) =>
      company.company_id === companyID ? updater(company) : company,
    ),
  )
}
function toggleCompany(companyID: number, checked: boolean) {
  if (props.disabled) return
  const current = [...selectedCompanies.value]
  if (checked && !current.some((item) => item.company_id === companyID)) {
    current.push({
      company_id: companyID,
      is_default: current.length === 0,
      scope_mode: 'LOCATION_TREE',
      location_ids: [],
      category_groups: [],
    })
  } else if (!checked) {
    const next = current.filter((item) => item.company_id !== companyID)
    if (next.length && !next.some((item) => item.is_default)) next[0]!.is_default = true
    updateCompanies(next)
    return
  }
  updateCompanies(current)
}
function setDefaultCompany(companyID: number) {
  updateCompanies(
    selectedCompanies.value.map((company) => ({
      ...company,
      is_default: company.company_id === companyID,
    })),
  )
}
function setScope(companyID: number, scopeMode: string) {
  updateCompany(companyID, (company) => ({ ...company, scope_mode: scopeMode }))
}
function toggleLocation(companyID: number, locationID: number, checked: boolean) {
  updateCompany(companyID, (company) => {
    const selected = new Set(company.location_ids)
    if (checked) selected.add(locationID)
    else selected.delete(locationID)
    return { ...company, location_ids: [...selected] }
  })
}
function filteredLocationOptions(companyID: number): OptionItem<number>[] {
  const options = locationOptions[companyID] || []
  const keyword = String(locationSearch[companyID] || '')
    .trim()
    .toLocaleLowerCase('id-ID')
  if (!keyword) return options
  return options.filter((item) =>
    [item.code, item.name, item.label].some((value) =>
      value.toLocaleLowerCase('id-ID').includes(keyword),
    ),
  )
}
function selectVisibleLocations(companyID: number) {
  if (props.disabled) return
  const visibleIDs = filteredLocationOptions(companyID).map((item) => item.value)
  updateCompany(companyID, (company) => ({
    ...company,
    location_ids: [...new Set([...company.location_ids, ...visibleIDs])],
  }))
}
function clearLocations(companyID: number) {
  if (props.disabled) return
  updateCompany(companyID, (company) => ({ ...company, location_ids: [] }))
}
function toggleCategory(companyID: number, categoryGroupID: number, checked: boolean) {
  updateCompany(companyID, (company) => {
    let groups = [...company.category_groups]
    if (checked && !groups.some((group) => group.category_group_id === categoryGroupID)) {
      groups.push({
        category_group_id: categoryGroupID,
        is_default: groups.length === 0,
        role_ids: [],
      })
    } else if (!checked) {
      groups = groups.filter((group) => group.category_group_id !== categoryGroupID)
      if (groups.length && !groups.some((group) => group.is_default)) groups[0]!.is_default = true
    }
    return { ...company, category_groups: groups }
  })
}
function setDefaultCategory(companyID: number, categoryGroupID: number) {
  updateCompany(companyID, (company) => ({
    ...company,
    category_groups: company.category_groups.map((group) => ({
      ...group,
      is_default: group.category_group_id === categoryGroupID,
    })),
  }))
}
function toggleContextRole(
  companyID: number,
  categoryGroupID: number,
  roleID: string,
  checked: boolean,
) {
  updateCompany(companyID, (company) => ({
    ...company,
    category_groups: company.category_groups.map((group) => {
      if (group.category_group_id !== categoryGroupID) return group
      const selected = new Set(group.role_ids)
      if (checked) selected.add(roleID)
      else selected.delete(roleID)
      return { ...group, role_ids: [...selected] }
    }),
  }))
}
function toggleSystemRole(roleID: string, checked: boolean) {
  const selected = new Set(systemRoleIDs.value)
  if (checked) selected.add(roleID)
  else selected.delete(roleID)
  patch({ system_role_ids: [...selected] })
}
function groupSelected(companyID: number, categoryID: number): CategoryAccess | undefined {
  return companyByID(companyID)?.category_groups.find(
    (group) => group.category_group_id === categoryID,
  )
}

function hasCompanyOptions(companyID: number): boolean {
  return (
    Object.prototype.hasOwnProperty.call(locationOptions, companyID) &&
    Object.prototype.hasOwnProperty.call(categoryOptions, companyID)
  )
}
async function loadCompanyOptions(companyID: number, force = false) {
  if (loadingCompany[companyID]) return
  if (!force && hasCompanyOptions(companyID)) return

  loadingCompany[companyID] = true
  delete companyErrors[companyID]
  try {
    const payload = await apiClient.get<Record<string, unknown>>('/api/v1/user-access/options', {
      company_id: companyID,
    })
    locationOptions[companyID] = normalizeNumericOptions(payload.locations)
    categoryOptions[companyID] = normalizeNumericOptions(payload.category_groups)
  } catch (cause) {
    // Jangan cache kegagalan sebagai array kosong. User dapat mencoba ulang
    // setelah gangguan backend, rate-limit, atau deployment selesai.
    delete locationOptions[companyID]
    delete categoryOptions[companyID]
    companyErrors[companyID] = errorMessage(
      cause,
      `Pilihan konteks ${companyName(companyID)} tidak dapat dimuat.`,
    )
  } finally {
    loadingCompany[companyID] = false
  }
}
async function load() {
  loading.value = true
  error.value = ''
  try {
    const [companyPayload, rolePayload] = await Promise.all([
      apiClient.get<unknown>('/api/v1/companies/options'),
      apiClient.get<unknown>('/api/v1/roles/options'),
    ])
    companies.value = normalizeNumericOptions(companyPayload)
    roles.value = normalizeRoleOptions(rolePayload)
    // Hindari lonjakan request saat seorang user memiliki banyak company.
    for (const item of selectedCompanies.value) {
      await loadCompanyOptions(item.company_id)
    }
  } catch (cause) {
    error.value = errorMessage(cause, 'Pilihan perusahaan atau peran tidak dapat dimuat.')
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
        <h3>Role Sistem</h3>
        <p>Role ini berlaku di seluruh konteks. Saat ini hanya SUPER_ADMIN.</p>
      </header>
      <div class="compact-checks">
        <label v-for="role in systemRoles" :key="role.value" class="check-card">
          <input
            type="checkbox"
            :checked="systemRoleIDs.has(role.value)"
            :disabled="disabled"
            @change="toggleSystemRole(role.value, ($event.target as HTMLInputElement).checked)"
          />
          <span
            ><strong>{{ role.name }}</strong
            ><small>{{ role.code }}</small></span
          >
        </label>
        <small v-if="!systemRoles.length && !loading">Role sistem tidak ditemukan.</small>
      </div>
    </section>

    <section class="access-section">
      <header>
        <h3>Perusahaan yang Dapat Diakses</h3>
        <p>Pilih perusahaan. Tepat satu perusahaan ditandai sebagai konteks awal.</p>
      </header>
      <div v-if="loading" class="access-loading">Memuat data akses...</div>
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
      <header class="company-header">
        <div>
          <h3>{{ companyName(access.company_id) }}</h3>
          <p>Lokasi menentukan data; kelompok kategori menentukan peran.</p>
        </div>
        <label class="default-radio">
          <input
            type="radio"
            name="default-company"
            :checked="access.is_default"
            :disabled="disabled"
            @change="setDefaultCompany(access.company_id)"
          />
          Default
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
          <option value="COMPANY">Dapat berpindah satu lokasi dalam perusahaan</option>
        </select>
      </label>

      <div v-if="companyErrors[access.company_id]" class="context-error notice notice--warning">
        <span>{{ companyErrors[access.company_id] }}</span>
        <button
          type="button"
          :disabled="disabled || loadingCompany[access.company_id]"
          @click="loadCompanyOptions(access.company_id, true)"
        >
          Coba lagi
        </button>
      </div>
      <div v-else-if="loadingCompany[access.company_id]" class="access-loading">
        Memuat konteks...
      </div>
      <div v-else class="company-content">
        <div class="subsection">
          <div class="subsection__heading">
            <strong>Lokasi</strong><small>Pilih lokasi yang boleh digunakan.</small>
          </div>

          <div class="location-toolbar">
            <label class="location-search">
              <span>Cari lokasi</span>
              <input
                v-model="locationSearch[access.company_id]"
                type="search"
                placeholder="Cari nama atau kode lokasi..."
                autocomplete="off"
              />
            </label>
            <div class="location-summary">
              <strong>{{ access.location_ids.length }} dipilih</strong>
              <small>
                {{ filteredLocationOptions(access.company_id).length }} dari
                {{ (locationOptions[access.company_id] || []).length }} lokasi ditampilkan
              </small>
            </div>
          </div>

          <div class="location-actions">
            <button
              type="button"
              :disabled="
                disabled ||
                loadingCompany[access.company_id] ||
                !filteredLocationOptions(access.company_id).length
              "
              @click="selectVisibleLocations(access.company_id)"
            >
              Pilih yang tampil
            </button>
            <button
              type="button"
              :disabled="disabled || !access.location_ids.length"
              @click="clearLocations(access.company_id)"
            >
              Kosongkan pilihan
            </button>
          </div>

          <div class="option-grid location-options">
            <label v-for="item in filteredLocationOptions(access.company_id)" :key="item.value">
              <input
                type="checkbox"
                :checked="access.location_ids.includes(item.value)"
                :disabled="disabled"
                @change="
                  toggleLocation(
                    access.company_id,
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
            <small v-if="!filteredLocationOptions(access.company_id).length" class="empty-option">
              {{
                locationSearch[access.company_id]
                  ? 'Lokasi dengan nama atau kode tersebut tidak ditemukan.'
                  : 'Belum ada lokasi aktif pada perusahaan ini.'
              }}
            </small>
          </div>
        </div>

        <div class="subsection">
          <div class="subsection__heading">
            <strong>Kelompok Kategori & Peran</strong>
            <small>Peran dapat berbeda pada setiap kelompok kategori.</small>
          </div>
          <div class="category-list">
            <article v-for="item in categoryOptions[access.company_id] || []" :key="item.value">
              <div class="category-row">
                <label>
                  <input
                    type="checkbox"
                    :checked="Boolean(groupSelected(access.company_id, item.value))"
                    :disabled="disabled"
                    @change="
                      toggleCategory(
                        access.company_id,
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
                <label v-if="groupSelected(access.company_id, item.value)" class="default-radio">
                  <input
                    type="radio"
                    :name="`default-category-${access.company_id}`"
                    :checked="groupSelected(access.company_id, item.value)?.is_default"
                    :disabled="disabled"
                    @change="setDefaultCategory(access.company_id, item.value)"
                  />
                  Default
                </label>
              </div>
              <div v-if="groupSelected(access.company_id, item.value)" class="role-grid">
                <label v-for="role in contextualRoles" :key="role.value">
                  <input
                    type="checkbox"
                    :checked="
                      groupSelected(access.company_id, item.value)?.role_ids.includes(role.value)
                    "
                    :disabled="disabled"
                    @change="
                      toggleContextRole(
                        access.company_id,
                        item.value,
                        role.value,
                        ($event.target as HTMLInputElement).checked,
                      )
                    "
                  />
                  <span
                    ><strong>{{ role.name }}</strong
                    ><small>{{ role.code }}</small></span
                  >
                </label>
              </div>
            </article>
            <small v-if="!(categoryOptions[access.company_id] || []).length" class="empty-option">
              Belum ada kelompok kategori aktif pada perusahaan ini.
            </small>
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
  border-radius: 14px;
  background: var(--aims-bg);
}
.access-section header h3 {
  margin: 0;
  font-size: 14px;
  color: var(--aims-secondary);
}
.access-section header p {
  margin: 3px 0 0;
  color: var(--aims-muted);
  font-size: 11px;
}
.company-checks,
.compact-checks,
.option-grid,
.role-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}
.check-card,
.option-grid label,
.role-grid label {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 9px 10px;
  border: 1px solid var(--aims-border);
  border-radius: 10px;
  background: var(--aims-card);
}
input {
  accent-color: var(--aims-primary);
}
.check-card span,
.option-grid span,
.role-grid span,
.category-row span {
  display: grid;
  gap: 2px;
}
strong {
  font-size: 12px;
}
small {
  color: var(--aims-muted);
  font-size: 10px;
}
.company-header,
.category-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}
.default-radio {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 700;
}
.scope-field {
  display: grid;
  gap: 5px;
  max-width: 460px;
  margin-top: 12px;
  font-size: 11px;
  font-weight: 700;
}
.scope-field select {
  min-height: 40px;
  padding: 0 10px;
  border: 1px solid var(--aims-border);
  border-radius: 10px;
  background: var(--aims-card);
  color: inherit;
}
.company-content {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}
.subsection {
  padding-top: 12px;
  border-top: 1px solid var(--aims-border);
}
.subsection__heading {
  display: grid;
  gap: 2px;
}
.location-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
  margin-top: 10px;
}
.location-search {
  display: grid;
  gap: 5px;
  max-width: 460px;
  font-size: 11px;
  font-weight: 700;
}
.location-search input {
  width: 100%;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid var(--aims-border);
  border-radius: 10px;
  outline: none;
  background: var(--aims-card);
  color: inherit;
}
.location-search input:focus {
  border-color: var(--aims-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--aims-primary) 12%, transparent);
}
.location-summary {
  display: grid;
  gap: 2px;
  min-width: 150px;
  padding-bottom: 5px;
  text-align: right;
}
.location-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 9px;
}
.location-actions button {
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid var(--aims-border);
  border-radius: 8px;
  background: var(--aims-card);
  color: var(--aims-secondary);
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
}
.location-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.location-options {
  max-height: 290px;
  padding: 3px 7px 3px 3px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}
.category-list {
  display: grid;
  gap: 9px;
  margin-top: 10px;
}
.category-list article {
  padding: 11px;
  border: 1px solid var(--aims-border);
  border-radius: 11px;
  background: var(--aims-card);
}
.category-row > label:first-child {
  display: flex;
  gap: 9px;
  align-items: flex-start;
}
.role-grid {
  padding-left: 25px;
}
.access-loading {
  padding: 14px 0;
  color: var(--aims-muted);
  font-size: 12px;
}
.context-error {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-top: 12px;
}
.context-error button {
  flex: 0 0 auto;
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid currentColor;
  border-radius: 9px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-weight: 700;
}
.context-error button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.empty-option {
  grid-column: 1 / -1;
  padding: 10px 2px;
}
@media (max-width: 760px) {
  .company-checks,
  .compact-checks,
  .option-grid,
  .role-grid {
    grid-template-columns: 1fr;
  }
  .company-header {
    align-items: flex-start;
  }
  .location-toolbar {
    grid-template-columns: 1fr;
  }
  .location-summary {
    min-width: 0;
    padding-bottom: 0;
    text-align: left;
  }
  .context-error {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
