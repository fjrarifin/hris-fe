<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { exportEmployees, getEmployees } from '../services/employeeService'
import { apiError } from '../utils/formatters'

const route = useRoute()
const employees = ref([])
const loading = ref(false)
const errorMessage = ref('')
const search = ref('')
const statusFilter = ref(
  ['AKTIF', 'NONAKTIF'].includes(route.query.status) ? route.query.status : 'all',
)
const departmentFilter = ref('all')
const sortBy = ref('nik')
const sortDirection = ref('asc')
const page = ref(1)
const exporting = ref(false)
const failedPhotos = ref([])
const selectedPhoto = ref(null)
const itemsPerPage = 10

const columns = [
  { accessorKey: 'nik', header: 'NIK' },
  { accessorKey: 'name', header: 'Nama' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'position', header: 'Jabatan' },
  { accessorKey: 'department', header: 'Departemen' },
  { accessorKey: 'join_date', header: 'Tanggal Bergabung' },
  { accessorKey: 'last_contract_end_date', header: 'Akhir Kontrak Terakhir' },
  { accessorKey: 'resign_date', header: 'Tanggal Resign' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'action', header: 'Aksi' },
]

const departments = computed(() =>
  [...new Set(employees.value.map((employee) => employee.departement?.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }),
  ),
)

const filteredEmployees = computed(() => {
  const keyword = search.value.trim().toLowerCase()

  return employees.value
    .filter((employee) => {
      if (statusFilter.value !== 'all' && employee.status !== statusFilter.value) {
        return false
      }

      if (departmentFilter.value !== 'all' && employee.departement?.trim() !== departmentFilter.value) {
        return false
      }

      if (!keyword) {
        return true
      }

      return [
        employee.nik,
        employee.name,
        employee.email,
        employee.position,
        employee.department,
        employee.status,
      ].some((value) => value?.toLowerCase().includes(keyword))
    })
    .map((employee) => ({
      ...employee,
      email: employee.email || '-',
      position: employee.position || '-',
      department: employee.department || '-',
      join_date: formatDate(employee.join_date),
      join_date_sort: employee.join_date || '',
      last_contract_end_date: formatDate(employee.last_contract_end_date),
      resign_date: formatDate(employee.resign_date),
      status: employee.status || 'NONAKTIF',
    }))
    .sort((a, b) => {
      const left = sortBy.value === 'join_date'
        ? (a.join_date_sort || '9999-12-31')
        : String(a[sortBy.value] ?? '')
      const right = sortBy.value === 'join_date'
        ? (b.join_date_sort || '9999-12-31')
        : String(b[sortBy.value] ?? '')
      const result = left.localeCompare(right, 'id', {
        sensitivity: 'base',
        numeric: true,
      })
      return result * (sortDirection.value === 'asc' ? 1 : -1) || String(a.nik ?? '').localeCompare(String(b.nik ?? ''), 'id', { numeric: true })
    })
})

const paginatedEmployees = computed(() => {
  const start = (page.value - 1) * itemsPerPage

  return filteredEmployees.value.slice(start, start + itemsPerPage)
})

const visibleRange = computed(() => {
  if (!filteredEmployees.value.length) {
    return '0 data'
  }

  const start = (page.value - 1) * itemsPerPage + 1
  const end = Math.min(page.value * itemsPerPage, filteredEmployees.value.length)

  return `${start}-${end} dari ${filteredEmployees.value.length} data`
})

function formatDate(value) {
  if (!value) return '-'

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

async function loadEmployees() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await getEmployees()
    const data = response.data.data ?? response.data
    employees.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Gagal mengambil data karyawan. Silakan coba kembali.'
  } finally {
    loading.value = false
  }
}

async function downloadExport() {
  exporting.value = true
  errorMessage.value = ''

  try {
    const response = await exportEmployees()
    const disposition = response.headers['content-disposition'] || ''
    const name = disposition.match(/filename="?([^"]+)"?/)?.[1] || 'Data_Karyawan.xlsx'
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    errorMessage.value = apiError(error, 'Export data karyawan gagal.')
  } finally {
    exporting.value = false
  }
}

function photoVisible(employee) {
  return employee.photo_url && !failedPhotos.value.includes(employee.nik)
}

function hideBrokenPhoto(nik) {
  if (!failedPhotos.value.includes(nik)) {
    failedPhotos.value = [...failedPhotos.value, nik]
  }
}

function openPhoto(employee) {
  selectedPhoto.value = employee
}

function closePhoto() {
  selectedPhoto.value = null
}

function hideBrokenSelectedPhoto() {
  if (selectedPhoto.value) {
    hideBrokenPhoto(selectedPhoto.value.nik)
  }

  closePhoto()
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    closePhoto()
  }
}

watch(search, () => {
  page.value = 1
})

watch([statusFilter, departmentFilter, sortBy, sortDirection], () => {
  page.value = 1
})

watch(
  () => route.query.status,
  (status) => {
    statusFilter.value = ['AKTIF', 'NONAKTIF'].includes(status) ? status : 'all'
  },
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  loadEmployees()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <section class="employee-page space-y-6 p-4 sm:p-6 lg:p-8">
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h2 class="text-2xl font-semibold text-highlighted">Data Karyawan</h2>
        <p class="mt-1 text-sm text-muted">Kelola data master karyawan HRIS. Export mencakup semua karyawan dan kolom data, tanpa mengikuti filter.</p>
      </div>

      <div class="employee-actions flex flex-wrap gap-2 sm:justify-end">
        <UButton
          label="Export Semua Karyawan (Excel)"
          icon="i-lucide-download"
          color="neutral"
          variant="outline"
          :loading="exporting"
          @click="downloadExport"
        />
        <UButton to="/employees/create" label="Tambah Karyawan" icon="i-lucide-user-plus" />
      </div>
    </div>

    <UCard class="employee-table-card">
      <template #header>
        <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <UInput
            v-model="search"
            class="w-full sm:max-w-md"
            placeholder="Cari NIK, nama, email, jabatan, atau departemen..."
          />
          <select
            v-model="statusFilter"
            class="rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted"
            aria-label="Filter status karyawan"
          >
            <option value="all">Semua Status</option>
            <option value="AKTIF">Aktif</option>
            <option value="NONAKTIF">Tidak Aktif</option>
          </select>
          <select
            v-model="departmentFilter"
            class="rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted"
            aria-label="Filter departemen"
          >
            <option value="all">Semua Departemen</option>
            <option v-for="department in departments" :key="department" :value="department">
              {{ department }}
            </option>
          </select>
          <select
            v-model="sortBy"
            class="rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted"
            aria-label="Urutkan berdasarkan"
          >
            <option value="nik">Urutkan: NIK</option>
            <option value="name">Urutkan: Nama</option>
            <option value="join_date">Urutkan: Tanggal Bergabung</option>
          </select>
          <select
            v-model="sortDirection"
            class="rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted"
            aria-label="Arah urutan"
          >
            <option value="asc">Menaik (A–Z / 0–9)</option>
            <option value="desc">Menurun (Z–A / 9–0)</option>
          </select>
        </div>
      </template>

      <AlertToastBridge :error="errorMessage" />

      <UTable
        v-if="!errorMessage"
        :data="paginatedEmployees"
        :columns="columns"
        :loading="loading"
        empty="Data karyawan tidak ditemukan."
      >
        <template #name-cell="{ row }">
          <div class="flex items-center gap-3">
            <button
              v-if="photoVisible(row.original)"
              type="button"
              :aria-label="`Lihat foto ${row.original.name}`"
              class="shrink-0 rounded-full transition hover:ring-2 hover:ring-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              @click="openPhoto(row.original)"
            >
              <img
                :src="row.original.photo_url"
                :alt="`Foto ${row.original.name}`"
                class="size-9 rounded-full object-cover"
                @error="hideBrokenPhoto(row.original.nik)"
              />
            </button>
            <UAvatar
              v-else
              :text="row.original.name?.slice(0, 2).toUpperCase()"
              color="primary"
              size="sm"
              class="shrink-0"
            />
            <span class="font-medium text-highlighted">{{ row.original.name }}</span>
          </div>
        </template>
        <template #action-cell="{ row }">
          <UButton
            :to="{ name: 'employee-detail', params: { nik: row.original.nik } }"
            label="Detail"
            size="xs"
            color="primary"
            variant="soft"
          />
        </template>
      </UTable>

      <div
        v-if="!errorMessage && filteredEmployees.length"
        class="mt-4 flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-4 sm:flex-row dark:border-gray-800"
      >
        <p class="text-sm text-muted">Menampilkan {{ visibleRange }}</p>

        <UPagination
          v-model:page="page"
          :total="filteredEmployees.length"
          :items-per-page="itemsPerPage"
          :sibling-count="1"
          show-controls
        />
      </div>
    </UCard>

    <Teleport to="body">
      <Transition name="photo-lightbox">
        <div
          v-if="selectedPhoto"
          class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-6 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          :aria-label="`Foto profil ${selectedPhoto.name}`"
          @click.self="closePhoto"
        >
          <div
            class="photo-frame relative rounded-[2rem] bg-gradient-to-br from-white via-blue-100 to-blue-500 p-1.5 shadow-2xl shadow-blue-950/40"
          >
            <img
              :src="selectedPhoto.photo_url"
              :alt="`Foto profil ${selectedPhoto.name}`"
              class="max-h-[78vh] w-[82vw] rounded-[1.65rem] bg-slate-900 object-cover sm:w-[min(33vw,32rem)]"
              @error="hideBrokenSelectedPhoto"
            />
            <button
              type="button"
              aria-label="Tutup foto"
              class="absolute -right-3 -top-3 flex size-9 items-center justify-center rounded-full border border-white/80 bg-slate-900 text-lg leading-none text-white shadow-lg transition hover:bg-blue-700"
              @click="closePhoto"
            >
              &times;
            </button>
            <p
              class="absolute inset-x-1.5 bottom-1.5 rounded-b-[1.65rem] bg-slate-950/60 px-4 py-3 text-sm font-medium text-white backdrop-blur-sm"
            >
              {{ selectedPhoto.name }}
            </p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
.employee-page :deep(h2) {
  color: var(--employee-text);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.025em;
}

.employee-page :deep(p.text-muted),
.employee-page :deep(.text-muted) {
  color: var(--employee-muted);
}

.employee-page :deep(.text-highlighted) {
  color: var(--employee-text);
}

.employee-page :deep(.rounded-lg.border-default.bg-default) {
  min-height: 38px;
  border-color: var(--employee-border);
  border-radius: 8px;
  background-color: var(--employee-surface);
  color: var(--employee-text);
  box-shadow: none;
}

.employee-page :deep(.rounded-lg.border-default.bg-default:focus) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px var(--employee-blue-soft);
  outline: none;
}

.employee-page :deep(.overflow-hidden.rounded-lg.border) {
  border-color: var(--employee-border);
  border-radius: 12px;
  background: var(--employee-surface);
  box-shadow: var(--employee-shadow);
}

.employee-page :deep(table thead th) {
  background: var(--employee-table-head);
  color: var(--employee-muted);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}

.employee-page :deep(table tbody td) {
  border-color: var(--employee-border);
  color: var(--employee-text);
  font-size: 0.8rem;
}

.employee-page :deep(table tbody tr:hover td) {
  background: var(--employee-row-hover);
}

.employee-page :deep(.border-t) {
  border-color: var(--employee-border);
}

@media (max-width: 640px) {
  .employee-page .employee-actions {
    width: 100%;
    flex-direction: column;
  }

  .employee-page .employee-actions > * {
    width: 100%;
  }
}

.photo-lightbox-enter-active,
.photo-lightbox-leave-active {
  transition: opacity 180ms ease;
}

.photo-lightbox-enter-active .photo-frame,
.photo-lightbox-leave-active .photo-frame {
  transition:
    transform 180ms ease,
    opacity 180ms ease;
}

.photo-lightbox-enter-from,
.photo-lightbox-leave-to {
  opacity: 0;
}

.photo-lightbox-enter-from .photo-frame,
.photo-lightbox-leave-to .photo-frame {
  opacity: 0;
  transform: scale(0.86);
}
</style>
