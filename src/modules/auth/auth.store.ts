import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authApi } from './auth.api'
import { isSessionRejected, isTransientHttpError, restoreAccessToken } from '@/services/http'
import { tokenStorage } from '@/services/token-storage'
import type {
  AccessOption,
  CompanyOption,
  ContextSwitchRequest,
  InitialLoginResponse,
  UserProfile,
} from '@/types/auth'

interface CachedAuthState {
  user: UserProfile | null
  selectedCompany: CompanyOption | null
  contextOptions: { locations: AccessOption[]; categoryGroups: AccessOption[] }
}

function safeProfile(...sources: Array<Partial<UserProfile> | null | undefined>): UserProfile {
  const source = Object.assign({}, ...sources) as UserProfile
  return {
    user_id: source.user_id,
    id: source.id,
    email: source.email,
    full_name: source.full_name,
    name: source.name,
    roles: Array.isArray(source.roles) ? source.roles : [],
    permissions: Array.isArray(source.permissions) ? source.permissions : [],
    company_id: source.company_id,
    company_name: source.company_name,
    location_id: source.location_id,
    location_name: source.location_name,
    category_group_id: source.category_group_id,
    category_group_name: source.category_group_name,
    location_type_code: source.location_type_code,
    is_central_location: source.is_central_location,
    is_global_super_admin: source.is_global_super_admin,
    scope_mode: source.scope_mode,
    has_context: source.has_context,
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserProfile | null>(null)
  const companies = ref<CompanyOption[]>([])
  const selectedCompany = ref<CompanyOption | null>(null)
  const contextOptions = ref<{ locations: AccessOption[]; categoryGroups: AccessOption[] }>({
    locations: [],
    categoryGroups: [],
  })
  const loading = ref(false)
  const contextLoading = ref(false)

  const authenticated = computed(() =>
    Boolean(tokenStorage.accessToken() || tokenStorage.refreshToken()),
  )
  const displayName = computed(
    () => user.value?.full_name || user.value?.name || user.value?.email || 'User',
  )
  const permissions = computed(() => new Set(user.value?.permissions ?? []))
  const normalizedRoles = computed(() =>
    (user.value?.roles ?? []).map((role) => role.toLowerCase().replaceAll(' ', '_')),
  )
  const isSuperAdmin = computed(
    () =>
      Boolean(user.value?.is_global_super_admin) || normalizedRoles.value.includes('super_admin'),
  )

  function persistState(): void {
    tokenStorage.setAuthState({
      user: user.value ? safeProfile(user.value) : null,
      selectedCompany: selectedCompany.value,
      contextOptions: contextOptions.value,
    })
  }

  async function loadCompanies(): Promise<void> {
    companies.value = await authApi.companies()
  }

  async function loadContextOptions(companyId?: number): Promise<void> {
    contextLoading.value = true
    try {
      contextOptions.value = await authApi.contextOptions(companyId)
      persistState()
    } finally {
      contextLoading.value = false
    }
  }

  async function login(payload: { company_id: number; identity: string; password: string }) {
    loading.value = true
    try {
      const response: InitialLoginResponse = await authApi.login(payload)
      tokenStorage.setInitialToken(response.access_token)
      selectedCompany.value =
        companies.value.find(
          (company) => Number(company.company_id ?? company.id) === payload.company_id,
        ) ?? null
      contextOptions.value = {
        locations: response.locations ?? [],
        categoryGroups: response.category_groups ?? [],
      }
      user.value = safeProfile(response, {
        email: payload.identity.includes('@') ? payload.identity : response.email,
        company_id: payload.company_id,
        company_name: selectedCompany.value?.company_name ?? selectedCompany.value?.name,
      })
      persistState()
      return response
    } finally {
      loading.value = false
    }
  }

  async function switchContext(payload: ContextSwitchRequest): Promise<void> {
    loading.value = true
    try {
      const response = await authApi.switchContext({
        company_id: payload.company_id,
        location_id: payload.location_id,
        category_group_id: payload.category_group_id,
        current_refresh_token: tokenStorage.refreshToken() ?? undefined,
      })
      tokenStorage.setSession(response.access_token, response.refresh_token)
      const profile = await authApi.me()
      const location = contextOptions.value.locations.find(
        (item) => Number(item.id) === payload.location_id,
      )
      const categoryGroup = contextOptions.value.categoryGroups.find(
        (item) => Number(item.id) === payload.category_group_id,
      )
      if (payload.company_id) {
        selectedCompany.value =
          companies.value.find(
            (company) =>
              Number(company.company_id ?? company.id_company ?? company.id) === payload.company_id,
          ) ?? selectedCompany.value
      }
      user.value = safeProfile(user.value, response, profile, {
        company_id: payload.company_id ?? profile.company_id ?? response.company_id,
        company_name:
          profile.company_name ??
          selectedCompany.value?.company_name ??
          selectedCompany.value?.name,
        location_id: payload.location_id,
        location_name: location?.name,
        category_group_id: payload.category_group_id,
        category_group_name: categoryGroup?.name,
        has_context: true,
      })
      persistState()
    } finally {
      loading.value = false
    }
  }

  async function restoreSession(): Promise<boolean> {
    if (!tokenStorage.accessToken() && !tokenStorage.refreshToken()) return false
    const cached = tokenStorage.authState<CachedAuthState>()
    if (cached) {
      user.value = cached.user ? safeProfile(cached.user) : null
      selectedCompany.value = cached.selectedCompany
      contextOptions.value = cached.contextOptions ?? { locations: [], categoryGroups: [] }
    }
    try {
      if (!tokenStorage.accessToken()) await restoreAccessToken()
      user.value = safeProfile(cached?.user, await authApi.me())
      persistState()
      return true
    } catch (error) {
      // Saat backend restart/offline, gunakan profil terakhir dan pertahankan token.
      // Request berikutnya akan mencoba refresh kembali setelah backend tersedia.
      if (isTransientHttpError(error)) {
        return Boolean(user.value && (tokenStorage.accessToken() || tokenStorage.refreshToken()))
      }
      if (isSessionRejected(error)) {
        tokenStorage.clear()
        user.value = null
      }
      return false
    }
  }

  function can(permission?: string): boolean {
    if (!permission) return true
    return isSuperAdmin.value || permissions.value.has('*') || permissions.value.has(permission)
  }

  async function changeOwnPassword(password: string): Promise<void> {
    const userId = user.value?.user_id || user.value?.id
    if (!userId) throw new Error('User ID tidak tersedia pada session aktif.')
    loading.value = true
    try {
      await authApi.updatePassword(userId, password)
      tokenStorage.clear()
      user.value = null
      selectedCompany.value = null
      contextOptions.value = { locations: [], categoryGroups: [] }
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout(tokenStorage.refreshToken())
    } finally {
      tokenStorage.clear()
      user.value = null
      selectedCompany.value = null
      contextOptions.value = { locations: [], categoryGroups: [] }
    }
  }

  return {
    user,
    companies,
    selectedCompany,
    contextOptions,
    loading,
    contextLoading,
    authenticated,
    displayName,
    permissions,
    isSuperAdmin,
    loadCompanies,
    loadContextOptions,
    login,
    switchContext,
    restoreSession,
    can,
    changeOwnPassword,
    logout,
  }
})
