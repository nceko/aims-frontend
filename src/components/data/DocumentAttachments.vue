<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Download, FileText, Paperclip, RefreshCw, Trash2, Upload } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppConfirmDialog from '@/components/ui/AppConfirmDialog.vue'
import { useAuthStore } from '@/modules/auth/auth.store'
import { apiClient } from '@/services/api-client'
import { errorMessage, normalizeList } from '@/utils/api'

interface Attachment {
  attachment_id?: number
  id?: number
  original_name?: string
  mime_type?: string
  size_bytes?: number
  description?: string
  uploaded_by_name?: string
  created_at?: string
}

const props = defineProps<{ entityType: string; entityId: string | number }>()
const auth = useAuthStore()
const items = ref<Attachment[]>([])
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const success = ref('')
const description = ref('')
const pendingDelete = ref<Attachment | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const canRead = computed(() => auth.can('operations.attachments.read'))
const canCreate = computed(() => auth.can('operations.attachments.create'))
const canDelete = computed(() => auth.can('operations.attachments.delete'))
const endpoint = computed(
  () =>
    `/api/v1/documents/${encodeURIComponent(props.entityType)}/${encodeURIComponent(String(props.entityId))}/attachments`,
)

function idOf(item: Attachment): number | undefined {
  return item.attachment_id ?? item.id
}
function formatSize(bytes?: number): string {
  const value = Number(bytes ?? 0)
  if (!value) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}
function formatDate(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
async function load() {
  if (!canRead.value) return
  loading.value = true
  error.value = ''
  try {
    items.value = normalizeList<Attachment>(
      await apiClient.get<unknown>(endpoint.value, { per_page: 100 }),
    )
  } catch (cause) {
    error.value = errorMessage(cause, 'Lampiran tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}
async function upload() {
  const file = fileInput.value?.files?.[0]
  if (!file) {
    error.value = 'Pilih file yang akan diunggah.'
    return
  }
  const form = new FormData()
  form.append('file', file)
  if (description.value.trim()) form.append('description', description.value.trim())
  busy.value = true
  error.value = ''
  success.value = ''
  try {
    await apiClient.postForm(endpoint.value, form)
    if (fileInput.value) fileInput.value.value = ''
    description.value = ''
    success.value = 'Lampiran berhasil diunggah.'
    await load()
  } catch (cause) {
    error.value = errorMessage(cause, 'Lampiran gagal diunggah.')
  } finally {
    busy.value = false
  }
}
async function download(item: Attachment) {
  const id = idOf(item)
  if (!id) return
  busy.value = true
  error.value = ''
  try {
    const response = await apiClient.download(`/api/v1/attachments/${id}/download`)
    const url = URL.createObjectURL(response.blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = item.original_name || `attachment-${id}`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  } catch (cause) {
    error.value = errorMessage(cause, 'Lampiran gagal diunduh.')
  } finally {
    busy.value = false
  }
}
function remove(item: Attachment) {
  if (!idOf(item)) return
  pendingDelete.value = item
}

function closeDeleteConfirm(): void {
  if (!busy.value) pendingDelete.value = null
}

async function confirmDelete(): Promise<void> {
  const item = pendingDelete.value
  const id = item ? idOf(item) : undefined
  if (!item || !id) return
  busy.value = true
  error.value = ''
  success.value = ''
  try {
    await apiClient.delete(`/api/v1/attachments/${id}`)
    pendingDelete.value = null
    success.value = 'Lampiran berhasil dipindahkan ke Recycle Bin.'
    await load()
  } catch (cause) {
    error.value = errorMessage(cause, 'Lampiran gagal dihapus.')
  } finally {
    busy.value = false
  }
}

onMounted(load)
watch(() => [props.entityType, props.entityId], load)
</script>

<template>
  <section v-if="canRead" class="attachments-panel">
    <div class="attachments-panel__header">
      <div>
        <h3><Paperclip :size="18" /> Lampiran Dokumen</h3>
        <p>Dokumen pendukung tersimpan sesuai perusahaan dan konteks aktif.</p>
      </div>
      <button
        class="icon-button"
        type="button"
        :disabled="loading"
        title="Muat ulang"
        @click="load"
      >
        <RefreshCw :size="17" :class="{ spin: loading }" />
      </button>
    </div>
    <div v-if="error" class="notice notice--danger">{{ error }}</div>
    <div v-if="success" class="notice notice--success">{{ success }}</div>
    <form v-if="canCreate" class="attachment-upload" @submit.prevent="upload">
      <input ref="fileInput" type="file" required />
      <input v-model="description" type="text" placeholder="Deskripsi file (opsional)" />
      <AppButton type="submit" :loading="busy"><Upload :size="16" /> Unggah</AppButton>
    </form>
    <div v-if="items.length" class="attachment-list">
      <article v-for="item in items" :key="String(idOf(item))" class="attachment-item">
        <span class="attachment-item__icon"><FileText :size="19" /></span>
        <div class="attachment-item__copy">
          <strong>{{ item.original_name || `Attachment ${idOf(item)}` }}</strong
          ><small
            >{{ item.description || item.mime_type || 'Dokumen' }} ·
            {{ formatSize(item.size_bytes) }} · {{ formatDate(item.created_at) }}</small
          ><small v-if="item.uploaded_by_name">Oleh {{ item.uploaded_by_name }}</small>
        </div>
        <button
          type="button"
          class="table-action"
          title="Download"
          :disabled="busy"
          @click="download(item)"
        >
          <Download :size="16" />
        </button>
        <button
          v-if="canDelete"
          type="button"
          class="table-action table-action--danger"
          title="Hapus"
          :disabled="busy"
          @click="remove(item)"
        >
          <Trash2 :size="16" />
        </button>
      </article>
    </div>
    <p v-else-if="!loading" class="attachments-empty">Belum ada lampiran.</p>

    <AppConfirmDialog
      :open="Boolean(pendingDelete)"
      title="Hapus lampiran"
      :message="`Hapus ${pendingDelete?.original_name || 'lampiran ini'}?`"
      detail="Lampiran mengikuti aturan soft delete backend dan tidak langsung dihapus permanen."
      confirm-label="Ya, hapus"
      tone="danger"
      :busy="busy"
      :layer="4"
      @close="closeDeleteConfirm"
      @confirm="confirmDelete"
    />
  </section>
</template>
