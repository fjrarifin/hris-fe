<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  getHrAttendanceMinimumMonitoring,
  getHrAttendanceOptions,
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
const page = ref(1)
const errorMessage = ref('')
const departmentSearch = ref('')
const employeeSearch = ref('')
const departmentMenuOpen = ref(false)
const employeeMenuOpen = ref(false)

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
  errorMessage.value = ''

  try {
    data.value = (await getHrAttendanceMinimumMonitoring({ ...filters, page: requestedPage })).data
    page.value = data.value.pagination.current_page
  } catch (error) {
    data.value = null
    errorMessage.value = apiError(error, 'Monitoring minimum absensi tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

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

    <AlertToastBridge :error="errorMessage" />

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
        <UButton type="submit" label="Cari Data" icon="i-lucide-search" :loading="loading" />
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
          <div>
            <h3 class="font-semibold text-highlighted">Rekap Minimum Periode {{ data.filters.period_label }}</h3>
            <p class="mt-1 text-sm text-muted">
              {{ formatDate(data.filters.start_date) }} - {{ formatDate(data.filters.end_date) }}.
              Target {{ data.targets.ideal_attendance_days }} hari dan
              {{ data.targets.minimum_work_duration }}.
            </p>
          </div>
        </template>

        <div class="overflow-x-auto">
          <table class="w-full min-w-max text-sm">
            <thead class="text-left text-muted">
              <tr>
                <th class="p-3">NIK</th>
                <th class="p-3">Nama Karyawan</th>
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
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in data.records" :key="record.nik" class="border-t border-default">
                <td class="p-3">{{ record.nik }}</td>
                <td class="p-3 font-medium text-highlighted">{{ record.name }}</td>
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
              </tr>
              <tr v-if="!data.records.length">
                <td colspan="12" class="p-8 text-center text-muted">
                  Tidak ada data pada periode ini.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          v-if="data.pagination.total"
          class="mt-4 flex flex-col items-center justify-between gap-3 border-t border-default pt-4 sm:flex-row"
        >
          <p class="text-sm text-muted">
            Menampilkan {{ data.pagination.from }}-{{ data.pagination.to }} dari
            {{ data.pagination.total }} karyawan
          </p>
          <UPagination
            :page="page"
            :total="data.pagination.total"
            :items-per-page="data.pagination.per_page"
            :sibling-count="1"
            show-controls
            @update:page="load"
          />
        </div>
      </UCard>
    </template>
  </section>
</template>
