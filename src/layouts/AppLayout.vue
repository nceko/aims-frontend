<script setup lang="ts">
import { computed, watch } from 'vue'
import packageInfo from '../../package.json'
import AppHorizontalNav from '@/components/layout/AppHorizontalNav.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppTopbar from '@/components/layout/AppTopbar.vue'
import { useAuthStore } from '@/modules/auth/auth.store'
import { useUiStore } from '@/stores/ui.store'

const auth = useAuthStore()
const ui = useUiStore()
const currentYear = new Date().getFullYear()
const appVersion = computed(() => packageInfo.version || '1.0.0')

watch(
  () => auth.user?.user_id || auth.user?.id,
  (userId) => ui.bindUserPreferences(userId),
  { immediate: true },
)
</script>

<template>
  <div
    class="app-shell"
    :class="{
      'app-shell--sidebar-hidden': ui.menuLayout === 'sidebar' && !ui.sidebarOpen,
      'app-shell--horizontal': ui.menuLayout === 'horizontal',
      'app-shell--horizontal-menu-hidden': ui.menuLayout === 'horizontal' && !ui.horizontalMenuOpen,
    }"
  >
    <AppSidebar v-if="ui.menuLayout === 'sidebar' || ui.mobileSidebarOpen" />
    <div class="app-shell__workspace">
      <AppTopbar />
      <AppHorizontalNav
        v-if="ui.menuLayout === 'horizontal' && ui.horizontalMenuOpen && !ui.mobileSidebarOpen"
      />
      <main class="app-main">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
      <footer class="app-footer">
        <span class="app-footer__product">AIMS · Aset & Inventory Management System</span>
        <span class="app-footer__copyright">
          © {{ currentYear }} PT Baraka Sarana Tama. Seluruh hak cipta dilindungi.
        </span>
        <span class="app-footer__version">Versi {{ appVersion }}</span>
      </footer>
    </div>
  </div>
</template>
