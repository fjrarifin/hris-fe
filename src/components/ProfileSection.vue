<script setup>
defineProps({
  title: String,
  fields: Array,
})

function shown(value) {
  return value === null || value === undefined || value === '' ? '-' : value
}
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="font-semibold text-highlighted">{{ title }}</h3>
    </template>
    <dl class="divide-y divide-gray-200 dark:divide-gray-800">
      <div v-for="field in fields" :key="field.label" class="grid gap-1 py-3 sm:grid-cols-2">
        <dt class="text-sm text-muted">{{ field.label }}</dt>
        <dd class="text-sm font-medium text-highlighted">{{ shown(field.value) }}</dd>
      </div>
    </dl>
  </UCard>
</template>
