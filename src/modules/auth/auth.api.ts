import { endpoints } from '@/config/endpoints'
import { apiClient } from '@/services/api-client'
import type {
  CompanyOption,
  InitialLoginResponse,
  SessionResponse,
  UserProfile,
} from '@/types/auth'

export const authApi = {
  companies: () => apiClient.get<CompanyOption[]>(endpoints.public.companies),
  login: (body: { company_id: number; email: string; password: string }) =>
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
