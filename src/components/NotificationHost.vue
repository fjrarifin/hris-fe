<script setup>
import { notifications, notifier } from '../utils/notifications'

const noticeStyles = {
  success: {
    border: 'border-green-500/35',
    icon: 'i-lucide-circle-check text-green-500',
    bar: 'bg-green-500',
  },
  error: {
    border: 'border-red-500/35',
    icon: 'i-lucide-circle-alert text-red-500',
    bar: 'bg-red-500',
  },
  warning: {
    border: 'border-amber-500/35',
    icon: 'i-lucide-triangle-alert text-amber-500',
    bar: 'bg-amber-500',
  },
  info: {
    border: 'border-blue-500/35',
    icon: 'i-lucide-info text-blue-500',
    bar: 'bg-blue-500',
  },
}
</script>

<template>
  <div
    class="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(26rem,calc(100vw-2rem))] flex-col gap-3"
    aria-live="polite"
  >
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-x-4 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-x-4 opacity-0"
    >
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="pointer-events-auto relative flex overflow-hidden rounded-xl border bg-default p-4 pb-5 shadow-xl"
        :class="noticeStyles[notification.type].border"
        role="status"
        @mouseenter="notifier.pause(notification.id)"
        @mouseleave="notifier.resume(notification.id)"
        @focusin="notifier.pause(notification.id)"
        @focusout="notifier.resume(notification.id)"
        @touchstart.passive="notifier.pause(notification.id)"
        @touchend.passive="notifier.resume(notification.id)"
      >
        <div class="flex w-full items-start gap-3">
          <UIcon
            :name="noticeStyles[notification.type].icon.split(' ')[0]"
            :class="noticeStyles[notification.type].icon"
            class="mt-0.5 size-5 shrink-0"
          />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-highlighted">{{ notification.title }}</p>
            <p class="mt-1 text-sm text-muted">{{ notification.description }}</p>
          </div>
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            size="xs"
            aria-label="Tutup notifikasi"
            @click="notifier.remove(notification.id)"
          />
        </div>
        <div class="absolute inset-x-0 bottom-0 h-1 bg-elevated">
          <div
            class="h-full transition-[width] duration-100 ease-linear"
            :class="noticeStyles[notification.type].bar"
            :style="{ width: `${notification.progress}%` }"
          />
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>
