<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  Bell,
  ChevronDown,
  KeyRound,
  LogOut,
  Menu,
  Moon,
  PanelLeft,
  PanelTop,
  RefreshCw,
  Search,
  Sun,
  UserRound,
} from '@lucide/vue'
import { useRouter } from 'vue-router'
import AppLogo from '@/components/layout/AppLogo.vue'
import ChangePasswordModal from '@/components/layout/ChangePasswordModal.vue'
import ContextSwitcherModal from '@/components/layout/ContextSwitcherModal.vue'
import { navigation, type NavItem } from '@/config/navigation'
import { useAuthStore } from '@/modules/auth/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { apiClient } from '@/services/api-client'
import { normalizeList } from '@/utils/api'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const profileOpen = ref(false)
const contextOpen = ref(false)
const passwordOpen = ref(false)
const searchOpen = ref(false)
const searchQuery = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const unreadNotifications = ref(0)

const initials = computed(() =>
  auth.displayName
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase(),
)
const contextLabel = computed(() => {
  const location = auth.user?.location_name || 'Lokasi'
  const category = auth.user?.category_group_name || 'Kelompok Kategori'
  return `${location} · ${category}`
})
const themeLabel = computed(() =>
  ui.theme === 'dark' ? 'Gunakan tema terang' : 'Gunakan tema gelap',
)
const menuLayoutLabel = computed(() =>
  ui.menuLayout === 'sidebar' ? 'Pindahkan menu ke bawah topbar' : 'Pindahkan menu ke sidebar',
)
const menuVisible = computed(() =>
  ui.menuLayout === 'sidebar' ? ui.sidebarOpen : ui.horizontalMenuOpen,
)
const menuVisibilityLabel = computed(() =>
  menuVisible.value ? 'Tutup menu navigasi' : 'Tampilkan menu navigasi',
)

function allowed(item: NavItem): boolean {
  if (item.superAdminOnly && !auth.isSuperAdmin) return false
  if (item.permissionAny?.length) {
    return item.permissionAny.some((permission) => auth.can(permission))
  }
  return auth.can(item.permission)
}
function flattenNavigation(
  items: NavItem[],
  trail: string[] = [],
): Array<NavItem & { group: string }> {
  return items.flatMap((item) => {
    if (!allowed(item)) return []
    const nextTrail = item.to ? trail : [...trail, item.label]
    const currentGroup = nextTrail.join(' / ') || 'Menu'
    const current = item.to ? [{ ...item, group: currentGroup }] : []
    const children = item.children ? flattenNavigation(item.children, nextTrail) : []
    return [...current, ...children]
  })
}

const searchableItems = computed(() => flattenNavigation(navigation))
const searchResults = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return searchableItems.value.slice(0, 8)
  return searchableItems.value
    .filter((item) => `${item.label} ${item.group}`.toLowerCase().includes(query))
    .slice(0, 10)
})

async function loadNotificationCount(): Promise<void> {
  if (!auth.can('operations.notifications.read')) return
  try {
    const rows = normalizeList<Record<string, unknown>>(
      await apiClient.get('/api/v1/notifications', { per_page: 100 }),
    )
    unreadNotifications.value = rows.filter((row) => {
      const status = String(row.status ?? '').toUpperCase()
      return (
        row.is_read === false ||
        (!row.read_at && !['READ', 'DISMISSED', 'RESOLVED'].includes(status))
      )
    }).length
  } catch {
    unreadNotifications.value = 0
  }
}
async function openSearch(): Promise<void> {
  profileOpen.value = false
  searchOpen.value = true
  await nextTick()
  searchInput.value?.focus()
}
function closeSearch(): void {
  searchOpen.value = false
  searchQuery.value = ''
}
async function chooseSearchResult(path?: string): Promise<void> {
  if (!path) return
  closeSearch()
  await router.push(path)
}
function openContext(): void {
  profileOpen.value = false
  closeSearch()
  contextOpen.value = true
}
function openPassword(): void {
  profileOpen.value = false
  closeSearch()
  passwordOpen.value = true
}
function keyboard(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    void openSearch()
  }
  if (event.key === 'Escape') {
    closeSearch()
    profileOpen.value = false
  }
}
function contextSwitched(): void {
  window.location.assign('/')
}
async function passwordChanged(): Promise<void> {
  await router.replace({ path: '/login', query: { password_changed: '1' } })
}
async function logout(): Promise<void> {
  await auth.logout()
  await router.replace('/login')
}

onMounted(() => {
  window.addEventListener('keydown', keyboard)
  void loadNotificationCount()
})
onBeforeUnmount(() => window.removeEventListener('keydown', keyboard))
</script>

<template>
  <header class="app-topbar">
    <div class="app-topbar__left">
      <AppLogo class="app-topbar__brand" />
      <button
        class="icon-button app-topbar__menu-toggle"
        type="button"
        :title="menuVisibilityLabel"
        :aria-label="menuVisibilityLabel"
        :aria-expanded="menuVisible"
        aria-controls="aims-primary-navigation"
        @click="ui.toggleNavigation"
      >
        <Menu :size="22" />
      </button>
      <div class="topbar-search-wrap">
        <button class="global-search" type="button" @click="openSearch">
          <Search :size="18" />
          <span>Cari menu atau modul…</span>
          <kbd>⌘ K</kbd>
        </button>
        <div v-if="searchOpen" class="global-search-popover">
          <label class="global-search-popover__input">
            <Search :size="18" />
            <input
              ref="searchInput"
              v-model="searchQuery"
              type="search"
              placeholder="Ketik nama menu…"
            />
          </label>
          <div class="global-search-results">
            <button
              v-for="item in searchResults"
              :key="`${item.group}-${item.label}`"
              type="button"
              @click="chooseSearchResult(item.to)"
            >
              <span>{{ item.label }}</span
              ><small>{{ item.group }}</small>
            </button>
            <p v-if="!searchResults.length">Menu tidak ditemukan.</p>
          </div>
          <button class="global-search-close" type="button" @click="closeSearch">Tutup</button>
        </div>
      </div>
    </div>

    <div class="app-topbar__right">
      <button
        class="topbar-context-button"
        type="button"
        title="Ganti location dan category group"
        @click="openContext"
      >
        <RefreshCw :size="18" />
        <span>
          <small>Konteks aktif</small>
          <strong>{{ contextLabel }}</strong>
        </span>
      </button>

      <button
        class="icon-button topbar-layout-toggle"
        type="button"
        :title="menuLayoutLabel"
        :aria-label="menuLayoutLabel"
        @click="ui.toggleMenuLayout"
      >
        <PanelTop v-if="ui.menuLayout === 'sidebar'" :size="20" />
        <PanelLeft v-else :size="20" />
      </button>

      <button
        class="icon-button"
        type="button"
        :title="themeLabel"
        :aria-label="themeLabel"
        @click="ui.toggleTheme"
      >
        <Sun v-if="ui.theme === 'dark'" :size="20" />
        <Moon v-else :size="20" />
      </button>

      <RouterLink
        v-if="auth.can('operations.notifications.read')"
        class="icon-button icon-button--notification"
        to="/operations/notifications"
        aria-label="Notifikasi"
      >
        <Bell :size="20" />
        <span v-if="unreadNotifications"></span>
        <b v-if="unreadNotifications">{{
          unreadNotifications > 99 ? '99+' : unreadNotifications
        }}</b>
      </RouterLink>

      <div class="profile-menu">
        <button class="profile-trigger" type="button" @click="profileOpen = !profileOpen">
          <span class="profile-trigger__avatar">{{ initials || 'U' }}</span>
          <span class="profile-trigger__copy">
            <strong>{{ auth.displayName }}</strong>
            <small>{{ auth.user?.roles?.[0] || 'Pengguna AIMS' }}</small>
          </span>
          <ChevronDown :size="16" />
        </button>
        <div v-if="profileOpen" class="profile-dropdown">
          <div class="profile-dropdown__summary">
            <strong>{{ auth.displayName }}</strong>
            <span>{{ auth.user?.email || auth.user?.company_name || 'Akun AIMS' }}</span>
          </div>
          <RouterLink to="/profile" @click="profileOpen = false">
            <UserRound :size="17" /> Profil Saya
          </RouterLink>
          <button type="button" @click="openContext"><RefreshCw :size="17" /> Ganti Konteks</button>
          <button type="button" @click="openPassword">
            <KeyRound :size="17" /> Ganti Password
          </button>
          <button type="button" @click="ui.toggleMenuLayout">
            <PanelTop v-if="ui.menuLayout === 'sidebar'" :size="17" />
            <PanelLeft v-else :size="17" />
            {{ ui.menuLayout === 'sidebar' ? 'Menu Horizontal' : 'Menu Sidebar' }}
          </button>
          <div class="profile-dropdown__divider"></div>
          <button type="button" class="profile-dropdown__logout" @click="logout">
            <LogOut :size="17" /> Keluar
          </button>
        </div>
      </div>
    </div>
  </header>

  <ContextSwitcherModal
    :open="contextOpen"
    @close="contextOpen = false"
    @switched="contextSwitched"
  />
  <ChangePasswordModal
    :open="passwordOpen"
    @close="passwordOpen = false"
    @changed="passwordChanged"
  />
</template>
