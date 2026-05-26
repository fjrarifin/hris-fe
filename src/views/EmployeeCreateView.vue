<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import EmployeeFormFields from '../components/EmployeeFormFields.vue'
import { createEmployee, getEmployees } from '../services/employeeService'
import { apiError } from '../utils/formatters'

const router = useRouter()
const form = reactive({
  nik: '',
  pin: '',
  nama_karyawan: '',
  status_karyawan: 'AKTIF',
  status_kontrak: 'AKTIF',
  kewarganegaraan: 'Indonesia',
  npwp: false,
  bpjs: false,
})
const supervisorOptions = ref([])
const loadingOptions = ref(false)
const saving = ref(false)
const errorMessage = ref('')

async function loadOptions() {
  loadingOptions.value = true
  try {
    const response = await getEmployees()
    supervisorOptions.value = response.data.data ?? []
  } catch (error) {
    errorMessage.value = apiError(error, 'Pilihan atasan tidak dapat dimuat.')
  } finally {
    loadingOptions.value = false
  }
}

async function submit() {
  saving.value = true
  errorMessage.value = ''
  try {
    const { data } = await createEmployee(form)
    await router.push({
      name: 'employee-detail',
      params: { nik: data.data.nik },
      query: { created: '1' },
    })
  } catch (error) {
    errorMessage.value = apiError(error, 'Data karyawan tidak dapat ditambahkan.')
  } finally {
    saving.value = false
  }
}

onMounted(loadOptions)
</script>

<template>
  <form class="space-y-6" @submit.prevent="submit">
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h2 class="text-2xl font-semibold text-highlighted">Tambah Karyawan</h2>
        <p class="mt-1 text-sm text-muted">Lengkapi data profil karyawan baru.</p>
      </div>
      <div class="flex gap-2">
        <UButton to="/employees" color="neutral" variant="outline" label="Batal" />
        <UButton type="submit" label="Simpan Karyawan" :loading="saving" />
      </div>
    </div>
    <UAlert v-if="errorMessage" color="error" variant="subtle" :description="errorMessage" />
    <EmployeeFormFields
      :form="form"
      :supervisor-options="supervisorOptions"
      :loading-options="loadingOptions"
      creating
    />
  </form>
</template>
