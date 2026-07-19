<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  BadgeCheck,
  Building2,
  KeyRound,
  Layers3,
  MapPin,
  PanelLeft,
  PanelTop,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from '@lucide/vue'
import ChangePasswordModal from '@/components/layout/ChangePasswordModal.vue'
import ContextSwitcherModal from '@/components/layout/ContextSwitcherModal.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { useAuthStore } from '@/modules/auth/auth.store'
import { useUiStore } from '@/stores/ui.store'

const auth = useAuthStore()
const ui = useUiStore()
const contextOpen = ref(false)
const passwordOpen = ref(false)
const permissionsOpen = ref(false)

const initials = computed(() =>
  auth.displayName
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase(),
)
const roles = computed(() => auth.user?.roles ?? [])
const sortedPermissions = computed(() => [...auth.permissions].sort())
const accountStatus = computed(() => (auth.user?.has_context === false ? 'Perlu context' : 'Aktif'))

function contextSwitched(): void {
  window.location.assign('/profile')
}
function passwordChanged(): void {
  window.location.assign('/login?password_changed=1')
}
</script>

<template>
  <div class="page-stack profile-page">
    <PageHeader
      title="Profil Saya"
      description="Informasi akun, context kerja, role, dan hak akses AIMS."
    />

    <section class="profile-hero-card">
      <div class="profile-hero-card__avatar">{{ initials || 'U' }}</div>
      <div class="profile-hero-card__identity">
        <span class="profile-hero-card__eyebrow">Akun AIMS</span>
        <h2>{{ auth.displayName }}</h2>
        <p>{{ auth.user?.email || 'Email tidak tersedia pada profil aktif' }}</p>
        <div class="profile-role-list">
          <span v-if="auth.isSuperAdmin" class="profile-role profile-role--super">
            <ShieldCheck :size="14" /> Super Admin
          </span>
          <span v-for="role in roles" :key="role" class="profile-role">
            <BadgeCheck :size="14" /> {{ role }}
          </span>
          <span v-if="!roles.length && !auth.isSuperAdmin" class="profile-role">User AIMS</span>
        </div>
      </div>
      <div class="profile-hero-card__status">
        <span>Status akun</span>
        <strong><i></i>{{ accountStatus }}</strong>
      </div>
    </section>

    <div class="profile-grid">
      <AppCard title="Informasi Akun" subtitle="Informasi identitas yang aman untuk ditampilkan.">
        <dl class="profile-detail-list">
          <div>
            <dt><UserRound :size="17" /> Nama lengkap</dt>
            <dd>{{ auth.displayName }}</dd>
          </div>
          <div>
            <dt><KeyRound :size="17" /> ID pengguna</dt>
            <dd class="profile-detail-list__mono">
              {{ auth.user?.user_id || auth.user?.id || '-' }}
            </dd>
          </div>
          <div>
            <dt><ShieldCheck :size="17" /> Tipe akses</dt>
            <dd>{{ auth.isSuperAdmin ? 'Global Super Admin' : 'User berdasarkan role' }}</dd>
          </div>
          <div>
            <dt><BadgeCheck :size="17" /> Jumlah permission</dt>
            <dd>{{ sortedPermissions.length }} permission aktif</dd>
          </div>
        </dl>
      </AppCard>

      <AppCard
        title="Context Kerja Aktif"
        subtitle="Data dan transaksi ditampilkan sesuai context berikut."
      >
        <div class="profile-context-list">
          <div>
            <span class="profile-context-list__icon"><Building2 :size="19" /></span>
            <span
              ><small>Company</small><strong>{{ auth.user?.company_name || '-' }}</strong></span
            >
          </div>
          <div>
            <span class="profile-context-list__icon"><MapPin :size="19" /></span>
            <span
              ><small>Location</small><strong>{{ auth.user?.location_name || '-' }}</strong></span
            >
          </div>
          <div>
            <span class="profile-context-list__icon"><Layers3 :size="19" /></span>
            <span
              ><small>Category Group</small
              ><strong>{{ auth.user?.category_group_name || '-' }}</strong></span
            >
          </div>
        </div>
        <AppButton class="profile-context-action" variant="secondary" @click="contextOpen = true">
          <RefreshCw :size="17" /> Ganti Context
        </AppButton>
      </AppCard>
    </div>

    <div class="profile-grid profile-grid--settings">
      <AppCard
        title="Tampilan Menu"
        subtitle="Preferensi ini disimpan khusus untuk akun Anda pada perangkat ini."
      >
        <div class="menu-layout-options" role="radiogroup" aria-label="Posisi menu">
          <button
            type="button"
            :class="{ active: ui.menuLayout === 'sidebar' }"
            @click="ui.setMenuLayout('sidebar')"
          >
            <PanelLeft :size="24" />
            <span
              ><strong>Menu Sidebar</strong
              ><small>Cocok untuk modul banyak dan pekerjaan operasional.</small></span
            >
          </button>
          <button
            type="button"
            :class="{ active: ui.menuLayout === 'horizontal' }"
            @click="ui.setMenuLayout('horizontal')"
          >
            <PanelTop :size="24" />
            <span
              ><strong>Menu di Bawah Topbar</strong
              ><small>Area kerja lebih lebar dan navigasi berbentuk dropdown.</small></span
            >
          </button>
        </div>
      </AppCard>

      <AppCard title="Keamanan Akun" subtitle="Kelola password akun AIMS Anda.">
        <div class="profile-password-card">
          <span><KeyRound :size="22" /></span>
          <div>
            <strong>Ganti password</strong>
            <p>
              Setelah password diubah, seluruh session akan dicabut dan Anda harus login kembali.
            </p>
          </div>
          <AppButton variant="secondary" @click="passwordOpen = true">Ganti Password</AppButton>
        </div>
      </AppCard>
    </div>

    <AppCard
      title="Role & Permission"
      subtitle="Ringkasan hak akses yang diberikan melalui role backend."
    >
      <div class="profile-access-summary">
        <div>
          <span>Role aktif</span>
          <strong>{{ roles.length || (auth.isSuperAdmin ? 1 : 0) }}</strong>
        </div>
        <div>
          <span>Permission aktif</span>
          <strong>{{ sortedPermissions.length }}</strong>
        </div>
        <div>
          <span>Context</span>
          <strong>{{ auth.user?.has_context === false ? 'Belum aktif' : 'Aktif' }}</strong>
        </div>
      </div>

      <button
        class="permission-disclosure"
        type="button"
        @click="permissionsOpen = !permissionsOpen"
      >
        <span>{{
          permissionsOpen ? 'Sembunyikan daftar permission' : 'Lihat daftar permission'
        }}</span>
        <small>{{ sortedPermissions.length }} item</small>
      </button>
      <div v-if="permissionsOpen" class="permission-chip-list permission-chip-list--profile">
        <span v-for="permission in sortedPermissions" :key="permission">{{ permission }}</span>
      </div>
    </AppCard>

    <div class="profile-security-note">
      <ShieldCheck :size="20" />
      <div>
        <strong>Informasi sesi tetap terlindungi</strong>
        <p>
          Access token dan refresh token tidak ditampilkan di halaman profil maupun disimpan sebagai
          bagian dari data profil pengguna.
        </p>
      </div>
    </div>
  </div>

  <ChangePasswordModal
    :open="passwordOpen"
    @close="passwordOpen = false"
    @changed="passwordChanged"
  />

  <ContextSwitcherModal
    :open="contextOpen"
    @close="contextOpen = false"
    @switched="contextSwitched"
  />
</template>
