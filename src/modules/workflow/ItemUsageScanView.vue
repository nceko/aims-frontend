<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle2,
  ClipboardCheck,
  Keyboard,
  PackageCheck,
  RotateCcw,
  ScanLine,
} from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppConfirmDialog from '@/components/ui/AppConfirmDialog.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/data/StatusBadge.vue'
import { executeOperation } from '@/services/api-operations'
import { useAuthStore } from '@/modules/auth/auth.store'
import { errorMessage } from '@/utils/api'

interface UsageLine {
  usage_line_id: string | number
  item_id?: string | number
  item_code?: string
  item_name?: string
  part_number?: string
  tracking_type?: string
  qty?: number | string
  uom_code?: string
  lot_no?: string
}

interface ItemUsage {
  usage_id?: string | number
  usage_no?: string
  source_request_no?: string
  issue_mode?: string
  warehouse_name?: string
  location_name?: string
  responsibility_name?: string
  used_by_name?: string
  usage_type?: string
  status?: string
  lines?: UsageLine[]
}

interface ScanPreview {
  scan_code: string
  qr_code: string
  usage_line_id: string | number
  item_id?: string | number
  item_code?: string
  item_name?: string
  part_number?: string
  tracking_type?: string
  qty?: number
  uom_code?: string
  lot_no?: string
  status?: string
  valid?: boolean
  scanned_at: string
}

interface ScannerControls {
  stop(): void
}

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const usageId = computed(() => String(route.params.id ?? ''))
const usage = ref<ItemUsage | null>(null)
const loading = ref(true)
const posting = ref(false)
const scanning = ref(false)
const error = ref('')
const success = ref('')
const scanNotice = ref('')
const scanInput = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
const cameraActive = ref(false)
const cameraError = ref('')
const cameraStarting = ref(false)
const showPostConfirmation = ref(false)
const scannedSerials = ref<ScanPreview[]>([])
const qtyDraft = reactive<Record<string, number>>({})
const postedResult = ref<Record<string, unknown> | null>(null)

let scannerControls: ScannerControls | null = null
let lastDetectedCode = ''
let lastDetectedAt = 0

const draftStorageKey = computed(() => `aims-item-usage-scan-draft:${usageId.value}`)

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(value)
}

const lines = computed<UsageLine[]>(() =>
  Array.isArray(usage.value?.lines) ? usage.value.lines : [],
)
const serialLines = computed(() =>
  lines.value.filter((line) => String(line.tracking_type ?? '').toUpperCase() === 'SERIAL'),
)
const qtyLines = computed(() =>
  lines.value.filter((line) => String(line.tracking_type ?? '').toUpperCase() !== 'SERIAL'),
)
const expectedSerialCount = computed(() =>
  serialLines.value.reduce((total, line) => total + toNumber(line.qty), 0),
)
const scannedSerialCount = computed(() => scannedSerials.value.length)
const expectedQtyCount = computed(() =>
  qtyLines.value.reduce((total, line) => total + toNumber(line.qty), 0),
)
const confirmedQtyCount = computed(() =>
  qtyLines.value.reduce((total, line) => total + toNumber(qtyDraft[String(line.usage_line_id)]), 0),
)
const serialComplete = computed(() =>
  serialLines.value.every((line) => scannedCountForLine(line.usage_line_id) === toNumber(line.qty)),
)
const qtyComplete = computed(() =>
  qtyLines.value.every(
    (line) => toNumber(qtyDraft[String(line.usage_line_id)]) === toNumber(line.qty),
  ),
)
const canPost = computed(
  () =>
    auth.can('transaction.item_usages.post') &&
    usage.value?.status === 'DRAFT' &&
    serialComplete.value &&
    qtyComplete.value &&
    expectedSerialCount.value + expectedQtyCount.value > 0 &&
    !postedResult.value,
)
const completionPercent = computed(() => {
  const expected = expectedSerialCount.value + expectedQtyCount.value
  const confirmed = scannedSerialCount.value + confirmedQtyCount.value
  if (expected <= 0) return 0
  return Math.min(100, Math.round((confirmed / expected) * 100))
})

function scannedCountForLine(lineId: string | number): number {
  return scannedSerials.value.filter((scan) => String(scan.usage_line_id) === String(lineId)).length
}

function itemLabel(line: UsageLine | ScanPreview): string {
  const name = String(line.item_name ?? line.item_code ?? 'Barang')
  const part = String(line.part_number ?? '').trim()
  return part ? `${name} · ${part}` : name
}

function persistDraft(): void {
  if (!usageId.value || postedResult.value) return
  window.sessionStorage.setItem(
    draftStorageKey.value,
    JSON.stringify({ serials: scannedSerials.value, qty: { ...qtyDraft } }),
  )
}

function restoreDraft(): void {
  const raw = window.sessionStorage.getItem(draftStorageKey.value)
  if (!raw) return
  try {
    const parsed = JSON.parse(raw) as {
      serials?: ScanPreview[]
      qty?: Record<string, number>
    }
    if (Array.isArray(parsed.serials)) {
      scannedSerials.value = parsed.serials.filter(
        (scan) => scan && typeof scan.qr_code === 'string' && scan.qr_code,
      )
    }
    if (parsed.qty && typeof parsed.qty === 'object') Object.assign(qtyDraft, parsed.qty)
  } catch {
    window.sessionStorage.removeItem(draftStorageKey.value)
  }
}

function initializeQtyDraft(): void {
  for (const line of qtyLines.value) {
    const key = String(line.usage_line_id)
    if (!(key in qtyDraft)) qtyDraft[key] = 0
  }
}

async function loadUsage(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const value = await executeOperation<ItemUsage>('FindItemUsageByID', {
      path: { id: usageId.value },
    })
    usage.value = value
    initializeQtyDraft()
    restoreDraft()
    if (value.status !== 'DRAFT' && value.status !== 'POSTED') {
      error.value = `Pengeluaran berstatus ${String(value.status ?? 'UNKNOWN')}. Proses scan hanya tersedia pada status DRAFT.`
    }
  } catch (cause) {
    error.value = errorMessage(cause, 'Detail pengeluaran barang tidak dapat dimuat.')
  } finally {
    loading.value = false
    await nextTick()
    inputRef.value?.focus()
  }
}

async function submitScan(rawCode?: string): Promise<void> {
  const code = String(rawCode ?? scanInput.value).trim()
  if (!code || scanning.value || postedResult.value) return
  scanInput.value = ''
  scanNotice.value = ''
  error.value = ''

  if (scannedSerials.value.some((scan) => scan.qr_code === code || scan.scan_code === code)) {
    scanNotice.value = `QR ${code} sudah dipindai pada sesi ini.`
    await nextTick()
    inputRef.value?.focus()
    return
  }

  scanning.value = true
  try {
    const preview = await executeOperation<Record<string, unknown>>('PreviewItemUsageScan', {
      path: { id: usageId.value },
      body: { scan_code: code },
    })
    const data = asRecord(preview)
    if (data.valid === false)
      throw new Error('Identitas unit tidak valid untuk pengeluaran barang ini.')
    if (String(data.tracking_type ?? '').toUpperCase() !== 'SERIAL') {
      throw new Error('Kode bukan unit SERIAL. Barang QTY/LOT dikonfirmasi pada tabel quantity.')
    }

    const normalized: ScanPreview = {
      scan_code: String(data.scan_code ?? code),
      qr_code: String(data.qr_code ?? code),
      usage_line_id: data.usage_line_id as string | number,
      item_id: data.item_id as string | number | undefined,
      item_code: typeof data.item_code === 'string' ? data.item_code : undefined,
      item_name: typeof data.item_name === 'string' ? data.item_name : undefined,
      part_number: typeof data.part_number === 'string' ? data.part_number : undefined,
      tracking_type: typeof data.tracking_type === 'string' ? data.tracking_type : 'SERIAL',
      qty: toNumber(data.qty) || 1,
      uom_code: typeof data.uom_code === 'string' ? data.uom_code : undefined,
      lot_no: typeof data.lot_no === 'string' ? data.lot_no : undefined,
      status: typeof data.status === 'string' ? data.status : undefined,
      valid: data.valid !== false,
      scanned_at: new Date().toISOString(),
    }
    if (!normalized.usage_line_id)
      throw new Error('Baris pengeluaran dari hasil scan tidak ditemukan.')
    if (
      scannedCountForLine(normalized.usage_line_id) >=
      toNumber(
        lines.value.find((line) => String(line.usage_line_id) === String(normalized.usage_line_id))
          ?.qty,
      )
    ) {
      throw new Error('Jumlah QR untuk barang ini sudah memenuhi quantity pengeluaran.')
    }
    scannedSerials.value = [normalized, ...scannedSerials.value]
    scanNotice.value = `${itemLabel(normalized)} berhasil divalidasi.`
    persistDraft()
  } catch (cause) {
    error.value = errorMessage(cause, 'Unit barang tidak dapat divalidasi.')
  } finally {
    scanning.value = false
    await nextTick()
    inputRef.value?.focus()
  }
}

function removeScan(qrCode: string): void {
  scannedSerials.value = scannedSerials.value.filter((scan) => scan.qr_code !== qrCode)
  persistDraft()
}

function fillRequestedQty(line: UsageLine): void {
  qtyDraft[String(line.usage_line_id)] = toNumber(line.qty)
  persistDraft()
}

function validateQty(line: UsageLine): void {
  const key = String(line.usage_line_id)
  const expected = toNumber(line.qty)
  const current = Math.max(0, toNumber(qtyDraft[key]))
  qtyDraft[key] = Math.min(current, expected)
  persistDraft()
}

function resetDraft(): void {
  scannedSerials.value = []
  for (const line of qtyLines.value) qtyDraft[String(line.usage_line_id)] = 0
  scanNotice.value = ''
  success.value = ''
  error.value = ''
  window.sessionStorage.removeItem(draftStorageKey.value)
  nextTick(() => inputRef.value?.focus())
}

async function postUsage(): Promise<void> {
  if (!canPost.value || posting.value) return
  posting.value = true
  error.value = ''
  success.value = ''
  try {
    const result = await executeOperation<Record<string, unknown>>('PostItemUsage', {
      path: { id: usageId.value },
      body: {
        serials: scannedSerials.value.map((scan) => ({
          usage_line_id: scan.usage_line_id,
          qr_code: scan.qr_code,
        })),
        qtys: qtyLines.value
          .map((line) => ({
            usage_line_id: line.usage_line_id,
            qty: toNumber(qtyDraft[String(line.usage_line_id)]),
          }))
          .filter((line) => line.qty > 0),
      },
    })
    postedResult.value = result
    success.value = 'Pengeluaran berhasil diposting dan saldo stok sudah diperbarui.'
    window.sessionStorage.removeItem(draftStorageKey.value)
    showPostConfirmation.value = false
    stopCamera()
    await loadUsage()
  } catch (cause) {
    error.value = `${errorMessage(cause, 'Pengeluaran gagal diposting.')} Transaksi dibatalkan dan draft scan tetap tersimpan.`
    showPostConfirmation.value = false
  } finally {
    posting.value = false
  }
}

async function startCamera(): Promise<void> {
  cameraError.value = ''
  if (!window.isSecureContext) {
    cameraError.value =
      'Kamera hanya dapat digunakan melalui HTTPS atau localhost. Gunakan scanner USB atau input manual bila aplikasi dibuka melalui HTTP.'
    return
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = 'Browser ini tidak menyediakan akses kamera.'
    return
  }

  cameraStarting.value = true
  try {
    const video = videoRef.value
    if (!video) throw new Error('Elemen kamera tidak tersedia.')
    const { BrowserQRCodeReader } = await import('@zxing/browser')
    const reader = new BrowserQRCodeReader(undefined, {
      delayBetweenScanAttempts: 180,
      delayBetweenScanSuccess: 900,
    })
    scannerControls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
      const value = result?.getText().trim()
      const now = Date.now()
      if (!value || (value === lastDetectedCode && now - lastDetectedAt <= 2500)) return
      lastDetectedCode = value
      lastDetectedAt = now
      void submitScan(value)
    })
    cameraActive.value = true
  } catch (cause) {
    stopCamera()
    cameraError.value = errorMessage(cause, 'Kamera gagal diaktifkan. Periksa izin kamera.')
  } finally {
    cameraStarting.value = false
  }
}

function stopCamera(): void {
  cameraActive.value = false
  scannerControls?.stop()
  scannerControls = null
  const mediaStream = videoRef.value?.srcObject
  if (mediaStream instanceof MediaStream) mediaStream.getTracks().forEach((track) => track.stop())
  if (videoRef.value) videoRef.value.srcObject = null
}

watch(
  () => ({ serials: scannedSerials.value, qty: { ...qtyDraft } }),
  () => persistDraft(),
  { deep: true },
)

onMounted(() => void loadUsage())
onBeforeUnmount(stopCamera)
</script>

<template>
  <div class="page-stack goods-receipt-scan-page item-usage-scan-page">
    <PageHeader
      title="Scan Pengeluaran Barang"
      description="Pindai QR barang SERIAL, konfirmasi quantity barang QTY/LOT, lalu posting satu kali untuk mengurangi stok."
    >
      <template #actions>
        <AppButton variant="ghost" @click="router.push('/inventory/item-usages')">
          <ArrowLeft :size="16" /> Kembali
        </AppButton>
      </template>
    </PageHeader>

    <div v-if="error" class="notice notice--danger">{{ error }}</div>
    <div v-if="success" class="notice notice--success">{{ success }}</div>

    <AppCard v-if="loading" class="scan-loading-card">Memuat detail pengeluaran…</AppCard>

    <template v-else-if="usage">
      <AppCard class="receipt-scan-document-card">
        <div class="receipt-scan-document">
          <div>
            <span>Nomor Pengeluaran</span>
            <strong>{{ usage.usage_no || '-' }}</strong>
          </div>
          <div>
            <span>Permintaan</span>
            <strong>{{ usage.source_request_no || 'Pengambilan langsung' }}</strong>
          </div>
          <div>
            <span>Gudang</span>
            <strong>{{ usage.warehouse_name || '-' }}</strong>
          </div>
          <div>
            <span>Digunakan Oleh</span>
            <strong>{{ usage.used_by_name || usage.responsibility_name || '-' }}</strong>
          </div>
          <div>
            <span>Jenis Penggunaan</span>
            <strong>{{ String(usage.usage_type || '-').replaceAll('_', ' ') }}</strong>
          </div>
          <div class="receipt-scan-document__qr-actions">
            <StatusBadge :value="usage.status || 'UNKNOWN'" />
          </div>
        </div>
      </AppCard>

      <div class="receipt-scan-layout">
        <AppCard
          title="Kamera dan input scan"
          subtitle="Gunakan kamera, scanner USB, atau masukkan QR, nomor seri, maupun asset tag."
        >
          <div class="scanner-camera-shell" :class="{ 'is-active': cameraActive }">
            <video ref="videoRef" muted playsinline></video>
            <div v-if="!cameraActive" class="scanner-camera-placeholder">
              <Camera :size="42" />
              <strong>Kamera belum aktif</strong>
              <span>Aktifkan kamera untuk membaca QR unit barang secara otomatis.</span>
            </div>
            <div v-else class="scanner-camera-frame" aria-hidden="true"></div>
          </div>

          <div class="scanner-camera-actions">
            <AppButton
              v-if="!cameraActive"
              variant="secondary"
              :loading="cameraStarting"
              :disabled="usage.status !== 'DRAFT'"
              @click="startCamera"
            >
              <Camera :size="16" /> Aktifkan Kamera
            </AppButton>
            <AppButton v-else variant="ghost" @click="stopCamera">
              <CameraOff :size="16" /> Matikan Kamera
            </AppButton>
          </div>
          <p v-if="cameraError" class="scanner-help scanner-help--warning">{{ cameraError }}</p>

          <form class="scanner-manual-entry" @submit.prevent="submitScan()">
            <label for="usage-scan-code"><Keyboard :size="15" /> QR / nomor seri / asset tag</label>
            <div>
              <input
                id="usage-scan-code"
                ref="inputRef"
                v-model="scanInput"
                class="field__control"
                type="text"
                autocomplete="off"
                placeholder="Pindai atau ketik identitas unit, lalu Enter"
                :disabled="scanning || Boolean(postedResult) || usage.status !== 'DRAFT'"
              />
              <AppButton type="submit" :loading="scanning" :disabled="!scanInput.trim()">
                <ScanLine :size="16" /> Validasi Scan
              </AppButton>
            </div>
          </form>
          <p v-if="scanNotice" class="scanner-help scanner-help--success">
            <CheckCircle2 :size="15" /> {{ scanNotice }}
          </p>
        </AppCard>

        <AppCard
          title="Ringkasan pengeluaran"
          subtitle="Posting aktif setelah seluruh barang sesuai dengan dokumen pengeluaran."
        >
          <div class="scan-summary-grid">
            <div>
              <span>Kemajuan</span>
              <strong>{{ completionPercent }}%</strong>
            </div>
            <div>
              <span>QR SERIAL</span>
              <strong>{{ scannedSerialCount }} / {{ expectedSerialCount }}</strong>
            </div>
            <div>
              <span>Qty / LOT</span>
              <strong
                >{{ formatNumber(confirmedQtyCount) }} /
                {{ formatNumber(expectedQtyCount) }}</strong
              >
            </div>
            <div>
              <span>Total baris</span>
              <strong>{{ lines.length }}</strong>
            </div>
          </div>
          <div class="scan-progress-track" aria-label="Kemajuan validasi pengeluaran">
            <span :style="{ width: `${completionPercent}%` }"></span>
          </div>

          <div class="scan-readiness" :class="{ 'is-ready': canPost }">
            <ClipboardCheck :size="22" />
            <div>
              <strong>{{ canPost ? 'Siap diposting' : 'Validasi belum lengkap' }}</strong>
              <span v-if="!serialComplete">Lengkapi seluruh QR barang SERIAL.</span>
              <span v-else-if="!qtyComplete">Konfirmasi quantity barang QTY/LOT.</span>
              <span v-else>Semua barang sudah sesuai dengan dokumen pengeluaran.</span>
            </div>
          </div>
        </AppCard>
      </div>

      <AppCard
        v-if="qtyLines.length"
        title="Konfirmasi barang QTY / LOT"
        subtitle="Masukkan quantity fisik yang akan dikeluarkan. Nilainya harus sama dengan quantity pada dokumen sebelum posting."
        flush
      >
        <div class="scan-table-scroll">
          <table class="scan-workspace-table">
            <thead>
              <tr>
                <th>Barang</th>
                <th>Pelacakan</th>
                <th>Lot</th>
                <th>Jumlah Dokumen</th>
                <th>Qty Terverifikasi</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in qtyLines" :key="String(line.usage_line_id)">
                <td>
                  <strong>{{ itemLabel(line) }}</strong>
                  <small>{{ line.item_code || '-' }}</small>
                </td>
                <td>{{ line.tracking_type || 'QTY' }}</td>
                <td>{{ line.lot_no || '-' }}</td>
                <td>{{ formatNumber(toNumber(line.qty)) }} {{ line.uom_code || '' }}</td>
                <td>
                  <div class="qty-confirm-control">
                    <input
                      v-model.number="qtyDraft[String(line.usage_line_id)]"
                      class="field__control"
                      type="number"
                      min="0"
                      :max="toNumber(line.qty)"
                      step="any"
                      :disabled="Boolean(postedResult)"
                      @change="validateQty(line)"
                    />
                    <button
                      type="button"
                      :disabled="Boolean(postedResult)"
                      @click="fillRequestedQty(line)"
                    >
                      Gunakan jumlah dokumen
                    </button>
                  </div>
                </td>
                <td>
                  <StatusBadge
                    :value="
                      toNumber(qtyDraft[String(line.usage_line_id)]) === toNumber(line.qty)
                        ? 'VALID'
                        : 'PENDING'
                    "
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>

      <AppCard
        v-if="serialLines.length"
        title="QR SERIAL yang sudah dipindai"
        :subtitle="`${scannedSerialCount} dari ${expectedSerialCount} unit tervalidasi.`"
        flush
      >
        <div v-if="scannedSerials.length" class="scan-table-scroll">
          <table class="scan-workspace-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Nilai QR</th>
                <th>Barang</th>
                <th>Nomor Part</th>
                <th>Waktu Pindai</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(scan, index) in scannedSerials" :key="scan.qr_code">
                <td>{{ scannedSerials.length - index }}</td>
                <td>
                  <code>{{ scan.qr_code }}</code>
                </td>
                <td>
                  <strong>{{ scan.item_name || scan.item_code || '-' }}</strong>
                  <small>{{ scan.item_code || '-' }}</small>
                </td>
                <td>{{ scan.part_number || '-' }}</td>
                <td>{{ new Date(scan.scanned_at).toLocaleTimeString('id-ID') }}</td>
                <td><StatusBadge value="VALID" /></td>
                <td>
                  <button
                    class="scan-remove-button"
                    type="button"
                    :disabled="Boolean(postedResult)"
                    @click="removeScan(scan.qr_code)"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="scan-empty-state">
          <ScanLine :size="34" />
          <strong>Belum ada QR dipindai</strong>
          <span>Aktifkan kamera atau gunakan scanner USB untuk mulai memindai.</span>
        </div>
      </AppCard>

      <div class="scan-workspace-footer">
        <div>
          <strong>{{ usage.usage_no }}</strong>
          <span>{{
            canPost ? 'Seluruh barang sudah tervalidasi.' : 'Selesaikan validasi sebelum posting.'
          }}</span>
        </div>
        <div>
          <AppButton
            variant="ghost"
            :disabled="posting || Boolean(postedResult)"
            @click="resetDraft"
          >
            <RotateCcw :size="16" /> Reset Scan
          </AppButton>
          <AppButton :disabled="!canPost" :loading="posting" @click="showPostConfirmation = true">
            <PackageCheck :size="17" /> Post Pengeluaran
          </AppButton>
        </div>
      </div>
    </template>

    <AppConfirmDialog
      :open="showPostConfirmation"
      title="Post pengeluaran barang"
      message="Pastikan barang fisik, quantity, dan penerima sudah sesuai."
      :detail="`${scannedSerialCount} QR SERIAL dan ${formatNumber(confirmedQtyCount)} quantity akan dikeluarkan dari ${usage?.warehouse_name || 'gudang sumber'}. Saldo stok akan berkurang setelah proses ini.`"
      confirm-label="Ya, Post Pengeluaran"
      tone="warning"
      :busy="posting"
      @close="showPostConfirmation = false"
      @confirm="postUsage"
    />
  </div>
</template>
