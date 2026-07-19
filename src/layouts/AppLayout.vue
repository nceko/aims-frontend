<script setup lang="ts">
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppTopbar from '@/components/layout/AppTopbar.vue'
import { useUiStore } from '@/stores/ui.store'

const ui = useUiStore()
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--collapsed': ui.sidebarCollapsed }">
    <AppSidebar />
    <div class="app-shell__workspace">
      <AppTopbar />
      <main class="app-main">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
      <footer class="app-footer">
        <span>AIMS · Aset & Inventory Management System</span>
        <span>PT Baraka Sarana Tama</span>
      </footer>
    </div>
  </div>
</template>
