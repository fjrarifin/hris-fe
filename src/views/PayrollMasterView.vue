<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  getHrPayrollComponents,
  getHrPayrollMaster,
  saveHrPayrollComponent,
  saveHrPayrollMasterEmployee,
} from '../services/hrService'
import { apiError } from '../utils/formatters'

const filters = reactive({ q: '', readiness: 'all' })
const data = ref(null)
const components = ref([])
const selected = ref(null)
const page = ref(1)
const loading = ref(false)
const saving = ref(false)
const savingComponentId = ref(null)
const message = ref('')
const errorMessage = ref('')
let searchTimer = null
const form = reactive({
  gaji_pokok: 0,
  tunjangan_jabatan: 0,
  tunjangan_tidak_tetap: 0,
  bruto_man_power: 0,
  payroll_group: 'staff',
  dasar_bpjs: 0,
  dasar_jp: 0,
  rate_jkk_percent: '0.54',
  is_active: true,
  notes: '',
})

const groupedComponents = computed(() => {
  const groups = {
    earning: [],
    deduction: [],
    employer_contribution: [],
  }

  components.value.forEach((component) => groups[component.type]?.push(component))
  return groups
})

const typeLabels = {
  earning: 'Pendapatan',
  deduction: 'Potongan Karyawan',
  employer_contribution: 'Kontribusi Perusahaan',
}

function rupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

async function load(requestedPage = 1) {
  loading.value = true
  errorMessage.value = ''
  try {
    data.value = (await getHrPayrollMaster({ ...filters, page: requestedPage })).data
    page.value = data.value.pagination.current_page
  } catch (error) {
    errorMessage.value = apiError(error, 'Master payroll tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function loadComponents() {
  try {
    components.value = (await getHrPayrollComponents()).data.data
  } catch (error) {
    errorMessage.value = apiError(error, 'Komponen payroll tidak dapat dimuat.')
  }
}

function edit(record) {
  selected.value = record
  Object.assign(form, record.profile)
}

function closeForm() {
  selected.value = null
}

async function saveProfile() {
  saving.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const response = await saveHrPayrollMasterEmployee(selected.value.nik, { ...form })
    message.value = response.data.message
    closeForm()
    await load(page.value)
  } catch (error) {
    errorMessage.value = apiError(error, 'Master payroll karyawan tidak dapat disimpan.')
  } finally {
    saving.value = false
  }
}

async function saveComponent(component) {
  savingComponentId.value = component.id
  message.value = ''
  errorMessage.value = ''
  try {
    const response = await saveHrPayrollComponent(component.id, {
      type: component.type,
      input_mode: component.input_mode,
      is_active: component.is_active,
    })
    message.value = response.data.message
    await loadComponents()
  } catch (error) {
    errorMessage.value = apiError(error, 'Komponen payroll tidak dapat disimpan.')
  } finally {
    savingComponentId.value = null
  }
}

watch(
  () => filters.q,
  () => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => load(1), 300)
  },
)
watch(
  () => filters.readiness,
  () => load(1),
)
onMounted(() => Promise.all([load(), loadComponents()]))
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h2 class="text-2xl font-semibold text-highlighted">Master Payroll</h2>
        <p class="mt-1 text-sm text-muted">Sumber resmi komponen tetap payroll dari HRIS.</p>
      </div>
      <UButton to="/payroll" label="Kembali ke Payroll" color="neutral" variant="outline" />
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <div v-if="data" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <UCard
        v-for="item in [
          ['Total Karyawan', data.summary.total_employees],
          ['Master Lengkap', data.summary.ready],
          ['Belum Lengkap', data.summary.incomplete],
          ['BPJS Aktif', data.summary.bpjs_active],
        ]"
        :key="item[0]"
      >
        <p class="text-sm text-muted">{{ item[0] }}</p>
        <p class="mt-2 text-3xl font-semibold text-highlighted">{{ item[1] }}</p>
      </UCard>
    </div>

    <UCard title="Master Payroll Karyawan">
      <div class="mb-5 flex flex-col gap-3 sm:flex-row">
        <input
          v-model="filters.q"
          type="search"
          placeholder="Cari NIK, nama, jabatan, atau departemen"
          class="flex-1 rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted"
        />
        <select
          v-model="filters.readiness"
          class="rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted"
        >
          <option value="all">Semua Kelengkapan</option>
          <option value="ready">Master Lengkap</option>
          <option value="incomplete">Belum Lengkap</option>
        </select>
      </div>

      <div v-if="loading && !data" class="py-10 text-center text-sm text-muted">
        Memuat master payroll...
      </div>
      <div v-else-if="data" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">Karyawan</th>
              <th class="p-3">Grup</th>
              <th class="p-3">BPJS</th>
              <th class="p-3">Basic Salary</th>
              <th class="p-3">Bruto Man Power</th>
              <th class="p-3">Status</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in data.records" :key="record.nik" class="border-t border-default">
              <td class="p-3">
                <p class="font-medium text-highlighted">{{ record.name }}</p>
                <p class="text-xs text-muted">{{ record.nik }} - {{ record.department }}</p>
              </td>
              <td class="p-3">
                {{ record.profile.payroll_group === 'operator' ? 'Operator' : 'Staff+' }}
              </td>
              <td class="p-3">{{ record.bpjs ? 'Aktif' : 'Non-BPJS' }}</td>
              <td class="p-3">
                {{ rupiah(record.profile.gaji_pokok + record.profile.tunjangan_jabatan) }}
              </td>
              <td class="p-3">{{ rupiah(record.profile.bruto_man_power) }}</td>
              <td class="p-3">
                <UBadge
                  :label="record.is_ready ? 'Lengkap' : 'Belum Lengkap'"
                  :color="record.is_ready ? 'success' : 'warning'"
                  variant="subtle"
                />
                <p v-if="record.missing_fields.length" class="mt-1 text-xs text-warning">
                  {{ record.missing_fields.join(', ') }}
                </p>
              </td>
              <td class="p-3">
                <UButton size="xs" variant="soft" label="Edit" @click="edit(record)" />
              </td>
            </tr>
            <tr v-if="!data.records.length">
              <td colspan="6" class="p-8 text-center text-muted">Data tidak ditemukan.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-if="data?.pagination.total"
        class="mt-4 flex items-center justify-between border-t border-default pt-4"
      >
        <p class="text-sm text-muted">
          {{ data.pagination.from }}-{{ data.pagination.to }} dari
          {{ data.pagination.total }} karyawan
        </p>
        <UPagination
          :page="page"
          :total="data.pagination.total"
          :items-per-page="data.pagination.per_page"
          show-controls
          @update:page="load"
        />
      </div>
    </UCard>

    <UCard title="Pengaturan Komponen Payroll">
      <p class="mb-4 text-sm text-muted">
        Histori payroll lama tetap memakai snapshot item existing. Pengaturan ini dipakai untuk
        draft baru pada tahap berikutnya.
      </p>
      <div class="grid gap-4 xl:grid-cols-3">
        <div
          v-for="(items, type) in groupedComponents"
          :key="type"
          class="rounded-xl border border-default p-4"
        >
          <h3 class="mb-3 font-semibold text-highlighted">{{ typeLabels[type] }}</h3>
          <div
            v-for="component in items"
            :key="component.id"
            class="mb-3 rounded-lg bg-elevated/40 p-3"
          >
            <p class="mb-2 text-sm font-medium text-highlighted">{{ component.nama }}</p>
            <div class="flex gap-2">
              <select
                v-model="component.type"
                class="min-w-0 flex-1 rounded-lg border border-default bg-default p-2 text-xs text-highlighted"
              >
                <option value="earning">Pendapatan</option>
                <option value="deduction">Potongan</option>
                <option value="employer_contribution">Kontribusi Perusahaan</option>
              </select>
              <select
                v-model="component.input_mode"
                class="rounded-lg border border-default bg-default p-2 text-xs text-highlighted"
              >
                <option value="manual">Manual</option>
                <option value="calculated">Otomatis</option>
              </select>
            </div>
            <div class="mt-2 flex items-center justify-between">
              <label class="flex items-center gap-2 text-xs text-muted"
                ><input v-model="component.is_active" type="checkbox" /> Aktif</label
              >
              <UButton
                size="xs"
                variant="soft"
                label="Simpan"
                :loading="savingComponentId === component.id"
                @click="saveComponent(component)"
              />
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <div v-if="selected" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        class="absolute inset-0 bg-slate-950/60"
        aria-label="Tutup form"
        @click="closeForm"
      ></button>
      <UCard
        class="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto"
        :ui="{ body: 'space-y-4' }"
      >
        <template #header
          ><h3 class="font-semibold text-highlighted">
            Edit Master Payroll - {{ selected.name }}
          </h3></template
        >
        <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="saveProfile">
          <label
            v-for="field in [
              ['gaji_pokok', 'Gaji Pokok'],
              ['tunjangan_jabatan', 'Tunjangan Jabatan'],
              ['tunjangan_tidak_tetap', 'TTT Lama / Referensi'],
              ['bruto_man_power', 'Bruto Man Power'],
              ['dasar_bpjs', 'Dasar BPJS'],
              ['dasar_jp', 'Dasar JP'],
              ['rate_jkk_percent', 'Rate JKK (%)'],
            ]"
            :key="field[0]"
            class="text-sm text-muted"
            >{{ field[1]
            }}<input
              v-model="form[field[0]]"
              type="number"
              min="0"
              step="0.01"
              required
              class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
          /></label>
          <label class="text-sm text-muted"
            >Grup Payroll
            <select
              v-model="form.payroll_group"
              required
              class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            >
              <option value="staff">Staff+</option>
              <option value="operator">Operator</option>
            </select>
          </label>
          <label class="flex items-center gap-2 text-sm text-muted"
            ><input v-model="form.is_active" type="checkbox" /> Master payroll aktif</label
          >
          <label class="text-sm text-muted sm:col-span-2"
            >Catatan<textarea
              v-model="form.notes"
              rows="3"
              class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            ></textarea>
          </label>
          <div class="flex gap-2 sm:col-span-2">
            <UButton type="submit" label="Simpan Master" :loading="saving" /><UButton
              type="button"
              label="Batal"
              color="neutral"
              variant="outline"
              @click="closeForm"
            />
          </div>
        </form>
      </UCard>
    </div>
  </section>
</template>
