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
      activeSessionMessage.value = `${error.response.data.message} Perangkat: ${session.device_name}.${network} Aktivitas terakhir: ${formatSessionTime(session.last_active_at)} WIB. Silakan logout dari perangkat tersebut terlebih dahulu. Jika perangkat tidak dapat diakses, gunakan Lupa password sesuai batas pergantian password 1 kali dalam 30 hari.`
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

      <header class="brand-row mobile-brand">
        <img :src="backendLogoUrl" alt="HomPim Play Logo" class="brand-logo" />
        <span class="brand-name">HomPim Play</span>
        <span class="ess-badge">ESS</span>
      </header>

      <div class="mobile-hero">
        <p class="eyebrow"><span class="eyebrow-dot" />Portal Karyawan</p>
        <h1 class="mobile-title">Selamat datang<span>.</span></h1>
        <p class="mobile-subtitle">Masuk menggunakan NIK dan password Anda.</p>
      </div>

      <section class="form-card">
        <div class="desktop-form-heading">
          <p class="eyebrow"><span class="eyebrow-dot" />Portal Karyawan</p>
          <h2>Masuk ke akun</h2>
          <p>Gunakan NIK dan password Anda.</p>
        </div>

        <AlertToastBridge
          :message="resetSuccessMessage"
          :warning="activeSessionMessage || expiredSessionMessage"
          :error="errorMessage"
        />

        <form class="space-y-4" @submit.prevent="submit">
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
          <span />
          <small>atau</small>
          <span />
        </div>

        <div class="action-row">
          <a href="https://wa.me/6282117289833" target="_blank" class="action-button">
            <UIcon name="i-lucide-message-circle" class="size-4 text-green-500" />
            Hubungi IT
          </a>
          <RouterLink :to="{ name: 'forgot-password' }" class="action-button">
            <UIcon name="i-lucide-help-circle" class="size-4 text-[#3896e6]" />
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
  background: #0d1b2e;
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
  inset: 0 0 auto;
  height: 56%;
  overflow: hidden;
  pointer-events: none;
}

.orb {
  position: absolute;
  border-radius: 9999px;
  pointer-events: none;
}

.orb-mobile-1 {
  top: -75px;
  right: -70px;
  width: 250px;
  height: 250px;
  background: rgb(56 150 230 / 22%);
}

.orb-mobile-2 {
  top: 105px;
  left: -65px;
  width: 170px;
  height: 170px;
  background: rgb(56 150 230 / 14%);
}

.orb-mobile-3 {
  right: 24px;
  bottom: 0;
  width: 110px;
  height: 110px;
  background: rgb(109 213 240 / 10%);
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
  border: 1px solid rgb(109 213 240 / 28%);
  border-radius: 10px;
  background: rgb(109 213 240 / 10%);
  object-fit: contain;
  padding: 3px;
}

.brand-name {
  color: #fff;
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
  border: 1px solid rgb(109 213 240 / 30%);
  border-radius: 6px;
  background: rgb(109 213 240 / 10%);
  padding: 3px 8px;
  color: #6dd5f0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.mobile-hero {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 192px;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  padding: 22px 0 18px;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 9px;
  color: #6dd5f0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-transform: uppercase;
}

.eyebrow-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: #6dd5f0;
}

.mobile-title,
.desktop-title {
  margin: 0;
  color: #fff;
  font-weight: 700;
  letter-spacing: -1px;
}

.mobile-title {
  font-size: 40px;
  line-height: 1.12;
}

.mobile-title span,
.desktop-title span {
  color: #6dd5f0;
}

.mobile-subtitle {
  margin-top: 10px;
  color: rgb(255 255 255 / 50%);
  font-size: 13px;
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

.forgot-row {
  display: flex;
  justify-content: flex-end;
}

.forgot-link {
  color: #247fc5;
  font-size: 13px;
  font-weight: 600;
}

.submit-button {
  justify-content: center;
  background: #1e527e;
  color: #fff;
}

.divider-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 17px 0 15px;
}

.divider-row span {
  height: 1px;
  flex: 1;
  background: #e2e8f0;
}

.divider-row small {
  color: #94a3b8;
  font-size: 11px;
}

.action-row {
  display: flex;
  gap: 10px;
}

.action-button {
  display: flex;
  height: 42px;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid #dbe5ed;
  border-radius: 12px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.mobile-footer {
  margin-top: 17px;
  color: #94a3b8;
  font-size: 11px;
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
    padding: 42px clamp(42px, 6vw, 92px);
  }

  .orb-desktop-1 {
    top: -140px;
    left: -100px;
    width: 380px;
    height: 380px;
    background: rgb(56 150 230 / 17%);
  }

  .orb-desktop-2 {
    right: 12%;
    bottom: -180px;
    width: 360px;
    height: 360px;
    background: rgb(56 150 230 / 11%);
  }

  .orb-desktop-3 {
    top: 32%;
    right: 18%;
    width: 150px;
    height: 150px;
    background: rgb(109 213 240 / 8%);
  }

  .desktop-copy {
    position: relative;
    z-index: 1;
    max-width: 540px;
  }

  .desktop-title {
    font-size: clamp(56px, 6vw, 82px);
    line-height: 0.98;
  }

  .desktop-subtitle {
    max-width: 410px;
    margin-top: 22px;
    color: rgb(255 255 255 / 50%);
    font-size: 15px;
    line-height: 1.8;
  }

  .desktop-footer {
    position: relative;
    z-index: 1;
    color: rgb(255 255 255 / 28%);
    font-size: 11px;
  }

  .login-shell {
    width: 42%;
    align-items: center;
    justify-content: center;
    background: #12243b;
    padding: 44px;
  }

  .mobile-backdrop,
  .mobile-brand,
  .mobile-hero,
  .mobile-footer {
    display: none;
  }

  .form-card {
    width: min(100%, 440px);
    margin: 0;
    border: 1px solid rgb(255 255 255 / 12%);
    border-radius: 22px;
    background: rgb(255 255 255 / 96%);
    box-shadow: 0 22px 50px rgb(0 0 0 / 18%);
    padding: 30px;
  }

  .desktop-form-heading {
    display: block;
    margin-bottom: 26px;
  }

  .desktop-form-heading h2 {
    color: #172d49;
    font-size: 24px;
    font-weight: 700;
  }

  .desktop-form-heading > p:last-child {
    margin-top: 4px;
    color: #64748b;
    font-size: 13px;
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
