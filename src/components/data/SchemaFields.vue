<script setup lang="ts">
import { computed } from 'vue'
import { Plus, Trash2 } from '@lucide/vue'
import ApiOptionField from './ApiOptionField.vue'
import ApiResourcePicker from './ApiResourcePicker.vue'
import PurchaseOrderLinesField from './PurchaseOrderLinesField.vue'
import GoodsReceiptLinesField from './GoodsReceiptLinesField.vue'
import ItemRequestApprovalLinesField from './ItemRequestApprovalLinesField.vue'
import ItemRequestLinesField from './ItemRequestLinesField.vue'
import ItemUsageRequestLinesField from './ItemUsageRequestLinesField.vue'
import DeliveryOrderRequestLinesField from './DeliveryOrderRequestLinesField.vue'
import DeliveryOrderConfirmationLinesField from './DeliveryOrderConfirmationLinesField.vue'
import PermissionCheckboxField from './PermissionCheckboxField.vue'
import type { ApiSchema, FieldResourcePickerSource } from '@/types/resource'
import { fieldOptionSources, humanizeField } from '@/config/field-options'
import { fieldResourcePickers } from '@/config/field-resource-pickers'
import { initialValue, inputType, isLongTextField } from '@/utils/schema'
import { groupFieldEntries } from '@/utils/field-grouping'
import { useAuthStore } from '@/modules/auth/auth.store'

defineOptions({ name: 'SchemaFields' })
const props = withDefaults(
  defineProps<{
    schema: ApiSchema
    modelValue: Record<string, unknown>
    rootModel?: Record<string, unknown>
    disabled?: boolean
    fieldOrder?: string[]
    disabledFields?: string[]
    optionDefaults?: Record<string, string>
    nested?: boolean
    groupingContext?: string
  }>(),
  {
    rootModel: undefined,
    disabled: false,
    fieldOrder: () => [],
    disabledFields: () => [],
    optionDefaults: () => ({}),
    nested: false,
    groupingContext: '',
  },
)
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, unknown>] }>()
const auth = useAuthStore()
const root = computed(() => props.rootModel ?? props.modelValue)
const contextModel = computed(() => ({ ...root.value, ...props.modelValue }))
const requiredFields = computed(() => new Set(props.schema.required ?? []))
function fieldVisible(key: string): boolean {
  const model = contextModel.value
  const issueMode = String(model.issue_mode ?? '').toUpperCase()
  const itemUsageContext = props.groupingContext.includes('item-usages')
  const purchaseOrderContext = props.groupingContext.includes('purchase-orders')
  if (
    purchaseOrderContext &&
    key === 'source_request_id' &&
    !auth.isSuperAdmin &&
    !auth.user?.is_central_location
  ) {
    return false
  }
  if (itemUsageContext && key === 'source_request_id' && issueMode !== 'REQUEST') return false
  if (itemUsageContext && key === 'request_line_id' && issueMode !== 'REQUEST') return false
  if (itemUsageContext && key === 'issue_mode') return false
  if (
    itemUsageContext &&
    issueMode === 'REQUEST' &&
    [
      'reference_no',
      'responsibility_type',
      'responsibility_location_id',
      'responsibility_division_id',
      'responsibility_employee_id',
      'responsibility_vehicle_id',
    ].includes(key)
  ) {
    return false
  }

  const responsibilityType = String(model.responsibility_type ?? '').toUpperCase()
  const responsibilityFields: Record<string, string> = {
    responsibility_location_id: 'LOCATION',
    responsibility_division_id: 'DIVISION',
    responsibility_employee_id: 'EMPLOYEE',
    responsibility_vehicle_id: 'VEHICLE',
  }
  if (responsibilityFields[key] && responsibilityType) {
    return responsibilityFields[key] === responsibilityType
  }
  return true
}

const entries = computed(() => {
  const order = new Map(props.fieldOrder.map((field, index) => [field, index]))
  return Object.entries(props.schema.properties ?? {})
    .filter(
      ([key, schema]) =>
        !schema.readOnly &&
        !['created_at', 'updated_at', 'deleted_at'].includes(key) &&
        fieldVisible(key),
    )
    .sort(([left], [right]) => {
      const leftIndex = order.get(left) ?? Number.MAX_SAFE_INTEGER
      const rightIndex = order.get(right) ?? Number.MAX_SAFE_INTEGER
      return leftIndex - rightIndex
    })
})
const groups = computed(() =>
  groupFieldEntries(
    entries.value,
    (_key, schema) =>
      schema.type === 'array' ? [] : schema.type === 'object' || schema.properties ? {} : undefined,
    props.groupingContext || props.schema.ref,
  ),
)

function fieldDisabled(name: string): boolean {
  const context = props.groupingContext.toLocaleLowerCase('id-ID')
  const goodsReceiptWithPO = context.includes('goods-receipts') && Boolean(contextModel.value.po_id)
  if (goodsReceiptWithPO && ['warehouse_id', 'supplier_id'].includes(name)) return true
  return props.disabled || props.disabledFields.includes(name)
}

function fieldFullWidth(name: string, schema: ApiSchema): boolean {
  const context = props.groupingContext.toLocaleLowerCase('id-ID')
  if (context.includes('goods-receipts') && name === 'po_id') return true
  return isLongTextField(name) || schema.type === 'array'
}

function fieldLabel(name: string): string {
  const context = props.groupingContext.toLocaleLowerCase('id-ID')
  if (context.includes('checkitemrequeststock') && name === 'warehouse_id') {
    return 'Gudang Sumber Stok'
  }
  if (context.includes('item-usages')) {
    if (name === 'warehouse_id') return 'Gudang Pengeluaran'
    if (name === 'location_id') return 'Lokasi Pengeluaran'
    if (name === 'usage_type') return 'Jenis Penggunaan'
    if (name === 'source_request_id') return 'Permintaan Barang'
  }
  return humanizeField(name)
}

function fieldHint(name: string, schema: ApiSchema): string {
  const context = props.groupingContext.toLocaleLowerCase('id-ID')
  const issueMode = String(contextModel.value.issue_mode ?? '').toUpperCase()
  if (context.includes('item-usages') && issueMode === 'REQUEST') {
    if (name === 'warehouse_id') {
      return 'Ditentukan otomatis dari gudang pemenuh pada permintaan dan dikunci agar stok keluar dari gudang yang benar.'
    }
    if (name === 'location_id') {
      return 'Mengikuti lokasi permintaan lokal dan tidak dapat diubah pada proses ini.'
    }
  }
  if (context.includes('delivery-orders')) {
    if (name === 'from_warehouse_id') {
      return 'Otomatis mengikuti gudang pemenuh pada permintaan.'
    }
    if (name === 'to_warehouse_id') {
      return 'Otomatis mengikuti gudang pemohon pada permintaan.'
    }
  }
  return schema.description ?? ''
}

function update(key: string, value: unknown) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
function hasResourcePicker(name: string): boolean {
  return Boolean(fieldResourcePickers[name])
}
function resourcePickerSource(name: string): FieldResourcePickerSource | undefined {
  const source = fieldResourcePickers[name]
  if (!source || name !== 'source_request_id') return source
  if (props.groupingContext.includes('purchase-orders')) {
    return {
      ...source,
      title: 'Pilih Permintaan yang Memerlukan Pengadaan',
      description:
        'Permintaan yang kekurangan stok akan dihubungkan ke PO agar otomatis kembali siap dipenuhi setelah barang diterima.',
      allowedStatuses: ['WAITING_PURCHASE', 'APPROVED', 'PARTIALLY_FULFILLED'],
      columns: [
        ...(source.columns ?? []).filter((column) => column.key !== 'status'),
        { key: 'procurement_shortage_qty', label: 'Kekurangan Stok', width: '150px' },
        ...(source.columns ?? []).filter((column) => column.key === 'status'),
      ],
      rowFilter: (row) => Number(row.procurement_shortage_qty ?? 0) > 0,
      filteredEmptyDescription:
        'Tidak ada permintaan dengan kekurangan stok yang masih perlu dibuatkan Pesanan Pembelian.',
    }
  }
  if (props.groupingContext.includes('item-usages')) {
    return {
      ...source,
      title: 'Pilih Permintaan Siap Dikeluarkan',
      description:
        'Hanya permintaan lokal yang gudang pemohon dan gudang pemenuhnya sama. Permintaan antar lokasi diproses melalui Surat Jalan / Delivery Order.',
      allowedStatuses: ['APPROVED', 'STOCK_AVAILABLE', 'WAITING_PURCHASE', 'PARTIALLY_FULFILLED'],
      rowFilter: (row) => {
        const requesterWarehouseID = Number(row.requester_warehouse_id)
        const fulfillmentWarehouseID = Number(row.fulfillment_warehouse_id)
        return (
          requesterWarehouseID > 0 &&
          fulfillmentWarehouseID > 0 &&
          requesterWarehouseID === fulfillmentWarehouseID
        )
      },
      filteredEmptyDescription:
        'Tidak ada permintaan lokal yang siap dikeluarkan. Jika gudang pemenuh berbeda dari gudang pemohon, gunakan Surat Jalan / Delivery Order.',
    }
  }
  return source
}
function hasOptions(name: string, schema: ApiSchema): boolean {
  return Boolean(fieldOptionSources[name] || schema.enum?.length)
}
function isPurchaseOrderLines(name: string, schema: ApiSchema): boolean {
  return (
    name === 'lines' &&
    Boolean(schema.items?.ref?.includes('PurchaseOrderLine')) &&
    Boolean(schema.items?.properties?.ordered_qty)
  )
}
function isGoodsReceiptLines(name: string, schema: ApiSchema): boolean {
  return (
    name === 'lines' &&
    props.groupingContext.includes('goods-receipts') &&
    Boolean(schema.items?.ref?.includes('GoodsReceiptLine')) &&
    Boolean(schema.items?.properties?.received_qty) &&
    Boolean(schema.items?.properties?.accepted_qty)
  )
}
function isItemRequestApprovalLines(name: string, schema: ApiSchema): boolean {
  return (
    name === 'lines' &&
    Boolean(schema.items?.ref?.includes('ApproveItemRequestLine')) &&
    Boolean(schema.items?.properties?.approved_qty)
  )
}
function isItemRequestLines(name: string, schema: ApiSchema): boolean {
  return (
    name === 'lines' &&
    Boolean(schema.items?.ref?.includes('CreateItemRequestLine')) &&
    Boolean(schema.items?.properties?.requested_qty)
  )
}
function isItemUsageRequestLines(name: string, schema: ApiSchema): boolean {
  return (
    name === 'lines' &&
    props.groupingContext.includes('item-usages') &&
    String(contextModel.value.issue_mode ?? '').toUpperCase() === 'REQUEST' &&
    Boolean(schema.items?.ref?.includes('CreateItemUsageLine'))
  )
}
function isDeliveryOrderRequestLines(name: string, schema: ApiSchema): boolean {
  return (
    name === 'lines' &&
    props.groupingContext.includes('delivery-orders') &&
    Boolean(schema.items?.ref?.includes('CreateDeliveryOrderLine'))
  )
}
function isDeliveryOrderConfirmationLines(name: string, schema: ApiSchema): boolean {
  return (
    name === 'lines' &&
    props.groupingContext.includes('delivery-orders') &&
    (props.groupingContext.includes('ConfirmDeliveryOrderPicking') ||
      props.groupingContext.includes('ConfirmDeliveryOrderPacking')) &&
    Boolean(schema.items?.properties?.delivery_line_id) &&
    Boolean(schema.items?.properties?.qty)
  )
}
function deliveryConfirmationStage(): 'picking' | 'packing' {
  return props.groupingContext.includes('ConfirmDeliveryOrderPacking') ? 'packing' : 'picking'
}
function applyResourceSelection(name: string, row: Record<string, unknown>) {
  const source = resourcePickerSource(name)
  if (!source) return
  const patch: Record<string, unknown> = {
    [name]: row[source.valueKey],
  }
  for (const [targetKey, sourceKey] of Object.entries(source.selectionEffects ?? {})) {
    const value = row[sourceKey]
    if (value !== undefined && value !== null) patch[targetKey] = value
  }
  for (const field of source.clearFields ?? []) patch[field] = ''
  emit('update:modelValue', { ...props.modelValue, ...patch })
}
function addArrayItem(key: string, schema: ApiSchema) {
  const current = Array.isArray(props.modelValue[key])
    ? [...(props.modelValue[key] as unknown[])]
    : []
  current.push(initialValue(schema.items))
  update(key, current)
}
function updateArrayItem(key: string, index: number, value: unknown) {
  const current = Array.isArray(props.modelValue[key])
    ? [...(props.modelValue[key] as unknown[])]
    : []
  current[index] = value
  update(key, current)
}
function removeArrayItem(key: string, index: number) {
  const current = Array.isArray(props.modelValue[key])
    ? [...(props.modelValue[key] as unknown[])]
    : []
  current.splice(index, 1)
  update(key, current)
}
function primitiveArrayValue(value: unknown): string {
  return Array.isArray(value) ? value.join(', ') : ''
}
function updatePrimitiveArray(key: string, event: Event) {
  const text = (event.target as HTMLInputElement).value
  update(
    key,
    text
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )
}
</script>

<template>
  <div class="schema-form-sections">
    <section
      v-for="group in groups"
      :key="group.key"
      class="form-section"
      :class="{ 'form-section--nested': nested }"
    >
      <header v-if="!nested" class="form-section__header">
        <h3>{{ group.title }}</h3>
        <p>{{ group.description }}</p>
      </header>
      <div class="schema-form-grid">
        <template v-for="[name, child] in group.entries" :key="name">
          <fieldset v-if="name === 'permission_ids'" class="schema-fieldset schema-fieldset--full">
            <legend>{{ fieldLabel(name) }} <b v-if="requiredFields.has(name)">*</b></legend>
            <PermissionCheckboxField
              :model-value="modelValue[name]"
              :disabled="fieldDisabled(name)"
              @update:model-value="update(name, $event)"
            />
          </fieldset>

          <fieldset
            v-else-if="child.type === 'object' || child.properties"
            class="schema-fieldset schema-fieldset--full"
          >
            <legend>{{ fieldLabel(name) }}</legend>
            <SchemaFields
              :schema="child"
              :model-value="(modelValue[name] as Record<string, unknown>) || {}"
              :root-model="contextModel"
              :disabled="fieldDisabled(name)"
              :grouping-context="groupingContext"
              nested
              @update:model-value="update(name, $event)"
            />
          </fieldset>

          <fieldset
            v-else-if="
              child.type === 'array' &&
              child.items?.type === 'object' &&
              isItemRequestApprovalLines(name, child)
            "
            class="schema-fieldset schema-fieldset--full"
          >
            <legend>Barang yang Disetujui <b v-if="requiredFields.has(name)">*</b></legend>
            <ItemRequestApprovalLinesField
              :model-value="(modelValue[name] as Record<string, unknown>[]) || []"
              :disabled="fieldDisabled(name)"
              @update:model-value="update(name, $event)"
            />
          </fieldset>

          <fieldset
            v-else-if="
              child.type === 'array' &&
              child.items?.type === 'object' &&
              isItemRequestLines(name, child)
            "
            class="schema-fieldset schema-fieldset--full"
          >
            <legend>Daftar Barang Diminta <b v-if="requiredFields.has(name)">*</b></legend>
            <ItemRequestLinesField
              :schema="child.items"
              :model-value="(modelValue[name] as Record<string, unknown>[]) || []"
              :disabled="fieldDisabled(name)"
              :required="requiredFields.has(name)"
              @update:model-value="update(name, $event)"
            />
          </fieldset>

          <fieldset
            v-else-if="
              child.type === 'array' &&
              child.items?.type === 'object' &&
              isItemUsageRequestLines(name, child)
            "
            class="schema-fieldset schema-fieldset--full"
          >
            <legend>Barang yang Dikeluarkan <b v-if="requiredFields.has(name)">*</b></legend>
            <ItemUsageRequestLinesField
              :model-value="(modelValue[name] as Record<string, unknown>[]) || []"
              :disabled="fieldDisabled(name)"
              :required="requiredFields.has(name)"
              @update:model-value="update(name, $event)"
            />
          </fieldset>

          <fieldset
            v-else-if="
              child.type === 'array' &&
              child.items?.type === 'object' &&
              isDeliveryOrderConfirmationLines(name, child)
            "
            class="schema-fieldset schema-fieldset--full"
          >
            <legend>Daftar Barang <b v-if="requiredFields.has(name)">*</b></legend>
            <DeliveryOrderConfirmationLinesField
              :model-value="(modelValue[name] as Record<string, unknown>[]) || []"
              :stage="deliveryConfirmationStage()"
              :disabled="fieldDisabled(name)"
            />
          </fieldset>

          <fieldset
            v-else-if="
              child.type === 'array' &&
              child.items?.type === 'object' &&
              isDeliveryOrderRequestLines(name, child)
            "
            class="schema-fieldset schema-fieldset--full"
          >
            <legend>Barang yang Dikirim <b v-if="requiredFields.has(name)">*</b></legend>
            <DeliveryOrderRequestLinesField
              :model-value="(modelValue[name] as Record<string, unknown>[]) || []"
              :disabled="fieldDisabled(name)"
              @update:model-value="update(name, $event)"
            />
          </fieldset>

          <fieldset
            v-else-if="
              child.type === 'array' &&
              child.items?.type === 'object' &&
              isGoodsReceiptLines(name, child)
            "
            class="schema-fieldset schema-fieldset--full"
          >
            <legend>Rincian Barang Diterima <b v-if="requiredFields.has(name)">*</b></legend>
            <GoodsReceiptLinesField
              :schema="child.items"
              :model-value="(modelValue[name] as Record<string, unknown>[]) || []"
              :disabled="fieldDisabled(name)"
              :required="requiredFields.has(name)"
              @update:model-value="update(name, $event)"
            />
          </fieldset>

          <fieldset
            v-else-if="
              child.type === 'array' &&
              child.items?.type === 'object' &&
              isPurchaseOrderLines(name, child)
            "
            class="schema-fieldset schema-fieldset--full"
          >
            <legend>{{ fieldLabel(name) }} <b v-if="requiredFields.has(name)">*</b></legend>
            <PurchaseOrderLinesField
              :schema="child.items"
              :model-value="(modelValue[name] as Record<string, unknown>[]) || []"
              :supplier-id="contextModel.supplier_id"
              :source-request-id="contextModel.source_request_id"
              :disabled="fieldDisabled(name)"
              :required="requiredFields.has(name)"
              @update:model-value="update(name, $event)"
            />
          </fieldset>

          <fieldset
            v-else-if="child.type === 'array' && child.items?.type === 'object'"
            class="schema-fieldset schema-fieldset--full"
          >
            <legend>{{ fieldLabel(name) }} <b v-if="requiredFields.has(name)">*</b></legend>
            <div class="repeatable-list">
              <article
                v-for="(item, index) in (modelValue[name] as unknown[]) || []"
                :key="index"
                class="repeatable-item"
              >
                <div class="repeatable-item__header">
                  <strong>{{ fieldLabel(name) }} #{{ index + 1 }}</strong
                  ><button
                    type="button"
                    class="icon-button icon-button--danger"
                    :disabled="disabled"
                    @click="removeArrayItem(name, index)"
                  >
                    <Trash2 :size="16" />
                  </button>
                </div>
                <SchemaFields
                  :schema="child.items"
                  :model-value="(item as Record<string, unknown>) || {}"
                  :root-model="{ ...contextModel, ...((item as Record<string, unknown>) || {}) }"
                  :disabled="disabled"
                  :disabled-fields="disabledFields"
                  :grouping-context="groupingContext"
                  nested
                  @update:model-value="updateArrayItem(name, index, $event)"
                />
              </article>
              <button
                type="button"
                class="repeatable-add"
                :disabled="disabled"
                @click="addArrayItem(name, child)"
              >
                <Plus :size="16" /> Tambah {{ fieldLabel(name) }}
              </button>
            </div>
          </fieldset>

          <label v-else class="field" :class="{ 'field--full': fieldFullWidth(name, child) }">
            <span class="field__label"
              >{{ fieldLabel(name) }} <b v-if="requiredFields.has(name)">*</b></span
            >
            <ApiResourcePicker
              v-if="hasResourcePicker(name)"
              :field-name="name"
              :model-value="modelValue[name]"
              :root-model="contextModel"
              :source="resourcePickerSource(name)!"
              :required="requiredFields.has(name)"
              :disabled="fieldDisabled(name)"
              @update:model-value="update(name, $event)"
              @select="applyResourceSelection(name, $event)"
            />
            <ApiOptionField
              v-else-if="hasOptions(name, child)"
              :field-name="name"
              :model-value="modelValue[name]"
              :root-model="contextModel"
              :multiple="child.type === 'array'"
              :required="requiredFields.has(name)"
              :disabled="fieldDisabled(name)"
              :enum-values="child.enum"
              :default-code="optionDefaults[name]"
              @update:model-value="update(name, $event)"
            />
            <label v-else-if="child.type === 'boolean'" class="checkbox-control">
              <input
                type="checkbox"
                :checked="Boolean(modelValue[name])"
                :disabled="fieldDisabled(name)"
                @change="update(name, ($event.target as HTMLInputElement).checked)"
              />
              <span>{{ Boolean(modelValue[name]) ? 'Ya' : 'Tidak' }}</span>
            </label>
            <textarea
              v-else-if="isLongTextField(name)"
              class="field__control field__textarea"
              :value="String(modelValue[name] ?? '')"
              :required="requiredFields.has(name)"
              :disabled="fieldDisabled(name)"
              rows="3"
              @input="update(name, ($event.target as HTMLTextAreaElement).value)"
            ></textarea>
            <input
              v-else-if="child.type !== 'array'"
              class="field__control"
              :type="inputType(child, name)"
              :step="child.type === 'number' ? 'any' : child.type === 'integer' ? '1' : undefined"
              :min="child.minimum"
              :max="child.maximum"
              :value="String(modelValue[name] ?? '')"
              :required="requiredFields.has(name)"
              :disabled="fieldDisabled(name)"
              @input="update(name, ($event.target as HTMLInputElement).value)"
            />
            <input
              v-else
              class="field__control"
              type="text"
              :value="primitiveArrayValue(modelValue[name])"
              :required="requiredFields.has(name)"
              :disabled="fieldDisabled(name)"
              placeholder="Pisahkan dengan koma"
              @input="updatePrimitiveArray(name, $event)"
            />
            <small v-if="fieldHint(name, child)" class="field__hint">{{
              fieldHint(name, child)
            }}</small>
          </label>
        </template>
      </div>
    </section>
  </div>
</template>
