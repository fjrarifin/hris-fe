<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { exportEmployees, getEmployees } from '../services/employeeService'
import { apiError } from '../utils/formatters'

const employees = ref([])
const loading = ref(false)
const errorMessage = ref('')
const search = ref('')
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
  { accessorKey: 'status', header: 'Status' },
  { id: 'action', header: 'Aksi' },
]

const filteredEmployees = computed(() => {
  const keyword = search.value.trim().toLowerCase()

  return employees.value
    .filter((employee) => {
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
      status: employee.status || 'NONAKTIF',
    }))
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
    const name = disposition.match(/filename="?([^"]+)"?/)?.[1] || 'Data_Karyawan.csv'
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

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  loadEmployees()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h2 class="text-2xl font-semibold text-highlighted">Data Karyawan</h2>
        <p class="mt-1 text-sm text-muted">Kelola data master karyawan HRIS.</p>
      </div>

      <div class="flex gap-2">
        <UButton
          label="Export Karyawan"
          icon="i-lucide-download"
          color="neutral"
          variant="outline"
          :loading="exporting"
          @click="downloadExport"
        />
        <UButton to="/employees/create" label="Tambah Karyawan" icon="i-lucide-user-plus" />
      </div>
    </div>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          class="w-full sm:max-w-md"
          placeholder="Cari NIK, nama, email, jabatan, atau departemen..."
        />
      </template>

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        title="Data tidak dapat dimuat"
        :description="errorMessage"
      />

      <UTable
        v-else
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
