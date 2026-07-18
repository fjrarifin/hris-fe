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
const forcePasswordChange = computed(
  () => auth.user?.level === 3 && auth.user?.must_change_password,
)
const nextPasswordChange = computed(() => formatDateTime(auth.user?.password_change_available_at))
const form = reactive({
  current_password: '',
  password: '',
  password_confirmation: '',
})
const passwordErrors = computed(() => {
  const errors = []

  if (!form.password) {
    return errors
  }

  if (form.password.length < 8) {
    errors.push('Password baru minimal 8 karakter.')
  }

  if (!/[A-Za-z]/.test(form.password)) {
    errors.push('Password baru harus memiliki minimal 1 huruf.')
  }

  if (!/\d/.test(form.password)) {
    errors.push('Password baru harus memiliki minimal 1 angka.')
  }

  return errors
})
const confirmationError = computed(() => {
  if (!form.password_confirmation || form.password_confirmation === form.password) {
    return ''
  }

  return 'Konfirmasi password harus sama dengan password baru.'
})
const formIsValid = computed(() =>
  Boolean(
    form.current_password &&
    form.password &&
    form.password_confirmation &&
    passwordErrors.value.length === 0 &&
    !confirmationError.value,
  ),
)

async function submit() {
  errorMessage.value = ''

  if (!formIsValid.value) {
    errorMessage.value =
      confirmationError.value || passwordErrors.value[0] || 'Lengkapi form password.'
    return
  }

  loading.value = true

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
  <main
    v-if="forcePasswordChange"
    class="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950"
  >
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
          placeholder="Password baru"
          :disabled="passwordLocked"
          required
        />
        <ul
          v-if="form.password && passwordErrors.length"
          class="-mt-2 space-y-1 text-xs text-red-500"
        >
          <li v-for="error in passwordErrors" :key="error">{{ error }}</li>
        </ul>
        <UInput
          v-model="form.password_confirmation"
          class="w-full"
          type="password"
          placeholder="Konfirmasi password baru"
          :disabled="passwordLocked"
          required
        />
        <p v-if="confirmationError" class="-mt-2 text-xs text-red-500">{{ confirmationError }}</p>
        <UButton
          type="submit"
          block
          label="Simpan Password"
          :disabled="passwordLocked || !formIsValid"
          :loading="loading"
        />
      </form>
    </UCard>
  </main>

  <section v-else class="mx-auto max-w-3xl space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Ubah Password</h2>
      <p class="mt-1 text-sm text-muted">
        Password hanya dapat diganti 1 kali dalam jangka waktu 30 hari.
      </p>
    </div>

    <UCard>
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
        <div class="space-y-2">
          <label class="text-sm font-medium text-highlighted">Password saat ini</label>
          <UInput
            v-model="form.current_password"
            class="w-full"
            type="password"
            placeholder="Masukkan password saat ini"
            :disabled="passwordLocked"
            required
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-highlighted">Password baru</label>
          <UInput
            v-model="form.password"
            class="w-full"
            type="password"
            placeholder="Minimal 8 karakter, huruf dan angka"
            :disabled="passwordLocked"
            required
          />
          <ul v-if="form.password && passwordErrors.length" class="space-y-1 text-xs text-red-500">
            <li v-for="error in passwordErrors" :key="error">{{ error }}</li>
          </ul>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-highlighted">Konfirmasi password baru</label>
          <UInput
            v-model="form.password_confirmation"
            class="w-full"
            type="password"
            placeholder="Ulangi password baru"
            :disabled="passwordLocked"
            required
          />
          <p v-if="confirmationError" class="text-xs text-red-500">{{ confirmationError }}</p>
        </div>

        <div class="flex justify-end">
          <UButton
            type="submit"
            icon="i-lucide-save"
            label="Simpan Password"
            :disabled="passwordLocked || !formIsValid"
            :loading="loading"
          />
        </div>
      </form>
    </UCard>

    <div class="rounded-lg border border-default bg-default p-4 text-sm text-muted">
      <p class="font-medium text-highlighted">Ketentuan password</p>
      <ul class="mt-3 list-disc space-y-1 pl-5">
        <li>Password baru minimal 8 karakter.</li>
        <li>Password harus memiliki minimal 1 huruf dan 1 angka.</li>
        <li>Konfirmasi password harus sama dengan password baru.</li>
        <li>Password hanya dapat diganti kembali setelah 30 hari.</li>
      </ul>
    </div>
  </section>
</template>
