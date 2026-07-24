<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Plus, Trash2 } from '@lucide/vue'
import ApiOptionField from './ApiOptionField.vue'
import ApiResourcePicker from './ApiResourcePicker.vue'
import type { ApiSchema, FieldOptionSource } from '@/types/resource'

const props = withDefaults(
  defineProps<{
    schema: ApiSchema
    modelValue: Record<string, unknown>[]
    disabled?: boolean
    required?: boolean
  }>(),
  {
    disabled: false,
    required: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>[]]
}>()

const requiredFields = computed(() => new Set(props.schema.required ?? []))
const itemUOMSource: FieldOptionSource = {
  path: '/api/v1/items/{id}/uoms/options',
  pathFromModel: { id: 'item_id' },
  valueKeys: ['value', 'uom_id', 'id'],
  labelKeys: ['label', 'uom_code', 'uom_name'],
}
const showLotColumn = computed(() =>
  props.modelValue.some((line) => String(line.tracking_type ?? '').toUpperCase() === 'LOT'),
)

function supports(name: string): boolean {
  return Boolean(props.schema.properties?.[name])
}

function asNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function fieldValue(line: Record<string, unknown>, key: string): string | number | undefined {
  const value = line[key]
  return typeof value === 'string' || typeof value === 'number' ? value : undefined
}

function itemTitle(line: Record<string, unknown>): string {
  return String(line.item_name ?? line.item_code ?? 'Barang belum dipilih')
}

function itemMeta(line: Record<string, unknown>): string {
  const values = [line.item_code, line.tracking_type].filter(Boolean).map(String)
  return values.join(' · ')
}

function partLabel(line: Record<string, unknown>): string {
  return String(line.part_number ?? '—')
}

function uomLabel(line: Record<string, unknown>): string {
  const code = String(line.uom_code ?? '')
  const name = String(line.uom_name ?? '')
  if (code && name && code !== name) return `${code} — ${name}`
  return code || name || '—'
}

function updateLine(index: number, key: string, value: unknown) {
  const next = [...props.modelValue]
  const current = { ...(next[index] ?? {}), [key]: value }

  if (key === 'item_id') {
    current.part_id = ''
    current.uom_id = ''
    current.lot_no = ''
    current.item_code = ''
    current.item_name = ''
    current.part_number = ''
    current.uom_code = ''
    current.uom_name = ''
    current.tracking_type = ''
  }

  if (key === 'received_qty') {
    const received = Math.max(0, asNumber(value))
    const rejected = Math.min(received, Math.max(0, asNumber(current.rejected_qty)))
    current.received_qty = received
    current.rejected_qty = rejected
    current.accepted_qty = Math.max(0, received - rejected)
  }

  if (key === 'accepted_qty') {
    const received = Math.max(0, asNumber(current.received_qty))
    const accepted = Math.min(received, Math.max(0, asNumber(value)))
    current.accepted_qty = accepted
    current.rejected_qty = Math.max(0, received - accepted)
  }

  if (key === 'rejected_qty') {
    const received = Math.max(0, asNumber(current.received_qty))
    const rejected = Math.min(received, Math.max(0, asNumber(value)))
    current.rejected_qty = rejected
    current.accepted_qty = Math.max(0, received - rejected)
    if (rejected === 0) current.rejection_reason = ''
  }

  next[index] = current
  emit('update:modelValue', next)
}

function applyItemSelection(index: number, row: Record<string, unknown>) {
  const next = [...props.modelValue]
  const current = next[index] ?? {}
  next[index] = {
    ...current,
    item_id: row.item_id,
    item_code: row.item_code,
    item_name: row.item_name,
    tracking_type: String(row.tracking_type ?? '').toUpperCase(),
    part_id: '',
    part_number: '',
    uom_id: row.base_uom_id ?? '',
    uom_code: row.uom_code ?? '',
    uom_name: row.uom_name ?? '',
    lot_no: '',
  }
  emit('update:modelValue', next)
}

function addLine() {
  emit('update:modelValue', [
    ...props.modelValue,
    {
      po_line_id: '',
      item_id: '',
      part_id: '',
      uom_id: '',
      tracking_type: '',
      ordered_qty: 0,
      received_qty: 0,
      accepted_qty: 0,
      rejected_qty: 0,
      condition_status: 'GOOD',
      purchase_unit_price: '',
      currency_code: 'IDR',
      lot_no: '',
      notes: '',
      rejection_reason: '',
    },
  ])
}

function removeLine(index: number) {
  const next = [...props.modelValue]
  next.splice(index, 1)
  emit('update:modelValue', next)
}

function numericInput(index: number, key: string, event: Event) {
  updateLine(index, key, (event.target as HTMLInputElement).value)
}

function textInput(index: number, key: string, event: Event) {
  updateLine(index, key, (event.target as HTMLInputElement).value)
}

onMounted(() => {
  if (props.required && props.modelValue.length === 0) addLine()
})
</script>

<template>
  <div class="goods-receipt-lines-editor">
    <div class="goods-receipt-lines-summary">
      <div>
        <strong>{{ modelValue.length }}</strong>
        <span>baris barang</span>
      </div>
      <div>
        <strong>{{
          modelValue.reduce((sum, line) => sum + asNumber(line.received_qty), 0)
        }}</strong>
        <span>total datang</span>
      </div>
      <div>
        <strong>{{
          modelValue.reduce((sum, line) => sum + asNumber(line.accepted_qty), 0)
        }}</strong>
        <span>total diterima</span>
      </div>
      <div>
        <strong>{{
          modelValue.reduce((sum, line) => sum + asNumber(line.rejected_qty), 0)
        }}</strong>
        <span>total ditolak</span>
      </div>
    </div>

    <div class="po-lines-table-wrap goods-receipt-lines-table-wrap">
      <table class="po-lines-table goods-receipt-lines-table">
        <thead>
          <tr>
            <th class="po-lines-table__number">No.</th>
            <th class="po-lines-table__item">Barang *</th>
            <th>Part Number</th>
            <th>UOM *</th>
            <th>Qty Pesan</th>
            <th>Qty Datang *</th>
            <th>Qty Diterima *</th>
            <th>Qty Ditolak</th>
            <th>Kondisi *</th>
            <th v-if="showLotColumn">Lot / Batch</th>
            <th>Harga Pembelian</th>
            <th>Mata Uang</th>
            <th>Catatan</th>
            <th>Alasan Penolakan</th>
            <th class="po-lines-table__action">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, index) in modelValue" :key="index">
            <td class="po-lines-table__number">{{ index + 1 }}</td>
            <td class="po-lines-table__item">
              <div v-if="line.po_line_id" class="goods-receipt-item-cell">
                <strong>{{ itemTitle(line) }}</strong>
                <small v-if="itemMeta(line)">{{ itemMeta(line) }}</small>
              </div>
              <ApiResourcePicker
                v-else
                field-name="item_id"
                :model-value="fieldValue(line, 'item_id')"
                :root-model="line"
                :source="{
                  operationId: 'FindAllItems',
                  detailOperationId: 'FindItemByID',
                  valueKey: 'item_id',
                  labelKeys: ['item_code', 'item_name'],
                  title: 'Pilih Item',
                  columns: [
                    { key: 'item_code', label: 'Kode Item' },
                    { key: 'item_name', label: 'Nama Item' },
                    { key: 'tracking_type', label: 'Tracking' },
                  ],
                }"
                :required="requiredFields.has('item_id')"
                :disabled="disabled"
                @update:model-value="updateLine(index, 'item_id', $event)"
                @select="applyItemSelection(index, $event)"
              />
            </td>
            <td>
              <span v-if="line.po_line_id" class="goods-receipt-static-value">{{
                partLabel(line)
              }}</span>
              <ApiOptionField
                v-else
                field-name="part_id"
                :model-value="fieldValue(line, 'part_id')"
                :root-model="line"
                :disabled="disabled || !line.item_id"
                :clearable="true"
                @update:model-value="updateLine(index, 'part_id', $event)"
              />
            </td>
            <td>
              <span v-if="line.po_line_id" class="goods-receipt-uom-badge">{{
                uomLabel(line)
              }}</span>
              <ApiOptionField
                v-else
                field-name="uom_id"
                :model-value="fieldValue(line, 'uom_id')"
                :root-model="line"
                :required="requiredFields.has('uom_id')"
                :disabled="disabled || !line.item_id"
                :source-override="itemUOMSource"
                :clearable="false"
                @update:model-value="updateLine(index, 'uom_id', $event)"
              />
            </td>
            <td>
              <span class="goods-receipt-qty-reference">{{ line.ordered_qty ?? 0 }}</span>
            </td>
            <td>
              <input
                class="field__control goods-receipt-number-input"
                type="number"
                min="0"
                step="any"
                :value="String(line.received_qty ?? '')"
                :disabled="disabled"
                required
                @input="numericInput(index, 'received_qty', $event)"
              />
            </td>
            <td>
              <input
                class="field__control goods-receipt-number-input"
                type="number"
                min="0"
                step="any"
                :value="String(line.accepted_qty ?? '')"
                :disabled="disabled"
                required
                @input="numericInput(index, 'accepted_qty', $event)"
              />
            </td>
            <td>
              <input
                class="field__control goods-receipt-number-input"
                type="number"
                min="0"
                step="any"
                :value="String(line.rejected_qty ?? '')"
                :disabled="disabled"
                @input="numericInput(index, 'rejected_qty', $event)"
              />
            </td>
            <td>
              <ApiOptionField
                field-name="condition_status"
                :model-value="fieldValue(line, 'condition_status')"
                :root-model="line"
                :required="requiredFields.has('condition_status')"
                :disabled="disabled"
                :clearable="false"
                @update:model-value="updateLine(index, 'condition_status', $event)"
              />
            </td>
            <td v-if="showLotColumn">
              <input
                v-if="String(line.tracking_type ?? '').toUpperCase() === 'LOT'"
                class="field__control"
                type="text"
                :value="String(line.lot_no ?? '')"
                :disabled="disabled"
                placeholder="Nomor lot"
                required
                @input="textInput(index, 'lot_no', $event)"
              />
              <span v-else class="po-lines-table__not-applicable">Tidak digunakan</span>
            </td>
            <td>
              <input
                class="field__control goods-receipt-price-input"
                type="number"
                min="0"
                step="any"
                :value="String(line.purchase_unit_price ?? '')"
                :disabled="disabled"
                @input="numericInput(index, 'purchase_unit_price', $event)"
              />
            </td>
            <td>
              <ApiOptionField
                field-name="currency_code"
                :model-value="fieldValue(line, 'currency_code')"
                :root-model="line"
                :disabled="disabled"
                :clearable="false"
                @update:model-value="updateLine(index, 'currency_code', $event)"
              />
            </td>
            <td>
              <input
                class="field__control"
                type="text"
                :value="String(line.notes ?? '')"
                :disabled="disabled"
                placeholder="Catatan"
                @input="textInput(index, 'notes', $event)"
              />
            </td>
            <td>
              <input
                class="field__control"
                type="text"
                :value="String(line.rejection_reason ?? '')"
                :disabled="disabled || asNumber(line.rejected_qty) <= 0"
                :required="asNumber(line.rejected_qty) > 0"
                :placeholder="
                  asNumber(line.rejected_qty) > 0 ? 'Wajib diisi' : 'Tidak ada penolakan'
                "
                @input="textInput(index, 'rejection_reason', $event)"
              />
            </td>
            <td class="po-lines-table__action">
              <button
                type="button"
                class="icon-button icon-button--danger"
                aria-label="Hapus baris"
                :disabled="disabled || Boolean(line.po_line_id)"
                :title="line.po_line_id ? 'Baris PO tidak dapat dihapus' : 'Hapus baris'"
                @click="removeLine(index)"
              >
                <Trash2 :size="16" />
              </button>
            </td>
          </tr>
          <tr v-if="modelValue.length === 0">
            <td :colspan="showLotColumn ? 15 : 14" class="goods-receipt-lines-empty">
              Belum ada barang penerimaan.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <button type="button" class="repeatable-add" :disabled="disabled" @click="addLine">
      <Plus :size="16" /> Tambah Barang
    </button>
  </div>
</template>
