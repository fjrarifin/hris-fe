<script setup>
defineProps({
  title: String,
  fields: Array,
})

function shown(value) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  return String(value).toUpperCase()
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
        <dd class="flex items-center justify-between gap-2 text-sm font-medium text-highlighted">
          <span class="min-w-0 break-words">{{ shown(field.value) }}</span>
          <UPopover v-if="field.tooltip">
            <button
              type="button"
              class="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-warning/60 text-warning"
              :aria-label="field.tooltip"
            >
              <UIcon name="i-lucide-circle-alert" class="size-3.5" />
            </button>
            <template #content>
              <div class="max-w-64 p-3 text-sm text-highlighted">
                {{ field.tooltip }}
              </div>
            </template>
          </UPopover>
        </dd>
      </div>
    </dl>
  </UCard>
</template>
