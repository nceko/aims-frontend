<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle2,
  Keyboard,
  PackageCheck,
  RotateCcw,
  ScanLine,
  Trash2,
} from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppConfirmDialog from '@/components/ui/AppConfirmDialog.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/data/StatusBadge.vue'
import { executeOperation } from '@/services/api-operations'
import { errorMessage } from '@/utils/api'

type ScanMode = 'picking' | 'keluar' | 'masuk'

interface DeliveryLine {
  delivery_line_id: string | number
  item_code?: string
  item_name?: string
  part_number?: string
  tracking_type?: string
  lot_no?: string
  uom_code?: string
  planned_qty?: number
  picked_qty?: number
  packed_qty?: number
  shipped_qty?: number
  line_status?: string
  received_qty?: number
}

interface DeliveryOrder {
  delivery_id: string | number
  delivery_no?: string
  request_no?: string
  from_warehouse?: string
  from_warehouse_name?: string
  to_warehouse?: string
  to_warehouse_name?: string
  from_location?: string
  to_location?: string
  status?: string
  lines?: DeliveryLine[]
}

interface StockLotOption {
  lot_no: string
  qty_available: number
}

interface ScanPreview {
  scan_code: string
  qr_code: string
  delivery_line_id: string | number
  item_code?: string
  item_name?: string
  part_number?: string
  tracking_type?: string
  lot_no?: string
  uom_code?: string
  qty: number
  status?: string
  available_lots?: StockLotOption[]
  scanned_at: string
}

const props = defineProps<{ mode: ScanMode }>()
const route = useRoute()
const router = useRouter()
const deliveryId = computed(() => String(route.params.id ?? ''))
const delivery = ref<DeliveryOrder | null>(null)
const loading = ref(true)
const scanning = ref(false)
const posting = ref(false)
const error = ref('')
const success = ref('')
const scanNotice = ref('')
const scanInput = ref('')
const scannedSerials = ref<ScanPreview[]>([])
const qtyDraft = reactive<Record<string, number>>({})
const qtyScanCode = reactive<Record<string, string>>({})
const qtyLotNo = reactive<Record<string, string>>({})
const qtyAvailableLots = reactive<Record<string, StockLotOption[]>>({})
const inputRef = ref<HTMLInputElement | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
const cameraActive = ref(false)
const cameraStarting = ref(false)
const cameraError = ref('')
const showPostConfirmation = ref(false)
const postedResult = ref<Record<string, unknown> | null>(null)
let scannerControls: { stop: () => void } | null = null
let lastDetectedCode = ''
let lastDetectedAt = 0

const deviceId = (() => {
  const key = 'aims.perangkat-pemindai'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const value = `web-${crypto.randomUUID?.() ?? Date.now()}`
  window.localStorage.setItem(key, value)
  return value
})()

const isPicking = computed(() => props.mode === 'picking')
const isOutbound = computed(() => props.mode === 'keluar')
const pickingCompletedStatuses = [
  'PACKING',
  'READY_TO_SHIP',
  'SHIPPED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'RECEIVED_BY_DESTINATION',
]
const outboundCompletedStatuses = [
  'SHIPPED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'RECEIVED_BY_DESTINATION',
  'COMPLETED',
]
const inboundCompletedStatuses = ['RECEIVED', 'RECEIVED_BY_DESTINATION', 'COMPLETED']
const currentStatus = computed(() => String(delivery.value?.status ?? '').toUpperCase())
const isPickingCompleted = computed(
  () => isPicking.value && pickingCompletedStatuses.includes(currentStatus.value),
)
const isOutboundCompleted = computed(
  () => isOutbound.value && outboundCompletedStatuses.includes(currentStatus.value),
)
const isInboundCompleted = computed(
  () =>
    !isPicking.value && !isOutbound.value && inboundCompletedStatuses.includes(currentStatus.value),
)
const isWorkflowCompleted = computed(
  () => isPickingCompleted.value || isOutboundCompleted.value || isInboundCompleted.value,
)
const title = computed(() =>
  isPicking.value
    ? 'Scan Picking Barang'
    : isOutbound.value
      ? 'Konfirmasi Pengiriman'
      : 'Scan Barang Masuk',
)
const actionLabel = computed(() =>
  isPicking.value
    ? 'Konfirmasi Picking'
    : isOutbound.value
      ? 'Kirim Barang'
      : 'Terima Barang di Gudang Tujuan',
)
const previewOperation = computed(() =>
  isPicking.value || isOutbound.value
    ? 'PreviewDeliveryOrderScanOut'
    : 'PreviewDeliveryOrderReceive',
)
const postOperation = computed(() =>
  isPicking.value
    ? 'ConfirmDeliveryOrderPicking'
    : isOutbound.value
      ? 'PostDeliveryOrderScannedOut'
      : 'PostDeliveryOrderReceived',
)
const draftStorageKey = computed(() => `aims.delivery-scan.${props.mode}.${deliveryId.value}`)
const lines = computed(() => (Array.isArray(delivery.value?.lines) ? delivery.value!.lines! : []))
const serialLines = computed(() =>
  lines.value.filter((line) => String(line.tracking_type ?? '').toUpperCase() === 'SERIAL'),
)
const qtyLines = computed(() =>
  lines.value.filter((line) => String(line.tracking_type ?? '').toUpperCase() !== 'SERIAL'),
)

function number(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatNumber(value: unknown): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(number(value))
}

function documentQty(line: DeliveryLine): number {
  if (isPicking.value) return number(line.planned_qty)
  if (isOutbound.value) return number(line.packed_qty) || number(line.planned_qty)
  return Math.max(number(line.shipped_qty), number(line.received_qty))
}

function targetQty(line: DeliveryLine): number {
  if (isPicking.value || isOutbound.value) return documentQty(line)
  return Math.max(0, number(line.shipped_qty) - number(line.received_qty))
}

function itemLabel(line: DeliveryLine | ScanPreview): string {
  const name = String(line.item_name ?? line.item_code ?? 'Barang')
  const part = String(line.part_number ?? '').trim()
  return part ? `${name} · ${part}` : name
}

function serialCount(lineId: string | number): number {
  return scannedSerials.value.filter((scan) => String(scan.delivery_line_id) === String(lineId))
    .length
}

const expectedSerialCount = computed(() =>
  serialLines.value.reduce((total, line) => total + documentQty(line), 0),
)
const scannedSerialCount = computed(() => scannedSerials.value.length)
const persistedPickedSerialCount = computed(() =>
  serialLines.value.reduce((total, line) => total + number(line.picked_qty), 0),
)
const persistedPickedQtyCount = computed(() =>
  qtyLines.value.reduce((total, line) => total + number(line.picked_qty), 0),
)
const previouslyReceivedSerialCount = computed(() =>
  serialLines.value.reduce((total, line) => total + number(line.received_qty), 0),
)
const previouslyReceivedQtyCount = computed(() =>
  qtyLines.value.reduce((total, line) => total + number(line.received_qty), 0),
)
const expectedQtyCount = computed(() =>
  qtyLines.value.reduce((total, line) => total + documentQty(line), 0),
)
const confirmedQtyCount = computed(() =>
  qtyLines.value.reduce(
    (total, line) => total + number(qtyDraft[String(line.delivery_line_id)]),
    0,
  ),
)
const serialComplete = computed(() =>
  serialLines.value.every((line) => serialCount(line.delivery_line_id) === targetQty(line)),
)
const qtyComplete = computed(() =>
  qtyLines.value.every((line) => {
    const key = String(line.delivery_line_id)
    const tracking = String(line.tracking_type ?? '').toUpperCase()
    const lotReady = tracking !== 'LOT' || Boolean(qtyLotNo[key] || line.lot_no)
    return Boolean(qtyScanCode[key]) && lotReady && number(qtyDraft[key]) === targetQty(line)
  }),
)
const hasDraft = computed(() => scannedSerialCount.value > 0 || confirmedQtyCount.value > 0)
const canPost = computed(() => {
  if (!delivery.value || postedResult.value) return false
  if (isOutbound.value) {
    return String(delivery.value.status ?? '').toUpperCase() === 'READY_TO_SHIP'
  }
  if (isPicking.value) return serialComplete.value && qtyComplete.value
  return (
    hasDraft.value &&
    qtyLines.value.every((line) => {
      const key = String(line.delivery_line_id)
      if (!number(qtyDraft[key])) return true
      const tracking = String(line.tracking_type ?? '').toUpperCase()
      return (
        Boolean(qtyScanCode[key]) && (tracking !== 'LOT' || Boolean(qtyLotNo[key] || line.lot_no))
      )
    })
  )
})
const displayedSerialCount = computed(() => {
  if (isOutbound.value) return expectedSerialCount.value
  if (isPickingCompleted.value) return persistedPickedSerialCount.value
  if (!isPicking.value && !isOutbound.value) {
    return previouslyReceivedSerialCount.value + scannedSerialCount.value
  }
  return scannedSerialCount.value
})
const displayedQtyCount = computed(() => {
  if (isOutbound.value) return expectedQtyCount.value
  if (isPickingCompleted.value) return persistedPickedQtyCount.value
  if (!isPicking.value && !isOutbound.value) {
    return previouslyReceivedQtyCount.value + confirmedQtyCount.value
  }
  return confirmedQtyCount.value
})
const completionPercent = computed(() => {
  if (isWorkflowCompleted.value) return 100
  if (isOutbound.value) return canPost.value ? 100 : 0
  const expected = expectedSerialCount.value + expectedQtyCount.value
  if (!expected) return 0
  const current = isPicking.value
    ? scannedSerialCount.value + confirmedQtyCount.value
    : displayedSerialCount.value + displayedQtyCount.value
  return Math.round((Math.min(expected, current) / expected) * 100)
})

function persistDraft(): void {
  if (!deliveryId.value || postedResult.value) return
  window.sessionStorage.setItem(
    draftStorageKey.value,
    JSON.stringify({
      serials: scannedSerials.value,
      qty: { ...qtyDraft },
      qtyScanCode: { ...qtyScanCode },
      qtyLotNo: { ...qtyLotNo },
      qtyAvailableLots: { ...qtyAvailableLots },
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
      qtyScanCode?: Record<string, string>
      qtyLotNo?: Record<string, string>
      qtyAvailableLots?: Record<string, StockLotOption[]>
    }
    if (Array.isArray(parsed.serials)) {
      scannedSerials.value = parsed.serials.filter((scan) => scan?.qr_code)
    }
    if (parsed.qty && typeof parsed.qty === 'object') Object.assign(qtyDraft, parsed.qty)
    if (parsed.qtyScanCode && typeof parsed.qtyScanCode === 'object')
      Object.assign(qtyScanCode, parsed.qtyScanCode)
    if (parsed.qtyLotNo && typeof parsed.qtyLotNo === 'object')
      Object.assign(qtyLotNo, parsed.qtyLotNo)
    if (parsed.qtyAvailableLots && typeof parsed.qtyAvailableLots === 'object')
      Object.assign(qtyAvailableLots, parsed.qtyAvailableLots)
  } catch {
    window.sessionStorage.removeItem(draftStorageKey.value)
  }
}

function initializeQtyDraft(): void {
  for (const line of qtyLines.value) {
    const key = String(line.delivery_line_id)
    if (!(key in qtyDraft)) qtyDraft[key] = 0
    if (line.lot_no && !(key in qtyLotNo)) qtyLotNo[key] = line.lot_no
  }
}

async function loadDelivery(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    delivery.value = await executeOperation<DeliveryOrder>('FindDeliveryOrderByID', {
      path: { id: deliveryId.value },
    })
    initializeQtyDraft()
    restoreDraft()
    const loadedStatus = String(delivery.value.status ?? '').toUpperCase()
    const allowed = isPicking.value
      ? ['PICKING', ...pickingCompletedStatuses]
      : isOutbound.value
        ? ['READY_TO_SHIP', ...outboundCompletedStatuses]
        : ['SHIPPED', 'PARTIALLY_RECEIVED', ...inboundCompletedStatuses]
    if (!allowed.includes(loadedStatus)) {
      error.value = `Status Surat Jalan saat ini ${String(delivery.value.status ?? 'tidak diketahui')}. Proses ${title.value.toLowerCase()} belum dapat dilakukan.`
    } else if (isPicking.value && pickingCompletedStatuses.includes(loadedStatus)) {
      success.value =
        'Picking sudah selesai dikonfirmasi. Barang dapat dilanjutkan ke proses packing.'
    } else if (isOutbound.value && outboundCompletedStatuses.includes(loadedStatus)) {
      success.value = 'Barang sudah dikirim dan tercatat sebagai barang dalam perjalanan.'
    } else if (
      !isPicking.value &&
      !isOutbound.value &&
      inboundCompletedStatuses.includes(loadedStatus)
    ) {
      success.value = 'Barang sudah diterima dan stok gudang tujuan telah diperbarui.'
    }
  } catch (cause) {
    error.value = errorMessage(cause, 'Detail Surat Jalan tidak dapat dimuat.')
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
  error.value = ''
  scanNotice.value = ''
  if (scannedSerials.value.some((scan) => scan.qr_code === code || scan.scan_code === code)) {
    scanNotice.value = `QR ${code} sudah dipindai pada sesi ini.`
    await nextTick()
    inputRef.value?.focus()
    return
  }
  scanning.value = true
  try {
    const data = await executeOperation<Record<string, unknown>>(previewOperation.value, {
      path: { id: deliveryId.value },
      body: { scan_code: code, device_id: deviceId, app_version: '1.0.0-web' },
    })
    if (data.valid === false) throw new Error('Kode tidak valid untuk Surat Jalan ini.')
    const trackingType = String(data.tracking_type ?? '').toUpperCase()
    if (trackingType !== 'SERIAL') {
      const lineId = String(data.delivery_line_id ?? '')
      const line = qtyLines.value.find((entry) => String(entry.delivery_line_id) === lineId)
      if (!line) throw new Error('QR barang tidak sesuai dengan Surat Jalan ini.')
      qtyScanCode[lineId] = String(data.qr_code ?? data.scan_code ?? code)
      qtyAvailableLots[lineId] = Array.isArray(data.available_lots)
        ? (data.available_lots as StockLotOption[]).map((lot) => ({
            lot_no: String(lot.lot_no ?? ''),
            qty_available: number(lot.qty_available),
          }))
        : []
      if (line.lot_no) qtyLotNo[lineId] = line.lot_no
      scanNotice.value = `${itemLabel(line)} berhasil divalidasi. Tentukan lot bila diperlukan, lalu isi jumlah fisik.`
      persistDraft()
      return
    }
    const normalized: ScanPreview = {
      scan_code: String(data.scan_code ?? code),
      qr_code: String(data.qr_code ?? code),
      delivery_line_id: data.delivery_line_id as string | number,
      item_code: typeof data.item_code === 'string' ? data.item_code : undefined,
      item_name: typeof data.item_name === 'string' ? data.item_name : undefined,
      part_number: typeof data.part_number === 'string' ? data.part_number : undefined,
      tracking_type: 'SERIAL',
      lot_no: typeof data.lot_no === 'string' ? data.lot_no : undefined,
      uom_code: typeof data.uom_code === 'string' ? data.uom_code : undefined,
      qty: number(data.qty) || 1,
      status: typeof data.status === 'string' ? data.status : undefined,
      scanned_at: new Date().toISOString(),
    }
    if (!normalized.delivery_line_id) throw new Error('Baris Surat Jalan tidak ditemukan.')
    const line = serialLines.value.find(
      (entry) => String(entry.delivery_line_id) === String(normalized.delivery_line_id),
    )
    if (!line) throw new Error('Unit tidak termasuk dalam daftar barang Surat Jalan ini.')
    if (serialCount(line.delivery_line_id) >= targetQty(line)) {
      throw new Error(`Jumlah SERIAL untuk ${itemLabel(line)} sudah lengkap.`)
    }
    scannedSerials.value = [normalized, ...scannedSerials.value]
    scanNotice.value = `${itemLabel(normalized)} berhasil divalidasi.`
    persistDraft()
  } catch (cause) {
    error.value = errorMessage(cause, 'QR tidak dapat divalidasi.')
  } finally {
    scanning.value = false
    await nextTick()
    inputRef.value?.focus()
  }
}

function validateQty(line: DeliveryLine): void {
  const key = String(line.delivery_line_id)
  qtyDraft[key] = Math.min(Math.max(0, number(qtyDraft[key])), targetQty(line))
  persistDraft()
}

function fillTargetQty(line: DeliveryLine): void {
  qtyDraft[String(line.delivery_line_id)] = targetQty(line)
  persistDraft()
}

function removeScan(qrCode: string): void {
  scannedSerials.value = scannedSerials.value.filter((scan) => scan.qr_code !== qrCode)
  persistDraft()
}

function resetDraft(): void {
  scannedSerials.value = []
  for (const line of qtyLines.value) {
    const key = String(line.delivery_line_id)
    qtyDraft[key] = 0
    delete qtyScanCode[key]
    delete qtyLotNo[key]
    delete qtyAvailableLots[key]
  }
  error.value = ''
  success.value = ''
  scanNotice.value = ''
  window.sessionStorage.removeItem(draftStorageKey.value)
  nextTick(() => inputRef.value?.focus())
}

async function postDelivery(): Promise<void> {
  if (!canPost.value || posting.value) return
  posting.value = true
  error.value = ''
  success.value = ''
  try {
    postedResult.value = await executeOperation<Record<string, unknown>>(postOperation.value, {
      path: { id: deliveryId.value },
      body: {
        device_id: deviceId,
        app_version: '1.0.0-web',
        serial_scans: isOutbound.value
          ? []
          : scannedSerials.value.map((scan) => ({ qr_code: scan.qr_code })),
        qty_scans: isOutbound.value
          ? []
          : qtyLines.value
              .map((line) => ({
                delivery_line_id: line.delivery_line_id,
                scan_code: qtyScanCode[String(line.delivery_line_id)],
                lot_no: qtyLotNo[String(line.delivery_line_id)] || line.lot_no || undefined,
                qty: number(qtyDraft[String(line.delivery_line_id)]),
              }))
              .filter((line) => line.qty > 0),
      },
    })
    success.value = isPicking.value
      ? 'Picking berhasil dikonfirmasi dan barang siap masuk proses packing.'
      : isOutbound.value
        ? 'Barang berhasil dikeluarkan dan status pengiriman diperbarui.'
        : 'Barang berhasil diterima di gudang tujuan.'
    window.sessionStorage.removeItem(draftStorageKey.value)
    showPostConfirmation.value = false
    stopCamera()
    await loadDelivery()
  } catch (cause) {
    error.value = `${errorMessage(cause, `${title.value} gagal diposting.`)} Transaksi dibatalkan dan draft scan tetap tersimpan.`
    showPostConfirmation.value = false
  } finally {
    posting.value = false
  }
}

async function startCamera(): Promise<void> {
  cameraError.value = ''
  if (!window.isSecureContext) {
    cameraError.value = 'Kamera hanya tersedia melalui HTTPS atau localhost.'
    return
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = 'Browser ini tidak menyediakan akses kamera.'
    return
  }
  cameraStarting.value = true
  try {
    if (!videoRef.value) throw new Error('Elemen kamera tidak tersedia.')
    const { BrowserQRCodeReader } = await import('@zxing/browser')
    const reader = new BrowserQRCodeReader(undefined, {
      delayBetweenScanAttempts: 180,
      delayBetweenScanSuccess: 900,
    })
    scannerControls = await reader.decodeFromVideoDevice(undefined, videoRef.value, (result) => {
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
    cameraError.value = errorMessage(cause, 'Kamera gagal diaktifkan. Periksa izin browser.')
  } finally {
    cameraStarting.value = false
  }
}

function stopCamera(): void {
  cameraActive.value = false
  scannerControls?.stop()
  scannerControls = null
  const stream = videoRef.value?.srcObject
  if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop())
  if (videoRef.value) videoRef.value.srcObject = null
}

watch(
  () => ({
    serials: scannedSerials.value,
    qty: { ...qtyDraft },
    qtyScanCode: { ...qtyScanCode },
    qtyLotNo: { ...qtyLotNo },
    qtyAvailableLots: { ...qtyAvailableLots },
  }),
  () => persistDraft(),
  { deep: true },
)
watch(
  () => props.mode,
  () => {
    resetDraft()
    void loadDelivery()
  },
)
onMounted(() => void loadDelivery())
onBeforeUnmount(stopCamera)
</script>

<template>
  <div class="page-stack goods-receipt-scan-page">
    <PageHeader
      :title="title"
      :description="
        isPicking
          ? 'Ambil barang dari rak, pindai setiap unit SERIAL, dan pindai satu QR barang untuk QTY/LOT sebelum mengisi jumlah.'
          : isOutbound
            ? 'Hasil scan picking dan packing sudah tersimpan. Periksa ringkasan lalu konfirmasi pengiriman tanpa scan ulang.'
            : 'Pindai setiap unit SERIAL dan satu QR barang QTY/LOT yang tiba di gudang tujuan.'
      "
    >
      <template #actions>
        <AppButton variant="ghost" @click="router.push('/inventory/delivery-orders')">
          <ArrowLeft :size="17" /> Kembali
        </AppButton>
      </template>
    </PageHeader>

    <div v-if="error" class="notice notice--danger notice--dismissible" role="alert">
      <span>{{ error }}</span
      ><button type="button" aria-label="Tutup pesan" @click="error = ''">×</button>
    </div>
    <div v-if="success" class="notice notice--success notice--dismissible" role="status">
      <span>{{ success }}</span
      ><button type="button" aria-label="Tutup pesan" @click="success = ''">×</button>
    </div>

    <AppCard v-if="loading"><div class="skeleton" style="height: 120px"></div></AppCard>

    <template v-else-if="delivery">
      <AppCard class="receipt-scan-document-card">
        <div class="receipt-scan-document">
          <div>
            <span>Surat Jalan</span><strong>{{ delivery.delivery_no || '-' }}</strong>
          </div>
          <div>
            <span>Permintaan Barang</span><strong>{{ delivery.request_no || '-' }}</strong>
          </div>
          <div>
            <span>Gudang Asal</span
            ><strong>{{ delivery.from_warehouse_name || delivery.from_warehouse || '-' }}</strong>
          </div>
          <div>
            <span>Gudang Tujuan</span
            ><strong>{{ delivery.to_warehouse_name || delivery.to_warehouse || '-' }}</strong>
          </div>
          <div><span>Status</span><StatusBadge :value="delivery.status" /></div>
        </div>
      </AppCard>

      <AppCard
        v-if="isPickingCompleted"
        title="Picking sudah selesai"
        subtitle="Hasil pemindaian telah tersimpan dan tidak perlu dipindai ulang. Lanjutkan melalui aksi Selesai Packing pada daftar Surat Jalan."
      >
        <div class="scan-readiness is-ready">
          <PackageCheck :size="24" />
          <div>
            <strong
              >{{ formatNumber(displayedSerialCount + displayedQtyCount) }} barang berhasil
              diambil</strong
            >
            <span
              >Status Surat Jalan saat ini {{ delivery.status }}. Data hasil picking sudah menjadi
              sumber proses packing.</span
            >
          </div>
        </div>
        <div class="scan-table-scroll">
          <table class="scan-workspace-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Barang</th>
                <th>Part Number</th>
                <th>Pelacakan</th>
                <th>Satuan</th>
                <th>Jumlah Diambil</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, index) in lines" :key="String(line.delivery_line_id)">
                <td>{{ index + 1 }}</td>
                <td>
                  <strong>{{ itemLabel(line) }}</strong
                  ><small>{{ line.item_code || '-' }}</small>
                </td>
                <td>{{ line.part_number || '-' }}</td>
                <td>{{ line.tracking_type || 'QTY' }}</td>
                <td>{{ line.uom_code || '-' }}</td>
                <td>
                  <strong>{{ formatNumber(line.picked_qty) }}</strong>
                </td>
                <td><StatusBadge :value="line.line_status || 'PICKED'" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>

      <AppCard
        v-if="isOutbound"
        title="Ringkasan barang siap dikirim"
        subtitle="Data berasal dari hasil picking dan packing yang sudah dikonfirmasi. Tidak perlu memindai barang kembali."
      >
        <div class="scan-summary-grid">
          <div>
            <span>Kesiapan</span><strong>{{ completionPercent }}%</strong>
          </div>
          <div>
            <span>Unit SERIAL</span><strong>{{ formatNumber(expectedSerialCount) }}</strong>
          </div>
          <div>
            <span>Jumlah QTY/LOT</span><strong>{{ formatNumber(expectedQtyCount) }}</strong>
          </div>
          <div>
            <span>Total Baris</span><strong>{{ lines.length }}</strong>
          </div>
        </div>
        <div class="scan-progress-track" aria-label="Kesiapan pengiriman">
          <span :style="{ width: `${completionPercent}%` }"></span>
        </div>
        <div class="scan-readiness" :class="{ 'is-ready': canPost }">
          <PackageCheck :size="22" />
          <div>
            <strong>{{ canPost ? 'Siap dikirim' : 'Belum siap dikirim' }}</strong>
            <span>
              Picking dan packing harus selesai sebelum stok gudang asal diposting sebagai barang
              dalam perjalanan.
            </span>
          </div>
        </div>
      </AppCard>

      <AppCard
        v-if="isOutbound"
        title="Barang siap dikirim"
        subtitle="Periksa kembali barang hasil packing sebelum mengonfirmasi pengiriman."
        flush
      >
        <div class="scan-table-scroll">
          <table class="scan-workspace-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Barang</th>
                <th>Nomor Part</th>
                <th>Pelacakan</th>
                <th>Satuan</th>
                <th>Jumlah Dikemas</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, index) in lines" :key="String(line.delivery_line_id)">
                <td>{{ index + 1 }}</td>
                <td>
                  <strong>{{ itemLabel(line) }}</strong>
                  <small>{{ line.item_code || '-' }}</small>
                </td>
                <td>{{ line.part_number || '-' }}</td>
                <td>{{ line.tracking_type || 'QTY' }}</td>
                <td>{{ line.uom_code || '-' }}</td>
                <td>
                  <strong>{{ formatNumber(documentQty(line)) }}</strong>
                </td>
                <td>
                  <StatusBadge
                    :value="line.line_status || (isOutboundCompleted ? 'SHIPPED' : 'PACKED')"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>

      <template v-if="isInboundCompleted">
        <AppCard
          title="Penerimaan selesai"
          subtitle="Seluruh barang sudah diterima dan stok gudang tujuan telah diperbarui."
        >
          <div class="scan-summary-grid">
            <div><span>Kemajuan</span><strong>100%</strong></div>
            <div>
              <span>Unit SERIAL</span>
              <strong
                >{{ formatNumber(displayedSerialCount) }} /
                {{ formatNumber(expectedSerialCount) }}</strong
              >
            </div>
            <div>
              <span>Qty / LOT</span>
              <strong
                >{{ formatNumber(displayedQtyCount) }} /
                {{ formatNumber(expectedQtyCount) }}</strong
              >
            </div>
            <div>
              <span>Total baris</span><strong>{{ lines.length }}</strong>
            </div>
          </div>
          <div class="scan-progress-track" aria-label="Kemajuan penerimaan">
            <span style="width: 100%"></span>
          </div>
          <div class="scan-readiness is-ready">
            <PackageCheck :size="22" />
            <div>
              <strong>Barang sudah diterima</strong>
              <span>Transaksi selesai. Tidak diperlukan pemindaian ulang.</span>
            </div>
          </div>
        </AppCard>

        <AppCard
          title="Barang yang diterima"
          subtitle="Ringkasan barang yang sudah masuk ke gudang tujuan."
          flush
        >
          <div class="scan-table-scroll">
            <table class="scan-workspace-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Barang</th>
                  <th>Nomor Part</th>
                  <th>Pelacakan</th>
                  <th>Satuan</th>
                  <th>Jumlah Diterima</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(line, index) in lines" :key="String(line.delivery_line_id)">
                  <td>{{ index + 1 }}</td>
                  <td>
                    <strong>{{ itemLabel(line) }}</strong>
                    <small>{{ line.item_code || '-' }}</small>
                  </td>
                  <td>{{ line.part_number || '-' }}</td>
                  <td>{{ line.tracking_type || 'QTY' }}</td>
                  <td>{{ line.uom_code || '-' }}</td>
                  <td>
                    <strong>{{ formatNumber(line.received_qty) }}</strong>
                  </td>
                  <td><StatusBadge value="RECEIVED" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </AppCard>
      </template>

      <div
        v-if="!isOutbound && !isPickingCompleted && !isInboundCompleted"
        class="receipt-scan-layout"
      >
        <AppCard
          title="Kamera dan input scan"
          subtitle="Arahkan kamera ke QR atau gunakan scanner USB/keyboard."
        >
          <div class="scanner-camera-shell" :class="{ 'is-active': cameraActive }">
            <video ref="videoRef" muted playsinline></video>
            <div v-if="!cameraActive" class="scanner-camera-placeholder">
              <Camera :size="42" /><strong>Kamera belum aktif</strong
              ><span>Aktifkan kamera untuk membaca QR.</span>
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
            <AppButton v-else variant="ghost" @click="stopCamera"
              ><CameraOff :size="16" /> Matikan Kamera</AppButton
            >
          </div>
          <p v-if="cameraError" class="scanner-help scanner-help--warning">{{ cameraError }}</p>
          <form class="scanner-manual-entry" @submit.prevent="submitScan()">
            <label for="delivery-scan-code"><Keyboard :size="15" /> Nilai QR / barcode</label>
            <div>
              <input
                id="delivery-scan-code"
                ref="inputRef"
                v-model="scanInput"
                class="field__control"
                type="text"
                autocomplete="off"
                placeholder="Scan atau ketik kode, lalu Enter"
                :disabled="scanning || Boolean(postedResult)"
              />
              <AppButton type="submit" :loading="scanning" :disabled="!scanInput.trim()"
                ><ScanLine :size="16" /> Validasi</AppButton
              >
            </div>
          </form>
          <p v-if="scanNotice" class="scanner-help scanner-help--success">
            <CheckCircle2 :size="15" /> {{ scanNotice }}
          </p>
        </AppCard>

        <AppCard
          :title="isPicking ? 'Ringkasan picking' : 'Ringkasan penerimaan'"
          :subtitle="
            isPicking
              ? 'Simpan picking hanya setelah seluruh barang sesuai dengan Surat Jalan.'
              : 'Posting penerimaan hanya aktif setelah seluruh barang tervalidasi.'
          "
        >
          <div class="scan-summary-grid">
            <div>
              <span>Kemajuan</span><strong>{{ completionPercent }}%</strong>
            </div>
            <div>
              <span>Unit SERIAL</span
              ><strong>{{ displayedSerialCount }} / {{ formatNumber(expectedSerialCount) }}</strong>
            </div>
            <div>
              <span>Jumlah QTY/LOT</span
              ><strong
                >{{ formatNumber(displayedQtyCount) }} /
                {{ formatNumber(expectedQtyCount) }}</strong
              >
            </div>
            <div>
              <span>Total Baris</span><strong>{{ lines.length }}</strong>
            </div>
          </div>
          <div class="scan-progress-track" aria-label="Kemajuan pemindaian">
            <span :style="{ width: `${completionPercent}%` }"></span>
          </div>
          <div class="scan-readiness" :class="{ 'is-ready': canPost }">
            <PackageCheck :size="22" />
            <div>
              <strong>{{ canPost ? 'Siap diposting' : 'Pemindaian belum siap diposting' }}</strong>
              <span v-if="isPicking && !serialComplete">Lengkapi seluruh unit SERIAL.</span>
              <span v-else-if="isPicking && !qtyComplete"
                >Validasi QR dan jumlah barang QTY/LOT.</span
              >
              <span v-else-if="!isPicking && !hasDraft">Pindai barang yang diterima.</span>
              <span v-else>Data pemindaian siap diproses.</span>
            </div>
          </div>
        </AppCard>
      </div>

      <AppCard
        v-if="!isOutbound && !isPickingCompleted && !isInboundCompleted && qtyLines.length"
        title="Konfirmasi barang QTY/LOT"
        :subtitle="
          isPicking
            ? 'Scan QR barang lebih dahulu, lalu isi jumlah yang berhasil diambil dari rak.'
            : 'Scan QR barang lebih dahulu, lalu isi jumlah fisiknya.'
        "
        flush
      >
        <div class="scan-table-scroll">
          <table class="scan-workspace-table">
            <thead>
              <tr>
                <th>Barang</th>
                <th>Pelacakan</th>
                <th>Lot</th>
                <th>Target</th>
                <th>Jumlah Terkonfirmasi</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in qtyLines" :key="String(line.delivery_line_id)">
                <td>
                  <strong>{{ itemLabel(line) }}</strong
                  ><small>{{ line.item_code || '-' }}</small
                  ><small>{{
                    qtyScanCode[String(line.delivery_line_id)]
                      ? 'QR tervalidasi'
                      : 'Scan QR barang terlebih dahulu'
                  }}</small>
                </td>
                <td>{{ line.tracking_type || 'QTY' }}</td>
                <td>
                  <select
                    v-model="qtyLotNo[String(line.delivery_line_id)]"
                    class="field__control scan-lot-select"
                    :disabled="Boolean(line.lot_no) || !qtyScanCode[String(line.delivery_line_id)]"
                    @change="persistDraft"
                  >
                    <option value="">
                      {{
                        String(line.tracking_type || '').toUpperCase() === 'LOT'
                          ? 'Pilih lot/batch *'
                          : 'Otomatis FIFO (opsional)'
                      }}
                    </option>
                    <option
                      v-for="lot in qtyAvailableLots[String(line.delivery_line_id)] || []"
                      :key="lot.lot_no || '__NO_LOT__'"
                      :value="lot.lot_no"
                    >
                      {{ lot.lot_no || 'Tanpa lot' }} · tersedia
                      {{ formatNumber(lot.qty_available) }}
                    </option>
                  </select>
                </td>
                <td>{{ formatNumber(targetQty(line)) }} {{ line.uom_code || '' }}</td>
                <td>
                  <div class="qty-confirm-control">
                    <input
                      v-model.number="qtyDraft[String(line.delivery_line_id)]"
                      class="field__control"
                      type="number"
                      min="0"
                      :max="targetQty(line)"
                      step="any"
                      :disabled="
                        Boolean(postedResult) || !qtyScanCode[String(line.delivery_line_id)]
                      "
                      @change="validateQty(line)"
                    />
                    <button
                      type="button"
                      :disabled="
                        Boolean(postedResult) || !qtyScanCode[String(line.delivery_line_id)]
                      "
                      @click="fillTargetQty(line)"
                    >
                      Gunakan target
                    </button>
                  </div>
                </td>
                <td>
                  <StatusBadge
                    :value="
                      qtyScanCode[String(line.delivery_line_id)] &&
                      (String(line.tracking_type || '').toUpperCase() !== 'LOT' ||
                        Boolean(qtyLotNo[String(line.delivery_line_id)] || line.lot_no)) &&
                      number(qtyDraft[String(line.delivery_line_id)]) === targetQty(line)
                        ? 'VALID'
                        : number(qtyDraft[String(line.delivery_line_id)]) > 0
                          ? 'PARTIAL'
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
        v-if="!isOutbound && !isPickingCompleted && !isInboundCompleted && serialLines.length"
        title="Unit SERIAL yang sudah dipindai"
        :subtitle="`${scannedSerialCount} dari ${formatNumber(expectedSerialCount)} unit tervalidasi.`"
        flush
      >
        <div v-if="scannedSerials.length" class="scan-table-scroll">
          <table class="scan-workspace-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Kode QR</th>
                <th>Barang</th>
                <th>Nomor Part</th>
                <th>Waktu Pindai</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(scan, index) in scannedSerials" :key="scan.qr_code">
                <td>{{ index + 1 }}</td>
                <td>
                  <code>{{ scan.qr_code }}</code>
                </td>
                <td>
                  <strong>{{ itemLabel(scan) }}</strong
                  ><small>{{ scan.item_code || '-' }}</small>
                </td>
                <td>{{ scan.part_number || '-' }}</td>
                <td>
                  {{
                    new Intl.DateTimeFormat('id-ID', { timeStyle: 'medium' }).format(
                      new Date(scan.scanned_at),
                    )
                  }}
                </td>
                <td>
                  <button
                    class="table-icon-button table-icon-button--danger"
                    type="button"
                    aria-label="Hapus hasil pindai"
                    :disabled="Boolean(postedResult)"
                    @click="removeScan(scan.qr_code)"
                  >
                    <Trash2 :size="15" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="scan-empty-state">
          <ScanLine :size="28" /><strong>Belum ada unit SERIAL yang dipindai</strong
          ><span>Hasil validasi akan muncul di sini.</span>
        </div>
      </AppCard>

      <div v-if="!isPickingCompleted" class="scan-workspace-footer">
        <div>
          <strong>{{ delivery.delivery_no || 'Surat Jalan' }}</strong>
          <span v-if="isOutboundCompleted"
            >Barang sudah dikirim dan sedang menuju gudang tujuan.</span
          >
          <span v-else-if="isInboundCompleted"
            >Penerimaan selesai dan stok gudang tujuan sudah diperbarui.</span
          >
          <span v-else-if="isOutbound">
            Konfirmasi pengiriman akan mengurangi stok gudang asal dan mencatat barang dalam
            perjalanan.
          </span>
          <span v-else-if="isPicking">
            {{
              canPost
                ? 'Seluruh barang sudah tervalidasi dan siap disimpan sebagai hasil picking.'
                : 'Lengkapi pemindaian sebelum menyimpan hasil picking.'
            }}
          </span>
          <span v-else>
            {{
              canPost
                ? 'Seluruh barang sudah tervalidasi dan siap diterima ke stok.'
                : 'Lengkapi pemindaian sebelum menerima barang ke stok.'
            }}
          </span>
        </div>
        <div>
          <AppButton
            v-if="!isOutbound && !isWorkflowCompleted"
            variant="ghost"
            :disabled="posting || Boolean(postedResult)"
            @click="resetDraft"
          >
            <RotateCcw :size="16" /> Reset Scan
          </AppButton>
          <AppButton
            v-if="!isWorkflowCompleted"
            :disabled="!canPost"
            :loading="posting"
            @click="showPostConfirmation = true"
          >
            <PackageCheck :size="17" /> {{ actionLabel }}
          </AppButton>
          <AppButton v-else variant="ghost" @click="router.push('/inventory/delivery-orders')">
            <ArrowLeft :size="16" /> Kembali ke Surat Jalan
          </AppButton>
        </div>
      </div>
    </template>

    <AppConfirmDialog
      :open="showPostConfirmation"
      :title="actionLabel"
      :message="
        isPicking
          ? 'Hasil scan akan disimpan sebagai barang yang sudah diambil dari rak dan status berubah ke PACKING.'
          : isOutbound
            ? 'Hasil picking dan packing yang sudah tersimpan akan dipakai. Stok gudang asal berkurang dan barang masuk status dalam perjalanan.'
            : 'Stok gudang tujuan akan bertambah sesuai hasil pemindaian.'
      "
      confirm-label="Ya, Proses Sekarang"
      :loading="posting"
      @close="showPostConfirmation = false"
      @confirm="postDelivery"
    />
  </div>
</template>
