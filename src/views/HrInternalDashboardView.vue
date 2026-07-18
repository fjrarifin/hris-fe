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
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Dashboard Internal HR</h2>
      <p class="mt-1 text-sm text-muted">
        Monitoring internal kehadiran atasan operasional, minimum bulanan, dan absensi yang perlu
        koreksi.
      </p>
    </div>

    <AlertToastBridge :error="errorMessage" />

    <div v-if="loading" class="py-12 text-center text-sm text-muted">Memuat monitoring...</div>

    <div v-else-if="dashboard" class="space-y-6">
      <UCard
        title="Atasan Operasional Hadir Hari Ini"
        description="Manager, Asst. Manager, Supervisor/SPV, dan Leader berdasarkan scan absensi hari ini."
      >
        <div class="grid gap-3 sm:grid-cols-2">
          <div
            v-for="employee in dashboard.attendance.management_present"
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
                <p class="mt-1 font-medium text-highlighted">{{ formatTime(employee.scan_in) }}</p>
              </div>
              <div class="text-right">
                <p class="text-xs text-muted">Keluar</p>
                <p class="mt-1 font-medium text-highlighted">
                  {{ employee.scan_out ? formatTime(employee.scan_out) : 'Belum scan' }}
                </p>
              </div>
            </div>
          </div>
          <p v-if="!dashboard.attendance.management_present.length" class="py-3 text-sm text-muted">
            Belum ada atasan operasional terpetakan hadir.
          </p>
        </div>
      </UCard>

      <UCard
        v-if="dashboard.monthly_attendance_monitoring.visible"
        title="Monitoring Minimum Kehadiran Bulanan"
        :description="`Tampil mulai tanggal 26. Target: ${dashboard.monthly_attendance_monitoring.ideal_attendance_days} hari hadir dan ${dashboard.monthly_attendance_monitoring.minimum_work_duration}. PH dan Cuti disetujui dihitung 8 jam.`"
      >
        <UAlert
          v-if="!dashboard.monthly_attendance_monitoring.records.length"
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
                v-for="record in dashboard.monthly_attendance_monitoring.records"
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

      <UCard
        title="Absensi Belum Lengkap Kemarin"
        :description="`Data absensi ${formatDate(dashboard.yesterday_incomplete_attendance.date)} dengan salah satu scan belum lengkap.`"
      >
        <UAlert
          v-if="dashboard.yesterday_incomplete_attendance.unlinked_pin_count"
          color="warning"
          variant="subtle"
          class="mb-4"
          :description="`${dashboard.yesterday_incomplete_attendance.unlinked_pin_count} karyawan terjadwal belum memiliki PIN sehingga belum dapat diperiksa absensinya.`"
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
                        date: dashboard.yesterday_incomplete_attendance.date,
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
  </section>
</template>
