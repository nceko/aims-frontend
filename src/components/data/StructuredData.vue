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
import { groupFieldEntries } from '@/utils/field-grouping'

const props = withDefaults(
  defineProps<{ value: unknown; compact?: boolean; groupingContext?: string }>(),
  { compact: false, groupingContext: '' },
)
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
const groups = computed(() =>
  groupFieldEntries(entries.value, (_key, value) => value, props.groupingContext),
)
</script>

<template>
  <RelatedDataTable v-if="Array.isArray(value)" :value="value" />
  <div
    v-else-if="entries.length"
    class="detail-groups"
    :class="{ 'detail-groups--compact': compact }"
  >
    <section
      v-for="group in groups"
      :key="group.key"
      class="detail-group"
      :class="{ 'detail-group--compact': compact }"
    >
      <header v-if="!compact" class="detail-group__header">
        <h3>{{ group.title }}</h3>
        <p>{{ group.description }}</p>
      </header>
      <dl class="detail-grid" :class="{ 'detail-grid--compact': compact }">
        <template v-for="[key, item] in group.entries" :key="key">
          <div v-if="typeof item !== 'object' || item === null" class="detail-field">
            <dt>{{ detailFieldLabel(key) }}</dt>
            <dd>
              <StatusBadge v-if="statusField(key)" :value="item" />
              <template v-else>{{ formatDetailValue(item) }}</template>
            </dd>
          </div>
          <div v-else class="detail-field detail-field--full detail-field--relation">
            <RelatedDataTable
              v-if="Array.isArray(item)"
              :title="detailFieldLabel(key)"
              :value="item"
            />
            <template v-else>
              <dt>{{ detailFieldLabel(key) }}</dt>
              <dd><StructuredData :value="item" :grouping-context="groupingContext" compact /></dd>
            </template>
          </div>
        </template>
      </dl>
    </section>
  </div>
  <span v-else>{{ formatDetailValue(value) }}</span>
</template>
