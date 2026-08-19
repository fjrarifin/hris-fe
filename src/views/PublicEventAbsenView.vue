<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import QRCode from 'qrcode'
import {
  getPublicEventAbsen,
  submitPublicEventAttendance,
  validatePublicEventNik,
} from '../services/eventAbsenService'
import { backendLogoUrl } from '../services/api'

const route = useRoute()
const slug = computed(() => route.params.slug)

// Device restriction state
const isMobileDevice = ref(true)
const desktopQrCanvas = ref(null)

// Page state
const loadingEvent = ref(true)
const eventData = ref(null)
const pageError = ref('')
const errorCode = ref('')

// Steps: 1 = NIK input, 2 = Selfie Camera, 3 = Success
const currentStep = ref(1)

// Step 1 - NIK Validation
const nikInput = ref('')
const validatingNik = ref(false)
const nikError = ref('')
const verifiedEmployee = ref(null)

// Step 2 - Selfie Camera
const videoRef = ref(null)
const canvasRef = ref(null)
const mediaStream = ref(null)
const cameraActive = ref(false)
const cameraLoading = ref(false)
const cameraError = ref('')
const capturedPhotoBase64 = ref('')
const submittingAttendance = ref(false)
const submitError = ref('')

// Step 3 - Result
const attendanceResult = ref(null)

const isInsecureHttp = computed(() => {
  if (typeof window === 'undefined') return false
  return !window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1'
})

function checkDevice() {
  if (typeof window === 'undefined') return
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const isMobileWidth = window.innerWidth <= 768
  isMobileDevice.value = isMobileUA || isMobileWidth
}

async function renderDesktopQr() {
  await nextTick()
  if (desktopQrCanvas.value && typeof window !== 'undefined') {
    try {
      await QRCode.toCanvas(desktopQrCanvas.value, window.location.href, {
        width: 220,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
    } catch (err) {
      console.error('Failed to generate desktop QR:', err)
    }
  }
}

async function loadEvent() {
  loadingEvent.value = true
  pageError.value = ''
  errorCode.value = ''

  try {
    const { data } = await getPublicEventAbsen(slug.value)
    eventData.value = data.data
  } catch (err) {
    const errData = err.response?.data
    pageError.value = errData?.message || 'Event absensi tidak dapat dimuat atau link tidak valid.'
    errorCode.value = errData?.error_code || 'ERROR'
  } finally {
    loadingEvent.value = false
  }
}

async function handleValidateNik() {
  const normalizedNik = nikInput.value.trim().toUpperCase()
  if (!normalizedNik) {
    nikError.value = 'Silakan masukkan NIK Anda.'
    return
  }

  validatingNik.value = true
  nikError.value = ''

  try {
    const { data } = await validatePublicEventNik(slug.value, { nik: normalizedNik })
    verifiedEmployee.value = data.data
    currentStep.value = 2
    await nextTick()
    await startCamera()
  } catch (err) {
    const errData = err.response?.data
    nikError.value = errData?.message || 'Gagal memverifikasi NIK. Pastikan NIK Anda benar.'
  } finally {
    validatingNik.value = false
  }
}

async function startCamera() {
  cameraError.value = ''
  cameraLoading.value = true
  cameraActive.value = false

  if (isInsecureHttp.value) {
    cameraError.value = 'Akses kamera diblokir browser karena halaman diakses via HTTP. Harap gunakan HTTPS atau buka di Chrome yang mengizinkan akses kamera.'
    cameraLoading.value = false
    return
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    cameraError.value = 'Browser atau perangkat Anda tidak mendukung akses kamera.'
    cameraLoading.value = false
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    })

    mediaStream.value = stream
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      await videoRef.value.play()
    }
    cameraActive.value = true
  } catch (err) {
    console.warn('Camera access error:', err)
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      cameraError.value = 'Izin kamera ditolak. Silakan klik ikon gembok di sebelah URL browser dan aktifkan izin Kamera.'
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      cameraError.value = 'Kamera tidak ditemukan pada perangkat Anda.'
    } else {
      cameraError.value = 'Gagal membuka kamera: ' + (err.message || 'Error tidak diketahui.')
    }
  } finally {
    cameraLoading.value = false
  }
}

function stopCamera() {
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach((track) => track.stop())
    mediaStream.value = null
  }
  cameraActive.value = false
}

function takeSnapshot() {
  if (!videoRef.value || !canvasRef.value) return

  const video = videoRef.value
  const canvas = canvasRef.value
  const width = video.videoWidth || 640
  const height = video.videoHeight || 480

  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  // Draw frame
  ctx.drawImage(video, 0, 0, width, height)

  // Convert to base64 JPEG
  capturedPhotoBase64.value = canvas.toDataURL('image/jpeg', 0.85)
  stopCamera()
}

function retakePhoto() {
  capturedPhotoBase64.value = ''
  submitError.value = ''
  startCamera()
}

async function submitAttendance() {
  if (!capturedPhotoBase64.value) {
    submitError.value = 'Silakan ambil foto selfie terlebih dahulu.'
    return
  }

  submittingAttendance.value = true
  submitError.value = ''

  const payload = {
    nik: (verifiedEmployee.value?.nik || nikInput.value.trim()).toUpperCase(),
    photo: capturedPhotoBase64.value,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  }

  try {
    const { data } = await submitPublicEventAttendance(slug.value, payload)
    attendanceResult.value = data.data
    currentStep.value = 3
  } catch (err) {
    const errData = err.response?.data
    submitError.value = errData?.message || 'Gagal mengirim absensi. Silakan coba kembali.'
  } finally {
    submittingAttendance.value = false
  }
}

function resetToStep1() {
  stopCamera()
  capturedPhotoBase64.value = ''
  verifiedEmployee.value = null
  nikInput.value = ''
  nikError.value = ''
  submitError.value = ''
  attendanceResult.value = null
  currentStep.value = 1
}

function handleResize() {
  checkDevice()
  if (!isMobileDevice.value) {
    renderDesktopQr()
  }
}

onMounted(async () => {
  checkDevice()
  if (!isMobileDevice.value) {
    await renderDesktopQr()
  }
  window.addEventListener('resize', handleResize)
  await loadEvent()
})

onBeforeUnmount(() => {
  stopCamera()
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-800 font-sans antialiased flex flex-col justify-between">
    <!-- Hidden canvas for capturing snapshot -->
    <canvas ref="canvasRef" class="hidden"></canvas>

    <!-- Desktop Blocking Gatekeeper Screen (Light Theme) -->
    <div
      v-if="!isMobileDevice"
      class="flex min-h-screen flex-col items-center justify-center p-6 text-center"
    >
      <div class="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <!-- Logo Hompimplay (Direct against canvas, no wrapping card, auto width) -->
        <img
          :src="backendLogoUrl"
          alt="Hompimplay Logo"
          class="mx-auto h-16 w-auto object-contain"
        />

        <h1 class="mt-4 text-xl font-bold text-slate-900">
          Akses Khusus Smartphone
        </h1>
        <p class="mt-2 text-sm leading-relaxed text-slate-600">
          Untuk verifikasi kehadiran dan pengambilan foto selfie, halaman ini
          <strong class="text-slate-900">hanya dapat dibuka melalui Smartphone / HP</strong>.
        </p>

        <!-- Dynamic QR Code for quick opening on phone -->
        <div class="mt-6 flex flex-col items-center">
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-inner">
            <canvas ref="desktopQrCanvas" class="block rounded-lg"></canvas>
          </div>
          <p class="mt-3 text-xs font-semibold text-blue-600">
            Arahkan kamera HP Anda ke QR Code di atas untuk membuka
          </p>
        </div>

        <div class="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">
          HRIS Attendance System • Build by IT DEPT • Hompim Play
        </div>
      </div>
    </div>

    <!-- Mobile Screen View (Light Theme Default) -->
    <div v-else class="flex flex-1 flex-col mx-auto w-full max-w-md p-4">
      <!-- App / Portal Header -->
      <header class="flex items-center justify-between pb-3.5 pt-1 border-b border-slate-200">
        <div class="flex items-center gap-3">
          <!-- Logo Hompimplay (Direct, large, auto width) -->
          <img
            :src="backendLogoUrl"
            alt="Hompimplay Logo"
            class="h-11 w-auto object-contain"
          />
          <div>
            <p class="text-[11px] font-bold uppercase tracking-wider text-blue-600">Presensi Event</p>
            <p class="text-sm font-bold text-slate-900 leading-tight">Hompim Play HRIS</p>
          </div>
        </div>

        <!-- ONLY Live Badge Icon Retained -->
        <div v-if="eventData && eventData.effective_status === 'aktif'" class="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <span class="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live</span>
        </div>
      </header>

      <!-- Main Content Area -->
      <main class="flex-1 py-4 flex flex-col justify-center">
        <!-- 1. Loading State -->
        <div v-if="loadingEvent" class="py-16 text-center">
          <p class="text-sm text-slate-600 font-medium">Memuat data event absensi...</p>
        </div>

        <!-- 2. Error / Not Found / Expired / Inactive State -->
        <div v-else-if="pageError || (eventData && !eventData.can_attend)" class="my-auto">
          <div class="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-lg">
            <h2 class="text-lg font-bold text-slate-900">
              <span v-if="eventData?.is_expired">Absensi Telah Berakhir</span>
              <span v-else-if="eventData?.is_not_started">Absensi Belum Dibuka</span>
              <span v-else-if="eventData?.is_inactive">Event Sedang Ditutup</span>
              <span v-else>Link Tidak Tersedia</span>
            </h2>

            <p class="mt-2 text-xs leading-relaxed text-slate-600">
              {{ pageError || (eventData ? `Event "${eventData.nama_event}" sudah tidak menerima presensi baru.` : '') }}
            </p>

            <div v-if="eventData" class="mt-5 rounded-2xl bg-slate-50 p-4 text-left border border-slate-200 text-xs space-y-1.5">
              <div class="text-slate-500">Nama Event: <strong class="text-slate-800">{{ eventData.nama_event }}</strong></div>
              <div class="text-slate-500">Batas Waktu: <span class="font-medium text-slate-700">{{ eventData.tanggal_selesai_formatted }}</span></div>
            </div>
          </div>
        </div>

        <!-- 3. Active Flow -->
        <div v-else-if="eventData" class="space-y-4">
          <!-- Event Header Banner (Icons removed) -->
          <div class="rounded-3xl border border-blue-200/80 bg-linear-to-br from-blue-600 to-indigo-700 p-5 text-white shadow-lg shadow-blue-600/15">
            <h1 class="text-lg font-bold text-white leading-snug">
              {{ eventData.nama_event }}
            </h1>
            <p v-if="eventData.deskripsi" class="mt-1 text-xs text-blue-100 leading-relaxed">
              {{ eventData.deskripsi }}
            </p>
            <div class="mt-3 text-xs text-blue-100 font-medium">
              Berlaku s/d {{ eventData.tanggal_selesai_formatted }}
            </div>
          </div>

          <!-- STEP 1: Input & Validasi NIK -->
          <div v-if="currentStep === 1" class="rounded-3xl border border-slate-200 bg-white p-6 shadow-md space-y-5">
            <div>
              <div class="text-xs font-bold uppercase tracking-wider text-blue-600">
                Langkah 1: Identifikasi Karyawan
              </div>
              <h2 class="mt-1.5 text-base font-bold text-slate-900">Masukkan NIK Karyawan</h2>
              <p class="text-xs text-slate-500 mt-0.5">
                Masukkan NIK Anda yang terdaftar di database HRIS (contoh: <span class="font-mono font-semibold text-slate-700">HPP25120031</span>).
              </p>
            </div>

            <!-- Error alert -->
            <div v-if="nikError" class="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
              <div class="leading-relaxed font-medium">{{ nikError }}</div>
            </div>

            <form @submit.prevent="handleValidateNik" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nomor Induk Karyawan (NIK)
                </label>
                <input
                  v-model="nikInput"
                  type="text"
                  placeholder="Contoh: HPP25120031"
                  class="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3.5 px-4 text-base font-mono font-bold tracking-wider text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:outline-none uppercase"
                  autofocus
                  required
                  @input="nikInput = nikInput.toUpperCase()"
                />
              </div>

              <button
                type="submit"
                :disabled="validatingNik || !nikInput.trim()"
                class="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>{{ validatingNik ? 'Memeriksa Data...' : 'Lanjut ke Foto Selfie' }}</span>
              </button>
            </form>
          </div>

          <!-- STEP 2: Camera Selfie Capture -->
          <div v-if="currentStep === 2" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-md space-y-4">
            <div>
              <div class="text-xs font-bold uppercase tracking-wider text-blue-600">
                Langkah 2: Foto Selfie Kehadiran
              </div>
            </div>

            <!-- Verified Employee Card -->
            <div v-if="verifiedEmployee" class="rounded-2xl bg-blue-50/80 p-4 border border-blue-100">
              <p class="truncate text-sm font-bold text-slate-900">{{ verifiedEmployee.nama_karyawan }}</p>
              <p class="text-xs text-slate-600 mt-0.5">
                NIK: <span class="font-mono text-blue-700 font-bold">{{ verifiedEmployee.nik }}</span> • {{ verifiedEmployee.jabatan || 'Karyawan' }}
              </p>
            </div>

            <!-- Camera Viewport / Captured Preview -->
            <div class="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-300 aspect-3/4 flex items-center justify-center shadow-inner">
              <!-- Live Video Feed -->
              <video
                v-show="cameraActive && !capturedPhotoBase64"
                ref="videoRef"
                playsinline
                muted
                autoplay
                class="size-full object-cover -scale-x-100"
              ></video>

              <!-- Captured Snapshot Preview -->
              <img
                v-if="capturedPhotoBase64"
                :src="capturedPhotoBase64"
                alt="Captured Selfie"
                class="size-full object-cover"
              />

              <!-- Live Oval Overlay Guide -->
              <div
                v-if="cameraActive && !capturedPhotoBase64"
                class="pointer-events-none absolute inset-0 flex items-center justify-center p-6"
              >
                <div class="size-48 rounded-full border-2 border-dashed border-white/70 shadow-2xl"></div>
              </div>

              <!-- Camera Loading Indicator -->
              <div v-if="cameraLoading" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-white">
                <p class="text-xs font-medium text-slate-300">Membuka kamera selfie...</p>
              </div>

              <!-- Camera Error State -->
              <div v-if="cameraError && !capturedPhotoBase64" class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/95 text-rose-300">
                <p class="text-xs leading-relaxed">{{ cameraError }}</p>
                <button
                  type="button"
                  class="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700"
                  @click="startCamera"
                >
                  Coba Buka Kamera Lagi
                </button>
              </div>
            </div>

            <!-- Submit error -->
            <div v-if="submitError" class="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <div class="leading-relaxed font-medium">{{ submitError }}</div>
            </div>

            <!-- Camera Controls -->
            <div class="pt-1">
              <!-- If photo NOT captured yet -->
              <div v-if="!capturedPhotoBase64" class="flex gap-2">
                <button
                  type="button"
                  class="flex-1 rounded-2xl border border-slate-300 bg-slate-100 py-3 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                  @click="resetToStep1"
                >
                  Ganti NIK
                </button>
                <button
                  type="button"
                  :disabled="!cameraActive"
                  class="flex-2 rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 active:scale-98 disabled:opacity-50 flex items-center justify-center hover:bg-blue-700 transition-all"
                  @click="takeSnapshot"
                >
                  <span>Ambil Foto</span>
                </button>
              </div>

              <!-- If photo IS captured -->
              <div v-else class="flex gap-2">
                <button
                  type="button"
                  :disabled="submittingAttendance"
                  class="flex-1 rounded-2xl border border-slate-300 bg-slate-100 py-3 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                  @click="retakePhoto"
                >
                  Foto Ulang
                </button>
                <button
                  type="button"
                  :disabled="submittingAttendance"
                  class="flex-2 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 active:scale-98 disabled:opacity-50 flex items-center justify-center hover:bg-emerald-700 transition-all"
                  @click="submitAttendance"
                >
                  <span>{{ submittingAttendance ? 'Mengirim...' : 'Kirim Absensi' }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- STEP 3: Success Confirmation Screen -->
          <div v-if="currentStep === 3 && attendanceResult" class="rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-xl space-y-5">
            <div>
              <h2 class="text-xl font-bold text-slate-900">Absensi Berhasil Tercatat!</h2>
              <p class="mt-1 text-xs text-slate-500">
                Terima kasih, kehadiran Anda pada acara ini telah tersimpan dalam sistem HRIS.
              </p>
            </div>

            <!-- Receipt Detail Card -->
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left space-y-2.5">
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-500">Nama Event</span>
                <span class="font-bold text-slate-900 truncate max-w-[180px]">{{ attendanceResult.nama_event }}</span>
              </div>
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-500">Nama Karyawan</span>
                <span class="font-bold text-slate-900">{{ attendanceResult.nama_karyawan }}</span>
              </div>
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-500">NIK</span>
                <span class="font-mono font-bold text-blue-600">{{ attendanceResult.nik }}</span>
              </div>
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-500">Waktu Presensi</span>
                <span class="font-bold text-emerald-600">{{ attendanceResult.jam_absen_formatted }}</span>
              </div>

              <!-- Selfie photo thumbnail -->
              <div v-if="attendanceResult.foto_url || capturedPhotoBase64" class="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span class="text-xs text-slate-500">Foto Terkirim</span>
                <img
                  :src="attendanceResult.foto_url || capturedPhotoBase64"
                  alt="Selfie Receipt"
                  class="size-12 rounded-xl object-cover border border-slate-200 shadow-xs"
                />
              </div>
            </div>

            <button
              type="button"
              class="w-full rounded-2xl bg-slate-100 border border-slate-300 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors"
              @click="resetToStep1"
            >
              Absen Peserta Lain
            </button>
          </div>
        </div>
      </main>

      <!-- Footer with Build by IT DEPT -->
      <footer class="pt-3 pb-2 text-center text-[11px] text-slate-400 border-t border-slate-200">
        HRIS Presensi Event • Build by IT DEPT • Hompim Play &copy; 2026
      </footer>
    </div>
  </div>
</template>
