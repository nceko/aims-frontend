<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Plus, Trash2 } from '@lucide/vue'
import ApiOptionField from './ApiOptionField.vue'
import ApiResourcePicker from './ApiResourcePicker.vue'
import { executeOperation } from '@/services/api-operations'
import { normalizeList } from '@/utils/api'
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

interface ItemUOMConversion {
  from_uom_id?: number | string
  to_uom_id?: number | string
  multiplier?: number | string
  is_active?: boolean
}

const previousSupplier = ref(props.supplierId)
const loadingItemContexts = new Set<string>()
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
const showLotColumn = computed(
  () =>
    supports('lot_no') &&
    props.modelValue.some((line) => String(line.tracking_type ?? '').toUpperCase() === 'LOT'),
)
const showPriceColumns = computed(() => supports('unit_price'))
const visibleColumnCount = computed(
  () =>
    3 +
    Number(showRequestLineColumn.value) +
    Number(supports('part_id')) +
    Number(supports('uom_id')) +
    Number(supports('ordered_qty')) +
    Number(showPriceColumns.value) * 2 +
    Number(showLotColumn.value) +
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizedPrice(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 10000) / 10000
}

function requestLineTitle(line: Record<string, unknown>, index: number): string {
  const lineNo = Number(line._request_line_no)
  return `Baris Permintaan ${Number.isFinite(lineNo) && lineNo > 0 ? lineNo : index + 1}`
}

function requestLineMeta(line: Record<string, unknown>): string {
  const requestNo = String(line._request_no ?? '').trim()
  if (requestNo) return requestNo
  return `ID baris ${String(line.request_line_id ?? '—')}`
}

function requestLineRecommendation(line: Record<string, unknown>): string {
  const shortage = asNumber(line._central_shortage_qty)
  return shortage > 0 ? `Saran pengadaan ${shortage}` : ''
}

function blankLine(): Record<string, unknown> {
  const line: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(properties.value)) {
    if (field.default !== undefined) line[key] = field.default
    else if (field.type === 'number' || field.type === 'integer') line[key] = ''
    else line[key] = ''
  }
  line._line_total = ''
  line._price_input_mode = 'unit'
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

function uomFactor(line: Record<string, unknown>, uomID: unknown): number {
  const factors = asRecord(line._uom_factors)
  const factor = asNumber(factors[String(uomID ?? '')])
  return factor > 0 ? factor : 1
}

function recalculateTotal(line: Record<string, unknown>): Record<string, unknown> {
  const qty = asNumber(line.ordered_qty)
  const unitPrice = asNumber(line.unit_price)
  return {
    ...line,
    _line_total: qty > 0 && unitPrice >= 0 ? normalizedPrice(qty * unitPrice) : '',
  }
}

function updateUOM(line: Record<string, unknown>, value: unknown): Record<string, unknown> {
  const previousFactor = asNumber(line._uom_factor) || uomFactor(line, line.uom_id)
  const nextFactor = uomFactor(line, value)
  const currentUnitPrice = asNumber(line.unit_price)
  const storedBasePrice = asNumber(line._base_unit_price)
  const baseUnitPrice =
    storedBasePrice > 0
      ? storedBasePrice
      : currentUnitPrice > 0
        ? currentUnitPrice / Math.max(previousFactor, Number.EPSILON)
        : 0
  const next: Record<string, unknown> = {
    ...line,
    uom_id: value,
    _uom_factor: nextFactor,
    _base_unit_price: baseUnitPrice || '',
  }
  if (String(line._price_input_mode ?? 'unit') === 'total') {
    const qty = asNumber(line.ordered_qty)
    const total = asNumber(line._line_total)
    const unitPrice = qty > 0 ? normalizedPrice(total / qty) : 0
    next.unit_price = unitPrice || ''
    next._base_unit_price = unitPrice > 0 ? normalizedPrice(unitPrice / nextFactor) : ''
    return next
  }
  if (baseUnitPrice > 0) next.unit_price = normalizedPrice(baseUnitPrice * nextFactor)
  return recalculateTotal(next)
}

function updateLine(index: number, key: string, value: unknown) {
  const next = [...props.modelValue]
  let line = { ...(next[index] ?? {}) }
  if (key === 'item_id') {
    line = {
      ...line,
      item_id: value,
      part_id: '',
      uom_id: '',
      lot_no: '',
      tracking_type: '',
      _base_uom_id: '',
      _uom_factor: 1,
      _uom_factors: {},
      _base_unit_price: '',
      _line_total: '',
      _price_input_mode: 'unit',
    }
  } else if (key === 'uom_id') {
    line = updateUOM(line, value)
  } else {
    line[key] = value
  }
  next[index] = line
  emit('update:modelValue', next)
}

function fieldValue(line: Record<string, unknown>, key: string): unknown {
  return line[key]
}

function updateQuantity(index: number, event: Event) {
  const next = [...props.modelValue]
  const line: Record<string, unknown> = {
    ...(next[index] ?? {}),
    ordered_qty: (event.target as HTMLInputElement).value,
  }
  if (String(line._price_input_mode ?? 'unit') === 'total' && line._line_total !== '') {
    const qty = asNumber(line.ordered_qty)
    const total = asNumber(line._line_total)
    const factor = uomFactor(line, line.uom_id)
    const unitPrice = qty > 0 ? normalizedPrice(total / qty) : 0
    next[index] = {
      ...line,
      unit_price: unitPrice || '',
      _base_unit_price: unitPrice > 0 ? normalizedPrice(unitPrice / factor) : '',
    }
  } else {
    next[index] = recalculateTotal(line)
  }
  emit('update:modelValue', next)
}

function updateUnitPrice(index: number, event: Event) {
  const next = [...props.modelValue]
  const input = (event.target as HTMLInputElement).value
  const line = { ...(next[index] ?? {}) }
  const factor = uomFactor(line, line.uom_id)
  const unitPrice = asNumber(input)
  next[index] = recalculateTotal({
    ...line,
    unit_price: input,
    _uom_factor: factor,
    _base_unit_price: unitPrice > 0 ? normalizedPrice(unitPrice / factor) : '',
    _price_input_mode: 'unit',
  })
  emit('update:modelValue', next)
}

function updateTotalPrice(index: number, event: Event) {
  const next = [...props.modelValue]
  const input = (event.target as HTMLInputElement).value
  const line = { ...(next[index] ?? {}) }
  const qty = asNumber(line.ordered_qty)
  const total = asNumber(input)
  const factor = uomFactor(line, line.uom_id)
  const unitPrice = qty > 0 ? normalizedPrice(total / qty) : 0
  next[index] = {
    ...line,
    unit_price: qty > 0 && input !== '' ? unitPrice : '',
    _line_total: input,
    _uom_factor: factor,
    _base_unit_price: unitPrice > 0 ? normalizedPrice(unitPrice / factor) : '',
    _price_input_mode: 'total',
  }
  emit('update:modelValue', next)
}

function updateTextInput(index: number, key: string, event: Event) {
  updateLine(index, key, (event.target as HTMLInputElement).value)
}

function conversionFactors(
  baseUOMID: unknown,
  conversions: ItemUOMConversion[],
): Record<string, number> {
  const base = String(baseUOMID ?? '')
  if (!base) return {}
  const adjacency = new Map<string, Array<{ id: string; factor: number }>>()
  const addEdge = (from: string, to: string, factor: number) => {
    if (!from || !to || !Number.isFinite(factor) || factor <= 0) return
    const edges = adjacency.get(from) ?? []
    edges.push({ id: to, factor })
    adjacency.set(from, edges)
  }
  for (const conversion of conversions) {
    if (conversion.is_active === false) continue
    const from = String(conversion.from_uom_id ?? '')
    const to = String(conversion.to_uom_id ?? '')
    const multiplier = asNumber(conversion.multiplier)
    addEdge(from, to, multiplier)
    addEdge(to, from, multiplier > 0 ? 1 / multiplier : 0)
  }

  const factors: Record<string, number> = { [base]: 1 }
  for (const start of new Set([base, ...adjacency.keys()])) {
    const queue: Array<{ id: string; factor: number }> = [{ id: start, factor: 1 }]
    const visited = new Set<string>()
    while (queue.length) {
      const current = queue.shift()
      if (!current || visited.has(current.id)) continue
      visited.add(current.id)
      if (current.id === base) {
        factors[start] = current.factor
        break
      }
      for (const edge of adjacency.get(current.id) ?? []) {
        if (!visited.has(edge.id)) {
          queue.push({ id: edge.id, factor: current.factor * edge.factor })
        }
      }
    }
  }
  return factors
}

async function hydrateItemContext(
  index: number,
  itemID: unknown,
  supplierPrice?: unknown,
): Promise<void> {
  const normalizedItemID = asNumber(itemID)
  if (!normalizedItemID) return
  const key = `${index}:${normalizedItemID}`
  if (loadingItemContexts.has(key)) return
  loadingItemContexts.add(key)
  try {
    const [detailPayload, conversionPayload] = await Promise.all([
      executeOperation('FindItemByID', { path: { id: String(normalizedItemID) } }),
      executeOperation('FindItemUOMConversionsByItemID', {
        path: { id: String(normalizedItemID) },
      }),
    ])
    const detail = asRecord(detailPayload)
    const current = props.modelValue[index]
    if (!current || asNumber(current.item_id) !== normalizedItemID) return

    const baseUOMID = detail.base_uom_id ?? current.uom_id
    const conversions = normalizeList<ItemUOMConversion>(conversionPayload)
    const factors = conversionFactors(baseUOMID, conversions)
    const selectedUOMID = current.uom_id || baseUOMID
    const factor = factors[String(selectedUOMID ?? '')] || 1
    const supplierBasePrice = asNumber(supplierPrice)
    const currentBasePrice = asNumber(current._base_unit_price)
    const basePrice = currentBasePrice || supplierBasePrice
    const next = [...props.modelValue]
    let line: Record<string, unknown> = {
      ...current,
      tracking_type: String(detail.tracking_type ?? current.tracking_type ?? '').toUpperCase(),
      uom_id: selectedUOMID,
      _base_uom_id: baseUOMID,
      _uom_factors: factors,
      _uom_factor: factor,
      _base_unit_price: basePrice || '',
    }
    if (String(line.tracking_type) !== 'LOT') line.lot_no = ''
    if ((line.unit_price === '' || line.unit_price === undefined) && basePrice > 0) {
      line.unit_price = normalizedPrice(basePrice * factor)
      line._price_input_mode = 'unit'
    }
    line = recalculateTotal(line)
    next[index] = line
    emit('update:modelValue', next)
  } finally {
    loadingItemContexts.delete(key)
  }
}

async function applyItemSelection(index: number, row: Record<string, unknown>) {
  const next = [...props.modelValue]
  const line: Record<string, unknown> = {
    ...(next[index] ?? {}),
    item_id: row.item_id,
    part_id: '',
    uom_id: '',
    lot_no: '',
    tracking_type: String(row.tracking_type ?? '').toUpperCase(),
    _base_uom_id: '',
    _uom_factor: 1,
    _uom_factors: {},
    _base_unit_price: row.last_purchase_price ?? '',
    _line_total: '',
    _price_input_mode: 'unit',
  }
  next[index] = line
  emit('update:modelValue', next)
  await hydrateItemContext(index, row.item_id, row.last_purchase_price)
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
            ? { ...line, unit_price: '', _base_unit_price: '', _line_total: '' }
            : {
                ...line,
                item_id: '',
                part_id: '',
                uom_id: '',
                lot_no: '',
                tracking_type: '',
                unit_price: '',
                _base_unit_price: '',
                _line_total: '',
              },
        ),
      )
    }
    previousSupplier.value = value
  },
)

watch(
  () =>
    props.modelValue
      .map((line) => `${line.item_id ?? ''}:${line.tracking_type ?? ''}:${line._base_uom_id ?? ''}`)
      .join('|'),
  () => {
    props.modelValue.forEach((line, index) => {
      if (asNumber(line.item_id) > 0 && !line._base_uom_id) {
        void hydrateItemContext(index, line.item_id)
      }
    })
  },
  { immediate: true },
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
            <th class="po-lines-table__item">Barang *</th>
            <th v-if="supports('part_id')" class="po-lines-table__part">Part Number</th>
            <th v-if="supports('uom_id')" class="po-lines-table__uom">UOM *</th>
            <th v-if="supports('ordered_qty')" class="po-lines-table__quantity">Qty *</th>
            <th v-if="showPriceColumns" class="po-lines-table__price">Harga Satuan</th>
            <th v-if="showPriceColumns" class="po-lines-table__price">Harga Total</th>
            <th v-if="showLotColumn" class="po-lines-table__lot">Lot / Batch</th>
            <th v-if="supports('notes')" class="po-lines-table__notes">Catatan</th>
            <th class="po-lines-table__action">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, index) in modelValue" :key="index">
            <td class="po-lines-table__number">{{ index + 1 }}</td>
            <td v-if="showRequestLineColumn">
              <span v-if="line.request_line_id" class="po-lines-table__request-line">
                <strong>{{ requestLineTitle(line, index) }}</strong>
                <small>{{ requestLineMeta(line) }}</small>
                <small v-if="requestLineRecommendation(line)" class="po-lines-table__request-hint">
                  {{ requestLineRecommendation(line) }} · boleh ditambah
                </small>
              </span>
              <span v-else>—</span>
            </td>
            <td class="po-lines-table__item">
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
            <td v-if="supports('part_id')" class="po-lines-table__part">
              <ApiOptionField
                field-name="part_id"
                :model-value="fieldValue(line, 'part_id')"
                :root-model="line"
                :disabled="disabled || !line.item_id"
                :clearable="false"
                @update:model-value="updateLine(index, 'part_id', $event)"
              />
            </td>
            <td v-if="supports('uom_id')" class="po-lines-table__uom">
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
            <td v-if="supports('ordered_qty')" class="po-lines-table__quantity">
              <input
                class="field__control"
                type="number"
                min="0"
                step="any"
                :value="String(line.ordered_qty ?? '')"
                :disabled="disabled"
                required
                @input="updateQuantity(index, $event)"
              />
            </td>
            <td v-if="showPriceColumns" class="po-lines-table__price">
              <input
                class="field__control"
                type="number"
                min="0"
                step="any"
                :value="String(line.unit_price ?? '')"
                :disabled="disabled"
                placeholder="Harga per UOM"
                @input="updateUnitPrice(index, $event)"
              />
            </td>
            <td v-if="showPriceColumns" class="po-lines-table__price">
              <input
                class="field__control"
                type="number"
                min="0"
                step="any"
                :value="String(line._line_total ?? '')"
                :disabled="disabled"
                placeholder="Qty × harga"
                @input="updateTotalPrice(index, $event)"
              />
            </td>
            <td v-if="showLotColumn" class="po-lines-table__lot">
              <input
                v-if="String(line.tracking_type ?? '').toUpperCase() === 'LOT'"
                class="field__control"
                type="text"
                :value="String(line.lot_no ?? '')"
                :disabled="disabled"
                placeholder="Nomor lot"
                @input="updateTextInput(index, 'lot_no', $event)"
              />
              <span v-else class="po-lines-table__not-applicable">Tidak digunakan</span>
            </td>
            <td v-if="supports('notes')" class="po-lines-table__notes">
              <input
                class="field__control"
                type="text"
                :value="String(line.notes ?? '')"
                :disabled="disabled"
                @input="updateTextInput(index, 'notes', $event)"
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
