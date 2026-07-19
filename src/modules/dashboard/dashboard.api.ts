import { endpoints } from '@/config/endpoints'
import { apiClient } from '@/services/api-client'

export interface DashboardSummary {
  total_items?: number | string
  total_stock_qty?: number | string
  out_of_stock_count?: number | string
  transactions_today?: number | string
  low_stock_count?: number | string
  in_transit_count?: number | string
  pending_request_count?: number | string
  open_complaint_count?: number | string
}
export interface AssetSummary {
  total_assets?: number
  available_assets?: number
  assigned_assets?: number
  maintenance_assets?: number
  lost_assets?: number
  disposed_assets?: number
}
export const dashboardApi = {
  summary: () => apiClient.get<DashboardSummary>(endpoints.dashboard.summary),
  assets: () => apiClient.get<AssetSummary>('/api/v1/assets/summary'),
  pendingActions: () =>
    apiClient.get<Record<string, number | string>>(endpoints.dashboard.pendingActions),
  stockByLocation: () =>
    apiClient.get<Record<string, unknown>[]>(endpoints.dashboard.stockByLocation),
  movementTrend: () => apiClient.get<Record<string, unknown>[]>(endpoints.dashboard.movementTrend),
}
