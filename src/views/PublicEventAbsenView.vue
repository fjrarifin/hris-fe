<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import QRCode from 'qrcode'
import {
  getPublicEventAbsen,
  submitPublicEventAttendance,
  validatePublicEventNik,
} from '../services/eventAbsenService'

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
  if (!nikInput.value.trim()) {
    nikError.value = 'Silakan masukkan NIK Anda.'
    return
  }

  validatingNik.value = true
  nikError.value = ''

  try {
    const { data } = await validatePublicEventNik(slug.value, { nik: nikInput.value.trim() })
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
    nik: verifiedEmployee.value?.nik || nikInput.value.trim(),
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
  <div class="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col justify-between">
    <!-- Hidden canvas for capturing snapshot -->
    <canvas ref="canvasRef" class="hidden"></canvas>

    <!-- Desktop Blocking Gatekeeper Screen -->
    <div
      v-if="!isMobileDevice"
      class="flex min-h-screen flex-col items-center justify-center p-6 text-center"
    >
      <div class="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        <div class="mx-auto flex size-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
          <span class="i-lucide-smartphone text-3xl"></span>
        </div>

        <h1 class="mt-5 text-xl font-bold text-white">
          Akses Khusus Smartphone
        </h1>
        <p class="mt-2 text-sm leading-relaxed text-slate-400">
          Untuk menjaga keaslian absensi event dan pengambilan foto selfie, halaman ini
          <strong class="text-slate-200">hanya dapat dibuka melalui Smartphone / HP</strong>.
        </p>

        <!-- Dynamic QR Code for quick opening on phone -->
        <div class="mt-6 flex flex-col items-center">
          <div class="rounded-2xl bg-white p-3 shadow-lg">
            <canvas ref="desktopQrCanvas" class="block"></canvas>
          </div>
          <p class="mt-3 text-xs font-semibold text-blue-400">
            Arahkan kamera HP Anda ke QR Code di atas untuk membuka
          </p>
        </div>

        <div class="mt-6 border-t border-slate-800 pt-4 text-xs text-slate-500">
          HRIS Attendance System • Hompim Play
        </div>
      </div>
    </div>

    <!-- Mobile Screen View -->
    <div v-else class="flex flex-1 flex-col mx-auto w-full max-w-md p-4">
      <!-- App / Portal Header -->
      <header class="flex items-center justify-between pb-4 pt-2 border-b border-slate-800/80">
        <div class="flex items-center gap-2.5">
          <div class="flex size-9 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-md shadow-blue-500/20">
            <span class="i-lucide-calendar-check text-lg"></span>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-blue-400">Presensi Event</p>
            <p class="text-sm font-bold text-white">HRIS Portal</p>
          </div>
        </div>

        <div v-if="eventData && eventData.effective_status === 'aktif'" class="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
          <span class="size-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Live</span>
        </div>
      </header>

      <!-- Main Content Area -->
      <main class="flex-1 py-4 flex flex-col justify-center">
        <!-- 1. Loading State -->
        <div v-if="loadingEvent" class="py-16 text-center">
          <div class="inline-flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 animate-spin">
            <span class="i-lucide-loader-2 text-2xl"></span>
          </div>
          <p class="mt-4 text-sm text-slate-400 font-medium">Memuat data event absensi...</p>
        </div>

        <!-- 2. Error / Not Found / Expired / Inactive State -->
        <div v-else-if="pageError || (eventData && !eventData.can_attend)" class="my-auto">
          <div class="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 text-center shadow-xl">
            <!-- Icon -->
            <div
              class="mx-auto flex size-14 items-center justify-center rounded-2xl"
              :class="eventData?.is_expired ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'"
            >
              <span v-if="eventData?.is_expired" class="i-lucide-clock text-2xl"></span>
              <span v-else-if="eventData?.is_not_started" class="i-lucide-calendar text-2xl"></span>
              <span v-else class="i-lucide-ban text-2xl"></span>
            </div>

            <h2 class="mt-4 text-lg font-bold text-white">
              <span v-if="eventData?.is_expired">Absensi Telah Berakhir</span>
              <span v-else-if="eventData?.is_not_started">Absensi Belum Dibuka</span>
              <span v-else-if="eventData?.is_inactive">Event Sedang Ditutup</span>
              <span v-else>Link Tidak Tersedia</span>
            </h2>

            <p class="mt-2 text-xs leading-relaxed text-slate-400">
              {{ pageError || (eventData ? `Event "${eventData.nama_event}" sudah tidak menerima presensi baru.` : '') }}
            </p>

            <div v-if="eventData" class="mt-5 rounded-2xl bg-slate-950/60 p-4 text-left border border-slate-800 text-xs space-y-1.5">
              <div class="text-slate-400">Nama Event: <strong class="text-slate-200">{{ eventData.nama_event }}</strong></div>
              <div class="text-slate-400">Batas Waktu: <span class="text-slate-300">{{ eventData.tanggal_selesai_formatted }}</span></div>
            </div>
          </div>
        </div>

        <!-- 3. Active Flow -->
        <div v-else-if="eventData" class="space-y-4">
          <!-- Event Header Banner -->
          <div class="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-950/40 via-slate-900/80 to-slate-900/90 p-5 shadow-xl backdrop-blur-md">
            <h1 class="text-lg font-bold text-white leading-snug">
              {{ eventData.nama_event }}
            </h1>
            <p v-if="eventData.deskripsi" class="mt-1 text-xs text-slate-400 leading-relaxed">
              {{ eventData.deskripsi }}
            </p>
            <div class="mt-3 flex items-center gap-2 text-[11px] text-blue-300">
              <span class="i-lucide-clock size-3.5"></span>
              <span>Berlaku s/d {{ eventData.tanggal_selesai_formatted }}</span>
            </div>
          </div>

          <!-- STEP 1: Input & Validasi NIK -->
          <div v-if="currentStep === 1" class="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-5">
            <div>
              <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <span class="flex size-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">1</span>
                <span>Langkah 1: Identifikasi Karyawan</span>
              </div>
              <h2 class="mt-1 text-base font-bold text-white">Masukkan NIK Karyawan</h2>
              <p class="text-xs text-slate-400 mt-0.5">
                Masukkan NIK Anda yang terdaftar di database HRIS.
              </p>
            </div>

            <!-- Error alert -->
            <div v-if="nikError" class="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-start gap-2.5">
              <span class="i-lucide-alert-circle size-4 shrink-0 text-rose-400 mt-0.5"></span>
              <div class="leading-relaxed">{{ nikError }}</div>
            </div>

            <form @submit.prevent="handleValidateNik" class="space-y-4">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1.5">
                  Nomor Induk Karyawan (NIK)
                </label>
                <div class="relative">
                  <span class="i-lucide-id-card absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></span>
                  <input
                    v-model="nikInput"
                    type="text"
                    inputmode="numeric"
                    placeholder="Contoh: 2024001"
                    class="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3.5 pl-11 pr-4 text-base font-mono font-bold tracking-wider text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                    autofocus
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                :disabled="validatingNik || !nikInput.trim()"
                class="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-transform active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span v-if="validatingNik" class="i-lucide-loader-2 size-4 animate-spin"></span>
                <span>{{ validatingNik ? 'Memeriksa Data...' : 'Lanjut ke Foto Selfie' }}</span>
                <span v-if="!validatingNik" class="i-lucide-arrow-right size-4"></span>
              </button>
            </form>
          </div>

          <!-- STEP 2: Camera Selfie Capture -->
          <div v-if="currentStep === 2" class="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4">
            <div>
              <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <span class="flex size-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">2</span>
                <span>Langkah 2: Foto Selfie Kehadiran</span>
              </div>
            </div>

            <!-- Verified Employee Card -->
            <div v-if="verifiedEmployee" class="flex items-center gap-3 rounded-2xl bg-slate-950/80 p-3 border border-slate-800">
              <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 font-bold">
                <span class="i-lucide-user text-lg"></span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-bold text-white">{{ verifiedEmployee.nama_karyawan }}</p>
                <p class="text-xs text-slate-400">
                  NIK: <span class="font-mono text-blue-400 font-semibold">{{ verifiedEmployee.nik }}</span> • {{ verifiedEmployee.jabatan || 'Karyawan' }}
                </p>
              </div>
            </div>

            <!-- Camera Viewport / Captured Preview -->
            <div class="relative overflow-hidden rounded-2xl bg-black border border-slate-800 aspect-3/4 flex items-center justify-center">
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
                <div class="size-48 rounded-full border-2 border-dashed border-white/50 shadow-2xl"></div>
              </div>

              <!-- Camera Loading Indicator -->
              <div v-if="cameraLoading" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-400">
                <span class="i-lucide-loader-2 size-8 animate-spin text-blue-400"></span>
                <p class="mt-2 text-xs font-medium">Membuka kamera selfie...</p>
              </div>

              <!-- Camera Error State -->
              <div v-if="cameraError && !capturedPhotoBase64" class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/95 text-rose-300">
                <span class="i-lucide-camera-off size-8 text-rose-400 mb-2"></span>
                <p class="text-xs leading-relaxed">{{ cameraError }}</p>
                <button
                  type="button"
                  class="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                  @click="startCamera"
                >
                  Coba Buka Kamera Lagi
                </button>
              </div>
            </div>

            <!-- Submit error -->
            <div v-if="submitError" class="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2">
              <span class="i-lucide-alert-circle size-4 shrink-0 text-rose-400 mt-0.5"></span>
              <div class="leading-relaxed">{{ submitError }}</div>
            </div>

            <!-- Camera Controls -->
            <div class="pt-1">
              <!-- If photo NOT captured yet -->
              <div v-if="!capturedPhotoBase64" class="flex gap-2">
                <button
                  type="button"
                  class="flex-1 rounded-2xl bg-slate-800 py-3 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                  @click="resetToStep1"
                >
                  Ganti NIK
                </button>
                <button
                  type="button"
                  :disabled="!cameraActive"
                  class="flex-2 rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                  @click="takeSnapshot"
                >
                  <span class="i-lucide-camera size-4"></span>
                  <span>Ambil Foto</span>
                </button>
              </div>

              <!-- If photo IS captured -->
              <div v-else class="flex gap-2">
                <button
                  type="button"
                  :disabled="submittingAttendance"
                  class="flex-1 rounded-2xl bg-slate-800 py-3 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                  @click="retakePhoto"
                >
                  Foto Ulang
                </button>
                <button
                  type="button"
                  :disabled="submittingAttendance"
                  class="flex-2 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                  @click="submitAttendance"
                >
                  <span v-if="submittingAttendance" class="i-lucide-loader-2 size-4 animate-spin"></span>
                  <span>{{ submittingAttendance ? 'Mengirim...' : 'Kirim Absensi' }}</span>
                  <span v-if="!submittingAttendance" class="i-lucide-check size-4"></span>
                </button>
              </div>
            </div>
          </div>

          <!-- STEP 3: Success Confirmation Screen -->
          <div v-if="currentStep === 3 && attendanceResult" class="rounded-3xl border border-emerald-500/20 bg-slate-900/90 p-6 text-center shadow-2xl space-y-5">
            <!-- Animated checkmark -->
            <div class="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
              <span class="i-lucide-check-circle-2 text-3xl"></span>
            </div>

            <div>
              <h2 class="text-xl font-bold text-white">Absensi Berhasil Tercatat!</h2>
              <p class="mt-1 text-xs text-slate-400">
                Terima kasih, kehadiran Anda pada acara ini telah tersimpan dalam sistem HRIS.
              </p>
            </div>

            <!-- Receipt Detail Card -->
            <div class="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left space-y-2.5">
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-400">Nama Event</span>
                <span class="font-semibold text-white truncate max-w-[180px]">{{ attendanceResult.nama_event }}</span>
              </div>
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-400">Nama Karyawan</span>
                <span class="font-bold text-white">{{ attendanceResult.nama_karyawan }}</span>
              </div>
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-400">NIK</span>
                <span class="font-mono font-bold text-blue-400">{{ attendanceResult.nik }}</span>
              </div>
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-400">Waktu Presensi</span>
                <span class="font-semibold text-emerald-400">{{ attendanceResult.jam_absen_formatted }}</span>
              </div>

              <!-- Selfie photo thumbnail -->
              <div v-if="attendanceResult.foto_url || capturedPhotoBase64" class="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span class="text-xs text-slate-400">Foto Terkirim</span>
                <img
                  :src="attendanceResult.foto_url || capturedPhotoBase64"
                  alt="Selfie Receipt"
                  class="size-11 rounded-xl object-cover border border-slate-700"
                />
              </div>
            </div>

            <button
              type="button"
              class="w-full rounded-2xl bg-slate-800 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700"
              @click="resetToStep1"
            >
              Absen Peserta Lain
            </button>
          </div>
        </div>
      </main>

      <!-- Footer -->
      <footer class="pt-3 pb-2 text-center text-[11px] text-slate-600 border-t border-slate-850">
        HRIS Presensi Event • Hompim Play &copy; 2026
      </footer>
    </div>
  </div>
</template>
