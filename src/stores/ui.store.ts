import { ref } from 'vue'
import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark'
export type MenuLayout = 'sidebar' | 'horizontal'

const THEME_STORAGE_KEY = 'aims.theme'
const MENU_LAYOUT_STORAGE_PREFIX = 'aims.menu-layout'
const MENU_VISIBILITY_STORAGE_PREFIX = 'aims.menu-visible'

function resolveInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function menuLayoutStorageKey(userId?: string): string {
  return `${MENU_LAYOUT_STORAGE_PREFIX}.${userId || 'default'}`
}

function menuVisibilityStorageKey(layout: MenuLayout, userId?: string): string {
  return `${MENU_VISIBILITY_STORAGE_PREFIX}.${userId || 'default'}.${layout}`
}

function resolveMenuLayout(userId?: string): MenuLayout {
  if (typeof window === 'undefined') return 'sidebar'
  const userPreference = window.localStorage.getItem(menuLayoutStorageKey(userId))
  if (userPreference === 'sidebar' || userPreference === 'horizontal') return userPreference
  const fallback = window.localStorage.getItem(menuLayoutStorageKey())
  return fallback === 'horizontal' ? 'horizontal' : 'sidebar'
}

function resolveMenuVisibility(layout: MenuLayout, userId?: string): boolean {
  if (typeof window === 'undefined') return true
  const saved = window.localStorage.getItem(menuVisibilityStorageKey(layout, userId))
  if (saved === '0') return false
  if (saved === '1') return true
  return true
}

export const useUiStore = defineStore('ui', () => {
  const mobileSidebarOpen = ref(false)
  const theme = ref<ThemeMode>(resolveInitialTheme())
  const menuLayout = ref<MenuLayout>(resolveMenuLayout())
  const preferenceUserId = ref<string>()
  const sidebarOpen = ref(resolveMenuVisibility('sidebar'))
  const horizontalMenuOpen = ref(resolveMenuVisibility('horizontal'))

  function applyTheme(): void {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.theme = theme.value
    document.documentElement.style.colorScheme = theme.value
  }

  function applyMenuLayout(): void {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.menuLayout = menuLayout.value
    document.documentElement.dataset.menuVisible =
      menuLayout.value === 'sidebar' ? String(sidebarOpen.value) : String(horizontalMenuOpen.value)
  }

  function persistMenuVisibility(layout: MenuLayout, visible: boolean): void {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      menuVisibilityStorageKey(layout, preferenceUserId.value),
      visible ? '1' : '0',
    )
  }

  function setTheme(mode: ThemeMode): void {
    theme.value = mode
    if (typeof window !== 'undefined') window.localStorage.setItem(THEME_STORAGE_KEY, mode)
    applyTheme()
  }

  function toggleTheme(): void {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  function bindUserPreferences(userId?: string): void {
    preferenceUserId.value = userId || undefined
    menuLayout.value = resolveMenuLayout(preferenceUserId.value)
    sidebarOpen.value = resolveMenuVisibility('sidebar', preferenceUserId.value)
    horizontalMenuOpen.value = resolveMenuVisibility('horizontal', preferenceUserId.value)
    mobileSidebarOpen.value = false
    applyMenuLayout()
  }

  function setMenuLayout(layout: MenuLayout): void {
    menuLayout.value = layout
    mobileSidebarOpen.value = false
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(menuLayoutStorageKey(preferenceUserId.value), layout)
    }
    applyMenuLayout()
  }

  function toggleMenuLayout(): void {
    setMenuLayout(menuLayout.value === 'sidebar' ? 'horizontal' : 'sidebar')
  }

  function setSidebarOpen(open: boolean): void {
    sidebarOpen.value = open
    persistMenuVisibility('sidebar', open)
    applyMenuLayout()
  }

  function setHorizontalMenuOpen(open: boolean): void {
    horizontalMenuOpen.value = open
    persistMenuVisibility('horizontal', open)
    applyMenuLayout()
  }

  function toggleNavigation(): void {
    if (typeof window !== 'undefined' && window.innerWidth < 992) {
      mobileSidebarOpen.value = !mobileSidebarOpen.value
      return
    }

    if (menuLayout.value === 'horizontal') {
      setHorizontalMenuOpen(!horizontalMenuOpen.value)
      return
    }

    setSidebarOpen(!sidebarOpen.value)
  }

  function openMobileSidebar(): void {
    mobileSidebarOpen.value = true
  }

  function closeMobileSidebar(): void {
    mobileSidebarOpen.value = false
  }

  applyTheme()
  applyMenuLayout()

  return {
    mobileSidebarOpen,
    theme,
    menuLayout,
    sidebarOpen,
    horizontalMenuOpen,
    toggleTheme,
    setTheme,
    bindUserPreferences,
    setMenuLayout,
    toggleMenuLayout,
    setSidebarOpen,
    setHorizontalMenuOpen,
    toggleNavigation,
    openMobileSidebar,
    closeMobileSidebar,
  }
})
