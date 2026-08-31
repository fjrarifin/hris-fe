<script setup>
import { computed, onMounted, ref } from 'vue'
import { getHrDashboard } from '../services/hrService'
import { apiError, formatDate } from '../utils/formatters'

const dashboard = ref(null)
const loading = ref(true)
const errorMessage = ref('')
const incompleteAttendancePage = ref(1)
const incompleteAttendanceItemsPerPage = 10

const incompleteAttendanceRecords = computed(
  () => dashboard.value?.yesterday_incomplete_attendance.records || [],
)

const paginatedIncompleteAttendance = computed(() => {
  const start = (incompleteAttendancePage.value - 1) * incompleteAttendanceItemsPerPage

  return incompleteAttendanceRecords.value.slice(start, start + incompleteAttendanceItemsPerPage)
})

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    dashboard.value = (await getHrDashboard()).data
    incompleteAttendancePage.value = 1
  } catch (error) {
    errorMessage.value = apiError(error, 'Dashboard internal HR tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

function formatTime(value) {
  return value ? `${value.slice(0, 5)} WIB` : '-'
}

function missingScanLabel(record) {
  return record.missing_scan_in ? 'Tidak absen masuk' : 'Tidak absen pulang'
}

onMounted(load)
</script>

<template>
  <div class="space-y-6 pb-12">
    <!-- Hero Header (Seragam dengan Desain Standard HRIS) -->
    <div class="rounded-2xl border border-default bg-card p-6 shadow-xs flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
          <UIcon name="i-lucide-shield-alert" class="size-3.5" />
          <span>Internal Attendance Monitoring</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-highlighted mt-1">Dashboard Internal HR</h1>
        <p class="mt-1 text-sm text-muted">
          Monitoring internal kehadiran atasan operasional, minimum bulanan, dan absensi yang perlu koreksi.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="loading"
          label="Perbarui"
          @click="load"
        />
      </div>
    </div>

    <AlertToastBridge :error="errorMessage" />

    <div v-if="loading" class="py-12 text-center text-sm text-muted">Memuat monitoring internal...</div>

    <div v-else-if="dashboard" class="space-y-6">
      <!-- Section 1: Atasan Operasional Hadir Hari Ini -->
      <div class="rounded-2xl border border-default bg-card p-6 shadow-xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-default pb-4">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-primary">Kehadiran Leader</span>
            <h2 class="text-lg font-bold text-highlighted mt-0.5">Atasan Operasional Hadir Hari Ini</h2>
            <p class="text-xs text-muted">Manager, Asst. Manager, Supervisor/SPV, dan Leader berdasarkan scan absensi hari ini.</p>
          </div>
          <span class="self-start sm:self-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
            {{ dashboard.attendance?.management_present?.length || 0 }} Leader Hadir
          </span>
        </div>

        <div class="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pt-1">
          <div
            v-for="employee in dashboard.attendance.management_present"
            :key="employee.nik"
            class="group relative flex flex-col justify-between rounded-2xl border border-default bg-elevated/20 p-4 shadow-xs transition-all hover:border-primary/40 hover:bg-card"
          >
            <div>
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold text-primary truncate max-w-[150px]">{{ employee.department }}</span>
                <span class="size-2 rounded-full bg-emerald-500"></span>
              </div>
              <p class="font-bold text-highlighted mt-1 text-sm truncate" :title="employee.name">{{ employee.name }}</p>
              <p class="text-xs text-muted truncate mt-0.5" :title="employee.position">{{ employee.position }}</p>
            </div>

            <div class="mt-3 flex items-center justify-between rounded-xl border border-default/60 bg-card px-3 py-2 text-xs">
              <div>
                <p class="text-[10px] uppercase font-semibold text-muted">Masuk</p>
                <p class="font-bold text-highlighted mt-0.5">{{ formatTime(employee.scan_in) }}</p>
              </div>
              <div class="text-right">
                <p class="text-[10px] uppercase font-semibold text-muted">Keluar</p>
                <p class="font-bold text-highlighted mt-0.5">
                  {{ employee.scan_out ? formatTime(employee.scan_out) : 'Belum scan' }}
                </p>
              </div>
            </div>
          </div>

          <p v-if="!dashboard.attendance.management_present.length" class="col-span-full py-6 text-center text-sm text-muted">
            Belum ada atasan operasional yang terpetakan hadir hari ini.
          </p>
        </div>
      </div>

      <!-- Section 2: Monitoring Minimum Kehadiran Bulanan -->
      <div
        v-if="dashboard.monthly_attendance_monitoring.visible"
        class="rounded-2xl border border-default bg-card p-6 shadow-xs space-y-4"
      >
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-default pb-4">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-primary">Kepatuhan Kerja</span>
            <h2 class="text-lg font-bold text-highlighted mt-0.5">Monitoring Minimum Kehadiran Bulanan</h2>
            <p class="text-xs text-muted">
              Target: {{ dashboard.monthly_attendance_monitoring.ideal_attendance_days }} hari hadir dan {{ dashboard.monthly_attendance_monitoring.minimum_work_duration }}.
            </p>
          </div>
          <span class="self-start sm:self-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500">
            Tampil Tanggal 26+
          </span>
        </div>

        <UAlert
          v-if="!dashboard.monthly_attendance_monitoring.records.length"
          color="success"
          variant="subtle"
          icon="i-lucide-check-circle"
          title="Seluruh Karyawan Memenuhi Target"
          description="Seluruh karyawan telah mencapai minimum hari dan durasi kerja pada periode berjalan."
        />

        <div v-else class="max-h-80 overflow-auto rounded-xl border border-default">
          <table class="w-full text-sm">
            <thead class="bg-elevated/40 text-left text-xs font-semibold text-muted uppercase">
              <tr>
                <th class="p-3">Karyawan</th>
                <th class="p-3">Departemen</th>
                <th class="p-3">Kehadiran</th>
                <th class="p-3">Durasi</th>
                <th class="p-3">Perhatian</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr
                v-for="record in dashboard.monthly_attendance_monitoring.records"
                :key="record.nik"
                class="hover:bg-elevated/20 transition-colors"
              >
                <td class="p-3">
                  <p class="font-bold text-highlighted">{{ record.name }}</p>
                  <p class="text-xs text-muted">{{ record.nik }}</p>
                </td>
                <td class="p-3 text-muted">{{ record.department }}</td>
                <td class="p-3 font-semibold text-highlighted">{{ record.total_attendance }} hari</td>
                <td class="p-3 text-muted">{{ record.total_work_duration }}</td>
                <td class="p-3">
                  <span v-if="record.attendance_shortage" class="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-500">
                    Kurang {{ record.attendance_shortage }} hari
                  </span>
                  <span v-if="record.work_duration_shortage_minutes" class="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500 ml-1">
                    Kurang {{ record.work_duration_shortage }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section 3: Absensi Belum Lengkap Kemarin -->
      <div class="rounded-2xl border border-default bg-card p-6 shadow-xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-default pb-4">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-primary">Koreksi Absen</span>
            <h2 class="text-lg font-bold text-highlighted mt-0.5">Absensi Belum Lengkap Kemarin</h2>
            <p class="text-xs text-muted">Data absensi {{ formatDate(dashboard.yesterday_incomplete_attendance.date) }} dengan salah satu scan belum lengkap.</p>
          </div>
          <span class="self-start sm:self-center rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-500">
            {{ incompleteAttendanceRecords.length }} Perlu Ditindaklanjuti
          </span>
        </div>

        <UAlert
          v-if="dashboard.yesterday_incomplete_attendance.unlinked_pin_count"
          color="warning"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          :title="`${dashboard.yesterday_incomplete_attendance.unlinked_pin_count} Karyawan Belum Ada PIN`"
          description="Karyawan terjadwal belum memiliki PIN sehingga belum dapat diperiksa absensinya."
        />

        <div class="overflow-x-auto rounded-xl border border-default">
          <table class="w-full text-sm">
            <thead class="bg-elevated/40 text-left text-xs font-semibold text-muted uppercase">
              <tr>
                <th class="p-3">Karyawan</th>
                <th class="p-3">Departemen</th>
                <th class="p-3">Masuk</th>
                <th class="p-3">Pulang</th>
                <th class="p-3">Temuan</th>
                <th class="p-3">Aksi</th>
                <th class="p-3">Notifikasi WA</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr
                v-for="item in paginatedIncompleteAttendance"
                :key="item.nik"
                class="hover:bg-elevated/20 transition-colors"
              >
                <td class="p-3 font-bold text-highlighted">{{ item.name }}</td>
                <td class="p-3 text-muted">{{ item.department }}</td>
                <td class="p-3 font-medium text-highlighted">{{ formatTime(item.scan_in) }}</td>
                <td class="p-3 font-medium text-highlighted">{{ formatTime(item.scan_out) }}</td>
                <td class="p-3">
                  <span class="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500">
                    {{ missingScanLabel(item) }}
                  </span>
                </td>
                <td class="p-3">
                  <UButton
                    :to="{
                      name: 'hr-attendance-corrections',
                      query: {
                        date: dashboard.yesterday_incomplete_attendance.date,
                        nik: item.nik,
                      },
                    }"
                    label="Koreksi"
                    size="xs"
                    color="primary"
                    variant="soft"
                    icon="i-lucide-pencil-line"
                  />
                </td>
                <td class="p-3">
                  <span class="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-500">
                    {{ item.whatsapp_notification_status || 'Terkirim' }}
                  </span>
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
          class="flex justify-end pt-2"
        >
          <UPagination
            v-model:page="incompleteAttendancePage"
            :total="incompleteAttendanceRecords.length"
            :items-per-page="incompleteAttendanceItemsPerPage"
            :sibling-count="1"
            show-controls
          />
        </div>
      </div>
    </div>
  </div>
</template>
