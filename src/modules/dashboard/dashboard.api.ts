import { endpoints } from '@/config/endpoints'
import { apiClient } from '@/services/api-client'

export interface DashboardSummary {
  total_items?: number
  total_assets?: number
  total_stock?: number
  low_stock_count?: number
  pending_approvals?: number
  in_transit_count?: number
}

export const dashboardApi = {
  summary: () => apiClient.get<DashboardSummary>(endpoints.dashboard.summary),
  pendingActions: () => apiClient.get<unknown>(endpoints.dashboard.pendingActions),
}
