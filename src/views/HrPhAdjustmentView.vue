<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import EmployeeSelect from '../components/EmployeeSelect.vue'
import {
  getAdjustmentEmployees,
  getPhAdjustments,
  getEmployeeHolidays,
  createPhAdjustment,
  deletePhAdjustment,
} from '../services/balanceAdjustmentService'
import { notifier } from '../utils/notifications'
import { askConfirmation } from '../utils/confirmDialog'
import { apiError, formatDate } from '../utils/formatters'

// State
const adjustments = ref([])
const loading = ref(false)
const search = ref('')
const page = ref(1)
const perPage = ref(15)
const meta = ref({ current_page: 1, last_page: 1, total: 0 })
const kpi = ref({
  total_adjustments: 0,
  total_positive_days: 0,
  total_deducted_days: 0,
})

// Employee options for modal
const employees = ref([])
const employeeSearch = ref('')
const loadingEmployees = ref(false)

// Employee eligible holidays for deduction
const availableHolidays = ref([])
const loadingHolidays = ref(false)

// Modal State
const modalOpen = ref(false)
const saving = ref(false)
const formErrors = ref({})
const form = ref({
  karyawan_nik: '',
  type: 'add', // 'add' | 'deduct'
  public_holiday_id: '',
  days: 1,
  adjustment_date: '',
  notes: '',
})

async function fetchAdjustments() {
  loading.value = true
  try {
    const { data } = await getPhAdjustments({
      search: search.value,
      page: page.value,
      per_page: perPage.value,
    })
    adjustments.value = data.data || []
    meta.value = data.meta || { current_page: 1, last_page: 1, total: 0 }
    if (data.kpi) {
      kpi.value = data.kpi
    }
  } catch (err) {
    notifier.error(apiError(err, 'Gagal memuat data adjustment saldo PH.'))
  } finally {
    loading.value = false
  }
}

async function fetchEmployees(searchKeyword = '') {
  loadingEmployees.value = true
  try {
    const { data } = await getAdjustmentEmployees({ search: searchKeyword })
    employees.value = data.data || []
  } catch (err) {
    console.error('Failed to load employees', err)
  } finally {
    loadingEmployees.value = false
  }
}

async function handleEmployeeChange(nik) {
  form.value.public_holiday_id = ''
  availableHolidays.value = []
  if (!nik) return

  loadingHolidays.value = true
  try {
    const { data } = await getEmployeeHolidays(nik)
    availableHolidays.value = data.data || []
  } catch (err) {
    console.error('Failed to fetch employee holidays', err)
  } finally {
    loadingHolidays.value = false
  }
}

function handleHolidaySelect(holidayId) {
  const selected = availableHolidays.value.find(h => h.id === Number(holidayId))
  if (selected && !form.value.notes) {
    form.value.notes = `Pemotongan hak libur nasional: ${selected.name} (${selected.holiday_date})`
  }
}

function openCreateModal() {
  form.value = {
    karyawan_nik: '',
    type: 'add',
    public_holiday_id: '',
    days: 1,
    adjustment_date: new Date().toISOString().split('T')[0],
    notes: '',
  }
  availableHolidays.value = []
  formErrors.value = {}
  modalOpen.value = true
  if (employees.value.length === 0) {
    fetchEmployees()
  }
}

function closeModal() {
  modalOpen.value = false
  formErrors.value = {}
}

async function handleSave() {
  formErrors.value = {}

  if (!form.value.karyawan_nik) {
    formErrors.value.karyawan_nik = 'Pilih karyawan terlebih dahulu.'
  }
  if (form.value.type === 'deduct' && !form.value.public_holiday_id) {
    formErrors.value.public_holiday_id = 'Pilih hari libur nasional yang ingin dipotong.'
  }
  if (!form.value.days || form.value.days < 1) {
    formErrors.value.days = 'Jumlah hari minimal 1.'
  }
  if (!form.value.notes?.trim()) {
    formErrors.value.notes = 'Alasan / keterangan adjustment wajib diisi.'
  }

  if (Object.keys(formErrors.value).length > 0) return

  saving.value = true
  try {
    await createPhAdjustment({
      karyawan_nik: form.value.karyawan_nik,
      type: form.value.type,
      public_holiday_id: form.value.type === 'deduct' && form.value.public_holiday_id ? Number(form.value.public_holiday_id) : null,
      days: Number(form.value.days),
      adjustment_date: form.value.adjustment_date || null,
      notes: form.value.notes.trim(),
    })

    notifier.success('Adjustment saldo Public Holiday berhasil disimpan.')
    closeModal()
    fetchAdjustments()
  } catch (err) {
    const errorMsg = apiError(err, 'Gagal menyimpan adjustment saldo PH.')
    if (err?.response?.data?.errors) {
      formErrors.value = err.response.data.errors
    }
    notifier.error(errorMsg)
  } finally {
    saving.value = false
  }
}

async function handleDelete(item) {
  const confirmed = await askConfirmation({
    title: 'Hapus Adjustment PH',
    message: `Apakah Anda yakin ingin menghapus data adjustment PH (${item.days > 0 ? '+' : ''}${item.days} hari) untuk NIK ${item.karyawan_nik}?`,
    confirmText: 'Ya, Hapus',
    cancelText: 'Batal',
    confirmColor: 'error',
  })

  if (!confirmed) return

  try {
    await deletePhAdjustment(item.id)
    notifier.success('Data adjustment Public Holiday berhasil dihapus.')
    fetchAdjustments()
  } catch (err) {
    notifier.error(apiError(err, 'Gagal menghapus data adjustment PH.'))
  }
}

watch(search, () => {
  page.value = 1
  fetchAdjustments()
})

onMounted(() => {
  fetchAdjustments()
  fetchEmployees()
})
</script>

<template>
  <div class="space-y-6 pb-12">
    <!-- Header Page -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-highlighted">
          Adjustment Saldo Public Holiday (PH)
        </h1>
        <p class="text-sm text-muted mt-1">
          Kelola penambahan kompensasi atau penyesuaian hak libur nasional (PH) karyawan
        </p>
      </div>

      <div>
        <UButton
          color="primary"
          class="cursor-pointer font-semibold"
          @click="openCreateModal"
        >
          <template #leading>
            <UIcon name="i-lucide-plus" class="size-4" />
          </template>
          Buat Adjustment PH
        </UButton>
      </div>
    </div>

    <!-- KPI Summary Cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-muted">Total Riwayat Adjustment</p>
            <h3 class="mt-2 text-2xl font-bold text-highlighted">{{ kpi.total_adjustments }}</h3>
          </div>
          <div class="flex size-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <UIcon name="i-lucide-calendar-check-2" class="size-6" />
          </div>
        </div>
      </UCard>

      <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-muted">Total Hari Ditambahkan (+)</p>
            <h3 class="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">+{{ kpi.total_positive_days }} Hari</h3>
          </div>
          <div class="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <UIcon name="i-lucide-plus-circle" class="size-6" />
          </div>
        </div>
      </UCard>

      <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-muted">Total Hari Dikurangi (-)</p>
            <h3 class="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">-{{ kpi.total_deducted_days }} Hari</h3>
          </div>
          <div class="flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <UIcon name="i-lucide-minus-circle" class="size-6" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Filter & Table Card -->
    <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs overflow-hidden">
      <!-- Search Filter Bar -->
      <div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-default">
        <div class="w-full sm:max-w-xs">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Cari NIK, nama karyawan, keterangan..."
            class="w-full"
          />
        </div>

        <div class="text-xs text-muted">
          Total: <span class="font-semibold text-highlighted">{{ meta.total }} data</span>
        </div>
      </div>

      <!-- Data Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-default bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted">
            <tr>
              <th class="px-4 py-3.5">Karyawan</th>
              <th class="px-4 py-3.5">Aksi / Hari</th>
              <th class="px-4 py-3.5">Tanggal Penyesuaian</th>
              <th class="px-4 py-3.5">Keterangan / Alasan</th>
              <th class="px-4 py-3.5">Dibuat Oleh</th>
              <th class="px-4 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-if="loading">
              <td colspan="6" class="px-4 py-8 text-center text-muted">
                Memuat riwayat adjustment PH...
              </td>
            </tr>
            <tr v-else-if="adjustments.length === 0">
              <td colspan="6" class="px-4 py-8 text-center text-muted">
                Belum ada data adjustment saldo Public Holiday.
              </td>
            </tr>
            <tr
              v-for="item in adjustments"
              :key="item.id"
              class="hover:bg-muted/30 transition-colors"
            >
              <td class="px-4 py-3.5">
                <div class="font-semibold text-highlighted">
                  {{ item.karyawan?.nama_karyawan || item.karyawan_nik }}
                </div>
                <div class="text-xs text-muted flex items-center gap-2 mt-0.5">
                  <span class="font-mono">{{ item.karyawan_nik }}</span>
                  <span v-if="item.karyawan?.jabatan">• {{ item.karyawan.jabatan }}</span>
                </div>
              </td>
              <td class="px-4 py-3.5">
                <span
                  v-if="item.days > 0"
                  class="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                >
                  +{{ item.days }} Hari
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20"
                >
                  {{ item.days }} Hari
                </span>
              </td>
              <td class="px-4 py-3.5 text-xs text-muted">
                {{ formatDate(item.adjustment_date || item.created_at) }}
              </td>
              <td class="px-4 py-3.5 text-xs text-highlighted max-w-xs truncate" :title="item.notes">
                <div v-if="item.holiday" class="mb-1">
                  <span class="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    <UIcon name="i-lucide-calendar-x" class="size-3" />
                    {{ item.holiday.name }} ({{ formatDate(item.holiday.holiday_date) }})
                  </span>
                </div>
                <div>{{ item.notes || '-' }}</div>
              </td>
              <td class="px-4 py-3.5 text-xs text-muted">
                {{ item.creator?.name || '-' }}
              </td>
              <td class="px-4 py-3.5 text-right">
                <UButton
                  color="error"
                  variant="ghost"
                  size="xs"
                  class="cursor-pointer"
                  title="Hapus Adjustment"
                  @click="handleDelete(item)"
                >
                  <UIcon name="i-lucide-trash-2" class="size-4" />
                </UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="meta.last_page > 1"
        class="flex items-center justify-between border-t border-default p-4"
      >
        <p class="text-xs text-muted">
          Halaman {{ meta.current_page }} dari {{ meta.last_page }}
        </p>
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            :disabled="page <= 1"
            class="cursor-pointer"
            @click="page--; fetchAdjustments()"
          >
            Sebelumnya
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            :disabled="page >= meta.last_page"
            class="cursor-pointer"
            @click="page++; fetchAdjustments()"
          >
            Selanjutnya
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Modal Form Adjustment PH -->
    <div
      v-if="modalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto"
      @click.self="closeModal"
    >
      <UCard class="w-full max-w-lg border border-default bg-[var(--ui-bg,#ffffff)] shadow-2xl relative my-8">
        <div class="flex items-center justify-between border-b border-default pb-4">
          <h2 class="text-lg font-bold text-highlighted">
            Adjustment Saldo Public Holiday
          </h2>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            class="cursor-pointer"
            @click="closeModal"
          >
            <UIcon name="i-lucide-x" class="size-5" />
          </UButton>
        </div>

        <form @submit.prevent="handleSave" class="space-y-4 pt-4">
          <!-- Pilih Karyawan -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Pilih Karyawan <span class="text-rose-500">*</span>
            </label>
            <EmployeeSelect
              v-model="form.karyawan_nik"
              :employees="employees"
              :loading="loadingEmployees"
              :error="formErrors.karyawan_nik"
              placeholder="Cari NIK, nama, atau jabatan karyawan..."
              @change="handleEmployeeChange"
            />
            <p v-if="formErrors.karyawan_nik" class="text-xs text-rose-500 mt-1">
              {{ formErrors.karyawan_nik }}
            </p>
          </div>

          <!-- Tipe Aksi (+ / -) -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Aksi Adjustment <span class="text-rose-500">*</span>
            </label>
            <div class="grid grid-cols-2 gap-3">
              <label
                class="flex items-center justify-center gap-2 rounded-lg border p-3 cursor-pointer transition-all text-sm font-semibold"
                :class="form.type === 'add' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500' : 'border-default bg-muted/10 text-muted hover:border-default/80'"
              >
                <input
                  type="radio"
                  v-model="form.type"
                  value="add"
                  class="sr-only"
                />
                <UIcon name="i-lucide-plus-circle" class="size-4" />
                Penambahan (+)
              </label>

              <label
                class="flex items-center justify-center gap-2 rounded-lg border p-3 cursor-pointer transition-all text-sm font-semibold"
                :class="form.type === 'deduct' ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500' : 'border-default bg-muted/10 text-muted hover:border-default/80'"
              >
                <input
                  type="radio"
                  v-model="form.type"
                  value="deduct"
                  class="sr-only"
                />
                <UIcon name="i-lucide-minus-circle" class="size-4" />
                Pengurangan (-)
              </label>
            </div>
          </div>

          <!-- Dropdown Pilihan Hari Libur yang Dipotong (Jika Pengurangan) -->
          <div v-if="form.type === 'deduct'" class="space-y-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3.5">
            <label class="block text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Pilih Hari Libur Nasional yang Dipotong <span class="text-rose-500">*</span>
            </label>

            <div v-if="!form.karyawan_nik" class="text-xs text-muted">
              Silakan pilih karyawan terlebih dahulu untuk memuat daftar libur nasional yang dimiliki.
            </div>

            <div v-else-if="loadingHolidays" class="text-xs text-muted flex items-center gap-2">
              <UIcon name="i-lucide-loader-2" class="size-4 animate-spin text-primary" />
              Memuat daftar libur nasional karyawan...
            </div>

            <div v-else-if="availableHolidays.length === 0" class="text-xs font-medium text-rose-500">
              Karyawan ini tidak memiliki jatah libur nasional aktif / eligible untuk dipotong.
            </div>

            <div v-else>
              <select
                v-model="form.public_holiday_id"
                class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
                @change="handleHolidaySelect($event.target.value)"
              >
                <option value="" disabled>-- Pilih Hari Libur Nasional yang Dipotong --</option>
                <option
                  v-for="h in availableHolidays"
                  :key="h.id"
                  :value="h.id"
                >
                  {{ h.label }}
                </option>
              </select>
              <p class="text-[11px] text-muted mt-1.5">
                Memilih libur nasional ini akan otomatis memotong dan menonaktifkan hak klaim libur tersebut untuk karyawan yang bersangkutan.
              </p>
            </div>

            <p v-if="formErrors.public_holiday_id" class="text-xs text-rose-500 mt-1">
              {{ formErrors.public_holiday_id }}
            </p>
          </div>

          <!-- Jumlah Hari & Tanggal Penyesuaian -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                Jumlah Hari <span class="text-rose-500">*</span>
              </label>
              <UInput
                v-model.number="form.days"
                type="number"
                min="1"
                max="90"
                required
                :disabled="form.type === 'deduct' && !!form.public_holiday_id"
                class="w-full"
              />
              <p v-if="formErrors.days" class="text-xs text-rose-500 mt-1">
                {{ formErrors.days }}
              </p>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                Tanggal Penyesuaian
              </label>
              <UInput
                v-model="form.adjustment_date"
                type="date"
                class="w-full"
              />
            </div>
          </div>

          <!-- Keterangan / Alasan -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Keterangan / Alasan <span class="text-rose-500">*</span>
            </label>
            <textarea
              v-model="form.notes"
              rows="3"
              required
              placeholder="Contoh: Kompensasi piket tugas di hari libur nasional / Penyesuaian kebijakan..."
              class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            ></textarea>
            <p v-if="formErrors.notes" class="text-xs text-rose-500 mt-1">
              {{ formErrors.notes }}
            </p>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-end gap-3 border-t border-default pt-4">
            <UButton
              color="neutral"
              variant="outline"
              type="button"
              class="cursor-pointer"
              @click="closeModal"
            >
              Batal
            </UButton>
            <UButton
              color="primary"
              type="submit"
              :loading="saving"
              :disabled="form.type === 'deduct' && availableHolidays.length === 0"
              class="cursor-pointer font-semibold"
            >
              Simpan Adjustment
            </UButton>
          </div>
        </form>
      </UCard>
    </div>
  </div>
</template>
