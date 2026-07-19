<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronDown, X } from '@lucide/vue'
import { navigation, type NavItem } from '@/config/navigation'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/modules/auth/auth.store'
import { useUiStore } from '@/stores/ui.store'
import AppLogo from './AppLogo.vue'

const auth = useAuthStore()
const ui = useUiStore()
const route = useRoute()
const openGroups = ref(new Set<string>())

function allowed(item: NavItem): boolean {
  if (item.superAdminOnly && !auth.isSuperAdmin) return false
  if (item.permissionAny?.length)
    return item.permissionAny.some((permission) => auth.can(permission))
  return auth.can(item.permission)
}

const visibleItems = computed(() =>
  navigation
    .map((item) => ({
      ...item,
      children: item.children?.filter(allowed),
    }))
    .filter((item) => allowed(item) && (!item.children || item.children.length > 0)),
)

function isRouteActive(to?: string): boolean {
  if (!to) return false
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(`${to}/`)
}

function groupActive(item: NavItem): boolean {
  return Boolean(item.children?.some((child) => isRouteActive(child.to)))
}

function ensureActiveGroupOpen(): void {
  const activeGroup = visibleItems.value.find((item) => item.children && groupActive(item))
  if (!activeGroup) return
  const next = new Set(openGroups.value)
  next.add(activeGroup.label)
  openGroups.value = next
}

function toggle(item: NavItem) {
  if (!item.children) return
  const next = new Set(openGroups.value)
  if (next.has(item.label)) next.delete(item.label)
  else next.add(item.label)
  openGroups.value = next
}

watch(
  () => route.path,
  () => ensureActiveGroupOpen(),
  { immediate: true },
)
</script>

<template>
  <aside
    class="app-sidebar"
    :class="{
      'app-sidebar--hidden': !ui.sidebarOpen,
      'app-sidebar--mobile-open': ui.mobileSidebarOpen,
    }"
  >
    <div class="app-sidebar__brand">
      <AppLogo inverse />
      <button
        class="icon-button app-sidebar__close"
        aria-label="Tutup menu"
        @click="ui.closeMobileSidebar"
      >
        <X :size="20" />
      </button>
    </div>

    <nav id="aims-primary-navigation" class="app-sidebar__nav" aria-label="Menu utama">
      <template v-for="item in visibleItems" :key="item.label">
        <RouterLink
          v-if="item.to"
          class="nav-link"
          :class="{ 'is-active': isRouteActive(item.to) }"
          :to="item.to"
          @click="ui.closeMobileSidebar"
        >
          <component :is="item.icon" v-if="item.icon" :size="19" />
          <span>{{ item.label }}</span>
        </RouterLink>

        <div
          v-else
          class="nav-group"
          :class="{
            'nav-group--open': openGroups.has(item.label),
            'nav-group--active': groupActive(item),
          }"
        >
          <button class="nav-link nav-link--button" type="button" @click="toggle(item)">
            <component :is="item.icon" v-if="item.icon" :size="19" />
            <span>{{ item.label }}</span>
            <ChevronDown class="nav-link__chevron" :size="16" />
          </button>
          <div v-show="openGroups.has(item.label)" class="nav-group__children">
            <RouterLink
              v-for="child in item.children"
              :key="child.label"
              class="nav-child"
              :class="{ 'is-active': isRouteActive(child.to) }"
              :to="child.to || '/'"
              @click="ui.closeMobileSidebar"
            >
              <span class="nav-child__dot"></span>
              {{ child.label }}
            </RouterLink>
          </div>
        </div>
      </template>
    </nav>

    <div class="app-sidebar__footer">
      <span>Warehouse aktif</span>
      <strong>{{ auth.user?.company_name || 'Belum tersedia' }}</strong>
      <small
        >{{ auth.user?.location_name || '-' }} · {{ auth.user?.category_group_name || '-' }}</small
      >
    </div>
  </aside>
  <button
    v-if="ui.mobileSidebarOpen"
    class="sidebar-overlay"
    aria-label="Tutup sidebar"
    @click="ui.closeMobileSidebar"
  ></button>
</template>
