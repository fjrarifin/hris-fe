<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getNotifications,
  markNotificationRead,
  markNotificationsRead,
} from '../services/notificationService'
import { formatDateTime } from '../utils/formatters'

defineProps({
  isDarkMode: Boolean,
})

defineEmits(['toggle-sidebar', 'toggle-theme'])

const route = useRoute()
const router = useRouter()
const title = computed(() => route.meta.title || 'Dashboard')
const notifications = ref([])
const unreadCount = ref(0)
const notificationOpen = ref(false)
const notificationRef = ref(null)
const notificationBusy = ref(false)
let notificationTimer = null

async function loadNotifications() {
  try {
    const { data } = await getNotifications()
    notifications.value = data.records || []
    unreadCount.value = data.unread_count || 0
  } catch {
    notifications.value = []
    unreadCount.value = 0
  }
}

async function toggleNotifications() {
  notificationOpen.value = !notificationOpen.value
}

async function readAllNotifications() {
  notificationBusy.value = true

  try {
    await markNotificationsRead()
    await loadNotifications()
  } finally {
    notificationBusy.value = false
  }
}

async function readNotification(notificationId) {
  notificationBusy.value = true

  try {
    await markNotificationRead(notificationId)
    await loadNotifications()
  } finally {
    notificationBusy.value = false
  }
}

async function openNotification(notification) {
  if (!notification.read_at) {
    await readNotification(notification.id)
  }

  const path = notification.data?.path
  if (path) {
    notificationOpen.value = false
    await router.push(path)
  }
}

function handleOutsideClick(event) {
  if (notificationRef.value && !notificationRef.value.contains(event.target)) {
    notificationOpen.value = false
  }
}

onMounted(() => {
  loadNotifications()
  notificationTimer = window.setInterval(loadNotifications, 30000)
  document.addEventListener('click', handleOutsideClick)
})

onBeforeUnmount(() => {
  if (notificationTimer) {
    window.clearInterval(notificationTimer)
  }

  document.removeEventListener('click', handleOutsideClick)
})
</script>

<template>
  <header
    class="hris-navbar sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 text-white backdrop-blur sm:px-6"
  >
    <div class="flex items-center gap-3">
      <UButton
        class="lg:hidden"
        color="neutral"
        variant="ghost"
        label="Menu"
        @click="$emit('toggle-sidebar')"
      />
      <div>
        <h1 class="font-semibold text-white">{{ title }}</h1>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <UBadge class="hidden sm:inline-flex" color="success" variant="subtle" label="Online" />
      <div ref="notificationRef" class="relative">
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-bell"
          aria-label="Buka notifikasi"
          @click.stop="toggleNotifications"
        />
        <span
          v-if="unreadCount > 0"
          class="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white"
        >
          {{ unreadCount > 9 ? '9+' : unreadCount }}
        </span>

        <div
          v-if="notificationOpen"
          class="fixed inset-x-3 top-[4.5rem] max-h-[calc(100dvh-5.5rem)] overflow-hidden rounded-lg border border-default bg-default text-default shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[min(26rem,calc(100vw-2rem))] sm:max-h-none"
        >
          <div class="flex items-center justify-between gap-3 border-b border-default px-4 py-3">
            <div>
              <p class="text-sm font-semibold text-highlighted">Notifikasi</p>
              <p class="text-xs text-muted">{{ unreadCount }} belum dibaca</p>
            </div>
            <UButton
              v-if="notifications.length"
              color="neutral"
              variant="soft"
              size="xs"
              icon="i-lucide-check-check"
              label="Tandai semua"
              :loading="notificationBusy"
              :disabled="unreadCount === 0"
              @click.stop="readAllNotifications"
            />
          </div>
          <div
            v-if="notifications.length"
            class="max-h-[calc(100dvh-12rem)] overflow-y-auto overscroll-contain sm:max-h-96"
          >
            <div
              v-for="notification in notifications"
              :key="notification.id"
              class="flex cursor-pointer gap-3 border-b border-default px-4 py-3 last:border-0 hover:bg-elevated/60 focus:outline-none focus:ring-2 focus:ring-primary"
              :class="!notification.read_at && 'bg-primary-50/70 dark:bg-primary-950/30'"
              role="button"
              tabindex="0"
              @click="openNotification(notification)"
              @keydown.enter.prevent="openNotification(notification)"
            >
              <span
                class="mt-1 size-2 shrink-0 rounded-full"
                :class="notification.read_at ? 'bg-muted' : 'bg-primary'"
              />
              <div class="min-w-0 flex-1">
                <p class="break-words text-sm font-semibold text-highlighted">
                  {{ notification.title }}
                </p>
                <p class="mt-1 break-words text-sm text-muted">{{ notification.message }}</p>
                <p class="mt-2 text-xs text-muted">{{ formatDateTime(notification.created_at) }}</p>
              </div>
              <UButton
                v-if="!notification.read_at"
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-check"
                aria-label="Tandai notifikasi sudah dibaca"
                :disabled="notificationBusy"
                @click.stop="readNotification(notification.id)"
              />
            </div>
          </div>
          <div v-else class="px-4 py-6 text-center text-sm text-muted">Belum ada notifikasi.</div>
        </div>
      </div>
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        :icon="isDarkMode ? 'i-lucide-sun' : 'i-lucide-moon'"
        :label="isDarkMode ? 'Light' : 'Dark'"
        :aria-label="isDarkMode ? 'Aktifkan light mode' : 'Aktifkan dark mode'"
        @click="$emit('toggle-theme')"
      />
    </div>
  </header>
</template>
