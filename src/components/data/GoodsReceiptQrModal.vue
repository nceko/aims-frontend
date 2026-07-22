<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Download, Printer, QrCode, RefreshCw } from '@lucide/vue'
import QRCode from 'qrcode'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSelect from '@/components/ui/AppSelect.vue'

export interface GoodsReceiptQrLabel {
  unit_id?: string | number
  receipt_line_id?: string | number
  item_id?: string | number
  item_code?: string
  item_name?: string
  part_id?: string | number
  part_number?: string
  qr_code: string
  status?: string
}

const props = withDefaults(
  defineProps<{
    open: boolean
    receipt?: Record<string, unknown> | null
    codes: GoodsReceiptQrLabel[]
    notice?: string
  }>(),
  { receipt: null, notice: '' },
)

const emit = defineEmits<{ close: [] }>()
const busy = ref(false)
const error = ref('')
const qrImages = ref<Record<string, string>>({})
const outputFormat = ref<'label-50x30' | 'a4-sheet'>('label-50x30')

const receiptNo = computed(() => String(props.receipt?.receipt_no ?? 'GOODS-RECEIPT'))
const supplierName = computed(() => String(props.receipt?.supplier_name ?? '—'))
const warehouseName = computed(() => String(props.receipt?.warehouse_name ?? '—'))
const formatOptions = [
  { value: 'label-50x30', label: 'Label printer 50 × 30 mm' },
  { value: 'a4-sheet', label: 'Lembar A4 (3 kolom)' },
]

function cleanFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'goods-receipt'
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

async function renderQrImages(): Promise<void> {
  error.value = ''
  if (!props.codes.length) {
    qrImages.value = {}
    return
  }
  busy.value = true
  try {
    const entries = await Promise.all(
      props.codes.map(
        async (label) =>
          [
            label.qr_code,
            await QRCode.toDataURL(label.qr_code, {
              width: 640,
              margin: 1,
              errorCorrectionLevel: 'M',
              color: { dark: '#001b33', light: '#ffffff' },
            }),
          ] as const,
      ),
    )
    qrImages.value = Object.fromEntries(entries)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'QR tidak dapat dirender.'
  } finally {
    busy.value = false
  }
}

function labelTitle(label: GoodsReceiptQrLabel): string {
  return label.item_name || label.item_code || 'Item serial'
}

function labelMeta(label: GoodsReceiptQrLabel): string {
  const values = [label.item_code, label.part_number ? `Part: ${label.part_number}` : '']
  return values.filter(Boolean).join(' · ')
}

async function downloadPdf(): Promise<void> {
  if (!props.codes.length) return
  if (Object.keys(qrImages.value).length !== props.codes.length) await renderQrImages()
  busy.value = true
  error.value = ''
  try {
    const { jsPDF } = await import('jspdf')
    const filename = `QR-${cleanFileName(receiptNo.value)}.pdf`

    if (outputFormat.value === 'label-50x30') {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [50, 30] })
      props.codes.forEach((label, index) => {
        if (index > 0) doc.addPage([50, 30], 'landscape')
        const image = qrImages.value[label.qr_code]
        if (image) doc.addImage(image, 'PNG', 2, 3, 23, 23)
        doc.setTextColor(0, 52, 97)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.text(doc.splitTextToSize(labelTitle(label), 22), 27, 6)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(5.5)
        doc.setTextColor(50, 65, 82)
        doc.text(doc.splitTextToSize(labelMeta(label), 21), 27, 12)
        doc.setFont('courier', 'bold')
        doc.setFontSize(5.2)
        doc.setTextColor(0, 0, 0)
        doc.text(doc.splitTextToSize(label.qr_code, 21), 27, 20)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(4.7)
        doc.text(receiptNo.value, 27, 27)
      })
      doc.save(filename)
      return
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const marginX = 8
    const marginY = 9
    const gapX = 3
    const gapY = 3
    const labelWidth = 62.5
    const labelHeight = 31
    const columns = 3
    const rowsPerPage = 8
    const labelsPerPage = columns * rowsPerPage

    props.codes.forEach((label, index) => {
      if (index > 0 && index % labelsPerPage === 0) doc.addPage('a4', 'portrait')
      const localIndex = index % labelsPerPage
      const column = localIndex % columns
      const row = Math.floor(localIndex / columns)
      const x = marginX + column * (labelWidth + gapX)
      const y = marginY + row * (labelHeight + gapY)
      doc.setDrawColor(205, 214, 224)
      doc.roundedRect(x, y, labelWidth, labelHeight, 1.5, 1.5)
      const image = qrImages.value[label.qr_code]
      if (image) doc.addImage(image, 'PNG', x + 2, y + 3, 24, 24)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(0, 52, 97)
      doc.text(doc.splitTextToSize(labelTitle(label), 31), x + 28, y + 6)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(5.2)
      doc.setTextColor(60, 73, 88)
      doc.text(doc.splitTextToSize(labelMeta(label), 31), x + 28, y + 12)
      doc.setFont('courier', 'bold')
      doc.setFontSize(4.8)
      doc.setTextColor(0, 0, 0)
      doc.text(doc.splitTextToSize(label.qr_code, 31), x + 28, y + 20)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(4.5)
      doc.text(receiptNo.value, x + 28, y + 28)
    })
    doc.save(filename)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'PDF QR gagal dibuat.'
  } finally {
    busy.value = false
  }
}

async function printLabels(): Promise<void> {
  if (!props.codes.length) return
  if (Object.keys(qrImages.value).length !== props.codes.length) await renderQrImages()
  const popup = window.open('', '_blank', 'width=980,height=760')
  if (!popup) {
    error.value = 'Popup cetak diblokir browser. Izinkan popup lalu coba kembali.'
    return
  }

  const isLabel = outputFormat.value === 'label-50x30'
  const labels = props.codes
    .map(
      (label) => `
        <article class="qr-label">
          <img src="${qrImages.value[label.qr_code] ?? ''}" alt="QR ${escapeHtml(label.qr_code)}" />
          <section>
            <strong>${escapeHtml(labelTitle(label))}</strong>
            <small>${escapeHtml(labelMeta(label))}</small>
            <code>${escapeHtml(label.qr_code)}</code>
            <footer>${escapeHtml(receiptNo.value)}</footer>
          </section>
        </article>`,
    )
    .join('')

  popup.document.write(`<!doctype html>
<html lang="id"><head><meta charset="utf-8"><title>QR ${escapeHtml(receiptNo.value)}</title>
<style>
  *{box-sizing:border-box} body{margin:0;font-family:Arial,sans-serif;color:#10233a;background:#fff}
  .sheet{${isLabel ? 'display:block' : 'display:grid;grid-template-columns:repeat(3,62.5mm);gap:3mm;padding:9mm 8mm'}}
  .qr-label{width:${isLabel ? '50mm' : '62.5mm'};height:${isLabel ? '30mm' : '31mm'};display:grid;grid-template-columns:${isLabel ? '24mm 1fr' : '26mm 1fr'};align-items:center;gap:1.5mm;padding:2mm;border:${isLabel ? '0' : '0.2mm solid #ccd6e0'};border-radius:1.5mm;break-inside:avoid;overflow:hidden;${isLabel ? 'page-break-after:always' : ''}}
  .qr-label img{width:${isLabel ? '23mm' : '24mm'};height:${isLabel ? '23mm' : '24mm'};object-fit:contain}
  .qr-label section{min-width:0;display:flex;flex-direction:column;gap:1mm}
  .qr-label strong{font-size:${isLabel ? '7.5pt' : '7pt'};line-height:1.12;color:#003461}
  .qr-label small{font-size:5.3pt;line-height:1.15;color:#43536a}
  .qr-label code{font-size:5.1pt;line-height:1.15;word-break:break-all;color:#000}
  .qr-label footer{font-size:4.7pt;color:#5e6c7d}
  @page{${isLabel ? 'size:50mm 30mm;margin:0' : 'size:A4 portrait;margin:0'}}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><main class="sheet">${labels}</main>
<script>window.addEventListener('load',()=>setTimeout(()=>{window.print()},200));<\/script>
</body></html>`)
  popup.document.close()
}

watch(
  () => [props.open, props.codes.map((item) => item.qr_code).join('|')],
  ([open]) => {
    if (open) void renderQrImages()
  },
  { immediate: true },
)
</script>

<template>
  <AppModal
    :open="open"
    title="Preview & Cetak QR Penerimaan"
    :description="`${receiptNo} · ${codes.length} label QR`"
    size="xl"
    :busy="busy"
    @close="emit('close')"
  >
    <div class="qr-print-summary">
      <div>
        <span>Penerimaan</span><strong>{{ receiptNo }}</strong>
      </div>
      <div>
        <span>Pemasok</span><strong>{{ supplierName }}</strong>
      </div>
      <div>
        <span>Gudang</span><strong>{{ warehouseName }}</strong>
      </div>
      <div>
        <span>Jumlah label</span><strong>{{ codes.length }}</strong>
      </div>
    </div>

    <div v-if="notice" class="notice notice--info">{{ notice }}</div>
    <div v-if="error" class="notice notice--danger">{{ error }}</div>

    <div class="qr-print-toolbar">
      <AppSelect
        v-model="outputFormat"
        label="Format cetak"
        :options="formatOptions"
        :searchable="false"
        compact
      />
      <AppButton variant="ghost" :loading="busy" @click="renderQrImages">
        <RefreshCw :size="16" /> Muat ulang preview
      </AppButton>
    </div>

    <div v-if="busy && !Object.keys(qrImages).length" class="qr-label-loading">
      <span v-for="item in Math.min(codes.length || 4, 8)" :key="item" class="skeleton"></span>
    </div>
    <div v-else-if="codes.length" class="qr-label-grid">
      <article v-for="label in codes" :key="label.qr_code" class="qr-label-card">
        <img
          v-if="qrImages[label.qr_code]"
          :src="qrImages[label.qr_code]"
          :alt="`QR ${label.qr_code}`"
        />
        <div v-else class="qr-label-card__placeholder"><QrCode :size="40" /></div>
        <div class="qr-label-card__content">
          <strong>{{ labelTitle(label) }}</strong>
          <span>{{ labelMeta(label) || 'Tanpa part number' }}</span>
          <code>{{ label.qr_code }}</code>
          <small>{{ receiptNo }} · {{ label.status || 'RECEIVED' }}</small>
        </div>
      </article>
    </div>
    <div v-else class="empty-state compact-empty">
      <QrCode :size="42" />
      <h3>Belum ada QR untuk dicetak</h3>
      <p>Pastikan barang bertipe SERIAL dan jumlah diterima lebih dari nol.</p>
    </div>

    <template #footer>
      <AppButton variant="ghost" :disabled="busy" @click="emit('close')">Tutup</AppButton>
      <AppButton variant="secondary" :disabled="!codes.length || busy" @click="printLabels">
        <Printer :size="17" /> Cetak
      </AppButton>
      <AppButton :loading="busy" :disabled="!codes.length" @click="downloadPdf">
        <Download :size="17" /> Download PDF
      </AppButton>
    </template>
  </AppModal>
</template>
