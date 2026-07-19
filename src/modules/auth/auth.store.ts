import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authApi } from './auth.api'
import { tokenStorage } from '@/services/token-storage'
import type { AccessOption, CompanyOption, InitialLoginResponse, UserProfile } from '@/types/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserProfile | null>(null)
  const companies = ref<CompanyOption[]>([])
  const contextOptions = ref<{
    locations: AccessOption[]
    categoryGroups: AccessOption[]
  }>({ locations: [], categoryGroups: [] })
  const loading = ref(false)

  const authenticated = computed(() => Boolean(tokenStorage.accessToken()))
  const displayName = computed(
    () => user.value?.full_name || user.value?.name || user.value?.email || 'User',
  )
  const permissions = computed(() => new Set(user.value?.permissions ?? []))

  async function loadCompanies() {
    companies.value = await authApi.companies()
  }

  async function login(payload: { company_id: number; email: string; password: string }) {
    loading.value = true
    try {
      const response: InitialLoginResponse = await authApi.login(payload)
      tokenStorage.setInitialToken(response.access_token)
      contextOptions.value = {
        locations: response.locations ?? [],
        categoryGroups: response.category_groups ?? [],
      }
      user.value = response.user ?? null
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
      user.value = response.user ?? (await authApi.me())
    } finally {
      loading.value = false
    }
  }

  async function restoreSession() {
    if (!tokenStorage.accessToken()) return false
    try {
      user.value = await authApi.me()
      return true
    } catch {
      tokenStorage.clear()
      user.value = null
      return false
    }
  }

  function can(permission?: string): boolean {
    if (!permission) return true
    const current = permissions.value
    const roles = (user.value?.roles ?? []).map((role) => role.toLowerCase())
    return (
      roles.includes('super_admin') ||
      roles.includes('super admin') ||
      current.has('*') ||
      current.has(permission) ||
      current.has('super_admin')
    )
  }

  async function logout() {
    try {
      await authApi.logout(tokenStorage.refreshToken())
    } finally {
      tokenStorage.clear()
      user.value = null
      contextOptions.value = { locations: [], categoryGroups: [] }
    }
  }

  return {
    user,
    companies,
    contextOptions,
    loading,
    authenticated,
    displayName,
    permissions,
    loadCompanies,
    login,
    switchContext,
    restoreSession,
    can,
    logout,
  }
})
