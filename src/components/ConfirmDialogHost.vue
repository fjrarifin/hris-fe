<script setup>
import { cancelAction, confirmAction, confirmDialog } from '../utils/confirmDialog'

const colorClass = {
  primary: 'bg-primary text-inverted hover:bg-primary/90',
  warning: 'bg-amber-500 text-white hover:bg-amber-600',
  error: 'bg-red-500 text-white hover:bg-red-600',
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="confirmDialog.open"
        class="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
        role="presentation"
        @click.self="cancelAction"
      >
        <Transition
          appear
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="translate-y-2 scale-95 opacity-0"
          leave-active-class="transition duration-100 ease-in"
          leave-to-class="translate-y-2 scale-95 opacity-0"
        >
          <section
            class="w-full max-w-md rounded-xl border border-default bg-default p-5 text-default shadow-2xl"
            role="dialog"
            aria-modal="true"
            :aria-label="confirmDialog.title"
          >
            <div class="flex items-start gap-3">
              <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-elevated">
                <UIcon
                  :name="confirmDialog.color === 'error' ? 'i-lucide-triangle-alert' : 'i-lucide-circle-help'"
                  class="size-5"
                  :class="confirmDialog.color === 'error' ? 'text-red-500' : confirmDialog.color === 'warning' ? 'text-amber-500' : 'text-primary'"
                />
              </div>
              <div class="min-w-0 flex-1">
                <h2 class="text-base font-semibold text-highlighted">{{ confirmDialog.title }}</h2>
                <p class="mt-1 text-sm leading-6 text-muted">{{ confirmDialog.message }}</p>
              </div>
            </div>

            <div class="mt-5 flex justify-end gap-2">
              <button
                type="button"
                class="rounded-md border border-default bg-default px-3 py-2 text-sm font-medium text-highlighted hover:bg-elevated"
                @click="cancelAction"
              >
                {{ confirmDialog.cancelLabel }}
              </button>
              <button
                type="button"
                class="rounded-md px-3 py-2 text-sm font-semibold"
                :class="colorClass[confirmDialog.color] || colorClass.primary"
                @click="confirmAction"
              >
                {{ confirmDialog.confirmLabel }}
              </button>
            </div>
          </section>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
