<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Bell, ChevronDown, LogOut, Menu, Search, UserRound } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { navigation, type NavItem } from '@/config/navigation'
import { useAuthStore } from '@/modules/auth/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { apiClient } from '@/services/api-client'
import { normalizeList } from '@/utils/api'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const profileOpen = ref(false)
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
function allowed(item: NavItem): boolean {
  if (item.superAdminOnly && !auth.isSuperAdmin) return false
  if (item.permissionAny?.length)
    return item.permissionAny.some((permission) => auth.can(permission))
  return auth.can(item.permission)
}
const searchableItems = computed(() =>
  navigation.flatMap((group) => {
    if (group.children) {
      return group.children
        .filter(allowed)
        .filter((item) => item.to)
        .map((item) => ({ ...item, group: group.label }))
    }
    return allowed(group) && group.to ? [{ ...group, group: 'Menu' }] : []
  }),
)
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
function keyboard(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    void openSearch()
  }
  if (event.key === 'Escape') closeSearch()
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
      <button class="icon-button" aria-label="Buka atau tutup menu" @click="ui.toggleSidebar">
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
            <small>{{ auth.user?.roles?.[0] || 'User AIMS' }}</small>
          </span>
          <ChevronDown :size="16" />
        </button>
        <div v-if="profileOpen" class="profile-dropdown">
          <RouterLink to="/profile" @click="profileOpen = false">
            <UserRound :size="17" /> Profil & Context
          </RouterLink>
          <button type="button" @click="logout"><LogOut :size="17" /> Keluar</button>
        </div>
      </div>
    </div>
  </header>
</template>
