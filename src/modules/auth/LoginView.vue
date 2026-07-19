<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from '@lucide/vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect, { type SelectOption } from '@/components/ui/AppSelect.vue'
import AppLogo from '@/components/layout/AppLogo.vue'
import { useAuthStore } from './auth.store'
import { errorMessage } from '@/utils/api'

const auth = useAuthStore()
const router = useRouter()
const stage = ref<'credentials' | 'context'>('credentials')
const showPassword = ref(false)
const error = ref('')
const form = reactive({
  companyId: '',
  email: '',
  password: '',
  locationId: '',
  categoryGroupId: '',
})

const companyOptions = computed<SelectOption[]>(() =>
  auth.companies.map((company) => ({
    value: company.company_id ?? company.id ?? '',
    label: company.company_name ?? company.name ?? company.company_code ?? 'Company',
  })),
)
const locationOptions = computed<SelectOption[]>(() =>
  auth.contextOptions.locations.map((item) => ({ value: item.id, label: item.name })),
)
const categoryOptions = computed<SelectOption[]>(() =>
  auth.contextOptions.categoryGroups.map((item) => ({ value: item.id, label: item.name })),
)

onMounted(async () => {
  try {
    await auth.loadCompanies()
  } catch (cause) {
    error.value = errorMessage(cause, 'Daftar perusahaan tidak dapat dimuat.')
  }
})

async function submitCredentials() {
  error.value = ''
  try {
    await auth.login({
      company_id: Number(form.companyId),
      email: form.email.trim(),
      password: form.password,
    })
    const onlyLocation = auth.contextOptions.locations.length === 1
    const onlyCategory = auth.contextOptions.categoryGroups.length === 1
    if (onlyLocation) form.locationId = String(auth.contextOptions.locations[0]?.id ?? '')
    if (onlyCategory) form.categoryGroupId = String(auth.contextOptions.categoryGroups[0]?.id ?? '')
    stage.value = 'context'
  } catch (cause) {
    error.value = errorMessage(cause, 'Login gagal. Periksa kembali kredensial Anda.')
  }
}

async function submitContext() {
  error.value = ''
  try {
    await auth.switchContext({
      location_id: Number(form.locationId),
      category_group_id: Number(form.categoryGroupId),
    })
    await router.replace('/')
  } catch (cause) {
    error.value = errorMessage(cause, 'Context kerja tidak dapat diaktifkan.')
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-showcase">
      <div class="auth-showcase__overlay"></div>
      <div class="auth-showcase__content">
        <AppLogo inverse />
        <div class="auth-showcase__message">
          <span class="auth-kicker"><ShieldCheck :size="18" /> Integrated Operations</span>
          <h1>Kendalikan aset dan inventory dalam satu sistem yang terukur.</h1>
          <p>
            AIMS membantu proses pembelian, penerimaan, stok, distribusi, hingga siklus hidup aset
            berjalan konsisten dan mudah diaudit.
          </p>
        </div>
        <div class="auth-showcase__metrics">
          <div><strong>Realtime</strong><span>Visibility</span></div>
          <div><strong>Traceable</strong><span>Transactions</span></div>
          <div><strong>Secure</strong><span>Access Control</span></div>
        </div>
      </div>
    </section>

    <section class="auth-panel">
      <div class="auth-panel__inner">
        <div class="auth-mobile-logo"><AppLogo /></div>
        <span class="auth-panel__eyebrow">Selamat datang</span>
        <h2>{{ stage === 'credentials' ? 'Masuk ke AIMS' : 'Pilih context kerja' }}</h2>
        <p>
          {{
            stage === 'credentials'
              ? 'Gunakan akun yang telah diberikan oleh administrator.'
              : 'Pilih lokasi dan kelompok kategori yang akan digunakan.'
          }}
        </p>

        <div v-if="error" class="auth-error" role="alert">{{ error }}</div>

        <form v-if="stage === 'credentials'" class="auth-form" @submit.prevent="submitCredentials">
          <AppSelect
            v-model="form.companyId"
            label="Perusahaan"
            :options="companyOptions"
            required
          />
          <AppInput
            v-model="form.email"
            label="Email"
            type="email"
            autocomplete="username"
            required
          />
          <div class="password-field">
            <AppInput
              v-model="form.password"
              label="Password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              required
            />
            <button
              type="button"
              aria-label="Tampilkan password"
              @click="showPassword = !showPassword"
            >
              <EyeOff v-if="showPassword" :size="19" />
              <Eye v-else :size="19" />
            </button>
          </div>
          <AppButton
            type="submit"
            :loading="auth.loading"
            :disabled="!form.companyId || !form.email || !form.password"
          >
            <LockKeyhole :size="18" /> Masuk
          </AppButton>
        </form>

        <form v-else class="auth-form" @submit.prevent="submitContext">
          <AppSelect
            v-model="form.locationId"
            label="Location"
            :options="locationOptions"
            required
          />
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
            Aktifkan context
          </AppButton>
          <button class="auth-back" type="button" @click="stage = 'credentials'">
            Kembali ke login
          </button>
        </form>

        <small class="auth-panel__security"
          >Koneksi Anda dilindungi dan aktivitas akun tercatat.</small
        >
      </div>
    </section>
  </main>
</template>
