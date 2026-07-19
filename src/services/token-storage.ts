const ACCESS_TOKEN_KEY = 'aims.access_token'
const REFRESH_TOKEN_KEY = 'aims.refresh_token'
const INITIAL_TOKEN_KEY = 'aims.initial_token'

export const tokenStorage = {
  accessToken: () => sessionStorage.getItem(ACCESS_TOKEN_KEY),
  refreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  initialToken: () => sessionStorage.getItem(INITIAL_TOKEN_KEY),
  setInitialToken: (token: string) => sessionStorage.setItem(INITIAL_TOKEN_KEY, token),
  setSession: (accessToken: string, refreshToken: string) => {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    sessionStorage.removeItem(INITIAL_TOKEN_KEY)
  },
  clear: () => {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY)
    sessionStorage.removeItem(INITIAL_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },
}
