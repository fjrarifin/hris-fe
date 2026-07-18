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
  compact: Boolean,
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
    <UCard
      :class="[
        props.to || props.clickable ? 'h-full transition hover:border-primary/50' : '',
        props.compact ? 'h-full' : '',
      ]"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-sm text-muted">{{ title }}</p>
          <p
            class="mt-2 font-semibold text-highlighted"
            :class="props.compact ? 'text-2xl sm:text-3xl' : 'text-3xl'"
          >
            {{ value }}
          </p>
        </div>

        <UBadge :color="color" variant="subtle" :label="badge" />
      </div>

      <p class="text-sm text-muted" :class="props.compact ? 'mt-4 line-clamp-2' : 'mt-5'">
        {{ description }}
      </p>
    </UCard>
  </component>
</template>
