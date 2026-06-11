<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getHrAttendanceCorrections, saveHrAttendanceCorrection } from '../services/hrService'
import { apiError, formatDate } from '../utils/formatters'

const route = useRoute()
const filters = reactive({ start_date: '', end_date: '', q: '', status_filter: 'attention_only' })
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
const flattenedAuditLogs = computed(() =>
  (data.value?.audit_logs || []).flatMap((log) =>
    (log.changes?.length
      ? log.changes
      : [{ field: 'action', label: 'Aktivitas', old: '-', new: actionLabel(log.action) }]
    ).map((change, index) => ({
      id: `${log.id}-${change.field}-${index}`,
      date: formatDate(log.created_at),
      time: new Date(log.created_at).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      changed_by_name: log.changed_by_name,
      source_label: log.source_label,
      subject_label: log.subject_label,
      label: change.label,
      old: change.old,
      new: change.new,
    })),
  ),
)

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

function auditValue(value) {
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : '-'
  }

  return value === null || value === undefined || value === '' ? '-' : value
}

function actionLabel(action) {
  return action === 'created' ? 'Dibuat' : action === 'deleted' ? 'Dihapus' : 'Diubah'
}

function findingLabel(record) {
  return record.finding
}

function periodLabel() {
  if (!data.value) {
    return `${formatDate(filters.start_date)} - ${formatDate(filters.end_date)}`
  }

  return data.value.start_date === data.value.end_date
    ? formatDate(data.value.start_date)
    : `${formatDate(data.value.start_date)} - ${formatDate(data.value.end_date)}`
}

function selectRecord(record) {
  selected.value = record
  form.corrected_scan_in =
    record.correction?.corrected_scan_in?.slice(0, 5) || record.scan_in?.slice(0, 5) || ''
  form.corrected_scan_out =
    record.correction?.corrected_scan_out?.slice(0, 5) || record.scan_out?.slice(0, 5) || ''
  form.has_missing_attendance_form = record.correction?.has_missing_attendance_form === true
  form.notes = record.correction?.notes || ''
}

async function load(requestedPage = 1) {
  loading.value = true
  errorMessage.value = ''
  try {
    data.value = (
      await getHrAttendanceCorrections({
        start_date: filters.start_date,
        end_date: filters.end_date,
        q: filters.q || undefined,
        status_filter: filters.status_filter,
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
      attendance_date: selected.value.date,
      corrected_scan_in: form.corrected_scan_in,
      corrected_scan_out: form.corrected_scan_out,
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
  const date = String(route.query.date || '')
  filters.start_date = String(route.query.start_date || date || yesterdayDate())
  filters.end_date = String(route.query.end_date || date || filters.start_date)
  filters.q = String(route.query.nik || '')
  if (filters.q) {
    filters.status_filter = 'all'
  }
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

    <AlertToastBridge :message="message" :error="errorMessage" />

    <UCard title="Filter Data Koreksi Absensi">
      <form class="flex flex-col gap-4 sm:flex-row sm:items-end" @submit.prevent="load(1)">
        <label class="text-sm text-muted">
          Tanggal Awal
          <input
            v-model="filters.start_date"
            type="date"
            required
            class="mt-2 block rounded-lg border border-default bg-default p-2.5 text-highlighted"
          />
        </label>
        <label class="text-sm text-muted">
          Tanggal Akhir
          <input
            v-model="filters.end_date"
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
        <label class="text-sm text-muted">
          Filter Status
          <select
            v-model="filters.status_filter"
            class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
          >
            <option value="attention_only">Perlu Dicek</option>
            <option value="alpha_only">Hanya Alpha & Scan Tidak Lengkap</option>
            <option value="all">Semua Tanggal</option>
          </select>
        </label>
        <UButton type="submit" label="Tampilkan" icon="i-lucide-search" :loading="loading" />
      </form>
    </UCard>

    <UCard :title="`Temuan Absensi - ${periodLabel()}`">
      <div v-if="loading && !data" class="py-10 text-center text-sm text-muted">
        Memuat temuan absensi...
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">Karyawan</th>
              <th class="p-3">Tanggal</th>
              <th class="p-3">Departemen</th>
              <th class="p-3">Scan Masuk</th>
              <th class="p-3">Scan Pulang</th>
              <th class="p-3">Durasi</th>
              <th class="p-3">Temuan</th>
              <th class="p-3">Status Absensi</th>
              <th class="p-3">Status Koreksi</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in data?.records || []"
              :key="`${record.date}|${record.nik}`"
              class="border-t border-default"
            >
              <td class="p-3">
                <p class="font-medium text-highlighted">{{ record.name }}</p>
                <p class="text-xs text-muted">{{ record.nik }} - {{ record.position }}</p>
              </td>
              <td class="p-3">{{ formatDate(record.date) }}</td>
              <td class="p-3">{{ record.department }}</td>
              <td class="p-3">{{ formatTime(record.scan_in) }}</td>
              <td class="p-3">{{ formatTime(record.scan_out) }}</td>
              <td class="p-3">{{ record.duration || '-' }}</td>
              <td class="p-3">{{ findingLabel(record) }}</td>
              <td class="p-3">
                <UBadge
                  v-if="record.status_code === 'M' || record.status_code === 'H'"
                  :color="record.status_code === 'M' ? 'danger' : 'warning'"
                  variant="subtle"
                  :label="record.status_label"
                />
                <UBadge v-else color="info" variant="subtle" :label="record.status_label" />
              </td>
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
              <td colspan="9" class="p-8 text-center text-muted">
                Tidak ada data absensi pada filter ini.
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
              :value="formatDate(selected.date)"
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
          <label class="text-sm text-muted">
            Koreksi Jam Masuk
            <input
              v-model="form.corrected_scan_in"
              type="time"
              :required="!selected.raw_scan_in"
              class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            />
          </label>
          <label class="text-sm text-muted">
            Koreksi Jam Pulang
            <input
              v-model="form.corrected_scan_out"
              type="time"
              :required="!selected.raw_scan_out"
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

    <UCard v-if="data" title="Riwayat Perubahan Koreksi Absensi">
      <template #header>
        <div>
          <h3 class="font-semibold text-highlighted">Riwayat Perubahan Koreksi Absensi</h3>
          <p class="mt-1 text-sm text-muted">
            Catatan perubahan koreksi absensi pada karyawan dan periode filter saat ini.
          </p>
        </div>
      </template>

      <div v-if="flattenedAuditLogs.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">Tanggal</th>
              <th class="p-3">Jam</th>
              <th class="p-3">Diubah Oleh</th>
              <th class="p-3">Data</th>
              <th class="p-3">Field</th>
              <th class="p-3">Sebelumnya</th>
              <th class="p-3">Menjadi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in flattenedAuditLogs" :key="log.id" class="border-t border-default">
              <td class="p-3 whitespace-nowrap">{{ log.date }}</td>
              <td class="p-3 whitespace-nowrap">{{ log.time }}</td>
              <td class="p-3 font-medium text-highlighted">{{ log.changed_by_name }}</td>
              <td class="p-3">{{ log.subject_label }}</td>
              <td class="p-3 font-medium text-highlighted">{{ log.label }}</td>
              <td class="p-3 text-muted">{{ auditValue(log.old) }}</td>
              <td class="p-3">{{ auditValue(log.new) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="py-8 text-center text-sm text-muted">
        Belum ada riwayat perubahan koreksi absensi pada filter ini.
      </p>
    </UCard>
  </section>
</template>
