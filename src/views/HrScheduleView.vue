<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import {
  downloadHrScheduleTemplate,
  getHrEmployeeSchedule,
  getHrScheduleOptions,
  getHrSchedules,
  saveHrEmployeeSchedule,
  uploadHrSchedule,
} from '../services/hrService'
import { apiError, formatDate } from '../utils/formatters'

const filters = reactive({ start_date: '', end_date: '', departments: [], employee_niks: [] })
const options = ref({ departments: [], employees: [] })
const departmentSearch = ref('')
const employeeSearch = ref('')
const departmentMenuOpen = ref(false)
const employeeMenuOpen = ref(false)
const data = ref(null)
const employeeSchedule = ref(null)
const uploadDepartment = ref('')
const file = ref(null)
const loadingOptions = ref(true)
const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const downloadingTemplate = ref(false)
const message = ref('')
const errorMessage = ref('')
const detailCard = ref(null)

const displayedDepartments = computed(() => {
  const keyword = departmentSearch.value.trim().toLowerCase()

  return options.value.departments.filter(
    (department) => !keyword || department.toLowerCase().includes(keyword),
  )
})

const eligibleEmployees = computed(() =>
  options.value.employees.filter(
    (employee) => !filters.departments.length || filters.departments.includes(employee.department),
  ),
)

const displayedEmployees = computed(() => {
  const keyword = employeeSearch.value.trim().toLowerCase()

  return eligibleEmployees.value.filter(
    (employee) =>
      !keyword ||
      employee.name.toLowerCase().includes(keyword) ||
      employee.nik.toLowerCase().includes(keyword) ||
      employee.department.toLowerCase().includes(keyword),
  )
})

const departmentSummary = computed(() =>
  filters.departments.length
    ? `${filters.departments.length} departemen dipilih`
    : 'Semua departemen',
)

const employeeSummary = computed(() =>
  filters.employee_niks.length
    ? `${filters.employee_niks.length} karyawan dipilih`
    : `Semua karyawan (${eligibleEmployees.value.length})`,
)

const scheduleCategories = computed(
  () => employeeSchedule.value?.categories ?? data.value?.categories ?? [],
)

const params = () => ({
  start_date: filters.start_date,
  end_date: filters.end_date,
  departments: filters.departments,
  employee_niks: filters.employee_niks,
})

async function loadOptions() {
  loadingOptions.value = true
  try {
    options.value = (await getHrScheduleOptions()).data
    uploadDepartment.value = options.value.departments[0] || ''
  } catch (error) {
    errorMessage.value = apiError(error, 'Pilihan filter jadwal tidak dapat dimuat.')
  } finally {
    loadingOptions.value = false
  }
}

async function load() {
  loading.value = true
  message.value = ''
  errorMessage.value = ''
  employeeSchedule.value = null

  try {
    data.value = (await getHrSchedules(params())).data
  } catch (error) {
    data.value = null
    errorMessage.value = apiError(error, 'Data jadwal karyawan tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

function selectAllDepartments() {
  filters.departments = []
  filters.employee_niks = []
}

function updateDepartments() {
  filters.employee_niks = []
}

function selectAllEmployees() {
  filters.employee_niks = []
}

async function openEmployee(nik) {
  errorMessage.value = ''
  try {
    employeeSchedule.value = (await getHrEmployeeSchedule(nik, params())).data
    await nextTick()
    detailCard.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } catch (error) {
    errorMessage.value = apiError(error, 'Detail jadwal karyawan tidak dapat dimuat.')
  }
}

async function saveSchedule() {
  saving.value = true
  errorMessage.value = ''
  const nik = employeeSchedule.value.employee.nik

  try {
    const response = await saveHrEmployeeSchedule(nik, {
      start_date: filters.start_date,
      end_date: filters.end_date,
      schedules: employeeSchedule.value.dates,
    })
    await load()
    await openEmployee(nik)
    message.value = response.data.message
  } catch (error) {
    errorMessage.value = apiError(error, 'Jadwal tidak dapat disimpan.')
  } finally {
    saving.value = false
  }
}

function chooseFile(event) {
  file.value = event.target.files[0] || null
}

function scheduleTime(category) {
  if (!category.start_time || !category.end_time) return 'Tanpa jam kerja'

  return `${String(category.start_time).slice(0, 5)} - ${String(category.end_time).slice(0, 5)}`
}

function categoryOption(category) {
  return `${category.code} - ${category.name} (${scheduleTime(category)})`
}

async function downloadTemplate() {
  downloadingTemplate.value = true
  errorMessage.value = ''

  try {
    const response = await downloadHrScheduleTemplate({
      start_date: filters.start_date,
      end_date: filters.end_date,
      department: uploadDepartment.value,
    })
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = `Template_Jadwal_${uploadDepartment.value}_${filters.start_date}_${filters.end_date}.csv`
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    errorMessage.value = apiError(error, 'Template jadwal tidak dapat diunduh.')
  } finally {
    downloadingTemplate.value = false
  }
}

async function upload() {
  const payload = new FormData()
  payload.append('department', uploadDepartment.value)
  payload.append('start_date', filters.start_date)
  payload.append('end_date', filters.end_date)
  payload.append('file', file.value)
  uploading.value = true
  errorMessage.value = ''

  try {
    const response = await uploadHrSchedule(payload)
    file.value = null
    await load()
    message.value = response.data.message
  } catch (error) {
    errorMessage.value = apiError(error, 'Upload jadwal tidak dapat diproses.')
  } finally {
    uploading.value = false
  }
}

watch(
  () => [...filters.departments],
  (departments) => {
    if (departments.length === 1) uploadDepartment.value = departments[0]
  },
)

onMounted(loadOptions)
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Jadwal Karyawan</h2>
      <p class="mt-1 text-sm text-muted">
        Pilih periode dan karyawan yang akan dikelola. Periode maksimal 46 hari.
      </p>
    </div>
    <AlertToastBridge :message="message" :error="errorMessage" />

    <UCard title="Filter Jadwal Karyawan">
      <form class="space-y-4" @submit.prevent="load">
        <div class="grid gap-4 lg:grid-cols-4">
          <label class="text-sm text-muted">
            Dari Tanggal
            <input
              v-model="filters.start_date"
              type="date"
              required
              class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            />
          </label>
          <label class="text-sm text-muted">
            Sampai Tanggal
            <input
              v-model="filters.end_date"
              type="date"
              required
              class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            />
          </label>
          <div class="text-sm text-muted">
            Departemen
            <button
              type="button"
              class="mt-2 flex w-full items-center justify-between rounded-lg border border-default bg-default p-2.5 text-left text-highlighted"
              @click="departmentMenuOpen = !departmentMenuOpen"
            >
              <span>{{ departmentSummary }}</span>
              <UIcon name="i-lucide-chevron-down" class="size-4" />
            </button>
            <div
              v-if="departmentMenuOpen"
              class="mt-2 rounded-xl border border-default bg-default p-3 shadow-xl"
            >
              <input
                v-model="departmentSearch"
                placeholder="Cari departemen..."
                class="mb-3 w-full rounded-lg border border-default bg-default p-2 text-highlighted"
              />
              <label class="mb-2 flex items-center gap-2 text-highlighted">
                <input
                  type="checkbox"
                  :checked="!filters.departments.length"
                  @change="selectAllDepartments"
                />
                Semua departemen
              </label>
              <div class="max-h-52 space-y-2 overflow-auto border-t border-default pt-2">
                <label
                  v-for="department in displayedDepartments"
                  :key="department"
                  class="flex items-center gap-2 text-highlighted"
                >
                  <input
                    v-model="filters.departments"
                    type="checkbox"
                    :value="department"
                    @change="updateDepartments"
                  />
                  {{ department }}
                </label>
              </div>
            </div>
          </div>
          <div class="text-sm text-muted">
            Karyawan
            <button
              type="button"
              class="mt-2 flex w-full items-center justify-between rounded-lg border border-default bg-default p-2.5 text-left text-highlighted"
              :disabled="loadingOptions"
              @click="employeeMenuOpen = !employeeMenuOpen"
            >
              <span>{{ employeeSummary }}</span>
              <UIcon name="i-lucide-chevron-down" class="size-4" />
            </button>
            <div
              v-if="employeeMenuOpen"
              class="mt-2 rounded-xl border border-default bg-default p-3 shadow-xl"
            >
              <input
                v-model="employeeSearch"
                placeholder="Cari nama atau NIK..."
                class="mb-3 w-full rounded-lg border border-default bg-default p-2 text-highlighted"
              />
              <label class="mb-2 flex items-center gap-2 text-highlighted">
                <input
                  type="checkbox"
                  :checked="!filters.employee_niks.length"
                  @change="selectAllEmployees"
                />
                Semua karyawan
              </label>
              <div class="max-h-64 space-y-2 overflow-auto border-t border-default pt-2">
                <label
                  v-for="employee in displayedEmployees"
                  :key="employee.nik"
                  class="flex items-start gap-2 text-highlighted"
                >
                  <input
                    v-model="filters.employee_niks"
                    type="checkbox"
                    :value="employee.nik"
                    class="mt-1"
                  />
                  <span>
                    {{ employee.name }} ({{ employee.nik }})
                    <span class="block text-xs text-muted">{{ employee.department }}</span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
        <UButton type="submit" label="Cari Jadwal" icon="i-lucide-search" :loading="loading" />
      </form>
    </UCard>

    <UCard v-if="data" title="Daftar Jadwal Karyawan">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">NIK</th>
              <th class="p-3">Nama Karyawan</th>
              <th class="p-3">Jabatan</th>
              <th class="p-3">Departemen</th>
              <th class="p-3">Unit</th>
              <th class="p-3">Total Hari</th>
              <th class="p-3">Jadwal Terisi</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="employee in data.employees"
              :key="employee.nik"
              class="border-t border-default"
            >
              <td class="p-3">{{ employee.nik }}</td>
              <td class="p-3 font-medium text-highlighted">{{ employee.name }}</td>
              <td class="p-3">{{ employee.position }}</td>
              <td class="p-3">{{ employee.department }}</td>
              <td class="p-3">{{ employee.unit }}</td>
              <td class="p-3">{{ employee.total_period_days }}</td>
              <td class="p-3">{{ employee.scheduled_days }}</td>
              <td class="p-3">
                <UButton
                  size="xs"
                  variant="soft"
                  label="Detail / Edit"
                  @click="openEmployee(employee.nik)"
                />
              </td>
            </tr>
            <tr v-if="!data.employees.length">
              <td colspan="8" class="p-8 text-center text-muted">
                Tidak ada karyawan pada filter yang dipilih.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <UCard
      v-if="data && options.departments.length"
      title="Upload Jadwal via Template (Per Departemen)"
    >
      <p class="mb-3 text-sm text-muted">
        Departemen wajib dipilih agar file hanya dapat mengubah jadwal karyawan pada departemen
        tersebut. Ini mencegah NIK dari departemen lain ikut terubah karena salah unggah file.
      </p>
      <ol class="mb-5 list-decimal space-y-1 pl-5 text-sm text-muted">
        <li>Pilih departemen yang akan diatur, lalu unduh template sesuai periode filter.</li>
        <li>Isi kolom tanggal dengan kode jadwal, misalnya P0, M1, S1, C, O, atau PH.</li>
        <li>
          Upload kembali file CSV tersebut. Baris dengan NIK di luar departemen akan dilewati.
        </li>
      </ol>
      <form class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="upload">
        <label class="text-sm text-muted">
          Departemen
          <select
            v-model="uploadDepartment"
            required
            class="mt-2 block rounded-lg border border-default bg-default p-2.5 text-highlighted"
          >
            <option v-for="department in options.departments" :key="department" :value="department">
              {{ department }}
            </option>
          </select>
        </label>
        <label class="text-sm text-muted">
          File Template yang Sudah Diisi
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            required
            class="mt-2 block rounded-lg border border-default bg-default p-2 text-highlighted"
            @change="chooseFile"
          />
        </label>
        <UButton
          type="button"
          color="neutral"
          variant="outline"
          icon="i-lucide-download"
          label="Unduh Template CSV"
          :loading="downloadingTemplate"
          @click="downloadTemplate"
        />
        <UButton type="submit" label="Upload Jadwal" :disabled="!file" :loading="uploading" />
      </form>
    </UCard>

    <UCard v-if="scheduleCategories.length" title="Panduan Kode Jadwal">
      <p class="mb-4 text-sm text-muted">
        Gunakan kode berikut pada dropdown edit atau pada kolom tanggal dalam template upload.
      </p>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="category in scheduleCategories"
          :key="category.code"
          class="rounded-lg border border-default p-3"
        >
          <p class="font-medium text-highlighted">{{ category.code }} - {{ category.name }}</p>
          <p class="mt-1 text-sm text-muted">{{ scheduleTime(category) }}</p>
        </div>
      </div>
    </UCard>

    <div v-if="employeeSchedule" ref="detailCard">
      <UCard :title="`Detail Jadwal - ${employeeSchedule.employee.name}`">
        <form @submit.prevent="saveSchedule">
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label
              v-for="date in employeeSchedule.dates"
              :key="date.date"
              class="text-sm text-muted"
            >
              {{ formatDate(date.date) }}
              <select
                v-model="date.code"
                class="mt-2 w-full rounded-lg border border-default bg-default p-2 text-highlighted"
              >
                <option value="">Belum ditentukan</option>
                <option
                  v-for="category in employeeSchedule.categories"
                  :key="category.code"
                  :value="category.code"
                >
                  {{ categoryOption(category) }}
                </option>
              </select>
            </label>
          </div>
          <UButton type="submit" label="Simpan Jadwal Karyawan" class="mt-5" :loading="saving" />
        </form>
      </UCard>
    </div>
  </section>
</template>
