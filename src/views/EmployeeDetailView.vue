<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import EmployeeFormFields from '../components/EmployeeFormFields.vue'
import { getEmployee, getEmployees, updateEmployee } from '../services/employeeService'
import { createHrContract, updateHrContract } from '../services/hrService'
import { apiError, formatDate } from '../utils/formatters'

const route = useRoute()
const form = reactive({})
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const message = ref(route.query.created ? 'Karyawan berhasil ditambahkan.' : '')
const supervisorOptions = ref([])
const contracts = ref([])
const loadingOptions = ref(false)
const nik = computed(() => String(route.params.nik || ''))
const contractFormOpen = ref(false)
const editingContractId = ref(null)
const savingContract = ref(false)
const photoLoadFailed = ref(false)
const contractForm = reactive({
  jenis_kontrak: 'PKWT',
  status_kontrak: 'AKTIF',
  start_date: '',
  end_date: '',
  keterangan: '',
})
const hasActiveContract = computed(() =>
  contracts.value.some((contract) => contract.status === 'AKTIF'),
)

function assignForm(data) {
  Object.assign(form, data)
  photoLoadFailed.value = false
  contracts.value = data.contracts ?? []
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
  for (const key of [
    'nik',
    'pin',
    'jenis_kontrak',
    'status_kontrak',
    'start_date',
    'end_date',
    'keterangan_kontrak',
    'active_contract_id',
    'contracts',
    'photo_url',
  ]) {
    delete payload[key]
  }
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

function clearContractForm() {
  editingContractId.value = null
  contractForm.jenis_kontrak = 'PKWT'
  contractForm.status_kontrak = 'AKTIF'
  contractForm.start_date = ''
  contractForm.end_date = ''
  contractForm.keterangan = ''
}

function addContract() {
  clearContractForm()
  contractFormOpen.value = true
}

function editContract(contract) {
  editingContractId.value = contract.id
  contractForm.jenis_kontrak = contract.contract_type || 'PKWT'
  contractForm.status_kontrak = contract.status
  contractForm.start_date = contract.start_date || ''
  contractForm.end_date = contract.end_date || ''
  contractForm.keterangan = contract.description || ''
  contractFormOpen.value = true
}

async function saveContract() {
  savingContract.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const payload = { ...contractForm }
    const response = editingContractId.value
      ? await updateHrContract(editingContractId.value, payload)
      : await createHrContract(nik.value, payload)

    message.value = response.data.message
    contractFormOpen.value = false
    clearContractForm()
    await loadEmployee()
  } catch (error) {
    errorMessage.value = apiError(error, 'Kontrak tidak dapat disimpan.')
  } finally {
    savingContract.value = false
  }
}

onMounted(loadEmployee)
</script>

<template>
  <section class="space-y-6">
    <form class="space-y-6" @submit.prevent="save">
      <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p class="text-sm text-muted">Data Karyawan / {{ nik }}</p>
          <h2 class="mt-1 text-2xl font-semibold text-highlighted">
            {{ form.nama_karyawan || 'Detail Karyawan' }}
          </h2>
          <p class="mt-1 text-sm text-muted">
            HRD dapat mengedit data profil kecuali NIK dan PIN. Kontrak dikelola terpisah di bawah.
          </p>
        </div>
        <div class="flex gap-2">
          <UButton to="/employees" label="Kembali" color="neutral" variant="outline" />
          <UButton v-if="!loading" type="submit" label="Simpan Profil" :loading="saving" />
        </div>
      </div>

      <UAlert v-if="message" color="success" variant="subtle" :description="message" />
      <UAlert v-if="errorMessage" color="error" variant="subtle" :description="errorMessage" />

      <div v-if="loading" class="py-16 text-center text-sm text-muted">
        Memuat detail karyawan...
      </div>
      <template v-else-if="form.nik">
        <UCard>
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
            <img
              v-if="form.photo_url && !photoLoadFailed"
              :src="form.photo_url"
              :alt="`Foto ${form.nama_karyawan}`"
              class="size-16 shrink-0 rounded-full object-cover"
              @error="photoLoadFailed = true"
            />
            <UAvatar
              v-else
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
              :color="form.status_karyawan === 'AKTIF' ? 'success' : 'neutral'"
              variant="subtle"
              :label="form.status_karyawan === 'AKTIF' ? 'Karyawan Aktif' : 'Karyawan Tidak Aktif'"
            />
          </div>
        </UCard>
        <EmployeeFormFields
          :form="form"
          :supervisor-options="supervisorOptions"
          :loading-options="loadingOptions"
        />
      </template>
    </form>

    <UCard v-if="!loading && form.nik" title="Kelola Kontrak Karyawan">
      <template #header>
        <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h3 class="font-semibold text-highlighted">Kelola Kontrak Karyawan</h3>
            <p class="mt-1 text-sm text-muted">
              Tambah atau edit riwayat kontrak. Kontrak aktif harus dinonaktifkan sebelum membuat
              kontrak baru.
            </p>
          </div>
          <div class="text-right">
            <UButton
              type="button"
              label="Tambah Kontrak Baru"
              icon="i-lucide-plus"
              :disabled="hasActiveContract"
              @click="addContract"
            />
            <p v-if="hasActiveContract" class="mt-2 text-xs text-warning">
              Nonaktifkan kontrak aktif terlebih dahulu.
            </p>
          </div>
        </div>
      </template>

      <form
        v-if="contractFormOpen"
        class="mb-5 rounded-xl border border-default bg-elevated/30 p-4"
        @submit.prevent="saveContract"
      >
        <p class="mb-4 font-medium text-highlighted">
          {{ editingContractId ? 'Edit Kontrak' : 'Kontrak Baru' }}
        </p>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <label class="text-sm text-muted">
            Jenis Kontrak
            <select
              v-model="contractForm.jenis_kontrak"
              required
              class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            >
              <option value="PKWT">PKWT</option>
              <option value="PKWTT">PKWTT</option>
            </select>
          </label>
          <label class="text-sm text-muted">
            Status Kontrak
            <select
              v-model="contractForm.status_kontrak"
              required
              class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            >
              <option value="AKTIF">AKTIF</option>
              <option value="NONAKTIF">TIDAK AKTIF</option>
            </select>
          </label>
          <label class="text-sm text-muted">
            Tanggal Mulai
            <input
              v-model="contractForm.start_date"
              type="date"
              required
              class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            />
          </label>
          <label class="text-sm text-muted">
            Tanggal Selesai
            <input
              v-model="contractForm.end_date"
              type="date"
              required
              class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            />
          </label>
          <label class="text-sm text-muted">
            Keterangan
            <input
              v-model="contractForm.keterangan"
              type="text"
              class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            />
          </label>
        </div>
        <p class="mt-3 text-xs text-muted">
          Durasi kontrak dihitung otomatis dari tanggal mulai sampai tanggal selesai.
        </p>
        <div class="mt-4 flex gap-2">
          <UButton type="submit" label="Simpan Kontrak" :loading="savingContract" />
          <UButton
            type="button"
            label="Batal"
            color="neutral"
            variant="outline"
            @click="contractFormOpen = false"
          />
        </div>
      </form>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">Kontrak</th>
              <th class="p-3">Jenis</th>
              <th class="p-3">Periode</th>
              <th class="p-3">Durasi</th>
              <th class="p-3">Status</th>
              <th class="p-3">Keterangan</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="contract in contracts" :key="contract.id" class="border-t border-default">
              <td class="p-3 font-medium text-highlighted">
                Kontrak ke-{{ contract.contract_number }}
              </td>
              <td class="p-3">{{ contract.contract_type }}</td>
              <td class="p-3">
                {{ formatDate(contract.start_date) }} - {{ formatDate(contract.end_date) }}
              </td>
              <td class="p-3">{{ contract.duration_label }}</td>
              <td class="p-3">
                <UBadge
                  :color="contract.status === 'AKTIF' ? 'success' : 'neutral'"
                  variant="subtle"
                  :label="contract.status === 'AKTIF' ? 'AKTIF' : 'TIDAK AKTIF'"
                />
              </td>
              <td class="p-3">{{ contract.description || '-' }}</td>
              <td class="p-3">
                <UButton
                  type="button"
                  size="xs"
                  color="neutral"
                  variant="outline"
                  label="Edit"
                  @click="editContract(contract)"
                />
              </td>
            </tr>
            <tr v-if="!contracts.length">
              <td colspan="7" class="p-8 text-center text-muted">
                Karyawan ini belum memiliki kontrak. Tambahkan kontrak pertamanya.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </section>
</template>
