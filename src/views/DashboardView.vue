<script setup>
import { computed, onMounted, ref } from 'vue'
import StatCard from '../components/StatCard.vue'
import { getHrDashboard } from '../services/hrService'
import { getStaffDashboard, sendAbsenceCancellationNotification } from '../services/staffService'
import { useAuthStore } from '../stores/auth'
import { apiError, formatDate, statusColor, statusLabel } from '../utils/formatters'

const auth = useAuthStore()
const isStaff = computed(() => auth.user?.level === 3)
const isHr = computed(() => auth.user?.level === 2)
const dashboard = ref(null)
const hrDashboard = ref(null)
const loading = ref(false)
const message = ref('')
const errorMessage = ref('')
const selectedAttendanceDepartment = ref(null)
const attendanceSearch = ref('')
const selectedDailyStatus = ref(null)
const dailyStatusSearch = ref('')
const selectedSubordinateAction = ref(null)
const actingSubordinateAction = ref('')

const adminStatistics = [
  {
    title: 'Total Karyawan',
    value: '125',
    description: 'Karyawan aktif saat ini',
    badge: 'Aktif',
    color: 'primary',
  },
  {
    title: 'Hadir Hari Ini',
    value: '98',
    description: 'Data absensi sudah masuk',
    badge: '78%',
    color: 'success',
  },
  {
    title: 'Cuti Aktif',
    value: '7',
    description: 'Sedang dalam masa cuti',
    badge: 'Cuti',
    color: 'warning',
  },
  {
    title: 'Payroll',
    value: 'Ready',
    description: 'Periode bulan ini siap diproses',
    badge: 'Mei',
    color: 'info',
  },
]

const staffStatistics = computed(() => {
  if (!dashboard.value) {
    return []
  }

  const summary = dashboard.value.summary
  const period = dashboard.value.attendance_period

  return [
    {
      title: 'Total Hari Kerja',
      value: summary.working_days,
      description: `Sejak bergabung ${formatDate(dashboard.value.employee.join_date)}`,
      badge: 'Hari',
      color: 'primary',
    },
    {
      title: 'Kehadiran Periode Ini',
      value: summary.attendance_days,
      description: `${formatDate(period.start)} - ${formatDate(period.end)}`,
      badge: 'Hadir',
      color: 'success',
      to: '/staff/attendance',
    },
    {
      title: 'Saldo Cuti',
      value: summary.leave_balance,
      description: 'Saldo cuti yang masih tersedia',
      badge: 'Cuti',
      color: 'warning',
      to: '/staff/leave',
    },
    {
      title: 'Saldo PH',
      value: summary.public_holiday_balance,
      description: 'Public Holiday dapat diajukan',
      badge: 'PH',
      color: 'info',
      to: '/staff/public-holiday',
    },
  ]
})

const hrPrimaryStatistics = computed(() => {
  if (!hrDashboard.value) {
    return []
  }

  const summary = hrDashboard.value.summary
  const attendance = hrDashboard.value.attendance

  return [
    {
      title: 'Karyawan Aktif',
      value: summary.active_employees,
      description: 'Karyawan dengan status aktif saat ini',
      badge: 'Aktif',
      color: 'primary',
      to: { name: 'employees', query: { status: 'AKTIF' } },
    },
    {
      title: 'Kontrak Akan Habis',
      value: summary.expiring_contracts,
      description: 'Kontrak berakhir dalam dua bulan ke depan',
      badge: 'Kontrak',
      color: 'warning',
      to: { name: 'hr-contracts', query: { status: 'expiring_two_months' } },
    },
    {
      title: 'Hadir Hari Ini',
      value: summary.attendance_today,
      description: 'Karyawan terhubung yang melakukan scan hari ini',
      badge: attendance.unmapped_pin_count ? `${attendance.unmapped_pin_count} belum map` : 'Hadir',
      color: attendance.unmapped_pin_count ? 'warning' : 'success',
      to: {
        name: 'attendance',
        query: { start_date: hrDashboard.value.as_of_date, end_date: hrDashboard.value.as_of_date },
      },
    },
    {
      title: 'PH Hari Ini',
      value: summary.public_holiday_today,
      description: 'Pengambilan PH disetujui HR',
      badge: 'PH',
      color: 'info',
      clickable: true,
      modalType: 'ph',
    },
    {
      title: 'Cuti Hari Ini',
      value: summary.leave_today,
      description: 'Cuti yang telah disetujui HR',
      badge: 'Cuti',
      color: 'warning',
      clickable: true,
      modalType: 'leave',
    },
    {
      title: 'Izin Hari Ini',
      value: summary.permission_today,
      description: 'Izin yang telah disetujui HR',
      badge: 'Izin',
      color: 'neutral',
      clickable: true,
      modalType: 'permission',
    },
    {
      title: 'Sakit Hari Ini',
      value: summary.sick_today,
      description: 'Sakit yang telah disetujui HR',
      badge: 'Sakit',
      color: 'error',
      clickable: true,
      modalType: 'sick',
    },
  ]
})

const statistics = computed(() => {
  if (isStaff.value) {
    return staffStatistics.value
  }

  return adminStatistics
})

const displayedAttendanceEmployees = computed(() => {
  const keyword = attendanceSearch.value.trim().toLowerCase()
  const employees = selectedAttendanceDepartment.value?.employees || []

  return employees.filter((employee) => matchesEmployeeSearch(employee, keyword))
})

const dailyStatusModal = computed(() => {
  if (!hrDashboard.value || !selectedDailyStatus.value) {
    return null
  }

  return {
    ph: {
      title: 'PH Hari Ini',
      records: hrDashboard.value.public_holiday_today,
      empty: 'Tidak ada karyawan mengambil PH hari ini.',
    },
    leave: {
      title: 'Cuti Hari Ini',
      records: hrDashboard.value.leave_today,
      empty: 'Tidak ada karyawan cuti hari ini.',
    },
    permission: {
      title: 'Izin Hari Ini',
      records: hrDashboard.value.permission_today,
      empty: 'Tidak ada karyawan izin hari ini.',
    },
    sick: {
      title: 'Sakit Hari Ini',
      records: hrDashboard.value.sick_today,
      empty: 'Tidak ada karyawan sakit hari ini.',
    },
  }[selectedDailyStatus.value]
})

const displayedDailyStatusRecords = computed(() => {
  const keyword = dailyStatusSearch.value.trim().toLowerCase()

  return (dailyStatusModal.value?.records || []).filter((record) =>
    matchesEmployeeSearch(record, keyword),
  )
})

async function loadStaffDashboard() {
  loading.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const { data } = await getStaffDashboard()
    dashboard.value = data
  } catch (error) {
    errorMessage.value = apiError(error, 'Ringkasan dashboard tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function loadHrDashboard() {
  loading.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const { data } = await getHrDashboard()
    hrDashboard.value = data
  } catch (error) {
    errorMessage.value = apiError(error, 'Dashboard HR tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function loadDashboard() {
  if (isStaff.value) {
    await loadStaffDashboard()
  } else if (isHr.value) {
    await loadHrDashboard()
  }
}

function formatTime(value) {
  return value ? `${value.slice(0, 5)} WIB` : '-'
}

function subordinateAttendanceLabel(status) {
  return (
    {
      checked_out: 'Sudah Pulang',
      working: 'Sedang Bekerja',
      present: 'Sedang Bekerja',
      leave: 'Cuti',
      ph: 'PH',
      permission: 'Izin',
      sick: 'Sakit',
      off: 'Libur',
      missing_in: 'Scan Masuk Kosong',
      missing_out: 'Hadir tanpa scan pulang',
      not_present: 'Tidak Masuk',
      alpha: 'Alfa',
      absent: 'Tidak Masuk',
    }[status] || 'Tidak Hadir'
  )
}

function subordinateAttendanceColor(status) {
  return (
    {
      checked_out: 'success',
      working: 'success',
      present: 'success',
      leave: 'warning',
      ph: 'info',
      permission: 'neutral',
      sick: 'error',
      off: 'neutral',
      missing_in: 'warning',
      missing_out: 'warning',
      not_present: 'neutral',
      alpha: 'error',
      absent: 'error',
    }[status] || 'neutral'
  )
}

function subordinateAttendanceStatus(employee) {
  if (employee.scan_in && employee.scan_out) {
    return 'checked_out'
  }

  if (['leave', 'ph', 'permission', 'sick', 'off'].includes(employee.attendance_status)) {
    return employee.attendance_status
  }

  if (employee.scan_in) {
    return 'working'
  }

  if (employee.scan_out) {
    return 'missing_in'
  }

  return employee.attendance_status || 'not_present'
}

function weeklyAttendanceLabel(status) {
  return (
    {
      checked_out: 'Hadir',
      working: 'Sedang Bekerja',
      present: 'Sedang Bekerja',
      missing_in: 'Hadir tanpa scan masuk',
      missing_out: 'Hadir tanpa scan pulang',
      absent: 'Tidak Hadir',
      future: 'Belum Berjalan',
    }[status] || 'Tidak Hadir'
  )
}

function weeklyAttendanceColor(status) {
  return (
    {
      checked_out: 'success',
      working: 'success',
      present: 'success',
      missing_in: 'warning',
      missing_out: 'warning',
      absent: 'error',
      future: 'neutral',
    }[status] || 'neutral'
  )
}

function approvalTypeLabel(type) {
  return { leave: 'Cuti', ph: 'PH', permission: 'Izin / Sakit' }[type] || type
}

function openAttendanceDepartment(department) {
  selectedAttendanceDepartment.value = department
  attendanceSearch.value = ''
}

function closeAttendanceDepartment() {
  selectedAttendanceDepartment.value = null
  attendanceSearch.value = ''
}

function openDailyStatus(type) {
  if (!type) return

  selectedDailyStatus.value = type
  dailyStatusSearch.value = ''
}

function closeDailyStatus() {
  selectedDailyStatus.value = null
  dailyStatusSearch.value = ''
}

function matchesEmployeeSearch(employee, keyword) {
  if (!keyword) return true

  return [employee.nik, employee.name, employee.position, employee.department].some((value) =>
    value?.toLowerCase().includes(keyword),
  )
}

function dailyStatusDetail(record) {
  if (selectedDailyStatus.value === 'leave') {
    return record.leave_type
  }

  return selectedDailyStatus.value === 'ph'
    ? 'Public Holiday'
    : selectedDailyStatus.value === 'sick'
      ? 'Sakit'
      : 'Izin'
}

function openSubordinateAction(action) {
  selectedSubordinateAction.value = action
}

function closeSubordinateAction() {
  selectedSubordinateAction.value = null
}

function scheduleActionRoute(action) {
  return {
    name: 'staff-team-schedules',
    query: {
      start_date: action.date || dashboard.value?.as_of_date,
      end_date: action.date || dashboard.value?.as_of_date,
      employee_nik: action.employee_nik,
      autoload: '1',
    },
  }
}

async function notifyHrCancellation(action) {
  const reason =
    action.message || `${action.employee_name} tetap masuk kerja pada tanggal pengajuan.`

  actingSubordinateAction.value = action.key || `${action.approval_type}-${action.approval_id}`
  message.value = ''
  errorMessage.value = ''

  try {
    const response = await sendAbsenceCancellationNotification({
      type: action.approval_type,
      id: action.approval_id,
      reason,
    })
    message.value = response.data.message
  } catch (error) {
    errorMessage.value = apiError(error, 'Notifikasi ke HRD tidak dapat dikirim.')
  } finally {
    actingSubordinateAction.value = ''
  }
}

onMounted(loadDashboard)
</script>

<template>
  <section class="space-y-6">
    <UCard
      class="dashboard-hero overflow-hidden border border-blue-100 bg-linear-to-br from-white via-blue-50 to-blue-100"
    >
      <div class="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <p class="text-sm font-medium text-blue-700">
            {{ isHr ? 'Dashboard Operasional HR' : 'HRIS Dashboard' }}
          </p>
          <h2 class="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl">
            Selamat datang, {{ auth.user?.name }}
          </h2>
          <p v-if="isStaff" class="mt-3 max-w-xl text-sm text-slate-600 sm:text-base">
            Lihat kehadiran, saldo pengajuan, dan data diri Anda dari portal karyawan.
          </p>
          <p v-else-if="isHr" class="mt-3 max-w-xl text-sm text-slate-600 sm:text-base">
            Monitor kehadiran, ketidakhadiran, lembur, dan kontrak karyawan berdasarkan data aktual
            hari ini.
          </p>
          <p v-else class="mt-3 max-w-xl text-sm text-slate-600 sm:text-base">
            Pantau ringkasan data karyawan, absensi, cuti, dan payroll dari satu halaman.
          </p>
        </div>

        <UButton
          v-if="isStaff"
          to="/staff/profile"
          color="primary"
          variant="solid"
          label="Lihat Profil Saya"
        />
        <UButton
          v-else-if="auth.canAccess('employees')"
          to="/employees"
          color="primary"
          variant="solid"
          label="Lihat Karyawan"
        />
      </div>
    </UCard>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <div v-if="loading" class="py-12 text-center text-sm text-muted">Memuat ringkasan...</div>

    <div v-else-if="!isHr" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard v-for="statistic in statistics" :key="statistic.title" v-bind="statistic" />
    </div>

    <UCard
      v-if="isStaff && dashboard && dashboard.has_subordinates"
      :title="`Bawahan Langsung (${dashboard.subordinates_today.length})`"
      description="Status kehadiran bawahan berdasarkan scan absensi hari ini."
    >
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="employee in dashboard.subordinates_today"
          :key="employee.nik"
          class="rounded-xl border border-default p-4 text-sm"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate font-medium text-highlighted">{{ employee.name }}</p>
              <p class="mt-1 text-xs text-muted">{{ employee.nik }}</p>
            </div>
            <UBadge
              :color="subordinateAttendanceColor(subordinateAttendanceStatus(employee))"
              variant="subtle"
              :label="subordinateAttendanceLabel(subordinateAttendanceStatus(employee))"
            />
          </div>
          <p class="mt-3 text-muted">
            {{ employee.position }} - {{ employee.department }}
            <span v-if="employee.unit !== '-'"> / {{ employee.unit }}</span>
          </p>
          <div
            class="mt-3 flex items-start justify-between gap-8 rounded-lg border border-default/60 bg-elevated/35 px-3 py-2"
          >
            <div>
              <p class="text-xs text-muted">Masuk</p>
              <p class="mt-1 font-medium text-highlighted">{{ formatTime(employee.scan_in) }}</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-muted">Keluar</p>
              <p class="mt-1 font-medium text-highlighted">{{ formatTime(employee.scan_out) }}</p>
            </div>
          </div>
          <div
            v-if="employee.status_actions?.length"
            class="mt-3 flex flex-wrap items-center gap-2"
          >
            <template v-for="action in employee.status_actions" :key="action.key">
              <UButton
                v-if="action.type === 'edit_schedule'"
                size="xs"
                color="warning"
                variant="soft"
                icon="i-lucide-calendar-clock"
                :label="action.label"
                :to="scheduleActionRoute(action)"
              />
              <UButton
                v-else-if="action.type === 'notify_hr_cancellation'"
                size="xs"
                color="warning"
                variant="soft"
                icon="i-lucide-send"
                :label="action.label"
                :loading="actingSubordinateAction === action.key"
                @click="notifyHrCancellation(action)"
              />
            </template>
          </div>
        </div>
      </div>
    </UCard>

    <div
      v-if="selectedSubordinateAction"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Informasi koreksi status bawahan"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60"
        aria-label="Tutup informasi koreksi status"
        @click="closeSubordinateAction"
      ></button>
      <UCard class="relative w-full max-w-lg">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold text-highlighted">
              {{ selectedSubordinateAction.label }}
            </h3>
            <p class="mt-1 text-sm text-muted">
              {{ selectedSubordinateAction.employee_name }} -
              {{ selectedSubordinateAction.employee_nik }}
            </p>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            aria-label="Tutup"
            @click="closeSubordinateAction"
          />
        </div>
        <p class="mt-4 text-sm text-muted">{{ selectedSubordinateAction.message }}</p>
        <div class="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          <p class="font-medium text-highlighted">Langkah yang perlu dilakukan</p>
          <p class="mt-1 text-muted">
            Informasikan ke HRD untuk membatalkan pengajuan
            {{ selectedSubordinateAction.approval_label }} karyawan tersebut. Setelah dibatalkan,
            jatah akan kembali mengikuti status pembatalan.
          </p>
        </div>
        <div class="mt-5 flex justify-end">
          <UButton label="Mengerti" @click="closeSubordinateAction" />
        </div>
      </UCard>
    </div>

    <UCard
      v-if="isStaff && dashboard"
      title="Kehadiran Minggu Ini"
      :description="`${formatDate(dashboard.weekly_attendance.start_date)} - ${formatDate(dashboard.weekly_attendance.end_date)}. Total jam kerja sampai hari ini: ${dashboard.weekly_attendance.total_duration}.`"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">Tanggal</th>
              <th class="p-3">Status</th>
              <th class="p-3">Masuk</th>
              <th class="p-3">Keluar</th>
              <th class="p-3">Durasi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="day in dashboard.weekly_attendance.days"
              :key="day.date"
              class="border-t border-default"
            >
              <td class="p-3 font-medium text-highlighted">{{ formatDate(day.date) }}</td>
              <td class="p-3">
                <UBadge
                  :color="weeklyAttendanceColor(day.status)"
                  variant="subtle"
                  :label="weeklyAttendanceLabel(day.status)"
                />
              </td>
              <td class="p-3">{{ formatTime(day.scan_in) }}</td>
              <td class="p-3">{{ formatTime(day.scan_out) }}</td>
              <td class="p-3">{{ day.duration }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <UCard
      v-if="isStaff && dashboard && dashboard.has_subordinates"
      :title="`Approval Bawahan (${dashboard.pending_subordinate_approvals.length})`"
      description="Pengajuan bawahan langsung yang menunggu keputusan Anda."
    >
      <div v-if="dashboard.pending_subordinate_approvals.length" class="space-y-3">
        <div
          v-for="item in dashboard.pending_subordinate_approvals"
          :key="`${item.type}-${item.id}`"
          class="flex flex-col justify-between gap-3 rounded-xl border border-default p-4 text-sm sm:flex-row sm:items-center"
        >
          <div>
            <div class="flex items-center gap-2">
              <UBadge color="primary" variant="subtle" :label="approvalTypeLabel(item.type)" />
              <p class="font-medium text-highlighted">{{ item.employee_name }}</p>
            </div>
            <p class="mt-2 text-muted">
              {{ item.label }} - {{ formatDate(item.start_date) }}
              <span v-if="item.end_date">s.d. {{ formatDate(item.end_date) }}</span>
            </p>
          </div>
          <UButton to="/staff/approvals" label="Proses Approval" size="sm" variant="soft" />
        </div>
      </div>
      <div v-else class="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-muted">Tidak ada pengajuan yang menunggu approval Anda.</p>
        <UButton to="/staff/approvals" label="Buka Riwayat Approval" size="sm" variant="soft" />
      </div>
    </UCard>

    <div v-if="isHr && hrDashboard" class="space-y-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <StatCard
          v-for="statistic in hrPrimaryStatistics"
          :key="statistic.title"
          v-bind="statistic"
          @click="openDailyStatus(statistic.modalType)"
        />

        <UCard
          class="h-full"
          :title="`Lembur Hari Ini (${hrDashboard.overtime_today.length})`"
          description="Karyawan dengan pengajuan lembur aktif hari ini."
        >
          <div class="max-h-56 space-y-3 overflow-y-auto">
            <div
              v-for="item in hrDashboard.overtime_today"
              :key="item.id"
              class="rounded-lg border border-default p-3 text-sm"
            >
              <div class="flex items-start justify-between gap-2">
                <p class="font-medium text-highlighted">{{ item.name }}</p>
                <UBadge
                  :color="statusColor(item.status)"
                  variant="subtle"
                  :label="statusLabel(item.status)"
                />
              </div>
              <p class="mt-1 text-muted">{{ item.department }}</p>
              <p class="mt-2 text-muted">
                {{ formatTime(item.start_time) }} - {{ formatTime(item.end_time) }}
              </p>
            </div>
            <p v-if="!hrDashboard.overtime_today.length" class="py-3 text-sm text-muted">
              Tidak ada lembur hari ini.
            </p>
          </div>
        </UCard>
      </div>

      <UAlert
        v-if="hrDashboard.attendance.unmapped_pin_count"
        color="warning"
        variant="subtle"
        title="Pemetaan PIN absensi belum lengkap"
        :description="`${hrDashboard.attendance.unmapped_pin_count} PIN yang scan hari ini belum terhubung ke data karyawan dan belum dihitung dalam kartu Hadir Hari Ini. Hubungkan PIN agar kehadirannya masuk ringkasan.`"
      />

      <UCard
        title="Hadir per Departemen"
        description="Klik departemen untuk melihat karyawan yang hadir."
      >
        <div class="space-y-3">
          <button
            v-for="department in hrDashboard.attendance.by_department"
            :key="department.department"
            type="button"
            class="flex w-full items-center justify-between rounded-lg border border-default px-3 py-2 text-left transition hover:border-primary/50 hover:bg-elevated/50"
            @click="openAttendanceDepartment(department)"
          >
            <span class="text-sm text-highlighted">{{ department.department }}</span>
            <UBadge color="success" variant="subtle" :label="`${department.total} orang`" />
          </button>
          <p v-if="!hrDashboard.attendance.by_department.length" class="py-4 text-sm text-muted">
            Belum ada kehadiran yang terhubung ke data karyawan.
          </p>
        </div>
      </UCard>

      <div
        v-if="selectedAttendanceDepartment"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        :aria-label="`Karyawan hadir departemen ${selectedAttendanceDepartment.department}`"
      >
        <button
          type="button"
          class="absolute inset-0 bg-slate-950/60"
          aria-label="Tutup detail kehadiran departemen"
          @click="closeAttendanceDepartment"
        ></button>
        <UCard class="relative max-h-[80vh] w-full overflow-hidden lg:w-2/3">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold text-highlighted">
                Kehadiran {{ selectedAttendanceDepartment.department }}
              </h3>
              <p class="mt-1 text-sm text-muted">
                {{ selectedAttendanceDepartment.total }} karyawan hadir hari ini.
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              aria-label="Tutup"
              @click="closeAttendanceDepartment"
            />
          </div>
          <input
            v-model="attendanceSearch"
            type="search"
            placeholder="Cari nama, NIK, posisi, atau departemen..."
            class="mb-4 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
          />
          <div class="max-h-[60vh] overflow-y-auto">
            <table class="w-full text-sm">
              <thead class="sticky top-0 bg-default text-left text-muted">
                <tr>
                  <th class="p-3">Karyawan</th>
                  <th class="p-3">Posisi</th>
                  <th class="p-3">Masuk</th>
                  <th class="p-3">Pulang</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="employee in displayedAttendanceEmployees"
                  :key="employee.nik"
                  class="border-t border-default"
                >
                  <td class="p-3">
                    <p class="font-medium text-highlighted">{{ employee.name }}</p>
                    <p class="text-xs text-muted">{{ employee.nik }}</p>
                  </td>
                  <td class="p-3">{{ employee.position }}</td>
                  <td class="p-3">{{ formatTime(employee.scan_in) }}</td>
                  <td class="p-3">{{ formatTime(employee.scan_out) }}</td>
                </tr>
                <tr v-if="!displayedAttendanceEmployees.length">
                  <td colspan="4" class="p-6 text-center text-muted">Karyawan tidak ditemukan.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>

      <div
        v-if="dailyStatusModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        :aria-label="dailyStatusModal.title"
      >
        <button
          type="button"
          class="absolute inset-0 bg-slate-950/60"
          aria-label="Tutup detail status hari ini"
          @click="closeDailyStatus"
        ></button>
        <UCard class="relative max-h-[80vh] w-full overflow-hidden lg:w-2/3">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold text-highlighted">{{ dailyStatusModal.title }}</h3>
              <p class="mt-1 text-sm text-muted">
                {{ dailyStatusModal.records.length }} karyawan tercatat hari ini.
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              aria-label="Tutup"
              @click="closeDailyStatus"
            />
          </div>
          <input
            v-model="dailyStatusSearch"
            type="search"
            placeholder="Cari nama, NIK, posisi, atau departemen..."
            class="mb-4 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
          />
          <div class="max-h-[60vh] overflow-y-auto">
            <table class="w-full text-sm">
              <thead class="sticky top-0 bg-default text-left text-muted">
                <tr>
                  <th class="p-3">Karyawan</th>
                  <th class="p-3">Departemen</th>
                  <th class="p-3">Posisi</th>
                  <th class="p-3">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="record in displayedDailyStatusRecords"
                  :key="record.nik"
                  class="border-t border-default"
                >
                  <td class="p-3">
                    <p class="font-medium text-highlighted">{{ record.name }}</p>
                    <p class="text-xs text-muted">{{ record.nik }}</p>
                  </td>
                  <td class="p-3">{{ record.department }}</td>
                  <td class="p-3">{{ record.position }}</td>
                  <td class="p-3">{{ dailyStatusDetail(record) }}</td>
                </tr>
                <tr v-if="!displayedDailyStatusRecords.length">
                  <td colspan="4" class="p-6 text-center text-muted">
                    {{ dailyStatusModal.empty }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>
    </div>

    <div v-if="isStaff && dashboard" class="grid gap-4 lg:grid-cols-3">
      <UCard class="lg:col-span-2" title="Akses Cepat" description="Pengajuan personal Anda.">
        <div class="grid gap-3 sm:grid-cols-3">
          <UButton to="/staff/leave" color="neutral" variant="soft" label="Ajukan Cuti" block />
          <UButton
            to="/staff/public-holiday"
            color="neutral"
            variant="soft"
            label="Ajukan PH"
            block
          />
          <UButton
            to="/staff/permission"
            color="neutral"
            variant="soft"
            label="Ajukan Izin"
            block
          />
        </div>
      </UCard>

      <UCard title="Data Diri" description="Identitas karyawan Anda.">
        <p class="font-medium text-highlighted">{{ dashboard.employee.name }}</p>
        <p class="mt-1 text-sm text-muted">{{ dashboard.employee.nik }}</p>
        <p class="mt-3 text-sm text-muted">
          {{ dashboard.employee.position || '-' }} - {{ dashboard.employee.department || '-' }}
        </p>
      </UCard>
    </div>
  </section>
</template>
