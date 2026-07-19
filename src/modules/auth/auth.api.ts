import { endpoints } from '@/config/endpoints'
import { apiClient } from '@/services/api-client'
import type {
  CompanyOption,
  InitialLoginResponse,
  SessionResponse,
  UserProfile,
} from '@/types/auth'

function normalizeCompany(company: CompanyOption): CompanyOption {
  const normalizedId = company.id_company ?? company.company_id ?? company.id
  return {
    ...company,
    id: normalizedId,
    company_id: normalizedId,
  }
}

export const authApi = {
  companies: async () => {
    const companies = await apiClient.get<CompanyOption[]>(endpoints.public.companies)
    return companies.map(normalizeCompany)
  },
  login: (body: { company_id: number; identity: string; password: string }) =>
    apiClient.post<InitialLoginResponse>(endpoints.auth.login, body),
  switchContext: (body: { location_id: number; category_group_id: number }) =>
    apiClient.post<SessionResponse>(endpoints.auth.switchContext, body),
  me: () => apiClient.get<UserProfile>(endpoints.auth.me),
  logout: (refreshToken?: string | null) =>
    apiClient.post<void>(
      endpoints.auth.logout,
      refreshToken ? { refresh_token: refreshToken } : {},
    ),
}
