<script setup>
defineProps({
  title: String,
  value: [String, Number],
  description: String,
  badge: String,
  color: String,
})
</script>

<template>
  <UCard>
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-sm text-muted">{{ title }}</p>
        <p class="mt-2 text-3xl font-semibold text-highlighted">{{ value }}</p>
      </div>

      <UBadge :color="color" variant="subtle" :label="badge" />
    </div>

    <p class="mt-5 text-sm text-muted">{{ description }}</p>
  </UCard>
</template>
