<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import {
  cancelHrApproval,
  exportHrAttendance,
  getHrAttendance,
  getHrAttendanceOptions,
} from '../services/hrService'
import { apiError } from '../utils/formatters'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const filters = reactive({
  start_date: typeof route.query.start_date === 'string' ? route.query.start_date : '',
  end_date: typeof route.query.end_date === 'string' ? route.query.end_date : '',
  departments: [],
  employee_niks: [],
  employee_status: '',
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
const detailRecord = ref(null)
const message = ref('')
const errorMessage = ref('')
const exportItems = [
  {
    label: 'Export lengkap per hari',
    description: 'Status, jam masuk, jam pulang, durasi, dan keterangan per tanggal.',
    icon: 'i-lucide-file-spreadsheet',
    onSelect: () => downloadExport('full'),
  },
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
  if (day.status === 'M' && day.needs_attention) return 'warning'
  if (day.has_approved_absence_conflict) return 'warning'
  if (day.status === 'M') return 'success'
  if (day.status === 'A') return 'error'
  if (['PH', 'EO', 'C', 'S', 'I'].includes(day.status)) return 'info'
  return 'neutral'
}

function conflictDays(record) {
  return Object.values(record.days).filter((day) => day.has_approved_absence_conflict)
}

const detailDays = computed(() =>
  detailRecord.value ? Object.values(detailRecord.value.days) : [],
)

const attentionDays = computed(() =>
  detailDays.value.filter((day) => day.needs_attention || day.has_approved_absence_conflict),
)

function formatTime(value) {
  return value ? `${value.slice(0, 5)} WIB` : '-'
}

function detailNote(day) {
  if (day.status === 'S' && day.has_document === false) return 'Sakit tanpa surat, dihitung alfa.'
  if (day.status === 'S' && day.has_document === true) return 'Sakit dengan surat.'
  if (day.note) return day.note
  if (day.needs_attention) {
    return [
      day.has_incomplete_scan ? 'Scan tidak lengkap' : '',
      day.is_under_daily_target ? 'Durasi kurang dari 8 jam' : '',
    ]
      .filter(Boolean)
      .join(', ')
  }

  return '-'
}

function openDetail(record) {
  detailRecord.value = record
}

function openCorrection(day) {
  if (!detailRecord.value) return

  router.push({
    name: 'hr-attendance-corrections',
    query: {
      date: day.date,
      nik: detailRecord.value.nik,
    },
  })
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

async function updateEmployeeStatusFilter() {
  if (!data.value) return

  await load(1)
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
        :description="`${data.summary.approved_absence_conflicts} tanggal approval PH, EO, Cuti, Sakit, atau Izin memiliki scan. Kode ditampilkan sebagai M dan HRD dapat membatalkannya pada kolom aksi.`"
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

      <UCard>
        <template #header>
          <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h3 class="font-semibold text-highlighted">Rekap Kehadiran Pivot</h3>
              <p class="mt-1 text-sm text-muted">
                Data hasil penarikan absensi berdasarkan filter di atas.
              </p>
            </div>
            <label class="text-sm text-muted">
              Status Karyawan
              <select
                v-model="filters.employee_status"
                class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted lg:w-48"
                @change="updateEmployeeStatusFilter"
              >
                <option value="">Semua status</option>
                <option value="AKTIF">Aktif</option>
                <option value="NONAKTIF">Tidak aktif</option>
              </select>
            </label>
          </div>
        </template>
        <p class="mb-4 text-xs text-muted">
          M = Masuk, A = Alfa, PH = Pengambilan Public Holiday, EO = Extra Off, C = Cuti, S = Sakit,
          I = Izin. Badge M berwarna kuning jika scan tidak lengkap atau durasi kerja kurang dari 8
          jam. Sakit dengan surat dihitung sebagai kehadiran, sedangkan sakit tanpa surat masuk
          hitungan alfa. Hak PH mulai 27 Mei 2026 diperoleh jika karyawan masuk pada hari libur
          nasional; jatah sebelumnya tetap berlaku dalam masa 90 hari. PH, EO, Cuti, dan Sakit
          dengan surat yang disetujui dihitung 8 jam kerja. Target bulanan:
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
                <th class="min-w-20 p-3">EO</th>
                <th class="min-w-20 p-3">C</th>
                <th class="min-w-32 p-3">S Surat</th>
                <th class="min-w-36 p-3">S Tanpa Surat</th>
                <th class="min-w-20 p-3">I</th>
                <th class="min-w-28 p-3">M Libur Nasional</th>
                <th class="min-w-28 p-3">A Libur Nasional</th>
                <th class="min-w-40 p-3">Aksi Konflik</th>
                <th class="min-w-24 p-3 text-right">Detail</th>
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
                    :title="detailNote(record.days[date])"
                  />
                </td>
                <td class="p-3 font-medium text-highlighted">{{ record.total_period_days }}</td>
                <td class="p-3 font-medium text-highlighted">{{ record.total_attendance }}</td>
                <td class="p-3 font-medium text-highlighted">{{ record.total_work_duration }}</td>
                <td class="p-3 font-medium text-highlighted">{{ record.total_overtime }}</td>
                <td class="p-3 font-medium text-highlighted">{{ record.total_present }}</td>
                <td class="p-3 font-medium text-highlighted">{{ record.total_alpha }}</td>
                <td class="p-3 font-medium text-highlighted">{{ record.total_ph }}</td>
                <td class="p-3 font-medium text-highlighted">{{ record.total_eo || 0 }}</td>
                <td class="p-3 font-medium text-highlighted">{{ record.total_leave }}</td>
                <td class="p-3 font-medium text-highlighted">
                  {{ record.total_sick_with_document || 0 }}
                </td>
                <td class="p-3 font-medium text-highlighted">
                  {{ record.total_sick_without_document || 0 }}
                </td>
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
                <td class="p-3 text-right">
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="soft"
                    icon="i-lucide-list-search"
                    label="Detail"
                    @click="openDetail(record)"
                  />
                </td>
              </tr>
              <tr v-if="!data.records.length">
                <td :colspan="data.dates.length + 21" class="p-8 text-center text-muted">
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

    <div
      v-if="detailRecord"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="detailRecord = null"
    >
      <div class="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-lg bg-default shadow-2xl">
        <div
          class="flex flex-col gap-3 border-b border-default p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h3 class="font-semibold text-highlighted">Detail Absensi - {{ detailRecord.name }}</h3>
            <p class="mt-1 text-sm text-muted">
              {{ detailRecord.nik }} - {{ detailRecord.department }}.
              {{ attentionDays.length }} tanggal perlu dicek.
            </p>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            aria-label="Tutup detail"
            @click="detailRecord = null"
          />
        </div>
        <div class="max-h-[72vh] overflow-auto p-4">
          <table class="w-full min-w-[920px] text-sm">
            <thead class="text-left text-muted">
              <tr>
                <th class="p-3">Tanggal</th>
                <th class="p-3">Status</th>
                <th class="p-3">Scan Masuk</th>
                <th class="p-3">Scan Pulang</th>
                <th class="p-3">Durasi</th>
                <th class="p-3">Keterangan</th>
                <th class="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="day in detailDays"
                :key="`${detailRecord.nik}-detail-${day.date}`"
                class="border-t border-default"
                :class="day.needs_attention ? 'bg-warning/5' : ''"
              >
                <td class="p-3">{{ formatColumnDate(day.date) }}</td>
                <td class="p-3">
                  <UBadge :color="dayColor(day)" variant="subtle" :label="day.status" />
                </td>
                <td class="p-3">{{ formatTime(day.scan_in) }}</td>
                <td class="p-3">{{ formatTime(day.scan_out) }}</td>
                <td class="p-3">
                  {{ day.duration_label || formatDuration(day.duration_minutes || 0) }}
                </td>
                <td class="p-3">
                  <span :class="day.needs_attention ? 'font-medium text-warning' : 'text-muted'">
                    {{ detailNote(day) }}
                  </span>
                </td>
                <td class="p-3 text-right">
                  <UButton
                    v-if="day.status === 'M' || day.status === 'A'"
                    size="xs"
                    variant="soft"
                    icon="i-lucide-pencil"
                    label="Koreksi"
                    @click="openCorrection(day)"
                  />
                  <span v-else class="text-xs text-muted">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>
