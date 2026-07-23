<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle2, LockKeyhole, PackageCheck, Trash2 } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    modelValue: Record<string, unknown>[]
    disabled?: boolean
    required?: boolean
  }>(),
  { disabled: false, required: false },
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

const totalQty = computed(() =>
  props.modelValue.reduce((total, line) => total + numberValue(line.qty), 0),
)

function itemTitle(line: Record<string, unknown>): string {
  return String(line.item_name || line.item_code || `Barang ${line.item_id ?? ''}`)
}

function itemSubtitle(line: Record<string, unknown>): string {
  return [line.item_code, line.part_number].filter(Boolean).map(String).join(' • ') || '—'
}

function unitLabel(line: Record<string, unknown>): string {
  return [line.uom_code, line.uom_name].filter(Boolean).map(String).join(' — ') || '—'
}

function maxQty(line: Record<string, unknown>): number {
  return numberValue(line.remaining_qty ?? line.qty)
}

function updateLine(index: number, key: string, event: Event): void {
  const next = [...props.modelValue]
  next[index] = {
    ...(next[index] ?? {}),
    [key]: (event.target as HTMLInputElement).value,
  }
  emit('update:modelValue', next)
}

function removeLine(index: number): void {
  const next = [...props.modelValue]
  next.splice(index, 1)
  emit('update:modelValue', next)
}
</script>

<template>
  <div class="workflow-lines-editor">
    <div class="workflow-guidance-card">
      <div class="workflow-guidance-card__icon"><PackageCheck :size="22" /></div>
      <div class="workflow-guidance-card__content">
        <strong>Daftar barang siap dikeluarkan</strong>
        <span>
          Barang, part number, satuan, dan referensi permintaan dikunci dari data yang telah
          disetujui. Periksa jumlah fisik, lalu isi hanya quantity yang benar-benar dikeluarkan.
        </span>
      </div>
      <div class="workflow-guidance-card__meta">
        <span><CheckCircle2 :size="14" /> {{ modelValue.length }} barang</span>
        <span><PackageCheck :size="14" /> {{ formatNumber(totalQty) }} total qty</span>
        <span><LockKeyhole :size="14" /> Data referensi terkunci</span>
      </div>
    </div>

    <div class="workflow-lines-table-wrap">
      <table class="workflow-lines-table workflow-lines-table--usage">
        <thead>
          <tr>
            <th>No.</th>
            <th>Barang</th>
            <th>Part Number</th>
            <th>Satuan</th>
            <th>Lot / Batch</th>
            <th>Jumlah Keluar *</th>
            <th>Catatan</th>
            <th>Aksi</th>
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
              <span class="workflow-reference-value">{{ line.part_number || '—' }}</span>
            </td>
            <td>
              <span class="workflow-uom-pill">{{ unitLabel(line) }}</span>
            </td>
            <td>
              <input
                class="field__control"
                type="text"
                :value="String(line.lot_no ?? '')"
                :disabled="disabled"
                placeholder="Opsional"
                @input="updateLine(index, 'lot_no', $event)"
              />
            </td>
            <td>
              <div class="workflow-quantity-cell">
                <input
                  class="field__control workflow-lines-table__quantity"
                  type="number"
                  min="0.000001"
                  :max="maxQty(line) || undefined"
                  step="any"
                  :value="String(line.qty ?? '')"
                  :disabled="disabled"
                  required
                  @input="updateLine(index, 'qty', $event)"
                />
                <small>Maks. {{ formatNumber(maxQty(line)) }}</small>
              </div>
            </td>
            <td>
              <input
                class="field__control"
                type="text"
                :value="String(line.notes ?? '')"
                :disabled="disabled"
                placeholder="Tambahkan keterangan"
                @input="updateLine(index, 'notes', $event)"
              />
            </td>
            <td class="workflow-lines-table__action">
              <button
                type="button"
                class="icon-button icon-button--danger"
                aria-label="Hapus barang dari pengeluaran"
                :disabled="disabled || (required && modelValue.length <= 1)"
                @click="removeLine(index)"
              >
                <Trash2 :size="16" />
              </button>
            </td>
          </tr>
          <tr v-if="modelValue.length === 0">
            <td colspan="8" class="workflow-lines-table__empty">
              Pilih permintaan barang terlebih dahulu untuk memuat daftar barang.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
