<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { backendLogoUrl } from '../services/api'
import { requestPasswordOtp, verifyPasswordOtp } from '../services/authService'

const router = useRouter()
const nik = sessionStorage.getItem('hris_reset_nik') || ''
const otp = ref('')
const loading = ref(false)
const resending = ref(false)
const errorMessage = ref('')
const message = ref('')
const statusMessage = ref('Kode OTP telah dikirim ke nomor telepon terdaftar.')
const remainingSeconds = ref(0)
let timer

const timerText = computed(() => {
  const minutes = String(Math.floor(remainingSeconds.value / 60)).padStart(2, '0')
  const seconds = String(remainingSeconds.value % 60).padStart(2, '0')

  return `${minutes}:${seconds}`
})

function updateTimer() {
  const expiresAt = Number(sessionStorage.getItem('hris_reset_expires_at') || 0)
  remainingSeconds.value = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
}

async function submit() {
  if (!nik) {
    await router.replace({ name: 'forgot-password' })
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    await verifyPasswordOtp({ nik, otp: otp.value })
    sessionStorage.setItem('hris_reset_otp', otp.value)
    await router.push({ name: 'reset-password' })
  } catch (error) {
    errorMessage.value =
      error.response?.data?.errors?.otp?.[0] || 'Kode OTP tidak dapat diverifikasi.'
  } finally {
    loading.value = false
  }
}

async function resend() {
  resending.value = true
  errorMessage.value = ''

  try {
    const { data } = await requestPasswordOtp({ nik })

    otp.value = ''
    sessionStorage.removeItem('hris_reset_otp')
    sessionStorage.setItem('hris_reset_expires_at', String(Date.now() + data.expires_in * 1000))
    statusMessage.value = 'Kode OTP baru telah dikirim. Berlaku selama 2 menit.'
    message.value = statusMessage.value
    updateTimer()
  } catch (error) {
    errorMessage.value =
      error.response?.data?.errors?.nik?.[0] || 'Kode OTP baru tidak dapat dikirim.'
  } finally {
    resending.value = false
  }
}

onMounted(async () => {
  if (!nik) {
    await router.replace({ name: 'forgot-password' })
    return
  }

  updateTimer()
  timer = window.setInterval(updateTimer, 1000)
})

onUnmounted(() => {
  window.clearInterval(timer)
})
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
    <UCard class="w-full max-w-md">
      <div class="mb-7 flex flex-col items-center text-center">
        <img :src="backendLogoUrl" alt="HRIS Logo" class="mb-4 size-16 object-contain" />
        <h1 class="text-xl font-semibold text-highlighted">Verifikasi OTP</h1>
        <p class="mt-2 text-sm text-muted">{{ statusMessage }}</p>
        <p class="mt-3 text-sm font-semibold text-primary">Berlaku dalam {{ timerText }}</p>
      </div>

      <AlertToastBridge :message="message" :error="errorMessage" />

      <form class="space-y-5" @submit.prevent="submit">
        <div class="space-y-2">
          <label class="text-sm font-medium text-highlighted" for="otp">Kode OTP</label>
          <UInput
            id="otp"
            v-model="otp"
            class="w-full"
            inputmode="numeric"
            maxlength="6"
            placeholder="Masukkan 6 digit kode OTP"
            required
          />
        </div>

        <UButton
          type="submit"
          block
          label="Verifikasi OTP"
          :disabled="remainingSeconds === 0"
          :loading="loading"
        />
      </form>

      <div class="mt-6 flex items-center justify-between text-sm">
        <RouterLink
          class="font-medium text-primary hover:underline"
          :to="{ name: 'forgot-password' }"
        >
          Ubah NIK
        </RouterLink>
        <UButton variant="link" label="Kirim ulang OTP" :loading="resending" @click="resend" />
      </div>
    </UCard>
  </main>
</template>
