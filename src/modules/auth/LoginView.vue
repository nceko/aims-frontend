<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect, { type SelectOption } from '@/components/ui/AppSelect.vue'
import AppLogo from '@/components/layout/AppLogo.vue'
import { useAuthStore } from './auth.store'
import { errorMessage } from '@/utils/api'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const stage = ref<'credentials' | 'context'>('credentials')
const showPassword = ref(false)
const error = ref('')
const successMessage = computed(() =>
  route.query.password_changed === '1'
    ? 'Password berhasil diubah. Silakan login kembali menggunakan password baru.'
    : '',
)
const form = reactive({
  companyId: '',
  identity: '',
  password: '',
  locationId: '',
  categoryGroupId: '',
})

const companyOptions = computed<SelectOption[]>(() =>
  auth.companies.map((company) => ({
    value: company.id_company ?? company.company_id ?? company.id ?? '',
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

    // Jangan biarkan browser menampilkan company pertama tanpa menyinkronkan state Vue.
    // Jika hanya ada satu company, pilih otomatis supaya form benar-benar memiliki nilainya.
    if (!form.companyId && auth.companies.length === 1) {
      const company = auth.companies[0]
      form.companyId = String(company?.id_company ?? company?.company_id ?? company?.id ?? '')
    }
  } catch (cause) {
    error.value = errorMessage(cause, 'Daftar perusahaan tidak dapat dimuat.')
  }
})

async function submitCredentials(event: SubmitEvent) {
  error.value = ''

  // Ambil currentTarget sebelum operasi async. Nilai event.currentTarget dapat menjadi null
  // setelah event handler melewati await/microtask. FormData juga membaca autofill browser.
  const formElement = event.currentTarget as HTMLFormElement | null
  if (!formElement) {
    error.value = 'Form login tidak dapat dibaca. Muat ulang halaman lalu coba kembali.'
    return
  }

  const formData = new FormData(formElement)
  form.companyId = String(formData.get('company_id') ?? form.companyId).trim()
  form.identity = String(formData.get('identity') ?? form.identity).trim()
  form.password = String(formData.get('password') ?? form.password)

  const companyId = Number(form.companyId)
  if (!Number.isFinite(companyId) || companyId <= 0 || !form.identity || !form.password) {
    error.value = 'Perusahaan, email/NIB, dan password wajib diisi.'
    return
  }

  try {
    await auth.login({
      company_id: companyId,
      identity: form.identity,
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

async function submitContext(event: SubmitEvent) {
  error.value = ''

  const formElement = event.currentTarget as HTMLFormElement | null
  if (!formElement) {
    error.value = 'Form context tidak dapat dibaca. Muat ulang halaman lalu coba kembali.'
    return
  }
  const formData = new FormData(formElement)

  form.locationId = String(formData.get('location_id') ?? form.locationId).trim()
  form.categoryGroupId = String(formData.get('category_group_id') ?? form.categoryGroupId).trim()

  const locationId = Number(form.locationId)
  const categoryGroupId = Number(form.categoryGroupId)
  if (
    !Number.isFinite(locationId) ||
    locationId <= 0 ||
    !Number.isFinite(categoryGroupId) ||
    categoryGroupId <= 0
  ) {
    error.value = 'Location dan category group wajib dipilih.'
    return
  }

  try {
    await auth.switchContext({
      location_id: locationId,
      category_group_id: categoryGroupId,
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
          <span class="auth-kicker"> <ShieldCheck :size="18" /> Integrated Operations </span>
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
        <div class="auth-mobile-logo">
          <AppLogo />
        </div>
        <span class="auth-panel__eyebrow">Selamat datang</span>
        <h2>{{ stage === 'credentials' ? 'Masuk ke AIMS' : 'Pilih Context Akses' }}</h2>
        <p>
          {{
            stage === 'credentials'
              ? 'Gunakan akun yang telah diberikan oleh administrator.'
              : 'Pilih Category Group dan location yang akan digunakan.'
          }}
        </p>

        <div v-if="successMessage" class="notice notice--success" role="status">
          {{ successMessage }}
        </div>
        <div v-if="error" class="auth-error" role="alert">{{ error }}</div>

        <form v-if="stage === 'credentials'" class="auth-form" @submit.prevent="submitCredentials">
          <AppSelect
            v-model="form.companyId"
            name="company_id"
            label="Perusahaan"
            :options="companyOptions"
            required
          />
          <AppInput
            v-model="form.identity"
            name="identity"
            label="Email / NIB"
            type="text"
            inputmode="text"
            autocomplete="username"
            required
          />
          <div class="password-field">
            <AppInput
              v-model="form.password"
              name="password"
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
          <AppButton type="submit" :loading="auth.loading">
            <LockKeyhole :size="18" /> Masuk
          </AppButton>
        </form>

        <form v-else class="auth-form" @submit.prevent="submitContext">
          <AppSelect
            v-model="form.categoryGroupId"
            name="category_group_id"
            label="Category Group"
            :options="categoryOptions"
            required
          />
          <AppSelect
            v-model="form.locationId"
            name="location_id"
            label="Location"
            :options="locationOptions"
            required
          />
          <AppButton type="submit" :loading="auth.loading"> Aktifkan context </AppButton>
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
