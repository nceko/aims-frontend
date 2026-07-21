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
    /(APPROVED|ACCEPTED|AVAILABLE|ACTIVE|COMPLETED|POSTED|POSTED_TO_STOCK|RECEIVED_BY_DESTINATION|RESOLVED|SIGNED|RECOVERED|FULFILLED|STOCK_AVAILABLE|REGISTERED|COMMITTED|VALID|APPROVED_RETURN)/.test(
      value,
    )
  )
    return 'success'

  if (
    /(DRAFT|NEW|RECEIVED|CHECKED|READY_TO_SHIP|READY|SHIPPED|VENDOR_PROCESSING|COUNTING|IN_PROGRESS|UNDER_REVIEW|SUBMITTED|PARTIAL|PARTIALLY_RECEIVED|PROCESSING_DELIVERY|CHECKING_STOCK|PREVIEWED|REPLACEMENT_PROCESS|REPLACEMENT_SHIPPED|PICKING|PACKING)/.test(
      value,
    )
  )
    return 'info'

  if (
    /(REJECTED|CANCELLED|DAMAGED|UNUSABLE|LOST|FAILED|REVERSED|INACTIVE|STOCK_UNAVAILABLE|INVALID)/.test(
      value,
    )
  )
    return 'danger'

  if (/(PENDING|LOW|WARNING|FAIR|WAITING_PURCHASE|WAITING_STOCK|INDENT)/.test(value))
    return 'warning'

  return 'neutral'
})
</script>

<template>
  <span class="status-badge" :class="`status-badge--${tone}`">
    {{ text.replaceAll('_', ' ') }}
  </span>
</template>
