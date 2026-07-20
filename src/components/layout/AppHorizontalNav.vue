<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronDown } from '@lucide/vue'
import { useRoute } from 'vue-router'
import { navigation, type NavItem } from '@/config/navigation'
import { useAuthStore } from '@/modules/auth/auth.store'

const auth = useAuthStore()
const route = useRoute()
const openGroup = ref<string | null>(null)

function allowed(item: NavItem): boolean {
  if (item.superAdminOnly && !auth.isSuperAdmin) return false
  if (item.permissionAny?.length) {
    return item.permissionAny.some((permission) => auth.can(permission))
  }
  return auth.can(item.permission)
}

function filterItems(items: NavItem[]): NavItem[] {
  return items
    .map((item) => ({
      ...item,
      children: item.children ? filterItems(item.children) : undefined,
    }))
    .filter((item) => allowed(item) && (!item.children || item.children.length > 0))
}

const visibleItems = computed(() => filterItems(navigation))

function toggleGroup(label: string): void {
  openGroup.value = openGroup.value === label ? null : label
}

function linkActive(to?: string): boolean {
  if (!to) return false
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(`${to}/`)
}

function groupActive(item: NavItem): boolean {
  return Boolean(item.children?.some((child) => linkActive(child.to) || groupActive(child)))
}

function close(): void {
  openGroup.value = null
}

function handleDocumentClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null
  if (!target?.closest('.horizontal-nav')) close()
}

function handleEscape(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  window.addEventListener('keydown', handleEscape)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  window.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <nav id="aims-primary-navigation" class="horizontal-nav" aria-label="Menu utama horizontal">
    <div class="horizontal-nav__inner">
      <template v-for="item in visibleItems" :key="item.label">
        <RouterLink
          v-if="item.to"
          class="horizontal-nav__link"
          :class="{ 'is-active': linkActive(item.to) }"
          :to="item.to"
          @click="close"
        >
          <component :is="item.icon" v-if="item.icon" :size="17" />
          <span>{{ item.label }}</span>
        </RouterLink>

        <div v-else class="horizontal-nav__group" :class="{ 'is-open': openGroup === item.label }">
          <button
            class="horizontal-nav__link horizontal-nav__link--button"
            :class="{ 'is-active': groupActive(item) }"
            type="button"
            :aria-expanded="openGroup === item.label"
            @click.stop="toggleGroup(item.label)"
          >
            <component :is="item.icon" v-if="item.icon" :size="17" />
            <span>{{ item.label }}</span>
            <ChevronDown :size="14" />
          </button>
          <div v-if="openGroup === item.label" class="horizontal-nav__dropdown">
            <template v-for="child in item.children" :key="child.label">
              <RouterLink
                v-if="child.to"
                :to="child.to || '/'"
                :class="{ 'is-active': linkActive(child.to) }"
                @click="close"
              >
                <span>{{ child.label }}</span>
              </RouterLink>
              <div v-else class="horizontal-nav__subgroup">
                <div class="horizontal-nav__subgroup-label">{{ child.label }}</div>
                <div class="horizontal-nav__subgroup-links">
                  <RouterLink
                    v-for="grandchild in child.children"
                    :key="grandchild.label"
                    :to="grandchild.to || '/'"
                    class="horizontal-nav__sublink"
                    :class="{ 'is-active': linkActive(grandchild.to) }"
                    @click="close"
                  >
                    <span>{{ grandchild.label }}</span>
                  </RouterLink>
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>
    </div>
  </nav>
</template>
