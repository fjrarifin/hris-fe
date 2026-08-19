<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { backendLogoUrl } from '../services/api'
import { notifier } from '../utils/notifications'

const authStore = useAuthStore()
const isOpen = ref(false)
const downloading = ref(false)

const LATEST_APK_URL = '/download/ess-hompimplay-latest.apk'

function getStorageKey(userId) {
  return `hris_dismiss_apk_prompt_${userId}`
}

function checkEligibility() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return
  }

  // 1. User must be authenticated
  if (!authStore.isAuthenticated || !authStore.user) {
    isOpen.value = false
    return
  }

  const userId = authStore.user.id

  // 2. Check if user already dismissed permanently
  if (localStorage.getItem(getStorageKey(userId)) === 'true') {
    isOpen.value = false
    return
  }

  // 3. User must NOT have a registered mobile device token
  // (i.e. has not installed or logged into the mobile app yet)
  if (authStore.user.has_mobile_device_token === true) {
    isOpen.value = false
    return
  }

  // 4. Device must be Android
  const isAndroid = /Android/i.test(navigator.userAgent)
  if (!isAndroid) {
    isOpen.value = false
    return
  }

  // If all criteria match, open the prompt
  isOpen.value = true
}

function handleDismiss() {
  if (authStore.user?.id) {
    localStorage.setItem(getStorageKey(authStore.user.id), 'true')
  }
  isOpen.value = false
}

function handleDownload() {
  downloading.value = true
  if (authStore.user?.id) {
    localStorage.setItem(getStorageKey(authStore.user.id), 'true')
  }

  try {
    const link = document.createElement('a')
    link.href = LATEST_APK_URL
    link.download = 'ess-hompimplay-latest.apk'
    document.body.appendChild(link)
    link.click()
    link.remove()
    notifier.success('Memulai pengunduhan APK ESS Hompimplay...')
  } catch (err) {
    console.error('Failed to trigger download link:', err)
    window.location.href = LATEST_APK_URL
  } finally {
    setTimeout(() => {
      downloading.value = false
      isOpen.value = false
    }, 1200)
  }
}

watch(
  () => [authStore.isAuthenticated, authStore.user?.id, authStore.user?.has_mobile_device_token],
  () => {
    nextTick(() => {
      checkEligibility()
    })
  },
  { immediate: true },
)

onMounted(() => {
  checkEligibility()
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs font-sans"
        role="dialog"
        aria-modal="true"
        aria-label="Download HRIS Mobile Android"
      >
        <Transition
          appear
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="translate-y-4 scale-95 opacity-0"
          leave-active-class="transition duration-150 ease-in"
          leave-to-class="translate-y-4 scale-95 opacity-0"
        >
          <div class="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
            <!-- Header Logo & Android Badge -->
            <div class="flex items-center justify-center">
              <img
                :src="backendLogoUrl"
                alt="Hompimplay Logo"
                class="h-14 w-auto object-contain"
              />
            </div>

            <!-- Title & Info -->
            <h3 class="mt-4 text-lg font-bold text-slate-900 leading-snug">
              Download Versi Android?
            </h3>
            <p class="mt-2 text-xs leading-relaxed text-slate-600">
              Halo <strong class="text-slate-800">{{ authStore.user?.name || 'Karyawan' }}</strong>, Anda terdeteksi membuka HRIS melalui browser Android.
              Gunakan aplikasi <strong class="text-blue-600">ESS Hompimplay</strong> untuk kemudahan absensi mobile & notifikasi kehadiran langsung di HP Anda.
            </p>

            <!-- Action Buttons -->
            <div class="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                :disabled="downloading"
                class="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                @click="handleDownload"
              >
                <span>{{ downloading ? 'Mengunduh APK...' : 'Ya, Download Aplikasi (.apk)' }}</span>
              </button>

              <button
                type="button"
                class="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                @click="handleDismiss"
              >
                Tidak, Jangan Tampilkan Lagi
              </button>
            </div>

            <!-- Footer note -->
            <p class="mt-4 text-[10px] text-slate-400">
              Build by IT DEPT • Hompim Play
            </p>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
