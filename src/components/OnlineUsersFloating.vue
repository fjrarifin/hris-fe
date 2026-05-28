<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { getOnlineUsers, heartbeatOnlineUser } from '../services/onlineUserService'

const auth = useAuthStore()
const open = ref(false)
const users = ref([])
const loading = ref(false)
const errorMessage = ref('')
let heartbeatTimer = null
let listTimer = null

const visible = computed(() => auth.isAuthenticated && !auth.user?.must_change_password)
const onlineCount = computed(() => users.value.length || (visible.value ? 1 : 0))

function initials(name) {
  return String(name || 'U')
    .split(' ')
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
}

async function sendHeartbeat() {
  if (!visible.value) return

  try {
    await heartbeatOnlineUser()
  } catch {
    // Auth interceptor handles expired sessions; this widget should stay quiet.
  }
}

async function loadUsers() {
  if (!visible.value) return

  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await getOnlineUsers()
    users.value = data.users || []
  } catch {
    errorMessage.value = 'Daftar user aktif tidak dapat dimuat.'
  } finally {
    loading.value = false
  }
}

function startHeartbeat() {
  stopHeartbeat()
  sendHeartbeat()
  heartbeatTimer = window.setInterval(sendHeartbeat, 60000)
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    window.clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

function startListPolling() {
  stopListPolling()
  loadUsers()
  listTimer = window.setInterval(loadUsers, 30000)
}

function stopListPolling() {
  if (listTimer) {
    window.clearInterval(listTimer)
    listTimer = null
  }
}

function toggle() {
  open.value = !open.value
  if (open.value) {
    startListPolling()
  } else {
    stopListPolling()
  }
}

watch(
  visible,
  (isVisible) => {
    if (isVisible) {
      startHeartbeat()
      return
    }

    open.value = false
    users.value = []
    stopHeartbeat()
    stopListPolling()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopHeartbeat()
  stopListPolling()
})
</script>

<template>
  <div v-if="visible" class="fixed bottom-5 right-5 z-40 flex flex-col items-end">
    <div
      v-if="open"
      class="mb-3 w-[22rem] max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-2xl border border-default bg-default shadow-2xl"
    >
      <div class="flex items-start justify-between gap-4 border-b border-default px-4 py-3">
        <div>
          <p class="font-semibold text-highlighted">User Sedang Online</p>
          <p class="mt-1 text-xs text-muted">Aktif dalam 2 menit terakhir.</p>
        </div>
        <UButton
          type="button"
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-x"
          @click="toggle"
        />
      </div>

      <div class="max-h-96 overflow-y-auto p-3">
        <p v-if="loading && !users.length" class="py-8 text-center text-sm text-muted">
          Memuat user aktif...
        </p>
        <UAlert v-else-if="errorMessage" color="error" variant="subtle" :description="errorMessage" />
        <div v-else-if="users.length" class="space-y-2">
          <div
            v-for="user in users"
            :key="user.id"
            class="flex items-center gap-3 rounded-xl border border-default/70 bg-elevated/35 p-3"
          >
            <img
              v-if="user.photo_url"
              :src="user.photo_url"
              :alt="`Foto ${user.name}`"
              class="size-11 rounded-full object-cover"
            />
            <UAvatar v-else :text="initials(user.name)" color="primary" size="lg" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-highlighted">{{ user.name }}</p>
              <p class="mt-1 truncate text-xs text-muted">{{ user.position }}</p>
              <p class="mt-1 flex items-center gap-1 text-xs text-muted">
                <UIcon name="i-lucide-map-pin" class="size-3.5" />
                {{ user.city || '-' }}
              </p>
            </div>
            <span class="size-2.5 rounded-full bg-green-500" title="Online"></span>
          </div>
        </div>
        <p v-else class="py-8 text-center text-sm text-muted">Belum ada user aktif.</p>
      </div>
    </div>

    <button
      type="button"
      class="relative flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-xl transition hover:scale-105"
      aria-label="Lihat user online"
      @click="toggle"
    >
      <UIcon name="i-lucide-users-round" class="size-6" />
      <span
        class="absolute -right-1 -top-1 rounded-full border-2 border-default bg-green-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white"
      >
        {{ onlineCount }}
      </span>
    </button>
  </div>
</template>
