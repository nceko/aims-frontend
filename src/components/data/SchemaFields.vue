<script setup lang="ts">
import { computed } from 'vue'
import { Plus, Trash2 } from '@lucide/vue'
import ApiOptionField from './ApiOptionField.vue'
import ApiResourcePicker from './ApiResourcePicker.vue'
import type { ApiSchema } from '@/types/resource'
import { fieldOptionSources, humanizeField } from '@/config/field-options'
import { fieldResourcePickers } from '@/config/field-resource-pickers'
import { initialValue, inputType, isLongTextField } from '@/utils/schema'

defineOptions({ name: 'SchemaFields' })
const props = withDefaults(
  defineProps<{
    schema: ApiSchema
    modelValue: Record<string, unknown>
    rootModel?: Record<string, unknown>
    disabled?: boolean
  }>(),
  { rootModel: undefined, disabled: false },
)
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, unknown>] }>()
const root = computed(() => props.rootModel ?? props.modelValue)
const requiredFields = computed(() => new Set(props.schema.required ?? []))
const entries = computed(() =>
  Object.entries(props.schema.properties ?? {}).filter(
    ([key, schema]) =>
      !schema.readOnly && !['created_at', 'updated_at', 'deleted_at'].includes(key),
  ),
)

function update(key: string, value: unknown) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
function hasResourcePicker(name: string): boolean {
  return Boolean(fieldResourcePickers[name])
}
function hasOptions(name: string, schema: ApiSchema): boolean {
  return Boolean(fieldOptionSources[name] || schema.enum?.length)
}
function applyResourceSelection(name: string, row: Record<string, unknown>) {
  const source = fieldResourcePickers[name]
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
  <div class="schema-form-grid">
    <template v-for="[name, child] in entries" :key="name">
      <fieldset
        v-if="child.type === 'object' || child.properties"
        class="schema-fieldset schema-fieldset--full"
      >
        <legend>{{ humanizeField(name) }}</legend>
        <SchemaFields
          :schema="child"
          :model-value="(modelValue[name] as Record<string, unknown>) || {}"
          :root-model="root"
          :disabled="disabled"
          @update:model-value="update(name, $event)"
        />
      </fieldset>

      <fieldset
        v-else-if="child.type === 'array' && child.items?.type === 'object'"
        class="schema-fieldset schema-fieldset--full"
      >
        <legend>{{ humanizeField(name) }} <b v-if="requiredFields.has(name)">*</b></legend>
        <div class="repeatable-list">
          <article
            v-for="(item, index) in (modelValue[name] as unknown[]) || []"
            :key="index"
            class="repeatable-item"
          >
            <div class="repeatable-item__header">
              <strong>{{ humanizeField(name) }} #{{ index + 1 }}</strong
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
              :root-model="(item as Record<string, unknown>) || root"
              :disabled="disabled"
              @update:model-value="updateArrayItem(name, index, $event)"
            />
          </article>
          <button
            type="button"
            class="repeatable-add"
            :disabled="disabled"
            @click="addArrayItem(name, child)"
          >
            <Plus :size="16" /> Tambah {{ humanizeField(name) }}
          </button>
        </div>
      </fieldset>

      <label
        v-else
        class="field"
        :class="{ 'field--full': isLongTextField(name) || child.type === 'array' }"
      >
        <span class="field__label"
          >{{ humanizeField(name) }} <b v-if="requiredFields.has(name)">*</b></span
        >
        <ApiResourcePicker
          v-if="hasResourcePicker(name)"
          :field-name="name"
          :model-value="modelValue[name]"
          :root-model="root"
          :source="fieldResourcePickers[name]!"
          :required="requiredFields.has(name)"
          :disabled="disabled"
          @update:model-value="update(name, $event)"
          @select="applyResourceSelection(name, $event)"
        />
        <ApiOptionField
          v-else-if="hasOptions(name, child)"
          :field-name="name"
          :model-value="modelValue[name]"
          :root-model="root"
          :multiple="child.type === 'array'"
          :required="requiredFields.has(name)"
          :disabled="disabled"
          :enum-values="child.enum"
          @update:model-value="update(name, $event)"
        />
        <label v-else-if="child.type === 'boolean'" class="checkbox-control">
          <input
            type="checkbox"
            :checked="Boolean(modelValue[name])"
            :disabled="disabled"
            @change="update(name, ($event.target as HTMLInputElement).checked)"
          />
          <span>{{ Boolean(modelValue[name]) ? 'Ya' : 'Tidak' }}</span>
        </label>
        <textarea
          v-else-if="isLongTextField(name)"
          class="field__control field__textarea"
          :value="String(modelValue[name] ?? '')"
          :required="requiredFields.has(name)"
          :disabled="disabled"
          rows="3"
          @input="update(name, ($event.target as HTMLTextAreaElement).value)"
        ></textarea>
        <input
          v-else-if="child.type !== 'array'"
          class="field__control"
          :type="inputType(child, name)"
          :step="child.type === 'number' ? 'any' : undefined"
          :value="String(modelValue[name] ?? '')"
          :required="requiredFields.has(name)"
          :disabled="disabled"
          @input="update(name, ($event.target as HTMLInputElement).value)"
        />
        <input
          v-else
          class="field__control"
          type="text"
          :value="primitiveArrayValue(modelValue[name])"
          :required="requiredFields.has(name)"
          :disabled="disabled"
          placeholder="Pisahkan dengan koma"
          @input="updatePrimitiveArray(name, $event)"
        />
        <small v-if="child.description" class="field__hint">{{ child.description }}</small>
      </label>
    </template>
  </div>
</template>
