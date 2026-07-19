import { http } from './http'
import { unwrapData } from '@/utils/api'

export const apiClient = {
  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const { data } = await http.get(url, { params })
    return unwrapData<T>(data)
  },
  async post<T>(url: string, body?: unknown): Promise<T> {
    const { data } = await http.post(url, body)
    return unwrapData<T>(data)
  },
  async put<T>(url: string, body?: unknown): Promise<T> {
    const { data } = await http.put(url, body)
    return unwrapData<T>(data)
  },
  async patch<T>(url: string, body?: unknown): Promise<T> {
    const { data } = await http.patch(url, body)
    return unwrapData<T>(data)
  },
  async delete<T>(url: string): Promise<T> {
    const { data } = await http.delete(url)
    return unwrapData<T>(data)
  },
}
