<script setup>
import {
  hasPendingMutation,
  pendingMutationCount,
  pendingMutationMessage,
} from '../utils/requestActivity'
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="opacity-0"
  >
    <div
      v-if="hasPendingMutation"
      class="fixed inset-0 z-[90] flex cursor-wait items-start justify-center bg-slate-950/20 px-4 pt-20 backdrop-blur-[1px]"
      role="status"
      aria-live="assertive"
      aria-busy="true"
    >
      <div
        class="flex w-full max-w-sm items-center gap-3 rounded-xl border border-primary/30 bg-default p-4 shadow-2xl"
      >
        <span class="relative flex size-10 shrink-0 items-center justify-center">
          <span class="absolute inset-0 animate-ping rounded-full bg-primary/15"></span>
          <UIcon name="i-lucide-loader-circle" class="relative size-7 animate-spin text-primary" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-highlighted">Sedang Memproses</p>
          <p class="mt-0.5 text-xs text-muted">{{ pendingMutationMessage }}</p>
          <p class="mt-1 text-[10px] text-muted-dimmed">
            Mohon tunggu dan jangan klik tombol berulang kali.
          </p>
        </div>
        <UBadge v-if="pendingMutationCount > 1" color="primary" variant="soft">
          {{ pendingMutationCount }} proses
        </UBadge>
      </div>
    </div>
  </Transition>
</template>
