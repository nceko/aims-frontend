<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Camera,
  CameraOff,
  CheckCircle2,
  History,
  PackageCheck,
  ScanLine,
  ShoppingBasket,
  Trash2,
} from '@lucide/vue'
import ApiOptionField from '@/components/data/ApiOptionField.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { apiClient } from '@/services/api-client'
import { executeOperation } from '@/services/api-operations'
import { useAuthStore } from '@/modules/auth/auth.store'
import { errorMessage } from '@/utils/api'

interface StockLotOption {
  lot_no: string
  qty_available: number
}

interface DirectScanPreview {
  scan_code: string
  unit_id?: number
  qr_code?: string
  item_id: number
  item_code?: string
  item_name?: string
  tracking_type: string
  part_id?: number
  part_number?: string
  uom_id: number
  uom_code?: string
  lot_no?: string
  qty: number
  status?: string
  valid?: boolean
  available_lots?: StockLotOption[]
}

interface DirectCartLine {
  key: string
  item_id: number
  item_code?: string
  item_name?: string
  tracking_type: string
  part_id?: number
  part_number?: string
  uom_id: number
  uom_code?: string
  lot_no: string
  qty: number
  max_qty: number
  scan_code: string
  serial_qr_codes: string[]
  available_lots: StockLotOption[]
}

interface CreatedUsageLine {
  usage_line_id: number
  item_id: number
  part_id?: number
  uom_id: number
  lot_no?: string
}

interface CreatedUsage {
  usage_id: number
  usage_no?: string
  lines?: CreatedUsageLine[]
}

interface ScannerControls {
  stop(): void
}

interface DirectIssueForm extends Record<string, unknown> {
  warehouse_id: string | number
  usage_type: string
  responsibility_type: string
  responsibility_employee_id: string | number
  responsibility_division_id: string | number
  responsibility_location_id: string | number
  responsibility_vehicle_id: string | number
  notes: string
}

const router = useRouter()
const auth = useAuthStore()
const form = reactive<DirectIssueForm>({
  warehouse_id: '',
  usage_type: 'OPERATIONAL',
  responsibility_type: 'EMPLOYEE',
  responsibility_employee_id: '',
  responsibility_division_id: '',
  responsibility_location_id: '',
  responsibility_vehicle_id: '',
  notes: '',
})
const cart = ref<DirectCartLine[]>([])
const scanInput = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
const scanning = ref(false)
const posting = ref(false)
const cameraStarting = ref(false)
const cameraActive = ref(false)
const message = ref('')
const error = ref('')
const createdUsage = ref<CreatedUsage | null>(null)
let scannerControls: ScannerControls | null = null
let lastDetectedCode = ''
let lastDetectedAt = 0

const responsibilityField = computed(() => {
  switch (String(form.responsibility_type)) {
    case 'LOCATION':
      return 'responsibility_location_id'
    case 'DIVISION':
      return 'responsibility_division_id'
    case 'VEHICLE':
      return 'responsibility_vehicle_id'
    default:
      return 'responsibility_employee_id'
  }
})

const responsibilityLabel = computed(() => {
  switch (String(form.responsibility_type)) {
    case 'LOCATION':
      return 'Lokasi penerima'
    case 'DIVISION':
      return 'Divisi penerima'
    case 'VEHICLE':
      return 'Kendaraan'
    default:
      return 'Karyawan penerima'
  }
})

const totalQty = computed(() =>
  cart.value.reduce((total, line) => total + Number(line.qty || 0), 0),
)
const totalSerial = computed(() =>
  cart.value.reduce((total, line) => total + line.serial_qr_codes.length, 0),
)
const canPost = computed(() => {
  if (!Number(form.warehouse_id) || !Number(form[responsibilityField.value]) || !cart.value.length)
    return false
  return cart.value.every((line) => {
    if (line.tracking_type === 'SERIAL') return line.serial_qr_codes.length > 0
    if (line.tracking_type === 'LOT' && !line.lot_no) return false
    return line.qty > 0 && line.qty <= line.max_qty
  })
})

function normalizeTracking(value: unknown): string {
  return String(value ?? 'QTY')
    .trim()
    .toUpperCase()
}

function normalizeLot(value: unknown): string {
  return String(value ?? '').trim()
}

function sameNullableID(left: unknown, right: unknown): boolean {
  return Number(left || 0) === Number(right || 0)
}

function lineKey(preview: DirectScanPreview): string {
  return [
    preview.item_id,
    preview.part_id ?? 0,
    preview.uom_id,
    normalizeTracking(preview.tracking_type),
  ].join(':')
}

function itemTitle(line: DirectCartLine): string {
  return line.item_name || line.item_code || 'Barang'
}

function setFormOption(field: keyof DirectIssueForm, value: unknown): void {
  form[field] = (typeof value === 'number' || typeof value === 'string' ? value : '') as never
}

function resetResponsibility(): void {
  for (const field of [
    'responsibility_employee_id',
    'responsibility_division_id',
    'responsibility_location_id',
    'responsibility_vehicle_id',
  ]) {
    form[field] = ''
  }
}

async function submitScan(rawCode?: string): Promise<void> {
  const scanCode = String(rawCode ?? scanInput.value).trim()
  if (!scanCode || scanning.value) return
  if (!Number(form.warehouse_id)) {
    error.value = 'Pilih gudang terlebih dahulu sebelum memindai barang.'
    return
  }

  scanning.value = true
  error.value = ''
  message.value = ''
  scanInput.value = ''
  try {
    const preview = await apiClient.post<DirectScanPreview>(
      '/api/v1/item-usages/direct-scan-preview',
      {
        warehouse_id: Number(form.warehouse_id),
        scan_code: scanCode,
      },
    )
    const tracking = normalizeTracking(preview.tracking_type)
    const canonicalCode = String(preview.qr_code || preview.scan_code || scanCode).trim()
    const key = lineKey(preview)
    const existing = cart.value.find((line) => line.key === key)

    if (tracking === 'SERIAL') {
      const alreadyScanned = cart.value.some((line) => line.serial_qr_codes.includes(canonicalCode))
      if (alreadyScanned) throw new Error(`QR ${canonicalCode} sudah ada pada daftar pengambilan.`)

      if (existing) {
        existing.serial_qr_codes.push(canonicalCode)
        existing.qty = existing.serial_qr_codes.length
        existing.max_qty = existing.qty
      } else {
        cart.value.unshift({
          key,
          item_id: Number(preview.item_id),
          item_code: preview.item_code,
          item_name: preview.item_name,
          tracking_type: tracking,
          part_id: preview.part_id,
          part_number: preview.part_number,
          uom_id: Number(preview.uom_id),
          uom_code: preview.uom_code,
          lot_no: '',
          qty: 1,
          max_qty: 1,
          scan_code: canonicalCode,
          serial_qr_codes: [canonicalCode],
          available_lots: [],
        })
      }
    } else {
      const availableLots = Array.isArray(preview.available_lots) ? preview.available_lots : []
      const maxQty = Math.max(0, Number(preview.qty || 0))
      if (existing) {
        existing.qty = Math.min(existing.qty + 1, maxQty)
        existing.max_qty = maxQty
        existing.available_lots = availableLots
      } else {
        const onlyLot =
          tracking === 'LOT' && availableLots.length === 1 ? availableLots[0]?.lot_no || '' : ''
        cart.value.unshift({
          key,
          item_id: Number(preview.item_id),
          item_code: preview.item_code,
          item_name: preview.item_name,
          tracking_type: tracking,
          part_id: preview.part_id,
          part_number: preview.part_number,
          uom_id: Number(preview.uom_id),
          uom_code: preview.uom_code,
          lot_no: onlyLot,
          qty: Math.min(1, maxQty),
          max_qty: maxQty,
          scan_code: canonicalCode,
          serial_qr_codes: [],
          available_lots: availableLots,
        })
      }
    }

    createdUsage.value = null
    message.value = `${preview.item_name || preview.item_code || 'Barang'} berhasil ditambahkan.`
  } catch (cause) {
    error.value = errorMessage(cause, 'Barang tidak dapat divalidasi.')
  } finally {
    scanning.value = false
    await nextTick()
    inputRef.value?.focus()
  }
}

function removeLine(key: string): void {
  cart.value = cart.value.filter((line) => line.key !== key)
  createdUsage.value = null
}

function removeSerial(line: DirectCartLine, qrCode: string): void {
  line.serial_qr_codes = line.serial_qr_codes.filter((value) => value !== qrCode)
  line.qty = line.serial_qr_codes.length
  if (!line.qty) removeLine(line.key)
  createdUsage.value = null
}

function clampQty(line: DirectCartLine): void {
  const qty = Number(line.qty || 0)
  line.qty = Math.max(0, Math.min(qty, line.max_qty))
  createdUsage.value = null
}

function targetPayload(): Record<string, number> {
  const field = responsibilityField.value
  return { [field]: Number(form[field]) }
}

function createPayload(): Record<string, unknown> {
  return {
    issue_mode: 'DIRECT',
    warehouse_id: Number(form.warehouse_id),
    location_id: Number(auth.user?.location_id),
    usage_type: String(form.usage_type),
    responsibility_type: String(form.responsibility_type),
    ...targetPayload(),
    used_by_name: auth.displayName,
    notes: String(form.notes || '').trim() || undefined,
    lines: cart.value.map((line) => ({
      item_id: line.item_id,
      part_id: line.part_id || undefined,
      uom_id: line.uom_id,
      lot_no: line.tracking_type === 'SERIAL' ? undefined : line.lot_no || undefined,
      qty: line.tracking_type === 'SERIAL' ? line.serial_qr_codes.length : line.qty,
    })),
  }
}

function matchCreatedLine(
  cartLine: DirectCartLine,
  lines: CreatedUsageLine[],
): CreatedUsageLine | undefined {
  return lines.find((line) => {
    const baseMatch =
      Number(line.item_id) === cartLine.item_id &&
      sameNullableID(line.part_id, cartLine.part_id) &&
      Number(line.uom_id) === cartLine.uom_id
    if (!baseMatch) return false
    if (cartLine.tracking_type === 'SERIAL') return true
    return normalizeLot(line.lot_no) === normalizeLot(cartLine.lot_no)
  })
}

async function postDirectIssue(): Promise<void> {
  if (!canPost.value || posting.value) return
  posting.value = true
  error.value = ''
  message.value = ''
  try {
    if (!Number(auth.user?.location_id)) throw new Error('Konteks lokasi pengguna belum tersedia.')

    if (!createdUsage.value) {
      createdUsage.value = await executeOperation<CreatedUsage>('CreateItemUsage', {
        body: createPayload(),
      })
    }

    const createdLines = Array.isArray(createdUsage.value.lines) ? createdUsage.value.lines : []
    const serials: Array<{ usage_line_id: number; qr_code: string }> = []
    const qtys: Array<{ usage_line_id: number; scan_code: string; lot_no?: string; qty: number }> =
      []

    for (const line of cart.value) {
      const createdLine = matchCreatedLine(line, createdLines)
      if (!createdLine)
        throw new Error(`Baris ${itemTitle(line)} tidak ditemukan pada draft pengeluaran.`)
      if (line.tracking_type === 'SERIAL') {
        for (const qrCode of line.serial_qr_codes) {
          serials.push({ usage_line_id: createdLine.usage_line_id, qr_code: qrCode })
        }
      } else {
        qtys.push({
          usage_line_id: createdLine.usage_line_id,
          scan_code: line.scan_code,
          lot_no: line.lot_no || undefined,
          qty: line.qty,
        })
      }
    }

    await executeOperation('PostItemUsage', {
      path: { id: createdUsage.value.usage_id },
      body: { serials, qtys },
    })

    message.value = `Pengambilan ${createdUsage.value.usage_no || ''} berhasil dicatat dan stok sudah dikurangi.`
    cart.value = []
    createdUsage.value = null
    form.notes = ''
  } catch (cause) {
    const draftInfo = createdUsage.value?.usage_no
      ? ` Draft ${createdUsage.value.usage_no} tetap tersimpan dan dapat diposting ulang.`
      : ''
    error.value = `${errorMessage(cause, 'Pengambilan langsung gagal diposting.')}${draftInfo}`
  } finally {
    posting.value = false
    await nextTick()
    inputRef.value?.focus()
  }
}

async function startCamera(): Promise<void> {
  error.value = ''
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    error.value =
      'Kamera hanya tersedia melalui HTTPS atau localhost. Gunakan scanner USB atau input manual.'
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
    error.value = errorMessage(cause, 'Kamera gagal diaktifkan.')
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

onBeforeUnmount(stopCamera)
</script>

<template>
  <div class="page-stack direct-issue-page">
    <PageHeader
      title="Pengambilan Langsung"
      description="Pilih penerima, pindai barang seperti proses belanja, periksa jumlah, lalu posting sebelum barang diserahkan."
    >
      <template #actions>
        <AppButton variant="secondary" @click="router.push('/inventory/direct-issues/history')">
          <History :size="16" /> Riwayat
        </AppButton>
      </template>
    </PageHeader>

    <div v-if="error" class="notice notice--error">{{ error }}</div>
    <div v-if="message" class="notice notice--success">{{ message }}</div>

    <section class="panel setup-panel">
      <div class="section-heading">
        <div>
          <h2>Informasi pengambilan</h2>
          <p>Tentukan gudang dan siapa yang menerima barang.</p>
        </div>
      </div>
      <div class="form-grid">
        <label class="field">
          <span>Gudang <b>*</b></span>
          <ApiOptionField
            field-name="warehouse_id"
            :model-value="form.warehouse_id"
            :root-model="form"
            required
            @update:model-value="setFormOption('warehouse_id', $event)"
          />
        </label>
        <label class="field">
          <span>Jenis penggunaan <b>*</b></span>
          <select v-model="form.usage_type">
            <option value="OPERATIONAL">Operasional</option>
            <option value="MAINTENANCE">Perawatan</option>
            <option value="REPAIR">Perbaikan</option>
            <option value="INTERNAL_USE">Pemakaian Internal</option>
            <option value="PROJECT">Proyek</option>
            <option value="OTHER">Lainnya</option>
          </select>
        </label>
        <label class="field">
          <span>Ditujukan kepada <b>*</b></span>
          <select v-model="form.responsibility_type" @change="resetResponsibility">
            <option value="EMPLOYEE">Karyawan</option>
            <option value="DIVISION">Divisi</option>
            <option value="LOCATION">Lokasi</option>
            <option value="VEHICLE">Kendaraan</option>
          </select>
        </label>
        <label class="field">
          <span>{{ responsibilityLabel }} <b>*</b></span>
          <ApiOptionField
            :field-name="responsibilityField"
            :model-value="form[responsibilityField]"
            :root-model="form"
            required
            @update:model-value="setFormOption(responsibilityField, $event)"
          />
        </label>
        <label class="field field--wide">
          <span>Catatan</span>
          <textarea
            v-model="form.notes"
            rows="2"
            placeholder="Keterangan kebutuhan barang (opsional)"
          ></textarea>
        </label>
      </div>
    </section>

    <div class="scan-layout">
      <section class="panel scan-panel">
        <div class="section-heading">
          <div>
            <h2><ScanLine :size="19" /> Scan barang</h2>
            <p>Gunakan kamera, scanner USB, barcode, atau ketik kode QR.</p>
          </div>
          <AppButton
            v-if="!cameraActive"
            variant="secondary"
            :loading="cameraStarting"
            @click="startCamera"
          >
            <Camera :size="16" /> Aktifkan kamera
          </AppButton>
          <AppButton v-else variant="secondary" @click="stopCamera">
            <CameraOff :size="16" /> Matikan kamera
          </AppButton>
        </div>
        <div v-show="cameraActive" class="camera-box">
          <video ref="videoRef" muted playsinline></video>
        </div>
        <form class="scan-form" @submit.prevent="submitScan()">
          <input
            ref="inputRef"
            v-model="scanInput"
            autocomplete="off"
            placeholder="Scan atau ketik kode, lalu Enter"
          />
          <AppButton type="submit" :loading="scanning" :disabled="!Number(form.warehouse_id)">
            <ScanLine :size="16" /> Validasi
          </AppButton>
        </form>
      </section>

      <aside class="panel summary-panel">
        <h2><ShoppingBasket :size="19" /> Ringkasan</h2>
        <div class="summary-grid">
          <div>
            <span>Jenis barang</span><strong>{{ cart.length }}</strong>
          </div>
          <div>
            <span>Total jumlah</span><strong>{{ totalQty }}</strong>
          </div>
          <div>
            <span>Unit serial</span><strong>{{ totalSerial }}</strong>
          </div>
        </div>
        <div class="ready-box" :class="{ 'ready-box--active': canPost }">
          <CheckCircle2 :size="18" />
          <span>{{ canPost ? 'Siap diposting' : 'Lengkapi penerima dan daftar barang' }}</span>
        </div>
      </aside>
    </div>

    <section class="panel cart-panel">
      <div class="section-heading">
        <div>
          <h2><PackageCheck :size="19" /> Barang yang diambil</h2>
          <p>Periksa jumlah fisik sebelum barang diserahkan.</p>
        </div>
      </div>

      <div v-if="!cart.length" class="empty-cart">
        <ShoppingBasket :size="34" />
        <strong>Belum ada barang</strong>
        <span>Pindai QR atau barcode untuk mulai menambahkan barang.</span>
      </div>

      <div v-else class="cart-list">
        <article v-for="line in cart" :key="line.key" class="cart-item">
          <div class="item-main">
            <div class="item-title-row">
              <div>
                <strong>{{ itemTitle(line) }}</strong>
                <span>{{ line.item_code || '-' }} · Part {{ line.part_number || '-' }}</span>
              </div>
              <span class="tracking-chip">{{ line.tracking_type }}</span>
            </div>

            <div v-if="line.tracking_type === 'SERIAL'" class="serial-list">
              <span v-for="qr in line.serial_qr_codes" :key="qr" class="serial-chip">
                {{ qr }}
                <button type="button" aria-label="Hapus QR" @click="removeSerial(line, qr)">
                  ×
                </button>
              </span>
            </div>

            <div v-else class="item-controls">
              <label>
                <span>Jumlah ({{ line.uom_code || 'UOM' }})</span>
                <input
                  v-model.number="line.qty"
                  type="number"
                  min="0.0001"
                  :max="line.max_qty"
                  step="any"
                  @change="clampQty(line)"
                />
                <small>Tersedia {{ line.max_qty }}</small>
              </label>
              <label v-if="line.tracking_type === 'LOT' || line.available_lots.length">
                <span>Lot / Batch <b v-if="line.tracking_type === 'LOT'">*</b></span>
                <select v-model="line.lot_no" @change="createdUsage = null">
                  <option value="">
                    {{ line.tracking_type === 'LOT' ? 'Pilih lot' : 'Otomatis / tanpa lot' }}
                  </option>
                  <option v-for="lot in line.available_lots" :key="lot.lot_no" :value="lot.lot_no">
                    {{ lot.lot_no || 'Tanpa lot' }} — tersedia {{ lot.qty_available }}
                  </option>
                </select>
              </label>
            </div>
          </div>
          <button
            class="remove-button"
            type="button"
            aria-label="Hapus barang"
            @click="removeLine(line.key)"
          >
            <Trash2 :size="17" />
          </button>
        </article>
      </div>
    </section>

    <div class="sticky-action">
      <div>
        <strong>{{ cart.length }} jenis barang · {{ totalQty }} total jumlah</strong>
        <span>Posting terlebih dahulu sebelum barang diserahkan kepada penerima.</span>
      </div>
      <AppButton :loading="posting" :disabled="!canPost" @click="postDirectIssue">
        <PackageCheck :size="17" /> Post Pengambilan
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.direct-issue-page {
  padding-bottom: 96px;
}
.panel {
  background: var(--surface, #fff);
  border: 1px solid var(--border-color, #e3e9f1);
  border-radius: 16px;
  padding: 20px;
}
.notice {
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 13px;
}
.notice--error {
  background: #fff3f2;
  border: 1px solid #f4c9c5;
  color: #a92c20;
}
.notice--success {
  background: #eefaf3;
  border: 1px solid #bee7ce;
  color: #17633a;
}
.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.section-heading h2,
.summary-panel h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
}
.section-heading p {
  margin: 5px 0 0;
  color: var(--text-muted, #6d7b8d);
  font-size: 12px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.field {
  display: grid;
  gap: 7px;
  font-size: 12px;
  font-weight: 650;
}
.field b {
  color: #e4002b;
}
.field--wide {
  grid-column: 1 / -1;
}
.field select,
.field textarea,
.scan-form input,
.item-controls input,
.item-controls select {
  width: 100%;
  border: 1px solid var(--border-color, #dbe3ec);
  border-radius: 9px;
  background: #fff;
  padding: 10px 11px;
  font: inherit;
  color: inherit;
}
.field textarea {
  resize: vertical;
}
.scan-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 16px;
}
.camera-box {
  overflow: hidden;
  border-radius: 12px;
  background: #07151f;
  height: 280px;
  margin-bottom: 12px;
}
.camera-box video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.scan-form {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 16px 0;
}
.summary-grid div {
  border: 1px solid var(--border-color, #e1e8f0);
  border-radius: 11px;
  padding: 12px;
  display: grid;
  gap: 5px;
}
.summary-grid span {
  color: var(--text-muted, #708095);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.summary-grid strong {
  font-size: 22px;
}
.ready-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: #fff8e9;
  color: #8b6100;
  font-size: 12px;
}
.ready-box--active {
  background: #edf9f1;
  color: #17633a;
}
.empty-cart {
  min-height: 180px;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 7px;
  color: var(--text-muted, #718095);
}
.cart-list {
  display: grid;
  gap: 10px;
}
.cart-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 13px;
  padding: 14px;
}
.item-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.item-title-row > div {
  display: grid;
  gap: 4px;
}
.item-title-row strong {
  font-size: 14px;
}
.item-title-row span {
  color: var(--text-muted, #718095);
  font-size: 11px;
}
.tracking-chip {
  background: #edf3f8;
  color: #31475e !important;
  border-radius: 999px;
  padding: 4px 8px;
  font-weight: 700;
}
.serial-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 12px;
}
.serial-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid #dbe4ed;
  border-radius: 999px;
  padding: 5px 9px;
  font-size: 11px;
  font-family: ui-monospace, monospace;
}
.serial-chip button {
  border: 0;
  background: none;
  cursor: pointer;
  color: #d11831;
  font-size: 16px;
  line-height: 1;
}
.item-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 13px;
}
.item-controls label {
  display: grid;
  gap: 6px;
  font-size: 11px;
  font-weight: 650;
}
.item-controls small {
  color: var(--text-muted, #718095);
  font-weight: 400;
}
.remove-button {
  border: 0;
  background: transparent;
  color: #c82d3d;
  cursor: pointer;
  align-self: start;
  padding: 6px;
}
.sticky-action {
  position: fixed;
  left: var(--sidebar-width, 260px);
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  border-top: 1px solid var(--border-color, #dfe6ee);
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(10px);
}
.sticky-action > div {
  display: grid;
  gap: 3px;
}
.sticky-action strong {
  font-size: 12px;
}
.sticky-action span {
  color: var(--text-muted, #718095);
  font-size: 10px;
}
@media (max-width: 900px) {
  .form-grid,
  .scan-layout,
  .item-controls {
    grid-template-columns: 1fr;
  }
  .field--wide {
    grid-column: auto;
  }
  .sticky-action {
    left: 0;
  }
}
</style>
