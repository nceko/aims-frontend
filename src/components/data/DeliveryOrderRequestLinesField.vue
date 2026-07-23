<script setup lang="ts">
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
  return [line.item_code, line.tracking_type].filter(Boolean).map(String).join(' • ') || '—'
}

function unitCode(line: Record<string, unknown>): string {
  return String(line.uom_code || '—')
}

function unitName(line: Record<string, unknown>): string {
  const name = String(line.uom_name || '').trim()
  return name && name !== unitCode(line) ? name : ''
}

function updateLine(index: number, key: string, event: Event): void {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  const next = [...props.modelValue]
  next[index] = { ...(next[index] ?? {}), [key]: target.value }
  emit('update:modelValue', next)
}
</script>

<template>
  <div class="workflow-lines-editor">
    <div class="notice notice--info">
      Barang dan gudang mengikuti permintaan yang dipilih. Lot / Batch hanya digunakan bila
      pengiriman harus mengambil kelompok stok tertentu; jika tidak, biarkan kosong.
    </div>
    <div v-if="modelValue.length" class="workflow-lines-table-wrap">
      <table class="workflow-lines-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Barang</th>
            <th>Part Number</th>
            <th>Satuan</th>
            <th>Sisa Dapat Dikirim</th>
            <th>Jumlah Kirim *</th>
            <th>Lot / Batch</th>
            <th>Catatan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, index) in modelValue" :key="String(line.request_line_id ?? index)">
            <td class="workflow-lines-table__number">{{ index + 1 }}</td>
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
            <td>{{ formatNumber(line.remaining_qty) }}</td>
            <td>
              <input
                class="field__control workflow-lines-table__quantity"
                type="number"
                min="0.000001"
                :max="numberValue(line.remaining_qty) || undefined"
                step="any"
                :value="String(line.qty ?? '')"
                :disabled="disabled"
                required
                @input="updateLine(index, 'qty', $event)"
              />
            </td>
            <td>
              <input
                class="field__control"
                type="text"
                :value="String(line.lot_no ?? '')"
                :disabled="disabled || Boolean(line.lot_locked)"
                :title="
                  line.lot_locked
                    ? 'Lot dikunci mengikuti permintaan barang.'
                    : 'Opsional. Kosongkan bila tidak memilih batch tertentu.'
                "
                placeholder="Opsional"
                @input="updateLine(index, 'lot_no', $event)"
              />
            </td>
            <td>
              <input
                class="field__control"
                type="text"
                :value="String(line.notes ?? '')"
                :disabled="disabled"
                placeholder="Keterangan pengiriman"
                @input="updateLine(index, 'notes', $event)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="notice notice--warning">
      Pilih permintaan yang sudah disetujui agar barang dapat dimuat otomatis.
    </div>
  </div>
</template>
