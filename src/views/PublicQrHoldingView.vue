<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import QRCode from 'qrcode'
import { generatePublicHoldingQr } from '../services/qrHoldingService'
import { backendLogoUrl } from '../services/api'
import { apiError } from '../utils/formatters'

// Mobile detection
const isMobile = ref(true)
const desktopHelperQr = ref('')
const currentUrl = ref('')

// Form & State
const nikInput = ref('')
const loading = ref(false)
const errorMessage = ref('')

// Modal & QR Result
const qrModalOpen = ref(false)
const resultData = ref(null)
const qrDataUrl = ref('')
const qrGenerating = ref(false)

function checkMobileDevice() {
  if (typeof window === 'undefined') return
  const userAgent = navigator.userAgent || navigator.vendor || window.opera
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
  const isSmallScreen = window.innerWidth <= 768
  isMobile.value = isMobileUA || isSmallScreen
}

async function generateDesktopHelperQr() {
  if (typeof window === 'undefined') return
  currentUrl.value = window.location.href
  try {
    desktopHelperQr.value = await QRCode.toDataURL(currentUrl.value, {
      width: 200,
      margin: 1,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    })
  } catch (err) {
    console.error('Failed to generate desktop helper QR', err)
  }
}

async function handleGenerateQr() {
  errorMessage.value = ''
  const trimmedNik = nikInput.value.trim().toUpperCase()

  if (!trimmedNik) {
    errorMessage.value = 'Silakan masukkan NIK Karyawan Holding Anda.'
    return
  }

  loading.value = true

  try {
    const { data } = await generatePublicHoldingQr(trimmedNik)
    resultData.value = data

    // Generate Visual QR Code from payload string
    qrGenerating.value = true
    qrDataUrl.value = await QRCode.toDataURL(data.qr_payload_string, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 320,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })

    qrModalOpen.value = true
  } catch (err) {
    errorMessage.value = apiError(err, 'Gagal memvalidasi NIK Karyawan Holding.')
  } finally {
    loading.value = false
    qrGenerating.value = false
  }
}

function handleDownloadQr() {
  if (!qrDataUrl.value || !resultData.value?.karyawan?.nik) return

  const nik = resultData.value.karyawan.nik
  const link = document.createElement('a')
  link.href = qrDataUrl.value
  link.download = `QR-Gate-Holding-${nik}.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
}

function handleCloseModal() {
  qrModalOpen.value = false
  nikInput.value = ''
  resultData.value = null
  qrDataUrl.value = ''
}

onMounted(() => {
  checkMobileDevice()
  generateDesktopHelperQr()
  window.addEventListener('resize', checkMobileDevice)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobileDevice)
})
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-800 font-sans antialiased selection:bg-blue-600 selection:text-white flex flex-col items-center justify-center p-4 sm:p-6">
    <!-- Desktop Blocking Screen -->
    <div
      v-if="!isMobile"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-6"
    >
      <div class="max-w-md w-full rounded-3xl bg-white p-8 text-center shadow-2xl border border-slate-200">
        <div class="flex justify-center mb-6">
          <img
            :src="backendLogoUrl"
            alt="Hompimplay Logo"
            class="h-16 w-auto object-contain"
          />
        </div>
        <h2 class="text-xl font-bold text-slate-900 mb-2">Akses Khusus Smartphone</h2>
        <p class="text-xs text-slate-600 mb-6 leading-relaxed">
          Link QR Gate Holding ini hanya dapat diakses melalui browser pada perangkat mobile / smartphone.
        </p>

        <div class="inline-block p-3 rounded-2xl bg-slate-50 border border-slate-200 shadow-inner mb-6">
          <img
            v-if="desktopHelperQr"
            :src="desktopHelperQr"
            alt="Scan QR Mobile"
            class="w-48 h-48 rounded-xl mx-auto"
          />
        </div>

        <p class="text-xs font-semibold text-blue-600">
          Scan QR Code di atas menggunakan kamera HP Anda
        </p>
      </div>
    </div>

    <!-- Center Card Wrapper -->
    <div class="w-full max-w-md space-y-4 my-auto">
      <!-- Header Section (Mobile) -->
      <header class="flex flex-col items-center text-center">
        <img
          :src="backendLogoUrl"
          alt="Hompimplay Logo"
          class="h-12 w-auto object-contain mb-3"
        />
        <h1 class="text-xl font-bold text-slate-900 tracking-tight">
          Akses Turnstile Gate Holding
        </h1>
        <p class="text-xs text-slate-500 mt-1 max-w-xs">
          Masukkan NIK Karyawan Holding untuk mendapatkan QR Code Gate
        </p>
      </header>

      <!-- Main Content Form Card -->
      <main class="w-full">
        <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/70 border border-slate-200/80">
          <!-- Error Alert -->
          <div
            v-if="errorMessage"
            class="mb-5 rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-medium text-red-700 leading-relaxed"
          >
            {{ errorMessage }}
          </div>

          <form @submit.prevent="handleGenerateQr" class="space-y-5">
            <div>
              <label for="holdingNik" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                NIK Karyawan Holding
              </label>
              <input
                id="holdingNik"
                v-model="nikInput"
                type="text"
                required
                autocomplete="off"
                autocapitalize="characters"
                placeholder="Contoh: HLD26001"
                class="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-base font-semibold text-slate-900 tracking-wider placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition-all uppercase"
                @input="nikInput = nikInput.toUpperCase()"
              />
              <p class="text-[11px] text-slate-400 mt-2 leading-normal">
                Pastikan NIK Anda terdaftar aktif di master data Holding.
              </p>
            </div>

            <button
              type="submit"
              :disabled="loading || !nikInput.trim()"
              class="w-full rounded-2xl bg-blue-600 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-98 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
            >
              <span v-if="loading">Memvalidasi Data...</span>
              <span v-else>Dapatkan QR Code Gate</span>
            </button>
          </form>
        </div>
      </main>

      <!-- Footer -->
      <footer class="pt-2 text-center text-xs text-slate-400">
        <p class="font-medium">HRIS Gate Holding • Build by IT DEPT</p>
        <p class="text-[11px] text-slate-400 mt-0.5">Hompim Play © 2026</p>
      </footer>
    </div>

    <!-- QR Code Popup Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0"
      >
        <div
          v-if="qrModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans"
          role="dialog"
          aria-modal="true"
          aria-label="QR Code Gate Holding"
        >
          <Transition
            appear
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="translate-y-4 scale-95 opacity-0"
            leave-active-class="transition duration-150 ease-in"
            leave-to-class="translate-y-4 scale-95 opacity-0"
          >
            <div class="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
              <!-- Employee Info Card -->
              <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4 mb-4 text-left">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    Karyawan Holding
                  </span>
                  <span class="text-[10px] text-slate-400 font-mono">
                    {{ resultData?.access_date_code }}
                  </span>
                </div>
                <h3 class="text-base font-bold text-slate-900 truncate">
                  {{ resultData?.karyawan?.nama }}
                </h3>
                <p class="text-xs font-semibold text-slate-600 font-mono mt-0.5">
                  {{ resultData?.karyawan?.nik }}
                </p>
                <div class="mt-2 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span class="truncate">{{ resultData?.karyawan?.jabatan }}</span>
                  <span class="font-medium text-slate-700 truncate text-right">{{ resultData?.karyawan?.perusahaan }}</span>
                </div>
              </div>

              <!-- QR Code Display -->
              <div class="inline-block p-3 rounded-2xl bg-white border-2 border-slate-900 shadow-md mb-3">
                <img
                  v-if="qrDataUrl"
                  :src="qrDataUrl"
                  alt="QR Code Gate Turnstile"
                  class="w-56 h-56 mx-auto rounded-lg"
                />
              </div>

              <p class="text-xs font-medium text-slate-600 mb-5 leading-normal">
                Arahkan QR Code ini ke scanner mesin turnstile gate
              </p>

              <!-- Action Buttons -->
              <div class="flex flex-col gap-2.5">
                <button
                  type="button"
                  class="w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-700 active:scale-98"
                  @click="handleDownloadQr"
                >
                  Unduh QR Code (.png)
                </button>

                <button
                  type="button"
                  class="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  @click="handleCloseModal"
                >
                  Tutup
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
