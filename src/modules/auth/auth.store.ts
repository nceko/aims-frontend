import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authApi } from './auth.api'
import { tokenStorage } from '@/services/token-storage'
import type { AccessOption, CompanyOption, InitialLoginResponse, UserProfile } from '@/types/auth'

interface CachedAuthState {
  user: UserProfile | null
  selectedCompany: CompanyOption | null
  contextOptions: { locations: AccessOption[]; categoryGroups: AccessOption[] }
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

  const authenticated = computed(() => Boolean(tokenStorage.accessToken()))
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

  function persistState() {
    tokenStorage.setAuthState({
      user: user.value,
      selectedCompany: selectedCompany.value,
      contextOptions: contextOptions.value,
    })
  }

  async function loadCompanies() {
    companies.value = await authApi.companies()
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
      user.value = {
        ...response,
        email: payload.identity.includes('@') ? payload.identity : response.email,
        company_name: selectedCompany.value?.company_name ?? selectedCompany.value?.name,
      }
      persistState()
      return response
    } finally {
      loading.value = false
    }
  }

  async function switchContext(payload: { location_id: number; category_group_id: number }) {
    loading.value = true
    try {
      const response = await authApi.switchContext(payload)
      tokenStorage.setSession(response.access_token, response.refresh_token)
      const profile = await authApi.me()
      const location = contextOptions.value.locations.find(
        (item) => Number(item.id) === payload.location_id,
      )
      const categoryGroup = contextOptions.value.categoryGroups.find(
        (item) => Number(item.id) === payload.category_group_id,
      )
      user.value = {
        ...user.value,
        ...response,
        ...profile,
        company_name:
          selectedCompany.value?.company_name ??
          selectedCompany.value?.name ??
          user.value?.company_name,
        location_name: location?.name,
        category_group_name: categoryGroup?.name,
      }
      persistState()
    } finally {
      loading.value = false
    }
  }

  async function restoreSession() {
    if (!tokenStorage.accessToken()) return false
    const cached = tokenStorage.authState<CachedAuthState>()
    if (cached) {
      user.value = cached.user
      selectedCompany.value = cached.selectedCompany
      contextOptions.value = cached.contextOptions
    }
    try {
      user.value = { ...(cached?.user ?? {}), ...(await authApi.me()) }
      persistState()
      return true
    } catch {
      tokenStorage.clear()
      user.value = null
      return false
    }
  }

  function can(permission?: string): boolean {
    if (!permission) return true
    return isSuperAdmin.value || permissions.value.has('*') || permissions.value.has(permission)
  }

  async function logout() {
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
    authenticated,
    displayName,
    permissions,
    isSuperAdmin,
    loadCompanies,
    login,
    switchContext,
    restoreSession,
    can,
    logout,
  }
})
