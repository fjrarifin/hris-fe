<script setup>
import { onMounted, reactive, ref } from 'vue'
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
const nikFocus = ref(false)
const pwFocus = ref(false)
const rememberUsername = ref(false)
const REMEMBER_USERNAME_KEY = 'hris_fe_remember_username'
const resetSuccessMessage =
  route.query.password_reset === 'success'
    ? 'Password kamu sudah diganti, silakan login menggunakan password terbaru.'
    : ''
const expiredSessionMessage =
  route.query.session_expired === '1'
    ? 'Sesi Anda berakhir karena tidak ada aktivitas selama 30 menit. Silakan login kembali.'
    : ''

function formatSessionTime(value) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

async function submit() {
  if (loading.value) return
  loading.value = true
  errorMessage.value = ''
  activeSessionMessage.value = ''

  try {
    await auth.login(form)

    if (rememberUsername.value) {
      localStorage.setItem(REMEMBER_USERNAME_KEY, form.username)
    } else {
      localStorage.removeItem(REMEMBER_USERNAME_KEY)
    }

    await router.push(
      auth.user?.level === 3 && auth.user?.must_change_password
        ? '/change-password'
        : auth.dashboardPath,
    )
  } catch (error) {
    if (error.response?.data?.code === 'ACTIVE_SESSION_EXISTS') {
      const session = error.response.data.active_session
      const network = session.network_address ? ` Jaringan: ${session.network_address}.` : ''
      activeSessionMessage.value = `${error.response.data.message} Perangkat: ${session.device_name}.${network} Aktivitas terakhir: ${formatSessionTime(session.last_active_at)} WIB. Silakan logout dari perangkat tersebut terlebih dahulu. Jika perangkat tidak dapat diakses, gunakan Lupa password sesuai batas pergantian password 1 kali dalam 30 hari.`
      return
    }

    errorMessage.value =
      error.response?.data?.errors?.username?.[0] || 'Login gagal. Periksa NIK dan password.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const rememberedUsername = localStorage.getItem(REMEMBER_USERNAME_KEY) || ''

  if (rememberedUsername) {
    form.username = rememberedUsername
    rememberUsername.value = true
  }
})
</script>

<template>
  <main class="login-page">
    <section class="desktop-hero">
      <div class="orb orb-desktop-1" />
      <div class="orb orb-desktop-2" />
      <div class="orb orb-desktop-3" />

      <header class="brand-row">
        <img :src="backendLogoUrl" alt="HomPim Play Logo" class="brand-logo" />
        <div>
          <p class="brand-name">HomPim Play</p>
          <p class="brand-caption">HRIS Portal</p>
        </div>
        <span class="ess-badge">ESS</span>
      </header>

      <div class="desktop-copy">
        <p class="eyebrow"><span class="eyebrow-dot" />Portal Karyawan</p>
        <h1 class="desktop-title">Selamat<br />datang<span>.</span></h1>
        <p class="desktop-subtitle">
          Sistem Manajemen Sumber Daya Manusia terintegrasi untuk kebutuhan operasional HR.
        </p>
      </div>

      <footer class="desktop-footer">
        <span>© {{ new Date().getFullYear() }} · CV. 3 Detik · All rights reserved</span>
      </footer>
    </section>

    <section class="login-shell">
      <div class="mobile-backdrop">
        <div class="orb orb-mobile-1" />
        <div class="orb orb-mobile-2" />
        <div class="orb orb-mobile-3" />
      </div>

      <header class="mobile-topbar">
        <img src="/icon.png" class="mobile-app-icon" alt="App Icon" />
        <span class="mobile-logo-name">Employee Self Service</span>
        <div class="mobile-logo-chip">
          <img :src="backendLogoUrl" alt="Logo" class="mobile-logo-img" />
        </div>
      </header>

      <div class="mobile-hero">
        <p class="mobile-eyebrow"><span class="mobile-dot" />Portal Karyawan</p>
        <h1 class="mobile-title">Selamat datang<span class="mobile-accent">.</span></h1>
        <p class="mobile-subtitle">Masuk menggunakan NIK dan password Anda.</p>
      </div>

      <section class="form-card">
        <div class="desktop-form-heading">
          <p class="eyebrow"><span class="eyebrow-dot" />Portal Karyawan</p>
          <h2>Masuk ke akun</h2>
          <p>Gunakan NIK dan password Anda.</p>
        </div>

        <div class="login-alerts">
          <AlertToastBridge
            :message="resetSuccessMessage"
            :warning="activeSessionMessage || expiredSessionMessage"
            :error="errorMessage"
          />
        </div>

        <form class="mobile-form" autocomplete="on" @submit.prevent="submit">
          <label
            class="field"
            :class="{ 'field--focus': nikFocus, 'field--error': !!errorMessage }"
          >
            <UIcon name="i-lucide-id-card" class="field-icon" />
            <span class="field-inner">
              <span
                class="floating-label"
                :class="{ 'floating-label--active': nikFocus || form.username }"
              >
                NIK
              </span>
              <input
                id="mobile-username"
                v-model.trim="form.username"
                class="field-input"
                name="username"
                autocomplete="username"
                inputmode="text"
                required
                @focus="nikFocus = true"
                @blur="nikFocus = false"
              />
            </span>
          </label>

          <label class="field" :class="{ 'field--focus': pwFocus, 'field--error': !!errorMessage }">
            <UIcon name="i-lucide-lock" class="field-icon" />
            <span class="field-inner">
              <span
                class="floating-label"
                :class="{ 'floating-label--active': pwFocus || form.password }"
              >
                Password
              </span>
              <input
                id="mobile-password"
                v-model="form.password"
                class="field-input"
                name="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                @focus="pwFocus = true"
                @blur="pwFocus = false"
              />
            </span>
            <button
              type="button"
              class="eye-btn"
              :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
              @click="showPassword = !showPassword"
            >
              <UIcon :name="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" />
            </button>
          </label>

          <label class="remember-row">
            <input v-model="rememberUsername" type="checkbox" />
            <span>Ingat NIK saya</span>
          </label>

          <button type="submit" class="mobile-submit" :disabled="loading">
            <UIcon v-if="loading" name="i-lucide-loader-circle" class="loading-icon" />
            <span>{{ loading ? 'Memverifikasi...' : 'Masuk' }}</span>
          </button>
        </form>

        <form class="desktop-form space-y-4" @submit.prevent="submit">
          <UFormField>
            <UInput
              id="username"
              v-model="form.username"
              class="w-full"
              size="xl"
              name="username"
              autocomplete="username"
              placeholder="Masukkan NIK"
              leading-icon="i-lucide-id-card"
              required
            />
          </UFormField>

          <UFormField>
            <UInput
              id="password"
              v-model="form.password"
              class="w-full"
              size="xl"
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

          <div class="forgot-row">
            <RouterLink class="forgot-link" :to="{ name: 'forgot-password' }">
              Lupa password?
            </RouterLink>
          </div>

          <UButton
            type="submit"
            block
            size="xl"
            label="Masuk"
            :loading="loading"
            class="submit-button"
          />
        </form>

        <div class="divider-row">
          <span class="divider-line" />
          <small class="divider-txt">atau</small>
          <span class="divider-line" />
        </div>

        <div class="action-row">
          <a href="https://wa.me/6282117289833" target="_blank" class="action-button">
            <UIcon name="i-lucide-message-circle" class="action-icon action-icon-whatsapp" />
            Hubungi IT
          </a>
          <RouterLink :to="{ name: 'forgot-password' }" class="action-button">
            <UIcon name="i-lucide-help-circle" class="action-icon" />
            Bantuan
          </RouterLink>
        </div>

        <p class="mobile-footer">© {{ new Date().getFullYear() }} · Build by IT Dept · v1.0.0</p>
      </section>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  display: flex;
  min-height: 100dvh;
  overflow: hidden;
  background: #0a0f1e;
}

.desktop-hero {
  display: none;
}

.login-shell {
  position: relative;
  display: flex;
  min-height: 100dvh;
  width: 100%;
  flex-direction: column;
  overflow: hidden;
  padding: max(20px, env(safe-area-inset-top)) 20px 0;
}

.mobile-backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.orb {
  position: absolute;
  border-radius: 9999px;
  pointer-events: none;
}

.orb-mobile-1 {
  top: -80px;
  right: -70px;
  width: 280px;
  height: 280px;
  background: #1e3a8a;
  opacity: 0.45;
}

.orb-mobile-2 {
  top: 100px;
  left: -60px;
  width: 180px;
  height: 180px;
  background: #4338ca;
  opacity: 0.3;
}

.orb-mobile-3 {
  right: 20px;
  bottom: 38%;
  width: 120px;
  height: 120px;
  background: #38bdf8;
  opacity: 0.1;
}

.brand-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-logo {
  width: 42px;
  height: 42px;
  border: 1px solid rgb(129 140 248 / 35%);
  border-radius: 10px;
  background: rgb(129 140 248 / 15%);
  object-fit: contain;
  padding: 3px;
}

.brand-name {
  color: #e0e7ff;
  font-size: 15px;
  font-weight: 700;
}

.brand-caption {
  margin-top: 2px;
  color: rgb(255 255 255 / 42%);
  font-size: 11px;
  line-height: 1;
}

.ess-badge {
  margin-left: auto;
  border: 1px solid rgb(129 140 248 / 35%);
  border-radius: 6px;
  background: rgb(129 140 248 / 15%);
  padding: 3px 8px;
  color: #c7d2fe;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.mobile-topbar {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: auto;
}

.mobile-app-icon {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  object-fit: cover;
}

.mobile-logo-name {
  color: #c7d2fe;
  font-size: 18px;
  font-weight: 700;
}

.mobile-logo-chip {
  display: flex;
  width: 54px;
  height: 54px;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  overflow: hidden;
  border: 1px solid rgb(129 140 248 / 35%);
  border-radius: 10px;
  background: rgb(129 140 248 / 15%);
}

.mobile-logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
}

.mobile-hero {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  padding: 20px 0 16px;
}

.mobile-eyebrow {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  color: #818cf8;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.mobile-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #818cf8;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 9px;
  color: #818cf8;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-transform: uppercase;
}

.eyebrow-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: #818cf8;
}

.mobile-title,
.desktop-title {
  margin: 0;
  color: #fff;
  font-weight: 700;
  letter-spacing: -1px;
}

.mobile-title {
  margin-bottom: 10px;
  color: #e0e7ff;
  font-size: 40px;
  font-weight: 800;
  line-height: 1.1;
}

.mobile-accent,
.desktop-title span {
  color: #38bdf8;
}

.mobile-subtitle {
  margin: 0;
  color: #6272a4;
  font-size: 13px;
  line-height: 1.6;
}

.form-card {
  position: relative;
  z-index: 1;
  margin: 0 -20px;
  border-radius: 24px 24px 0 0;
  background: #fff;
  padding: 22px 20px max(20px, env(safe-area-inset-bottom));
}

.desktop-form-heading {
  display: none;
}

.desktop-form {
  display: none;
}

.mobile-form {
  display: block;
}

.login-alerts {
  margin-bottom: 12px;
}

.field {
  display: flex;
  min-height: 58px;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  border: 1px solid #c7d2fe;
  border-radius: 14px;
  background: #f5f7ff;
  padding: 0 14px;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    background 0.2s;
}

.field--focus {
  border-color: #818cf8;
  background: #f8f7ff;
  box-shadow: 0 0 0 3px rgb(129 140 248 / 12%);
}

.field--error {
  border-color: #f87171;
  background: #fff5f5;
}

.field-icon {
  flex-shrink: 0;
  color: #818cf8;
  font-size: 20px;
  transition: color 0.2s;
}

.field--focus .field-icon {
  color: #6366f1;
}

.field--error .field-icon {
  color: #f87171;
}

.field-inner {
  position: relative;
  flex: 1;
  min-width: 0;
  padding-top: 15px;
}

.floating-label {
  position: absolute;
  top: 17px;
  left: 0;
  color: #a5b4fc;
  font-size: 15px;
  line-height: 1;
  pointer-events: none;
  transition:
    transform 0.16s,
    font-size 0.16s,
    color 0.16s;
}

.floating-label--active {
  color: #818cf8;
  font-size: 11px;
  transform: translateY(-13px);
}

.field-input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #1e1b4b;
  font-size: 15px;
  line-height: 1.4;
}

.eye-btn {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  border: 0;
  background: transparent;
  color: #a5b4fc;
  cursor: pointer;
  font-size: 20px;
  padding: 4px;
}

.remember-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  color: #3730a3;
  font-size: 12px;
  font-weight: 700;
}

.remember-row input {
  width: 16px;
  height: 16px;
  accent-color: #1e3a8a;
}

.mobile-submit {
  display: flex;
  width: 100%;
  height: 52px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
  border: 0;
  border-radius: 14px;
  background: #1e3a8a;
  box-shadow: 0 6px 20px rgb(30 58 138 / 40%);
  color: #fff;
  cursor: pointer;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.mobile-submit:disabled {
  cursor: wait;
  opacity: 0.8;
}

.loading-icon {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.forgot-row {
  display: flex;
  justify-content: flex-end;
}

.forgot-link {
  color: #3730a3;
  font-size: 13px;
  font-weight: 600;
}

.submit-button {
  justify-content: center;
  background: #1e3a8a;
  color: #fff;
  box-shadow: 0 6px 20px rgb(30 58 138 / 32%);
}

.divider-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px 0;
}

.divider-line {
  height: 1px;
  flex: 1;
  background: #e0e7ff;
}

.divider-txt {
  color: #a5b4fc;
  font-size: 11px;
  font-weight: 600;
}

.action-row {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.action-button {
  display: flex;
  height: 42px;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid #c7d2fe;
  border-radius: 12px;
  background: #f5f7ff;
  color: #3730a3;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s;
}

.action-button:active {
  background: #eef2ff;
}

.action-icon {
  color: #818cf8;
  font-size: 17px;
}

.action-icon-whatsapp {
  color: #25d366;
}

.mobile-footer {
  color: #3b5cdd;
  font-size: 11px;
  opacity: 0.6;
  text-align: center;
}

@media (min-width: 1024px) {
  .desktop-hero {
    position: relative;
    display: flex;
    min-height: 100dvh;
    width: 58%;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    background: #0a0f1e;
    padding: 42px clamp(42px, 6vw, 92px);
  }

  .orb-desktop-1 {
    top: -160px;
    left: -120px;
    width: 420px;
    height: 420px;
    background: #1e3a8a;
    opacity: 0.42;
  }

  .orb-desktop-2 {
    right: 10%;
    bottom: -190px;
    width: 390px;
    height: 390px;
    background: #4338ca;
    opacity: 0.26;
  }

  .orb-desktop-3 {
    top: 32%;
    right: 18%;
    width: 150px;
    height: 150px;
    background: #38bdf8;
    opacity: 0.11;
  }

  .desktop-copy {
    position: relative;
    z-index: 1;
    max-width: 540px;
  }

  .desktop-title {
    color: #e0e7ff;
    font-size: clamp(56px, 6vw, 82px);
    font-weight: 800;
    line-height: 0.98;
  }

  .desktop-subtitle {
    max-width: 410px;
    margin-top: 22px;
    color: #6272a4;
    font-size: 15px;
    line-height: 1.8;
  }

  .desktop-footer {
    position: relative;
    z-index: 1;
    color: rgb(199 210 254 / 42%);
    font-size: 11px;
  }

  .login-shell {
    width: 42%;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(circle at 88% 18%, rgb(67 56 202 / 18%), transparent 32%),
      radial-gradient(circle at 12% 82%, rgb(56 189 248 / 10%), transparent 34%), #0f172a;
    padding: 44px;
  }

  .mobile-backdrop,
  .mobile-topbar,
  .mobile-hero,
  .mobile-footer {
    display: none;
  }

  .mobile-form {
    display: block;
  }

  .form-card {
    width: min(100%, 440px);
    margin: 0;
    border: 0;
    border-radius: 24px;
    background: #fff;
    box-shadow: 0 24px 60px rgb(2 6 23 / 38%);
    padding: 30px;
  }

  .desktop-form-heading {
    display: block;
    margin-bottom: 26px;
  }

  .desktop-form-heading h2 {
    color: #1e1b4b;
    font-size: 24px;
    font-weight: 700;
  }

  .desktop-form-heading > p:last-child {
    margin-top: 4px;
    color: #6272a4;
    font-size: 13px;
  }

  .divider-row {
    margin: 17px 0 15px;
  }

  .divider-line {
    background: #e0e7ff;
  }

  .divider-txt {
    color: #a5b4fc;
    font-weight: 600;
  }

  .action-row {
    margin-bottom: 0;
  }

  .action-button {
    gap: 6px;
    border-color: #c7d2fe;
    background: #f5f7ff;
    color: #3730a3;
  }

  .action-icon {
    color: #818cf8;
    font-size: 17px;
  }

  .action-icon-whatsapp {
    color: #25d366;
  }
}

@media (max-height: 680px) and (max-width: 1023px) {
  .mobile-hero {
    min-height: 155px;
  }

  .mobile-title {
    font-size: 34px;
  }
}
</style>
