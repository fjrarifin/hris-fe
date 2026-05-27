<script setup>
import { RouterLink } from 'vue-router'

const props = defineProps({
  title: String,
  value: [String, Number],
  description: String,
  badge: String,
  color: String,
  to: {
    type: [String, Object],
    default: null,
  },
  clickable: Boolean,
  modalType: String,
})

defineEmits(['click'])
</script>

<template>
  <component
    :is="props.to ? RouterLink : props.clickable ? 'button' : 'div'"
    :to="props.to || undefined"
    :type="props.clickable && !props.to ? 'button' : undefined"
    class="block w-full rounded-xl text-left"
    :class="
      props.to || props.clickable
        ? 'transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-primary'
        : ''
    "
    @click="$emit('click')"
  >
    <UCard :class="props.to || props.clickable ? 'h-full transition hover:border-primary/50' : ''">
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
