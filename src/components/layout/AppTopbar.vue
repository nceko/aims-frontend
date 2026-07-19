<script setup lang="ts">
import { computed, ref } from 'vue'
import { Bell, ChevronDown, LogOut, Menu, Search, UserRound } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth/auth.store'
import { useUiStore } from '@/stores/ui.store'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const profileOpen = ref(false)

const initials = computed(() =>
  auth.displayName
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase(),
)

async function logout() {
  await auth.logout()
  await router.replace('/login')
}
</script>

<template>
  <header class="app-topbar">
    <div class="app-topbar__left">
      <button class="icon-button" aria-label="Buka atau tutup menu" @click="ui.toggleSidebar">
        <Menu :size="22" />
      </button>
      <div class="global-search">
        <Search :size="18" />
        <input type="search" placeholder="Cari menu, item, atau nomor transaksi…" />
        <kbd>⌘ K</kbd>
      </div>
    </div>

    <div class="app-topbar__right">
      <button class="icon-button icon-button--notification" aria-label="Notifikasi">
        <Bell :size="20" />
        <span></span>
      </button>
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
            <UserRound :size="17" /> Profil
          </RouterLink>
          <button type="button" @click="logout"><LogOut :size="17" /> Keluar</button>
        </div>
      </div>
    </div>
  </header>
</template>
