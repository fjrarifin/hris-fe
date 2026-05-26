<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getHrAttendanceCorrections, saveHrAttendanceCorrection } from '../services/hrService'
import { apiError, formatDate } from '../utils/formatters'

const route = useRoute()
const filters = reactive({ date: '', q: '' })
const data = ref(null)
const selected = ref(null)
const form = reactive({
  corrected_scan_in: '',
  corrected_scan_out: '',
  has_missing_attendance_form: false,
  notes: '',
})
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')

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

function findingLabel(record) {
  return record.raw_scan_in ? 'Tidak absen pulang' : 'Tidak absen masuk'
}

function selectRecord(record) {
  selected.value = record
  form.corrected_scan_in = record.correction?.corrected_scan_in?.slice(0, 5) || ''
  form.corrected_scan_out = record.correction?.corrected_scan_out?.slice(0, 5) || ''
  form.has_missing_attendance_form = record.correction?.has_missing_attendance_form === true
  form.notes = record.correction?.notes || ''
}

async function load(requestedPage = 1) {
  loading.value = true
  errorMessage.value = ''
  try {
    data.value = (
      await getHrAttendanceCorrections({
        date: filters.date,
        q: filters.q || undefined,
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
      attendance_date: filters.date,
      corrected_scan_in: selected.value.raw_scan_in ? null : form.corrected_scan_in,
      corrected_scan_out: selected.value.raw_scan_out ? null : form.corrected_scan_out,
      has_missing_attendance_form: form.has_missing_attendance_form ? true : null,
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

onMounted(() => {
  filters.date = String(route.query.date || yesterdayDate())
  filters.q = String(route.query.nik || '')
  load()
})
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Koreksi Absensi</h2>
      <p class="mt-1 text-sm text-muted">
        Lengkapi jam masuk atau jam pulang yang terlewat tanpa mengubah log mesin absensi asli.
      </p>
    </div>

    <UAlert v-if="message" color="success" variant="subtle" :description="message" />
    <UAlert v-if="errorMessage" color="error" variant="subtle" :description="errorMessage" />

    <UCard title="Filter Data Absensi Tidak Lengkap">
      <form class="flex flex-col gap-4 sm:flex-row sm:items-end" @submit.prevent="load(1)">
        <label class="text-sm text-muted">
          Tanggal Absensi
          <input
            v-model="filters.date"
            type="date"
            required
            class="mt-2 block rounded-lg border border-default bg-default p-2.5 text-highlighted"
          />
        </label>
        <label class="flex-1 text-sm text-muted">
          Cari Karyawan
          <input
            v-model="filters.q"
            type="search"
            placeholder="Nama atau NIK"
            class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
          />
        </label>
        <UButton type="submit" label="Tampilkan" icon="i-lucide-search" :loading="loading" />
      </form>
    </UCard>

    <UCard :title="`Temuan Absensi - ${formatDate(data?.date || filters.date)}`">
      <div v-if="loading && !data" class="py-10 text-center text-sm text-muted">
        Memuat temuan absensi...
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">Karyawan</th>
              <th class="p-3">Departemen</th>
              <th class="p-3">Scan Masuk</th>
              <th class="p-3">Scan Pulang</th>
              <th class="p-3">Temuan</th>
              <th class="p-3">Status</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in data?.records || []"
              :key="record.nik"
              class="border-t border-default"
            >
              <td class="p-3">
                <p class="font-medium text-highlighted">{{ record.name }}</p>
                <p class="text-xs text-muted">{{ record.nik }} - {{ record.position }}</p>
              </td>
              <td class="p-3">{{ record.department }}</td>
              <td class="p-3">{{ formatTime(record.scan_in) }}</td>
              <td class="p-3">{{ formatTime(record.scan_out) }}</td>
              <td class="p-3">{{ findingLabel(record) }}</td>
              <td class="p-3">
                <UBadge
                  :color="record.is_resolved ? 'success' : 'warning'"
                  variant="subtle"
                  :label="record.is_resolved ? 'Sudah Dikoreksi' : 'Perlu Koreksi'"
                />
              </td>
              <td class="p-3">
                <UButton
                  size="xs"
                  variant="soft"
                  :label="record.is_resolved ? 'Lihat / Edit' : 'Koreksi'"
                  @click="selectRecord(record)"
                />
              </td>
            </tr>
            <tr v-if="!data?.records?.length">
              <td colspan="7" class="p-8 text-center text-muted">
                Tidak ada scan masuk atau pulang yang perlu dikoreksi pada tanggal ini.
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
              :value="filters.date"
              disabled
              class="mt-2 block w-full rounded-lg border border-default bg-elevated p-2.5 text-muted"
            />
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
          <label v-if="!selected.raw_scan_in" class="text-sm text-muted">
            Koreksi Jam Masuk
            <input
              v-model="form.corrected_scan_in"
              type="time"
              required
              class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            />
          </label>
          <label v-if="!selected.raw_scan_out" class="text-sm text-muted">
            Koreksi Jam Pulang
            <input
              v-model="form.corrected_scan_out"
              type="time"
              required
              class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            />
          </label>
        </div>

        <label class="flex items-center gap-3 text-sm text-highlighted">
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
  </section>
</template>
