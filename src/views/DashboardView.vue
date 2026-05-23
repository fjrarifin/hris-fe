<script setup>
import { computed, onMounted, ref } from 'vue'
import StatCard from '../components/StatCard.vue'
import { getStaffDashboard } from '../services/staffService'
import { useAuthStore } from '../stores/auth'
import { apiError, formatDate } from '../utils/formatters'

const auth = useAuthStore()
const isStaff = computed(() => auth.user?.level === 3)
const dashboard = ref(null)
const loading = ref(false)
const errorMessage = ref('')

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
    },
    {
      title: 'Saldo Cuti',
      value: summary.leave_balance,
      description: 'Saldo cuti yang masih tersedia',
      badge: 'Cuti',
      color: 'warning',
    },
    {
      title: 'Saldo PH',
      value: summary.public_holiday_balance,
      description: 'Public Holiday dapat diajukan',
      badge: 'PH',
      color: 'info',
    },
  ]
})

const statistics = computed(() => (isStaff.value ? staffStatistics.value : adminStatistics))

async function loadStaffDashboard() {
  if (!isStaff.value) {
    return
  }

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

onMounted(loadStaffDashboard)
</script>

<template>
  <section class="space-y-6">
    <UCard
      class="dashboard-hero overflow-hidden border border-blue-100 bg-linear-to-br from-white via-blue-50 to-blue-100"
    >
      <div class="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <p class="text-sm font-medium text-blue-700">HRIS Dashboard</p>
          <h2 class="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl">
            Selamat datang, {{ auth.user?.name }}
          </h2>
          <p v-if="isStaff" class="mt-3 max-w-xl text-sm text-slate-600 sm:text-base">
            Lihat kehadiran, saldo pengajuan, dan data diri Anda dari portal karyawan.
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

    <div v-if="loading" class="py-12 text-center text-sm text-muted">Memuat ringkasan Anda...</div>

    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard v-for="statistic in statistics" :key="statistic.title" v-bind="statistic" />
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
