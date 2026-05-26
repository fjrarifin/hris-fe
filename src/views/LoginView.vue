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
const activeSessionMessage = ref('')
const showPassword = ref(false)

function formatSessionTime(value) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

async function submit() {
  loading.value = true
  errorMessage.value = ''
  activeSessionMessage.value = ''

  try {
    await auth.login(form)
    await router.push(auth.user.must_change_password ? '/change-password' : auth.dashboardPath)
  } catch (error) {
    if (error.response?.data?.code === 'ACTIVE_SESSION_EXISTS') {
      const session = error.response.data.active_session
      const network = session.network_address ? ` Jaringan: ${session.network_address}.` : ''
      activeSessionMessage.value = `${error.response.data.message} Perangkat: ${session.device_name}.${network} Aktivitas terakhir: ${formatSessionTime(session.last_active_at)} WIB. Silakan logout dari perangkat tersebut terlebih dahulu. Jika perangkat tidak dapat diakses, gunakan Lupa password dengan verifikasi OTP untuk mengakhiri sesi lama.`
      return
    }

    errorMessage.value =
      error.response?.data?.errors?.username?.[0] || 'Login gagal. Periksa NIK dan password.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="flex min-h-screen bg-white dark:bg-gray-950">
    <!-- Panel kiri -->
    <section
      class="relative hidden min-h-screen w-2/3 overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center bg-[#65a6ce]"
    >
      <img
        src="/login-hero-illustration.webp"
        alt="Ilustrasi rapat karyawan"
        class="absolute inset-0 h-full w-full object-cover object-center opacity-30"
      />
      <div class="relative z-10 flex flex-col items-center text-center px-12">
        <img
          :src="backendLogoUrl"
          alt="HRIS Logo"
          class="mb-1 size-64 object-contain drop-shadow-lg"
        />
        <h1 class="text-4xl font-bold text-white">HRIS Portal</h1>
        <p class="mt-3 text-base text-blue-100 max-w-sm">
          Sistem Manajemen Sumber Daya Manusia terintegrasi untuk kebutuhan operasional HR.
        </p>
      </div>
      <p class="absolute bottom-6 z-10 text-xs text-blue-200">
        © {{ new Date().getFullYear() }} · CV. 3 Detik · All rights reserved
      </p>
    </section>

    <!-- Panel kanan: form -->
    <section
      class="flex min-h-screen w-full flex-col items-center justify-between p-6 lg:w-1/3 lg:p-10"
    >
      <div class="w-full max-w-md flex-1 flex flex-col justify-center">
        <div class="mb-10 flex flex-col items-center text-center lg:hidden">
          <img :src="backendLogoUrl" alt="HRIS Logo" class="size-48 object-contain" />
          <h1 class="text-2xl font-semibold text-highlighted">HRIS Portal</h1>
        </div>

        <div class="mb-8">
          <h2 class="text-2xl font-semibold text-highlighted">Selamat datang</h2>
          <p class="mt-1 text-sm text-muted">Masuk menggunakan NIK dan password Anda.</p>
        </div>

        <UAlert
          v-if="route.query.password_reset === 'success'"
          class="mb-5"
          color="success"
          variant="subtle"
          title="Password berhasil diganti"
          description="Password kamu sudah diganti, silakan login menggunakan password terbaru."
        />

        <UAlert
          v-if="activeSessionMessage"
          class="mb-5"
          color="warning"
          variant="subtle"
          title="Akun sedang aktif"
          :description="activeSessionMessage"
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
          <UFormField label="NIK">
            <UInput
              id="username"
              v-model="form.username"
              class="w-full"
              name="username"
              autocomplete="username"
              placeholder="Masukkan username"
              leading-icon="i-lucide-user"
              required
            />
          </UFormField>

          <UFormField label="Password">
            <UInput
              id="password"
              v-model="form.password"
              class="w-full"
              name="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="Masukkan password"
              leading-icon="i-lucide-lock"
              :trailing-icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              required
              @click:trailing="showPassword = !showPassword"
            />
          </UFormField>

          <!-- Lupa password di sini, kanan bawah field password -->
          <div class="flex justify-end -mt-3">
            <RouterLink
              class="text-sm font-medium text-primary hover:underline"
              :to="{ name: 'forgot-password' }"
            >
              Lupa password?
            </RouterLink>
          </div>

          <UButton type="submit" block label="Masuk" :loading="loading" />
        </form>
      </div>

      <!-- Footer -->
      <div class="w-full max-w-md border-t border-default pt-5 mt-8 text-center">
        <p class="text-xs text-muted">
          Butuh bantuan? Hubungi
          <a href="https://wa.me/6282117289833" class="text-primary hover:underline">IT Dept</a>
        </p>
        <p class="mt-1 text-xs text-muted">
          © {{ new Date().getFullYear() }} · CV. 3 Detik · All rights reserved
        </p>
      </div>
    </section>
  </main>
</template>
