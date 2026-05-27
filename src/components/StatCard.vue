<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  title: String,
  value: [String, Number],
  description: String,
  badge: String,
  color: String,
  to: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <component
    :is="to ? RouterLink : 'div'"
    :to="to || undefined"
    class="block rounded-xl"
    :class="
      to
        ? 'transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-primary'
        : ''
    "
  >
    <UCard :class="to ? 'h-full transition hover:border-primary/50' : ''">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-sm text-muted">{{ title }}</p>
          <p class="mt-2 text-3xl font-semibold text-highlighted">{{ value }}</p>
        </div>

        <UBadge :color="color" variant="subtle" :label="badge" />
      </div>

      <p class="mt-5 text-sm text-muted">{{ description }}</p>
    </UCard>
  </component>
</template>
