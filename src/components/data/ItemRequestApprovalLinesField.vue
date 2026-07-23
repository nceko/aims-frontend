<script setup lang="ts">
import { computed } from 'vue'
import { Boxes, CheckCheck, PackageCheck, TriangleAlert } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    modelValue: Record<string, unknown>[]
    disabled?: boolean
  }>(),
  { disabled: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>[]]
}>()

const numberFormat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 })

function numberValue(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatNumber(value: unknown): string {
  return numberFormat.format(numberValue(value))
}

function itemTitle(line: Record<string, unknown>): string {
  return String(line.item_name || line.item_code || `Barang ${line.item_id ?? ''}`)
}

function itemSubtitle(line: Record<string, unknown>): string {
  return [line.item_code, line.part_number].filter(Boolean).map(String).join(' • ') || '—'
}

function unitLabel(line: Record<string, unknown>): string {
  return [line.uom_code, line.uom_name].filter(Boolean).map(String).join(' — ') || '—'
}

function shortageQty(line: Record<string, unknown>): number {
  return Math.max(0, numberValue(line.requested_qty) - numberValue(line.available_stock_qty))
}

function updateApprovedQty(index: number, event: Event): void {
  const value = (event.target as HTMLInputElement).value
  const next = [...props.modelValue]
  next[index] = { ...(next[index] ?? {}), approved_qty: value }
  emit('update:modelValue', next)
}

function applyApproval(mode: 'REQUESTED' | 'AVAILABLE'): void {
  const next = props.modelValue.map((line) => {
    const requested = numberValue(line.requested_qty)
    const available = numberValue(line.available_stock_qty)
    return {
      ...line,
      approved_qty: mode === 'REQUESTED' ? requested : Math.min(requested, available),
    }
  })
  emit('update:modelValue', next)
}

const hasLines = computed(() => props.modelValue.length > 0)
const sufficientCount = computed(
  () =>
    props.modelValue.filter(
      (line) => numberValue(line.available_stock_qty) >= numberValue(line.requested_qty),
    ).length,
)
const shortageCount = computed(() => props.modelValue.length - sufficientCount.value)
const approvedCount = computed(
  () => props.modelValue.filter((line) => numberValue(line.approved_qty) > 0).length,
)
</script>

<template>
  <div class="workflow-lines-editor approval-workspace">
    <div class="workflow-guidance-card workflow-guidance-card--approval">
      <div class="workflow-guidance-card__icon"><CheckCheck :size="22" /></div>
      <div class="workflow-guidance-card__content">
        <strong>Tentukan jumlah yang disetujui</strong>
        <span>
          Identitas barang dan ID baris dikunci oleh sistem. Bandingkan kebutuhan dengan stok, lalu
          tentukan quantity yang boleh dipenuhi atau dilanjutkan ke pengadaan.
        </span>
      </div>
      <div class="workflow-guidance-card__actions">
        <button type="button" :disabled="disabled || !hasLines" @click="applyApproval('REQUESTED')">
          <CheckCheck :size="14" /> Setujui sesuai permintaan
        </button>
        <button type="button" :disabled="disabled || !hasLines" @click="applyApproval('AVAILABLE')">
          <Boxes :size="14" /> Batasi sesuai stok
        </button>
      </div>
    </div>

    <div v-if="hasLines" class="workflow-summary-strip">
      <div>
        <span>Baris permintaan</span>
        <strong>{{ modelValue.length }}</strong>
      </div>
      <div class="is-success">
        <span>Stok cukup</span>
        <strong>{{ sufficientCount }}</strong>
      </div>
      <div :class="{ 'is-warning': shortageCount > 0 }">
        <span>Stok kurang</span>
        <strong>{{ shortageCount }}</strong>
      </div>
      <div>
        <span>Baris disetujui</span>
        <strong>{{ approvedCount }}</strong>
      </div>
    </div>

    <div v-if="hasLines" class="workflow-lines-table-wrap">
      <table class="workflow-lines-table workflow-lines-table--approval">
        <thead>
          <tr>
            <th>No.</th>
            <th>Barang</th>
            <th>Jumlah Diminta</th>
            <th>Stok Tersedia</th>
            <th>Kondisi Stok</th>
            <th>Jumlah Disetujui *</th>
            <th>Satuan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, index) in modelValue" :key="String(line.request_line_id ?? index)">
            <td class="workflow-lines-table__number">
              <span class="workflow-line-number">{{ index + 1 }}</span>
            </td>
            <td class="workflow-lines-table__item">
              <strong>{{ itemTitle(line) }}</strong>
              <small>{{ itemSubtitle(line) }}</small>
            </td>
            <td>
              <strong class="workflow-quantity-value">{{
                formatNumber(line.requested_qty)
              }}</strong>
            </td>
            <td>
              <span
                class="workflow-stock-badge"
                :class="{
                  'workflow-stock-badge--low':
                    numberValue(line.available_stock_qty) < numberValue(line.requested_qty),
                }"
              >
                {{ formatNumber(line.available_stock_qty) }}
              </span>
            </td>
            <td>
              <span v-if="shortageQty(line) === 0" class="workflow-line-status is-success">
                <PackageCheck :size="13" /> Stok cukup
              </span>
              <span v-else class="workflow-line-status is-warning">
                <TriangleAlert :size="13" /> Kurang {{ formatNumber(shortageQty(line)) }}
              </span>
            </td>
            <td>
              <div class="workflow-quantity-cell">
                <input
                  class="field__control workflow-lines-table__quantity"
                  type="number"
                  min="0"
                  :max="numberValue(line.requested_qty)"
                  step="any"
                  :value="String(line.approved_qty ?? '')"
                  :disabled="disabled"
                  required
                  @input="updateApprovedQty(index, $event)"
                />
                <small>Maks. {{ formatNumber(line.requested_qty) }}</small>
              </div>
            </td>
            <td>
              <span class="workflow-uom-pill">{{ unitLabel(line) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="notice notice--warning">
      Detail barang permintaan tidak dapat dimuat. Tutup formulir lalu coba kembali.
    </div>
  </div>
</template>
