<script setup>
import { onMounted, reactive, ref } from 'vue'
import { getStaffAttendance } from '../services/staffService'
import { apiError, formatDate } from '../utils/formatters'

const attendance = ref({
  employee: {},
  filters: {},
  summary: {},
  records: [],
})
const filters = reactive({
  start_date: '',
  end_date: '',
})
const loading = ref(true)
const errorMessage = ref('')

function formatTime(value) {
  return value ? `${value.slice(0, 5)} WIB` : '-'
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

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      title="Data absensi gagal dimuat"
      :description="errorMessage"
    />

    <UCard title="Filter Periode">
      <form class="flex flex-col gap-4 sm:flex-row sm:items-end" @submit.prevent="load">
        <label class="text-sm text-muted">
          Tanggal Mulai
          <input
            v-model="filters.start_date"
            type="date"
            class="mt-2 block rounded-lg border border-default bg-default p-2.5 text-highlighted"
          />
        </label>
        <label class="text-sm text-muted">
          Tanggal Selesai
          <input
            v-model="filters.end_date"
            type="date"
            class="mt-2 block rounded-lg border border-default bg-default p-2.5 text-highlighted"
          />
        </label>
        <div class="flex gap-2">
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

    <div class="grid gap-4 sm:grid-cols-3">
      <UCard>
        <p class="text-sm text-muted">Hari Tercatat</p>
        <p class="mt-2 text-3xl font-semibold text-highlighted">
          {{ attendance.summary.attendance_days || 0 }}
        </p>
      </UCard>
      <UCard>
        <p class="text-sm text-muted">Scan Lengkap</p>
        <p class="mt-2 text-3xl font-semibold text-highlighted">
          {{ attendance.summary.complete_days || 0 }}
        </p>
      </UCard>
      <UCard>
        <p class="text-sm text-muted">Belum Lengkap</p>
        <p class="mt-2 text-3xl font-semibold text-highlighted">
          {{ attendance.summary.incomplete_days || 0 }}
        </p>
      </UCard>
    </div>

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
                  :color="record.is_complete ? 'success' : 'warning'"
                  variant="subtle"
                  :label="record.is_complete ? 'Lengkap' : 'Belum Lengkap'"
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
