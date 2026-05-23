<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getEmployee } from '../services/employeeService'

const route = useRoute()
const employee = ref(null)
const loading = ref(false)
const errorMessage = ref('')

const nik = computed(() => String(route.params.nik || ''))

const jobInformation = computed(() => [
  { label: 'NIK', value: employee.value?.nik },
  { label: 'Nama', value: employee.value?.nama_karyawan },
  { label: 'Jabatan', value: employee.value?.jabatan },
  { label: 'Posisi', value: employee.value?.posisi },
  { label: 'Divisi', value: employee.value?.divisi },
  { label: 'Departemen', value: employee.value?.departement },
  { label: 'Unit', value: employee.value?.unit },
  { label: 'Atasan Langsung', value: employee.value?.nama_atasan_langsung },
  { label: 'Status Kontrak', value: employee.value?.status_kontrak },
  { label: 'Tanggal Bergabung', value: formatDate(employee.value?.join_date) },
])

const contactInformation = computed(() => [
  { label: 'Email', value: employee.value?.email },
  { label: 'Nomor HP', value: employee.value?.no_hp },
  { label: 'Jenis Kelamin', value: formatGender(employee.value?.jenis_kelamin) },
  { label: 'Tempat Lahir', value: employee.value?.tempat_lahir },
  { label: 'Tanggal Lahir', value: formatDate(employee.value?.tanggal_lahir) },
  { label: 'Alamat', value: employee.value?.alamat },
])

function displayValue(value) {
  return value || '-'
}

function formatDate(value) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(value))
}

function formatGender(value) {
  if (value === 'L') {
    return 'Laki-laki'
  }

  if (value === 'P') {
    return 'Perempuan'
  }

  return null
}

async function loadEmployee() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await getEmployee(nik.value)
    employee.value = response.data.data ?? response.data
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Detail karyawan tidak dapat dimuat. Silakan coba kembali.'
  } finally {
    loading.value = false
  }
}

onMounted(loadEmployee)
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <p class="text-sm text-muted">Data Karyawan / {{ nik }}</p>
        <h2 class="mt-1 text-2xl font-semibold text-highlighted">
          {{ employee?.nama_karyawan || 'Detail Karyawan' }}
        </h2>
      </div>

      <UButton to="/employees" label="Kembali" color="neutral" variant="outline" />
    </div>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      title="Data tidak dapat dimuat"
      :description="errorMessage"
    />

    <div v-else-if="loading" class="flex justify-center py-16">
      <p class="text-sm text-muted">Memuat detail karyawan...</p>
    </div>

    <template v-else-if="employee">
      <UCard>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
          <UAvatar
            :text="employee.nama_karyawan?.slice(0, 2).toUpperCase()"
            color="primary"
            size="xl"
          />
          <div>
            <h3 class="text-lg font-semibold text-highlighted">{{ employee.nama_karyawan }}</h3>
            <p class="text-sm text-muted">
              {{ displayValue(employee.posisi || employee.jabatan) }}
            </p>
          </div>
          <UBadge
            class="sm:ml-auto"
            color="primary"
            variant="subtle"
            :label="displayValue(employee.status_kontrak)"
          />
        </div>
      </UCard>

      <div class="grid gap-6 lg:grid-cols-2">
        <UCard>
          <template #header>
            <h3 class="font-semibold text-highlighted">Informasi Pekerjaan</h3>
          </template>

          <dl class="divide-y divide-gray-200 dark:divide-gray-800">
            <div
              v-for="item in jobInformation"
              :key="item.label"
              class="grid gap-1 py-3 sm:grid-cols-2"
            >
              <dt class="text-sm text-muted">{{ item.label }}</dt>
              <dd class="text-sm font-medium text-highlighted">{{ displayValue(item.value) }}</dd>
            </div>
          </dl>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="font-semibold text-highlighted">Informasi Kontak dan Pribadi</h3>
          </template>

          <dl class="divide-y divide-gray-200 dark:divide-gray-800">
            <div
              v-for="item in contactInformation"
              :key="item.label"
              class="grid gap-1 py-3 sm:grid-cols-2"
            >
              <dt class="text-sm text-muted">{{ item.label }}</dt>
              <dd class="text-sm font-medium text-highlighted">{{ displayValue(item.value) }}</dd>
            </div>
          </dl>
        </UCard>
      </div>
    </template>
  </section>
</template>
