<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle2,
  Keyboard,
  PackageCheck,
  Printer,
  QrCode,
  RotateCcw,
  ScanLine,
} from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppConfirmDialog from '@/components/ui/AppConfirmDialog.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/data/StatusBadge.vue'
import GoodsReceiptQrModal, {
  type GoodsReceiptQrLabel,
} from '@/components/data/GoodsReceiptQrModal.vue'
import { executeOperation } from '@/services/api-operations'
import { useAuthStore } from '@/modules/auth/auth.store'
import { errorMessage } from '@/utils/api'

const auth = useAuthStore()

interface ReceiptLine {
  receipt_line_id: string | number
  item_id?: string | number
  item_code?: string
  item_name?: string
  part_number?: string
  tracking_type?: string
  accepted_qty?: number | string
  uom_code?: string
  lot_no?: string
}

interface GoodsReceipt {
  receipt_id?: string | number
  receipt_no?: string
  po_no?: string
  supplier_name?: string
  warehouse_name?: string
  receipt_date?: string
  status?: string
  generated_qr_codes?: unknown
  lines?: ReceiptLine[]
}

interface ScanPreview {
  scan_code: string
  qr_code: string
  receipt_id?: string | number
  receipt_line_id: string | number
  item_id?: string | number
  item_code?: string
  item_name?: string
  part_number?: string
  tracking_type?: string
  qty?: number
  accepted_qty?: number
  uom_code?: string
  lot_no?: string
  status?: string
  valid?: boolean
  already_posted?: boolean
  scanned_at: string
}

interface ScannerControls {
  stop(): void
}

const route = useRoute()
const router = useRouter()
const receiptId = computed(() => String(route.params.id ?? ''))
const receipt = ref<GoodsReceipt | null>(null)
const loading = ref(true)
const posting = ref(false)
const generatingQr = ref(false)
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
const showQrLabels = ref(false)
const showPostConfirmation = ref(false)
const generatedCodes = ref<GoodsReceiptQrLabel[]>([])
const scannedSerials = ref<ScanPreview[]>([])
const qtyDraft = reactive<Record<string, number>>({})
const postedResult = ref<Record<string, unknown> | null>(null)

let scannerControls: ScannerControls | null = null
let lastDetectedCode = ''
let lastDetectedAt = 0

const deviceId = (() => {
  const key = 'aims-scanner-device-id'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const value = `browser-${crypto.randomUUID?.() ?? Date.now()}`
  window.localStorage.setItem(key, value)
  return value
})()

const draftStorageKey = computed(() => `aims-gr-scan-draft:${receiptId.value}`)

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

function normalizeQrLabels(value: unknown): GoodsReceiptQrLabel[] {
  const candidates = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? ((value as Record<string, unknown>).generated_qr_codes ??
        (value as Record<string, unknown>).data ??
        [])
      : []
  if (!Array.isArray(candidates)) return []
  return candidates
    .map((entry) => asRecord(entry))
    .filter((entry) => typeof entry.qr_code === 'string' && entry.qr_code.trim())
    .map((entry) => ({
      unit_id: entry.unit_id as string | number | undefined,
      receipt_line_id: entry.receipt_line_id as string | number | undefined,
      item_id: entry.item_id as string | number | undefined,
      item_code: typeof entry.item_code === 'string' ? entry.item_code : undefined,
      item_name: typeof entry.item_name === 'string' ? entry.item_name : undefined,
      part_id: entry.part_id as string | number | undefined,
      part_number: typeof entry.part_number === 'string' ? entry.part_number : undefined,
      qr_code: String(entry.qr_code),
      status: typeof entry.status === 'string' ? entry.status : undefined,
    }))
}

function mergeQrLabels(...groups: GoodsReceiptQrLabel[][]): GoodsReceiptQrLabel[] {
  const map = new Map<string, GoodsReceiptQrLabel>()
  for (const group of groups) {
    for (const label of group) map.set(label.qr_code, label)
  }
  return [...map.values()]
}

const lines = computed<ReceiptLine[]>(() =>
  Array.isArray(receipt.value?.lines) ? receipt.value.lines : [],
)
const serialLines = computed(() =>
  lines.value.filter((line) => String(line.tracking_type ?? '').toUpperCase() === 'SERIAL'),
)
const qtyLines = computed(() =>
  lines.value.filter((line) => String(line.tracking_type ?? '').toUpperCase() !== 'SERIAL'),
)
const expectedSerialCount = computed(() =>
  serialLines.value.reduce((total, line) => total + toNumber(line.accepted_qty), 0),
)
const scannedSerialCount = computed(() => scannedSerials.value.length)
const expectedQtyCount = computed(() =>
  qtyLines.value.reduce((total, line) => total + toNumber(line.accepted_qty), 0),
)
const confirmedQtyCount = computed(() =>
  qtyLines.value.reduce(
    (total, line) => total + toNumber(qtyDraft[String(line.receipt_line_id)]),
    0,
  ),
)
const serialComplete = computed(() =>
  serialLines.value.every(
    (line) => scannedCountForLine(line.receipt_line_id) === toNumber(line.accepted_qty),
  ),
)
const qtyComplete = computed(() =>
  qtyLines.value.every(
    (line) => toNumber(qtyDraft[String(line.receipt_line_id)]) === toNumber(line.accepted_qty),
  ),
)
const canPost = computed(
  () =>
    auth.can('transaction.goods_receipts.post_scanned_to_stock') &&
    receipt.value?.status === 'CHECKED' &&
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
  return scannedSerials.value.filter((scan) => String(scan.receipt_line_id) === String(lineId))
    .length
}

function itemLabel(line: ReceiptLine | ScanPreview): string {
  const name = String(line.item_name ?? line.item_code ?? 'Item')
  const part = String(line.part_number ?? '').trim()
  return part ? `${name} · ${part}` : name
}

function persistDraft(): void {
  if (!receiptId.value || postedResult.value) return
  window.sessionStorage.setItem(
    draftStorageKey.value,
    JSON.stringify({
      serials: scannedSerials.value,
      qty: { ...qtyDraft },
    }),
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
    const key = String(line.receipt_line_id)
    if (!(key in qtyDraft)) qtyDraft[key] = 0
  }
}

async function loadReceipt(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const value = await executeOperation<GoodsReceipt>('FindGoodsReceiptByID', {
      path: { id: receiptId.value },
    })
    receipt.value = value
    generatedCodes.value = normalizeQrLabels(value.generated_qr_codes)
    initializeQtyDraft()
    restoreDraft()
    if (value.status !== 'CHECKED' && value.status !== 'POSTED_TO_STOCK') {
      error.value = `Goods Receipt berstatus ${String(value.status ?? 'UNKNOWN')}. Scan masuk hanya dapat dilakukan setelah status CHECKED.`
    }
  } catch (cause) {
    error.value = errorMessage(cause, 'Detail Goods Receipt tidak dapat dimuat.')
  } finally {
    loading.value = false
    await nextTick()
    inputRef.value?.focus()
  }
}

async function generateQr(): Promise<void> {
  if (!serialLines.value.length) {
    error.value = 'Goods Receipt ini tidak memiliki item SERIAL yang membutuhkan QR.'
    return
  }
  generatingQr.value = true
  error.value = ''
  success.value = ''
  try {
    let generated: GoodsReceiptQrLabel[] = []
    let generationFailure = ''
    try {
      generated = normalizeQrLabels(
        await executeOperation<unknown>('GenerateGoodsReceiptQR', {
          path: { id: receiptId.value },
        }),
      )
    } catch (cause) {
      generationFailure = errorMessage(cause, 'Generate QR gagal diproses.')
    }

    const refreshed = await executeOperation<GoodsReceipt>('FindGoodsReceiptByID', {
      path: { id: receiptId.value },
    })
    receipt.value = refreshed
    generatedCodes.value = mergeQrLabels(
      normalizeQrLabels(refreshed.generated_qr_codes),
      generatedCodes.value,
      generated,
    )
    if (!generatedCodes.value.length) {
      error.value =
        generationFailure ||
        'QR belum dapat dibuat. Pastikan item bertipe SERIAL, accepted quantity lebih dari nol, dan penerimaan sudah CHECKED.'
      return
    }
    success.value = generated.length
      ? `${generated.length} QR baru berhasil dibuat.`
      : generationFailure
        ? `QR yang sudah tersedia berhasil dimuat. Catatan backend: ${generationFailure}`
        : `${generatedCodes.value.length} QR yang sudah tersedia berhasil dimuat.`
    showQrLabels.value = true
  } catch (cause) {
    error.value = errorMessage(cause, 'QR Goods Receipt tidak dapat dimuat.')
  } finally {
    generatingQr.value = false
  }
}

function openQrPreview(): void {
  error.value = ''
  if (!generatedCodes.value.length) {
    error.value = 'Belum ada QR untuk dilihat. Klik Generate & Cetak QR terlebih dahulu.'
    return
  }
  showQrLabels.value = true
}

async function submitScan(rawCode?: string): Promise<void> {
  const code = String(rawCode ?? scanInput.value).trim()
  if (!code || scanning.value || postedResult.value) return
  scanInput.value = ''
  scanNotice.value = ''
  error.value = ''

  if (scannedSerials.value.some((scan) => scan.qr_code === code || scan.scan_code === code)) {
    scanNotice.value = `QR ${code} sudah pernah dipindai pada sesi ini.`
    await nextTick()
    inputRef.value?.focus()
    return
  }

  scanning.value = true
  try {
    const preview = await executeOperation<Record<string, unknown>>('PreviewGoodsReceiptScan', {
      path: { id: receiptId.value },
      body: {
        scan_code: code,
        device_id: deviceId,
        app_version: '1.0.0-web',
      },
    })
    const data = asRecord(preview)
    if (data.valid === false) throw new Error('QR tidak valid untuk Goods Receipt ini.')
    if (data.already_posted === true) throw new Error('QR ini sudah pernah diposting ke stok.')
    if (String(data.tracking_type ?? '').toUpperCase() !== 'SERIAL') {
      throw new Error(
        'Kode yang dipindai bukan unit SERIAL. Item QTY/LOT dikonfirmasi pada tabel quantity.',
      )
    }

    const normalized: ScanPreview = {
      scan_code: String(data.scan_code ?? code),
      qr_code: String(data.qr_code ?? code),
      receipt_id: data.receipt_id as string | number | undefined,
      receipt_line_id: data.receipt_line_id as string | number,
      item_id: data.item_id as string | number | undefined,
      item_code: typeof data.item_code === 'string' ? data.item_code : undefined,
      item_name: typeof data.item_name === 'string' ? data.item_name : undefined,
      part_number: typeof data.part_number === 'string' ? data.part_number : undefined,
      tracking_type: typeof data.tracking_type === 'string' ? data.tracking_type : 'SERIAL',
      qty: toNumber(data.qty) || 1,
      accepted_qty: toNumber(data.accepted_qty),
      uom_code: typeof data.uom_code === 'string' ? data.uom_code : undefined,
      lot_no: typeof data.lot_no === 'string' ? data.lot_no : undefined,
      status: typeof data.status === 'string' ? data.status : undefined,
      valid: data.valid !== false,
      already_posted: data.already_posted === true,
      scanned_at: new Date().toISOString(),
    }
    if (!normalized.receipt_line_id)
      throw new Error('Receipt line dari hasil scan tidak ditemukan.')
    scannedSerials.value = [normalized, ...scannedSerials.value]
    scanNotice.value = `${itemLabel(normalized)} berhasil dipindai.`
    persistDraft()
  } catch (cause) {
    error.value = errorMessage(cause, 'QR tidak dapat divalidasi.')
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

function fillAcceptedQty(line: ReceiptLine): void {
  qtyDraft[String(line.receipt_line_id)] = toNumber(line.accepted_qty)
  persistDraft()
}

function validateQty(line: ReceiptLine): void {
  const key = String(line.receipt_line_id)
  const accepted = toNumber(line.accepted_qty)
  const current = Math.max(0, toNumber(qtyDraft[key]))
  qtyDraft[key] = Math.min(current, accepted)
  persistDraft()
}

function resetDraft(): void {
  scannedSerials.value = []
  for (const line of qtyLines.value) qtyDraft[String(line.receipt_line_id)] = 0
  scanNotice.value = ''
  success.value = ''
  error.value = ''
  window.sessionStorage.removeItem(draftStorageKey.value)
  nextTick(() => inputRef.value?.focus())
}

async function postToStock(): Promise<void> {
  if (!canPost.value || posting.value) return
  posting.value = true
  error.value = ''
  success.value = ''
  try {
    const result = await executeOperation<Record<string, unknown>>(
      'PostScannedGoodsReceiptToStock',
      {
        path: { id: receiptId.value },
        body: {
          device_id: deviceId,
          app_version: '1.0.0-web',
          serial_scans: scannedSerials.value.map((scan) => ({ qr_code: scan.qr_code })),
          qty_scans: qtyLines.value
            .map((line) => ({
              receipt_line_id: line.receipt_line_id,
              qty: toNumber(qtyDraft[String(line.receipt_line_id)]),
            }))
            .filter((line) => line.qty > 0),
        },
      },
    )
    postedResult.value = result
    success.value = 'Seluruh hasil scan berhasil diposting ke stok.'
    window.sessionStorage.removeItem(draftStorageKey.value)
    showPostConfirmation.value = false
    stopCamera()
    await loadReceipt()
  } catch (cause) {
    const message = errorMessage(cause, 'Hasil scan gagal diposting ke stok.')
    error.value = `${message} Transaksi dibatalkan; stok dan status Goods Receipt tidak berubah. Draft scan tetap tersimpan.`
    showPostConfirmation.value = false
  } finally {
    posting.value = false
  }
}

async function startCamera(): Promise<void> {
  cameraError.value = ''
  if (!window.isSecureContext) {
    cameraError.value =
      'Kamera browser hanya dapat digunakan melalui HTTPS atau localhost. Gunakan scanner USB/input manual bila aplikasi dibuka melalui HTTP.'
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
    cameraError.value = errorMessage(
      cause,
      'Kamera gagal diaktifkan. Periksa izin kamera pada browser.',
    )
  } finally {
    cameraStarting.value = false
  }
}

function stopCamera(): void {
  cameraActive.value = false
  scannerControls?.stop()
  scannerControls = null
  const mediaStream = videoRef.value?.srcObject
  if (mediaStream instanceof MediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop())
  }
  if (videoRef.value) videoRef.value.srcObject = null
}

watch(
  () => ({ serials: scannedSerials.value, qty: { ...qtyDraft } }),
  () => persistDraft(),
  { deep: true },
)

onMounted(() => void loadReceipt())
onBeforeUnmount(stopCamera)
</script>

<template>
  <div class="page-stack goods-receipt-scan-page">
    <PageHeader
      title="Scan Masuk"
      description="Pindai seluruh QR barang SERIAL, konfirmasi jumlah barang QTY/LOT, lalu posting satu kali ke stok."
    >
      <template #actions>
        <AppButton variant="ghost" @click="router.push('/procurement/goods-receipts')">
          <ArrowLeft :size="17" /> Kembali
        </AppButton>
      </template>
    </PageHeader>

    <div v-if="error" class="notice notice--danger notice--dismissible" role="alert">
      <span>{{ error }}</span>
      <button type="button" aria-label="Tutup pesan" @click="error = ''">×</button>
    </div>
    <div v-if="success" class="notice notice--success notice--dismissible" role="status">
      <span>{{ success }}</span>
      <button type="button" aria-label="Tutup pesan" @click="success = ''">×</button>
    </div>

    <AppCard v-if="loading" class="scan-loading-card">
      <div class="skeleton" style="height: 120px"></div>
    </AppCard>

    <template v-else-if="receipt">
      <AppCard class="receipt-scan-document-card">
        <div class="receipt-scan-document">
          <div>
            <span>Penerimaan Barang</span>
            <strong>{{ receipt.receipt_no || '-' }}</strong>
          </div>
          <div>
            <span>Pesanan Pembelian</span>
            <strong>{{ receipt.po_no || '-' }}</strong>
          </div>
          <div>
            <span>Pemasok</span>
            <strong>{{ receipt.supplier_name || '-' }}</strong>
          </div>
          <div>
            <span>Gudang Tujuan</span>
            <strong>{{ receipt.warehouse_name || '-' }}</strong>
          </div>
          <div>
            <span>Status</span>
            <StatusBadge :value="receipt.status" />
          </div>
          <div class="receipt-scan-document__qr-actions">
            <AppButton
              v-if="serialLines.length && auth.can('transaction.goods_receipts.generate_qr')"
              variant="secondary"
              :loading="generatingQr"
              :disabled="receipt.status !== 'CHECKED'"
              @click="generateQr"
            >
              <QrCode :size="16" /> Buat & Cetak QR
            </AppButton>
            <AppButton
              v-if="serialLines.length"
              variant="ghost"
              :disabled="!generatedCodes.length"
              @click="openQrPreview"
            >
              <Printer :size="16" /> Lihat / Cetak QR
            </AppButton>
          </div>
        </div>
      </AppCard>

      <div class="receipt-scan-layout">
        <AppCard
          title="Kamera dan input scan"
          subtitle="Arahkan kamera ke QR atau gunakan scanner USB/keyboard."
        >
          <div class="scanner-camera-shell" :class="{ 'is-active': cameraActive }">
            <video ref="videoRef" muted playsinline></video>
            <div v-if="!cameraActive" class="scanner-camera-placeholder">
              <Camera :size="42" />
              <strong>Kamera belum aktif</strong>
              <span>Aktifkan kamera untuk membaca QR secara otomatis.</span>
            </div>
            <div v-else class="scanner-camera-frame" aria-hidden="true"></div>
          </div>

          <div class="scanner-camera-actions">
            <AppButton
              v-if="!cameraActive"
              variant="secondary"
              :loading="cameraStarting"
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
            <label for="scan-code"> <Keyboard :size="15" /> Nilai QR / barcode </label>
            <div>
              <input
                id="scan-code"
                ref="inputRef"
                v-model="scanInput"
                class="field__control"
                type="text"
                autocomplete="off"
                placeholder="Scan atau ketik kode, lalu Enter"
                :disabled="scanning || Boolean(postedResult)"
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
          title="Ringkasan penerimaan"
          subtitle="Posting hanya aktif setelah seluruh item tervalidasi."
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
          <div class="scan-progress-track" aria-label="Kemajuan pemindaian">
            <span :style="{ width: `${completionPercent}%` }"></span>
          </div>

          <div class="scan-readiness" :class="{ 'is-ready': canPost }">
            <PackageCheck :size="22" />
            <div>
              <strong>{{ canPost ? 'Siap diposting ke stok' : 'Validasi belum lengkap' }}</strong>
              <span v-if="!serialComplete">Lengkapi seluruh QR item SERIAL.</span>
              <span v-else-if="!qtyComplete"
                >Konfirmasi jumlah barang QTY/LOT sesuai jumlah yang diterima.</span
              >
              <span v-else>Semua item sudah sesuai dengan penerimaan.</span>
            </div>
          </div>
        </AppCard>
      </div>

      <AppCard
        v-if="qtyLines.length"
        title="Konfirmasi item QTY / LOT"
        subtitle="Masukkan jumlah fisik yang sudah dihitung. Nilainya harus sama dengan jumlah diterima sebelum posting."
        flush
      >
        <div class="scan-table-scroll">
          <table class="scan-workspace-table">
            <thead>
              <tr>
                <th>Barang</th>
                <th>Pelacakan</th>
                <th>Lot</th>
                <th>Jumlah Diterima</th>
                <th>Qty Terverifikasi</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in qtyLines" :key="String(line.receipt_line_id)">
                <td>
                  <strong>{{ itemLabel(line) }}</strong>
                  <small>{{ line.item_code || '-' }}</small>
                </td>
                <td>{{ line.tracking_type || 'QTY' }}</td>
                <td>{{ line.lot_no || '-' }}</td>
                <td>{{ formatNumber(toNumber(line.accepted_qty)) }} {{ line.uom_code || '' }}</td>
                <td>
                  <div class="qty-confirm-control">
                    <input
                      v-model.number="qtyDraft[String(line.receipt_line_id)]"
                      class="field__control"
                      type="number"
                      min="0"
                      :max="toNumber(line.accepted_qty)"
                      step="any"
                      :disabled="Boolean(postedResult)"
                      @change="validateQty(line)"
                    />
                    <button
                      type="button"
                      :disabled="Boolean(postedResult)"
                      @click="fillAcceptedQty(line)"
                    >
                      Gunakan jumlah diterima
                    </button>
                  </div>
                </td>
                <td>
                  <StatusBadge
                    :value="
                      toNumber(qtyDraft[String(line.receipt_line_id)]) ===
                      toNumber(line.accepted_qty)
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
        :subtitle="`${scannedSerialCount} dari ${expectedSerialCount} QR tervalidasi.`"
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
          <span>Aktifkan kamera atau scan menggunakan scanner USB.</span>
        </div>
      </AppCard>

      <div class="scan-workspace-footer">
        <div>
          <strong>{{ receipt.receipt_no }}</strong>
          <span>{{
            canPost ? 'Seluruh hasil scan sudah lengkap.' : 'Selesaikan validasi sebelum posting.'
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
            <PackageCheck :size="17" /> Post ke Stok
          </AppButton>
        </div>
      </div>
    </template>

    <GoodsReceiptQrModal
      :open="showQrLabels"
      :receipt="receipt ? (receipt as Record<string, unknown>) : null"
      :codes="generatedCodes"
      :notice="`${generatedCodes.length} QR siap dilihat atau dicetak.`"
      @close="showQrLabels = false"
    />

    <AppConfirmDialog
      :open="showPostConfirmation"
      title="Post hasil scan ke stok"
      message="Pastikan seluruh barang fisik sudah diperiksa dan sesuai."
      :detail="`${scannedSerialCount} QR SERIAL dan ${formatNumber(confirmedQtyCount)} quantity akan diposting ke ${receipt?.warehouse_name || 'warehouse tujuan'}. Proses ini mengubah saldo stok.`"
      confirm-label="Ya, Post ke Stok"
      tone="warning"
      :busy="posting"
      @close="showPostConfirmation = false"
      @confirm="postToStock"
    />
  </div>
</template>
