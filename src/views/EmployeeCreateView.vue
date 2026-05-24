<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import EmployeeFormFields from '../components/EmployeeFormFields.vue'
import { createEmployee } from '../services/employeeService'
import { apiError } from '../utils/formatters'

const router = useRouter()
const form = reactive({ nik: '', pin: '', nama_karyawan: '', npwp: false, bpjs: false })
const saving = ref(false)
const errorMessage = ref('')

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
    <EmployeeFormFields :form="form" creating />
  </form>
</template>
