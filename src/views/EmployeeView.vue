<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { exportEmployees, getEmployees } from '../services/employeeService'
import { apiError } from '../utils/formatters'

const employees = ref([])
const loading = ref(false)
const errorMessage = ref('')
const search = ref('')
const page = ref(1)
const exporting = ref(false)
const itemsPerPage = 10

const columns = [
  { accessorKey: 'nik', header: 'NIK' },
  { accessorKey: 'name', header: 'Nama' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'position', header: 'Jabatan' },
  { accessorKey: 'department', header: 'Departemen' },
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
      ].some((value) => value?.toLowerCase().includes(keyword))
    })
    .map((employee) => ({
      ...employee,
      email: employee.email || '-',
      position: employee.position || '-',
      department: employee.department || '-',
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

watch(search, () => {
  page.value = 1
})

onMounted(loadEmployees)
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
  </section>
</template>
