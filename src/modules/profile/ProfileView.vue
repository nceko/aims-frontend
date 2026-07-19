<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RefreshCw } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppSelect, { type SelectOption } from '@/components/ui/AppSelect.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StructuredData from '@/components/data/StructuredData.vue'
import { useAuthStore } from '@/modules/auth/auth.store'
import { errorMessage } from '@/utils/api'

const auth = useAuthStore()
const form = reactive({
  locationId: String(auth.user?.location_id ?? ''),
  categoryGroupId: String(auth.user?.category_group_id ?? ''),
})
const message = ref('')
const error = ref('')
const locationOptions = computed<SelectOption[]>(() =>
  auth.contextOptions.locations.map((item) => ({ value: item.id, label: item.name })),
)
const categoryOptions = computed<SelectOption[]>(() =>
  auth.contextOptions.categoryGroups.map((item) => ({ value: item.id, label: item.name })),
)
const canSwitch = computed(
  () => locationOptions.value.length > 0 && categoryOptions.value.length > 0,
)

async function switchContext(): Promise<void> {
  message.value = ''
  error.value = ''
  try {
    await auth.switchContext({
      location_id: Number(form.locationId),
      category_group_id: Number(form.categoryGroupId),
    })
    message.value =
      'Context aktif berhasil diperbarui. Data pada seluruh modul kini mengikuti context baru.'
  } catch (cause) {
    error.value = errorMessage(cause, 'Context tidak dapat diubah.')
  }
}
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Profil & Context"
      description="Informasi akun, role, permission, dan context kerja yang aktif."
    />
    <div v-if="error" class="notice notice--danger">{{ error }}</div>
    <div v-if="message" class="notice notice--success">{{ message }}</div>

    <AppCard title="Profil pengguna"><StructuredData :value="auth.user" /></AppCard>

    <AppCard
      v-if="canSwitch"
      title="Ganti Context"
      subtitle="Pilihan berasal dari akses company, location, dan category group yang diberikan kepada akun Anda."
    >
      <form class="restore-form" @submit.prevent="switchContext">
        <AppSelect v-model="form.locationId" label="Location" :options="locationOptions" required />
        <AppSelect
          v-model="form.categoryGroupId"
          label="Category Group"
          :options="categoryOptions"
          required
        />
        <AppButton
          type="submit"
          :loading="auth.loading"
          :disabled="!form.locationId || !form.categoryGroupId"
        >
          <RefreshCw :size="17" /> Aktifkan Context
        </AppButton>
      </form>
    </AppCard>

    <AppCard
      title="Permission aktif"
      subtitle="Menu dan tindakan frontend ditentukan dari permission berikut."
    >
      <div class="permission-chip-list">
        <span v-for="permission in [...auth.permissions].sort()" :key="permission">{{
          permission
        }}</span>
      </div>
    </AppCard>
  </div>
</template>
