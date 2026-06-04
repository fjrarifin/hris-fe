<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { backendLogoUrl } from '../services/api'
import { requestPasswordOtp } from '../services/authService'

const router = useRouter()
const loading = ref(false)
const errorMessage = ref('')
const form = reactive({
  nik: '',
})

async function submit() {
  loading.value = true
  errorMessage.value = ''

  try {
    const { data } = await requestPasswordOtp(form)

    sessionStorage.setItem('hris_reset_nik', form.nik.trim())
    sessionStorage.setItem('hris_reset_expires_at', String(Date.now() + data.expires_in * 1000))
    sessionStorage.removeItem('hris_reset_otp')

    await router.push({ name: 'verify-password-otp' })
  } catch (error) {
    errorMessage.value =
      error.response?.data?.errors?.nik?.[0] || 'Kode OTP tidak dapat dikirim saat ini.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
    <UCard class="w-full max-w-md">
      <div class="mb-7 flex flex-col items-center text-center">
        <img :src="backendLogoUrl" alt="HRIS Logo" class="mb-4 size-16 object-contain" />
        <h1 class="text-xl font-semibold text-highlighted">Lupa Password</h1>
        <p class="mt-2 text-sm text-muted">
          Masukkan NIK karyawan. Kode OTP akan dikirim ke nomor telepon yang terdaftar.
        </p>
        <p class="mt-2 text-xs text-muted">
          Password hanya dapat diganti 1 kali dalam 30 hari. Reset yang berhasil akan mengakhiri
          sesi login aktif di perangkat lain.
        </p>
      </div>

      <AlertToastBridge :error="errorMessage" />

      <form class="space-y-5" @submit.prevent="submit">
        <div class="space-y-2">
          <label class="text-sm font-medium text-highlighted" for="nik">NIK Karyawan</label>
          <UInput
            id="nik"
            v-model="form.nik"
            class="w-full"
            autocomplete="username"
            placeholder="Masukkan NIK karyawan"
            required
          />
        </div>

        <UButton type="submit" block label="Kirim Kode OTP" :loading="loading" />
      </form>

      <div class="mt-6">
        <UButton
          block
          color="neutral"
          variant="soft"
          icon="i-lucide-arrow-left"
          label="Kembali ke Login"
          :to="{ name: 'login' }"
        />
      </div>
    </UCard>
  </main>
</template>
