<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  getHrVacancies,
  createHrVacancy,
  updateHrVacancy,
  deleteHrVacancy,
  getHrVacancyFavorites,
} from '../services/hrService'
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
const copiedPublicLinkId = ref(null)

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
  hire_type: 'new_hire',
  replaced_employee_nik: '',
  replaced_employee_name: '',
})

// Autocomplete supervisor
const supervisorSearch = ref('')
const showSupervisorDropdown = ref(false)

// Autocomplete karyawan yang di-replace
const replacedEmployeeSearch = ref('')
const showReplacedEmployeeDropdown = ref(false)


// Master data organisasi flat
const masterDivisions = ref([])
const masterDepartments = ref([])
const masterUnits = ref([])
const masterPositions = ref([])

const formControlClass =
  'w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50'

const statusFilter = ref('all')

const statusCounts = computed(() => {
  const counts = { all: records.value.length, open: 0, closed: 0, draft: 0 }
  records.value.forEach((r) => {
    if (r.status in counts) {
      counts[r.status]++
    }
  })
  return counts
})

const filteredRecords = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  const filter = statusFilter.value
  return records.value
    .filter((record) => {
      const matchesStatus = filter === 'all' || record.status === filter
      const matchesSearch =
        record.title.toLowerCase().includes(keyword) ||
        (record.division || '').toLowerCase().includes(keyword) ||
        (record.department || '').toLowerCase().includes(keyword) ||
        (record.unit || '').toLowerCase().includes(keyword) ||
        (record.position || '').toLowerCase().includes(keyword) ||
        (record.supervisor_name || '').toLowerCase().includes(keyword) ||
        (record.description || '').toLowerCase().includes(keyword)
      return matchesStatus && matchesSearch
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
})

// Cascading computed options berdasarkan list karyawan aktif untuk mengunci relasi
const divisionOptions = computed(() => {
  if (masterDivisions.value.length > 0) return masterDivisions.value
  return [...new Set(employeesList.value.map((e) => e.divisi).filter(Boolean))].sort()
})

const departmentOptions = computed(() => {
  const linkedDepts = [
    ...new Set(
      employeesList.value
        .filter((e) => e.divisi === form.division)
        .map((e) => e.departement)
        .filter(Boolean),
    ),
  ]
  if (linkedDepts.length > 0) return linkedDepts.sort()
  return masterDepartments.value.sort()
})

const unitOptions = computed(() => {
  const linkedUnits = [
    ...new Set(
      employeesList.value
        .filter((e) => e.divisi === form.division && e.departement === form.department)
        .map((e) => e.unit)
        .filter(Boolean),
    ),
  ]
  if (linkedUnits.length > 0) return linkedUnits.sort()
  return masterUnits.value.sort()
})

const positionOptions = computed(() => {
  const linkedPositions = [
    ...new Set(
      employeesList.value
        .filter(
          (e) =>
            e.divisi === form.division &&
            e.departement === form.department &&
            (!form.unit || e.unit === form.unit),
        )
        .map((e) => e.posisi_title)
        .filter(Boolean),
    ),
  ]
  if (linkedPositions.length > 0) return linkedPositions.sort()
  return masterPositions.value.sort()
})

const supervisorSuggestions = computed(() => {
  const keyword = supervisorSearch.value.trim().toLowerCase()
  return employeesList.value
    .filter((e) => e.status === 'AKTIF')
    .filter((e) => e.name.toLowerCase().includes(keyword) || e.nik.toLowerCase().includes(keyword))
    .slice(0, 10)
})

const replacedEmployeeSuggestions = computed(() => {
  const keyword = replacedEmployeeSearch.value.trim().toLowerCase()
  return employeesList.value
    .filter((e) => e.status === 'AKTIF')
    .filter((e) => e.name.toLowerCase().includes(keyword) || e.nik.toLowerCase().includes(keyword))
    .slice(0, 10)
})

async function load() {
  isLoading.value = true
  try {
    const [vacanciesResponse, favsResponse, employeesResponse] = await Promise.all([
      getHrVacancies(),
      getHrVacancyFavorites(),
      getEmployees().catch(() => ({ data: { data: [] } })),
    ])
    records.value = vacanciesResponse.data
    favorites.value = favsResponse.data
    employeesList.value = employeesResponse.data?.data || employeesResponse.data || []
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
    masterDivisions.value = divs.data.filter((d) => d.is_active).map((d) => d.name)
    masterDepartments.value = depts.data.filter((d) => d.is_active).map((d) => d.name)
    masterUnits.value = unts.data.filter((d) => d.is_active).map((d) => d.name)
    masterPositions.value = posts.data.filter((d) => d.is_active).map((d) => d.name)
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
    hire_type: 'new_hire',
    replaced_employee_nik: '',
    replaced_employee_name: '',
  })
  supervisorSearch.value = ''
  replacedEmployeeSearch.value = ''
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
    application_deadline: record.application_deadline
      ? record.application_deadline.slice(0, 10)
      : '',
    status: record.status,
    hire_type: record.hire_type || 'new_hire',
    replaced_employee_nik: record.replaced_employee_nik || '',
    replaced_employee_name: record.replaced_employee_name || '',
  })
  supervisorSearch.value = ''
  replacedEmployeeSearch.value = record.replaced_employee_name || ''
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
  if (
    !(await askConfirmation({
      title: 'Hapus Lowongan',
      message: `Lowongan "${record.title}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Hapus Lowongan',
      cancelLabel: 'Batal',
      color: 'error',
      variant: 'structured',
      warningTitle: 'Penting',
      warningMessage:
        'Data lowongan yang sudah dihapus tidak dapat dipulihkan kembali. Pastikan lowongan ini memang tidak lagi dibutuhkan.',
    }))
  )
    return
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
  if (
    !(await askConfirmation({
      title: 'Tutup Lowongan',
      message: `Lowongan "${record.title}" akan berstatus CLOSED dan tidak lagi tampil atau menerima lamaran dari web career public. Data pelamar yang sudah ada tetap tersimpan.`,
      confirmLabel: 'Tutup Lowongan',
      cancelLabel: 'Batal',
      color: 'warning',
      variant: 'structured',
      warningTitle: 'Penting',
      warningMessage:
        'Lowongan langsung hilang dari web career dan pelamar baru tidak dapat mengirim lamaran. Data kandidat yang sudah masuk tidak akan dihapus.',
    }))
  )
    return
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

function selectReplacedEmployee(employee) {
  form.replaced_employee_nik = employee.nik
  form.replaced_employee_name = employee.name
  replacedEmployeeSearch.value = employee.name
  showReplacedEmployeeDropdown.value = false
}

function removeReplacedEmployee() {
  form.replaced_employee_nik = ''
  form.replaced_employee_name = ''
  replacedEmployeeSearch.value = ''
}

function onReplacedEmployeeBlur() {
  setTimeout(() => {
    showReplacedEmployeeDropdown.value = false
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

const careerSiteUrl = computed(() => {
  const configuredUrl = import.meta.env.VITE_CAREER_SITE_URL
  if (configuredUrl) return configuredUrl.replace(/\/$/, '')

  const origin = globalThis.location?.origin || ''
  if (globalThis.location?.port === '5173') {
    return `${globalThis.location.protocol}//${globalThis.location.hostname}:5174`
  }

  return origin.replace(/\/$/, '')
})

function publicVacancyUrl(record) {
  if (!record?.slug) return ''
  return `${careerSiteUrl.value}/jobs/${encodeURIComponent(record.slug)}`
}

function canSharePublicVacancy(record) {
  return record?.status === 'open' && Boolean(record?.slug)
}

async function copyPublicVacancyLink(record) {
  const url = publicVacancyUrl(record)
  if (!url) return

  message.value = ''
  errorMessage.value = ''

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = url
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }

    copiedPublicLinkId.value = record.id
    message.value = `Link public lowongan "${record.title}" berhasil disalin.`
    setTimeout(() => {
      if (copiedPublicLinkId.value === record.id) copiedPublicLinkId.value = null
    }, 1800)
  } catch (error) {
    errorMessage.value = 'Gagal menyalin link lowongan. Silakan salin manual dari tombol buka link.'
  }
}

function openPublicVacancy(record) {
  const url = publicVacancyUrl(record)
  if (!url) return
  globalThis.open?.(url, '_blank', 'noopener,noreferrer')
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
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
        <div class="overflow-x-auto border border-default rounded-xl pt-1">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-default bg-muted/10 text-muted font-semibold text-xs">
                <th class="py-3 px-4">Lowongan</th>
                <th class="py-3 px-4">Unit</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4">Kandidat</th>
                <th class="py-3 px-4">Dibuat</th>
                <th class="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="i in 5" :key="i">
                <td class="py-3.5 px-4">
                  <div class="h-4 bg-muted/30 rounded w-36"></div>
                </td>
                <td class="py-3.5 px-4">
                  <div class="h-4 bg-muted/20 rounded w-48"></div>
                </td>
                <td class="py-3.5 px-4">
                  <div class="h-5 bg-muted/30 rounded-full w-14"></div>
                </td>
                <td class="py-3.5 px-4">
                  <div class="h-4 bg-muted/20 rounded w-20"></div>
                </td>
                <td class="py-3.5 px-4">
                  <div class="h-4 bg-muted/20 rounded w-24"></div>
                </td>
                <td class="py-3.5 px-4 text-right">
                  <div class="h-8 w-16 bg-muted/20 rounded ml-auto"></div>
                </td>
              </tr>
            </tbody>
          </table>
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
              <p class="mt-1 text-sm text-muted">
                Diurutkan berdasarkan jumlah kandidat yang melamar pada periode berjalan.
              </p>
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
          <div v-for="(fav, index) in favorites" :key="fav.id"
            class="grid grid-cols-[auto_1fr_100px] items-center gap-4">
            <!-- Ranking Badge (lingkaran solid sesuai warna mockup) -->
            <div
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
              :class="[
                index === 0
                  ? 'bg-orange-500'
                  : index === 1
                    ? 'bg-slate-400'
                    : index === 2
                      ? 'bg-amber-600'
                      : 'bg-slate-200 text-slate-500 shadow-none',
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
                <div
                  class="absolute inset-y-0 left-0 transition-all duration-500 rounded-lg flex items-center justify-end pr-3 animate-pulse"
                  :class="[
                    index === 0
                      ? 'bg-blue-600'
                      : index === 1
                        ? 'bg-blue-500/80'
                        : index === 2
                          ? 'bg-blue-400/70'
                          : index === 3
                            ? 'bg-blue-300/60'
                            : 'bg-blue-200/50',
                  ]" :style="{
                    width: `${favorites[0]?.total_applied ? (fav.total_applied / favorites[0].total_applied) * 100 : 0}%`,
                  }">
                  <span class="text-[10px] font-bold text-white">
                    {{ fav.total_applied }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Persentase Lolos (mockup style) -->
            <div class="text-right">
              <span class="text-base font-black block leading-none" :class="[
                fav.percentage >= 60
                  ? 'text-success'
                  : fav.percentage >= 30
                    ? 'text-warning'
                    : 'text-danger',
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
          <div class="flex flex-col gap-3">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 class="font-semibold text-highlighted">Daftar Lowongan</h3>
                <p class="mt-1 text-sm text-muted">
                  Daftar seluruh lowongan pekerjaan yang terdaftar di sistem.
                </p>
              </div>
              <div class="flex items-center gap-2 w-full sm:w-auto">
                <!-- Input Search -->
                <div
                  class="flex h-10 items-center gap-2 bg-default border border-default rounded-lg px-3 py-2 w-full sm:w-72">
                  <UIcon name="i-lucide-search" class="size-4 text-muted shrink-0" />
                  <input v-model="search" type="search" placeholder="Cari lowongan, unit, atau atasan..."
                    class="w-full bg-transparent border-0 text-xs outline-none text-highlighted" />
                </div>

                <!-- Tombol Tambah Lowongan -->
                <UButton type="button" label="+ Tambah Lowongan" icon="i-lucide-plus"
                  class="shrink-0 justify-center h-10 px-4 font-semibold text-sm" @click="openCreate" />
              </div>
            </div>

            <!-- Tab Filter Simple (Underline / Line Tab Style) -->
            <div class="flex items-center gap-6 border-b border-default text-xs pt-1 overflow-x-auto">
              <button type="button" :class="[
                'pb-2.5 transition cursor-pointer font-medium whitespace-nowrap flex items-center gap-1.5 border-b-2',
                statusFilter === 'all'
                  ? 'border-primary text-highlighted font-semibold'
                  : 'border-transparent text-muted hover:text-highlighted'
              ]" @click="statusFilter = 'all'">
                <span>Semua</span>
                <span class="text-[10px] text-muted font-normal">({{ statusCounts.all }})</span>
              </button>

              <button type="button" :class="[
                'pb-2.5 transition cursor-pointer font-medium whitespace-nowrap flex items-center gap-1.5 border-b-2',
                statusFilter === 'open'
                  ? 'border-primary text-highlighted font-semibold'
                  : 'border-transparent text-muted hover:text-highlighted'
              ]" @click="statusFilter = 'open'">
                <span>Open</span>
                <span class="text-[10px] text-muted font-normal">({{ statusCounts.open }})</span>
              </button>

              <button type="button" :class="[
                'pb-2.5 transition cursor-pointer font-medium whitespace-nowrap flex items-center gap-1.5 border-b-2',
                statusFilter === 'closed'
                  ? 'border-primary text-highlighted font-semibold'
                  : 'border-transparent text-muted hover:text-highlighted'
              ]" @click="statusFilter = 'closed'">
                <span>Closed</span>
                <span class="text-[10px] text-muted font-normal">({{ statusCounts.closed }})</span>
              </button>

              <button v-if="statusCounts.draft > 0 || statusFilter === 'draft'" type="button" :class="[
                'pb-2.5 transition cursor-pointer font-medium whitespace-nowrap flex items-center gap-1.5 border-b-2',
                statusFilter === 'draft'
                  ? 'border-primary text-highlighted font-semibold'
                  : 'border-transparent text-muted hover:text-highlighted'
              ]" @click="statusFilter = 'draft'">
                <span>Draft</span>
                <span class="text-[10px] text-muted font-normal">({{ statusCounts.draft }})</span>
              </button>
            </div>
          </div>
        </template>

        <!-- Layout Table List sesuai desain -->
        <div class="overflow-x-auto border border-default rounded-xl">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-default bg-muted/10 text-muted font-bold text-xs">
                <th class="py-3.5 px-4 font-semibold">Lowongan</th>
                <th class="py-3.5 px-4 font-semibold">Unit</th>
                <th class="py-3.5 px-4 font-semibold">Status</th>
                <th class="py-3.5 px-4 font-semibold">Kandidat</th>
                <th class="py-3.5 px-4 font-semibold">Dibuat</th>
                <th class="py-3.5 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="record in filteredRecords" :key="record.id" class="hover:bg-muted/5 transition-colors">
                <!-- Lowongan -->
                <td class="py-3.5 px-4 text-sm whitespace-nowrap">
                  <p class="font-bold text-highlighted">{{ record.title }}</p>
                  <div class="flex items-center gap-1.5 mt-0.5">
                    <span v-if="record.hire_type === 'replacement'"
                      class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                      :title="record.replaced_employee_name ? `Menggantikan: ${record.replaced_employee_name}` : 'Replacement'">
                      <UIcon name="i-lucide-user-round-x" class="size-3" />
                      Replacement{{ record.replaced_employee_name ? `: ${record.replaced_employee_name}` : '' }}
                    </span>
                    <span v-else
                      class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      <UIcon name="i-lucide-user-plus" class="size-3" />
                      New Hire
                    </span>
                  </div>
                  <div class="mt-2 flex items-center gap-1.5 text-[11px]">
                    <template v-if="canSharePublicVacancy(record)">
                      <a
                        :href="publicVacancyUrl(record)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex min-w-0 max-w-[220px] items-center gap-1 rounded-md bg-primary/5 px-2 py-1 font-semibold text-primary hover:bg-primary/10 hover:underline"
                        :title="publicVacancyUrl(record)"
                      >
                        <UIcon name="i-lucide-link" class="size-3.5 shrink-0" />
                        <span class="truncate">/jobs/{{ record.slug }}</span>
                      </a>
                      <button
                        type="button"
                        class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-default bg-default text-muted transition hover:bg-muted/10 hover:text-primary"
                        :title="copiedPublicLinkId === record.id ? 'Link sudah disalin' : 'Salin link public'"
                        @click.stop="copyPublicVacancyLink(record)"
                      >
                        <UIcon
                          :name="copiedPublicLinkId === record.id ? 'i-lucide-check' : 'i-lucide-copy'"
                          class="size-3.5"
                        />
                      </button>
                      <button
                        type="button"
                        class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-default bg-default text-muted transition hover:bg-muted/10 hover:text-primary"
                        title="Buka halaman public"
                        @click.stop="openPublicVacancy(record)"
                      >
                        <UIcon name="i-lucide-external-link" class="size-3.5" />
                      </button>
                    </template>
                    <span
                      v-else
                      class="inline-flex items-center gap-1 rounded-md bg-muted/10 px-2 py-1 font-semibold text-muted"
                      title="Link public hanya aktif untuk lowongan berstatus Open"
                    >
                      <UIcon name="i-lucide-lock" class="size-3.5" />
                      Tidak tampil public
                    </span>
                  </div>
                </td>

                <!-- Unit -->
                <td class="py-3.5 px-4 text-muted font-medium text-xs">
                  <div class="max-w-[200px] lg:max-w-[280px] truncate"
                    :title="[record.division, record.department, record.unit].filter(Boolean).join(' / ')">
                    {{ [record.division, record.department, record.unit].filter(Boolean).join(' / ') || '-' }}
                  </div>
                </td>


                <!-- Status -->
                <td class="py-3.5 px-4 whitespace-nowrap">
                  <UBadge :color="getStatusColor(record.status)" variant="soft"
                    class="capitalize text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {{ record.status === 'open' ? 'Open' : record.status === 'closed' ? 'Closed' : record.status }}
                  </UBadge>
                </td>

                <!-- Kandidat -->
                <td class="py-3.5 px-4 text-highlighted font-medium text-xs whitespace-nowrap">
                  {{ record.candidates_count ?? 0 }} kandidat
                </td>

                <!-- Dibuat -->
                <td class="py-3.5 px-4 text-highlighted font-medium text-xs whitespace-nowrap">
                  {{ formatDate(record.created_at) }}
                </td>

                <!-- Aksi -->
                <td class="py-3.5 px-4 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-1.5">
                    <button type="button"
                      class="flex h-8 w-8 items-center justify-center rounded-lg border border-default bg-muted/5 text-highlighted hover:bg-muted/20 transition cursor-pointer"
                      title="Edit Lowongan" @click="openEdit(record)">
                      <UIcon name="i-lucide-pencil" class="size-4" />
                    </button>
                    <button v-if="!record.candidates_count" type="button"
                      class="flex h-8 w-8 items-center justify-center rounded-lg border border-default bg-muted/5 text-highlighted hover:bg-muted/20 hover:text-danger transition cursor-pointer"
                      title="Hapus Lowongan" @click="deleteVacancy(record)">
                      <UIcon name="i-lucide-trash-2" class="size-4" />
                    </button>
                    <button v-else-if="record.status !== 'closed'" type="button"
                      class="flex h-8 w-8 items-center justify-center rounded-lg border border-default bg-muted/5 text-highlighted hover:bg-muted/20 hover:text-amber-500 transition cursor-pointer"
                      title="Tutup Lowongan" @click="closeVacancy(record)">
                      <UIcon name="i-lucide-ban" class="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!filteredRecords.length">
                <td colspan="6" class="p-8 text-center text-muted text-xs">
                  Tidak ada lowongan ditemukan.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </template>

    <!-- Modal Tambah/Edit Lowongan -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog"
      aria-modal="true">
      <button type="button" class="absolute inset-0 bg-slate-950/60" aria-label="Tutup modal"
        @click="closeModal"></button>
      <UCard class="relative max-h-[92vh] w-full max-w-[75vw] overflow-y-auto">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-highlighted">
                {{ isEditMode ? 'Edit Lowongan Kerja' : 'Tambah Lowongan Baru' }}
              </p>
              <p class="mt-1 text-xs text-muted">
                Isi detail divisi, departemen, unit, jabatan dan atasan langsung.
              </p>
            </div>
            <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-x" @click="closeModal" />
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <!-- KOLOM KIRI: Organisasi, Posisi & Atasan -->
            <div class="space-y-4">
              <!-- Kelompok Struktur Organisasi Cascading -->
              <div class="rounded-xl border border-dashed border-default bg-muted/10 p-4 space-y-4">
                <div class="flex items-center justify-between">
                  <p class="text-[10px] font-semibold text-primary uppercase tracking-wider">
                    Struktur Organisasi
                  </p>
                  <span class="text-[10px] text-muted">* Wajib diisi</span>
                </div>

                <!-- Breadcrumb Chip visual -->
                <div v-if="form.division || form.department || form.unit || form.position"
                  class="flex flex-wrap gap-1 text-[10px]">
                  <span v-if="form.division"
                    class="px-1.5 py-0.5 rounded bg-default border border-default text-highlighted truncate max-w-[120px]">{{
                      form.division }}</span>
                  <span v-if="form.department" class="text-muted/50 flex items-center gap-0.5">❯
                    <span
                      class="px-1.5 py-0.5 rounded bg-default border border-default text-highlighted truncate max-w-[120px]">{{
                        form.department }}</span></span>
                  <span v-if="form.unit" class="text-muted/50 flex items-center gap-0.5">❯
                    <span
                      class="px-1.5 py-0.5 rounded bg-default border border-default text-highlighted truncate max-w-[120px]">{{
                        form.unit }}</span></span>
                  <span v-if="form.position" class="text-muted/50 flex items-center gap-0.5">❯
                    <span
                      class="px-1.5 py-0.5 rounded bg-default border border-default text-highlighted truncate max-w-[120px]">{{
                        form.position }}</span></span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <!-- Divisi -->
                  <div>
                    <label class="mb-1 block text-xs font-semibold text-muted">Divisi <span
                        class="text-danger">*</span></label>
                    <select v-model="form.division" required :class="formControlClass" @change="onDivisionChange">
                      <option value="">Pilih Divisi</option>
                      <option v-for="name in divisionOptions" :key="name" :value="name">
                        {{ name }}
                      </option>
                    </select>
                  </div>

                  <!-- Departemen -->
                  <div>
                    <label class="mb-1 block text-xs font-semibold text-muted">Departemen <span
                        class="text-danger">*</span></label>
                    <select v-model="form.department" required :disabled="!form.division" :class="formControlClass"
                      @change="onDepartmentChange">
                      <option value="">Pilih Departemen</option>
                      <option v-for="name in departmentOptions" :key="name" :value="name">
                        {{ name }}
                      </option>
                    </select>
                  </div>

                  <!-- Unit -->
                  <div>
                    <label class="mb-1 block text-xs font-semibold text-muted">Unit</label>
                    <select v-model="form.unit" :disabled="!form.department" :class="formControlClass"
                      @change="onUnitChange">
                      <option value="">Pilih Unit</option>
                      <option v-for="name in unitOptions" :key="name" :value="name">{{ name }}</option>
                    </select>
                  </div>

                  <!-- Jabatan -->
                  <div>
                    <label class="mb-1 block text-xs font-semibold text-muted">Jabatan / Posisi</label>
                    <select v-model="form.position" :disabled="!form.department" :class="formControlClass"
                      @change="onPositionChange">
                      <option value="">Pilih Jabatan</option>
                      <option v-for="name in positionOptions" :key="name" :value="name">
                        {{ name }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>


              <!-- Tipe Lowongan -->
              <div>
                <label class="mb-2 block text-xs font-semibold text-muted">Tipe Lowongan <span
                    class="text-danger">*</span></label>
                <div class="grid grid-cols-2 gap-2">
                  <button type="button"
                    class="flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 text-left transition-all" :class="form.hire_type === 'new_hire'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-default bg-default text-muted hover:border-default/70 hover:text-highlighted'"
                    @click="form.hire_type = 'new_hire'; removeReplacedEmployee()">
                    <div class="flex size-8 shrink-0 items-center justify-center rounded-lg"
                      :class="form.hire_type === 'new_hire' ? 'bg-primary/10' : 'bg-muted/10'">
                      <UIcon name="i-lucide-user-plus" class="size-4" />
                    </div>
                    <div>
                      <p class="text-xs font-semibold leading-tight">New Hire</p>
                      <p class="text-[10px] leading-tight opacity-70 mt-0.5">Rekrut karyawan baru</p>
                    </div>
                  </button>
                  <button type="button"
                    class="flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 text-left transition-all" :class="form.hire_type === 'replacement'
                      ? 'border-amber-500 bg-amber-500/5 text-amber-600 dark:text-amber-400'
                      : 'border-default bg-default text-muted hover:border-default/70 hover:text-highlighted'"
                    @click="form.hire_type = 'replacement'">
                    <div class="flex size-8 shrink-0 items-center justify-center rounded-lg"
                      :class="form.hire_type === 'replacement' ? 'bg-amber-500/10' : 'bg-muted/10'">
                      <UIcon name="i-lucide-user-round-x" class="size-4" />
                    </div>
                    <div>
                      <p class="text-xs font-semibold leading-tight">Replacement</p>
                      <p class="text-[10px] leading-tight opacity-70 mt-0.5">Menggantikan karyawan</p>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Karyawan yang digantikan (hanya muncul jika replacement) -->
              <div v-if="form.hire_type === 'replacement'" class="relative">
                <label class="mb-1 block text-xs font-semibold text-muted">
                  Karyawan yang Digantikan <span class="text-danger">*</span>
                </label>

                <!-- Selected state -->
                <div v-if="form.replaced_employee_nik"
                  class="flex items-center justify-between rounded-xl border border-amber-400/50 bg-amber-50 dark:bg-amber-900/10 px-3 py-2">
                  <div class="flex items-center gap-2.5">
                    <div
                      class="flex size-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold text-[10px] shrink-0">
                      {{form.replaced_employee_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}}
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-highlighted">{{ form.replaced_employee_name }}</p>
                      <p class="text-[10px] text-muted">NIK: {{ form.replaced_employee_nik }}</p>
                    </div>
                  </div>
                  <button type="button" @click="removeReplacedEmployee"
                    class="size-6 flex items-center justify-center rounded-full hover:bg-muted/10 text-muted hover:text-highlighted transition-colors">
                    <UIcon name="i-lucide-x" class="size-3.5" />
                  </button>
                </div>

                <!-- Search state -->
                <div v-else>
                  <div class="flex items-center gap-1.5 bg-default border border-default rounded-md px-2.5 py-1.5">
                    <UIcon name="i-lucide-search" class="size-4 text-muted" />
                    <input v-model="replacedEmployeeSearch" placeholder="Cari nama karyawan atau NIK..."
                      class="w-full bg-transparent border-0 text-sm outline-none text-highlighted"
                      @focus="showReplacedEmployeeDropdown = true" @blur="onReplacedEmployeeBlur" />
                  </div>
                  <div v-if="showReplacedEmployeeDropdown && replacedEmployeeSearch.trim()"
                    class="absolute z-20 w-full mt-1 max-h-48 overflow-y-auto rounded-md border border-default bg-default shadow-lg">
                    <button v-for="employee in replacedEmployeeSuggestions" :key="employee.nik" type="button"
                      class="flex w-full items-center gap-3 px-3 py-2 text-left text-xs text-highlighted hover:bg-muted/10"
                      @click="selectReplacedEmployee(employee)">
                      <div
                        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 font-bold text-amber-700 dark:text-amber-400 text-[9px]">
                        {{employee.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}}
                      </div>
                      <div class="flex flex-col min-w-0">
                        <span class="font-semibold truncate">{{ employee.name }}</span>
                        <span class="text-[9px] text-muted">{{ employee.position || 'Staf' }} • NIK: {{ employee.nik
                        }}</span>
                      </div>
                    </button>
                    <p v-if="!replacedEmployeeSuggestions.length" class="px-3 py-2 text-xs text-muted">
                      Karyawan tidak ditemukan.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Nama Lowongan & Status Lowongan -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="mb-1 block text-xs font-semibold text-muted">Nama Lowongan / Posisi <span
                      class="text-danger">*</span></label>
                  <input v-model="form.title" required placeholder="Masukkan nama lowongan secara spesifik"
                    :class="formControlClass" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-semibold text-muted">Status Lowongan</label>
                  <select v-model="form.status" :class="formControlClass">
                    <option value="draft">Draft</option>
                    <option value="open">Open (Aktif)</option>
                    <option value="closed">Closed (Ditutup)</option>
                  </select>
                </div>
              </div>


              <!-- Atasan Langsung Search-Select -->
              <div class="relative">
                <label class="mb-1 block text-xs font-semibold text-muted">Atasan Langsung</label>
                <div class="flex items-center gap-1 bg-default border border-default rounded-md px-2.5 py-1">
                  <UIcon name="i-lucide-search" class="size-4 text-muted" />
                  <input v-model="supervisorSearch" placeholder="Cari nama karyawan atau NIK..."
                    class="w-full bg-transparent border-0 text-sm outline-none text-highlighted"
                    @focus="showSupervisorDropdown = true" @blur="onSupervisorBlur" />
                </div>

                <!-- Suggestions list -->
                <div v-if="showSupervisorDropdown && supervisorSearch.trim()"
                  class="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto rounded-md border border-default bg-default shadow-lg">
                  <button v-for="employee in supervisorSuggestions" :key="employee.nik" type="button"
                    class="flex w-full items-center gap-3 px-3 py-2 text-left text-xs text-highlighted hover:bg-muted/10"
                    @click="selectSupervisor(employee)">
                    <div
                      class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-[9px]">
                      {{
                        employee.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()
                      }}
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="font-semibold truncate">{{ employee.name }}</span>
                      <span class="text-[9px] text-muted">{{ employee.position || 'Staf' }} • NIK: {{ employee.nik
                      }}</span>
                    </div>
                  </button>
                  <div v-if="!supervisorSuggestions.length" class="p-3 text-center text-muted text-xs">
                    Karyawan aktif tidak ditemukan
                  </div>
                </div>

                <!-- Preview Card Atasan Langsung -->
                <div v-if="form.supervisor_nik"
                  class="mt-2 flex items-center justify-between p-2 rounded-lg border border-default bg-muted/10">
                  <div class="flex items-center gap-3">
                    <div
                      class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {{
                        form.supervisor_name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()
                      }}
                    </div>
                    <div class="flex flex-col">
                      <span class="text-xs font-semibold text-highlighted">{{
                        form.supervisor_name
                      }}</span>
                      <span class="text-[9px] text-muted">Atasan Langsung • NIK: {{ form.supervisor_nik }}</span>
                    </div>
                  </div>
                  <UButton color="danger" variant="ghost" size="xs" icon="i-lucide-trash-2" @click="removeSupervisor" />
                </div>
              </div>
            </div>


            <!-- KOLOM KANAN: Informasi Career Public, Kualifikasi & Benefit -->
            <div class="space-y-4">
              <!-- Informasi Career Public -->
              <div class="rounded-xl border border-dashed border-default bg-muted/10 p-4 space-y-4">
                <p class="text-[10px] font-semibold text-primary uppercase tracking-wider">
                  Informasi Lowongan
                </p>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="mb-1 block text-xs font-semibold text-muted">Tipe Pekerjaan</label>
                    <select v-model="form.employment_type" :class="formControlClass">
                      <option value="">Pilih tipe</option>
                      <option value="full_time">Penuh Waktu</option>
                      <option value="part_time">Paruh Waktu</option>
                      <option value="contract">Kontrak</option>
                      <option value="internship">Magang</option>
                    </select>

                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-semibold text-muted">Sistem Kerja</label>
                    <select v-model="form.workplace_type" :class="formControlClass">
                      <option value="">Pilih sistem</option>
                      <option value="onsite">On-site</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="remote">Remote</option>
                    </select>
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-semibold text-muted">Lokasi Kerja</label><input
                      v-model="form.location" maxlength="150" placeholder="Contoh: Jakarta Selatan"
                      :class="formControlClass" />
                  </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="mb-1 block text-xs font-semibold text-muted">Mulai Tayang</label><input
                      v-model="form.published_at" type="datetime-local" :class="formControlClass" />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-semibold text-muted">Berhenti Tayang</label><input
                      v-model="form.expires_at" type="datetime-local" :class="formControlClass" />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-semibold text-muted">Batas Lamaran</label><input
                      v-model="form.application_deadline" type="date" :class="formControlClass" />
                  </div>
                </div>
              </div>

              <!-- Kualifikasi & Benefit -->
              <div class="space-y-3">
                <div>
                  <label class="mb-1 block text-xs font-semibold text-muted">Kualifikasi</label><textarea
                    v-model="form.requirements" rows="3" placeholder="Satu poin per baris"
                    :class="formControlClass"></textarea>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-semibold text-muted">Benefit</label><textarea
                    v-model="form.benefits" rows="3" placeholder="Satu poin per baris"
                    :class="formControlClass"></textarea>
                </div>
              </div>
              <!-- Tanggung Jawab -->
              <div class="space-y-3">
                <div>
                  <label class="mb-1 block text-xs font-semibold text-muted">Tanggung Jawab</label><textarea
                    v-model="form.responsibilities" rows="3" placeholder="Satu poin per baris"
                    :class="formControlClass"></textarea>
                </div>
              </div>
            </div>
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
