<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import AlertToastBridge from '../components/AlertToastBridge.vue'
import { exportHrOvertimeRecap, getHrOvertimeRecap } from '../services/hrService'
import { apiError, statusColor, statusLabel } from '../utils/formatters'

const loading = ref(true)
const exporting = ref(false)
const message = ref('')
const errorMessage = ref('')

const form = reactive({
  search: '',
  department: '',
  start_date: '',
  end_date: '',
  status: 'all',
})

const summary = reactive({
  total_records: 0,
  total_employees: 0,
  total_minutes: 0,
  total_hours: 0,
  total_duration_formatted: '0 jam',
  approved_count: 0,
  waiting_count: 0,
})

const records = ref([])
const departmentOptions = ref([])

const page = ref(1)
const itemsPerPage = 10

const paginatedRecords = computed(() => {
  const start = (page.value - 1) * itemsPerPage
  return records.value.slice(start, start + itemsPerPage)
})

const visibleRange = computed(() => {
  if (!records.value.length) {
    return '0 data'
  }

  const start = (page.value - 1) * itemsPerPage + 1
  const end = Math.min(page.value * itemsPerPage, records.value.length)

  return `${start}-${end} dari ${records.value.length} data`
})

async function loadData() {
  loading.value = true
  errorMessage.value = ''
  page.value = 1
  try {
    const response = await getHrOvertimeRecap({
      search: form.search,
      department: form.department,
      start_date: form.start_date,
      end_date: form.end_date,
      status: form.status,
    })

    const data = response.data
    records.value = data.records ?? []
    departmentOptions.value = data.department_options ?? []

    if (data.summary) {
      Object.assign(summary, data.summary)
    }
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal memuat data rekapan lembur.')
  } finally {
    loading.value = false
  }
}

function resetFilter() {
  form.search = ''
  form.department = ''
  form.start_date = ''
  form.end_date = ''
  form.status = 'all'
  loadData()
}

async function handleExport() {
  exporting.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const response = await exportHrOvertimeRecap({
      search: form.search,
      department: form.department,
      start_date: form.start_date,
      end_date: form.end_date,
      status: form.status,
    })

    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Rekap_Lembur_Karyawan_${form.start_date || 'semua'}_s.d_${form.end_date || 'semua'}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    message.value = 'File rekapan lembur berhasil diunduh.'
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengunduh file rekapan lembur.')
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h2 class="text-2xl font-semibold text-highlighted">Rekap Lembur Karyawan</h2>
        <p class="mt-1 text-sm text-muted">
          Rekapan data lembur seluruh karyawan berdasarkan pencarian, departemen, dan rentang tanggal.
        </p>
      </div>
      <UButton
        type="button"
        icon="i-lucide-download"
        label="Export Excel"
        color="success"
        variant="solid"
        :loading="exporting"
        :disabled="loading || !records.length"
        @click="handleExport"
      />
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <!-- Filter Card -->
    <UCard title="Filter Rekap Lembur">
      <form class="grid gap-4 sm:grid-cols-2 md:grid-cols-5 md:items-end" @submit.prevent="loadData">
        <label class="text-sm text-muted">
          Cari Karyawan / NIK
          <input
            v-model="form.search"
            type="text"
            placeholder="Nama atau NIK..."
            class="mt-1.5 w-full rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted focus:border-primary focus:outline-none"
          />
        </label>

        <label class="text-sm text-muted">
          Departemen
          <select
            v-model="form.department"
            class="mt-1.5 w-full rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted focus:border-primary focus:outline-none"
          >
            <option value="">Semua Departemen</option>
            <option v-for="dept in departmentOptions" :key="dept" :value="dept">
              {{ dept }}
            </option>
          </select>
        </label>

        <label class="text-sm text-muted">
          Tanggal Mulai
          <input
            v-model="form.start_date"
            type="date"
            class="mt-1.5 w-full rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted focus:border-primary focus:outline-none"
          />
        </label>

        <label class="text-sm text-muted">
          Tanggal Selesai
          <input
            v-model="form.end_date"
            type="date"
            class="mt-1.5 w-full rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted focus:border-primary focus:outline-none"
          />
        </label>

        <label class="text-sm text-muted">
          Status
          <select
            v-model="form.status"
            class="mt-1.5 w-full rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted focus:border-primary focus:outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="approved">Disetujui HRD</option>
            <option value="waiting_hr">Menunggu HRD</option>
            <option value="rejected">Ditolak</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </label>

        <div class="flex items-center gap-2 sm:col-span-2 md:col-span-5 md:justify-end">
          <UButton type="button" color="neutral" variant="outline" label="Reset" @click="resetFilter" />
          <UButton type="submit" icon="i-lucide-search" color="primary" variant="solid" label="Tampilkan Data" :loading="loading" />
        </div>
      </form>
    </UCard>

    <!-- Metrics Cards -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl border border-default bg-card p-5 shadow-xs">
        <div class="flex items-center gap-3">
          <div class="metric-icon metric-icon-blue flex size-10 items-center justify-center rounded-lg">
            <UIcon name="i-lucide-clock" class="size-5" />
          </div>
          <div>
            <p class="text-xs font-medium text-muted">Total Durasi Lembur</p>
            <p class="mt-0.5 text-xl font-bold text-highlighted">{{ summary.total_duration_formatted }}</p>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-default bg-card p-5 shadow-xs">
        <div class="flex items-center gap-3">
          <div class="metric-icon metric-icon-indigo flex size-10 items-center justify-center rounded-lg">
            <UIcon name="i-lucide-file-text" class="size-5" />
          </div>
          <div>
            <p class="text-xs font-medium text-muted">Total Pengajuan</p>
            <p class="mt-0.5 text-xl font-bold text-highlighted">{{ summary.total_records }} Pengajuan</p>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-default bg-card p-5 shadow-xs">
        <div class="flex items-center gap-3">
          <div class="metric-icon metric-icon-emerald flex size-10 items-center justify-center rounded-lg">
            <UIcon name="i-lucide-users" class="size-5" />
          </div>
          <div>
            <p class="text-xs font-medium text-muted">Karyawan Lembur</p>
            <p class="mt-0.5 text-xl font-bold text-highlighted">{{ summary.total_employees }} Orang</p>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-default bg-card p-5 shadow-xs">
        <div class="flex items-center gap-3">
          <div class="metric-icon metric-icon-teal flex size-10 items-center justify-center rounded-lg">
            <UIcon name="i-lucide-check-circle" class="size-5" />
          </div>
          <div>
            <p class="text-xs font-medium text-muted">Disetujui HRD</p>
            <p class="mt-0.5 text-xl font-bold text-highlighted">{{ summary.approved_count }} Disetujui</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Data Table Card -->
    <UCard title="Daftar Rekapan Lembur">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-highlighted">
          <thead class="border-b border-default bg-muted/20 text-xs uppercase text-muted">
            <tr>
              <th class="p-3">Tanggal</th>
              <th class="p-3">Karyawan</th>
              <th class="p-3">Departemen</th>
              <th class="p-3">Waktu Lembur</th>
              <th class="p-3">Durasi</th>
              <th class="p-3">Keterangan / Alasan</th>
              <th class="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="p-8 text-center text-muted">
                Memuat data rekapan lembur...
              </td>
            </tr>

            <tr v-else-if="!records.length">
              <td colspan="7" class="p-8 text-center text-muted">
                Tidak ada data lembur untuk filter yang dipilih.
              </td>
            </tr>

            <tr v-for="item in paginatedRecords" :key="item.id" class="border-t border-default hover:bg-muted/10">
              <td class="whitespace-nowrap p-3 font-medium">
                {{ item.date_formatted }}
              </td>
              <td class="p-3">
                <p class="font-medium text-highlighted">{{ item.employee_name }}</p>
                <p class="text-xs text-muted">NIK: {{ item.employee_nik }}</p>
              </td>
              <td class="whitespace-nowrap p-3 text-muted">
                {{ item.department }}
              </td>
              <td class="whitespace-nowrap p-3">
                <span class="font-mono text-xs font-semibold">{{ item.start_time }} - {{ item.end_time }}</span>
              </td>
              <td class="whitespace-nowrap p-3">
                <UBadge color="neutral" variant="subtle" :label="item.duration_formatted" />
              </td>
              <td class="max-w-60 p-3 text-xs text-muted">
                {{ item.reason }}
              </td>
              <td class="p-3">
                <UBadge
                  :color="statusColor(item.status)"
                  variant="subtle"
                  :label="statusLabel(item.status)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div
        v-if="!loading && records.length"
        class="mt-4 flex flex-col items-center justify-between gap-3 border-t border-default pt-4 sm:flex-row"
      >
        <p class="text-sm text-muted">Menampilkan {{ visibleRange }}</p>

        <UPagination
          v-model:page="page"
          :total="records.length"
          :items-per-page="itemsPerPage"
          :sibling-count="1"
          show-controls
        />
      </div>
    </UCard>
  </section>
</template>

<style scoped>
.metric-icon-blue {
  background-color: #dbeafe !important;
  color: #1d4ed8 !important;
}
.metric-icon-indigo {
  background-color: #e0e7ff !important;
  color: #4338ca !important;
}
.metric-icon-emerald {
  background-color: #d1fae5 !important;
  color: #047857 !important;
}
.metric-icon-teal {
  background-color: #ccfbf1 !important;
  color: #0f766e !important;
}

:deep(.dark) .metric-icon-blue,
.dark .metric-icon-blue {
  background-color: rgba(30, 58, 138, 0.7) !important;
  color: #60a5fa !important;
}
:deep(.dark) .metric-icon-indigo,
.dark .metric-icon-indigo {
  background-color: rgba(49, 46, 129, 0.7) !important;
  color: #818cf8 !important;
}
:deep(.dark) .metric-icon-emerald,
.dark .metric-icon-emerald {
  background-color: rgba(6, 78, 59, 0.7) !important;
  color: #34d399 !important;
}
:deep(.dark) .metric-icon-teal,
.dark .metric-icon-teal {
  background-color: rgba(19, 78, 74, 0.7) !important;
  color: #2dd4bf !important;
}
</style>
