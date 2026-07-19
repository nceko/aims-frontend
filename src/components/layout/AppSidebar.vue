<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, X } from '@lucide/vue'
import { navigation, type NavItem } from '@/config/navigation'
import { useAuthStore } from '@/modules/auth/auth.store'
import { useUiStore } from '@/stores/ui.store'
import AppLogo from './AppLogo.vue'

const auth = useAuthStore()
const ui = useUiStore()
const openGroups = ref(new Set<string>(['Master Data']))

const visibleItems = computed(() =>
  navigation
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) => auth.can(child.permission)),
    }))
    .filter((item) => auth.can(item.permission) && (!item.children || item.children.length > 0)),
)

function toggle(item: NavItem) {
  if (!item.children) return
  const next = new Set(openGroups.value)
  if (next.has(item.label)) next.delete(item.label)
  else next.add(item.label)
  openGroups.value = next
}
</script>

<template>
  <aside
    class="app-sidebar"
    :class="{
      'app-sidebar--collapsed': ui.sidebarCollapsed,
      'app-sidebar--mobile-open': ui.mobileSidebarOpen,
    }"
  >
    <div class="app-sidebar__brand">
      <AppLogo :compact="ui.sidebarCollapsed" inverse />
      <button
        class="icon-button app-sidebar__close"
        aria-label="Tutup menu"
        @click="ui.closeMobileSidebar"
      >
        <X :size="20" />
      </button>
    </div>

    <nav class="app-sidebar__nav" aria-label="Menu utama">
      <template v-for="item in visibleItems" :key="item.label">
        <RouterLink v-if="item.to" class="nav-link" :to="item.to" @click="ui.closeMobileSidebar">
          <component :is="item.icon" v-if="item.icon" :size="19" />
          <span>{{ item.label }}</span>
        </RouterLink>

        <div v-else class="nav-group" :class="{ 'nav-group--open': openGroups.has(item.label) }">
          <button class="nav-link nav-link--button" type="button" @click="toggle(item)">
            <component :is="item.icon" v-if="item.icon" :size="19" />
            <span>{{ item.label }}</span>
            <ChevronDown class="nav-link__chevron" :size="16" />
          </button>
          <div
            v-show="openGroups.has(item.label) && !ui.sidebarCollapsed"
            class="nav-group__children"
          >
            <RouterLink
              v-for="child in item.children"
              :key="child.label"
              class="nav-child"
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

    <div v-if="!ui.sidebarCollapsed" class="app-sidebar__footer">
      <span>Context aktif</span>
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
