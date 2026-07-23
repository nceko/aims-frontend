<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Plus, Trash2 } from '@lucide/vue'
import ApiOptionField from './ApiOptionField.vue'
import ApiResourcePicker from './ApiResourcePicker.vue'
import type { ApiSchema, FieldOptionSource, FieldResourcePickerSource } from '@/types/resource'

const props = withDefaults(
  defineProps<{
    schema: ApiSchema
    modelValue: Record<string, unknown>[]
    supplierId?: unknown
    sourceRequestId?: unknown
    disabled?: boolean
    required?: boolean
  }>(),
  { supplierId: undefined, sourceRequestId: undefined, disabled: false, required: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>[]]
}>()

const previousSupplier = ref(props.supplierId)
const properties = computed(() => props.schema.properties ?? {})
const requiredFields = computed(() => new Set(props.schema.required ?? []))
const supports = (name: string) => Boolean(properties.value[name])
const hasRequestSource = computed(
  () =>
    props.sourceRequestId !== undefined &&
    props.sourceRequestId !== null &&
    props.sourceRequestId !== '',
)
const showRequestLineColumn = computed(() => supports('request_line_id') && hasRequestSource.value)
const visibleColumnCount = computed(
  () =>
    3 +
    Number(showRequestLineColumn.value) +
    Number(supports('part_id')) +
    Number(supports('uom_id')) +
    Number(supports('ordered_qty')) +
    Number(supports('unit_price')) +
    Number(supports('lot_no')) +
    Number(supports('notes')),
)
const itemUOMSource: FieldOptionSource = {
  path: '/api/v1/items/{id}/uoms/options',
  pathFromModel: { id: 'item_id' },
  valueKeys: ['value', 'uom_id', 'id'],
  labelKeys: ['label', 'uom_code', 'uom_name'],
}
const itemSource = computed<FieldResourcePickerSource>(() => ({
  operationId: 'FindItemSuppliersBySupplierID',
  detailOperationId: 'FindItemByID',
  valueKey: 'item_id',
  labelKeys: ['item_name', 'item_code'],
  stackedLabel: true,
  title: 'Pilih Item Supplier',
  description: 'Hanya item yang terdaftar pada supplier Pesanan Pembelian ini yang ditampilkan.',
  searchPlaceholder: 'Cari kode item, nama item, atau kode item supplier…',
  pathFromModel: { id: 'supplier_id' },
  columns: [
    { key: 'item_code', label: 'Kode Item', width: '140px' },
    { key: 'item_name', label: 'Nama Item' },
    { key: 'supplier_item_code', label: 'Kode Item Supplier', width: '170px' },
    { key: 'last_purchase_price', label: 'Harga Terakhir', width: '140px' },
    { key: 'is_default', label: 'Utama', width: '80px' },
  ],
}))

function blankLine(): Record<string, unknown> {
  const line: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(properties.value)) {
    if (field.default !== undefined) line[key] = field.default
    else if (field.type === 'number' || field.type === 'integer') line[key] = ''
    else line[key] = ''
  }
  return line
}

function addLine() {
  emit('update:modelValue', [...props.modelValue, blankLine()])
}

function removeLine(index: number) {
  const next = [...props.modelValue]
  next.splice(index, 1)
  emit('update:modelValue', next)
}

function updateLine(index: number, key: string, value: unknown) {
  const next = [...props.modelValue]
  next[index] = { ...(next[index] ?? {}), [key]: value }
  if (key === 'item_id') next[index] = { ...next[index], part_id: '', uom_id: '' }
  emit('update:modelValue', next)
}

function fieldValue(line: Record<string, unknown>, key: string): unknown {
  return line[key]
}

function updateInput(index: number, key: string, event: Event) {
  updateLine(index, key, (event.target as HTMLInputElement).value)
}

function applyItemSelection(index: number, row: Record<string, unknown>) {
  const next = [...props.modelValue]
  const line: Record<string, unknown> = {
    ...(next[index] ?? {}),
    item_id: row.item_id,
    part_id: '',
    uom_id: '',
  }
  if (
    (line.unit_price === '' || line.unit_price === undefined) &&
    row.last_purchase_price != null
  ) {
    line.unit_price = row.last_purchase_price
  }
  next[index] = line
  emit('update:modelValue', next)
}

onMounted(() => {
  if (props.required && props.modelValue.length === 0) addLine()
})

watch(
  () => props.supplierId,
  (value) => {
    if (previousSupplier.value !== value && props.modelValue.length) {
      emit(
        'update:modelValue',
        props.modelValue.map((line) =>
          line.request_line_id
            ? { ...line, unit_price: '' }
            : { ...line, item_id: '', part_id: '', unit_price: '' },
        ),
      )
    }
    previousSupplier.value = value
  },
)
</script>

<template>
  <div class="po-lines-editor">
    <div v-if="!supplierId" class="notice notice--info">
      Pilih supplier terlebih dahulu. Daftar barang akan dibatasi berdasarkan barang supplier
      tersebut.
    </div>
    <div class="po-lines-table-wrap">
      <table class="po-lines-table">
        <thead>
          <tr>
            <th class="po-lines-table__number">No.</th>
            <th v-if="showRequestLineColumn">Baris Permintaan</th>
            <th>Barang *</th>
            <th v-if="supports('part_id')">Part Number</th>
            <th v-if="supports('uom_id')">UOM *</th>
            <th v-if="supports('ordered_qty')" class="po-lines-table__quantity">Qty *</th>
            <th v-if="supports('unit_price')" class="po-lines-table__price">Harga Satuan</th>
            <th v-if="supports('lot_no')">Lot</th>
            <th v-if="supports('notes')">Catatan</th>
            <th class="po-lines-table__action">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, index) in modelValue" :key="index">
            <td class="po-lines-table__number">{{ index + 1 }}</td>
            <td v-if="showRequestLineColumn">
              <span v-if="line.request_line_id" class="po-lines-table__request-line">
                #{{ line.request_line_id }}
              </span>
              <span v-else>—</span>
            </td>
            <td>
              <ApiResourcePicker
                field-name="item_id"
                :model-value="fieldValue(line, 'item_id')"
                :root-model="{ supplier_id: supplierId, ...line }"
                :source="itemSource"
                :required="requiredFields.has('item_id')"
                :disabled="disabled || !supplierId"
                @update:model-value="updateLine(index, 'item_id', $event)"
                @select="applyItemSelection(index, $event)"
              />
            </td>
            <td v-if="supports('part_id')">
              <ApiOptionField
                field-name="part_id"
                :model-value="fieldValue(line, 'part_id')"
                :root-model="line"
                :disabled="disabled || !line.item_id"
                :clearable="false"
                @update:model-value="updateLine(index, 'part_id', $event)"
              />
            </td>
            <td v-if="supports('uom_id')">
              <ApiOptionField
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
            <td v-if="supports('ordered_qty')">
              <input
                class="field__control"
                type="number"
                min="0"
                step="any"
                :value="String(line.ordered_qty ?? '')"
                :disabled="disabled"
                required
                @input="updateInput(index, 'ordered_qty', $event)"
              />
            </td>
            <td v-if="supports('unit_price')">
              <input
                class="field__control"
                type="number"
                min="0"
                step="any"
                :value="String(line.unit_price ?? '')"
                :disabled="disabled"
                placeholder="Harga supplier"
                @input="updateInput(index, 'unit_price', $event)"
              />
            </td>
            <td v-if="supports('lot_no')">
              <input
                class="field__control"
                type="text"
                :value="String(line.lot_no ?? '')"
                :disabled="disabled"
                @input="updateInput(index, 'lot_no', $event)"
              />
            </td>
            <td v-if="supports('notes')">
              <input
                class="field__control"
                type="text"
                :value="String(line.notes ?? '')"
                :disabled="disabled"
                @input="updateInput(index, 'notes', $event)"
              />
            </td>
            <td class="po-lines-table__action">
              <button
                type="button"
                class="icon-button icon-button--danger"
                aria-label="Hapus baris"
                :disabled="disabled"
                @click="removeLine(index)"
              >
                <Trash2 :size="16" />
              </button>
            </td>
          </tr>
          <tr v-if="modelValue.length === 0">
            <td :colspan="visibleColumnCount" class="po-lines-table__empty">
              Belum ada barang yang ditambahkan.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <button
      type="button"
      class="repeatable-add"
      :disabled="disabled || !supplierId"
      @click="addLine"
    >
      <Plus :size="16" /> Tambah Barang
    </button>
  </div>
</template>
