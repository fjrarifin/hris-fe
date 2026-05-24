<script setup>
import { reactive, ref } from 'vue'
import {
  getHrDepartmentEmployees,
  getHrEmployeeSchedule,
  getHrScheduleDepartments,
  saveHrEmployeeSchedule,
  uploadHrSchedule,
} from '../services/hrService'
import { apiError, formatDate } from '../utils/formatters'

const filters = reactive({ start_date: '', end_date: '' })
const departments = ref([])
const selectedDepartment = ref('')
const employees = ref([])
const employeeSchedule = ref(null)
const file = ref(null)
const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const message = ref('')
const errorMessage = ref('')

const params = () => ({ start_date: filters.start_date, end_date: filters.end_date })

async function loadDepartments() {
  loading.value = true
  message.value = ''
  errorMessage.value = ''
  selectedDepartment.value = ''
  employees.value = []
  employeeSchedule.value = null
  try {
    departments.value = (await getHrScheduleDepartments(params())).data.departments
  } catch (error) {
    departments.value = []
    errorMessage.value = apiError(error, 'Departemen tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function selectDepartment(department) {
  selectedDepartment.value = department
  employeeSchedule.value = null
  try {
    employees.value = (await getHrDepartmentEmployees({ ...params(), department })).data.employees
  } catch (error) {
    errorMessage.value = apiError(error, 'Karyawan departemen tidak dapat dimuat.')
  }
}

async function openEmployee(nik) {
  try {
    employeeSchedule.value = (await getHrEmployeeSchedule(nik, params())).data
  } catch (error) {
    errorMessage.value = apiError(error, 'Detail jadwal karyawan tidak dapat dimuat.')
  }
}

async function saveSchedule() {
  saving.value = true
  errorMessage.value = ''
  try {
    message.value = (
      await saveHrEmployeeSchedule(employeeSchedule.value.employee.nik, {
        ...params(),
        schedules: employeeSchedule.value.dates,
      })
    ).data.message
    await selectDepartment(selectedDepartment.value)
  } catch (error) {
    errorMessage.value = apiError(error, 'Jadwal tidak dapat disimpan.')
  } finally {
    saving.value = false
  }
}

function chooseFile(event) {
  file.value = event.target.files[0] || null
}

async function upload() {
  const payload = new FormData()
  payload.append('department', selectedDepartment.value)
  payload.append('start_date', filters.start_date)
  payload.append('end_date', filters.end_date)
  payload.append('file', file.value)
  uploading.value = true
  errorMessage.value = ''
  try {
    message.value = (await uploadHrSchedule(payload)).data.message
    await selectDepartment(selectedDepartment.value)
  } catch (error) {
    errorMessage.value = apiError(error, 'Upload jadwal tidak dapat diproses.')
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Jadwal Karyawan</h2>
      <p class="mt-1 text-sm text-muted">
        Tarik periode terlebih dahulu, lalu kelola jadwal per departemen atau per karyawan. Maksimal
        46 hari.
      </p>
    </div>
    <UAlert v-if="message" color="success" variant="subtle" :description="message" />
    <UAlert v-if="errorMessage" color="error" variant="subtle" :description="errorMessage" />

    <UCard title="Filter Periode Jadwal">
      <form class="flex flex-col gap-4 sm:flex-row sm:items-end" @submit.prevent="loadDepartments">
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
        <UButton type="submit" label="Tampilkan Departemen" :loading="loading" />
      </form>
    </UCard>

    <UCard v-if="departments.length" title="Departemen">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">Departemen</th>
              <th class="p-3">Karyawan</th>
              <th class="p-3">Hari Terjadwal</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="department in departments"
              :key="department.department"
              class="border-t border-default"
            >
              <td class="p-3 font-medium text-highlighted">{{ department.department }}</td>
              <td class="p-3">{{ department.employee_count }}</td>
              <td class="p-3">{{ department.scheduled_days }}</td>
              <td class="p-3">
                <UButton
                  size="xs"
                  variant="soft"
                  label="Detail"
                  @click="selectDepartment(department.department)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
    <UCard v-else-if="!loading && filters.start_date && filters.end_date">
      <p class="py-8 text-center text-sm text-muted">
        Tidak ada departemen untuk periode yang dipilih.
      </p>
    </UCard>

    <UCard v-if="selectedDepartment" :title="`Karyawan - ${selectedDepartment}`">
      <form class="mb-5 rounded-xl border border-default p-4" @submit.prevent="upload">
        <p class="mb-3 text-sm text-muted">
          Upload jadwal departemen (`.xlsx`, `.xls`, atau `.csv`): kolom pertama NIK, kolom
          berikutnya tanggal dengan isi kode shift.
        </p>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            required
            class="rounded-lg border border-default bg-default p-2 text-sm text-highlighted"
            @change="chooseFile"
          />
          <UButton type="submit" label="Upload Jadwal" :disabled="!file" :loading="uploading" />
        </div>
      </form>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">NIK</th>
              <th class="p-3">Nama</th>
              <th class="p-3">Jabatan</th>
              <th class="p-3">Unit</th>
              <th class="p-3">Hari Terjadwal</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="employee in employees" :key="employee.nik" class="border-t border-default">
              <td class="p-3">{{ employee.nik }}</td>
              <td class="p-3 font-medium text-highlighted">{{ employee.name }}</td>
              <td class="p-3">{{ employee.position }}</td>
              <td class="p-3">{{ employee.unit }}</td>
              <td class="p-3">{{ employee.scheduled_days }}</td>
              <td class="p-3">
                <UButton
                  size="xs"
                  variant="soft"
                  label="Atur Jadwal"
                  @click="openEmployee(employee.nik)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <UCard v-if="employeeSchedule" :title="`Assignment Harian - ${employeeSchedule.employee.name}`">
      <form @submit.prevent="saveSchedule">
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label v-for="date in employeeSchedule.dates" :key="date.date" class="text-sm text-muted">
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
                {{ category.code }} - {{ category.name }}
              </option>
            </select>
          </label>
        </div>
        <UButton type="submit" label="Simpan Jadwal Karyawan" class="mt-5" :loading="saving" />
      </form>
    </UCard>
  </section>
</template>
