import type { AxiosRequestConfig, AxiosResponse, ResponseType } from 'axios'
import { http } from './http'
import { unwrapData } from '@/utils/api'
import { sanitizeOptionsParams } from './query-policy'

export interface DownloadResult {
  blob: Blob
  contentType: string
  contentDisposition: string
}

async function rawResponse<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return http.request<T>(config)
}

export const apiClient = {
  async get<T>(
    url: string,
    params?: Record<string, unknown>,
    options: { signal?: AbortSignal } = {},
  ): Promise<T> {
    const { data } = await http.get(url, {
      params: sanitizeOptionsParams(url, params),
      signal: options.signal,
    })
    return unwrapData<T>(data)
  },
  async getRaw<T>(
    url: string,
    options: {
      params?: Record<string, unknown>
      responseType?: ResponseType
      accept?: string
    } = {},
  ): Promise<T> {
    const { data } = await rawResponse<T>({
      method: 'GET',
      url,
      params: sanitizeOptionsParams(url, options.params),
      responseType: options.responseType,
      headers: options.accept ? { Accept: options.accept } : undefined,
    })
    return data
  },
  async post<T>(url: string, body?: unknown): Promise<T> {
    const { data } = await http.post(url, body)
    return unwrapData<T>(data)
  },
  async postForm<T>(url: string, body: FormData): Promise<T> {
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
  async download(
    url: string,
    params?: Record<string, unknown>,
    accept = 'application/octet-stream',
  ): Promise<DownloadResult> {
    const response = await rawResponse<Blob>({
      method: 'GET',
      url,
      params: sanitizeOptionsParams(url, params),
      responseType: 'blob',
      headers: { Accept: accept },
    })
    return {
      blob: response.data,
      contentType: String(response.headers['content-type'] ?? ''),
      contentDisposition: String(response.headers['content-disposition'] ?? ''),
    }
  },
}
