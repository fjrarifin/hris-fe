<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { backendLogoUrl } from '../services/api'
import { useAuthStore } from '../stores/auth'
import { formatDateTime } from '../utils/formatters'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(false)
const errorMessage = ref('')
const passwordLocked = computed(
  () => !auth.user?.must_change_password && auth.user?.can_change_password === false,
)
const nextPasswordChange = computed(() => formatDateTime(auth.user?.password_change_available_at))
const form = reactive({
  current_password: '',
  password: '',
  password_confirmation: '',
})

async function submit() {
  loading.value = true
  errorMessage.value = ''

  try {
    await auth.changePassword(form)
    await router.push(auth.dashboardPath)
  } catch (error) {
    const errors = error.response?.data?.errors
    errorMessage.value =
      errors?.current_password?.[0] || errors?.password?.[0] || 'Password tidak dapat diperbarui.'
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
        <h1 class="text-xl font-semibold text-highlighted">Ganti Password</h1>
        <p class="mt-2 text-sm text-muted">
          {{
            auth.user?.must_change_password
              ? 'Anda wajib membuat password baru sebelum mengakses HRIS.'
              : 'Password hanya dapat diganti 1 kali dalam jangka waktu 30 hari.'
          }}
        </p>
      </div>

      <UAlert
        v-if="passwordLocked"
        class="mb-5"
        color="warning"
        variant="subtle"
        title="Perubahan belum tersedia"
        :description="`Password dapat diganti kembali pada ${nextPasswordChange}.`"
      />

      <AlertToastBridge :error="errorMessage" />

      <form class="space-y-4" @submit.prevent="submit">
        <UInput
          v-model="form.current_password"
          class="w-full"
          type="password"
          placeholder="Password saat ini"
          :disabled="passwordLocked"
          required
        />
        <UInput
          v-model="form.password"
          class="w-full"
          type="password"
          placeholder="Password baru, minimal 8 karakter"
          :disabled="passwordLocked"
          required
        />
        <UInput
          v-model="form.password_confirmation"
          class="w-full"
          type="password"
          placeholder="Konfirmasi password baru"
          :disabled="passwordLocked"
          required
        />
        <UButton
          type="submit"
          block
          label="Simpan Password"
          :disabled="passwordLocked"
          :loading="loading"
        />
      </form>
    </UCard>
  </main>
</template>
