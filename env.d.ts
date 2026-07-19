/// <reference types="vite/client" />

declare interface Window {
  __AIMS_CONFIG__?: {
    APP_NAME?: string
    APP_FULL_NAME?: string
    API_BASE_URL?: string
    API_TIMEOUT?: string | number
  }
}
