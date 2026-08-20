<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  createHoldingEmployee,
  deleteHoldingEmployee,
  getHoldingEmployees,
  getHoldingQrLogs,
  updateHoldingEmployee,
} from '../services/holdingEmployeeService'
import { notifier } from '../utils/notifications'
import { askConfirmation } from '../utils/confirmDialog'
import { apiError, formatDateTime } from '../utils/formatters'

// Active Tab ('employees' | 'logs')
const activeTab = ref('employees')

// Employees State
const employees = ref([])
const kpi = ref({
  total_count: 0,
  active_count: 0,
  inactive_count: 0,
  today_qr_count: 0,
})
const loading = ref(false)
const search = ref('')
const statusFilter = ref('')
const page = ref(1)
const perPage = ref(15)
const meta = ref({ current_page: 1, last_page: 1, total: 0 })

// Logs State
const logs = ref([])
const logsLoading = ref(false)
const logsSearch = ref('')
const logsDate = ref('')
const logsPage = ref(1)
const logsPerPage = ref(20)
const logsMeta = ref({ current_page: 1, last_page: 1, total: 0 })

// Modal Form State
const modalOpen = ref(false)
const modalMode = ref('create') // 'create' | 'edit'
const saving = ref(false)
const formErrors = ref({})
const form = ref({
  id: null,
  nik: '',
  nama: '',
  jabatan: '',
  departemen: '',
  perusahaan: '',
  no_hp: '',
  is_active: true,
})

const publicQrUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/qr-holding`
  }
  return '/qr-holding'
})

async function fetchEmployees() {
  loading.value = true
  try {
    const { data } = await getHoldingEmployees({
      search: search.value,
      status: statusFilter.value,
      page: page.value,
      per_page: perPage.value,
    })
    employees.value = data.data || []
    meta.value = data.meta || { current_page: 1, last_page: 1, total: 0 }
    if (data.kpi) {
      kpi.value = data.kpi
    }
  } catch (err) {
    notifier.error(apiError(err, 'Gagal memuat data karyawan holding.'))
  } finally {
    loading.value = false
  }
}

async function fetchLogs() {
  logsLoading.value = true
  try {
    const { data } = await getHoldingQrLogs({
      search: logsSearch.value,
      date: logsDate.value,
      page: logsPage.value,
      per_page: logsPerPage.value,
    })
    logs.value = data.data || []
    logsMeta.value = data.meta || { current_page: 1, last_page: 1, total: 0 }
  } catch (err) {
    notifier.error(apiError(err, 'Gagal memuat log transaksi QR holding.'))
  } finally {
    logsLoading.value = false
  }
}

function openCreateModal() {
  modalMode.value = 'create'
  formErrors.value = {}
  form.value = {
    id: null,
    nik: '',
    nama: '',
    jabatan: '',
    departemen: '',
    perusahaan: 'PT Hompimpa Global Holding',
    no_hp: '',
    is_active: true,
  }
  modalOpen.value = true
}

function openEditModal(item) {
  modalMode.value = 'edit'
  formErrors.value = {}
  form.value = {
    id: item.id,
    nik: item.nik,
    nama: item.nama,
    jabatan: item.jabatan || '',
    departemen: item.departemen || '',
    perusahaan: item.perusahaan || '',
    no_hp: item.no_hp || '',
    is_active: Boolean(item.is_active),
  }
  modalOpen.value = true
}

async function handleSave() {
  formErrors.value = {}
  saving.value = true

  const payload = {
    nik: form.value.nik.trim().toUpperCase(),
    nama: form.value.nama.trim(),
    jabatan: form.value.jabatan.trim() || null,
    departemen: form.value.departemen.trim() || null,
    perusahaan: form.value.perusahaan.trim() || null,
    no_hp: form.value.no_hp.trim() || null,
    is_active: form.value.is_active,
  }

  try {
    if (modalMode.value === 'create') {
      await createHoldingEmployee(payload)
      notifier.success('Karyawan Holding berhasil ditambahkan.')
    } else {
      await updateHoldingEmployee(form.value.id, payload)
      notifier.success('Data Karyawan Holding berhasil diperbarui.')
    }
    modalOpen.value = false
    await fetchEmployees()
  } catch (err) {
    if (err.response?.status === 422 && err.response?.data?.errors) {
      formErrors.value = err.response.data.errors
    } else {
      notifier.error(apiError(err, 'Gagal menyimpan data.'))
    }
  } finally {
    saving.value = false
  }
}

async function handleDelete(item) {
  const confirmed = await askConfirmation({
    title: 'Hapus Karyawan Holding',
    message: `Apakah Anda yakin ingin menghapus data karyawan holding "${item.nama}" (${item.nik})?`,
    color: 'error',
    confirmLabel: 'Ya, Hapus',
    cancelLabel: 'Batal',
  })

  if (!confirmed) return

  try {
    await deleteHoldingEmployee(item.id)
    notifier.success('Data karyawan holding berhasil dihapus.')
    await fetchEmployees()
  } catch (err) {
    notifier.error(apiError(err, 'Gagal menghapus data karyawan.'))
  }
}

function copyPublicLink() {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(publicQrUrl.value)
    notifier.success('Link public QR Gate Holding berhasil disalin.')
  }
}

let searchTimer = null
watch([search, statusFilter], () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchEmployees()
  }, 300)
})

watch(page, () => {
  fetchEmployees()
})

let logsSearchTimer = null
watch([logsSearch, logsDate], () => {
  clearTimeout(logsSearchTimer)
  logsSearchTimer = setTimeout(() => {
    logsPage.value = 1
    fetchLogs()
  }, 300)
})

watch(logsPage, () => {
  fetchLogs()
})

watch(activeTab, (tab) => {
  if (tab === 'logs') {
    fetchLogs()
  } else {
    fetchEmployees()
  }
})

onMounted(() => {
  fetchEmployees()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header Section -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-highlighted">
          Kelola Karyawan Holding
        </h1>
        <p class="mt-1 text-sm text-muted">
          Master data karyawan holding untuk akses Turnstile Gate QR mandiri.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <UButton
          color="neutral"
          variant="outline"
          class="cursor-pointer font-medium"
          @click="copyPublicLink"
        >
          <template #leading>
            <UIcon name="i-lucide-copy" class="size-4 text-primary" />
          </template>
          Salin Link Public Gate
        </UButton>

        <UButton
          color="primary"
          class="cursor-pointer font-semibold"
          @click="openCreateModal"
        >
          <template #leading>
            <UIcon name="i-lucide-plus" class="size-4" />
          </template>
          Tambah Karyawan
        </UButton>
      </div>
    </div>

    <!-- KPI Summary Cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-muted">Total Karyawan</p>
            <h3 class="mt-2 text-2xl font-bold text-highlighted">{{ kpi.total_count }}</h3>
          </div>
          <div class="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <UIcon name="i-lucide-building-2" class="size-6" />
          </div>
        </div>
      </UCard>

      <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-muted">Karyawan Aktif</p>
            <h3 class="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{{ kpi.active_count }}</h3>
          </div>
          <div class="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <UIcon name="i-lucide-user-check" class="size-6" />
          </div>
        </div>
      </UCard>

      <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-muted">Non-Aktif</p>
            <h3 class="mt-2 text-2xl font-bold text-slate-500">{{ kpi.inactive_count }}</h3>
          </div>
          <div class="flex size-12 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-500">
            <UIcon name="i-lucide-user-x" class="size-6" />
          </div>
        </div>
      </UCard>

      <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-muted">QR Hari Ini</p>
            <h3 class="mt-2 text-2xl font-bold text-purple-600 dark:text-purple-400">{{ kpi.today_qr_count }}</h3>
          </div>
          <div class="flex size-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <UIcon name="i-lucide-qr-code" class="size-6" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex border-b border-default">
      <button
        type="button"
        class="flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-all cursor-pointer"
        :class="activeTab === 'employees' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-highlighted'"
        @click="activeTab = 'employees'"
      >
        <UIcon name="i-lucide-users" class="size-4" />
        Daftar Karyawan Holding
      </button>

      <button
        type="button"
        class="flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-all cursor-pointer"
        :class="activeTab === 'logs' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-highlighted'"
        @click="activeTab = 'logs'"
      >
        <UIcon name="i-lucide-history" class="size-4" />
        Riwayat Log QR Gate
      </button>
    </div>

    <!-- TAB 1: Karyawan Holding List -->
    <div v-if="activeTab === 'employees'" class="space-y-4">
      <!-- Toolbar -->
      <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] p-2">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-1 items-center gap-2.5">
            <UInput
              v-model="search"
              placeholder="Cari NIK, nama, jabatan, perusahaan..."
              class="w-full max-w-sm"
            >
              <template #leading>
                <UIcon name="i-lucide-search" class="size-4 text-muted" />
              </template>
            </UInput>

            <select
              v-model="statusFilter"
              class="rounded-md border border-default bg-default px-3 py-2 text-xs font-medium text-highlighted focus:border-primary focus:outline-none"
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Non-Aktif</option>
            </select>
          </div>
        </div>
      </UCard>

      <!-- Table Card -->
      <UCard class="overflow-hidden border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-default bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th class="px-4 py-3.5">NIK & Nama</th>
                <th class="px-4 py-3.5">Perusahaan</th>
                <th class="px-4 py-3.5">Jabatan & Departemen</th>
                <th class="px-4 py-3.5">No. HP</th>
                <th class="px-4 py-3.5 text-center">Status</th>
                <th class="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-if="loading">
                <td colspan="6" class="py-12 text-center text-muted">
                  <UIcon name="i-lucide-loader-2" class="size-6 animate-spin mx-auto text-primary" />
                  <p class="mt-2 text-xs">Memuat data karyawan holding...</p>
                </td>
              </tr>

              <tr v-else-if="employees.length === 0">
                <td colspan="6" class="py-12 text-center text-muted">
                  <UIcon name="i-lucide-user-search" class="size-8 mx-auto text-muted/50" />
                  <p class="mt-2 text-sm font-medium">Tidak ada data karyawan holding ditemukan</p>
                </td>
              </tr>

              <tr
                v-for="emp in employees"
                v-else
                :key="emp.id"
                class="hover:bg-muted/30 transition-colors"
              >
                <td class="px-4 py-3.5">
                  <div class="font-bold text-highlighted">{{ emp.nama }}</div>
                  <div class="font-mono text-xs text-primary font-semibold">{{ emp.nik }}</div>
                </td>
                <td class="px-4 py-3.5 text-xs text-highlighted font-medium">
                  {{ emp.perusahaan || '-' }}
                </td>
                <td class="px-4 py-3.5">
                  <div class="text-xs font-medium text-highlighted">{{ emp.jabatan || '-' }}</div>
                  <div class="text-[11px] text-muted">{{ emp.departemen || '-' }}</div>
                </td>
                <td class="px-4 py-3.5 text-xs font-mono text-muted">
                  {{ emp.no_hp || '-' }}
                </td>
                <td class="px-4 py-3.5 text-center">
                  <UBadge
                    :color="emp.is_active ? 'success' : 'neutral'"
                    variant="subtle"
                    size="sm"
                    class="font-semibold"
                  >
                    {{ emp.is_active ? 'Aktif' : 'Non-Aktif' }}
                  </UBadge>
                </td>
                <td class="px-4 py-3.5 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      class="cursor-pointer"
                      title="Edit Data"
                      @click="openEditModal(emp)"
                    >
                      <UIcon name="i-lucide-pencil" class="size-3.5" />
                    </UButton>

                    <UButton
                      size="xs"
                      color="error"
                      variant="ghost"
                      class="cursor-pointer text-red-500 hover:text-red-600"
                      title="Hapus Data"
                      @click="handleDelete(emp)"
                    >
                      <UIcon name="i-lucide-trash-2" class="size-3.5" />
                    </UButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="meta.total > meta.per_page" class="flex items-center justify-between border-t border-default p-4">
          <p class="text-xs text-muted">
            Menampilkan {{ employees.length }} dari total {{ meta.total }} karyawan
          </p>
          <UPagination
            v-model="page"
            :page-count="meta.per_page"
            :total="meta.total"
          />
        </div>
      </UCard>
    </div>

    <!-- TAB 2: Riwayat Log QR Gate -->
    <div v-if="activeTab === 'logs'" class="space-y-4">
      <!-- Toolbar Logs -->
      <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] p-2">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-1 items-center gap-2.5">
            <UInput
              v-model="logsSearch"
              placeholder="Cari NIK, nama, perusahaan, IP..."
              class="w-full max-w-sm"
            >
              <template #leading>
                <UIcon name="i-lucide-search" class="size-4 text-muted" />
              </template>
            </UInput>

            <input
              v-model="logsDate"
              type="date"
              class="rounded-md border border-default bg-default px-3 py-2 text-xs font-medium text-highlighted focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </UCard>

      <!-- Logs Table -->
      <UCard class="overflow-hidden border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-default bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th class="px-4 py-3.5">Waktu Generate</th>
                <th class="px-4 py-3.5">NIK & Nama</th>
                <th class="px-4 py-3.5">Perusahaan</th>
                <th class="px-4 py-3.5">Kode Akses</th>
                <th class="px-4 py-3.5">IP Address</th>
                <th class="px-4 py-3.5">User Agent</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-if="logsLoading">
                <td colspan="6" class="py-12 text-center text-muted">
                  <UIcon name="i-lucide-loader-2" class="size-6 animate-spin mx-auto text-primary" />
                  <p class="mt-2 text-xs">Memuat riwayat log QR...</p>
                </td>
              </tr>

              <tr v-else-if="logs.length === 0">
                <td colspan="6" class="py-12 text-center text-muted">
                  <UIcon name="i-lucide-history" class="size-8 mx-auto text-muted/50" />
                  <p class="mt-2 text-sm font-medium">Belum ada riwayat generate QR holding</p>
                </td>
              </tr>

              <tr
                v-for="log in logs"
                v-else
                :key="log.id"
                class="hover:bg-muted/30 transition-colors"
              >
                <td class="px-4 py-3.5 text-xs text-muted whitespace-nowrap">
                  {{ formatDateTime(log.generated_at || log.created_at) }}
                </td>
                <td class="px-4 py-3.5">
                  <div class="font-bold text-highlighted">{{ log.nama }}</div>
                  <div class="font-mono text-xs text-primary font-semibold">{{ log.nik }}</div>
                </td>
                <td class="px-4 py-3.5 text-xs text-highlighted">
                  {{ log.perusahaan || '-' }}
                </td>
                <td class="px-4 py-3.5">
                  <UBadge color="primary" variant="subtle" size="sm" class="font-mono">
                    {{ log.access_date_code }}
                  </UBadge>
                </td>
                <td class="px-4 py-3.5 text-xs font-mono text-muted">
                  {{ log.ip_address || '-' }}
                </td>
                <td class="px-4 py-3.5 text-[11px] text-muted max-w-xs truncate" :title="log.user_agent">
                  {{ log.user_agent || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Logs -->
        <div v-if="logsMeta.total > logsMeta.per_page" class="flex items-center justify-between border-t border-default p-4">
          <p class="text-xs text-muted">
            Menampilkan {{ logs.length }} dari total {{ logsMeta.total }} log
          </p>
          <UPagination
            v-model="logsPage"
            :page-count="logsMeta.per_page"
            :total="logsMeta.total"
          />
        </div>
      </UCard>
    </div>

    <!-- MODAL CREATE / EDIT (Native Nuxt UCard Modal with Active Theme) -->
    <div
      v-if="modalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
        aria-label="Tutup modal"
        @click="modalOpen = false"
      ></button>

      <UCard class="relative max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-2xl">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-highlighted">
              {{ modalMode === 'create' ? 'Tambah Karyawan Holding' : 'Edit Karyawan Holding' }}
            </h3>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="modalOpen = false"
            />
          </div>
        </template>

        <form @submit.prevent="handleSave" class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              NIK Karyawan <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="form.nik"
              type="text"
              required
              placeholder="Contoh: HLD26001"
              class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm font-semibold text-highlighted focus:border-primary focus:outline-none uppercase"
              @input="form.nik = form.nik.toUpperCase()"
            />
            <p v-if="formErrors.nik" class="mt-1 text-xs text-rose-500">{{ formErrors.nik[0] }}</p>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Nama Lengkap <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="form.nama"
              type="text"
              required
              placeholder="Nama lengkap karyawan holding"
              class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm font-medium text-highlighted focus:border-primary focus:outline-none"
            />
            <p v-if="formErrors.nama" class="mt-1 text-xs text-rose-500">{{ formErrors.nama[0] }}</p>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Perusahaan / Holding
            </label>
            <input
              v-model="form.perusahaan"
              type="text"
              placeholder="Contoh: PT Hompimpa Global Holding"
              class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm font-medium text-highlighted focus:border-primary focus:outline-none"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                Jabatan
              </label>
              <input
                v-model="form.jabatan"
                type="text"
                placeholder="Contoh: Manager"
                class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm font-medium text-highlighted focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                Departemen
              </label>
              <input
                v-model="form.departemen"
                type="text"
                placeholder="Contoh: Finance"
                class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm font-medium text-highlighted focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              No. Handphone (Opsional)
            </label>
            <input
              v-model="form.no_hp"
              type="tel"
              placeholder="Contoh: 081234567890"
              class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm font-medium text-highlighted focus:border-primary focus:outline-none"
            />
          </div>

          <div class="flex items-center gap-3 pt-2">
            <input
              id="statusCheckbox"
              v-model="form.is_active"
              type="checkbox"
              class="size-4 rounded border-default text-primary focus:ring-primary"
            />
            <label for="statusCheckbox" class="text-xs font-semibold text-highlighted cursor-pointer">
              Status Karyawan Aktif (Dapat generate QR)
            </label>
          </div>

          <!-- Modal Actions -->
          <div class="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-default">
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              class="cursor-pointer font-medium"
              @click="modalOpen = false"
            >
              Batal
            </UButton>

            <UButton
              type="submit"
              color="primary"
              variant="solid"
              size="sm"
              :loading="saving"
              class="cursor-pointer font-semibold"
            >
              {{ modalMode === 'create' ? 'Tambah Data' : 'Simpan Perubahan' }}
            </UButton>
          </div>
        </form>
      </UCard>
    </div>
  </div>
</template>
