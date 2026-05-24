<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { backendLogoUrl } from '../services/api'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
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
  <main class="flex min-h-screen bg-white dark:bg-gray-950">
    <section class="hidden min-h-screen w-2/3 overflow-hidden bg-[#65a6ce] lg:flex">
      <img
        src="/login-hero-illustration.webp"
        alt="Ilustrasi rapat karyawan"
        class="h-screen w-full object-cover object-center"
      />
    </section>

    <section class="flex min-h-screen w-full items-center justify-center p-6 lg:w-1/3 lg:p-10">
      <div class="w-full max-w-md">
        <div class="mb-10 flex flex-col items-center text-center">
          <img :src="backendLogoUrl" alt="HRIS Logo" class="mb-5 size-28 object-contain" />
          <h1 class="text-3xl font-semibold text-highlighted">HRIS Portal</h1>
          <p class="mt-2 text-sm text-muted">Masuk menggunakan username dan password Anda.</p>
        </div>

        <UAlert
          v-if="route.query.password_reset === 'success'"
          class="mb-5"
          color="success"
          variant="subtle"
          title="Password berhasil diganti"
          description="password kamu sudah diganti, silahkan login menggunakan password terbaru"
        />

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
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-highlighted" for="password">Password</label>
              <RouterLink
                class="text-sm font-medium text-primary hover:underline"
                :to="{ name: 'forgot-password' }"
              >
                Lupa password?
              </RouterLink>
            </div>
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
      </div>
    </section>
  </main>
</template>
