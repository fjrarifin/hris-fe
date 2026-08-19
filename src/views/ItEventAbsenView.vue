<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import QRCode from 'qrcode'
import {
  createEventAbsen,
  deleteEventAbsen,
  exportEventAbsenParticipants,
  getEventAbsenDetail,
  getEventAbsenExportUrl,
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
  slug: '',
  tanggal_mulai: '',
  tanggal_selesai: '',
  status: 'aktif',
})
const formErrors = reactive({})

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
const participantSearch = ref('')
const selectedPhotoPreview = ref(null)

const publicBaseUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/absen-event/`
  }
  return '/absen-event/'
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

function formatDateTimeInput(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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

function openCreateModal() {
  isEditing.value = false
  editingId.value = null
  Object.assign(form, {
    nama_event: '',
    deskripsi: '',
    slug: '',
    tanggal_mulai: formatDateTimeInput(new Date()),
    tanggal_selesai: formatDateTimeInput(new Date(Date.now() + 8 * 3600 * 1000)), // default +8 hours
    status: 'aktif',
  })
  Object.keys(formErrors).forEach((k) => delete formErrors[k])
  showFormModal.value = true
}

function openEditModal(item) {
  isEditing.value = true
  editingId.value = item.id
  Object.assign(form, {
    nama_event: item.nama_event,
    deskripsi: item.deskripsi || '',
    slug: item.slug,
    tanggal_mulai: formatDateTimeInput(item.tanggal_mulai),
    tanggal_selesai: formatDateTimeInput(item.tanggal_selesai),
    status: item.status || 'aktif',
  })
  Object.keys(formErrors).forEach((k) => delete formErrors[k])
  showFormModal.value = true
}

async function saveEvent() {
  Object.keys(formErrors).forEach((k) => delete formErrors[k])
  saving.value = true

  const payload = {
    nama_event: form.nama_event,
    deskripsi: form.deskripsi,
    slug: form.slug ? generateSlug(form.slug) : undefined,
    tanggal_mulai: form.tanggal_mulai,
    tanggal_selesai: form.tanggal_selesai,
    status: form.status,
  }

  try {
    if (isEditing.value) {
      await updateEventAbsen(editingId.value, payload)
      notifier.success('Event absensi berhasil diperbarui.')
    } else {
      await createEventAbsen(payload)
      notifier.success('Event absensi baru berhasil dibuat.')
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
        width: 280,
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
  showParticipantsModal.value = true
  loadingParticipants.value = true
  try {
    const { data } = await getEventAbsenDetail(item.id)
    selectedDetailEvent.value = data.data
    participants.value = data.participants || []
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

function getStatusBadge(item) {
  const status = item.effective_status
  if (status === 'aktif') {
    return {
      label: 'Aktif',
      color: 'emerald',
      bgClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    }
  }
  if (status === 'kadaluarsa') {
    return {
      label: 'Selesai',
      color: 'neutral',
      bgClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    }
  }
  if (status === 'mendatang') {
    return {
      label: 'Mendatang',
      color: 'primary',
      bgClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    }
  }
  return {
    label: 'Nonaktif',
    color: 'error',
    bgClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  }
}

onMounted(() => {
  loadEvents()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header Section -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Absensi Event & Non-Kerja
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Kelola public link absensi untuk kegiatan workshop, training K3, gathering, dan acara temporal lainnya.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :loading="loading"
          @click="loadEvents(pagination.current_page)"
        >
          Muat Ulang
        </UButton>
        <UButton
          color="primary"
          icon="i-lucide-plus"
          @click="openCreateModal"
        >
          Buat Event Absen
        </UButton>
      </div>
    </div>

    <!-- Summary Statistics KPI Cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Event
            </p>
            <p class="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {{ summary.total_events || 0 }}
            </p>
          </div>
          <div class="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <span class="i-lucide-calendar text-xl"></span>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Event Aktif Berjalan
            </p>
            <p class="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {{ summary.active_events || 0 }}
            </p>
          </div>
          <div class="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <span class="i-lucide-radio text-xl"></span>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Kehadiran Peserta
            </p>
            <p class="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {{ summary.total_attendances || 0 }}
            </p>
          </div>
          <div class="flex size-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <span class="i-lucide-users text-xl"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div class="relative flex-1 max-w-md">
          <span class="i-lucide-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></span>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Cari nama event, deskripsi, atau slug..."
            class="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            @keyup.enter="loadEvents(1)"
          />
        </div>

        <select
          v-model="filters.status"
          class="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          @change="loadEvents(1)"
        >
          <option value="">Semua Status</option>
          <option value="aktif">Aktif</option>
          <option value="kadaluarsa">Selesai / Kadaluarsa</option>
          <option value="nonaktif">Nonaktif</option>
        </select>

        <UButton
          color="neutral"
          variant="soft"
          size="sm"
          @click="loadEvents(1)"
        >
          Filter
        </UButton>
      </div>
    </div>

    <!-- Events List Table -->
    <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead class="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th class="px-5 py-3.5">Nama Event & Deskripsi</th>
              <th class="px-5 py-3.5">Public Link</th>
              <th class="px-5 py-3.5">Periode Waktu</th>
              <th class="px-5 py-3.5 text-center">Status</th>
              <th class="px-5 py-3.5 text-center">Peserta Hadir</th>
              <th class="px-5 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
            <tr v-if="loading && !events.length">
              <td colspan="6" class="px-5 py-12 text-center text-slate-400">
                <div class="inline-flex items-center gap-2">
                  <span class="i-lucide-loader-2 size-5 animate-spin"></span>
                  <span>Memuat daftar event...</span>
                </div>
              </td>
            </tr>

            <tr v-else-if="!events.length">
              <td colspan="6" class="px-5 py-12 text-center text-slate-400">
                <div class="flex flex-col items-center justify-center gap-2">
                  <span class="i-lucide-calendar-x size-8 text-slate-300"></span>
                  <p class="font-medium text-slate-600 dark:text-slate-300">Belum ada event absensi</p>
                  <p class="text-xs text-slate-400">Klik tombol "Buat Event Absen" di atas untuk membuat public link baru.</p>
                </div>
              </td>
            </tr>

            <tr
              v-for="item in events"
              :key="item.id"
              class="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
            >
              <!-- Event Name & Desc -->
              <td class="px-5 py-4">
                <div class="font-semibold text-slate-900 dark:text-white">
                  {{ item.nama_event }}
                </div>
                <div v-if="item.deskripsi" class="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                  {{ item.deskripsi }}
                </div>
                <div class="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                  <span class="i-lucide-user size-3"></span>
                  <span>{{ item.creator?.name || 'Admin' }}</span>
                  <span>•</span>
                  <span>{{ formatDateTime(item.created_at) }}</span>
                </div>
              </td>

              <!-- Public Link -->
              <td class="px-5 py-4">
                <div class="flex items-center gap-2">
                  <span class="inline-block max-w-[180px] truncate font-mono text-xs text-slate-600 dark:text-slate-400">
                    /absen-event/{{ item.slug }}
                  </span>
                  <button
                    type="button"
                    title="Salin Link"
                    class="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    @click="copyPublicLink(item.slug)"
                  >
                    <span class="i-lucide-copy size-4"></span>
                  </button>
                  <button
                    type="button"
                    title="Buka QR Code"
                    class="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-slate-800 dark:hover:text-primary-400"
                    @click="openQrModal(item)"
                  >
                    <span class="i-lucide-qr-code size-4"></span>
                  </button>
                </div>
              </td>

              <!-- Periode -->
              <td class="px-5 py-4">
                <div class="text-xs font-medium text-slate-700 dark:text-slate-200">
                  {{ formatDateTime(item.tanggal_mulai) }}
                </div>
                <div class="text-[11px] text-slate-400">
                  s/d {{ formatDateTime(item.tanggal_selesai) }}
                </div>
              </td>

              <!-- Status Badge -->
              <td class="px-5 py-4 text-center">
                <span
                  class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
                  :class="getStatusBadge(item).bgClass"
                >
                  {{ getStatusBadge(item).label }}
                </span>
              </td>

              <!-- Total Attendances -->
              <td class="px-5 py-4 text-center">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                  @click="openParticipantsModal(item)"
                >
                  <span class="i-lucide-users size-3.5"></span>
                  <span>{{ item.absensi_events_count || 0 }} Peserta</span>
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
      <div v-if="pagination.last_page > 1" class="flex items-center justify-between border-t border-slate-200 px-5 py-3 dark:border-slate-800">
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Menampilkan halaman {{ pagination.current_page }} dari {{ pagination.last_page }} (Total {{ pagination.total }} event)
        </p>
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            :disabled="pagination.current_page <= 1"
            @click="loadEvents(pagination.current_page - 1)"
          >
            Sebelumnya
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            :disabled="pagination.current_page >= pagination.last_page"
            @click="loadEvents(pagination.current_page + 1)"
          >
            Berikutnya
          </UButton>
        </div>
      </div>
    </div>

    <!-- Create / Edit Event Modal -->
    <div
      v-if="showFormModal"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">
              {{ isEditing ? 'Edit Event Absensi' : 'Buat Event Absensi Baru' }}
            </h3>
            <p class="text-xs text-slate-500">
              Isi data detail event untuk membuat link absensi publik karyawan.
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            @click="showFormModal = false"
          >
            <span class="i-lucide-x size-5"></span>
          </button>
        </div>

        <form class="mt-4 space-y-4" @submit.prevent="saveEvent">
          <!-- Nama Event -->
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
              Nama Event / Acara <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="form.nama_event"
              type="text"
              placeholder="Contoh: Training K3 Pabrik - 20 Agustus 2026"
              class="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              required
              @input="handleNameInput"
            />
            <p v-if="formErrors.nama_event" class="mt-1 text-xs text-rose-500">
              {{ formErrors.nama_event[0] }}
            </p>
          </div>

          <!-- Deskripsi -->
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
              Deskripsi / Keterangan (Opsional)
            </label>
            <textarea
              v-model="form.deskripsi"
              rows="2"
              placeholder="Catatan tambahan mengenai lokasi atau instruksi event..."
              class="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            ></textarea>
          </div>

          <!-- Slug Custom -->
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
              Slug Link Publik <span class="text-rose-500">*</span>
            </label>
            <div class="mt-1.5 flex rounded-xl border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
              <span class="flex select-none items-center pl-3 text-xs text-slate-400">
                /absen-event/
              </span>
              <input
                v-model="form.slug"
                type="text"
                placeholder="training-k3-agustus"
                class="w-full bg-transparent px-2 py-2 text-sm font-mono text-slate-900 focus:outline-none dark:text-white"
                required
              />
            </div>
            <p class="mt-1 text-[11px] text-slate-400">
              URL Link: <span class="font-mono text-primary-600 dark:text-primary-400">{{ publicBaseUrl }}{{ form.slug || 'slug-event' }}</span>
            </p>
            <p v-if="formErrors.slug" class="mt-1 text-xs text-rose-500">
              {{ formErrors.slug[0] }}
            </p>
          </div>

          <!-- Waktu Mulai & Selesai -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
                Tanggal & Jam Mulai <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="form.tanggal_mulai"
                type="datetime-local"
                class="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
              <p v-if="formErrors.tanggal_mulai" class="mt-1 text-xs text-rose-500">
                {{ formErrors.tanggal_mulai[0] }}
              </p>
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
                Tanggal & Jam Selesai <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="form.tanggal_selesai"
                type="datetime-local"
                class="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
              <p v-if="formErrors.tanggal_selesai" class="mt-1 text-xs text-rose-500">
                {{ formErrors.tanggal_selesai[0] }}
              </p>
            </div>
          </div>

          <!-- Status -->
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
              Status Event
            </label>
            <select
              v-model="form.status"
              class="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="aktif">Aktif (Bisa Diabsen Sesuai Jadwal)</option>
              <option value="nonaktif">Nonaktif (Tutup / Kunci Absen Sementara)</option>
            </select>
          </div>

          <!-- Footer Buttons -->
          <div class="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <UButton
              color="neutral"
              variant="outline"
              type="button"
              @click="showFormModal = false"
            >
              Batal
            </UButton>
            <UButton
              color="primary"
              type="submit"
              :loading="saving"
            >
              {{ isEditing ? 'Simpan Perubahan' : 'Buat Event' }}
            </UButton>
          </div>
        </form>
      </div>
    </div>

    <!-- QR Code Modal -->
    <div
      v-if="showQrModal && selectedQrEvent"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center justify-between pb-3">
          <h3 class="font-bold text-slate-900 dark:text-white">QR Code Absensi</h3>
          <button
            type="button"
            class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            @click="showQrModal = false"
          >
            <span class="i-lucide-x size-5"></span>
          </button>
        </div>

        <div class="mt-2">
          <p class="text-base font-semibold text-slate-900 dark:text-white">
            {{ selectedQrEvent.nama_event }}
          </p>
          <p class="mt-1 text-xs text-slate-500">
            Scan QR Code ini menggunakan HP untuk melakukan absensi event.
          </p>

          <div class="my-5 flex items-center justify-center">
            <div class="rounded-2xl border-2 border-slate-100 bg-white p-3 shadow-inner dark:border-slate-700">
              <canvas ref="qrCanvasRef" class="mx-auto rounded-lg"></canvas>
            </div>
          </div>

          <div class="rounded-xl bg-slate-50 p-2.5 text-xs font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {{ publicBaseUrl }}{{ selectedQrEvent.slug }}
          </div>

          <div class="mt-5 grid grid-cols-2 gap-2">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-download"
              class="w-full justify-center"
              @click="downloadQrCode"
            >
              Unduh Gambar
            </UButton>
            <UButton
              color="primary"
              icon="i-lucide-printer"
              class="w-full justify-center"
              @click="printQrPoster"
            >
              Cetak Poster
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Participants Detail Modal / Drawer -->
    <div
      v-if="showParticipantsModal && selectedDetailEvent"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs"
    >
      <div class="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">
                Daftar Peserta Hadir
              </h3>
              <span class="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                {{ participants.length }} Hadir
              </span>
            </div>
            <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {{ selectedDetailEvent.nama_event }} ({{ formatDateTime(selectedDetailEvent.tanggal_mulai) }} - {{ formatDateTime(selectedDetailEvent.tanggal_selesai) }})
            </p>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-lucide-download"
              @click="downloadExport(selectedDetailEvent)"
            >
              Export CSV
            </UButton>
            <button
              type="button"
              class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              @click="showParticipantsModal = false"
            >
              <span class="i-lucide-x size-5"></span>
            </button>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="border-b border-slate-200 bg-slate-50/60 px-6 py-3 dark:border-slate-800 dark:bg-slate-800/40">
          <div class="relative max-w-sm">
            <span class="i-lucide-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></span>
            <input
              v-model="participantSearch"
              type="text"
              placeholder="Cari NIK, nama, atau jabatan..."
              class="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <!-- Participants Table Body -->
        <div class="flex-1 overflow-y-auto p-6">
          <div v-if="loadingParticipants" class="py-12 text-center text-slate-400">
            <div class="inline-flex items-center gap-2">
              <span class="i-lucide-loader-2 size-5 animate-spin"></span>
              <span>Memuat data peserta...</span>
            </div>
          </div>

          <div v-else-if="!filteredParticipants.length" class="py-12 text-center text-slate-400">
            <span class="i-lucide-user-x mx-auto size-8 text-slate-300"></span>
            <p class="mt-2 text-sm font-medium">Belum ada peserta yang melakukan absensi.</p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead class="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th class="px-4 py-3">Foto Selfie</th>
                  <th class="px-4 py-3">NIK</th>
                  <th class="px-4 py-3">Nama Karyawan</th>
                  <th class="px-4 py-3">Jabatan & Divisi</th>
                  <th class="px-4 py-3">Waktu Absen</th>
                  <th class="px-4 py-3">Device / IP</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr
                  v-for="att in filteredParticipants"
                  :key="att.id"
                  class="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                >
                  <!-- Photo Thumbnail -->
                  <td class="px-4 py-2.5">
                    <button
                      v-if="att.foto_url"
                      type="button"
                      class="group relative size-11 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-xs transition-transform hover:scale-105 dark:border-slate-700"
                      @click="selectedPhotoPreview = att"
                    >
                      <img
                        :src="att.foto_url"
                        alt="Foto Selfie"
                        class="size-full object-cover"
                      />
                      <div class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <span class="i-lucide-zoom-in text-white"></span>
                      </div>
                    </button>
                    <span v-else class="text-slate-400">-</span>
                  </td>

                  <!-- NIK -->
                  <td class="px-4 py-2.5 font-mono font-bold text-slate-900 dark:text-white">
                    {{ att.nik_karyawan }}
                  </td>

                  <!-- Nama -->
                  <td class="px-4 py-2.5 font-medium text-slate-900 dark:text-white">
                    {{ att.karyawan?.nama_karyawan || '-' }}
                  </td>

                  <!-- Jabatan / Divisi -->
                  <td class="px-4 py-2.5">
                    <div class="text-slate-700 dark:text-slate-300">{{ att.karyawan?.jabatan || '-' }}</div>
                    <div class="text-[11px] text-slate-400">{{ att.karyawan?.divisi || '-' }}</div>
                  </td>

                  <!-- Waktu Absen -->
                  <td class="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                    <div class="font-medium">{{ formatDateTime(att.jam_absen) }}</div>
                  </td>

                  <!-- Device / IP -->
                  <td class="px-4 py-2.5">
                    <div class="font-mono text-[11px] text-slate-600 dark:text-slate-400">{{ att.ip_address || '-' }}</div>
                    <div class="line-clamp-1 max-w-[140px] text-[10px] text-slate-400" :title="att.user_agent">
                      {{ att.user_agent || '-' }}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="flex items-center justify-end border-t border-slate-200 px-6 py-3 dark:border-slate-800">
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            @click="showParticipantsModal = false"
          >
            Tutup
          </UButton>
        </div>
      </div>
    </div>

    <!-- Photo Zoom Modal -->
    <div
      v-if="selectedPhotoPreview"
      class="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
      @click.self="selectedPhotoPreview = null"
    >
      <div class="relative max-w-md overflow-hidden rounded-3xl bg-white p-4 shadow-2xl dark:bg-slate-900">
        <button
          type="button"
          class="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-slate-900/60 text-white backdrop-blur-xs transition-colors hover:bg-slate-900"
          @click="selectedPhotoPreview = null"
        >
          <span class="i-lucide-x size-4"></span>
        </button>

        <div class="overflow-hidden rounded-2xl bg-black">
          <img
            :src="selectedPhotoPreview.foto_url"
            alt="Foto Selfie Peserta"
            class="max-h-[65vh] w-full object-contain"
          />
        </div>

        <div class="mt-3 text-center">
          <p class="font-bold text-slate-900 dark:text-white">
            {{ selectedPhotoPreview.karyawan?.nama_karyawan || selectedPhotoPreview.nik_karyawan }}
          </p>
          <p class="text-xs text-slate-500">
            NIK: {{ selectedPhotoPreview.nik_karyawan }} • {{ formatDateTime(selectedPhotoPreview.jam_absen) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
