<script setup>
import { computed, nextTick, reactive, ref } from 'vue'
import {
  downloadTeamScheduleTemplate,
  getTeamEmployeeSchedule,
  getTeamSchedules,
  saveTeamEmployeeSchedule,
  uploadTeamSchedule,
} from '../services/staffService'
import { apiError, formatDate } from '../utils/formatters'

const filters = reactive({ start_date: '', end_date: '' })
const team = ref(null)
const employeeSchedule = ref(null)
const file = ref(null)
const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const downloadingTemplate = ref(false)
const message = ref('')
const errorMessage = ref('')
const detailCard = ref(null)
const scheduleCategories = computed(
  () => employeeSchedule.value?.categories ?? team.value?.categories ?? [],
)

const params = () => ({ start_date: filters.start_date, end_date: filters.end_date })

async function loadTeam() {
  loading.value = true
  message.value = ''
  errorMessage.value = ''
  employeeSchedule.value = null

  try {
    team.value = (await getTeamSchedules(params())).data
  } catch (error) {
    team.value = null
    errorMessage.value = apiError(error, 'Jadwal tim tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function openEmployee(nik) {
  errorMessage.value = ''
  try {
    employeeSchedule.value = (await getTeamEmployeeSchedule(nik, params())).data
    await nextTick()
    detailCard.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } catch (error) {
    errorMessage.value = apiError(error, 'Detail jadwal bawahan tidak dapat dimuat.')
  }
}

async function saveSchedule() {
  saving.value = true
  errorMessage.value = ''
  try {
    const response = await saveTeamEmployeeSchedule(employeeSchedule.value.employee.nik, {
      ...params(),
      schedules: employeeSchedule.value.dates,
    })
    await loadTeam()
    message.value = response.data.message
  } catch (error) {
    errorMessage.value = apiError(error, 'Jadwal bawahan tidak dapat disimpan.')
  } finally {
    saving.value = false
  }
}

function chooseFile(event) {
  file.value = event.target.files[0] || null
}

function scheduleTime(category) {
  if (!category.start_time || !category.end_time) return 'Tanpa jam kerja'

  return `${String(category.start_time).slice(0, 5)} - ${String(category.end_time).slice(0, 5)}`
}

function categoryOption(category) {
  return `${category.code} - ${category.name} (${scheduleTime(category)})`
}

async function downloadTemplate() {
  downloadingTemplate.value = true
  errorMessage.value = ''
  try {
    const response = await downloadTeamScheduleTemplate(params())
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = `Template_Jadwal_Tim_${filters.start_date}_${filters.end_date}.csv`
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    errorMessage.value = apiError(error, 'Template jadwal tim tidak dapat diunduh.')
  } finally {
    downloadingTemplate.value = false
  }
}

async function upload() {
  const payload = new FormData()
  payload.append('start_date', filters.start_date)
  payload.append('end_date', filters.end_date)
  payload.append('file', file.value)
  uploading.value = true
  errorMessage.value = ''
  try {
    const response = await uploadTeamSchedule(payload)
    file.value = null
    await loadTeam()
    message.value = response.data.message
  } catch (error) {
    errorMessage.value = apiError(error, 'Upload jadwal tim tidak dapat diproses.')
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Jadwal Tim</h2>
      <p class="mt-1 text-sm text-muted">
        Atur jadwal karyawan yang terdaftar sebagai bawahan langsung atau bawahan tidak langsung
        Anda. Periode maksimal 46 hari.
      </p>
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <UCard title="Filter Periode Jadwal">
      <form class="flex flex-col gap-4 sm:flex-row sm:items-end" @submit.prevent="loadTeam">
        <label class="text-sm text-muted"
          >Dari Tanggal
          <input
            v-model="filters.start_date"
            type="date"
            required
            class="mt-2 block rounded-lg border border-default bg-default p-2.5 text-highlighted"
          />
        </label>
        <label class="text-sm text-muted"
          >Sampai Tanggal
          <input
            v-model="filters.end_date"
            type="date"
            required
            class="mt-2 block rounded-lg border border-default bg-default p-2.5 text-highlighted"
          />
        </label>
        <UButton type="submit" label="Tampilkan Tim" :loading="loading" />
      </form>
    </UCard>

    <UCard v-if="team" :title="`Daftar Bawahan - ${team.supervisor.name}`">
      <form
        v-if="team.employees.length"
        class="mb-5 rounded-xl border border-default p-4"
        @submit.prevent="upload"
      >
        <p class="mb-3 text-sm text-muted">
          Template otomatis berisi seluruh bawahan langsung dan tidak langsung Anda pada periode
          yang dipilih.
        </p>
        <ol class="mb-4 list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>Unduh template CSV, lalu isi kode jadwal pada kolom tanggal.</li>
          <li>Gunakan kode jadwal sesuai panduan di bawah, misalnya P0, M1, C, O, atau PH.</li>
          <li>Upload kembali file tersebut. NIK yang bukan bawahan Anda akan dilewati.</li>
        </ol>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            required
            class="rounded-lg border border-default bg-default p-2 text-sm text-highlighted"
            @change="chooseFile"
          />
          <UButton
            type="button"
            color="neutral"
            variant="outline"
            icon="i-lucide-download"
            label="Unduh Template CSV"
            :loading="downloadingTemplate"
            @click="downloadTemplate"
          />
          <UButton type="submit" label="Upload Jadwal Tim" :disabled="!file" :loading="uploading" />
        </div>
      </form>

      <div v-if="team.employees.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">NIK</th>
              <th class="p-3">Nama</th>
              <th class="p-3">Jabatan</th>
              <th class="p-3">Departemen</th>
              <th class="p-3">Unit</th>
              <th class="p-3">Relasi</th>
              <th class="p-3">Total Hari</th>
              <th class="p-3">Jadwal Terisi</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="employee in team.employees"
              :key="employee.nik"
              class="border-t border-default"
            >
              <td class="p-3">{{ employee.nik }}</td>
              <td class="p-3 font-medium text-highlighted">{{ employee.name }}</td>
              <td class="p-3">{{ employee.position }}</td>
              <td class="p-3">{{ employee.department }}</td>
              <td class="p-3">{{ employee.unit }}</td>
              <td class="p-3">
                <UBadge color="primary" variant="subtle" :label="employee.relationship" />
              </td>
              <td class="p-3">{{ employee.total_period_days }}</td>
              <td class="p-3">{{ employee.scheduled_days }}</td>
              <td class="p-3">
                <UButton
                  size="xs"
                  variant="soft"
                  label="Detail / Edit"
                  @click="openEmployee(employee.nik)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="py-8 text-center text-sm text-muted">
        Belum ada bawahan langsung atau tidak langsung yang terhubung.
      </p>
    </UCard>

    <UCard v-if="scheduleCategories.length" title="Panduan Kode Jadwal">
      <p class="mb-4 text-sm text-muted">
        Gunakan kode berikut pada dropdown edit atau pada kolom tanggal dalam template upload.
      </p>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="category in scheduleCategories"
          :key="category.code"
          class="rounded-lg border border-default p-3"
        >
          <p class="font-medium text-highlighted">{{ category.code }} - {{ category.name }}</p>
          <p class="mt-1 text-sm text-muted">{{ scheduleTime(category) }}</p>
        </div>
      </div>
    </UCard>

    <div v-if="employeeSchedule" ref="detailCard">
      <UCard :title="`Assignment Harian - ${employeeSchedule.employee.name}`">
        <form @submit.prevent="saveSchedule">
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label
              v-for="date in employeeSchedule.dates"
              :key="date.date"
              class="text-sm text-muted"
            >
              {{ formatDate(date.date) }}
              <select
                v-model="date.code"
                class="mt-2 w-full rounded-lg border border-default bg-default p-2 text-highlighted"
              >
                <option value="">Belum ditentukan</option>
                <option
                  v-for="category in employeeSchedule.categories"
                  :key="category.code"
                  :value="category.code"
                >
                  {{ categoryOption(category) }}
                </option>
              </select>
            </label>
          </div>
          <UButton type="submit" label="Simpan Jadwal Bawahan" class="mt-5" :loading="saving" />
        </form>
      </UCard>
    </div>
  </section>
</template>
