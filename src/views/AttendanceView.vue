<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import {
  cancelHrApproval,
  exportHrAttendance,
  getHrAttendance,
  getHrAttendanceOptions,
} from '../services/hrService'
import { apiError, formatDate } from '../utils/formatters'

const auth = useAuthStore()
const filters = reactive({ start_date: '', end_date: '', departments: [], employee_niks: [] })
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

function formatTime(value) {
  return value ? `${String(value).slice(0, 5)} WIB` : '-'
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

async function downloadExport() {
  exporting.value = true
  errorMessage.value = ''
  try {
    const response = await exportHrAttendance(filters)
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

async function cancelApprovedAbsence(record) {
  const reason = window.prompt(`Alasan pembatalan ${record.attendance_type}:`)
  if (!reason) return

  actingRow.value = `${record.approval_type}-${record.approval_id}`
  message.value = ''
  errorMessage.value = ''
  try {
    message.value = (
      await cancelHrApproval(record.approval_type, record.approval_id, { reason })
    ).data.message
    await load(page.value)
  } catch (error) {
    errorMessage.value = apiError(error, 'Pengajuan tidak dapat dibatalkan.')
  } finally {
    actingRow.value = ''
  }
}

onMounted(loadOptions)
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Absensi Karyawan</h2>
      <p class="mt-1 text-sm text-muted">
        Pilih periode lebih dahulu. Maksimal penarikan data adalah 60 hari.
      </p>
    </div>

    <UAlert v-if="message" color="success" variant="subtle" :description="message" />
    <UAlert v-if="errorMessage" color="error" variant="subtle" :description="errorMessage" />
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
          <UButton
            type="button"
            label="Export Excel"
            icon="i-lucide-download"
            color="neutral"
            variant="outline"
            :disabled="!filters.start_date || !filters.end_date"
            :loading="exporting"
            @click="downloadExport"
          />
          <p class="text-xs text-muted">Pilihan kosong berarti seluruh data pada cakupan filter.</p>
        </div>
      </form>
    </UCard>

    <template v-if="data">
      <UAlert
        v-if="data.summary.approved_absence_conflicts"
        color="warning"
        variant="subtle"
        title="Cuti / PH memiliki data scan"
        :description="`${data.summary.approved_absence_conflicts} baris Cuti atau PH yang sudah disetujui memiliki scan absensi. HRD dapat meninjau dan membatalkannya melalui tabel.`"
      />
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <UCard>
          <p class="text-sm text-muted">Karyawan Tertarik</p>
          <p class="mt-2 text-3xl font-semibold text-highlighted">
            {{ data.summary.total_employees }}
          </p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">Hari Cuti</p>
          <p class="mt-2 text-3xl font-semibold text-highlighted">
            {{ data.summary.leave_days }}
          </p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">Hari PH</p>
          <p class="mt-2 text-3xl font-semibold text-highlighted">
            {{ data.summary.public_holiday_days }}
          </p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">Total Kehadiran</p>
          <p class="mt-2 text-3xl font-semibold text-highlighted">
            {{ data.summary.total_attendance }}
          </p>
          <p class="mt-1 text-xs text-muted">Satu scan tetap dihitung hadir</p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">Tidak Scan Masuk</p>
          <p class="mt-2 text-3xl font-semibold text-highlighted">
            {{ data.summary.missing_scan_in }}
          </p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">Tidak Scan Keluar</p>
          <p class="mt-2 text-3xl font-semibold text-highlighted">
            {{ data.summary.missing_scan_out }}
          </p>
        </UCard>
      </div>

      <UCard title="Rekap Kehadiran">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-muted">
              <tr>
                <th class="p-3">Tanggal</th>
                <th class="p-3">NIK</th>
                <th class="p-3">Nama Karyawan</th>
                <th class="p-3">Jabatan</th>
                <th class="p-3">Departemen</th>
                <th class="p-3">Unit</th>
                <th class="p-3">Jam Masuk</th>
                <th class="p-3">Jam Keluar</th>
                <th class="p-3">Keterangan</th>
                <th class="p-3">Total Kehadiran</th>
                <th class="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="record in data.records"
                :key="`${record.nik}-${record.date}`"
                class="border-t border-default"
              >
                <td class="whitespace-nowrap p-3">{{ formatDate(record.date) }}</td>
                <td class="p-3">{{ record.nik }}</td>
                <td class="p-3 font-medium text-highlighted">{{ record.name }}</td>
                <td class="p-3">{{ record.position }}</td>
                <td class="p-3">{{ record.department }}</td>
                <td class="p-3">{{ record.unit }}</td>
                <td class="p-3">{{ formatTime(record.scan_in) }}</td>
                <td class="p-3">{{ formatTime(record.scan_out) }}</td>
                <td class="min-w-56 p-3">
                  <UBadge
                    :color="
                      record.has_approved_absence_conflict
                        ? 'warning'
                        : record.attendance_type === 'Hadir'
                          ? 'success'
                          : 'info'
                    "
                    variant="subtle"
                    :label="record.attendance_type"
                  />
                  <p v-if="record.note" class="mt-2 text-xs text-muted">{{ record.note }}</p>
                </td>
                <td class="p-3 font-medium text-highlighted">{{ record.attendance_total }}</td>
                <td class="p-3">
                  <UButton
                    v-if="auth.user?.level === 2 && record.has_approved_absence_conflict"
                    size="xs"
                    color="error"
                    variant="soft"
                    :label="`Batalkan ${record.attendance_type}`"
                    :loading="actingRow === `${record.approval_type}-${record.approval_id}`"
                    @click="cancelApprovedAbsence(record)"
                  />
                  <span v-else class="text-xs text-muted">-</span>
                </td>
              </tr>
              <tr v-if="!data.records.length">
                <td colspan="11" class="p-8 text-center text-muted">
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
            {{ data.pagination.total }} data
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
