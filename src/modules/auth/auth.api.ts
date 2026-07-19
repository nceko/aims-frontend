import { endpoints } from '@/config/endpoints'
import { apiClient } from '@/services/api-client'
import type {
  AccessOption,
  CompanyOption,
  ContextSwitchRequest,
  InitialLoginResponse,
  SessionResponse,
  UserProfile,
} from '@/types/auth'

interface ApiOptionResponse {
  id?: number | string
  value?: number | string
  code?: string
  name?: string
  label?: string
  company_id?: number
  company_code?: string
  company_name?: string
}

function normalizeCompany(company: CompanyOption): CompanyOption {
  const normalizedId = company.id_company ?? company.company_id ?? company.id
  return {
    ...company,
    id: normalizedId,
    company_id: normalizedId,
  }
}

function normalizeAccessOption(option: ApiOptionResponse | AccessOption): AccessOption {
  const rawId = 'value' in option && option.value !== undefined ? option.value : option.id
  return {
    id: Number(rawId),
    code: option.code,
    name: option.label || option.name || option.code || String(rawId ?? ''),
    label: option.label,
    company_id: option.company_id,
    company_code: option.company_code,
    company_name: option.company_name,
  }
}

export const authApi = {
  companies: async () => {
    const companies = await apiClient.get<CompanyOption[]>(endpoints.public.companies)
    return companies.map(normalizeCompany)
  },
  contextOptions: async (companyId?: number) => {
    // Semua endpoint /options hanya menerima filter yang relevan, tanpa limit/pagination.
    const locationParams = companyId ? { company_id: companyId } : undefined
    const categoryGroupParams = companyId ? { company_id: companyId } : undefined
    const [locations, categoryGroups] = await Promise.all([
      apiClient.get<ApiOptionResponse[]>('/api/v1/locations/options', locationParams),
      apiClient.get<ApiOptionResponse[]>('/api/v1/category-groups/options', categoryGroupParams),
    ])
    return {
      locations: locations.map(normalizeAccessOption).filter((item) => Number.isFinite(item.id)),
      categoryGroups: categoryGroups
        .map(normalizeAccessOption)
        .filter((item) => Number.isFinite(item.id)),
    }
  },
  login: (body: { company_id: number; identity: string; password: string }) =>
    apiClient.post<InitialLoginResponse>(endpoints.auth.login, body),
  switchContext: (body: ContextSwitchRequest) =>
    apiClient.post<SessionResponse>(endpoints.auth.switchContext, body),
  me: () => apiClient.get<UserProfile>(endpoints.auth.me),
  updatePassword: (userId: string, password: string) =>
    apiClient.put<void>(`/api/v1/users/${encodeURIComponent(userId)}/password`, { password }),
  logout: (refreshToken?: string | null) =>
    apiClient.post<void>(
      endpoints.auth.logout,
      refreshToken ? { refresh_token: refreshToken } : {},
    ),
}
