<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import EmployeeFormFields from '../components/EmployeeFormFields.vue'
import { getEmployee, getEmployees, updateEmployee } from '../services/employeeService'
import { apiError } from '../utils/formatters'

const route = useRoute()
const form = reactive({})
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const message = ref(route.query.created ? 'Karyawan berhasil ditambahkan.' : '')
const supervisorOptions = ref([])
const contracts = ref([])
const activeContractId = ref(null)
const loadingOptions = ref(false)
const nik = computed(() => String(route.params.nik || ''))

function assignForm(data) {
  Object.assign(form, data)
  contracts.value = data.contracts ?? []
  activeContractId.value = data.active_contract_id ?? null
  for (const key of ['join_date', 'start_date', 'end_date', 'tanggal_lahir']) {
    form[key] = form[key] ? String(form[key]).slice(0, 10) : ''
  }
}

async function loadEmployee() {
  loading.value = true
  loadingOptions.value = true
  errorMessage.value = ''
  try {
    const [response, employeesResponse] = await Promise.all([
      getEmployee(nik.value),
      getEmployees(),
    ])
    assignForm(response.data.data ?? response.data)
    supervisorOptions.value = (employeesResponse.data.data ?? []).filter(
      (employee) => employee.nik !== nik.value,
    )
  } catch (error) {
    errorMessage.value = apiError(error, 'Detail karyawan tidak dapat dimuat.')
  } finally {
    loading.value = false
    loadingOptions.value = false
  }
}

async function save() {
  saving.value = true
  message.value = ''
  errorMessage.value = ''
  const payload = { ...form }
  delete payload.nik
  delete payload.pin
  if (!payload.posisi_level && !payload.posisi_title && payload.posisi) {
    delete payload.posisi_level
    delete payload.posisi_title
  }

  try {
    const { data } = await updateEmployee(nik.value, payload)
    assignForm(data.data)
    message.value = data.message
  } catch (error) {
    errorMessage.value = apiError(error, 'Perubahan karyawan tidak dapat disimpan.')
  } finally {
    saving.value = false
  }
}

onMounted(loadEmployee)
</script>

<template>
  <form class="space-y-6" @submit.prevent="save">
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <p class="text-sm text-muted">Data Karyawan / {{ nik }}</p>
        <h2 class="mt-1 text-2xl font-semibold text-highlighted">
          {{ form.nama_karyawan || 'Detail Karyawan' }}
        </h2>
        <p class="mt-1 text-sm text-muted">
          HRD dapat mengedit seluruh data kecuali NIK dan PIN absensi.
        </p>
      </div>
      <div class="flex gap-2">
        <UButton to="/employees" label="Kembali" color="neutral" variant="outline" />
        <UButton v-if="!loading" type="submit" label="Simpan Perubahan" :loading="saving" />
      </div>
    </div>

    <UAlert v-if="message" color="success" variant="subtle" :description="message" />
    <UAlert v-if="errorMessage" color="error" variant="subtle" :description="errorMessage" />

    <div v-if="loading" class="py-16 text-center text-sm text-muted">Memuat detail karyawan...</div>
    <template v-else-if="form.nik">
      <UCard>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
          <UAvatar
            :text="form.nama_karyawan?.slice(0, 2).toUpperCase()"
            color="primary"
            size="xl"
          />
          <div>
            <h3 class="text-lg font-semibold text-highlighted">{{ form.nama_karyawan }}</h3>
            <p class="text-sm text-muted">{{ form.posisi || form.jabatan || '-' }}</p>
          </div>
          <UBadge
            class="sm:ml-auto"
            color="primary"
            variant="subtle"
            :label="form.status_kontrak || '-'"
          />
        </div>
      </UCard>
      <EmployeeFormFields
        :form="form"
        :supervisor-options="supervisorOptions"
        :contracts="contracts"
        :active-contract-id="activeContractId"
        :loading-options="loadingOptions"
      />
    </template>
  </form>
</template>
