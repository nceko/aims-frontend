<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Plus, Trash2 } from '@lucide/vue'
import ApiOptionField from './ApiOptionField.vue'
import ApiResourcePicker from './ApiResourcePicker.vue'
import { fieldResourcePickers } from '@/config/field-resource-pickers'
import type { ApiSchema } from '@/types/resource'

const props = withDefaults(
  defineProps<{
    schema: ApiSchema
    modelValue: Record<string, unknown>[]
    disabled?: boolean
    required?: boolean
  }>(),
  { disabled: false, required: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>[]]
}>()

const properties = computed(() => props.schema.properties ?? {})
const itemSource = fieldResourcePickers.item_id!

function supports(name: string): boolean {
  return Boolean(properties.value[name])
}

function blankLine(): Record<string, unknown> {
  const line: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(properties.value)) {
    line[key] = field.default ?? ''
  }
  return line
}

function addLine(): void {
  emit('update:modelValue', [...props.modelValue, blankLine()])
}

function removeLine(index: number): void {
  const next = [...props.modelValue]
  next.splice(index, 1)
  emit('update:modelValue', next)
}

function updateLine(index: number, key: string, value: unknown): void {
  const next = [...props.modelValue]
  next[index] = { ...(next[index] ?? {}), [key]: value }
  if (key === 'item_id') next[index] = { ...next[index], part_id: '' }
  emit('update:modelValue', next)
}

function updateInput(index: number, key: string, event: Event): void {
  updateLine(index, key, (event.target as HTMLInputElement).value)
}

function applyItemSelection(index: number, row: Record<string, unknown>): void {
  const next = [...props.modelValue]
  next[index] = {
    ...(next[index] ?? {}),
    item_id: row.item_id,
    part_id: '',
    uom_id: row.base_uom_id ?? row.uom_id ?? next[index]?.uom_id ?? '',
  }
  emit('update:modelValue', next)
}

onMounted(() => {
  if (props.required && props.modelValue.length === 0) addLine()
})
</script>

<template>
  <div class="workflow-lines-editor">
    <div class="workflow-lines-table-wrap">
      <table class="workflow-lines-table workflow-lines-table--request">
        <thead>
          <tr>
            <th>No.</th>
            <th>Barang *</th>
            <th v-if="supports('part_id')">Part Number</th>
            <th v-if="supports('uom_id')">Satuan *</th>
            <th>Jumlah Diminta *</th>
            <th v-if="supports('lot_no')">Lot / Batch</th>
            <th v-if="supports('notes')">Catatan</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, index) in modelValue" :key="index">
            <td class="workflow-lines-table__number">{{ index + 1 }}</td>
            <td class="workflow-lines-table__picker">
              <ApiResourcePicker
                field-name="item_id"
                :model-value="line.item_id"
                :root-model="line"
                :source="itemSource"
                required
                :disabled="disabled"
                @update:model-value="updateLine(index, 'item_id', $event)"
                @select="applyItemSelection(index, $event)"
              />
            </td>
            <td v-if="supports('part_id')">
              <ApiOptionField
                field-name="part_id"
                :model-value="line.part_id"
                :root-model="line"
                :disabled="disabled || !line.item_id"
                :clearable="false"
                @update:model-value="updateLine(index, 'part_id', $event)"
              />
            </td>
            <td v-if="supports('uom_id')">
              <ApiOptionField
                field-name="uom_id"
                :model-value="line.uom_id"
                :root-model="line"
                required
                :disabled="disabled"
                :clearable="false"
                @update:model-value="updateLine(index, 'uom_id', $event)"
              />
            </td>
            <td>
              <input
                class="field__control workflow-lines-table__quantity"
                type="number"
                min="0.000001"
                step="any"
                :value="String(line.requested_qty ?? '')"
                :disabled="disabled"
                required
                @input="updateInput(index, 'requested_qty', $event)"
              />
            </td>
            <td v-if="supports('lot_no')">
              <input
                class="field__control"
                type="text"
                :value="String(line.lot_no ?? '')"
                :disabled="disabled"
                placeholder="Opsional"
                @input="updateInput(index, 'lot_no', $event)"
              />
            </td>
            <td v-if="supports('notes')">
              <input
                class="field__control"
                type="text"
                :value="String(line.notes ?? '')"
                :disabled="disabled"
                placeholder="Keterangan barang"
                @input="updateInput(index, 'notes', $event)"
              />
            </td>
            <td class="workflow-lines-table__action">
              <button
                type="button"
                class="icon-button icon-button--danger"
                aria-label="Hapus barang"
                :disabled="disabled || (required && modelValue.length <= 1)"
                @click="removeLine(index)"
              >
                <Trash2 :size="16" />
              </button>
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
