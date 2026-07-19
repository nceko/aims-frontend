<script setup lang="ts">
import { computed, ref } from 'vue'
import { RotateCcw } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { executeOperation } from '@/services/api-operations'
import { errorMessage } from '@/utils/api'

const resources = [
  ['RestoreCompany', 'Company'],
  ['RestoreLocationType', 'Tipe Lokasi'],
  ['RestoreLocation', 'Location'],
  ['RestoreWarehouse', 'Warehouse'],
  ['RestoreCategoryGroup', 'Category Group'],
  ['RestoreCategory', 'Category'],
  ['RestoreUOM', 'UOM'],
  ['RestoreBrand', 'Brand'],
  ['RestoreSupplier', 'Supplier'],
  ['RestoreItem', 'Item'],
  ['RestoreItemPartNumber', 'Part Number'],
  ['RestoreItemUOMConversion', 'Konversi UOM'],
  ['RestoreItemSupplier', 'Supplier Item'],
  ['RestoreUser', 'User'],
] as const
const operationId = ref('')
const id = ref('')
const loading = ref(false)
const message = ref('')
const error = ref('')
const options = computed(() => resources.map(([value, label]) => ({ value, label })))
async function restore() {
  error.value = ''
  message.value = ''
  loading.value = true
  try {
    await executeOperation(operationId.value, { path: { id: id.value } })
    message.value = 'Data berhasil dipulihkan. Silakan periksa kembali halaman master terkait.'
    id.value = ''
  } catch (cause) {
    error.value = errorMessage(cause, 'Data tidak dapat dipulihkan.')
  } finally {
    loading.value = false
  }
}
</script>
<template>
  <div class="page-stack">
    <PageHeader
      title="Recycle Bin"
      description="Pulihkan data soft delete berdasarkan jenis resource dan ID data."
    />
    <div v-if="error" class="notice notice--danger">{{ error }}</div>
    <div v-if="message" class="notice notice--success">{{ message }}</div>
    <AppCard
      title="Restore soft-deleted data"
      subtitle="Backend belum menyediakan daftar recycle bin terpadu; gunakan ID dari audit log atau database."
    >
      <form class="restore-form" @submit.prevent="restore">
        <AppSelect v-model="operationId" label="Jenis Data" :options="options" required />
        <AppInput v-model="id" label="ID Data" type="text" required />
        <AppButton type="submit" :loading="loading" :disabled="!operationId || !id"
          ><RotateCcw :size="17" /> Restore</AppButton
        >
      </form>
    </AppCard>
  </div>
</template>
