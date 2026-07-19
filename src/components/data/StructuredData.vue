<script setup lang="ts">
import { computed } from 'vue'
import StatusBadge from './StatusBadge.vue'
import { humanizeField } from '@/config/field-options'

const props = withDefaults(defineProps<{ value: unknown; compact?: boolean }>(), { compact: false })
const entries = computed(() => {
  if (!props.value || typeof props.value !== 'object' || Array.isArray(props.value)) return []
  return Object.entries(props.value as Record<string, unknown>).filter(
    ([key]) => !['password_hash'].includes(key),
  )
})
function format(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak'
  if (typeof value === 'number')
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(value)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime()))
      return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
        date,
      )
  }
  return String(value)
}
function statusKey(key: string): boolean {
  return /(^status$|_status$|^is_active$|^success$)/.test(key)
}
</script>

<template>
  <div v-if="Array.isArray(value)" class="structured-array">
    <article v-for="(item, index) in value" :key="index" class="structured-array__item">
      <strong>#{{ index + 1 }}</strong>
      <StructuredData :value="item" compact />
    </article>
  </div>
  <dl v-else-if="entries.length" class="detail-grid" :class="{ 'detail-grid--compact': compact }">
    <template v-for="[key, item] in entries" :key="key">
      <div v-if="typeof item !== 'object' || item === null" class="detail-field">
        <dt>{{ humanizeField(key) }}</dt>
        <dd>
          <StatusBadge v-if="statusKey(key)" :value="item" /><template v-else>{{
            format(item)
          }}</template>
        </dd>
      </div>
      <div v-else class="detail-field detail-field--full">
        <dt>{{ humanizeField(key) }}</dt>
        <dd><StructuredData :value="item" compact /></dd>
      </div>
    </template>
  </dl>
  <span v-else>{{ format(value) }}</span>
</template>
