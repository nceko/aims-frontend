<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle2, ClipboardCheck, PackageCheck, ScanLine } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    modelValue: Record<string, unknown>[]
    stage?: 'picking' | 'packing'
    disabled?: boolean
  }>(),
  { stage: 'picking', disabled: false },
)

const numberFormat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 })

function numberValue(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatNumber(value: unknown): string {
  return numberFormat.format(numberValue(value))
}

function itemTitle(line: Record<string, unknown>): string {
  return String(line.item_name || line.item_code || 'Barang')
}

function itemSubtitle(line: Record<string, unknown>): string {
  return [line.item_code, line.tracking_type].filter(Boolean).map(String).join(' • ') || '—'
}

function unitCode(line: Record<string, unknown>): string {
  return String(line.uom_code || '—')
}

function unitName(line: Record<string, unknown>): string {
  const name = String(line.uom_name || '').trim()
  return name && name !== unitCode(line) ? name : ''
}

const totalQty = computed(() =>
  props.modelValue.reduce((total, line) => total + numberValue(line.qty), 0),
)
const stageTitle = computed(() =>
  props.stage === 'packing'
    ? 'Konfirmasi barang selesai dikemas'
    : 'Konfirmasi barang selesai diambil',
)
const stageDescription = computed(() =>
  props.stage === 'packing'
    ? 'Pastikan seluruh barang hasil picking sudah dikemas sesuai jumlah Surat Jalan. Setelah disimpan, menu Scan Barang Keluar akan tersedia.'
    : 'Pastikan barang fisik sudah diambil dari rak sesuai daftar. Tidak perlu mengisi ID baris atau quantity secara manual karena jumlah mengikuti Surat Jalan.',
)
</script>

<template>
  <div class="workflow-lines-editor">
    <div class="workflow-guidance-card workflow-guidance-card--delivery-stage">
      <div class="workflow-guidance-card__icon">
        <PackageCheck v-if="stage === 'packing'" :size="22" />
        <ClipboardCheck v-else :size="22" />
      </div>
      <div class="workflow-guidance-card__content">
        <strong>{{ stageTitle }}</strong>
        <span>{{ stageDescription }}</span>
      </div>
      <div class="workflow-guidance-card__meta">
        <span><CheckCircle2 :size="14" /> {{ modelValue.length }} barang</span>
        <span><PackageCheck :size="14" /> {{ formatNumber(totalQty) }} total qty</span>
        <span v-if="stage === 'packing'"><ScanLine :size="14" /> Scan setelah simpan</span>
      </div>
    </div>

    <div v-if="modelValue.length" class="workflow-lines-table-wrap">
      <table class="workflow-lines-table workflow-lines-table--delivery-confirmation">
        <thead>
          <tr>
            <th>No.</th>
            <th>Barang</th>
            <th>Part Number</th>
            <th>Satuan</th>
            <th>{{ stage === 'packing' ? 'Jumlah Dikemas' : 'Jumlah Diambil' }}</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, index) in modelValue" :key="String(line.delivery_line_id ?? index)">
            <td class="workflow-lines-table__number">
              <span class="workflow-line-number">{{ index + 1 }}</span>
            </td>
            <td class="workflow-lines-table__item">
              <strong>{{ itemTitle(line) }}</strong>
              <small>{{ itemSubtitle(line) }}</small>
            </td>
            <td>
              <span class="workflow-reference-compact">{{ line.part_number || '—' }}</span>
            </td>
            <td>
              <span class="workflow-uom-compact">
                <strong>{{ unitCode(line) }}</strong>
                <small v-if="unitName(line)">{{ unitName(line) }}</small>
              </span>
            </td>
            <td>
              <strong class="workflow-confirmed-qty">{{ formatNumber(line.qty) }}</strong>
            </td>
            <td><span class="workflow-line-status is-success">Sesuai dokumen</span></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="notice notice--warning">Daftar barang Surat Jalan tidak ditemukan.</div>
  </div>
</template>
