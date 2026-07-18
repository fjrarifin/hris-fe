<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { getHrVacancies, createHrVacancy, updateHrVacancy, deleteHrVacancy, getHrVacancyFavorites } from '../services/hrService'
import { getEmployees } from '../services/employeeService'
import { apiError } from '../utils/formatters'
import { askConfirmation } from '../utils/confirmDialog'
import api from '../services/api'

const records = ref([])
const favorites = ref([])
const employeesList = ref([])
const search = ref('')
const message = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)
const isLoading = ref(true)

// Modal form state
const showModal = ref(false)
const isEditMode = ref(false)
const currentEditId = ref(null)

const form = reactive({
  title: '',
  division: '',
  department: '',
  unit: '',
  position: '',
  supervisor_nik: '',
  supervisor_name: '',
  description: '',
  employment_type: '',
  workplace_type: '',
  location: '',
  responsibilities: '',
  requirements: '',
  benefits: '',
  published_at: '',
  expires_at: '',
  application_deadline: '',
  status: 'draft',
})

// Autocomplete supervisor
const supervisorSearch = ref('')
const showSupervisorDropdown = ref(false)

// Master data organisasi flat
const masterDivisions = ref([])
const masterDepartments = ref([])
const masterUnits = ref([])
const masterPositions = ref([])

const formControlClass =
  'w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50'

const filteredRecords = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return records.value
    .filter((record) => {
      return (
        record.title.toLowerCase().includes(keyword) ||
        (record.division || '').toLowerCase().includes(keyword) ||
        (record.department || '').toLowerCase().includes(keyword) ||
        (record.unit || '').toLowerCase().includes(keyword) ||
        (record.position || '').toLowerCase().includes(keyword) ||
        (record.supervisor_name || '').toLowerCase().includes(keyword) ||
        (record.description || '').toLowerCase().includes(keyword)
      )
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
})

// Cascading computed options berdasarkan list karyawan aktif untuk mengunci relasi
const divisionOptions = computed(() => {
  if (masterDivisions.value.length > 0) return masterDivisions.value
  return [...new Set(employeesList.value.map(e => e.divisi).filter(Boolean))].sort()
})

const departmentOptions = computed(() => {
  const linkedDepts = [...new Set(
    employeesList.value
      .filter(e => e.divisi === form.division)
      .map(e => e.departement)
      .filter(Boolean)
  )]
  if (linkedDepts.length > 0) return linkedDepts.sort()
  return masterDepartments.value.sort()
})

const unitOptions = computed(() => {
  const linkedUnits = [...new Set(
    employeesList.value
      .filter(e => e.divisi === form.division && e.departement === form.department)
      .map(e => e.unit)
      .filter(Boolean)
  )]
  if (linkedUnits.length > 0) return linkedUnits.sort()
  return masterUnits.value.sort()
})

const positionOptions = computed(() => {
  const linkedPositions = [...new Set(
    employeesList.value
      .filter(e => e.divisi === form.division && e.departement === form.department && e.unit === form.unit)
      .map(e => e.posisi_title)
      .filter(Boolean)
  )]
  if (linkedPositions.length > 0) return linkedPositions.sort()
  return masterPositions.value.sort()
})

const supervisorSuggestions = computed(() => {
  const keyword = supervisorSearch.value.trim().toLowerCase()
  return employeesList.value
    .filter(e => e.status === 'AKTIF')
    .filter(e => {
      return e.name.toLowerCase().includes(keyword) || e.nik.toLowerCase().includes(keyword)
    })
    .slice(0, 10)
})

async function load() {
  isLoading.value = true
  try {
    const [vacanciesResponse, favsResponse, employeesResponse] = await Promise.all([
      getHrVacancies(),
      getHrVacancyFavorites(),
      getEmployees(),
    ])
    records.value = vacanciesResponse.data
    favorites.value = favsResponse.data
    employeesList.value = employeesResponse.data.data || []
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    isLoading.value = false
  }
}

async function loadMasterOrgs() {
  try {
    const [divs, depts, unts, posts] = await Promise.all([
      api.get('/hr/master-orgs/divisions'),
      api.get('/hr/master-orgs/departments'),
      api.get('/hr/master-orgs/units'),
      api.get('/hr/master-orgs/positions'),
    ])
    masterDivisions.value = divs.data.filter(d => d.is_active).map(d => d.name)
    masterDepartments.value = depts.data.filter(d => d.is_active).map(d => d.name)
    masterUnits.value = unts.data.filter(d => d.is_active).map(d => d.name)
    masterPositions.value = posts.data.filter(d => d.is_active).map(d => d.name)
  } catch (error) {
    console.error('Gagal mengambil master organisasi:', error)
  }
}

function resetForm() {
  Object.assign(form, {
    title: '',
    division: '',
    department: '',
    unit: '',
    position: '',
    supervisor_nik: '',
    supervisor_name: '',
    description: '',
    employment_type: '',
    workplace_type: '',
    location: '',
    responsibilities: '',
    requirements: '',
    benefits: '',
    published_at: '',
    expires_at: '',
    application_deadline: '',
    status: 'draft',
  })
  supervisorSearch.value = ''
}

function openCreate() {
  isEditMode.value = false
  currentEditId.value = null
  resetForm()
  showModal.value = true
}

function openEdit(record) {
  isEditMode.value = true
  currentEditId.value = record.id
  Object.assign(form, {
    title: record.title,
    division: record.division || '',
    department: record.department || '',
    unit: record.unit || '',
    position: record.position || '',
    supervisor_nik: record.supervisor_nik || '',
    supervisor_name: record.supervisor_name || '',
    description: record.description || '',
    employment_type: record.employment_type || '',
    workplace_type: record.workplace_type || '',
    location: record.location || '',
    responsibilities: record.responsibilities || '',
    requirements: record.requirements || '',
    benefits: record.benefits || '',
    published_at: record.published_at ? record.published_at.slice(0, 16) : '',
    expires_at: record.expires_at ? record.expires_at.slice(0, 16) : '',
    application_deadline: record.application_deadline ? record.application_deadline.slice(0, 10) : '',
    status: record.status,
  })
  supervisorSearch.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function handleSubmit() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    if (isEditMode.value) {
      const response = await updateHrVacancy(currentEditId.value, form)
      message.value = response.data.message || 'Lowongan berhasil diperbarui.'
    } else {
      const response = await createHrVacancy(form)
      message.value = response.data.message || 'Lowongan berhasil dibuat.'
    }
    closeModal()
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    isSubmitting.value = false
  }
}

async function deleteVacancy(record) {
  if (!(await askConfirmation({
    title: 'Hapus Lowongan',
    message: `Lowongan "${record.title}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`,
    confirmLabel: 'Hapus Lowongan',
    cancelLabel: 'Batal',
    color: 'error',
    variant: 'structured',
    warningTitle: 'Penting',
    warningMessage: 'Data lowongan yang sudah dihapus tidak dapat dipulihkan kembali. Pastikan lowongan ini memang tidak lagi dibutuhkan.',
  }))) return
  message.value = ''
  errorMessage.value = ''

  try {
    const response = await deleteHrVacancy(record.id)
    message.value = response.data.message || 'Lowongan berhasil dihapus.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  }
}

async function closeVacancy(record) {
  if (!(await askConfirmation({
    title: 'Tutup Lowongan',
    message: `Lowongan "${record.title}" akan berstatus CLOSED dan tidak lagi tampil atau menerima lamaran dari web career public. Data pelamar yang sudah ada tetap tersimpan.`,
    confirmLabel: 'Tutup Lowongan',
    cancelLabel: 'Batal',
    color: 'warning',
    variant: 'structured',
    warningTitle: 'Penting',
    warningMessage: 'Lowongan langsung hilang dari web career dan pelamar baru tidak dapat mengirim lamaran. Data kandidat yang sudah masuk tidak akan dihapus.',
  }))) return
  message.value = ''
  errorMessage.value = ''
  isSubmitting.value = true

  try {
    const response = await updateHrVacancy(record.id, {
      title: record.title,
      division: record.division || '',
      department: record.department || '',
      unit: record.unit || '',
      position: record.position || '',
      supervisor_nik: record.supervisor_nik || '',
      supervisor_name: record.supervisor_name || '',
      description: record.description || '',
      employment_type: record.employment_type || '',
      workplace_type: record.workplace_type || '',
      location: record.location || '',
      responsibilities: record.responsibilities || '',
      requirements: record.requirements || '',
      benefits: record.benefits || '',
      published_at: record.published_at || '',
      expires_at: record.expires_at || '',
      application_deadline: record.application_deadline || '',
      status: 'closed',
    })
    message.value = response.data.message || 'Lowongan berhasil ditutup.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    isSubmitting.value = false
  }
}

function selectSupervisor(employee) {
  form.supervisor_nik = employee.nik
  form.supervisor_name = employee.name
  supervisorSearch.value = ''
  showSupervisorDropdown.value = false
}

function removeSupervisor() {
  form.supervisor_nik = ''
  form.supervisor_name = ''
}

function onSupervisorBlur() {
  setTimeout(() => {
    showSupervisorDropdown.value = false
  }, 200)
}

function onDivisionChange() {
  form.department = ''
  form.unit = ''
  form.position = ''
}

function onDepartmentChange() {
  form.unit = ''
  form.position = ''
}

function onUnitChange() {
  form.position = ''
}

function onPositionChange() {
  if (form.position) {
    form.title = form.position
  }
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

function getStatusColor(status) {
  switch (status) {
    case 'open':
      return 'success'
    case 'closed':
      return 'danger'
    default:
      return 'neutral'
  }
}

onMounted(() => {
  load()
  loadMasterOrgs()
})
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Manajemen Lowongan Kerja</h2>
      <p class="mt-1 text-sm text-muted">Buat dan kelola informasi lowongan pekerjaan internal.</p>
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <!-- Skeleton loader saat pertama kali loading -->
    <template v-if="isLoading">
      <!-- Skeleton Lowongan Terfavorit -->
      <div class="rounded-xl border border-default p-5 bg-default space-y-4 animate-pulse">
        <div class="h-6 bg-muted/40 w-1/4 rounded"></div>
        <div class="h-4 bg-muted/30 w-1/2 rounded"></div>
        <div class="space-y-4 pt-2">
          <div v-for="i in 3" :key="i" class="grid grid-cols-[30px_1fr_100px] items-center gap-4">
            <div class="h-6 w-6 rounded-full bg-muted/30"></div>
            <div class="grid grid-cols-[160px_1fr] items-center gap-4">
              <div class="space-y-2">
                <div class="h-4 bg-muted/30 rounded"></div>
                <div class="h-3 bg-muted/20 w-2/3 rounded"></div>
              </div>
              <div class="h-6 rounded bg-muted/20"></div>
            </div>
            <div class="h-5 rounded bg-muted/30 w-12 ml-auto"></div>
          </div>
        </div>
      </div>

      <!-- Skeleton Daftar Lowongan -->
      <div class="rounded-xl border border-default p-5 bg-default space-y-4 animate-pulse">
        <div class="flex items-center justify-between">
          <div class="space-y-2 w-1/3">
            <div class="h-6 bg-muted/40 rounded"></div>
            <div class="h-4 bg-muted/30 rounded w-5/6"></div>
          </div>
          <div class="h-10 bg-muted/30 w-48 rounded"></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div v-for="i in 4" :key="i" class="rounded-xl border border-default p-5 bg-default space-y-3">
            <div class="flex justify-between">
              <div class="h-5 bg-muted/40 w-1/2 rounded"></div>
              <div class="h-5 bg-muted/30 w-12 rounded"></div>
            </div>
            <div class="h-4 bg-muted/20 w-5/6 rounded"></div>
            <div class="h-4 bg-muted/20 w-1/2 rounded"></div>
            <div class="border-t border-dashed border-default my-3"></div>
            <div class="h-5 bg-muted/30 w-1/3 rounded"></div>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <!-- Card Chart "Lowongan Paling Favorit" -->
      <UCard v-if="favorites.length">
        <template #header>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="font-semibold text-highlighted">Lowongan Paling Favorit</h3>
              <p class="mt-1 text-sm text-muted">Diurutkan berdasarkan jumlah kandidat yang melamar pada periode berjalan.</p>
            </div>
            <!-- Legenda -->
            <div class="flex items-center gap-4 text-[11px]">
              <div class="flex items-center gap-1.5 text-muted">
                <span class="inline-block w-2.5 h-2.5 rounded bg-blue-600"></span>
                <span>Jumlah pelamar</span>
              </div>
              <div class="flex items-center gap-1.5 text-muted">
                <span class="inline-block w-2.5 h-2.5 rounded bg-success"></span>
                <span>% lolos ke tahap wawancara HR</span>
              </div>
            </div>
          </div>
        </template>

        <div class="space-y-5">
          <div v-for="(fav, index) in favorites" :key="fav.id" class="grid grid-cols-[auto_1fr_100px] items-center gap-4">
            <!-- Ranking Badge (lingkaran solid sesuai warna mockup) -->
            <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
                 :class="[
                   index === 0 ? 'bg-orange-500' :
                   index === 1 ? 'bg-slate-400' :
                   index === 2 ? 'bg-amber-600' :
                   'bg-slate-200 text-slate-500 shadow-none'
                 ]">
              {{ index + 1 }}
            </div>

            <!-- Lowongan info & bar horizontal -->
            <div class="grid grid-cols-[160px_1fr] items-center gap-4 min-w-0">
              <div class="flex flex-col min-w-0">
                <span class="font-bold text-highlighted text-sm truncate">{{ fav.title }}</span>
                <span class="text-xs text-muted truncate">{{ fav.department }}</span>
              </div>
              <!-- Progress Bar dengan gradient biru dan opacity melandai sesuai ranking -->
              <div class="relative h-6 rounded-lg bg-slate-50 overflow-hidden w-full">
                <div class="absolute inset-y-0 left-0 transition-all duration-500 rounded-lg flex items-center justify-end pr-3 animate-pulse"
                     :class="[
                       index === 0 ? 'bg-blue-600' :
                       index === 1 ? 'bg-blue-500/80' :
                       index === 2 ? 'bg-blue-400/70' :
                       index === 3 ? 'bg-blue-300/60' : 'bg-blue-200/50'
                     ]"
                     :style="{ width: `${favorites[0]?.total_applied ? (fav.total_applied / favorites[0].total_applied) * 100 : 0}%` }">
                  <span class="text-[10px] font-bold text-white">
                    {{ fav.total_applied }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Persentase Lolos (mockup style) -->
            <div class="text-right">
              <span class="text-base font-black block leading-none"
                    :class="[
                      fav.percentage >= 60 ? 'text-success' :
                      fav.percentage >= 30 ? 'text-warning' : 'text-danger'
                    ]">
                {{ fav.percentage }}%
              </span>
              <span class="text-[9px] font-bold text-muted uppercase tracking-wider block mt-0.5">LOLOS</span>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Daftar Lowongan -->
      <UCard>
        <template #header>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="font-semibold text-highlighted">Daftar Lowongan</h3>
              <p class="mt-1 text-sm text-muted">Daftar seluruh lowongan pekerjaan yang terdaftar di sistem.</p>
            </div>
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center w-full sm:max-w-xl">
              <div class="flex items-center gap-2 bg-default border border-default rounded-lg px-3 py-2 w-full">
                <UIcon name="i-lucide-search" class="size-4 text-muted" />
                <input
                  v-model="search"
                  type="search"
                  placeholder="Cari lowongan, unit, atau atasan..."
                  class="w-full bg-transparent border-0 text-sm outline-none text-highlighted"
                />
              </div>
              <UButton
                type="button"
                label="+ Tambah Lowongan"
                icon="i-lucide-plus"
                class="shrink-0 justify-center h-10 px-4 font-semibold text-sm"
                @click="openCreate"
              />
            </div>
          </div>
        </template>

        <!-- Layout list-card premium (bukan table) — 2 Kolom -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="record in filteredRecords" :key="record.id" class="rounded-xl border border-default p-5 hover:shadow-sm transition bg-default space-y-3 flex flex-col justify-between">
            <div class="space-y-3">
              <!-- Row 1: Judul dan Status Badge -->
              <div class="flex items-start justify-between gap-4">
                <h4 class="font-bold text-highlighted text-base">{{ record.title }}</h4>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span v-if="record.hired_candidates_count > 0" class="inline-flex items-center rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                    Hired
                  </span>
                  <UBadge :color="getStatusColor(record.status)" variant="soft" class="uppercase text-[10px] font-bold px-2 py-0.5">
                    {{ record.status }}
                  </UBadge>
                </div>
              </div>

              <!-- Row 2: Deskripsi Singkat -->
              <p class="text-xs text-muted leading-relaxed line-clamp-2">
                {{ record.description || 'Tidak ada deskripsi lowongan' }}
              </p>

              <!-- Row 3: Breadcrumbs chip organisasi -->
              <div class="flex flex-wrap items-center gap-1.5 text-[10px]">
                <span class="px-2 py-0.5 rounded bg-muted/40 text-muted font-medium" v-if="record.division">{{ record.division }}</span>
                <span class="text-muted/30" v-if="record.division && record.department">/</span>
                <span class="px-2 py-0.5 rounded bg-muted/40 text-muted font-medium" v-if="record.department">{{ record.department }}</span>
                <span class="text-muted/30" v-if="record.department && record.unit">/</span>
                <span class="px-2 py-0.5 rounded bg-muted/40 text-muted font-medium" v-if="record.unit">{{ record.unit }}</span>
              </div>
            </div>

            <div>
              <!-- Divider putus-putus -->
              <div class="border-t border-dashed border-default my-3"></div>

              <!-- Row 4: Footer info & aksi -->
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-muted">
                <!-- Sisi Kiri: Atasan & Jumlah Kandidat -->
                <div class="flex flex-wrap items-center gap-3">
                  <!-- Atasan -->
                  <div v-if="record.supervisor_nik" class="flex items-center gap-1.5">
                    <div class="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold">
                      {{ record.supervisor_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() }}
                    </div>
                    <span class="text-highlighted font-medium text-xs truncate max-w-[100px]">{{ record.supervisor_name }}</span>
                  </div>
                  <!-- Jumlah Pelamar/Kandidat & Tanggal Dibuat -->
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <div class="flex items-center gap-1">
                      <UIcon name="i-lucide-users" class="size-3.5 text-muted/60" />
                      <span>{{ record.candidates_count ?? 0 }} kandidat</span>
                    </div>
                    <span class="text-muted/30">•</span>
                    <div class="flex items-center gap-1 text-[10px]">
                      <UIcon name="i-lucide-calendar" class="size-3.5 text-muted/60" />
                      <span>Dibuat: {{ formatDate(record.created_at) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Sisi Aksi: Edit & Hapus/Tutup minimalis -->
                <div class="flex items-center gap-3 shrink-0">
                  <button type="button" class="inline-flex items-center gap-1 font-semibold text-amber-600 hover:text-amber-700 hover:underline transition" @click="openEdit(record)">
                    <UIcon name="i-lucide-pencil" class="size-3.5" />
                    Edit
                  </button>
                  <!-- Tombol Hapus jika belum ada kandidat -->
                  <button v-if="!record.candidates_count" type="button" class="inline-flex items-center gap-1 font-semibold text-danger hover:text-red-700 hover:underline transition" @click="deleteVacancy(record)">
                    <UIcon name="i-lucide-trash-2" class="size-3.5" />
                    Hapus
                  </button>
                  <!-- Tombol Tutup jika sudah ada kandidat dan status belum closed -->
                  <button v-else-if="record.status !== 'closed'" type="button" class="inline-flex items-center gap-1 font-semibold text-danger hover:text-red-700 hover:underline transition" @click="closeVacancy(record)">
                    <UIcon name="i-lucide-ban" class="size-3.5" />
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div v-if="!filteredRecords.length" class="md:col-span-2 p-8 text-center text-muted border border-dashed border-default rounded-xl text-xs">
            Tidak ada lowongan ditemukan.
          </div>
        </div>
      </UCard>
    </template>

    <!-- Modal Tambah/Edit Lowongan -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60"
        aria-label="Tutup modal"
        @click="closeModal"
      ></button>
      <UCard class="relative max-h-[92vh] w-full max-w-lg overflow-y-auto">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-highlighted">{{ isEditMode ? 'Edit Lowongan Kerja' : 'Tambah Lowongan Baru' }}</p>
              <p class="mt-1 text-xs text-muted">Isi detail divisi, departemen, unit, jabatan dan atasan langsung.</p>
            </div>
            <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-x" @click="closeModal" />
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <!-- Kelompok Struktur Organisasi Cascading -->
          <div class="rounded-xl border border-dashed border-default bg-muted/10 p-4 space-y-4">
            <div class="flex items-center justify-between">
              <p class="text-[10px] font-semibold text-primary uppercase tracking-wider">Struktur Organisasi</p>
              <span class="text-[10px] text-muted">* Wajib diisi</span>
            </div>

            <!-- Breadcrumb Chip visual -->
            <div v-if="form.division || form.department || form.unit || form.position" class="flex flex-wrap gap-1 text-[10px]">
              <span v-if="form.division" class="px-1.5 py-0.5 rounded bg-default border border-default text-highlighted truncate max-w-[100px]">{{ form.division }}</span>
              <span v-if="form.department" class="text-muted/50 flex items-center gap-0.5">❯ <span class="px-1.5 py-0.5 rounded bg-default border border-default text-highlighted truncate max-w-[100px]">{{ form.department }}</span></span>
              <span v-if="form.unit" class="text-muted/50 flex items-center gap-0.5">❯ <span class="px-1.5 py-0.5 rounded bg-default border border-default text-highlighted truncate max-w-[100px]">{{ form.unit }}</span></span>
              <span v-if="form.position" class="text-muted/50 flex items-center gap-0.5">❯ <span class="px-1.5 py-0.5 rounded bg-default border border-default text-highlighted truncate max-w-[100px]">{{ form.position }}</span></span>
            </div>

            <!-- Divisi -->
            <div>
              <label class="mb-1 block text-xs font-semibold text-muted">Divisi <span class="text-danger">*</span></label>
              <select v-model="form.division" required :class="formControlClass" @change="onDivisionChange">
                <option value="">Pilih Divisi</option>
                <option v-for="name in divisionOptions" :key="name" :value="name">{{ name }}</option>
              </select>
            </div>

            <!-- Departemen -->
            <div>
              <label class="mb-1 block text-xs font-semibold text-muted">Departemen <span class="text-danger">*</span></label>
              <select v-model="form.department" required :disabled="!form.division" :class="formControlClass" @change="onDepartmentChange">
                <option value="">Pilih Departemen</option>
                <option v-for="name in departmentOptions" :key="name" :value="name">{{ name }}</option>
              </select>
            </div>

            <!-- Unit -->
            <div>
              <label class="mb-1 block text-xs font-semibold text-muted">Unit <span class="text-danger">*</span></label>
              <select v-model="form.unit" required :disabled="!form.department" :class="formControlClass" @change="onUnitChange">
                <option value="">Pilih Unit</option>
                <option v-for="name in unitOptions" :key="name" :value="name">{{ name }}</option>
              </select>
            </div>

            <!-- Jabatan -->
            <div>
              <label class="mb-1 block text-xs font-semibold text-muted">Jabatan / Posisi <span class="text-danger">*</span></label>
              <select v-model="form.position" required :disabled="!form.unit" :class="formControlClass" @change="onPositionChange">
                <option value="">Pilih Jabatan</option>
                <option v-for="name in positionOptions" :key="name" :value="name">{{ name }}</option>
              </select>
            </div>
          </div>

          <!-- Nama Lowongan / Posisi -->
          <div>
            <label class="mb-1 block text-xs font-semibold text-muted">Nama Lowongan / Posisi <span class="text-danger">*</span></label>
            <input
              v-model="form.title"
              required
              placeholder="Masukkan nama lowongan secara spesifik"
              :class="formControlClass"
            />
          </div>

          <!-- Atasan Langsung Search-Select -->
          <div class="relative">
            <label class="mb-1 block text-xs font-semibold text-muted">Atasan Langsung <span class="text-danger">*</span></label>
            <div class="flex items-center gap-1 bg-default border border-default rounded-md px-2.5 py-1">
              <UIcon name="i-lucide-search" class="size-4 text-muted" />
              <input
                v-model="supervisorSearch"
                placeholder="Cari nama karyawan atau NIK..."
                class="w-full bg-transparent border-0 text-sm outline-none text-highlighted"
                @focus="showSupervisorDropdown = true"
                @blur="onSupervisorBlur"
              />
            </div>

            <!-- Suggestions list -->
            <div
              v-if="showSupervisorDropdown && supervisorSearch.trim()"
              class="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto rounded-md border border-default bg-default shadow-lg"
            >
              <button
                v-for="employee in supervisorSuggestions"
                :key="employee.nik"
                type="button"
                class="flex w-full items-center gap-3 px-3 py-2 text-left text-xs text-highlighted hover:bg-muted/10"
                @click="selectSupervisor(employee)"
              >
                <div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-[9px]">
                  {{ employee.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() }}
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="font-semibold truncate">{{ employee.name }}</span>
                  <span class="text-[9px] text-muted">{{ employee.position || 'Staf' }} • NIK: {{ employee.nik }}</span>
                </div>
              </button>
              <div v-if="!supervisorSuggestions.length" class="p-3 text-center text-muted text-xs">
                Karyawan aktif tidak ditemukan
              </div>
            </div>

            <!-- Preview Card Atasan Langsung -->
            <div v-if="form.supervisor_nik" class="mt-2.5 flex items-center justify-between p-3 rounded-lg border border-default bg-muted/10">
              <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {{ form.supervisor_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() }}
                </div>
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-highlighted">{{ form.supervisor_name }}</span>
                  <span class="text-[9px] text-muted">Atasan Langsung • NIK: {{ form.supervisor_nik }}</span>
                </div>
              </div>
              <UButton color="danger" variant="ghost" size="xs" icon="i-lucide-trash-2" @click="removeSupervisor" />
            </div>
          </div>

          <!-- Status -->
          <div class="rounded-xl border border-dashed border-default bg-muted/10 p-4 space-y-4">
            <p class="text-[10px] font-semibold text-primary uppercase tracking-wider">Informasi Career Public</p>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs font-semibold text-muted">Tipe Pekerjaan</label>
                <select v-model="form.employment_type" :class="formControlClass">
                  <option value="">Pilih tipe</option><option value="full_time">Penuh Waktu</option><option value="part_time">Paruh Waktu</option><option value="contract">Kontrak</option><option value="internship">Magang</option><option value="temporary">Sementara</option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-xs font-semibold text-muted">Sistem Kerja</label>
                <select v-model="form.workplace_type" :class="formControlClass">
                  <option value="">Pilih sistem</option><option value="onsite">On-site</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option>
                </select>
              </div>
            </div>
            <div><label class="mb-1 block text-xs font-semibold text-muted">Lokasi Kerja</label><input v-model="form.location" maxlength="150" placeholder="Contoh: Jakarta Selatan" :class="formControlClass" /></div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><label class="mb-1 block text-xs font-semibold text-muted">Mulai Tayang</label><input v-model="form.published_at" type="datetime-local" :class="formControlClass" /></div>
              <div><label class="mb-1 block text-xs font-semibold text-muted">Berhenti Tayang</label><input v-model="form.expires_at" type="datetime-local" :class="formControlClass" /></div>
            </div>
            <div><label class="mb-1 block text-xs font-semibold text-muted">Batas Lamaran</label><input v-model="form.application_deadline" type="date" :class="formControlClass" /></div>
          </div>

          <!-- Status -->
          <div>
            <label class="mb-1 block text-xs font-semibold text-muted">Status</label>
            <select v-model="form.status" :class="formControlClass">
              <option value="draft">Draft</option>
              <option value="open">Open (Aktif)</option>
              <option value="closed">Closed (Ditutup)</option>
            </select>
          </div>

          <div><label class="mb-1 block text-xs font-semibold text-muted">Tanggung Jawab</label><textarea v-model="form.responsibilities" rows="4" placeholder="Satu poin per baris" :class="formControlClass"></textarea></div>
          <div><label class="mb-1 block text-xs font-semibold text-muted">Kualifikasi</label><textarea v-model="form.requirements" rows="4" placeholder="Satu poin per baris" :class="formControlClass"></textarea></div>
          <div><label class="mb-1 block text-xs font-semibold text-muted">Benefit</label><textarea v-model="form.benefits" rows="4" placeholder="Satu poin per baris" :class="formControlClass"></textarea></div>

          <!-- Deskripsi Lowongan -->
          <div>
            <label class="mb-1 block text-xs font-semibold text-muted">Deskripsi Lowongan</label>
            <textarea
              v-model="form.description"
              rows="3"
              placeholder="Tuliskan detail pekerjaan, kualifikasi, dll."
              :class="formControlClass"
            ></textarea>
          </div>

          <!-- Footer -->
          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton type="button" label="Batal" color="neutral" variant="ghost" @click="closeModal" />
            <UButton type="submit" :label="isEditMode ? 'Simpan Perubahan' : 'Buat Lowongan'" :loading="isSubmitting" />
          </div>
        </form>
      </UCard>
    </div>
  </section>
</template>
