<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  getHrAttendanceCorrections,
  saveHrAttendanceCorrection,
  autoCorrectHrPayrollProcessAttendance,
  getHrAttendanceOptions,
} from '../services/hrService'
import { askConfirmation } from '../utils/confirmDialog'
import { apiError, formatDate } from '../utils/formatters'

const route = useRoute()
const filters = reactive({
  start_date: '',
  end_date: '',
  q: '',
  status_filter: 'attention_only',
  departments: [],
  employee_niks: [],
})
const options = ref({ departments: [], employees: [] })
const departmentSearch = ref('')
const employeeSearch = ref('')
const departmentMenuOpen = ref(false)
const employeeMenuOpen = ref(false)
const loadingOptions = ref(true)
const data = ref(null)
const selected = ref(null)
const form = reactive({
  correction_type: 'time',
  corrected_scan_in: '',
  corrected_scan_out: '',
  public_holiday_id: '',
  extra_off_source: '',
  has_missing_attendance_form: false,
  notes: '',
})
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')

const autoCorrecting = ref([])
const autoCorrectingAll = ref(false)

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

async function loadOptions() {
  loadingOptions.value = true
  try {
    options.value = (await getHrAttendanceOptions()).data
  } catch (error) {
    errorMessage.value = apiError(error, 'Pilihan filter tidak dapat dimuat.')
  } finally {
    loadingOptions.value = false
  }
}

const hasIncompleteScans = computed(() => {
  return (data.value?.records || []).some(
    (record) => !record.is_resolved && record.has_incomplete_scan
  )
})

async function autoCorrectSingle(record) {
  const key = `${record.nik}|${record.date}`
  autoCorrecting.value.push(key)
  message.value = ''
  errorMessage.value = ''
  try {
    const response = await autoCorrectHrPayrollProcessAttendance({
      nik: record.nik,
      start_date: record.date,
      end_date: record.date,
    })
    message.value = response.data?.message || 'Koreksi otomatis berhasil.'
    await load(data.value?.pagination?.current_page || 1)
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengoreksi absensi otomatis.')
  } finally {
    autoCorrecting.value = autoCorrecting.value.filter((k) => k !== key)
  }
}

async function autoCorrectAll() {
  const confirmed = await askConfirmation({
    title: 'Konfirmasi Auto Koreksi Semua',
    description: 'Apakah Anda yakin ingin mengoreksi otomatis semua absensi "Lupa Scan" pada periode filter ini?',
    confirmLabel: 'Auto Koreksi Semua',
    color: 'warning',
  })
  if (!confirmed) return

  autoCorrectingAll.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const response = await autoCorrectHrPayrollProcessAttendance({
      nik: null,
      start_date: filters.start_date,
      end_date: filters.end_date,
    })
    message.value = response.data?.message || 'Koreksi massal berhasil.'
    await load(1)
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengoreksi semua absensi otomatis.')
  } finally {
    autoCorrectingAll.value = false
  }
}
const flattenedAuditLogs = computed(() =>
  (data.value?.audit_logs || []).flatMap((log) =>
    (log.changes || []).map((change, index) => ({
      id: `${log.id}-${change.field}-${index}`,
      date: formatDate(log.created_at),
      time: new Date(log.created_at).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      changed_by_name: log.changed_by_name,
      source_label: log.source_label,
      subject_label: log.subject_label,
      label: change.label,
      old: change.old,
      new: change.new,
    })),
  ),
)

function yesterdayDate() {
  const date = new Date()
  date.setDate(date.getDate() - 1)

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function formatTime(value) {
  return value ? `${value.slice(0, 5)} WIB` : '-'
}

function auditValue(value) {
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : '-'
  }

  return value === null || value === undefined || value === '' ? '-' : value
}

function findingLabel(record) {
  return record.finding
}

const isAbsenceCorrection = computed(() => ['leave', 'public_holiday', 'extra_off'].includes(form.correction_type))

function absenceTypeLabel(value) {
  return {
    time: 'Koreksi Jam Absen',
    leave: 'Cuti',
    public_holiday: 'PH',
    extra_off: 'Extra Off',
  }[value] || value
}

function clearAbsenceSelectors() {
  form.public_holiday_id = ''
  form.extra_off_source = ''
}

function handleCorrectionTypeChange() {
  if (isAbsenceCorrection.value) {
    form.corrected_scan_in = ''
    form.corrected_scan_out = ''
    form.has_missing_attendance_form = false
  }

  if (form.correction_type !== 'public_holiday') {
    form.public_holiday_id = ''
  }
  if (form.correction_type !== 'extra_off') {
    form.extra_off_source = ''
  }
}

function periodLabel() {
  if (!data.value) {
    return `${formatDate(filters.start_date)} - ${formatDate(filters.end_date)}`
  }

  return data.value.start_date === data.value.end_date
    ? formatDate(data.value.start_date)
    : `${formatDate(data.value.start_date)} - ${formatDate(data.value.end_date)}`
}

function selectRecord(record) {
  selected.value = record
  form.correction_type = record.correction?.correction_type || 'time'
  form.corrected_scan_in =
    record.correction?.corrected_scan_in?.slice(0, 5) || record.scan_in?.slice(0, 5) || ''
  form.corrected_scan_out =
    record.correction?.corrected_scan_out?.slice(0, 5) || record.scan_out?.slice(0, 5) || ''
  clearAbsenceSelectors()
  if (record.correction?.public_holiday_id) {
    form.public_holiday_id = String(record.correction.public_holiday_id)
  }
  if (record.correction?.extra_off_source_period_start && record.correction?.extra_off_source_period_end) {
    form.extra_off_source = `${record.correction.extra_off_source_period_start}|${record.correction.extra_off_source_period_end}`
  }
  form.has_missing_attendance_form = record.correction?.has_missing_attendance_form === true
  form.notes = record.correction?.notes || ''
  handleCorrectionTypeChange()
}

async function load(requestedPage = 1) {
  loading.value = true
  errorMessage.value = ''
  try {
    data.value = (
      await getHrAttendanceCorrections({
        start_date: filters.start_date,
        end_date: filters.end_date,
        q: filters.q || undefined,
        status_filter: filters.status_filter,
        departments: filters.departments.length ? filters.departments : undefined,
        employee_niks: filters.employee_niks.length ? filters.employee_niks : undefined,
        page: requestedPage,
      })
    ).data

    const requestedNik = String(route.query.nik || '')
    if (requestedNik) {
      const record = data.value.records.find((item) => item.nik === requestedNik)
      if (record) {
        selectRecord(record)
      }
    }
  } catch (error) {
    errorMessage.value = apiError(error, 'Data koreksi absensi tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function saveCorrection() {
  saving.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const response = await saveHrAttendanceCorrection(selected.value.nik, {
      attendance_date: selected.value.date,
      correction_type: form.correction_type,
      corrected_scan_in: form.correction_type === 'time' ? form.corrected_scan_in : null,
      corrected_scan_out: form.correction_type === 'time' ? form.corrected_scan_out : null,
      public_holiday_id: form.correction_type === 'public_holiday' ? form.public_holiday_id : null,
      extra_off_source_period_start:
        form.correction_type === 'extra_off' ? form.extra_off_source.split('|')[0] : null,
      extra_off_source_period_end:
        form.correction_type === 'extra_off' ? form.extra_off_source.split('|')[1] : null,
      has_missing_attendance_form: form.correction_type === 'time' && form.has_missing_attendance_form ? true : null,
      notes: form.notes || null,
    })
    message.value = response.data.message
    selectRecord(response.data.data)
    await load(data.value.pagination.current_page)
  } catch (error) {
    errorMessage.value = apiError(error, 'Koreksi absensi tidak dapat disimpan.')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await loadOptions()
  const date = String(route.query.date || '')
  filters.start_date = String(route.query.start_date || date || yesterdayDate())
  filters.end_date = String(route.query.end_date || date || filters.start_date)
  filters.q = String(route.query.nik || '')
  if (filters.q) {
    filters.status_filter = 'all'
  }
  load()
})
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Koreksi Absensi</h2>
      <p class="mt-1 text-sm text-muted">
        Lengkapi jam masuk/pulang, atau ubah hari menjadi Cuti, PH, atau Extra Off dengan pemakaian saldo karyawan.
      </p>
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <UCard title="Filter Data Koreksi Absensi">
      <form class="space-y-4" @submit.prevent="load(1)">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label class="text-sm text-muted">
            Tanggal Awal
            <input
              v-model="filters.start_date"
              type="date"
              required
              class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            />
          </label>
          <label class="text-sm text-muted">
            Tanggal Akhir
            <input
              v-model="filters.end_date"
              type="date"
              required
              class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            />
          </label>
          
          <!-- Department Select -->
          <div class="text-sm text-muted">
            Departemen
            <button
              type="button"
              class="mt-2 flex w-full items-center justify-between rounded-lg border border-default bg-default p-2.5 text-left text-highlighted"
              @click="departmentMenuOpen = !departmentMenuOpen"
            >
              <span class="truncate">{{ departmentSummary }}</span>
              <UIcon name="i-lucide-chevron-down" class="size-4 shrink-0" />
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
                  class="flex items-center gap-2 text-highlighted font-normal"
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

          <!-- Employee Select -->
          <div class="text-sm text-muted">
            Pilih Karyawan
            <button
              type="button"
              class="mt-2 flex w-full items-center justify-between rounded-lg border border-default bg-default p-2.5 text-left text-highlighted"
              :disabled="loadingOptions"
              @click="employeeMenuOpen = !employeeMenuOpen"
            >
              <span class="truncate">{{ employeeSummary }}</span>
              <UIcon name="i-lucide-chevron-down" class="size-4 shrink-0" />
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
                  class="flex items-start gap-2 text-highlighted font-normal"
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

          <label class="text-sm text-muted">
            Cari Nama / NIK (Direct)
            <input
              v-model="filters.q"
              type="search"
              placeholder="Nama atau NIK"
              class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            />
          </label>
          
          <label class="text-sm text-muted">
            Filter Status
            <select
              v-model="filters.status_filter"
              class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            >
              <option value="attention_only">Perlu Dicek</option>
              <option value="alpha_only">Hanya Alpha</option>
              <option value="incomplete_only">Scan Tidak Lengkap</option>
              <option value="all">Semua Status</option>
            </select>
          </label>
        </div>
        
        <div class="flex items-center gap-3">
          <UButton type="submit" label="Tampilkan" icon="i-lucide-search" :loading="loading" />
        </div>
      </form>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="font-semibold text-highlighted">Temuan Absensi - {{ periodLabel() }}</h3>
            <p class="text-xs text-muted">Daftar scan masuk atau pulang yang belum lengkap</p>
          </div>
          <UButton
            v-if="hasIncompleteScans"
            size="sm"
            color="warning"
            label="Auto Koreksi Semua"
            icon="i-lucide-wand-2"
            :loading="autoCorrectingAll"
            @click="autoCorrectAll"
          />
        </div>
      </template>
      <div v-if="loading && !data" class="py-10 text-center text-sm text-muted">
        Memuat temuan absensi...
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">Karyawan</th>
              <th class="p-3">Tanggal</th>
              <th class="p-3">Departemen</th>
              <th class="p-3">Scan Masuk</th>
              <th class="p-3">Scan Pulang</th>
              <th class="p-3">Durasi</th>
              <th class="p-3">Temuan</th>
              <th class="p-3">Status Absensi</th>
              <th class="p-3">Status Koreksi</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in data?.records || []"
              :key="`${record.date}|${record.nik}`"
              class="border-t border-default"
            >
              <td class="p-3">
                <p class="font-medium text-highlighted">{{ record.name }}</p>
                <p class="text-xs text-muted">{{ record.nik }} - {{ record.position }}</p>
              </td>
              <td class="p-3">{{ formatDate(record.date) }}</td>
              <td class="p-3">{{ record.department }}</td>
              <td class="p-3">{{ formatTime(record.scan_in) }}</td>
              <td class="p-3">{{ formatTime(record.scan_out) }}</td>
              <td class="p-3">{{ record.duration || '-' }}</td>
              <td class="p-3">{{ findingLabel(record) }}</td>
              <td class="p-3">
                <UBadge
                  v-if="record.status_code === 'M' || record.status_code === 'H'"
                  :color="record.status_code === 'M' ? 'danger' : 'warning'"
                  variant="subtle"
                  :label="record.status_label"
                />
                <UBadge
                  v-else
                  :color="['C', 'PH', 'EO'].includes(record.status_code) ? 'success' : 'info'"
                  variant="subtle"
                  :label="record.status_label"
                />
              </td>
              <td class="p-3">
                <UBadge
                  :color="record.is_resolved ? 'success' : 'warning'"
                  variant="subtle"
                  :label="record.is_resolved ? 'Sudah Dikoreksi' : 'Perlu Koreksi'"
                />
              </td>
              <td class="p-3">
                <div class="flex items-center gap-2">
                  <UButton
                    size="xs"
                    variant="soft"
                    :label="record.is_resolved ? 'Lihat / Edit' : 'Koreksi'"
                    @click="selectRecord(record)"
                  />
                  <UButton
                    v-if="!record.is_resolved && record.has_incomplete_scan"
                    size="xs"
                    color="warning"
                    variant="soft"
                    label="Auto Koreksi"
                    :loading="autoCorrecting.includes(`${record.nik}|${record.date}`)"
                    @click="autoCorrectSingle(record)"
                  />
                </div>
              </td>
            </tr>
            <tr v-if="!data?.records?.length">
              <td colspan="10" class="p-8 text-center text-muted">
                Tidak ada data absensi pada filter ini.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="data?.pagination.total > data?.pagination.per_page"
        class="mt-4 flex justify-end border-t border-default pt-4"
      >
        <UPagination
          :page="data.pagination.current_page"
          :total="data.pagination.total"
          :items-per-page="data.pagination.per_page"
          show-controls
          @update:page="load"
        />
      </div>
    </UCard>

    <UCard v-if="selected" :title="`Form Koreksi - ${selected.name}`">
      <form class="space-y-4" @submit.prevent="saveCorrection">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label class="text-sm text-muted">
            Tanggal Absensi
            <input
              :value="formatDate(selected.date)"
              disabled
              class="mt-2 block w-full rounded-lg border border-default bg-elevated p-2.5 text-muted"
            />
          </label>
          <label class="text-sm text-muted">
            Jenis Koreksi
            <select
              v-model="form.correction_type"
              class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
              @change="handleCorrectionTypeChange"
            >
              <option value="time">Koreksi Jam Absen</option>
              <option value="leave" :disabled="(selected.absence_options?.leave_balance || 0) < 1">
                Cuti - sisa {{ selected.absence_options?.leave_balance || 0 }}
              </option>
              <option value="public_holiday" :disabled="!selected.absence_options?.public_holidays?.length">
                PH
              </option>
              <option value="extra_off" :disabled="!selected.absence_options?.extra_off_sources?.length">
                Extra Off
              </option>
            </select>
          </label>
          <label class="text-sm text-muted">
            Scan Masuk Tercatat
            <input
              :value="formatTime(selected.raw_scan_in)"
              disabled
              class="mt-2 block w-full rounded-lg border border-default bg-elevated p-2.5 text-muted"
            />
          </label>
          <label class="text-sm text-muted">
            Scan Pulang Tercatat
            <input
              :value="formatTime(selected.raw_scan_out)"
              disabled
              class="mt-2 block w-full rounded-lg border border-default bg-elevated p-2.5 text-muted"
            />
          </label>
          <label class="text-sm text-muted">
            Koreksi Jam Masuk
            <input
              v-model="form.corrected_scan_in"
              type="time"
              :disabled="isAbsenceCorrection"
              :required="form.correction_type === 'time' && !selected.raw_scan_in"
              class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted disabled:bg-elevated disabled:text-muted"
            />
          </label>
          <label class="text-sm text-muted">
            Koreksi Jam Pulang
            <input
              v-model="form.corrected_scan_out"
              type="time"
              :disabled="isAbsenceCorrection"
              :required="form.correction_type === 'time' && !selected.raw_scan_out"
              class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted disabled:bg-elevated disabled:text-muted"
            />
          </label>
        </div>

        <div v-if="form.correction_type === 'public_holiday'" class="grid gap-4 sm:grid-cols-2">
          <label class="text-sm text-muted">
            Jatah PH yang Dipakai
            <select
              v-model="form.public_holiday_id"
              required
              class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            >
              <option value="" disabled>Pilih PH</option>
              <option
                v-for="holiday in selected.absence_options?.public_holidays || []"
                :key="holiday.id"
                :value="holiday.id"
              >
                {{ holiday.label }}
              </option>
            </select>
          </label>
        </div>

        <div v-if="form.correction_type === 'extra_off'" class="grid gap-4 sm:grid-cols-2">
          <label class="text-sm text-muted">
            Sumber Extra Off
            <select
              v-model="form.extra_off_source"
              required
              class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            >
              <option value="" disabled>Pilih sumber EO</option>
              <option
                v-for="source in selected.absence_options?.extra_off_sources || []"
                :key="`${source.source_period_start}|${source.source_period_end}`"
                :value="`${source.source_period_start}|${source.source_period_end}`"
              >
                {{ source.label }} - sisa {{ source.remaining_days }}
              </option>
            </select>
          </label>
        </div>

        <p v-if="isAbsenceCorrection" class="rounded-lg border border-default bg-elevated p-3 text-sm text-muted">
          Koreksi {{ absenceTypeLabel(form.correction_type) }} akan mengosongkan jam masuk dan jam pulang pada tanggal ini,
          lalu membuat pengajuan approved agar saldo karyawan ikut terpakai.
        </p>

        <label v-if="form.correction_type === 'time'" class="flex items-center gap-3 text-sm text-highlighted">
          <input v-model="form.has_missing_attendance_form" type="checkbox" class="size-4" />
          Karyawan sudah mengisi form tidak absen
        </label>

        <label class="block text-sm text-muted">
          Catatan Koreksi
          <textarea
            v-model="form.notes"
            rows="3"
            placeholder="Contoh: konfirmasi form tidak absen diterima HRD."
            class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
          ></textarea>
        </label>

        <UButton type="submit" label="Simpan Koreksi" icon="i-lucide-save" :loading="saving" />
      </form>
    </UCard>

    <UCard v-if="data" title="Riwayat Perubahan Koreksi Absensi">
      <template #header>
        <div>
          <h3 class="font-semibold text-highlighted">Riwayat Perubahan Koreksi Absensi</h3>
          <p class="mt-1 text-sm text-muted">
            Catatan perubahan koreksi absensi pada karyawan dan periode filter saat ini.
          </p>
        </div>
      </template>

      <div v-if="flattenedAuditLogs.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">Tanggal</th>
              <th class="p-3">Jam</th>
              <th class="p-3">Diubah Oleh</th>
              <th class="p-3">Data</th>
              <th class="p-3">Field</th>
              <th class="p-3">Sebelumnya</th>
              <th class="p-3">Menjadi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in flattenedAuditLogs" :key="log.id" class="border-t border-default">
              <td class="p-3 whitespace-nowrap">{{ log.date }}</td>
              <td class="p-3 whitespace-nowrap">{{ log.time }}</td>
              <td class="p-3 font-medium text-highlighted">{{ log.changed_by_name }}</td>
              <td class="p-3">{{ log.subject_label }}</td>
              <td class="p-3 font-medium text-highlighted">{{ log.label }}</td>
              <td class="p-3 text-muted">{{ auditValue(log.old) }}</td>
              <td class="p-3">{{ auditValue(log.new) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="py-8 text-center text-sm text-muted">
        Belum ada riwayat perubahan koreksi absensi pada filter ini.
      </p>
    </UCard>
  </section>
</template>
