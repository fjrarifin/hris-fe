<script setup>
import { watch } from 'vue'
import { notifier } from '../utils/notifications'

const props = defineProps({
  message: { type: String, default: '' },
  error: { type: String, default: '' },
  warning: { type: String, default: '' },
})

watch(
  () => props.message,
  (message) => notifier.success(message),
  { immediate: true, flush: 'sync' },
)

watch(
  () => props.error,
  (error) => notifier.error(error),
  { immediate: true, flush: 'sync' },
)

watch(
  () => props.warning,
  (warning) => notifier.warning(warning),
  { immediate: true, flush: 'sync' },
)
</script>

<template></template>
