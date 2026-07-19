const ACCESS_TOKEN_KEY = 'aims.access_token'
const REFRESH_TOKEN_KEY = 'aims.refresh_token'
const INITIAL_TOKEN_KEY = 'aims.initial_token'
const AUTH_STATE_KEY = 'aims.auth_state'

function readJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    sessionStorage.removeItem(key)
    return null
  }
}

export const tokenStorage = {
  accessToken: () => sessionStorage.getItem(ACCESS_TOKEN_KEY),
  refreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  initialToken: () => sessionStorage.getItem(INITIAL_TOKEN_KEY),
  authState: <T>() => readJson<T>(AUTH_STATE_KEY),
  setInitialToken: (token: string) => sessionStorage.setItem(INITIAL_TOKEN_KEY, token),
  setAuthState: (value: unknown) => sessionStorage.setItem(AUTH_STATE_KEY, JSON.stringify(value)),
  setSession: (accessToken: string, refreshToken: string) => {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    sessionStorage.removeItem(INITIAL_TOKEN_KEY)
  },
  clear: () => {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY)
    sessionStorage.removeItem(INITIAL_TOKEN_KEY)
    sessionStorage.removeItem(AUTH_STATE_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },
}
