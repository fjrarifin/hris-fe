<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  getAdjustmentEmployees,
  getLeaveAdjustments,
  createLeaveAdjustment,
  deleteLeaveAdjustment,
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

// Modal State
const modalOpen = ref(false)
const saving = ref(false)
const formErrors = ref({})
const form = ref({
  karyawan_nik: '',
  type: 'add', // 'add' | 'deduct'
  days: 1,
  expired_at: '',
  notes: '',
})

async function fetchAdjustments() {
  loading.value = true
  try {
    const { data } = await getLeaveAdjustments({
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
    notifier.error(apiError(err, 'Gagal memuat data adjustment saldo cuti.'))
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

const filteredEmployees = computed(() => {
  if (!employeeSearch.value.trim()) return employees.value
  const q = employeeSearch.value.toLowerCase()
  return employees.value.filter(e =>
    (e.nama_karyawan && e.nama_karyawan.toLowerCase().includes(q)) ||
    (e.nik && e.nik.toLowerCase().includes(q)) ||
    (e.jabatan && e.jabatan.toLowerCase().includes(q))
  )
})

const selectedEmployee = computed(() => {
  return employees.value.find(e => e.nik === form.value.karyawan_nik) || null
})

function openCreateModal() {
  form.value = {
    karyawan_nik: '',
    type: 'add',
    days: 1,
    expired_at: '',
    notes: '',
  }
  employeeSearch.value = ''
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
  if (!form.value.days || form.value.days < 1) {
    formErrors.value.days = 'Jumlah hari minimal 1.'
  }
  if (!form.value.notes?.trim()) {
    formErrors.value.notes = 'Alasan / keterangan adjustment wajib diisi.'
  }

  if (Object.keys(formErrors.value).length > 0) return

  saving.value = true
  try {
    await createLeaveAdjustment({
      karyawan_nik: form.value.karyawan_nik,
      type: form.value.type,
      days: Number(form.value.days),
      expired_at: form.value.expired_at || null,
      notes: form.value.notes.trim(),
    })

    notifier.success('Adjustment saldo cuti berhasil disimpan.')
    closeModal()
    fetchAdjustments()
  } catch (err) {
    const errorMsg = apiError(err, 'Gagal menyimpan adjustment saldo cuti.')
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
    title: 'Hapus Adjustment Cuti',
    message: `Apakah Anda yakin ingin menghapus data adjustment cuti (${item.days > 0 ? '+' : ''}${item.days} hari) untuk NIK ${item.nik}?`,
    confirmText: 'Ya, Hapus',
    cancelText: 'Batal',
    confirmColor: 'error',
  })

  if (!confirmed) return

  try {
    await deleteLeaveAdjustment(item.id)
    notifier.success('Data adjustment cuti berhasil dihapus.')
    fetchAdjustments()
  } catch (err) {
    notifier.error(apiError(err, 'Gagal menghapus data adjustment cuti.'))
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
          Adjustment Saldo Cuti Tahunan
        </h1>
        <p class="text-sm text-muted mt-1">
          Kelola penambahan reward atau pengurangan penyesuaian hak cuti tahunan karyawan
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
          Buat Adjustment Cuti
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
          <div class="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <UIcon name="i-lucide-calendar-days" class="size-6" />
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
            placeholder="Cari NIK, nama karyawan, alasan..."
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
              <th class="px-4 py-3.5">Tgl Adjustment</th>
              <th class="px-4 py-3.5">Berlaku Sampai</th>
              <th class="px-4 py-3.5">Keterangan / Alasan</th>
              <th class="px-4 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-if="loading">
              <td colspan="6" class="px-4 py-8 text-center text-muted">
                Memuat riwayat adjustment cuti...
              </td>
            </tr>
            <tr v-else-if="adjustments.length === 0">
              <td colspan="6" class="px-4 py-8 text-center text-muted">
                Belum ada data adjustment saldo cuti.
              </td>
            </tr>
            <tr
              v-for="item in adjustments"
              :key="item.id"
              class="hover:bg-muted/30 transition-colors"
            >
              <td class="px-4 py-3.5">
                <div class="font-semibold text-highlighted">
                  {{ item.user?.karyawan?.nama_karyawan || item.user?.name || item.nik }}
                </div>
                <div class="text-xs text-muted flex items-center gap-2 mt-0.5">
                  <span class="font-mono">{{ item.nik }}</span>
                  <span v-if="item.user?.karyawan?.jabatan">• {{ item.user.karyawan.jabatan }}</span>
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
                {{ formatDate(item.accrued_at || item.created_at) }}
              </td>
              <td class="px-4 py-3.5 text-xs text-muted">
                {{ item.expired_at ? formatDate(item.expired_at) : '-' }}
              </td>
              <td class="px-4 py-3.5 text-xs text-highlighted max-w-xs truncate" :title="item.notes">
                {{ item.notes || '-' }}
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

    <!-- Modal Form Adjustment Cuti -->
    <div
      v-if="modalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto"
      @click.self="closeModal"
    >
      <UCard class="w-full max-w-lg border border-default bg-[var(--ui-bg,#ffffff)] shadow-2xl relative my-8">
        <div class="flex items-center justify-between border-b border-default pb-4">
          <h2 class="text-lg font-bold text-highlighted">
            Adjustment Saldo Cuti
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
            <div class="space-y-2">
              <UInput
                v-model="employeeSearch"
                icon="i-lucide-search"
                placeholder="Ketik NIK atau nama karyawan..."
                class="w-full"
              />
              <select
                v-model="form.karyawan_nik"
                class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              >
                <option value="" disabled>-- Pilih Karyawan ({{ filteredEmployees.length }} ditemukan) --</option>
                <option
                  v-for="emp in filteredEmployees"
                  :key="emp.nik"
                  :value="emp.nik"
                >
                  {{ emp.nama_karyawan }} ({{ emp.nik }}) - {{ emp.jabatan || emp.departement || '-' }}
                </option>
              </select>
            </div>
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

          <!-- Jumlah Hari & Tanggal Berlaku -->
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
                class="w-full"
              />
              <p v-if="formErrors.days" class="text-xs text-rose-500 mt-1">
                {{ formErrors.days }}
              </p>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                Berlaku Sampai (Opsional)
              </label>
              <UInput
                v-model="form.expired_at"
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
              placeholder="Contoh: Penyesuaian hak cuti reward masa kerja / Koreksi selisih cuti tahunan..."
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
