<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Eye, EyeOff, KeyRound } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { useAuthStore } from '@/modules/auth/auth.store'
import { errorMessage } from '@/utils/api'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; changed: [] }>()
const auth = useAuthStore()
const form = reactive({ password: '', confirmation: '' })
const showPassword = ref(false)
const showConfirmation = ref(false)
const error = ref('')

const valid = computed(
  () => form.password.length >= 8 && form.password === form.confirmation && !auth.loading,
)

function reset(): void {
  form.password = ''
  form.confirmation = ''
  showPassword.value = false
  showConfirmation.value = false
  error.value = ''
}

async function submit(): Promise<void> {
  error.value = ''
  if (form.password.length < 8) {
    error.value = 'Password baru minimal 8 karakter.'
    return
  }
  if (form.password !== form.confirmation) {
    error.value = 'Konfirmasi password tidak sama.'
    return
  }
  try {
    await auth.changeOwnPassword(form.password)
    emit('changed')
    emit('close')
  } catch (cause) {
    error.value = errorMessage(cause, 'Password tidak dapat diubah.')
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) reset()
  },
)
</script>

<template>
  <AppModal
    :open="open"
    title="Ganti Password"
    description="Buat password baru untuk akun AIMS Anda. Setelah berhasil, seluruh session dicabut dan Anda harus login kembali."
    size="sm"
    :busy="auth.loading"
    @close="emit('close')"
  >
    <div v-if="error" class="notice notice--danger">{{ error }}</div>
    <div class="password-change-note">
      <KeyRound :size="18" />
      <p>Gunakan minimal 8 karakter dan hindari password yang sama dengan akun lain.</p>
    </div>
    <form id="change-password-form" class="password-change-form" @submit.prevent="submit">
      <div class="password-field">
        <AppInput
          v-model="form.password"
          name="new_password"
          label="Password Baru"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          required
        />
        <button
          type="button"
          class="password-field__toggle"
          :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
          @click="showPassword = !showPassword"
        >
          <EyeOff v-if="showPassword" :size="17" />
          <Eye v-else :size="17" />
        </button>
      </div>
      <div class="password-field">
        <AppInput
          v-model="form.confirmation"
          name="password_confirmation"
          label="Konfirmasi Password Baru"
          :type="showConfirmation ? 'text' : 'password'"
          autocomplete="new-password"
          required
        />
        <button
          type="button"
          class="password-field__toggle"
          :aria-label="showConfirmation ? 'Sembunyikan konfirmasi' : 'Tampilkan konfirmasi'"
          @click="showConfirmation = !showConfirmation"
        >
          <EyeOff v-if="showConfirmation" :size="17" />
          <Eye v-else :size="17" />
        </button>
      </div>
    </form>

    <template #footer>
      <AppButton variant="ghost" :disabled="auth.loading" @click="emit('close')">Batal</AppButton>
      <AppButton
        type="submit"
        form="change-password-form"
        :loading="auth.loading"
        :disabled="!valid"
      >
        <KeyRound :size="17" /> Simpan Password
      </AppButton>
    </template>
  </AppModal>
</template>
