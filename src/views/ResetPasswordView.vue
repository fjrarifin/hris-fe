<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { backendLogoUrl } from '../services/api'
import { resetForgottenPassword } from '../services/authService'

const router = useRouter()
const nik = sessionStorage.getItem('hris_reset_nik') || ''
const otp = sessionStorage.getItem('hris_reset_otp') || ''
const loading = ref(false)
const errorMessage = ref('')
const form = reactive({
  password: '',
  password_confirmation: '',
})

async function submit() {
  loading.value = true
  errorMessage.value = ''

  try {
    await resetForgottenPassword({
      nik,
      otp,
      password: form.password,
      password_confirmation: form.password_confirmation,
    })

    sessionStorage.removeItem('hris_reset_nik')
    sessionStorage.removeItem('hris_reset_otp')
    sessionStorage.removeItem('hris_reset_expires_at')

    await router.push({ name: 'login', query: { password_reset: 'success' } })
  } catch (error) {
    const errors = error.response?.data?.errors
    errorMessage.value =
      errors?.password?.[0] || errors?.otp?.[0] || 'Password tidak dapat diganti.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (!nik || !otp) {
    await router.replace({ name: 'forgot-password' })
  }
})
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
    <UCard class="w-full max-w-md">
      <div class="mb-7 flex flex-col items-center text-center">
        <img :src="backendLogoUrl" alt="HRIS Logo" class="mb-4 size-16 object-contain" />
        <h1 class="text-xl font-semibold text-highlighted">Buat Password Baru</h1>
        <p class="mt-2 text-sm text-muted">
          Password minimal 8 karakter dan harus berisi huruf serta angka.
        </p>
      </div>

      <AlertToastBridge :error="errorMessage" />

      <form class="space-y-4" @submit.prevent="submit">
        <UInput
          v-model="form.password"
          class="w-full"
          type="password"
          autocomplete="new-password"
          placeholder="Password baru"
          required
        />
        <UInput
          v-model="form.password_confirmation"
          class="w-full"
          type="password"
          autocomplete="new-password"
          placeholder="Konfirmasi password baru"
          required
        />
        <UButton type="submit" block label="Simpan Password" :loading="loading" />
      </form>
    </UCard>
  </main>
</template>
