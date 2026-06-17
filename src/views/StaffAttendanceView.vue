<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getStaffAttendance } from '../services/staffService'
import { apiError, formatDate } from '../utils/formatters'

const route = useRoute()
const attendance = ref({
  employee: {},
  filters: {},
  summary: {},
  records: [],
})
const filters = reactive({
  start_date: typeof route.query.start_date === 'string' ? route.query.start_date : '',
  end_date: typeof route.query.end_date === 'string' ? route.query.end_date : '',
})
const loading = ref(true)
const errorMessage = ref('')
const calendarMonth = ref(monthKeyFromDate(new Date()))
const weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

const recordsByDate = computed(
  () => new Map(attendance.value.records.map((record) => [record.date, record])),
)

const calendarTitle = computed(() =>
  new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
    monthStartFromKey(calendarMonth.value),
  ),
)

const calendarAttendanceCount = computed(
  () => calendarDays.value.filter((day) => day.record?.has_scan).length,
)

const calendarApprovedAbsenceCount = computed(
  () => calendarDays.value.filter((day) => isApprovedAbsence(day.record)).length,
)

const calendarDays = computed(() => {
  const start = monthStartFromKey(calendarMonth.value)
  const year = start.getFullYear()
  const month = start.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingDays = start.getDay()
  const days = []

  for (let index = 0; index < leadingDays; index += 1) {
    days.push({ key: `leading-${index}`, inMonth: false })
  }

  for (let date = 1; date <= daysInMonth; date += 1) {
    const current = new Date(year, month, date)
    const key = dateKeyFromDate(current)

    days.push({
      key,
      date,
      inMonth: true,
      isToday: key === dateKeyFromDate(new Date()),
      isInFilterRange: isDateInFilterRange(key),
      record: recordsByDate.value.get(key),
    })
  }

  while (days.length % 7 !== 0) {
    days.push({ key: `trailing-${days.length}`, inMonth: false })
  }

  return days
})

function dateKeyFromDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function monthKeyFromDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

function monthStartFromKey(value) {
  const [year, month] = value.split('-').map(Number)

  return new Date(year, month - 1, 1)
}

function preferredCalendarMonth(periodFilters) {
  const today = dateKeyFromDate(new Date())
  const start = periodFilters.start_date
  const end = periodFilters.end_date

  if (start && end && start <= today && today <= end) {
    return today.slice(0, 7)
  }

  return (start || end || today).slice(0, 7)
}

function isDateInFilterRange(date) {
  const start = filters.start_date
  const end = filters.end_date

  if (start && date < start) {
    return false
  }

  if (end && date > end) {
    return false
  }

  return true
}

function formatTime(value) {
  return value ? `${value.slice(0, 5)} WIB` : '-'
}

function formatShortTime(value) {
  return value ? value.slice(0, 5) : '-'
}

function normalizedStatus(record) {
  return record?.status?.toLowerCase?.() || ''
}

function isApprovedAbsence(record) {
  return record?.attendance_source === 'approved_absence'
    || ['leave', 'cuti', 'public_holiday', 'ph', 'extra_off', 'eo'].includes(normalizedStatus(record))
}

function attendanceStatusLabel(record) {
  if (!record) {
    return '-'
  }

  const status = normalizedStatus(record)

  if (status === 'public_holiday' || status === 'ph') return 'PH'
  if (status === 'extra_off' || status === 'eo') return 'Extra Off'
  if (status === 'leave' || status === 'cuti') return record.status_label || 'Cuti'

  return record.is_complete ? 'Lengkap' : 'Belum Lengkap'
}

function attendanceStatusColor(record) {
  const status = normalizedStatus(record)

  if (status === 'public_holiday' || status === 'ph') return 'info'
  if (status === 'extra_off' || status === 'eo') return 'info'
  if (status === 'leave' || status === 'cuti') return 'warning'

  return record?.is_complete ? 'success' : 'warning'
}

function calendarStatusClass(record) {
  const status = normalizedStatus(record)

  if (status === 'public_holiday' || status === 'ph') {
    return 'border-blue-700 bg-blue-600 text-white dark:border-blue-400/60 dark:bg-blue-500 dark:text-white'
  }

  if (status === 'extra_off' || status === 'eo') {
    return 'border-cyan-700 bg-cyan-600 text-white dark:border-cyan-400/60 dark:bg-cyan-500 dark:text-white'
  }

  if (status === 'leave' || status === 'cuti') {
    return 'border-amber-700 bg-amber-500 text-slate-950 dark:border-amber-300/70 dark:bg-amber-400 dark:text-slate-950'
  }

  if (record?.is_complete) {
    return 'border-emerald-700 bg-emerald-600 text-white dark:border-emerald-400/60 dark:bg-emerald-500 dark:text-white'
  }

  return 'border-amber-700 bg-amber-500 text-slate-950 dark:border-amber-300/70 dark:bg-amber-400 dark:text-slate-950'
}

function calendarApprovedAbsenceClass(record) {
  const status = normalizedStatus(record)

  if (status === 'leave' || status === 'cuti') {
    return 'border border-amber-700 bg-amber-500 text-slate-950 dark:border-amber-300/70 dark:bg-amber-400 dark:text-slate-950'
  }

  if (status === 'extra_off' || status === 'eo') {
    return 'border border-cyan-700 bg-cyan-600 text-white dark:border-cyan-400/60 dark:bg-cyan-500 dark:text-white'
  }

  return 'border border-blue-700 bg-blue-600 text-white dark:border-blue-400/60 dark:bg-blue-500 dark:text-white'
}

function calendarScanClass(type) {
  if (type === 'in') {
    return 'border border-emerald-700 bg-emerald-600 text-white dark:border-emerald-400/60 dark:bg-emerald-500 dark:text-white'
  }

  if (type === 'out') {
    return 'border border-blue-700 bg-blue-600 text-white dark:border-blue-400/60 dark:bg-blue-500 dark:text-white'
  }

  return 'border border-slate-700 bg-slate-600 text-white dark:border-slate-500 dark:bg-slate-600 dark:text-white'
}

function changeCalendarMonth(offset) {
  const current = monthStartFromKey(calendarMonth.value)
  current.setMonth(current.getMonth() + offset)
  calendarMonth.value = monthKeyFromDate(current)
}

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    const { data } = await getStaffAttendance({
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined,
    })

    attendance.value = data
    filters.start_date = data.filters.start_date
    filters.end_date = data.filters.end_date
    calendarMonth.value = preferredCalendarMonth(data.filters)
  } catch (error) {
    errorMessage.value = apiError(error, 'Riwayat absensi tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function resetFilters() {
  filters.start_date = ''
  filters.end_date = ''
  await load()
}

watch(
  () => route.fullPath,
  async () => {
    const startDate = typeof route.query.start_date === 'string' ? route.query.start_date : ''
    const endDate = typeof route.query.end_date === 'string' ? route.query.end_date : ''

    if (!startDate && !endDate) {
      return
    }

    filters.start_date = startDate || endDate
    filters.end_date = endDate || startDate
    await load()
  },
)

onMounted(load)
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Absensi Saya</h2>
      <p class="mt-1 text-sm text-muted">
        Jam masuk diambil dari scan pertama dan jam pulang dari scan terakhir setiap tanggal.
      </p>
    </div>

    <UAlert
      v-if="!loading && !attendance.employee.pin"
      color="warning"
      variant="subtle"
      title="PIN absensi belum tersedia"
      description="Hubungi HR agar PIN mesin absensi terhubung ke data karyawan Anda."
    />

    <AlertToastBridge :error="errorMessage" />

    <UCard title="Filter Periode">
      <form class="grid grid-cols-2 gap-3 sm:flex sm:items-end" @submit.prevent="load">
        <label class="min-w-0 text-sm text-muted">
          Tanggal Mulai
          <input
            v-model="filters.start_date"
            type="date"
            class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted"
          />
        </label>
        <label class="min-w-0 text-sm text-muted">
          Tanggal Selesai
          <input
            v-model="filters.end_date"
            type="date"
            class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted"
          />
        </label>
        <div class="col-span-2 flex gap-2 sm:col-span-1">
          <UButton type="submit" label="Tampilkan" :loading="loading" />
          <UButton
            type="button"
            color="neutral"
            variant="soft"
            label="Reset"
            @click="resetFilters"
          />
        </div>
      </form>
    </UCard>

    <div class="grid grid-cols-3 gap-2 sm:gap-4">
      <div class="rounded-lg border border-default bg-default p-3 sm:rounded-xl sm:p-4">
        <p class="text-xs text-muted sm:text-sm">Hari Tercatat</p>
        <p class="mt-2 text-2xl font-semibold text-highlighted sm:text-3xl">
          {{ attendance.summary.attendance_days || 0 }}
        </p>
      </div>
      <div class="rounded-lg border border-default bg-default p-3 sm:rounded-xl sm:p-4">
        <p class="text-xs text-muted sm:text-sm">Scan Lengkap</p>
        <p class="mt-2 text-2xl font-semibold text-highlighted sm:text-3xl">
          {{ attendance.summary.complete_days || 0 }}
        </p>
      </div>
      <div class="rounded-lg border border-default bg-default p-3 sm:rounded-xl sm:p-4">
        <p class="text-xs text-muted sm:text-sm">Belum Lengkap</p>
        <p class="mt-2 text-2xl font-semibold text-highlighted sm:text-3xl">
          {{ attendance.summary.incomplete_days || 0 }}
        </p>
      </div>
    </div>

    <UCard>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm text-muted">Kalender Absensi</p>
          <h3 class="mt-1 text-xl font-semibold capitalize text-highlighted">
            {{ calendarTitle }}
          </h3>
          <p class="mt-1 text-sm text-muted">
            {{ calendarAttendanceCount }} hari memiliki data scan, {{ calendarApprovedAbsenceCount }} hari approved CUTI/PH/EO.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            type="button"
            color="neutral"
            variant="soft"
            icon="i-lucide-chevron-left"
            aria-label="Bulan sebelumnya"
            @click="changeCalendarMonth(-1)"
          />
          <UButton
            type="button"
            color="neutral"
            variant="soft"
            icon="i-lucide-chevron-right"
            aria-label="Bulan berikutnya"
            @click="changeCalendarMonth(1)"
          />
        </div>
      </div>

      <div v-if="loading" class="py-8 text-center text-sm text-muted">
        Memuat kalender absensi...
      </div>
      <div v-else class="mt-5 overflow-x-auto">
        <div class="min-w-[760px] overflow-hidden rounded-lg border border-default">
          <div class="grid grid-cols-7 border-b border-default bg-muted/50">
            <div
              v-for="day in weekDays"
              :key="day"
              class="border-r border-default px-3 py-2 text-center text-xs font-semibold text-muted last:border-r-0"
            >
              {{ day }}
            </div>
          </div>

          <div class="grid grid-cols-7 bg-default">
            <div
              v-for="day in calendarDays"
              :key="day.key"
              class="min-h-28 border-r border-b border-default p-2 last:border-r-0"
              :class="[
                day.inMonth ? 'bg-default' : 'bg-muted/30',
                day.isToday ? 'ring-2 ring-primary ring-inset' : '',
                day.inMonth && !day.isInFilterRange ? 'text-dimmed' : '',
              ]"
            >
              <template v-if="day.inMonth">
                <div class="flex items-start justify-between gap-2">
                  <span class="text-sm font-semibold text-highlighted">{{ day.date }}</span>
                  <span
                    v-if="day.record"
                    class="inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none"
                    :class="calendarStatusClass(day.record)"
                  >
                    {{ attendanceStatusLabel(day.record) }}
                  </span>
                </div>

                <div v-if="day.record && isApprovedAbsence(day.record)" class="mt-3 space-y-1.5 text-[11px] leading-tight">
                  <div class="rounded-md px-2 py-1 font-medium" :class="calendarApprovedAbsenceClass(day.record)">
                    {{ attendanceStatusLabel(day.record) }} disetujui
                  </div>
                  <div v-if="day.record.has_scan" class="rounded-md px-2 py-1" :class="calendarScanClass('in')">
                    Scan {{ formatShortTime(day.record.scan_in) }} - {{ formatShortTime(day.record.scan_out) }}
                  </div>
                  <div v-if="day.record.schedule_code" class="rounded-md px-2 py-1" :class="calendarScanClass('schedule')">
                    Jadwal {{ day.record.schedule_code }}
                  </div>
                </div>
                <div v-else-if="day.record" class="mt-3 space-y-1.5 text-[11px] leading-tight">
                  <div class="rounded-md px-2 py-1 font-medium" :class="calendarScanClass('in')">
                    Masuk {{ formatShortTime(day.record.scan_in) }}
                  </div>
                  <div class="rounded-md px-2 py-1 font-medium" :class="calendarScanClass('out')">
                    Pulang {{ formatShortTime(day.record.scan_out) }}
                  </div>
                </div>
                <p v-else class="mt-5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {{ day.isInFilterRange ? 'Tidak ada scan' : 'Di luar filter' }}
                </p>
              </template>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <UCard title="Riwayat Absensi Harian">
      <div v-if="loading" class="py-8 text-center text-sm text-muted">
        Memuat riwayat absensi...
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">Tanggal</th>
              <th class="p-3">Jam Masuk</th>
              <th class="p-3">Jam Pulang</th>
              <th class="p-3">Total Scan</th>
              <th class="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in attendance.records"
              :key="record.date"
              class="border-t border-default"
            >
              <td class="p-3">{{ formatDate(record.date) }}</td>
              <td class="p-3 font-medium text-highlighted">{{ formatTime(record.scan_in) }}</td>
              <td class="p-3 font-medium text-highlighted">{{ formatTime(record.scan_out) }}</td>
              <td class="p-3">{{ record.total_scans }}</td>
              <td class="p-3">
                <UBadge
                  :color="attendanceStatusColor(record)"
                  variant="subtle"
                  :label="attendanceStatusLabel(record)"
                />
              </td>
            </tr>
            <tr v-if="!attendance.records.length">
              <td colspan="5" class="p-6 text-center text-muted">
                Tidak ada data absensi pada periode ini.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </section>
</template>
