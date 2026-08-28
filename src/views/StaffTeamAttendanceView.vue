<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { downloadTeamAttendanceReport, getTeamAttendances } from '../services/staffService'
import { apiError, formatDate } from '../utils/formatters'

function formatTime(val) {
  if (!val) return '-'
  return String(val).slice(0, 5)
}

const loading = ref(false)
const exporting = ref(false)
const errorMessage = ref('')
const data = ref(null)

const now = new Date()
const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
const todayStr = now.toISOString().split('T')[0]

const filters = reactive({
  start_date: firstDayOfMonth,
  end_date: todayStr,
  employee_nik: '',
  status_filter: 'all',
  q: '',
  page: 1,
  per_page: 15,
})

const summary = computed(() => data.value?.summary || {
  total_employees: 0,
  total_days_tracked: 0,
  present_count: 0,
  late_count: 0,
  leave_permission_count: 0,
  alpha_count: 0,
})

const employees = computed(() => data.value?.employees || [])
const records = computed(() => data.value?.records || [])
const pagination = computed(() => data.value?.pagination || { current_page: 1, last_page: 1, total: 0 })

async function loadData() {
  loading.value = true
  errorMessage.value = ''

  try {
    const res = await getTeamAttendances({
      start_date: filters.start_date,
      end_date: filters.end_date,
      employee_nik: filters.employee_nik || undefined,
      status_filter: filters.status_filter,
      q: filters.q || undefined,
      page: filters.page,
      per_page: filters.per_page,
    })
    data.value = res.data
  } catch (err) {
    data.value = null
    errorMessage.value = apiError(err, 'Gagal memuat rekap kehadiran tim.')
  } finally {
    loading.value = false
  }
}

function applyPreset(preset) {
  const current = new Date()
  filters.end_date = current.toISOString().split('T')[0]

  if (preset === 'today') {
    filters.start_date = filters.end_date
  } else if (preset === 'week') {
    const last7 = new Date(current)
    last7.setDate(current.getDate() - 6)
    filters.start_date = last7.toISOString().split('T')[0]
  } else if (preset === 'month') {
    filters.start_date = new Date(current.getFullYear(), current.getMonth(), 1).toISOString().split('T')[0]
  }

  filters.page = 1
  loadData()
}

function onSearch() {
  filters.page = 1
  loadData()
}

function onPageChange(page) {
  filters.page = page
  loadData()
}

async function exportExcel() {
  exporting.value = true
  errorMessage.value = ''

  try {
    const res = await downloadTeamAttendanceReport({
      start_date: filters.start_date,
      end_date: filters.end_date,
      employee_nik: filters.employee_nik || undefined,
    })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `Rekap_Kehadiran_Tim_${filters.start_date}_${filters.end_date}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    errorMessage.value = apiError(err, 'Gagal mengunduh laporan excel kehadiran tim.')
  } finally {
    exporting.value = false
  }
}

function statusBadgeClass(statusCode, isLate) {
  if (isLate) {
    return 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
  }

  switch (statusCode) {
    case 'M':
      return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
    case 'A':
      return 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
    case 'C':
    case 'PH':
    case 'EO':
      return 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20'
    case 'SDC':
    case 'S':
    case 'I':
      return 'bg-violet-500/10 text-violet-500 border border-violet-500/20'
    default:
      return 'bg-default text-muted border border-default'
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header Section -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-highlighted">Report Kehadiran Tim</h1>
        <p class="mt-1 text-sm text-muted">
          Pantau ringkasan kehadiran, statistik keterlambatan, dan histori absensi bawahan Anda.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          label="Export Excel"
          icon="i-lucide-download"
          variant="outline"
          :loading="exporting"
          @click="exportExcel"
        />
        <UButton
          label="Segarkan"
          icon="i-lucide-refresh-cw"
          :loading="loading"
          @click="loadData"
        />
      </div>
    </div>

    <!-- Error Alert -->
    <div
      v-if="errorMessage"
      class="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-500"
    >
      {{ errorMessage }}
    </div>

    <!-- Summary KPI Cards -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <!-- Total Anggota Tim -->
      <UCard class="relative overflow-hidden">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-wider text-muted">Anggota Tim</p>
            <p class="mt-2 text-2xl font-extrabold text-highlighted">{{ summary.total_employees }}</p>
          </div>
          <div class="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
            <UIcon name="i-lucide-users" class="size-5" />
          </div>
        </div>
      </UCard>

      <!-- Total Hadir -->
      <UCard class="relative overflow-hidden">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-wider text-muted">Hadir Tepat Waktu</p>
            <p class="mt-2 text-2xl font-extrabold text-emerald-500">{{ summary.present_count }}</p>
          </div>
          <div class="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <UIcon name="i-lucide-check-circle-2" class="size-5" />
          </div>
        </div>
      </UCard>

      <!-- Terlambat / Jam Kurang -->
      <UCard class="relative overflow-hidden">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-wider text-muted">Terlambat / Kurang Jam</p>
            <p class="mt-2 text-2xl font-extrabold text-amber-500">{{ summary.late_count }}</p>
          </div>
          <div class="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <UIcon name="i-lucide-clock" class="size-5" />
          </div>
        </div>
      </UCard>

      <!-- Cuti / Izin / Sakit / Libur -->
      <UCard class="relative overflow-hidden">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-wider text-muted">Cuti / Izin / Sakit</p>
            <p class="mt-2 text-2xl font-extrabold text-violet-500">{{ summary.leave_permission_count }}</p>
          </div>
          <div class="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
            <UIcon name="i-lucide-calendar-heart" class="size-5" />
          </div>
        </div>
      </UCard>

      <!-- Tanpa Keterangan / Alpha -->
      <UCard class="relative overflow-hidden col-span-2 lg:col-span-1">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-wider text-muted">Tanpa Keterangan (Alpha)</p>
            <p class="mt-2 text-2xl font-extrabold text-rose-500">{{ summary.alpha_count }}</p>
          </div>
          <div class="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
            <UIcon name="i-lucide-alert-triangle" class="size-5" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Filter & Control Panel -->
    <UCard>
      <div class="space-y-4">
        <!-- Preset Buttons & Date Pickers -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-default pb-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-muted">Periode Cepat:</span>
            <button
              type="button"
              class="rounded-lg border border-default px-3 py-1.5 text-xs font-medium text-muted hover:bg-elevated hover:text-highlighted"
              @click="applyPreset('today')"
            >
              Hari Ini
            </button>
            <button
              type="button"
              class="rounded-lg border border-default px-3 py-1.5 text-xs font-medium text-muted hover:bg-elevated hover:text-highlighted"
              @click="applyPreset('week')"
            >
              7 Hari Terakhir
            </button>
            <button
              type="button"
              class="rounded-lg border border-default px-3 py-1.5 text-xs font-medium text-muted hover:bg-elevated hover:text-highlighted"
              @click="applyPreset('month')"
            >
              Bulan Ini
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <input
              v-model="filters.start_date"
              type="date"
              class="rounded-lg border border-default bg-default p-2 text-xs text-highlighted"
              @change="onSearch"
            />
            <span class="text-xs text-muted">s/d</span>
            <input
              v-model="filters.end_date"
              type="date"
              class="rounded-lg border border-default bg-default p-2 text-xs text-highlighted"
              @change="onSearch"
            />
          </div>
        </div>

        <!-- Filter Dropdowns & Search -->
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <!-- Pilih Anggota Tim -->
          <div>
            <label class="block text-xs font-medium text-muted">Pilih Karyawan</label>
            <select
              v-model="filters.employee_nik"
              class="mt-1 block w-full rounded-lg border border-default bg-default p-2 text-sm text-highlighted"
              @change="onSearch"
            >
              <option value="">Semua Anggota Tim ({{ employees.length }})</option>
              <option v-for="emp in employees" :key="emp.nik" :value="emp.nik">
                {{ emp.name }} ({{ emp.position || emp.nik }})
              </option>
            </select>
          </div>

          <!-- Filter Status Kehadiran -->
          <div>
            <label class="block text-xs font-medium text-muted">Status Kehadiran</label>
            <select
              v-model="filters.status_filter"
              class="mt-1 block w-full rounded-lg border border-default bg-default p-2 text-sm text-highlighted"
              @change="onSearch"
            >
              <option value="all">Semua Status</option>
              <option value="present">Hadir</option>
              <option value="late">Terlambat / Kurang Jam</option>
              <option value="leave_permission">Cuti / Izin / Sakit / PH / EO</option>
              <option value="alpha">Tanpa Keterangan (Alpha)</option>
              <option value="attention">Perlu Perhatian</option>
            </select>
          </div>

          <!-- Search Keyword -->
          <div class="sm:col-span-2">
            <label class="block text-xs font-medium text-muted">Pencarian Cepat</label>
            <div class="relative mt-1">
              <UIcon name="i-lucide-search" class="absolute left-3 top-2.5 size-4 text-muted" />
              <input
                v-model="filters.q"
                type="text"
                placeholder="Cari nama, NIK, jabatan, atau divisi..."
                class="block w-full rounded-lg border border-default bg-default py-2 pl-9 pr-3 text-sm text-highlighted placeholder:text-muted"
                @input="onSearch"
              />
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Attendance Table -->
    <UCard>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-muted">
          <thead class="border-b border-default bg-elevated text-xs uppercase text-muted">
            <tr>
              <th class="px-4 py-3">Tanggal</th>
              <th class="px-4 py-3">Karyawan</th>
              <th class="px-4 py-3 text-center">Scan Masuk</th>
              <th class="px-4 py-3 text-center">Scan Pulang</th>
              <th class="px-4 py-3 text-center">Durasi Kerja</th>
              <th class="px-4 py-3 text-center">Status</th>
              <th class="px-4 py-3">Keterangan / Koreksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-if="loading && records.length === 0">
              <td colspan="7" class="py-12 text-center text-muted">
                <div class="flex items-center justify-center gap-2">
                  <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-primary" />
                  <span>Memuat data absensi tim...</span>
                </div>
              </td>
            </tr>

            <tr v-else-if="records.length === 0">
              <td colspan="7" class="py-12 text-center text-muted">
                Tidak ada data absensi tim yang sesuai dengan filter periode ini.
              </td>
            </tr>

            <tr
              v-for="r in records"
              :key="`${r.nik}-${r.date}`"
              class="hover:bg-elevated/50 transition-colors"
            >
              <!-- Tanggal -->
              <td class="whitespace-nowrap px-4 py-3.5 font-medium text-highlighted">
                {{ formatDate(r.date) }}
              </td>

              <!-- Karyawan -->
              <td class="px-4 py-3.5">
                <div class="flex flex-col">
                  <span class="font-bold text-highlighted">{{ r.name }}</span>
                  <div class="flex items-center gap-1.5 text-xs text-muted">
                    <span>{{ r.nik }}</span>
                    <span>•</span>
                    <span>{{ r.position || '-' }}</span>
                  </div>
                  <span
                    class="mt-0.5 inline-block text-[10px] font-medium"
                    :class="r.relationship === 'Bawahan Langsung' ? 'text-primary' : 'text-muted'"
                  >
                    {{ r.relationship }}
                  </span>
                </div>
              </td>

              <!-- Scan Masuk -->
              <td class="whitespace-nowrap px-4 py-3.5 text-center">
                <span v-if="r.scan_in" class="font-mono text-highlighted">
                  {{ formatTime(r.scan_in) }}
                </span>
                <span v-else class="text-xs text-muted">-</span>
              </td>

              <!-- Scan Pulang -->
              <td class="whitespace-nowrap px-4 py-3.5 text-center">
                <span v-if="r.scan_out" class="font-mono text-highlighted">
                  {{ formatTime(r.scan_out) }}
                </span>
                <span v-else class="text-xs text-muted">-</span>
              </td>

              <!-- Durasi Kerja -->
              <td class="whitespace-nowrap px-4 py-3.5 text-center">
                <span class="font-medium text-highlighted">{{ r.duration }}</span>
              </td>

              <!-- Status Badge -->
              <td class="whitespace-nowrap px-4 py-3.5 text-center">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                  :class="statusBadgeClass(r.status_code, r.is_late)"
                >
                  {{ r.status_label }}
                </span>
              </td>

              <!-- Keterangan / Koreksi -->
              <td class="px-4 py-3.5 text-xs">
                <div v-if="r.correction" class="space-y-0.5">
                  <span class="font-medium text-primary">Koreksi HRD</span>
                  <p class="text-muted">{{ r.correction.notes || '-' }}</p>
                </div>
                <div v-else-if="r.needs_attention" class="text-amber-500">
                  <span v-if="r.has_incomplete_scan">Scan absensi tidak lengkap</span>
                  <span v-else-if="r.is_under_daily_target">Jam kerja di bawah target</span>
                  <span v-else>Perlu perhatian</span>
                </div>
                <span v-else class="text-muted">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div
        v-if="pagination.total > 0"
        class="flex flex-col gap-3 border-t border-default px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-center gap-3 text-xs text-muted">
          <span>
            Menampilkan {{ ((pagination.current_page - 1) * pagination.per_page) + 1 }} - {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} dari {{ pagination.total }} data
          </span>

          <div class="flex items-center gap-1.5 border-l border-default pl-3">
            <span>Tampilkan:</span>
            <select
              v-model="filters.per_page"
              class="rounded-md border border-default bg-default p-1 text-xs text-highlighted"
              @change="onSearch"
            >
              <option :value="10">10</option>
              <option :value="15">15</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
            <span>baris</span>
          </div>
        </div>

        <div v-if="pagination.last_page > 1">
          <UPagination
            :page="pagination.current_page"
            :total="pagination.total"
            :items-per-page="pagination.per_page"
            show-controls
            @update:page="onPageChange"
          />
        </div>
      </div>
    </UCard>
  </div>
</template>
