<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Building2, Layers3, MapPin, RefreshCw } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSelect, { type SelectOption } from '@/components/ui/AppSelect.vue'
import { useAuthStore } from '@/modules/auth/auth.store'
import { errorMessage } from '@/utils/api'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; switched: [] }>()

const auth = useAuthStore()
const form = reactive({ locationId: '', categoryGroupId: '' })
const error = ref('')
const initializing = ref(false)

const locationOptions = computed<SelectOption[]>(() =>
  auth.contextOptions.locations.map((item) => ({ value: item.id, label: item.name })),
)
const categoryOptions = computed<SelectOption[]>(() =>
  auth.contextOptions.categoryGroups.map((item) => ({ value: item.id, label: item.name })),
)
const busy = computed(() => initializing.value || auth.contextLoading || auth.loading)
const valid = computed(() => Boolean(form.locationId) && Boolean(form.categoryGroupId))

function chooseCurrentOrEmpty(options: SelectOption[], current?: number): string {
  const matching = options.find((option) => Number(option.value) === Number(current))
  if (matching) return String(matching.value)
  return options.length === 1 ? String(options[0]?.value ?? '') : ''
}

async function initialize(): Promise<void> {
  error.value = ''
  initializing.value = true
  try {
    const hasCachedOptions =
      auth.contextOptions.locations.length > 0 && auth.contextOptions.categoryGroups.length > 0
    if (!hasCachedOptions) {
      const companyId =
        auth.user?.company_id ?? auth.selectedCompany?.company_id ?? auth.selectedCompany?.id
      await auth.loadContextOptions(companyId ? Number(companyId) : undefined)
    }
    form.locationId = chooseCurrentOrEmpty(locationOptions.value, auth.user?.location_id)
    form.categoryGroupId = chooseCurrentOrEmpty(categoryOptions.value, auth.user?.category_group_id)
  } catch (cause) {
    error.value = errorMessage(cause, 'Pilihan context tidak dapat dimuat.')
  } finally {
    initializing.value = false
  }
}

async function submit(): Promise<void> {
  error.value = ''
  if (!valid.value) {
    error.value = 'Location dan category group wajib dipilih.'
    return
  }
  try {
    await auth.switchContext({
      location_id: Number(form.locationId),
      category_group_id: Number(form.categoryGroupId),
    })
    emit('switched')
    emit('close')
  } catch (cause) {
    error.value = errorMessage(cause, 'Context tidak dapat diubah.')
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) void initialize()
  },
  { immediate: true },
)
</script>

<template>
  <AppModal
    :open="open"
    title="Ganti Context Kerja"
    description="Pilih location dan category group pada company yang sedang aktif. Untuk berpindah company, silakan logout lalu login kembali."
    size="md"
    :busy="busy"
    @close="emit('close')"
  >
    <div v-if="error" class="notice notice--danger">{{ error }}</div>

    <div class="context-company-lock">
      <Building2 :size="18" />
      <div>
        <small>Company aktif</small>
        <strong>{{ auth.user?.company_name || auth.selectedCompany?.company_name || '-' }}</strong>
        <span>Company dikunci selama session aktif.</span>
      </div>
    </div>

    <div class="context-current-summary context-current-summary--two">
      <div>
        <MapPin :size="18" />
        <span
          ><small>Location aktif</small><strong>{{ auth.user?.location_name || '-' }}</strong></span
        >
      </div>
      <div>
        <Layers3 :size="18" />
        <span
          ><small>Category group aktif</small
          ><strong>{{ auth.user?.category_group_name || '-' }}</strong></span
        >
      </div>
    </div>

    <form class="context-switch-form" @submit.prevent="submit">
      <AppSelect
        v-model="form.locationId"
        name="context_location_id"
        label="Location"
        :options="locationOptions"
        :loading="auth.contextLoading || initializing"
        required
      />
      <AppSelect
        v-model="form.categoryGroupId"
        name="context_category_group_id"
        label="Category Group"
        :options="categoryOptions"
        :loading="auth.contextLoading || initializing"
        required
      />
    </form>

    <template #footer>
      <AppButton variant="ghost" :disabled="busy" @click="emit('close')">Batal</AppButton>
      <AppButton :loading="busy" :disabled="!valid" @click="submit">
        <RefreshCw :size="17" /> Terapkan Context
      </AppButton>
    </template>
  </AppModal>
</template>
