<script setup>
import { computed, onMounted, ref } from 'vue'
import StatCard from '../components/StatCard.vue'
import { getHrDashboard } from '../services/hrService'
import { getStaffDashboard } from '../services/staffService'
import { useAuthStore } from '../stores/auth'
import { apiError, formatDate, statusColor, statusLabel } from '../utils/formatters'

const auth = useAuthStore()
const isStaff = computed(() => auth.user?.level === 3)
const isHr = computed(() => auth.user?.level === 2)
const dashboard = ref(null)
const hrDashboard = ref(null)
const loading = ref(false)
const errorMessage = ref('')
const incompleteAttendancePage = ref(1)
const incompleteAttendanceItemsPerPage = 10

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
    },
    {
      title: 'Hadir Hari Ini',
      value: summary.attendance_today,
      description: 'Karyawan terhubung yang melakukan scan hari ini',
      badge: attendance.unmapped_pin_count ? `${attendance.unmapped_pin_count} belum map` : 'Hadir',
      color: attendance.unmapped_pin_count ? 'warning' : 'success',
    },
  ]
})

const hrAbsenceStatistics = computed(() => {
  if (!hrDashboard.value) {
    return []
  }

  const summary = hrDashboard.value.summary

  return [
    {
      title: 'PH Hari Ini',
      value: summary.public_holiday_today,
      description: 'Pengambilan PH disetujui HR',
      badge: 'PH',
      color: 'info',
    },
    {
      title: 'Cuti Hari Ini',
      value: summary.leave_today,
      description: 'Cuti yang telah disetujui HR',
      badge: 'Cuti',
      color: 'warning',
    },
  ]
})

const statistics = computed(() => {
  if (isStaff.value) {
    return staffStatistics.value
  }

  return adminStatistics
})

const incompleteAttendanceRecords = computed(
  () => hrDashboard.value?.yesterday_incomplete_attendance.records || [],
)

const paginatedIncompleteAttendance = computed(() => {
  const start = (incompleteAttendancePage.value - 1) * incompleteAttendanceItemsPerPage

  return incompleteAttendanceRecords.value.slice(start, start + incompleteAttendanceItemsPerPage)
})

async function loadStaffDashboard() {
  loading.value = true
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
  errorMessage.value = ''

  try {
    const { data } = await getHrDashboard()
    hrDashboard.value = data
    incompleteAttendancePage.value = 1
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

function missingScanLabel(record) {
  return record.missing_scan_in ? 'Tidak absen masuk' : 'Tidak absen pulang'
}

function subordinateAttendanceLabel(status) {
  return (
    {
      checked_out: 'Sudah Pulang',
      present: 'Sedang Masuk',
      missing_in: 'Scan Masuk Kosong',
      absent: 'Belum Masuk',
    }[status] || 'Belum Masuk'
  )
}

function subordinateAttendanceColor(status) {
  return (
    {
      checked_out: 'success',
      present: 'success',
      missing_in: 'warning',
      absent: 'neutral',
    }[status] || 'neutral'
  )
}

function weeklyAttendanceLabel(status) {
  return (
    {
      checked_out: 'Hadir',
      present: 'Sedang Masuk',
      missing_in: 'Scan Masuk Kosong',
      absent: 'Tidak Hadir',
      future: 'Belum Berjalan',
    }[status] || 'Tidak Hadir'
  )
}

function weeklyAttendanceColor(status) {
  return (
    {
      checked_out: 'success',
      present: 'success',
      missing_in: 'warning',
      absent: 'error',
      future: 'neutral',
    }[status] || 'neutral'
  )
}

function approvalTypeLabel(type) {
  return { leave: 'Cuti', ph: 'PH', permission: 'Izin / Sakit' }[type] || type
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

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      title="Dashboard tidak dapat dimuat"
      :description="errorMessage"
    />

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
              :color="subordinateAttendanceColor(employee.attendance_status)"
              variant="subtle"
              :label="subordinateAttendanceLabel(employee.attendance_status)"
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
        </div>
      </div>
    </UCard>

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
      <div class="grid gap-4 lg:grid-cols-2">
        <StatCard
          v-for="statistic in hrPrimaryStatistics"
          :key="statistic.title"
          v-bind="statistic"
        />
      </div>

      <div class="grid gap-4 xl:grid-cols-4">
        <StatCard
          v-for="statistic in hrAbsenceStatistics"
          :key="statistic.title"
          v-bind="statistic"
        />

        <UCard
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

        <UCard
          :title="`Kontrak Akan Habis (${hrDashboard.expiring_contracts.records.length})`"
          :description="`Dua bulan ke depan sampai ${formatDate(hrDashboard.expiring_contracts.through_date)}.`"
        >
          <div class="max-h-56 space-y-3 overflow-y-auto">
            <div
              v-for="contract in hrDashboard.expiring_contracts.records"
              :key="contract.id"
              class="rounded-lg border border-default p-3 text-sm"
            >
              <p class="font-medium text-highlighted">{{ contract.name }}</p>
              <p class="mt-1 text-muted">{{ contract.department }} - {{ contract.nik }}</p>
              <div class="mt-2 flex items-center justify-between gap-2">
                <span class="text-muted">{{ formatDate(contract.end_date) }}</span>
                <UBadge
                  color="warning"
                  variant="subtle"
                  :label="`${contract.remaining_days} hari`"
                />
              </div>
            </div>
            <p
              v-if="!hrDashboard.expiring_contracts.records.length"
              class="py-3 text-sm text-muted"
            >
              Tidak ada kontrak berakhir dalam dua bulan ke depan.
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
        v-if="hrDashboard.monthly_attendance_monitoring.visible"
        title="Monitoring Minimum Kehadiran Bulanan"
        :description="`Tampil mulai tanggal 26. Target: ${hrDashboard.monthly_attendance_monitoring.ideal_attendance_days} hari hadir dan ${hrDashboard.monthly_attendance_monitoring.minimum_work_duration}. PH dan Cuti disetujui dihitung 8 jam.`"
      >
        <UAlert
          v-if="!hrDashboard.monthly_attendance_monitoring.records.length"
          color="success"
          variant="subtle"
          description="Seluruh karyawan telah mencapai minimum hari dan durasi kerja pada periode berjalan."
        />
        <div v-else class="max-h-80 overflow-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-muted">
              <tr>
                <th class="p-3">Karyawan</th>
                <th class="p-3">Departemen</th>
                <th class="p-3">Kehadiran</th>
                <th class="p-3">Durasi</th>
                <th class="p-3">Perhatian</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="record in hrDashboard.monthly_attendance_monitoring.records"
                :key="record.nik"
                class="border-t border-default"
              >
                <td class="p-3">
                  <p class="font-medium text-highlighted">{{ record.name }}</p>
                  <p class="text-xs text-muted">{{ record.nik }}</p>
                </td>
                <td class="p-3">{{ record.department }}</td>
                <td class="p-3">{{ record.total_attendance }} hari</td>
                <td class="p-3">{{ record.total_work_duration }}</td>
                <td class="p-3">
                  <p v-if="record.attendance_shortage" class="text-warning">
                    Kurang {{ record.attendance_shortage }} hari
                  </p>
                  <p v-if="record.work_duration_shortage_minutes" class="text-warning">
                    Kurang {{ record.work_duration_shortage }}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <div class="grid gap-4 lg:grid-cols-3">
        <UCard title="Hadir per Departemen" description="Karyawan dengan PIN yang telah terhubung.">
          <div class="space-y-3">
            <div
              v-for="department in hrDashboard.attendance.by_department"
              :key="department.department"
              class="flex items-center justify-between rounded-lg border border-default px-3 py-2"
            >
              <span class="text-sm text-highlighted">{{ department.department }}</span>
              <UBadge color="success" variant="subtle" :label="`${department.total} orang`" />
            </div>
            <p v-if="!hrDashboard.attendance.by_department.length" class="py-4 text-sm text-muted">
              Belum ada kehadiran yang terhubung ke data karyawan.
            </p>
          </div>
        </UCard>

        <UCard
          class="lg:col-span-2"
          title="Manager Hadir Hari Ini"
          description="Berdasarkan posisi dan scan absensi hari ini."
        >
          <div class="grid gap-3 sm:grid-cols-2">
            <div
              v-for="employee in hrDashboard.attendance.managers_present"
              :key="employee.nik"
              class="rounded-lg border border-default p-3 text-sm"
            >
              <p class="font-medium text-highlighted">{{ employee.name }}</p>
              <p class="mt-1 text-muted">{{ employee.department }} - {{ employee.position }}</p>
              <div
                class="mt-3 flex items-start justify-between gap-8 rounded-lg border border-default/60 bg-elevated/35 px-3 py-2"
              >
                <div>
                  <p class="text-xs text-muted">Masuk</p>
                  <p class="mt-1 font-medium text-highlighted">
                    {{ formatTime(employee.scan_in) }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-muted">Keluar</p>
                  <p class="mt-1 font-medium text-highlighted">
                    {{ employee.scan_out ? formatTime(employee.scan_out) : 'Belum scan' }}
                  </p>
                </div>
              </div>
            </div>
            <p
              v-if="!hrDashboard.attendance.managers_present.length"
              class="py-3 text-sm text-muted"
            >
              Belum ada Manager terpetakan hadir.
            </p>
          </div>
        </UCard>
      </div>

      <UCard
        title="Absensi Belum Lengkap Kemarin"
        :description="`Data absensi ${formatDate(hrDashboard.yesterday_incomplete_attendance.date)} dengan salah satu scan belum lengkap.`"
      >
        <UAlert
          v-if="hrDashboard.yesterday_incomplete_attendance.unlinked_pin_count"
          color="warning"
          variant="subtle"
          class="mb-4"
          :description="`${hrDashboard.yesterday_incomplete_attendance.unlinked_pin_count} karyawan terjadwal belum memiliki PIN sehingga belum dapat diperiksa absensinya.`"
        />
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-muted">
              <tr>
                <th class="p-3">Karyawan</th>
                <th class="p-3">Departemen</th>
                <th class="p-3">Masuk</th>
                <th class="p-3">Pulang</th>
                <th class="p-3">Temuan</th>
                <th class="p-3">Aksi</th>
                <th class="p-3">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in paginatedIncompleteAttendance"
                :key="item.nik"
                class="border-t border-default"
              >
                <td class="p-3 font-medium text-highlighted">{{ item.name }}</td>
                <td class="p-3">{{ item.department }}</td>
                <td class="p-3">{{ formatTime(item.scan_in) }}</td>
                <td class="p-3">{{ formatTime(item.scan_out) }}</td>
                <td class="p-3">
                  <UBadge color="warning" variant="subtle" :label="missingScanLabel(item)" />
                </td>
                <td class="p-3">
                  <UButton
                    :to="{
                      name: 'hr-attendance-corrections',
                      query: {
                        date: hrDashboard.yesterday_incomplete_attendance.date,
                        nik: item.nik,
                      },
                    }"
                    label="Koreksi"
                    size="xs"
                    variant="soft"
                    icon="i-lucide-pencil-line"
                  />
                </td>
                <td class="p-3">
                  <UBadge
                    color="success"
                    variant="subtle"
                    :label="item.whatsapp_notification_status"
                  />
                </td>
              </tr>
              <tr v-if="!incompleteAttendanceRecords.length">
                <td colspan="7" class="p-6 text-center text-muted">
                  Tidak ada absensi terpetakan yang belum lengkap kemarin.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          v-if="incompleteAttendanceRecords.length > incompleteAttendanceItemsPerPage"
          class="mt-4 flex justify-end border-t border-default pt-4"
        >
          <UPagination
            v-model:page="incompleteAttendancePage"
            :total="incompleteAttendanceRecords.length"
            :items-per-page="incompleteAttendanceItemsPerPage"
            :sibling-count="1"
            show-controls
          />
        </div>
      </UCard>
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
