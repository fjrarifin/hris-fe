<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import {
  cancelHrApproval,
  exportHrAttendance,
  getHrAttendance,
  getHrAttendanceOptions,
} from '../services/hrService'
import { apiError } from '../utils/formatters'

const route = useRoute()
const auth = useAuthStore()
const filters = reactive({
  start_date: typeof route.query.start_date === 'string' ? route.query.start_date : '',
  end_date: typeof route.query.end_date === 'string' ? route.query.end_date : '',
  departments: [],
  employee_niks: [],
})
const options = ref({ departments: [], employees: [] })
const departmentSearch = ref('')
const employeeSearch = ref('')
const departmentMenuOpen = ref(false)
const employeeMenuOpen = ref(false)
const data = ref(null)
const loadingOptions = ref(true)
const loading = ref(false)
const exporting = ref(false)
const page = ref(1)
const actingRow = ref('')
const message = ref('')
const errorMessage = ref('')
const exportItems = [
  {
    label: 'Export dengan breakdown per hari',
    description: 'Menampilkan kode pada setiap tanggal periode.',
    icon: 'i-lucide-table-properties',
    onSelect: () => downloadExport('detail'),
  },
  {
    label: 'Export rekap tanpa breakdown',
    description: 'Hanya identitas dan total periode.',
    icon: 'i-lucide-sheet',
    onSelect: () => downloadExport('summary'),
  },
]

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

function formatDuration(minutes) {
  return `${Math.floor(minutes / 60)} jam ${minutes % 60} menit`
}

function formatColumnDate(value) {
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(
    new Date(`${value}T00:00:00`),
  )
}

function dayColor(day) {
  if (day.has_approved_absence_conflict) return 'warning'
  if (day.status === 'M') return 'success'
  if (day.status === 'A') return 'error'
  if (['PH', 'C', 'S', 'I'].includes(day.status)) return 'info'
  return 'neutral'
}

function conflictDays(record) {
  return Object.values(record.days).filter((day) => day.has_approved_absence_conflict)
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
    data.value = (await getHrAttendance({ ...filters, page: requestedPage })).data
    page.value = data.value.pagination.current_page
  } catch (error) {
    data.value = null
    errorMessage.value = apiError(error, 'Rekap absensi tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function downloadExport(format) {
  exporting.value = true
  errorMessage.value = ''
  try {
    const response = await exportHrAttendance({ ...filters, format })
    const disposition = response.headers['content-disposition'] || ''
    const name = disposition.match(/filename="?([^"]+)"?/)?.[1] || 'Rekap_Absensi_HRD.xlsx'
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    errorMessage.value = apiError(error, 'Export data absensi gagal.')
  } finally {
    exporting.value = false
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

async function cancelApprovedAbsence(day) {
  const reason = window.prompt(`Alasan pembatalan ${day.approval_label}:`)
  if (!reason) return

  actingRow.value = `${day.approval_type}-${day.approval_id}`
  message.value = ''
  errorMessage.value = ''
  try {
    message.value = (
      await cancelHrApproval(day.approval_type, day.approval_id, { reason })
    ).data.message
    await load(page.value)
  } catch (error) {
    errorMessage.value = apiError(error, 'Pengajuan tidak dapat dibatalkan.')
  } finally {
    actingRow.value = ''
  }
}

onMounted(async () => {
  await loadOptions()

  if (filters.start_date && filters.end_date) {
    await load()
  }
})
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Absensi Karyawan</h2>
      <p class="mt-1 text-sm text-muted">
        Pilih periode lebih dahulu. Maksimal penarikan data adalah 60 hari.
      </p>
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />
    <UCard title="Filter Penarikan Absensi">
      <form class="space-y-4" @submit.prevent="load()">
        <div class="grid gap-4 lg:grid-cols-4">
          <label class="text-sm text-muted">
            Dari Tanggal
            <input
              v-model="filters.start_date"
              type="date"
              required
              class="mt-2 block rounded-lg border border-default bg-default p-2.5 text-highlighted"
            />
          </label>
          <label class="text-sm text-muted">
            Sampai Tanggal
            <input
              v-model="filters.end_date"
              type="date"
              required
              class="mt-2 block rounded-lg border border-default bg-default p-2.5 text-highlighted"
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
                <p v-if="!displayedDepartments.length" class="py-2 text-xs text-muted">
                  Departemen tidak ditemukan.
                </p>
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
                <p v-if="!displayedEmployees.length" class="py-2 text-xs text-muted">
                  Karyawan tidak ditemukan.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <UButton
            type="submit"
            label="Tarik Data Absensi"
            icon="i-lucide-search"
            :loading="loading"
          />
          <UDropdownMenu
            :items="exportItems"
            :disabled="!filters.start_date || !filters.end_date || exporting"
            :content="{ align: 'start', sideOffset: 8 }"
            :ui="{ content: 'w-72' }"
          >
            <UButton
              type="button"
              label="Export Excel"
              icon="i-lucide-download"
              trailing-icon="i-lucide-chevron-down"
              color="neutral"
              variant="outline"
              :disabled="!filters.start_date || !filters.end_date"
              :loading="exporting"
            />
          </UDropdownMenu>
          <p class="text-xs text-muted">Pilihan kosong berarti seluruh data pada cakupan filter.</p>
        </div>
      </form>
    </UCard>

    <template v-if="data">
      <UAlert
        v-if="data.summary.approved_absence_conflicts"
        color="warning"
        variant="subtle"
        title="Approval ketidakhadiran memiliki data scan"
        :description="`${data.summary.approved_absence_conflicts} tanggal approval PH, Cuti, Sakit, atau Izin memiliki scan. Kode ditampilkan sebagai M dan HRD dapat membatalkannya pada kolom aksi.`"
      />
      <!-- <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <UCard>
          <p class="text-sm text-muted">Total Hari Periode</p>
          <p class="mt-2 text-3xl font-semibold text-highlighted">
            {{ data.summary.period_days }}
          </p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">Total Kehadiran</p>
          <p class="mt-2 text-3xl font-semibold text-highlighted">
            {{ data.summary.total_attendance }}
          </p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">Total Lembur Terverifikasi</p>
          <p class="mt-2 text-3xl font-semibold text-highlighted">
            {{ formatDuration(data.summary.total_overtime_minutes) }}
          </p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">M pada Libur Nasional</p>
          <p class="mt-2 text-3xl font-semibold text-highlighted">
            {{ data.summary.national_holiday_attendance }}
          </p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">A pada Libur Nasional</p>
          <p class="mt-2 text-3xl font-semibold text-highlighted">
            {{ data.summary.national_holiday_alpha }}
          </p>
        </UCard>
      </div> -->

      <UCard title="Rekap Kehadiran Pivot">
        <p class="mb-4 text-xs text-muted">
          M = Masuk, A = Alfa, PH = Pengambilan Public Holiday, C = Cuti, S = Sakit, I = Izin. Hak
          PH mulai 27 Mei 2026 diperoleh jika karyawan masuk pada hari libur nasional; jatah
          sebelumnya tetap berlaku dalam masa 90 hari. PH dan Cuti yang disetujui dihitung 8 jam
          kerja. Target bulanan:
          {{ data.targets.ideal_attendance_days }} hari dan
          {{ data.targets.minimum_work_duration }}.
        </p>
        <div class="overflow-x-auto">
          <table class="min-w-max text-sm">
            <thead class="text-left text-muted">
              <tr>
                <th class="sticky left-0 z-20 min-w-32 bg-default p-3">NIK</th>
                <th class="sticky left-32 z-20 min-w-44 bg-default p-3">Nama Karyawan</th>
                <th class="min-w-36 p-3">Jabatan</th>
                <th class="min-w-36 p-3">Departemen</th>
                <th class="min-w-24 p-3">Unit</th>
                <th v-for="date in data.dates" :key="date" class="min-w-20 p-3 text-center">
                  {{ formatColumnDate(date) }}
                </th>
                <th class="min-w-32 p-3">Total Hari Periode</th>
                <th class="min-w-28 p-3">Total Kehadiran</th>
                <th class="min-w-40 p-3">Durasi Kerja</th>
                <th class="min-w-36 p-3">Total Lembur</th>
                <th class="min-w-20 p-3">M</th>
                <th class="min-w-20 p-3">A</th>
                <th class="min-w-20 p-3">PH</th>
                <th class="min-w-20 p-3">C</th>
                <th class="min-w-20 p-3">S</th>
                <th class="min-w-20 p-3">I</th>
                <th class="min-w-28 p-3">M Libur Nasional</th>
                <th class="min-w-28 p-3">A Libur Nasional</th>
                <th class="min-w-40 p-3">Aksi Konflik</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in data.records" :key="record.nik" class="border-t border-default">
                <td class="sticky left-0 z-10 bg-default p-3">{{ record.nik }}</td>
                <td class="sticky left-32 z-10 bg-default p-3 font-medium text-highlighted">
                  {{ record.name }}
                </td>
                <td class="p-3">{{ record.position }}</td>
                <td class="p-3">{{ record.department }}</td>
                <td class="p-3">{{ record.unit }}</td>
                <td
                  v-for="date in data.dates"
                  :key="`${record.nik}-${date}`"
                  class="p-3 text-center"
                >
                  <UBadge
                    :color="dayColor(record.days[date])"
                    variant="subtle"
                    :label="record.days[date].status"
                  />
                </td>
                <td class="p-3 font-medium text-highlighted">{{ record.total_period_days }}</td>
                <td class="p-3 font-medium text-highlighted">{{ record.total_attendance }}</td>
                <td class="p-3 font-medium text-highlighted">{{ record.total_work_duration }}</td>
                <td class="p-3 font-medium text-highlighted">{{ record.total_overtime }}</td>
                <td class="p-3 font-medium text-highlighted">{{ record.total_present }}</td>
                <td class="p-3 font-medium text-highlighted">{{ record.total_alpha }}</td>
                <td class="p-3 font-medium text-highlighted">{{ record.total_ph }}</td>
                <td class="p-3 font-medium text-highlighted">{{ record.total_leave }}</td>
                <td class="p-3 font-medium text-highlighted">{{ record.total_sick }}</td>
                <td class="p-3 font-medium text-highlighted">{{ record.total_permission }}</td>
                <td class="p-3 font-medium text-highlighted">
                  {{ record.total_national_holiday_attendance }}
                </td>
                <td class="p-3 font-medium text-highlighted">
                  {{ record.total_national_holiday_alpha }}
                </td>
                <td class="p-3">
                  <div
                    v-if="auth.user?.level === 2 && conflictDays(record).length"
                    class="space-y-2"
                  >
                    <UButton
                      v-for="day in conflictDays(record)"
                      :key="`${day.approval_type}-${day.approval_id}`"
                      size="xs"
                      color="error"
                      variant="soft"
                      :label="`Batalkan ${day.approval_label}`"
                      :loading="actingRow === `${day.approval_type}-${day.approval_id}`"
                      @click="cancelApprovedAbsence(day)"
                    />
                  </div>
                  <span v-else class="text-xs text-muted">-</span>
                </td>
              </tr>
              <tr v-if="!data.records.length">
                <td :colspan="data.dates.length + 18" class="p-8 text-center text-muted">
                  Tidak ada absensi pada periode ini.
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
    <UCard v-else-if="!loading">
      <p class="py-8 text-center text-sm text-muted">
        Data belum ditarik. Gunakan filter tanggal di atas.
      </p>
    </UCard>
  </section>
</template>
