<script setup lang="ts">
import { computed } from 'vue'
import StatusBadge from './StatusBadge.vue'
import RelatedDataTable from './RelatedDataTable.vue'
import {
  detailFieldLabel,
  formatDetailValue,
  shouldHideDetailField,
  statusField,
} from '@/utils/detail-display'

const props = withDefaults(defineProps<{ value: unknown; compact?: boolean }>(), { compact: false })
const record = computed<Record<string, unknown>>(() =>
  props.value && typeof props.value === 'object' && !Array.isArray(props.value)
    ? (props.value as Record<string, unknown>)
    : {},
)
const entries = computed(() =>
  Object.entries(record.value).filter(
    ([key, value]) => !shouldHideDetailField(key, value, record.value),
  ),
)
</script>

<template>
  <RelatedDataTable v-if="Array.isArray(value)" :value="value" />
  <dl v-else-if="entries.length" class="detail-grid" :class="{ 'detail-grid--compact': compact }">
    <template v-for="[key, item] in entries" :key="key">
      <div v-if="typeof item !== 'object' || item === null" class="detail-field">
        <dt>{{ detailFieldLabel(key) }}</dt>
        <dd>
          <StatusBadge v-if="statusField(key)" :value="item" />
          <template v-else>{{ formatDetailValue(item) }}</template>
        </dd>
      </div>
      <div v-else class="detail-field detail-field--full detail-field--relation">
        <RelatedDataTable v-if="Array.isArray(item)" :title="detailFieldLabel(key)" :value="item" />
        <template v-else>
          <dt>{{ detailFieldLabel(key) }}</dt>
          <dd><StructuredData :value="item" compact /></dd>
        </template>
      </div>
    </template>
  </dl>
  <span v-else>{{ formatDetailValue(value) }}</span>
</template>
