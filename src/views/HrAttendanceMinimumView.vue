<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  exportHrAttendanceMinimumMonitoring,
  getHrAttendanceMinimumMonitoring,
  getHrAttendanceOptions,
  notifyHrAttendanceMinimumEmployee,
  notifyHrAttendanceMinimumEmployees,
} from '../services/hrService'
import { apiError, formatDate } from '../utils/formatters'

const currentMonth = new Date().toISOString().slice(0, 7)
const filters = reactive({
  period_month: currentMonth,
  departments: [],
  employee_niks: [],
  employee_status: 'AKTIF',
})
const options = ref({ departments: [], employees: [] })
const data = ref(null)
const loadingOptions = ref(true)
const loading = ref(false)
const exporting = ref(false)
const bulkNotifying = ref(false)
const page = ref(1)
const message = ref('')
const errorMessage = ref('')
const actingNik = ref('')
const departmentSearch = ref('')
const employeeSearch = ref('')
const departmentMenuOpen = ref(false)
const employeeMenuOpen = ref(false)
const tableFilters = reactive({
  result_status: 'all',
  search: '',
})
const tablePerPage = 15

const displayedDepartments = computed(() => {
  const keyword = departmentSearch.value.trim().toLowerCase()

  return options.value.departments.filter(
    (department) => !keyword || department.toLowerCase().includes(keyword),
  )
})

const eligibleEmployees = computed(() =>
  options.value.employees.filter(
    (employee) =>
      (!filters.departments.length || filters.departments.includes(employee.department)) &&
      (!filters.employee_status || employee.status === filters.employee_status),
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

const filteredRecords = computed(() => {
  const keyword = tableFilters.search.trim().toLowerCase()
  const records = data.value?.records || []

  return records.filter((record) => {
    const matchStatus =
      tableFilters.result_status === 'all' || record.status === tableFilters.result_status
    const matchKeyword =
      !keyword ||
      [record.nik, record.name, record.position, record.department, record.unit].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(keyword),
      )

    return matchStatus && matchKeyword
  })
})

const tablePagination = computed(() => {
  const total = filteredRecords.value.length
  const lastPage = Math.max(Math.ceil(total / tablePerPage), 1)
  const currentPage = Math.min(page.value, lastPage)

  return {
    current_page: currentPage,
    per_page: tablePerPage,
    total,
    last_page: lastPage,
    from: total ? (currentPage - 1) * tablePerPage + 1 : 0,
    to: Math.min(currentPage * tablePerPage, total),
  }
})

const paginatedRecords = computed(() => {
  const start = (tablePagination.value.current_page - 1) * tablePerPage

  return filteredRecords.value.slice(start, start + tablePerPage)
})

const filteredDurationShortRecords = computed(() =>
  filteredRecords.value.filter((record) => record.work_duration_diff_minutes < 0),
)

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

function updateEmployeeStatus() {
  filters.employee_niks = []
}

async function loadOptions() {
  loadingOptions.value = true
  try {
    options.value = (await getHrAttendanceOptions()).data
  } catch (error) {
    errorMessage.value = apiError(error, 'Pilihan filter absensi tidak dapat dimuat.')
  } finally {
    loadingOptions.value = false
  }
}

async function load(requestedPage = 1) {
  loading.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    data.value = (
      await getHrAttendanceMinimumMonitoring({
        ...filters,
        per_page: 'all',
        page: requestedPage,
      })
    ).data
    page.value = 1
  } catch (error) {
    data.value = null
    errorMessage.value = apiError(error, 'Monitoring minimum absensi tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function downloadExport() {
  exporting.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const response = await exportHrAttendanceMinimumMonitoring({
      ...filters,
      result_status: tableFilters.result_status,
      search: tableFilters.search,
    })
    const disposition = response.headers['content-disposition'] || ''
    const name =
      disposition.match(/filename="?([^"]+)"?/)?.[1] ||
      `Monitoring_Minimum_Absensi_${filters.period_month}.xlsx`
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    errorMessage.value = apiError(error, 'Export monitoring minimum gagal.')
  } finally {
    exporting.value = false
  }
}

async function notifyEmployee(record) {
  actingNik.value = record.nik
  message.value = ''
  errorMessage.value = ''

  try {
    message.value = (
      await notifyHrAttendanceMinimumEmployee({
        period_month: filters.period_month,
        nik: record.nik,
      })
    ).data.message
  } catch (error) {
    errorMessage.value = apiError(error, 'Notifikasi karyawan tidak dapat dikirim.')
  } finally {
    actingNik.value = ''
  }
}

async function notifyFilteredDurationShortEmployees() {
  const employeeNiks = filteredDurationShortRecords.value.map((record) => record.nik)
  if (!employeeNiks.length) return

  bulkNotifying.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    message.value = (
      await notifyHrAttendanceMinimumEmployees({
        period_month: filters.period_month,
        employee_niks: employeeNiks,
      })
    ).data.message
  } catch (error) {
    errorMessage.value = apiError(error, 'Notifikasi massal tidak dapat dikirim.')
  } finally {
    bulkNotifying.value = false
  }
}

watch(
  () => [tableFilters.result_status, tableFilters.search],
  () => {
    page.value = 1
  },
)

onMounted(async () => {
  await loadOptions()
  await load()
})
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Monitoring Minimum Absensi</h2>
      <p class="mt-1 text-sm text-muted">
        Pantau total hari dan durasi kerja karyawan dalam periode payroll tanggal 25 sampai 24.
      </p>
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <UCard title="Filter Periode Payroll">
      <form class="space-y-4" @submit.prevent="load()">
        <div class="grid gap-4 lg:grid-cols-5">
          <label class="text-sm text-muted">
            Periode Payroll
            <input
              v-model="filters.period_month"
              type="month"
              required
              class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            />
            <span class="mt-1 block text-xs text-muted">
              Contoh periode Mei: 25 April - 24 Mei.
            </span>
          </label>
          <label class="text-sm text-muted">
            Status Karyawan
            <select
              v-model="filters.employee_status"
              class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
              @change="updateEmployeeStatus"
            >
              <option value="">Semua status</option>
              <option value="AKTIF">Aktif</option>
              <option value="NONAKTIF">Tidak aktif</option>
            </select>
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
          <div class="text-sm text-muted lg:col-span-2">
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
                    <span class="block text-xs text-muted">
                      {{ employee.department }} - {{ employee.status }}
                    </span>
                  </span>
                </label>
                <p v-if="!displayedEmployees.length" class="py-2 text-xs text-muted">
                  Karyawan tidak ditemukan.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <UButton type="submit" label="Cari Data" icon="i-lucide-search" :loading="loading" />
          <UButton
            type="button"
            color="neutral"
            variant="outline"
            icon="i-lucide-download"
            label="Export Data"
            :disabled="!data || exporting"
            :loading="exporting"
            @click="downloadExport"
          />
        </div>
      </form>
    </UCard>

    <template v-if="data">
      <div class="grid gap-4 sm:grid-cols-3">
        <UCard>
          <p class="text-sm text-muted">Total Karyawan</p>
          <p class="mt-2 text-3xl font-semibold text-highlighted">
            {{ data.summary.total_employees }}
          </p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">Kurang Target</p>
          <p class="mt-2 text-3xl font-semibold text-warning">{{ data.summary.under_target }}</p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">Memenuhi / Lebih</p>
          <p class="mt-2 text-3xl font-semibold text-success">{{ data.summary.met_target }}</p>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <h3 class="font-semibold text-highlighted">
                Rekap Minimum Periode {{ data.filters.period_label }}
              </h3>
              <p class="mt-1 text-sm text-muted">
                {{ formatDate(data.filters.start_date) }} - {{ formatDate(data.filters.end_date) }}.
                Target {{ data.targets.ideal_attendance_days }} hari dan
                {{ data.targets.minimum_work_duration }}.
              </p>
            </div>
            <div class="grid gap-3 sm:grid-cols-3 xl:min-w-[42rem]">
              <label class="text-sm text-muted">
                Filter Status
                <select
                  v-model="tableFilters.result_status"
                  class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
                >
                  <option value="all">Semua data</option>
                  <option value="under">Kurang target</option>
                  <option value="met">Memenuhi / lebih</option>
                </select>
              </label>
              <label class="text-sm text-muted">
                Cari Data
                <input
                  v-model="tableFilters.search"
                  type="search"
                  placeholder="Nama, NIK, jabatan..."
                  class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
                />
              </label>
              <div class="flex items-end">
                <UButton
                  type="button"
                  :label="`Kirim Notif Massal (${filteredDurationShortRecords.length})`"
                  icon="i-lucide-send"
                  color="warning"
                  variant="soft"
                  :disabled="!filteredDurationShortRecords.length || bulkNotifying"
                  :loading="bulkNotifying"
                  block
                  @click="notifyFilteredDurationShortEmployees"
                />
              </div>
            </div>
          </div>
        </template>

        <div class="overflow-x-auto">
          <table class="min-w-max text-sm">
            <thead class="text-left text-muted">
              <tr>
                <th class="sticky left-0 z-20 min-w-32 bg-default p-3">NIK</th>
                <th class="sticky left-32 z-20 min-w-52 bg-default p-3">Nama Karyawan</th>
                <th class="p-3">Jabatan</th>
                <th class="p-3">Departemen</th>
                <th class="p-3">Unit</th>
                <th class="p-3">Status Karyawan</th>
                <th class="p-3">Total Hari</th>
                <th class="p-3">Selisih Hari</th>
                <th class="p-3">Durasi Kerja</th>
                <th class="p-3">Selisih Durasi</th>
                <th class="p-3">Total Lembur</th>
                <th class="p-3">Status</th>
                <th class="sticky right-0 z-20 min-w-40 bg-default p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="record in paginatedRecords"
                :key="record.nik"
                class="border-t border-default"
              >
                <td class="sticky left-0 z-10 bg-default p-3">{{ record.nik }}</td>
                <td class="sticky left-32 z-10 bg-default p-3 font-medium text-highlighted">
                  {{ record.name }}
                </td>
                <td class="p-3">{{ record.position }}</td>
                <td class="p-3">{{ record.department }}</td>
                <td class="p-3">{{ record.unit }}</td>
                <td class="p-3">
                  <UBadge
                    :color="record.employee_status === 'AKTIF' ? 'success' : 'neutral'"
                    variant="subtle"
                    :label="record.employee_status === 'AKTIF' ? 'Aktif' : 'Tidak aktif'"
                  />
                </td>
                <td class="p-3 font-medium text-highlighted">{{ record.total_attendance }}</td>
                <td class="p-3">
                  <UBadge
                    :color="record.attendance_diff < 0 ? 'warning' : 'success'"
                    variant="subtle"
                    :label="record.attendance_diff_label"
                  />
                </td>
                <td class="p-3 font-medium text-highlighted">{{ record.total_work_duration }}</td>
                <td class="p-3">
                  <UBadge
                    :color="record.work_duration_diff_minutes < 0 ? 'warning' : 'success'"
                    variant="subtle"
                    :label="record.work_duration_diff"
                  />
                </td>
                <td class="p-3">{{ record.total_overtime }}</td>
                <td class="p-3">
                  <UBadge
                    :color="record.status === 'under' ? 'warning' : 'success'"
                    variant="subtle"
                    :label="record.status_label"
                  />
                </td>
                <td class="sticky right-0 z-10 bg-default p-3">
                  <UButton
                    v-if="record.can_notify"
                    size="xs"
                    color="warning"
                    variant="soft"
                    icon="i-lucide-send"
                    label="Kirim Notif"
                    :loading="actingNik === record.nik"
                    @click="notifyEmployee(record)"
                  />
                  <span v-else class="text-xs text-muted">-</span>
                </td>
              </tr>
              <tr v-if="!filteredRecords.length">
                <td colspan="13" class="p-8 text-center text-muted">
                  Tidak ada data pada periode ini.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          v-if="tablePagination.total"
          class="mt-4 flex flex-col items-center justify-between gap-3 border-t border-default pt-4 sm:flex-row"
        >
          <p class="text-sm text-muted">
            Menampilkan {{ tablePagination.from }}-{{ tablePagination.to }} dari
            {{ tablePagination.total }} karyawan
          </p>
          <UPagination
            :page="page"
            :total="tablePagination.total"
            :items-per-page="tablePagination.per_page"
            :sibling-count="1"
            show-controls
            @update:page="page = $event"
          />
        </div>
      </UCard>
    </template>
  </section>
</template>
