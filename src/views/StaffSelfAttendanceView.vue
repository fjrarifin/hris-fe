<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { getStaffAttendance, submitStaffSelfAttendance } from '../services/staffService'
import { apiError, formatDate } from '../utils/formatters'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const videoRef = ref(null)
const canvasRef = ref(null)
const mediaStream = ref(null)

const cameraActive = ref(false)
const cameraLoading = ref(false)
const cameraError = ref('')
const cameraPermissionStatus = ref('')

const gpsLoading = ref(false)
const gpsCoords = ref(null)
const gpsAccuracy = ref(null)
const gpsStatusText = ref('Mendeteksi posisi GPS...')
const gpsError = ref('')
const gpsPermissionStatus = ref('')

const liveTime = ref('')
const liveDate = ref('')
let timer = null

const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const attendanceSuccess = ref(false)
const resultData = ref(null)
const capturedPhotoUrl = ref('')

const allowMobileAttendance = computed(() => Boolean(auth.user?.allow_mobile_attendance))

const isInsecureHttp = computed(() => {
  if (typeof window === 'undefined') return false
  return !window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1'
})

function startClock() {
  const update = () => {
    const now = new Date()
    liveTime.value = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    liveDate.value = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }
  update()
  timer = setInterval(update, 1000)
}

function stopClock() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

async function getGPSLocation() {
  gpsLoading.value = true
  gpsError.value = ''
  gpsStatusText.value = 'Mendeteksi posisi GPS...'
  gpsCoords.value = null
  gpsAccuracy.value = null

  if (!navigator.geolocation) {
    gpsError.value = 'Browser Anda tidak mendukung fitur Geolocation.'
    gpsStatusText.value = 'GPS tidak tersedia di browser ini.'
    gpsLoading.value = false
    return
  }

  if (isInsecureHttp.value) {
    gpsError.value = 'Akses GPS diblokir oleh Chrome karena diakses via HTTP (bukan HTTPS). Gunakan HTTPS atau izinkan insecure origin di Chrome.'
    gpsStatusText.value = 'Gagal mengakses GPS (Insecure HTTP)'
    gpsLoading.value = false
    return
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0,
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude
      const lon = position.coords.longitude
      const acc = Math.round(position.coords.accuracy)
      gpsCoords.value = { latitude: lat, longitude: lon }
      gpsAccuracy.value = acc
      gpsStatusText.value = `Koordinat: ${lat.toFixed(5)}, ${lon.toFixed(5)} (Akurasi ±${acc}m)`
      gpsLoading.value = false
      gpsPermissionStatus.value = 'granted'
    },
    (err) => {
      console.warn('Geolocation error:', err)
      if (err.code === 1) { // PERMISSION_DENIED
        gpsPermissionStatus.value = 'denied'
        gpsError.value = 'Izin Lokasi/GPS ditolak oleh browser Chrome Anda. Klik ikon gembok/setelan di samping alamat URL browser ➔ Izin ➔ Aktifkan Lokasi.'
      } else if (err.code === 2) { // POSITION_UNAVAILABLE
        gpsError.value = 'Sinyal/Lokasi GPS tidak dapat ditemukan. Pastikan GPS/Location Service pada HP/Komputer Anda diaktifkan.'
      } else if (err.code === 3) { // TIMEOUT
        gpsError.value = 'Waktu deteksi lokasi GPS habis. Silakan klik tombol "Coba Ulang GPS".'
      } else {
        gpsError.value = 'Gagal membaca posisi GPS. Pastikan izin lokasi diberikan pada browser Anda.'
      }
      gpsStatusText.value = 'Lokasi GPS tidak dapat dibaca.'
      gpsLoading.value = false
    },
    options
  )
}

async function startCamera() {
  cameraError.value = ''
  cameraLoading.value = true
  cameraActive.value = false

  if (isInsecureHttp.value) {
    cameraError.value = 'Akses Kamera diblokir oleh Chrome karena diakses via HTTP (Insecure Context). Chrome memerlukan akses HTTPS untuk membuka Kamera.'
    cameraLoading.value = false
    return
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    cameraError.value = 'Browser/perangkat Anda tidak mendukung Web Camera API.'
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
    cameraPermissionStatus.value = 'granted'
  } catch (err) {
    console.error('Camera access error:', err)
    cameraPermissionStatus.value = 'denied'
    const name = err.name || ''
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      cameraError.value = 'Izin Kamera ditolak oleh Anda/Browser. Silakan klik ikon gembok/setelan di samping alamat URL Chrome ➔ Pilih Kamera ➔ Diizinkan (Allow), lalu refresh.'
    } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      cameraError.value = 'Kamera depan tidak ditemukan pada perangkat ini.'
    } else if (name === 'NotReadableError' || name === 'TrackStartError') {
      cameraError.value = 'Kamera sedang digunakan oleh aplikasi/tab lain (seperti Zoom/Meet). Tutup aplikasi tersebut terlebih dahulu.'
    } else {
      cameraError.value = 'Gagal membuka kamera depan. Pastikan Izin Kamera diberikan pada browser Anda.'
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

function captureSelfieBase64() {
  if (!videoRef.value || !canvasRef.value) return null
  const video = videoRef.value
  const canvas = canvasRef.value

  const sourceWidth = video.videoWidth || 640
  const sourceHeight = video.videoHeight || 480
  const maxDimension = 1000
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight))
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))

  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Mirror horizontally for selfie photo
  ctx.translate(width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(video, 0, 0, width, height)

  return canvas.toDataURL('image/jpeg', 0.85)
}

async function handleCaptureAndSubmit() {
  errorMessage.value = ''
  if (!gpsCoords.value) {
    errorMessage.value = 'Koordinat GPS wajib terdeteksi terlebih dahulu.'
    await getGPSLocation()
    return
  }

  const base64Photo = captureSelfieBase64()
  if (!base64Photo) {
    errorMessage.value = 'Gagal mengambil gambar foto selfie.'
    return
  }

  capturedPhotoUrl.value = base64Photo
  isSubmitting.value = true

  try {
    const payload = {
      photo: base64Photo,
      latitude: gpsCoords.value.latitude,
      longitude: gpsCoords.value.longitude,
    }

    const { data } = await submitStaffSelfAttendance(payload)
    resultData.value = data
    attendanceSuccess.value = true
    successMessage.value = data.message || 'Absensi berhasil disimpan.'
    stopCamera()
  } catch (err) {
    errorMessage.value = apiError(err, 'Gagal memproses absensi mandiri.')
  } finally {
    isSubmitting.value = false
  }
}

function resetAttendance() {
  attendanceSuccess.value = false
  resultData.value = null
  capturedPhotoUrl.value = ''
  errorMessage.value = ''
  successMessage.value = ''
  getGPSLocation()
  startCamera()
}

function requestAllPermissions() {
  getGPSLocation()
  startCamera()
}

onMounted(() => {
  startClock()
  if (allowMobileAttendance.value) {
    requestAllPermissions()
  }
})

onBeforeUnmount(() => {
  stopClock()
  stopCamera()
})
</script>

<template>
  <section class="max-w-2xl mx-auto space-y-6 pb-12">
    <!-- Header Page -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-highlighted flex items-center gap-2">
          <UIcon name="i-lucide-camera" class="size-7 text-primary" />
          Absensi Mandiri (Self Attendance)
        </h2>
        <p class="mt-1 text-sm text-muted">
          Lakukan absensi selfie & koordinat GPS secara mandiri via Web Browser di perangkat manapun (iOS, Android, Laptop, PC).
        </p>
      </div>
      <UButton to="/staff/attendance" variant="soft" color="neutral" size="sm" icon="i-lucide-history" label="Riwayat" />
    </div>

    <!-- Warning Insecure HTTP -->
    <UAlert v-if="isInsecureHttp" color="red" variant="soft" icon="i-lucide-shield-alert"
      title="Memerlukan Akses HTTPS (Secure Context)"
      description="Chrome dan browser modern memerlukan protokol HTTPS untuk memberikan izin Kamera & GPS. Jika diakses melalui HTTP IP lokal, silakan buka alamat web menggunakan domain HTTPS atau izinkan Unsafety Insecure Origin pada setelan Chrome." />

    <!-- Alert Access Restriction -->
    <UAlert v-else-if="!allowMobileAttendance" color="warning" variant="soft" icon="i-lucide-shield-alert"
      title="Akses Absensi Mandiri Belum Diizinkan"
      description="Akun Anda belum memiliki izin absensi mobile/web mandiri (allow_mobile_attendance = 0). Silakan hubungi tim HR atau IT Administrator untuk mengaktifkan izin ini." />

    <div v-else>
      <AlertToastBridge :message="successMessage" :error="errorMessage" />

      <!-- Success View State -->
      <UCard v-if="attendanceSuccess" class="shadow-md border border-green-500/30 bg-green-500/5">
        <div class="text-center py-6 space-y-4">
          <div class="inline-flex items-center justify-center size-16 rounded-full bg-green-500/20 text-green-600 dark:text-green-400">
            <UIcon name="i-lucide-check-circle-2" class="size-10" />
          </div>
          <div>
            <h3 class="text-xl font-bold text-highlighted">{{ successMessage }}</h3>
            <p class="text-xs text-muted mt-1">{{ liveDate }}</p>
          </div>

          <!-- Selfie Image Preview -->
          <div class="relative w-48 h-64 mx-auto rounded-2xl overflow-hidden border-2 border-primary shadow-lg bg-black">
            <img :src="capturedPhotoUrl" class="w-full h-full object-cover" alt="Foto Selfie Absen" />
          </div>

          <!-- Info Details -->
          <div class="max-w-md mx-auto rounded-xl border border-default bg-default p-4 text-xs space-y-2 text-left shadow-xs">
            <div class="flex justify-between items-center py-1 border-b border-default">
              <span class="text-muted font-medium">Tipe Absen</span>
              <UBadge :color="resultData?.attendance_type === 'Masuk' ? 'green' : 'amber'" variant="soft" size="xs">
                {{ resultData?.attendance_type || 'Masuk' }}
              </UBadge>
            </div>
            <div class="flex justify-between items-center py-1 border-b border-default">
              <span class="text-muted font-medium">Waktu Absen</span>
              <span class="font-bold text-highlighted">{{ resultData?.scan_time || liveTime }} WIB</span>
            </div>
            <div class="flex justify-between items-center py-1">
              <span class="text-muted font-medium">Koordinat GPS</span>
              <span class="font-mono text-highlighted text-[11px]">
                {{ gpsCoords?.latitude?.toFixed(5) }}, {{ gpsCoords?.longitude?.toFixed(5) }}
              </span>
            </div>
          </div>

          <div class="flex items-center justify-center gap-3 pt-2">
            <UButton color="primary" variant="solid" icon="i-lucide-camera" label="Absen Lagi" @click="resetAttendance" />
            <UButton to="/staff/attendance" color="neutral" variant="outline" icon="i-lucide-list" label="Buka Riwayat Absensi" />
          </div>
        </div>
      </UCard>

      <!-- Active Camera & GPS Attendance View -->
      <UCard v-else class="shadow-md">
        <!-- Live Clock & Date Banner -->
        <div class="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center space-y-1 mb-5">
          <div class="text-3xl font-extrabold font-mono tracking-wider text-primary">{{ liveTime }} WIB</div>
          <div class="text-xs font-semibold text-muted uppercase tracking-wide">{{ liveDate }}</div>
        </div>

        <!-- Permission Prompt Action Strip if camera or GPS blocked -->
        <div v-if="cameraError || gpsError" class="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2 text-xs">
          <div class="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300">
            <UIcon name="i-lucide-lock" class="size-4 shrink-0" />
            <span>Diperlukan Izin Browser Chrome (Kamera & GPS)</span>
          </div>
          <p class="text-muted leading-relaxed">
            Jika popup izin tidak muncul otomatis, silakan klik tombol di bawah untuk memicu popup izin browser Chrome Anda:
          </p>
          <div class="flex items-center gap-2 flex-wrap pt-1">
            <UButton size="xs" color="primary" variant="solid" icon="i-lucide-camera" label="Aktifkan Kamera" @click="startCamera" />
            <UButton size="xs" color="sky" variant="solid" icon="i-lucide-map-pin" label="Aktifkan GPS" @click="getGPSLocation" />
          </div>
        </div>

        <!-- Camera Scanner Card -->
        <div class="relative w-full aspect-3/4 max-w-sm mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-default shadow-inner flex flex-col items-center justify-center">
          <video v-show="cameraActive" ref="videoRef" autoplay playsinline class="w-full h-full object-cover transform -scale-x-100" />
          <canvas ref="canvasRef" style="display:none" />

          <!-- Face Frame Oval Guide -->
          <div v-if="cameraActive" class="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div class="w-56 h-72 rounded-[50%] border-2 border-dashed border-primary/80 bg-primary/5 shadow-2xl animate-pulse"></div>
            <p class="mt-4 px-3 py-1 bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium rounded-full">
              Posisikan wajah Anda di dalam area
            </p>
          </div>

          <!-- Loading State -->
          <div v-if="cameraLoading" class="text-center p-6 text-white space-y-3">
            <UIcon name="i-lucide-loader-2" class="size-8 animate-spin mx-auto text-primary" />
            <p class="text-xs">Memulai kamera depan...</p>
          </div>

          <!-- Camera Error State -->
          <div v-if="cameraError" class="text-center p-6 text-red-400 space-y-3">
            <UIcon name="i-lucide-camera-off" class="size-8 mx-auto" />
            <p class="text-xs leading-relaxed max-w-xs text-left font-sans bg-black/40 p-3 rounded-lg border border-red-500/20">
              {{ cameraError }}
            </p>
            <UButton size="xs" color="primary" variant="solid" icon="i-lucide-refresh-cw" label="Coba Kamera Lagi" @click="startCamera" />
          </div>
        </div>

        <!-- Location GPS Status Strip -->
        <div class="mt-5 rounded-xl border border-default p-3 bg-muted/10 space-y-2 text-xs">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 font-semibold text-highlighted">
              <UIcon name="i-lucide-map-pin" class="size-4 text-primary shrink-0" />
              <span>Deteksi Lokasi GPS</span>
            </div>
            <UButton size="2xs" color="neutral" variant="ghost" icon="i-lucide-refresh-cw" :loading="gpsLoading" label="Refresh GPS" @click="getGPSLocation" />
          </div>

          <div class="flex items-center justify-between gap-2 text-muted">
            <span class="font-mono text-[11px] truncate">{{ gpsStatusText }}</span>
            <UBadge v-if="gpsCoords" color="green" variant="soft" size="xs" class="shrink-0">GPS Terhubung</UBadge>
            <UBadge v-else-if="gpsLoading" color="warning" variant="soft" size="xs" class="shrink-0">Mencari GPS...</UBadge>
            <UBadge v-else color="red" variant="soft" size="xs" class="shrink-0">GPS Gagal</UBadge>
          </div>
          <p v-if="gpsError" class="text-[11px] text-red-500 leading-relaxed bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 mt-1">
            {{ gpsError }}
          </p>
        </div>

        <!-- Primary Action Submit Button -->
        <div class="mt-6">
          <UButton block size="lg" color="primary" variant="solid" icon="i-lucide-camera" label="Ambil Foto & Absen Mandiri"
            :loading="isSubmitting" :disabled="!cameraActive || gpsLoading || !gpsCoords"
            @click="handleCaptureAndSubmit" class="font-bold py-3 shadow-md" />
        </div>
      </UCard>
    </div>
  </section>
</template>
