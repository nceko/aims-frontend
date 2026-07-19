import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', () => {
  const sidebarCollapsed = ref(false)
  const mobileSidebarOpen = ref(false)

  function toggleSidebar() {
    if (window.innerWidth < 992) mobileSidebarOpen.value = !mobileSidebarOpen.value
    else sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function closeMobileSidebar() {
    mobileSidebarOpen.value = false
  }

  return { sidebarCollapsed, mobileSidebarOpen, toggleSidebar, closeMobileSidebar }
})
