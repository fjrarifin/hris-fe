<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import QRCode from 'qrcode'
import SecureImage from '../components/SecureImage.vue'
import {
  createEventAbsen,
  deleteEventAbsen,
  downloadEventAbsenPhotos,
  exportEventAbsenParticipants,
  getEventAbsenDetail,
  getEventAbsenEmployees,
  getEventAbsenList,
  updateEventAbsen,
} from '../services/eventAbsenService'
import { askConfirmation } from '../utils/confirmDialog'
import { formatDateTime } from '../utils/formatters'
import { notifier } from '../utils/notifications'

const loading = ref(false)
const saving = ref(false)
const events = ref([])
const summary = ref({
  total_events: 0,
  active_events: 0,
  total_attendances: 0,
})
const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0,
})

const filters = reactive({
  search: '',
  status: '',
  page: 1,
  per_page: 15,
})

// Modals
const showFormModal = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const form = reactive({
  nama_event: '',
  deskripsi: '',
  lokasi: '',
  slug: '',
  tanggal_acara: '',
  jam_mulai: '09:00',
  jam_selesai: '11:00',
  reminder_value: 1,
  reminder_unit: 'hours',
  participant_niks: [],
  status: 'aktif',
})
const formErrors = reactive({})

// Employee picker for optional participants
const employeeOptions = ref([])
const loadingEmployees = ref(false)
const employeeSearch = ref('')
const employeeDivisiFilter = ref('')

const reminderPresets = [
  { label: '30 mnt', value: 30, unit: 'minutes' },
  { label: '1 jam', value: 1, unit: 'hours' },
  { label: '2 jam', value: 2, unit: 'hours' },
  { label: '12 jam', value: 12, unit: 'hours' },
  { label: '24 jam', value: 24, unit: 'hours' },
]

// QR Code Modal
const showQrModal = ref(false)
const selectedQrEvent = ref(null)
const qrCanvasRef = ref(null)
const qrDataUrl = ref('')

// Participants Modal
const showParticipantsModal = ref(false)
const loadingParticipants = ref(false)
const selectedDetailEvent = ref(null)
const participants = ref([])
const invitedParticipants = ref([])
const participantsTab = ref('attended')
const participantSearch = ref('')
const selectedPhotoPreview = ref(null)

const publicBaseUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/absen-event/`
  }
  return '/absen-event/'
})

const formControlClass =
  'w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

const availableDivisions = computed(() => {
  const set = new Set()
  employeeOptions.value.forEach((emp) => {
    const label = (emp.divisi || emp.departement || '').trim()
    if (label) set.add(label)
  })
  return Array.from(set).sort()
})

const filteredEmployeeOptions = computed(() => {
  const q = employeeSearch.value.trim().toLowerCase()
  const div = employeeDivisiFilter.value.trim().toLowerCase()

  return employeeOptions.value.filter((emp) => {
    const empDiv = (emp.divisi || emp.departement || '').trim().toLowerCase()
    if (div && empDiv !== div) {
      return false
    }
    if (!q) return true
    return (
      (emp.nik || '').toLowerCase().includes(q) ||
      (emp.nama_karyawan || '').toLowerCase().includes(q) ||
      (emp.jabatan || '').toLowerCase().includes(q) ||
      empDiv.includes(q)
    )
  })
})

const selectedEmployeeObjects = computed(() => {
  const map = new Map(employeeOptions.value.map((emp) => [emp.nik, emp]))
  return form.participant_niks.map((nik) => map.get(nik) || { nik, nama_karyawan: nik, has_phone: true })
})

const reminderMinutesTotal = computed(() => {
  const val = Math.max(1, Number(form.reminder_value) || 1)
  return form.reminder_unit === 'hours' ? val * 60 : val
})

const filteredParticipants = computed(() => {
  if (!participantSearch.value.trim()) {
    return participants.value
  }
  const q = participantSearch.value.toLowerCase()
  return participants.value.filter((item) => {
    const nik = (item.nik_karyawan || '').toLowerCase()
    const name = (item.karyawan?.nama_karyawan || '').toLowerCase()
    const jabatan = (item.karyawan?.jabatan || '').toLowerCase()
    const divisi = (item.karyawan?.divisi || '').toLowerCase()
    return nik.includes(q) || name.includes(q) || jabatan.includes(q) || divisi.includes(q)
  })
})

const filteredInvitedParticipants = computed(() => {
  if (!participantSearch.value.trim()) {
    return invitedParticipants.value
  }
  const q = participantSearch.value.toLowerCase()
  return invitedParticipants.value.filter((item) => {
    const nik = (item.nik_karyawan || '').toLowerCase()
    const name = (item.nama_karyawan || '').toLowerCase()
    const jabatan = (item.jabatan || '').toLowerCase()
    const divisi = (item.divisi || '').toLowerCase()
    return nik.includes(q) || name.includes(q) || jabatan.includes(q) || divisi.includes(q)
  })
})

function formatDateInput(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatTimeInput(dateStr, fallback = '09:00') {
  if (!dateStr) return fallback
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return fallback
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function applyReminderPreset(preset) {
  form.reminder_value = preset.value
  form.reminder_unit = preset.unit
}

function isPresetActive(preset) {
  return Number(form.reminder_value) === preset.value && form.reminder_unit === preset.unit
}

function formatReminderBadge(minutes) {
  if (!minutes || minutes <= 0) return ''
  if (minutes % 60 === 0) return `H-${minutes / 60} jam`
  return `H-${minutes} mnt`
}

function toggleParticipant(nik) {
  const idx = form.participant_niks.indexOf(nik)
  if (idx === -1) {
    form.participant_niks.push(nik)
  } else {
    form.participant_niks.splice(idx, 1)
  }
}

function selectAllFilteredEmployees() {
  const set = new Set(form.participant_niks)
  filteredEmployeeOptions.value.forEach((emp) => set.add(emp.nik))
  form.participant_niks = Array.from(set)
}

function clearSelectedParticipants() {
  form.participant_niks = []
}

async function ensureEmployeesLoaded() {
  if (employeeOptions.value.length > 0 || loadingEmployees.value) return
  loadingEmployees.value = true
  try {
    const { data } = await getEventAbsenEmployees()
    employeeOptions.value = data.data || []
  } catch (err) {
    notifier.error(err.response?.data?.message || 'Gagal memuat daftar karyawan.')
  } finally {
    loadingEmployees.value = false
  }
}

function generateSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function handleNameInput() {
  if (!isEditing.value) {
    form.slug = generateSlug(form.nama_event)
  }
}

async function loadEvents(page = 1) {
  loading.value = true
  filters.page = page
  try {
    const { data } = await getEventAbsenList(filters)
    events.value = data.data || []
    pagination.value = data.meta || pagination.value
    summary.value = data.summary || summary.value
  } catch (err) {
    notifier.error(err.response?.data?.message || 'Gagal memuat daftar event absensi.')
  } finally {
    loading.value = false
  }
}

async function openCreateModal() {
  isEditing.value = false
  editingId.value = null
  employeeSearch.value = ''
  employeeDivisiFilter.value = ''
  Object.assign(form, {
    nama_event: '',
    deskripsi: '',
    lokasi: '',
    slug: '',
    tanggal_acara: formatDateInput(new Date()),
    jam_mulai: '09:00',
    jam_selesai: '11:00',
    reminder_value: 1,
    reminder_unit: 'hours',
    participant_niks: [],
    status: 'aktif',
  })
  Object.keys(formErrors).forEach((k) => delete formErrors[k])
  showFormModal.value = true
  await ensureEmployeesLoaded()
}

async function openEditModal(item) {
  isEditing.value = true
  editingId.value = item.id
  employeeSearch.value = ''
  employeeDivisiFilter.value = ''
  const reminderMins = Number(item.reminder_minutes_before) || 60
  const useHours = reminderMins >= 60 && reminderMins % 60 === 0
  const existingNiks = Array.isArray(item.invited_participants)
    ? item.invited_participants.map((p) => p.nik_karyawan).filter(Boolean)
    : []

  Object.assign(form, {
    nama_event: item.nama_event,
    deskripsi: item.deskripsi || '',
    lokasi: item.lokasi || '',
    slug: item.slug,
    tanggal_acara: formatDateInput(item.tanggal_mulai),
    jam_mulai: formatTimeInput(item.tanggal_mulai, '09:00'),
    jam_selesai: formatTimeInput(item.tanggal_selesai, '11:00'),
    reminder_value: useHours ? reminderMins / 60 : reminderMins,
    reminder_unit: useHours ? 'hours' : 'minutes',
    participant_niks: [...existingNiks],
    status: item.status || 'aktif',
  })
  Object.keys(formErrors).forEach((k) => delete formErrors[k])
  showFormModal.value = true
  await ensureEmployeesLoaded()
}

async function saveEvent() {
  Object.keys(formErrors).forEach((k) => delete formErrors[k])

  if (!form.tanggal_acara || !form.jam_mulai || !form.jam_selesai) {
    notifier.error('Tanggal acara, jam mulai, dan jam selesai wajib diisi.')
    return
  }

  if (form.jam_selesai <= form.jam_mulai) {
    formErrors.tanggal_selesai = ['Jam selesai harus setelah jam mulai.']
    notifier.error('Jam selesai harus setelah jam mulai.')
    return
  }

  const hasParticipants = form.participant_niks.length > 0
  const lokasiInfo = form.lokasi?.trim() ? ` di ${form.lokasi.trim()}` : ''
  const confirmMessage = isEditing.value
    ? hasParticipants
      ? `Simpan perubahan event "${form.nama_event}" (${form.tanggal_acara}, ${form.jam_mulai}–${form.jam_selesai} WIB${lokasiInfo})? Peserta baru yang ditambahkan akan otomatis menerima undangan WA melalui Nova Agent.`
      : `Simpan perubahan event "${form.nama_event}" (${form.tanggal_acara}, ${form.jam_mulai}–${form.jam_selesai} WIB${lokasiInfo})?`
    : hasParticipants
      ? `Buat event "${form.nama_event}" pada ${form.tanggal_acara} (${form.jam_mulai}–${form.jam_selesai} WIB${lokasiInfo})? Nova Agent akan langsung mengirim undangan WhatsApp & pengingat ${formatReminderBadge(reminderMinutesTotal.value)} ke ${form.participant_niks.length} peserta terpilih.`
      : `Buat event "${form.nama_event}" pada ${form.tanggal_acara} (${form.jam_mulai}–${form.jam_selesai} WIB${lokasiInfo})? Absensi akan terbuka untuk seluruh karyawan HRIS.`

  const confirmed = await askConfirmation({
    title: isEditing.value ? 'Konfirmasi Simpan Perubahan' : 'Konfirmasi Buat Event',
    message: confirmMessage,
    confirmLabel: isEditing.value ? 'Ya, Simpan' : 'Ya, Buat Event',
    color: 'primary',
  })

  if (!confirmed) return

  saving.value = true

  const payload = {
    nama_event: form.nama_event,
    deskripsi: form.deskripsi,
    lokasi: form.lokasi?.trim() || null,
    slug: form.slug ? generateSlug(form.slug) : undefined,
    tanggal_mulai: `${form.tanggal_acara} ${form.jam_mulai}:00`,
    tanggal_selesai: `${form.tanggal_acara} ${form.jam_selesai}:00`,
    status: form.status,
    reminder_enabled: hasParticipants,
    reminder_minutes_before: hasParticipants ? reminderMinutesTotal.value : null,
    participant_niks: [...form.participant_niks],
  }

  try {
    if (isEditing.value) {
      await updateEventAbsen(editingId.value, payload)
      notifier.success('Event absensi berhasil diperbarui.')
    } else {
      const { data } = await createEventAbsen(payload)
      notifier.success(data?.message || 'Event absensi baru berhasil dibuat.')
    }
    showFormModal.value = false
    await loadEvents(pagination.value.current_page)
  } catch (err) {
    const errorData = err.response?.data
    if (errorData?.errors) {
      Object.assign(formErrors, errorData.errors)
    }
    notifier.error(errorData?.message || 'Gagal menyimpan data event.')
  } finally {
    saving.value = false
  }
}

async function confirmDelete(item) {
  const confirmed = await askConfirmation({
    title: 'Hapus Event Absensi',
    message: `Apakah Anda yakin ingin menghapus event "${item.nama_event}"? Semua riwayat absensi pada event ini akan terhapus.`,
    confirmLabel: 'Ya, Hapus',
    color: 'error',
  })

  if (!confirmed) return

  try {
    await deleteEventAbsen(item.id)
    notifier.success('Event absensi berhasil dihapus.')
    await loadEvents(pagination.value.current_page)
  } catch (err) {
    notifier.error(err.response?.data?.message || 'Gagal menghapus event.')
  }
}

async function copyPublicLink(slug) {
  const fullUrl = `${publicBaseUrl.value}${slug}`
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(fullUrl)
    } else {
      const el = document.createElement('textarea')
      el.value = fullUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    notifier.success('Link public absensi berhasil disalin ke clipboard!')
  } catch {
    notifier.error('Gagal menyalin link ke clipboard.')
  }
}

async function openQrModal(item) {
  selectedQrEvent.value = item
  showQrModal.value = true
  await nextTick()

  const fullUrl = `${publicBaseUrl.value}${item.slug}`
  try {
    if (qrCanvasRef.value) {
      await QRCode.toCanvas(qrCanvasRef.value, fullUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
      qrDataUrl.value = qrCanvasRef.value.toDataURL('image/png')
    }
  } catch (err) {
    console.error('QR code generation failed:', err)
  }
}

function downloadQrCode() {
  if (!qrDataUrl.value || !selectedQrEvent.value) return
  const link = document.createElement('a')
  link.download = `qrcode-${selectedQrEvent.value.slug}.png`
  link.href = qrDataUrl.value
  link.click()
}

function printQrPoster() {
  if (!selectedQrEvent.value || !qrDataUrl.value) return
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const eventName = selectedQrEvent.value.nama_event
  const eventLocation = selectedQrEvent.value.lokasi || ''
  const eventDesc = selectedQrEvent.value.deskripsi || ''
  const fullUrl = `${publicBaseUrl.value}${selectedQrEvent.value.slug}`

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>QR Code Absensi - ${eventName}</title>
        <style>
          @page { size: A4 portrait; margin: 20mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-align: center;
            color: #0f172a;
            padding: 20px;
          }
          .card {
            border: 2px dashed #0284c7;
            border-radius: 24px;
            padding: 40px 20px;
            max-width: 550px;
            margin: 0 auto;
          }
          .brand {
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 2px;
            color: #0284c7;
            text-transform: uppercase;
            margin-bottom: 12px;
          }
          h1 {
            font-size: 26px;
            margin: 0 0 10px;
            color: #0f172a;
          }
          .desc {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 24px;
          }
          .qr-wrapper {
            background: #ffffff;
            display: inline-block;
            padding: 16px;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          }
          .qr-img {
            width: 260px;
            height: 260px;
            display: block;
          }
          .instructions {
            margin-top: 24px;
            font-size: 15px;
            font-weight: 600;
            color: #334155;
          }
          .sub-inst {
            font-size: 13px;
            color: #64748b;
            margin-top: 6px;
          }
          .url-box {
            margin-top: 18px;
            padding: 8px 14px;
            background: #f1f5f9;
            border-radius: 8px;
            display: inline-block;
            font-size: 12px;
            color: #475569;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="brand">HRIS PRESENSI EVENT</div>
          <h1>${eventName}</h1>
          ${eventLocation ? `<p class="desc" style="font-weight:600;color:#334155;margin-bottom:8px;">Lokasi: ${eventLocation}</p>` : ''}
          ${eventDesc ? `<p class="desc">${eventDesc}</p>` : ''}
          <div class="qr-wrapper">
            <img src="${qrDataUrl.value}" class="qr-img" />
          </div>
          <div class="instructions">Scan QR Code ini menggunakan Smartphone Anda</div>
          <div class="sub-inst">Buka kamera HP / QR Scanner untuk masuk ke halaman absensi</div>
          <div class="url-box">${fullUrl}</div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        <\/script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

async function openParticipantsModal(item) {
  selectedDetailEvent.value = item
  participantSearch.value = ''
  participantsTab.value = 'attended'
  invitedParticipants.value = []
  showParticipantsModal.value = true
  loadingParticipants.value = true
  try {
    const { data } = await getEventAbsenDetail(item.id)
    selectedDetailEvent.value = data.data
    participants.value = data.participants || []
    invitedParticipants.value = data.invited_participants || []
  } catch (err) {
    notifier.error(err.response?.data?.message || 'Gagal memuat detail peserta event.')
  } finally {
    loadingParticipants.value = false
  }
}

async function downloadExport(item) {
  try {
    const response = await exportEventAbsenParticipants(item.id)
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `rekap-absen-${item.slug}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    notifier.success('Rekap absensi berhasil diunduh.')
  } catch (err) {
    notifier.error(err.response?.data?.message || 'Gagal mengunduh rekap absensi.')
  }
}

const downloadingPhotos = ref(false)

async function downloadAllPhotos(item) {
  downloadingPhotos.value = true
  try {
    const response = await downloadEventAbsenPhotos(item.id)
    const blob = new Blob([response.data], { type: 'application/zip' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Foto-Absen-${item.slug}.zip`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    notifier.success('Semua foto absensi berhasil diunduh (.zip).')
  } catch (err) {
    notifier.error(err.response?.data?.message || 'Gagal mengunduh foto absensi. Pastikan peserta sudah memiliki foto selfie.')
  } finally {
    downloadingPhotos.value = false
  }
}

function getStatusBadge(item) {
  const status = item.effective_status
  if (status === 'aktif') {
    return {
      label: 'Aktif',
      color: 'emerald',
      variant: 'subtle',
    }
  }
  if (status === 'kadaluarsa') {
    return {
      label: 'Selesai',
      color: 'neutral',
      variant: 'subtle',
    }
  }
  if (status === 'mendatang') {
    return {
      label: 'Mendatang',
      color: 'primary',
      variant: 'subtle',
    }
  }
  return {
    label: 'Nonaktif',
    color: 'error',
    variant: 'subtle',
  }
}

onMounted(() => {
  loadEvents()
})
</script>

<template>
  <section class="space-y-6">
    <!-- Header Section -->
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h2 class="text-2xl font-semibold text-highlighted">Absensi Event & Non-Kerja</h2>
        <p class="mt-1 text-sm text-muted">
          Kelola public link absensi untuk kegiatan workshop, training K3, gathering, dan acara temporal lainnya.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          label="Muat Ulang"
          :loading="loading"
          @click="loadEvents(pagination.current_page)"
        />
        <UButton
          color="primary"
          variant="solid"
          icon="i-lucide-plus"
          label="Buat Event Absen"
          @click="openCreateModal"
        />
      </div>
    </div>

    <!-- Summary Statistics KPI Cards -->
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-xl border border-default bg-[var(--ui-bg,#ffffff)] p-5 shadow-xs">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-muted">
              Total Event
            </p>
            <p class="mt-1 text-2xl font-bold text-highlighted">
              {{ summary.total_events || 0 }}
            </p>
          </div>
          <div class="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
            <UIcon name="i-lucide-calendar" class="size-6" />
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-default bg-[var(--ui-bg,#ffffff)] p-5 shadow-xs">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-muted">
              Event Aktif Berjalan
            </p>
            <p class="mt-1 text-2xl font-bold text-emerald-600">
              {{ summary.active_events || 0 }}
            </p>
          </div>
          <div class="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <UIcon name="i-lucide-radio" class="size-6" />
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-default bg-[var(--ui-bg,#ffffff)] p-5 shadow-xs">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-muted">
              Total Kehadiran Peserta
            </p>
            <p class="mt-1 text-2xl font-bold text-indigo-600">
              {{ summary.total_attendances || 0 }}
            </p>
          </div>
          <div class="flex size-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
            <UIcon name="i-lucide-users" class="size-6" />
          </div>
        </div>
      </div>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="flex flex-col gap-3 rounded-xl border border-default bg-[var(--ui-bg,#ffffff)] p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div class="relative flex-1 max-w-md">
          <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
          <input
            v-model="filters.search"
            type="text"
            placeholder="Cari nama event, deskripsi, atau slug..."
            class="w-full rounded-md border border-default bg-default py-2 pl-9 pr-4 text-sm text-highlighted placeholder:text-muted focus:border-primary focus:outline-none"
            @keyup.enter="loadEvents(1)"
          />
        </div>

        <select
          v-model="filters.status"
          class="rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted focus:border-primary focus:outline-none"
          @change="loadEvents(1)"
        >
          <option value="">Semua Status</option>
          <option value="aktif">Aktif</option>
          <option value="kadaluarsa">Selesai / Kadaluarsa</option>
          <option value="nonaktif">Nonaktif</option>
        </select>

        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          label="Filter"
          @click="loadEvents(1)"
        />
      </div>
    </div>

    <!-- Events List Table -->
    <div class="overflow-hidden rounded-xl border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-default bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted">
            <tr>
              <th class="px-5 py-3.5">Nama Event & Deskripsi</th>
              <th class="px-5 py-3.5">Public Link</th>
              <th class="px-5 py-3.5">Periode Waktu</th>
              <th class="px-5 py-3.5 text-center">Status</th>
              <th class="px-5 py-3.5 text-center">Peserta Hadir</th>
              <th class="px-5 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-if="loading && !events.length">
              <td colspan="6" class="px-5 py-12 text-center text-muted">
                <div class="inline-flex items-center gap-2">
                  <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" />
                  <span>Memuat daftar event...</span>
                </div>
              </td>
            </tr>

            <tr v-else-if="!events.length">
              <td colspan="6" class="px-5 py-12 text-center text-muted">
                <div class="flex flex-col items-center justify-center gap-2">
                  <UIcon name="i-lucide-calendar-x" class="size-8 text-muted" />
                  <p class="font-medium text-highlighted">Belum ada event absensi</p>
                  <p class="text-xs text-muted">Klik tombol "Buat Event Absen" di atas untuk membuat public link baru.</p>
                </div>
              </td>
            </tr>

            <tr
              v-for="item in events"
              :key="item.id"
              class="transition-colors hover:bg-muted/30"
            >
              <!-- Event Name & Desc -->
              <td class="px-5 py-4">
                <div class="font-semibold text-highlighted">
                  {{ item.nama_event }}
                </div>
                <div v-if="item.lokasi" class="mt-0.5 flex items-center gap-1 text-xs font-medium text-primary">
                  <UIcon name="i-lucide-map-pin" class="size-3.5 shrink-0" />
                  <span class="truncate">{{ item.lokasi }}</span>
                </div>
                <div v-if="item.deskripsi" class="mt-0.5 line-clamp-1 text-xs text-muted">
                  {{ item.deskripsi }}
                </div>
                <div class="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                  <span class="inline-flex items-center gap-1">
                    <UIcon name="i-lucide-user" class="size-3" />
                    <span>{{ item.creator?.name || 'Admin' }}</span>
                  </span>
                  <span>•</span>
                  <span>{{ formatDateTime(item.created_at) }}</span>
                  <template v-if="item.reminder_enabled && item.invited_participants_count > 0">
                    <span>•</span>
                    <span class="inline-flex items-center gap-1 text-emerald-600 font-medium">
                      <UIcon name="i-lucide-bell" class="size-3" />
                      <span>WA {{ formatReminderBadge(item.reminder_minutes_before) }}</span>
                    </span>
                  </template>
                </div>
              </td>

              <!-- Public Link -->
              <td class="px-5 py-4">
                <div class="flex items-center gap-2">
                  <span class="inline-block max-w-[180px] truncate font-mono text-xs text-muted">
                    /absen-event/{{ item.slug }}
                  </span>
                  <button
                    type="button"
                    title="Salin Link"
                    class="rounded-lg p-1 text-muted transition-colors hover:bg-muted hover:text-highlighted flex items-center justify-center"
                    @click="copyPublicLink(item.slug)"
                  >
                    <UIcon name="i-lucide-copy" class="size-4" />
                  </button>
                  <button
                    type="button"
                    title="Buka QR Code"
                    class="rounded-lg p-1 text-muted transition-colors hover:bg-muted hover:text-primary flex items-center justify-center"
                    @click="openQrModal(item)"
                  >
                    <UIcon name="i-lucide-qr-code" class="size-4" />
                  </button>
                </div>
              </td>

              <!-- Periode -->
              <td class="px-5 py-4">
                <div class="text-xs font-medium text-highlighted">
                  {{ formatDateTime(item.tanggal_mulai) }}
                </div>
                <div class="text-[11px] text-muted">
                  s/d {{ formatDateTime(item.tanggal_selesai) }}
                </div>
              </td>

              <!-- Status Badge -->
              <td class="px-5 py-4 text-center">
                <UBadge
                  :color="getStatusBadge(item).color"
                  :variant="getStatusBadge(item).variant"
                  :label="getStatusBadge(item).label"
                />
              </td>

              <!-- Total Attendances -->
              <td class="px-5 py-4 text-center">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                  @click="openParticipantsModal(item)"
                >
                  <UIcon name="i-lucide-users" class="size-3.5" />
                  <span v-if="item.invited_participants_count > 0">
                    {{ item.absensi_events_count || 0 }} / {{ item.invited_participants_count }} Hadir
                  </span>
                  <span v-else>{{ item.absensi_events_count || 0 }} Peserta</span>
                </button>
              </td>

              <!-- Actions -->
              <td class="px-5 py-4 text-right">
                <div class="inline-flex items-center gap-1">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    icon="i-lucide-users"
                    title="Lihat Daftar Peserta"
                    @click="openParticipantsModal(item)"
                  />
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    icon="i-lucide-download"
                    title="Export Rekap CSV"
                    @click="downloadExport(item)"
                  />
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    icon="i-lucide-pencil"
                    title="Edit Event"
                    @click="openEditModal(item)"
                  />
                  <UButton
                    color="error"
                    variant="ghost"
                    size="sm"
                    icon="i-lucide-trash-2"
                    title="Hapus Event"
                    @click="confirmDelete(item)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div v-if="pagination.last_page > 1" class="flex items-center justify-between border-t border-default px-5 py-3">
        <p class="text-xs text-muted">
          Menampilkan halaman {{ pagination.current_page }} dari {{ pagination.last_page }} (Total {{ pagination.total }} event)
        </p>
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            label="Sebelumnya"
            :disabled="pagination.current_page <= 1"
            @click="loadEvents(pagination.current_page - 1)"
          />
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            label="Berikutnya"
            :disabled="pagination.current_page >= pagination.last_page"
            @click="loadEvents(pagination.current_page + 1)"
          />
        </div>
      </div>
    </div>

    <!-- Create / Edit Event Modal (Wide 2-Column Layout with Sticky Header & Footer) -->
    <div
      v-if="showFormModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px]"
        aria-label="Tutup form event"
        @click="showFormModal = false"
      ></button>

      <div class="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-default bg-[var(--ui-bg,#ffffff)] shadow-2xl">
        <!-- Sticky Modal Header -->
        <div class="flex items-start justify-between gap-4 border-b border-default px-6 py-4">
          <div>
            <h3 class="text-lg font-bold text-highlighted">
              {{ isEditing ? 'Edit Event Absensi' : 'Buat Event Absensi Baru' }}
            </h3>
            <p class="mt-0.5 text-xs text-muted">
              Atur detail jadwal, lokasi ruangan, pengingat WhatsApp Nova Agent, dan daftar peserta karyawan (opsional).
            </p>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-x"
            @click="showFormModal = false"
          />
        </div>

        <!-- Scrollable Modal Body + Sticky Footer inside Form -->
        <form class="flex min-h-0 flex-1 flex-col" @submit.prevent="saveEvent">
          <div class="flex-1 overflow-y-auto px-6 py-5">
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <!-- Left Column: Detail Acara, Jadwal, Lokasi, Reminder, Slug -->
            <div class="space-y-4 lg:col-span-7">
              <!-- Nama Acara -->
              <div>
                <label class="mb-1.5 block text-xs font-semibold text-highlighted">
                  Nama Acara <span class="text-rose-500">*</span>
                </label>
                <input
                  v-model="form.nama_event"
                  type="text"
                  placeholder="Contoh: Training Penggunaan APAR & Tanggap Darurat Kebakaran"
                  :class="formControlClass"
                  required
                  @input="handleNameInput"
                />
                <p v-if="formErrors.nama_event" class="mt-1 text-xs text-rose-500">
                  {{ formErrors.nama_event[0] }}
                </p>
              </div>

              <!-- Tanggal & Jam Sejajar (HSSE Flow) -->
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-xs font-semibold text-highlighted">
                    Tanggal Acara <span class="text-rose-500">*</span>
                  </label>
                  <input
                    v-model="form.tanggal_acara"
                    type="date"
                    :class="formControlClass"
                    required
                  />
                  <p v-if="formErrors.tanggal_mulai" class="mt-1 text-xs text-rose-500">
                    {{ formErrors.tanggal_mulai[0] }}
                  </p>
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-semibold text-highlighted">
                    Jam Mulai (WIB) <span class="text-rose-500">*</span>
                  </label>
                  <input
                    v-model="form.jam_mulai"
                    type="time"
                    :class="formControlClass"
                    required
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-semibold text-highlighted">
                    Jam Selesai (WIB) <span class="text-rose-500">*</span>
                  </label>
                  <input
                    v-model="form.jam_selesai"
                    type="time"
                    :class="formControlClass"
                    required
                  />
                  <p v-if="formErrors.tanggal_selesai" class="mt-1 text-xs text-rose-500">
                    {{ formErrors.tanggal_selesai[0] }}
                  </p>
                </div>
              </div>

              <!-- Lokasi / Ruangan & Status Event (Sejajar & Seimbang) -->
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <div class="sm:col-span-7">
                  <label class="mb-1.5 block text-xs font-semibold text-highlighted">
                    Lokasi / Ruangan
                  </label>
                  <input
                    v-model="form.lokasi"
                    type="text"
                    placeholder="Contoh: Ruang Meeting Lt. 2 / Area Lapangan"
                    :class="formControlClass"
                  />
                  <p v-if="formErrors.lokasi" class="mt-1 text-xs text-rose-500">
                    {{ formErrors.lokasi[0] }}
                  </p>
                </div>

                <div class="sm:col-span-5">
                  <label class="mb-1.5 block text-xs font-semibold text-highlighted">
                    Status Event
                  </label>
                  <select
                    v-model="form.status"
                    :class="formControlClass"
                  >
                    <option value="aktif">Aktif (Sesuai Jadwal)</option>
                    <option value="nonaktif">Nonaktif (Tutup Sementara)</option>
                  </select>
                </div>
              </div>

              <!-- Reminder WhatsApp (Nova Agent) Card -->
              <div class="rounded-xl border border-default bg-muted/20 p-3.5">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <label class="flex items-center gap-1.5 text-xs font-semibold text-highlighted">
                    <UIcon name="i-lucide-bell-ring" class="size-3.5 text-primary" />
                    <span>Reminder WhatsApp (Nova Agent)</span>
                  </label>
                  <span
                    class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    :class="
                      form.participant_niks.length > 0
                        ? 'bg-emerald-500/15 text-emerald-700'
                        : 'bg-muted text-muted'
                    "
                  >
                    {{ form.participant_niks.length > 0 ? 'Aktif untuk peserta terpilih' : 'Aktif otomatis jika peserta dipilih' }}
                  </span>
                </div>

                <div class="mt-2.5 flex flex-wrap items-center gap-2">
                  <input
                    v-model.number="form.reminder_value"
                    type="number"
                    min="1"
                    max="168"
                    class="w-20 rounded-md border border-default bg-default px-3 py-1.5 text-sm font-medium text-highlighted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <select
                    v-model="form.reminder_unit"
                    class="min-w-[160px] flex-1 rounded-md border border-default bg-default px-3 py-1.5 text-sm text-highlighted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="minutes">Menit sebelum acara</option>
                    <option value="hours">Jam sebelum acara</option>
                  </select>

                  <div class="flex flex-wrap items-center gap-1.5">
                    <button
                      v-for="preset in reminderPresets"
                      :key="preset.label"
                      type="button"
                      class="rounded-md border px-2.5 py-1.5 text-xs font-medium transition"
                      :class="
                        isPresetActive(preset)
                          ? 'border-primary bg-primary text-white shadow-xs'
                          : 'border-default bg-default text-muted hover:border-primary/40 hover:text-highlighted'
                      "
                      @click="applyReminderPreset(preset)"
                    >
                      {{ preset.label }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Slug Custom -->
              <div>
                <label class="mb-1.5 block text-xs font-semibold text-highlighted">
                  Slug Link Publik <span class="text-rose-500">*</span>
                </label>
                <div class="flex items-stretch overflow-hidden rounded-md border border-default bg-default focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                  <span class="flex shrink-0 select-none items-center whitespace-nowrap border-r border-default bg-muted/40 px-3 font-mono text-xs text-muted">
                    /absen-event/
                  </span>
                  <input
                    v-model="form.slug"
                    type="text"
                    placeholder="training-k3-agustus"
                    class="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-sm text-highlighted focus:outline-none"
                    required
                  />
                </div>
                <p class="mt-1 truncate text-[11px] text-muted">
                  URL Link: <span class="font-mono text-primary">{{ publicBaseUrl }}{{ form.slug || 'slug-event' }}</span>
                </p>
                <p v-if="formErrors.slug" class="mt-1 text-xs text-rose-500">
                  {{ formErrors.slug[0] }}
                </p>
              </div>

              <!-- Deskripsi -->
              <div>
                <label class="mb-1.5 block text-xs font-semibold text-highlighted">
                  Deskripsi / Keterangan <span class="font-normal text-muted">(Opsional)</span>
                </label>
                <textarea
                  v-model="form.deskripsi"
                  rows="2"
                  placeholder="Catatan tambahan mengenai instruksi acara..."
                  :class="formControlClass"
                ></textarea>
              </div>
            </div>

            <!-- Right Column: Pilih Peserta Karyawan (Opsional) -->
            <div class="flex flex-col rounded-xl border border-default bg-muted/15 p-4 lg:col-span-5">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <label class="block text-xs font-semibold text-highlighted">
                    Peserta Karyawan <span class="font-normal text-muted">(Opsional)</span>
                  </label>
                  <p class="mt-0.5 text-[11px] leading-relaxed text-muted">
                    Kosongkan agar terbuka untuk semua karyawan. Jika diisi, hanya peserta terpilih yang bisa absen &amp; menerima WA undangan + reminder.
                  </p>
                </div>
                <UBadge
                  :color="form.participant_niks.length > 0 ? 'primary' : 'neutral'"
                  variant="subtle"
                  class="shrink-0"
                  :label="`${form.participant_niks.length} Dipilih`"
                />
              </div>

              <!-- Selected Chips -->
              <div
                v-if="selectedEmployeeObjects.length > 0"
                class="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-2"
              >
                <div class="mb-1.5 flex items-center justify-between">
                  <span class="text-[11px] font-semibold text-primary">
                    Peserta Terpilih ({{ selectedEmployeeObjects.length }})
                  </span>
                  <button
                    type="button"
                    class="text-[11px] font-medium text-rose-600 hover:underline"
                    @click="clearSelectedParticipants"
                  >
                    Bersihkan Semua
                  </button>
                </div>
                <div class="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
                  <span
                    v-for="emp in selectedEmployeeObjects"
                    :key="emp.nik"
                    class="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-default px-2 py-0.5 text-[11px] font-medium text-highlighted"
                  >
                    <span class="max-w-[140px] truncate">{{ emp.nama_karyawan }}</span>
                    <button
                      type="button"
                      class="rounded-full p-0.5 text-muted hover:bg-muted hover:text-highlighted"
                      @click="toggleParticipant(emp.nik)"
                    >
                      <UIcon name="i-lucide-x" class="size-3" />
                    </button>
                  </span>
                </div>
              </div>

              <!-- Search & Divisi Filter -->
              <div class="mt-3 space-y-2">
                <div class="relative">
                  <UIcon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted" />
                  <input
                    v-model="employeeSearch"
                    type="text"
                    placeholder="Cari NIK, nama, jabatan, atau divisi..."
                    class="w-full rounded-md border border-default bg-default py-1.5 pl-8 pr-3 text-xs text-highlighted placeholder:text-muted focus:border-primary focus:outline-none"
                  />
                </div>

                <div class="flex items-center gap-2">
                  <select
                    v-model="employeeDivisiFilter"
                    class="min-w-0 flex-1 rounded-md border border-default bg-default px-2.5 py-1.5 text-xs text-highlighted focus:border-primary focus:outline-none"
                  >
                    <option value="">Semua Divisi</option>
                    <option v-for="div in availableDivisions" :key="div" :value="div">
                      {{ div }}
                    </option>
                  </select>

                  <UButton
                    color="neutral"
                    variant="outline"
                    size="xs"
                    type="button"
                    label="Pilih Semua"
                    class="shrink-0"
                    :disabled="!filteredEmployeeOptions.length"
                    @click="selectAllFilteredEmployees"
                  />
                </div>
              </div>

              <!-- Employee Checkbox List -->
              <div class="mt-3 flex-1 min-h-[220px] max-h-[340px] overflow-y-auto rounded-lg border border-default bg-default divide-y divide-default">
                <div v-if="loadingEmployees" class="px-3 py-8 text-center text-xs text-muted">
                  Memuat daftar karyawan...
                </div>
                <div v-else-if="!filteredEmployeeOptions.length" class="px-3 py-8 text-center text-xs text-muted">
                  Tidak ada karyawan yang cocok dengan pencarian.
                </div>
                <label
                  v-for="emp in filteredEmployeeOptions"
                  :key="emp.nik"
                  class="flex cursor-pointer items-center justify-between gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-muted/30"
                  :class="form.participant_niks.includes(emp.nik) ? 'bg-primary/5' : ''"
                >
                  <div class="flex min-w-0 items-center gap-2.5">
                    <input
                      type="checkbox"
                      :checked="form.participant_niks.includes(emp.nik)"
                      class="size-4 shrink-0 rounded border-default text-primary focus:ring-primary"
                      @change="toggleParticipant(emp.nik)"
                    />
                    <div class="min-w-0">
                      <div class="truncate font-medium text-highlighted">
                        {{ emp.nama_karyawan }}
                      </div>
                      <div class="truncate text-[11px] text-muted">
                        <span class="font-mono">{{ emp.nik }}</span> • {{ emp.jabatan || emp.divisi || '-' }}
                      </div>
                    </div>
                  </div>
                  <span
                    v-if="!emp.has_phone"
                    class="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600"
                  >
                    No. HP -
                  </span>
                </label>
              </div>
              <p v-if="formErrors.participant_niks" class="mt-1.5 text-xs text-rose-500">
                {{ formErrors.participant_niks[0] }}
              </p>
            </div>
          </div>
          </div>

          <!-- Sticky Modal Footer -->
          <div class="flex items-center justify-between gap-3 border-t border-default bg-muted/15 px-6 py-3.5">
            <p class="hidden text-xs text-muted sm:block">
              <template v-if="form.participant_niks.length > 0">
                Nova Agent akan mengirim undangan WA &amp; pengingat {{ formatReminderBadge(reminderMinutesTotal) }} ke <strong>{{ form.participant_niks.length }} peserta</strong>.
              </template>
              <template v-else>
                Absensi bersifat terbuka untuk seluruh karyawan HRIS.
              </template>
            </p>
            <div class="ml-auto flex items-center gap-2.5">
              <UButton
                color="neutral"
                variant="outline"
                type="button"
                label="Batal"
                @click="showFormModal = false"
              />
              <UButton
                color="primary"
                variant="solid"
                type="submit"
                :label="isEditing ? 'Simpan Perubahan' : 'Buat Event'"
                :loading="saving"
              />
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- QR Code Modal (Solid Nuxt UCard) -->
    <div
      v-if="showQrModal && selectedQrEvent"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60"
        aria-label="Tutup QR modal"
        @click="showQrModal = false"
      ></button>

      <UCard class="relative w-full max-w-sm overflow-hidden shadow-2xl text-center">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-highlighted">QR Code Absensi</h3>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="showQrModal = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <div>
            <p class="text-base font-semibold text-highlighted">
              {{ selectedQrEvent.nama_event }}
            </p>
            <p class="mt-1 text-xs text-muted">
              Scan QR Code ini menggunakan HP untuk melakukan absensi event.
            </p>
          </div>

          <div class="flex items-center justify-center py-2">
            <div class="rounded-2xl border border-default bg-white p-3 shadow-inner">
              <canvas ref="qrCanvasRef" class="mx-auto rounded-lg"></canvas>
            </div>
          </div>

          <div class="rounded-lg bg-muted/50 p-2.5 text-xs font-mono text-muted break-all">
            {{ publicBaseUrl }}{{ selectedQrEvent.slug }}
          </div>

          <div class="grid grid-cols-2 gap-2 pt-2">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-download"
              label="Unduh Gambar"
              class="w-full justify-center"
              @click="downloadQrCode"
            />
            <UButton
              color="primary"
              variant="solid"
              icon="i-lucide-printer"
              label="Cetak Poster"
              class="w-full justify-center"
              @click="printQrPoster"
            />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Participants Detail Modal / Drawer (Solid Nuxt UCard) -->
    <div
      v-if="showParticipantsModal && selectedDetailEvent"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60"
        aria-label="Tutup modal peserta"
        @click="showParticipantsModal = false"
      ></button>

      <UCard class="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden shadow-2xl">
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-base font-bold text-highlighted">
                  Daftar Peserta Hadir
                </h3>
                <UBadge
                  color="primary"
                  variant="subtle"
                  :label="`${participants.length} Hadir`"
                />
              </div>
              <p class="mt-0.5 text-xs text-muted">
                {{ selectedDetailEvent.nama_event }} ({{ formatDateTime(selectedDetailEvent.tanggal_mulai) }} - {{ formatDateTime(selectedDetailEvent.tanggal_selesai) }})
              </p>
            </div>

            <div class="flex items-center gap-2">
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-images"
                label="Download Foto (.zip)"
                :loading="downloadingPhotos"
                @click="downloadAllPhotos(selectedDetailEvent)"
              />
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-download"
                label="Export CSV"
                @click="downloadExport(selectedDetailEvent)"
              />
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-lucide-x"
                @click="showParticipantsModal = false"
              />
            </div>
          </div>
        </template>

        <div class="-mx-6 -my-4 flex flex-col">
          <!-- Search Bar & Optional Tabs -->
          <div class="flex flex-col gap-3 border-b border-default bg-muted/20 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="relative max-w-sm flex-1">
              <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
              <input
                v-model="participantSearch"
                type="text"
                placeholder="Cari NIK, nama, atau jabatan..."
                class="w-full rounded-md border border-default bg-default py-1.5 pl-9 pr-3 text-xs text-highlighted placeholder:text-muted focus:border-primary focus:outline-none"
              />
            </div>

            <div v-if="invitedParticipants.length > 0" class="inline-flex rounded-lg border border-default bg-default p-0.5 text-xs">
              <button
                type="button"
                class="rounded-md px-3 py-1 font-medium transition"
                :class="participantsTab === 'attended' ? 'bg-primary text-white' : 'text-muted hover:text-highlighted'"
                @click="participantsTab = 'attended'"
              >
                Sudah Hadir ({{ participants.length }})
              </button>
              <button
                type="button"
                class="rounded-md px-3 py-1 font-medium transition"
                :class="participantsTab === 'invited' ? 'bg-primary text-white' : 'text-muted hover:text-highlighted'"
                @click="participantsTab = 'invited'"
              >
                Daftar Undangan ({{ invitedParticipants.length }})
              </button>
            </div>
          </div>

          <!-- Participants Table Body -->
          <div class="max-h-[55vh] overflow-y-auto px-6 py-2">
            <div v-if="loadingParticipants" class="py-12 text-center text-muted">
              <div class="inline-flex items-center gap-2">
                <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" />
                <span>Memuat data peserta...</span>
              </div>
            </div>

            <!-- Tab: Daftar Undangan -->
            <template v-else-if="participantsTab === 'invited' && invitedParticipants.length > 0">
              <div v-if="!filteredInvitedParticipants.length" class="py-12 text-center text-muted">
                <p class="text-sm font-medium">Tidak ada peserta undangan yang cocok.</p>
              </div>
              <div v-else class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="border-b border-default bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted">
                    <tr>
                      <th class="px-4 py-3">NIK</th>
                      <th class="px-4 py-3">Nama Karyawan</th>
                      <th class="px-4 py-3">Jabatan &amp; Divisi</th>
                      <th class="px-4 py-3 text-center">Kehadiran</th>
                      <th class="px-4 py-3 text-center">WA Undangan</th>
                      <th class="px-4 py-3 text-center">WA Reminder</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-default">
                    <tr
                      v-for="inv in filteredInvitedParticipants"
                      :key="inv.id"
                      class="transition-colors hover:bg-muted/30"
                    >
                      <td class="px-4 py-2.5 font-mono font-bold text-highlighted">
                        {{ inv.nik_karyawan }}
                      </td>
                      <td class="px-4 py-2.5 font-medium text-highlighted">
                        {{ inv.nama_karyawan || '-' }}
                      </td>
                      <td class="px-4 py-2.5">
                        <div class="text-highlighted">{{ inv.jabatan || '-' }}</div>
                        <div class="text-[11px] text-muted">{{ inv.divisi || inv.departement || '-' }}</div>
                      </td>
                      <td class="px-4 py-2.5 text-center">
                        <UBadge
                          :color="inv.attended ? 'emerald' : 'neutral'"
                          variant="subtle"
                          :label="inv.attended ? 'Hadir' : 'Belum Hadir'"
                        />
                      </td>
                      <td class="px-4 py-2.5 text-center">
                        <UBadge
                          v-if="!inv.has_phone"
                          color="warning"
                          variant="subtle"
                          label="Tanpa No. HP"
                        />
                        <UBadge
                          v-else
                          :color="inv.initial_notified_at ? 'emerald' : 'neutral'"
                          variant="subtle"
                          :label="inv.initial_notified_at ? 'Terkirim' : 'Menunggu'"
                        />
                      </td>
                      <td class="px-4 py-2.5 text-center">
                        <UBadge
                          v-if="!inv.has_phone"
                          color="warning"
                          variant="subtle"
                          label="-"
                        />
                        <UBadge
                          v-else
                          :color="inv.reminder_sent_at ? 'emerald' : 'neutral'"
                          variant="subtle"
                          :label="inv.reminder_sent_at ? 'Terkirim' : 'Terjadwal'"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>

            <div v-else-if="!filteredParticipants.length" class="py-12 text-center text-muted">
              <UIcon name="i-lucide-user-x" class="mx-auto size-8 text-muted" />
              <p class="mt-2 text-sm font-medium">Belum ada peserta yang melakukan absensi.</p>
            </div>

            <div v-else class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="border-b border-default bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  <tr>
                    <th class="px-4 py-3">Foto Selfie</th>
                    <th class="px-4 py-3">NIK</th>
                    <th class="px-4 py-3">Nama Karyawan</th>
                    <th class="px-4 py-3">Jabatan & Divisi</th>
                    <th class="px-4 py-3">Waktu Absen</th>
                    <th class="px-4 py-3">Device / IP</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-default">
                  <tr
                    v-for="att in filteredParticipants"
                    :key="att.id"
                    class="transition-colors hover:bg-muted/30"
                  >
                    <!-- Photo Thumbnail -->
                    <td class="px-4 py-2.5">
                      <button
                        v-if="att.foto_url"
                        type="button"
                        class="group relative size-12 overflow-hidden rounded-xl border border-default bg-muted shadow-xs transition-transform hover:scale-105"
                        @click="selectedPhotoPreview = att"
                      >
                        <SecureImage
                          :src="att.foto_url"
                          alt="Foto Selfie"
                          class="size-full object-cover"
                        />
                        <div class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <UIcon name="i-lucide-zoom-in" class="size-5 text-white" />
                        </div>
                      </button>
                      <span v-else class="text-muted">-</span>
                    </td>

                    <!-- NIK -->
                    <td class="px-4 py-2.5 font-mono font-bold text-highlighted">
                      {{ att.nik_karyawan }}
                    </td>

                    <!-- Nama -->
                    <td class="px-4 py-2.5 font-medium text-highlighted">
                      {{ att.karyawan?.nama_karyawan || '-' }}
                    </td>

                    <!-- Jabatan / Divisi -->
                    <td class="px-4 py-2.5">
                      <div class="text-highlighted">{{ att.karyawan?.jabatan || '-' }}</div>
                      <div class="text-[11px] text-muted">{{ att.karyawan?.divisi || '-' }}</div>
                    </td>

                    <!-- Waktu Absen -->
                    <td class="px-4 py-2.5 text-highlighted">
                      <div class="font-medium">{{ formatDateTime(att.jam_absen) }}</div>
                    </td>

                    <!-- Device / IP -->
                    <td class="px-4 py-2.5">
                      <div class="font-mono text-[11px] text-muted">{{ att.ip_address || '-' }}</div>
                      <div class="line-clamp-1 max-w-[140px] text-[10px] text-muted" :title="att.user_agent">
                        {{ att.user_agent || '-' }}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex items-center justify-end">
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              label="Tutup"
              @click="showParticipantsModal = false"
            />
          </div>
        </template>
      </UCard>
    </div>

    <!-- Photo Zoom Modal (Solid Nuxt UCard) -->
    <div
      v-if="selectedPhotoPreview"
      class="fixed inset-0 z-60 flex items-center justify-center p-4"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/80"
        aria-label="Tutup preview foto"
        @click="selectedPhotoPreview = null"
      ></button>

      <UCard class="relative max-w-md w-full overflow-hidden shadow-2xl">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="min-w-0 flex-1">
              <p class="font-bold text-highlighted truncate">
                {{ selectedPhotoPreview.karyawan?.nama_karyawan || selectedPhotoPreview.nik_karyawan }}
              </p>
              <p class="text-xs text-muted">
                NIK: {{ selectedPhotoPreview.nik_karyawan }} • {{ formatDateTime(selectedPhotoPreview.jam_absen) }}
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="selectedPhotoPreview = null"
            />
          </div>
        </template>

        <div class="overflow-hidden rounded-xl bg-black flex items-center justify-center">
          <SecureImage
            :src="selectedPhotoPreview.foto_url"
            alt="Foto Selfie Peserta"
            class="max-h-[65vh] w-full object-contain"
          />
        </div>
      </UCard>
    </div>
  </section>
</template>
