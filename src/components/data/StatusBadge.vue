<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ value?: unknown }>()
const text = computed(() => {
  if (typeof props.value === 'boolean') return props.value ? 'ACTIVE' : 'INACTIVE'
  return String(props.value ?? 'UNKNOWN').toUpperCase()
})
const tone = computed(() => {
  const value = text.value
  if (
    /(APPROVED|ACCEPTED|AVAILABLE|ACTIVE|COMPLETED|POSTED|RECEIVED|RESOLVED|SIGNED|RECOVERED)/.test(
      value,
    )
  )
    return 'success'
  if (
    /(DRAFT|NEW|RECEIVED|CHECKED|PREPARED|STARTED|IN_PROGRESS|UNDER_REVIEW|SUBMITTED|PARTIAL|IN_TRANSIT)/.test(
      value,
    )
  )
    return 'info'
  if (/(REJECTED|CANCELLED|DAMAGED|UNUSABLE|LOST|FAILED|REVERSED|INACTIVE)/.test(value))
    return 'danger'
  if (/(PENDING|LOW|WARNING|FAIR)/.test(value)) return 'warning'
  return 'neutral'
})
</script>
<template>
  <span class="status-badge" :class="`status-badge--${tone}`">{{ text.replaceAll('_', ' ') }}</span>
</template>
