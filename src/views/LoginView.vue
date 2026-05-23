<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { backendLogoUrl } from '../services/api'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const form = reactive({
  username: '',
  password: '',
})
const loading = ref(false)
const errorMessage = ref('')

async function submit() {
  loading.value = true
  errorMessage.value = ''

  try {
    await auth.login(form)
    await router.push(auth.user.must_change_password ? '/change-password' : auth.dashboardPath)
  } catch (error) {
    errorMessage.value =
      error.response?.data?.errors?.username?.[0] || 'Login gagal. Periksa username dan password.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
    <UCard class="w-full max-w-md">
      <div class="mb-8 flex flex-col items-center text-center">
        <img :src="backendLogoUrl" alt="HRIS Logo" class="mb-4 size-20 object-contain" />
        <h1 class="text-2xl font-semibold text-highlighted">HRIS Portal</h1>
        <p class="mt-2 text-sm text-muted">Masuk menggunakan username dan password Anda.</p>
      </div>

      <UAlert
        v-if="errorMessage"
        class="mb-5"
        color="error"
        variant="subtle"
        title="Login gagal"
        :description="errorMessage"
      />

      <form class="space-y-5" @submit.prevent="submit">
        <div class="space-y-2">
          <label class="text-sm font-medium text-highlighted" for="username">Username</label>
          <UInput
            id="username"
            v-model="form.username"
            class="w-full"
            name="username"
            autocomplete="username"
            placeholder="Masukkan username"
            required
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-highlighted" for="password">Password</label>
          <UInput
            id="password"
            v-model="form.password"
            class="w-full"
            name="password"
            type="password"
            autocomplete="current-password"
            placeholder="Masukkan password"
            required
          />
        </div>

        <UButton type="submit" block label="Masuk" :loading="loading" />
      </form>
    </UCard>
  </main>
</template>
