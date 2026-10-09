<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  getStaffRecruitmentRequests,
  getStaffRecruitmentRequestOptions,
  createStaffRecruitmentRequest,
} from '../services/staffService'
import { apiError, formatDate } from '../utils/formatters'

const records = ref([])
const search = ref('')
const message = ref('')
const errorMessage = ref('')
const createDialogOpen = ref(false)
const detailDialogOpen = ref(false)
const selectedRecord = ref(null)
const isSubmitting = ref(false)
const canCreateRequest = ref(true)

const positionTitles = ref([])
const departments = ref([])
const units = ref([])
const employees = ref([])
const currentUser = ref(null)

const form = reactive({
  title: '',
  department: '',
  unit: '',
  quantity: 1,
  hiring_type: 'new_hiring',
  replaced_employee_nik: '',
  replaced_employee_name: '',
  replaced_employee_position: '',
  employment_status: 'pkwt',
  direct_report_nik: '',
  direct_report_name: '',
  subordinates: [],
  requires_gm: false,
  start_date: '',
  request_date: new Date().toISOString().slice(0, 10),
  description: '',
})

const subordinateSearch = ref('')
const availableSubordinates = computed(() => {
  const selectedNiks = new Set(form.subordinates.map((s) => s.nik))
  const keyword = subordinateSearch.value.trim().toLowerCase()
  return employees.value.filter((emp) => {
    if (selectedNiks.has(emp.nik)) return false
    if (!keyword) return true
    return (
      emp.nama_karyawan.toLowerCase().includes(keyword) ||
      emp.nik.toLowerCase().includes(keyword) ||
      (emp.posisi_title || '').toLowerCase().includes(keyword)
    )
  })
})

const formControlClass =
  'w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

const filteredRecords = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return records.value.filter((record) => {
    return (
      record.title.toLowerCase().includes(keyword) ||
      (record.department || '').toLowerCase().includes(keyword) ||
      (record.unit || '').toLowerCase().includes(keyword) ||
      (record.hiring_type || '').toLowerCase().includes(keyword) ||
      (record.hiring_status || '').toLowerCase().includes(keyword) ||
      (record.replaced_employee_name || '').toLowerCase().includes(keyword) ||
      (record.description || '').toLowerCase().includes(keyword)
    )
  })
})

// Form reactive state initialized

async function load() {
  try {
    const [reqsRes, optsRes] = await Promise.all([
      getStaffRecruitmentRequests(),
      getStaffRecruitmentRequestOptions(),
    ])
    records.value = reqsRes.data
    positionTitles.value = optsRes.data.position_titles || []
    departments.value = optsRes.data.departments || []
    units.value = optsRes.data.units || []
    employees.value = optsRes.data.employees || []
    currentUser.value = optsRes.data.current_user || null
    canCreateRequest.value = optsRes.data.can_create_request !== undefined ? Boolean(optsRes.data.can_create_request) : true
  } catch (error) {
    errorMessage.value = apiError(error)
  }
}

function openCreateDialog() {
  const today = new Date().toISOString().slice(0, 10)
  Object.assign(form, {
    title: '',
    department: currentUser.value?.departement || '',
    unit: currentUser.value?.unit || '',
    quantity: 1,
    hiring_type: 'new_hiring',
    replaced_employee_nik: '',
    replaced_employee_name: '',
    replaced_employee_position: '',
    employment_status: 'pkwt',
    direct_report_nik: currentUser.value?.nik || '',
    direct_report_name: currentUser.value?.nama_karyawan || '',
    subordinates: [],
    requires_gm: false,
    start_date: '',
    request_date: today,
    description: '',
  })

  createDialogOpen.value = true
}

function closeCreateDialog() {
  createDialogOpen.value = false
}

function onReplacedEmployeeChange(event) {
  const nik = event.target.value
  const emp = employees.value.find((e) => e.nik === nik)
  if (emp) {
    form.replaced_employee_nik = emp.nik
    form.replaced_employee_name = emp.nama_karyawan
    form.replaced_employee_position = emp.posisi_title || emp.jabatan || '-'
  } else {
    form.replaced_employee_nik = ''
    form.replaced_employee_name = ''
    form.replaced_employee_position = ''
  }
}

function onDirectReportChange(event) {
  const nik = event.target.value
  const emp = employees.value.find((e) => e.nik === nik)
  if (emp) {
    form.direct_report_nik = emp.nik
    form.direct_report_name = emp.nama_karyawan
  } else {
    form.direct_report_nik = ''
    form.direct_report_name = ''
  }
}

function addSubordinate(emp) {
  if (!form.subordinates.some((s) => s.nik === emp.nik)) {
    form.subordinates.push({
      nik: emp.nik,
      nama_karyawan: emp.nama_karyawan,
      posisi: emp.posisi_title || emp.jabatan || '-',
    })
  }
  subordinateSearch.value = ''
}

function removeSubordinate(nik) {
  form.subordinates = form.subordinates.filter((s) => s.nik !== nik)
}

async function saveRequest() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const payload = {
      ...form,
      subordinates: form.subordinates.map((s) => ({
        nik: s.nik,
        nama_karyawan: s.nama_karyawan,
        posisi: s.posisi,
      })),
    }
    const response = await createStaffRecruitmentRequest(payload)
    message.value =
      response.data.message || 'Pengajuan rekrutmen berhasil diajukan dan notifikasi telah dikirim.'
    closeCreateDialog()
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    isSubmitting.value = false
  }
}

function openDetailDialog(item) {
  selectedRecord.value = item
  detailDialogOpen.value = true
}

function closeDetailDialog() {
  detailDialogOpen.value = false
  selectedRecord.value = null
}

function getHiringStatusColor(status) {
  switch (status) {
    case 'accepted':
      return 'info'
    case 'ongoing':
      return 'primary'
    case 'hired':
      return 'success'
    case 'canceled':
      return 'neutral'
    case 'rejected':
      return 'danger'
    default:
      return 'warning'
  }
}

function getApprovalStepLabel(item) {
  if (item.status === 'rejected') return 'Ditolak'
  if (item.status === 'approved' || item.approval_step === 'completed') return 'Disetujui'
  switch (item.approval_step) {
    case 'manager':
      return 'Menunggu Manager Dept'
    case 'gm':
      return 'Menunggu GM'
    case 'hrbp':
      return 'Menunggu Manager HRBP'
    default:
      return 'Menunggu Review'
  }
}

function getApprovalStepColor(item) {
  if (item.status === 'rejected') return 'danger'
  if (item.status === 'approved' || item.approval_step === 'completed') return 'success'
  switch (item.approval_step) {
    case 'manager':
      return 'warning'
    case 'gm':
      return 'secondary'
    case 'hrbp':
      return 'info'
    default:
      return 'neutral'
  }
}

onMounted(load)
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 class="text-2xl font-semibold text-highlighted">
          Pengajuan Rekrutmen (Manpower Request)
        </h2>
        <p class="mt-1 text-sm text-muted">
          Ajukan kebutuhan penambahan staf (New Hiring / Replacement) dan pantau alur approval WhatsApp hingga proses seleksi.
        </p>
      </div>
      <div>
        <UButton
          v-if="canCreateRequest"
          size="sm"
          icon="i-lucide-plus"
          label="Ajukan Manpower Baru"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <div
      v-if="!canCreateRequest"
      class="p-3.5 rounded-lg border border-default bg-muted/10 flex items-center gap-3 text-xs text-muted"
    >
      <span class="i-lucide-info text-primary text-base"></span>
      <span>
        Menu pengajuan penambahan karyawan (Manpower Request) diperuntukkan bagi karyawan yang memiliki bawahan (Leader / Supervisor / Manager / GM). Anda dapat memantau riwayat pengajuan divisi Anda pada tabel di bawah.
      </span>
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <UCard>
      <template #header>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="font-semibold text-highlighted">Histori Pengajuan Manpower</h3>
            <p class="mt-1 text-sm text-muted">
              Pantau status persetujuan bertingkat dan tahapan pemenuhan rekrutmen.
            </p>
          </div>
          <input
            v-model="search"
            type="search"
            placeholder="Cari posisi, departemen, jenis hiring..."
            class="w-full rounded-lg border border-default bg-default p-2.5 text-sm sm:max-w-sm"
          />
        </div>
      </template>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-muted border-b border-default">
              <th class="p-3">Posisi & Kebutuhan</th>
              <th class="p-3">Jenis & Kontrak</th>
              <th class="p-3">Target Mulai</th>
              <th class="p-3">Persetujuan</th>
              <th class="p-3">Status Hiring</th>
              <th class="p-3">PIC Hiring</th>
              <th class="p-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in filteredRecords"
              :key="item.id"
              class="border-t border-default hover:bg-muted/10 transition cursor-pointer"
              @click="openDetailDialog(item)"
            >
              <td class="p-3">
                <p class="font-semibold text-highlighted">{{ item.title }}</p>
                <p class="mt-0.5 text-xs text-muted">
                  {{ item.department }} - {{ item.unit }} • <strong>{{ item.quantity }} Orang</strong>
                </p>
              </td>
              <td class="p-3">
                <div class="flex flex-col gap-1 items-start">
                  <UBadge
                    :color="item.hiring_type === 'replacement' ? 'warning' : 'primary'"
                    variant="soft"
                    size="xs"
                  >
                    {{ item.hiring_type === 'replacement' ? 'Replacement' : 'New Hiring' }}
                  </UBadge>
                  <span class="text-xs text-muted font-medium">
                    {{ (item.employment_status || 'pkwt').toUpperCase() }}
                  </span>
                  <span
                    v-if="item.hiring_type === 'replacement' && item.replaced_employee_name"
                    class="text-[11px] text-muted truncate max-w-[160px]"
                    :title="`Menggantikan: ${item.replaced_employee_name}`"
                  >
                    Gantikan: {{ item.replaced_employee_name }}
                  </span>
                </div>
              </td>
              <td class="p-3 text-xs text-highlighted">
                <p v-if="item.start_date" class="font-medium">{{ formatDate(item.start_date) }}</p>
                <p v-else class="text-muted italic">Tidak ditentukan</p>
                <p class="text-[11px] text-muted">Diajukan: {{ formatDate(item.request_date || item.created_at) }}</p>
              </td>
              <td class="p-3">
                <UBadge :color="getApprovalStepColor(item)" variant="soft" size="xs">
                  {{ getApprovalStepLabel(item) }}
                </UBadge>
                <p v-if="item.hrd_notes" class="mt-1 text-[11px] text-danger italic truncate max-w-[180px]">
                  Catatan: {{ item.hrd_notes }}
                </p>
              </td>
              <td class="p-3">
                <UBadge :color="getHiringStatusColor(item.hiring_status || 'pending')" variant="solid" size="xs">
                  {{ (item.hiring_status || 'pending').toUpperCase() }}
                </UBadge>
              </td>
              <td class="p-3 text-xs">
                <span v-if="item.pic_hiring_name" class="font-medium text-highlighted">
                  {{ item.pic_hiring_name }}
                </span>
                <span v-else class="text-muted italic">Belum di-assign</span>
              </td>
              <td class="p-3 text-center" @click.stop>
                <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-eye" label="Detail" @click="openDetailDialog(item)" />
              </td>
            </tr>
            <tr v-if="!filteredRecords.length">
              <td colspan="7" class="p-6 text-center text-muted">Belum ada pengajuan manpower request.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Create Request Dialog -->
    <div
      v-if="createDialogOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Ajukan Manpower Baru"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        @click="closeCreateDialog"
      ></button>
      <UCard class="relative max-h-[90vh] w-full max-w-2xl overflow-hidden flex flex-col">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-base font-semibold text-highlighted">Buat Pengajuan Manpower Request</p>
              <p class="mt-1 text-xs text-muted">
                Lengkapi kebutuhan posisi, jenis penambahan, struktur pelaporan, dan target rekrutmen.
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="closeCreateDialog"
            />
          </div>
        </template>

        <form class="space-y-4 overflow-y-auto max-h-[68vh] pr-1" @submit.prevent="saveRequest">
          <!-- 1. Pilihan Hiring (New Hiring / Replacement) -->
          <div class="rounded-lg border border-default p-3.5 bg-muted/5 space-y-3">
            <label class="block text-xs font-semibold uppercase tracking-wider text-muted">
              Jenis Kebutuhan (Hiring Type)
            </label>
            <div class="grid grid-cols-2 gap-3">
              <label
                class="flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition"
                :class="form.hiring_type === 'new_hiring' ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-default bg-default text-muted'"
              >
                <input
                  v-model="form.hiring_type"
                  type="radio"
                  value="new_hiring"
                  class="accent-primary"
                />
                <span>New Hiring (Posisi Baru)</span>
              </label>
              <label
                class="flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition"
                :class="form.hiring_type === 'replacement' ? 'border-warning bg-warning/10 text-warning font-medium' : 'border-default bg-default text-muted'"
              >
                <input
                  v-model="form.hiring_type"
                  type="radio"
                  value="replacement"
                  class="accent-warning"
                />
                <span>Replacement (Penggantian)</span>
              </label>
            </div>

            <!-- If Replacement: Employee & Position -->
            <div v-if="form.hiring_type === 'replacement'" class="pt-2 border-t border-default space-y-2">
              <label class="block text-xs font-medium text-highlighted">
                Pilih Karyawan yang Digantikan <span class="text-danger">*</span>
              </label>
              <select
                :value="form.replaced_employee_nik"
                required
                :class="formControlClass"
                @change="onReplacedEmployeeChange"
              >
                <option value="">-- Pilih karyawan yang digantikan --</option>
                <option
                  v-for="emp in employees"
                  :key="emp.nik"
                  :value="emp.nik"
                >
                  {{ emp.nama_karyawan }} ({{ emp.posisi_title || emp.jabatan || '-' }} - {{ emp.departement }})
                </option>
              </select>

              <div v-if="form.replaced_employee_name" class="flex gap-4 p-2 bg-default rounded border border-default text-xs text-muted">
                <div>
                  <span class="text-[11px] block text-muted">Nama:</span>
                  <strong class="text-highlighted">{{ form.replaced_employee_name }}</strong>
                </div>
                <div>
                  <span class="text-[11px] block text-muted">Posisi Terakhir:</span>
                  <strong class="text-highlighted">{{ form.replaced_employee_position || '-' }}</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. Posisi, Departemen, Unit, Qty, Kontrak -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-xs font-medium text-muted">Nama Posisi / Jabatan <span class="text-danger">*</span></label>
              <select v-model="form.title" required :class="formControlClass">
                <option value="">Pilih posisi...</option>
                <option v-for="t in positionTitles" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-muted">Status Hubungan Kerja <span class="text-danger">*</span></label>
              <select v-model="form.employment_status" required :class="formControlClass">
                <option value="pkwt">PKWT (Kontrak)</option>
                <option value="casual">Casual (Pekerja Harian/Lepas)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="mb-1 block text-xs font-medium text-muted">Departemen <span class="text-danger">*</span></label>
              <select v-model="form.department" required :class="formControlClass">
                <option value="">Pilih departemen...</option>
                <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-muted">Unit <span class="text-danger">*</span></label>
              <select v-model="form.unit" required :class="formControlClass">
                <option value="">Pilih unit...</option>
                <option v-for="u in units" :key="u" :value="u">{{ u }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-muted">Jumlah Orang (Qty) <span class="text-danger">*</span></label>
              <input
                v-model.number="form.quantity"
                type="number"
                min="1"
                required
                :class="formControlClass"
              />
            </div>
          </div>

          <!-- 3. Direct Report & Subordinate -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label class="mb-1 block text-xs font-medium text-muted">
                Direct Report (Atasan Langsung)
              </label>
              <select
                :value="form.direct_report_nik"
                :class="formControlClass"
                @change="onDirectReportChange"
              >
                <option value="">-- Pilih Atasan Langsung --</option>
                <option
                  v-for="emp in employees"
                  :key="emp.nik"
                  :value="emp.nik"
                >
                  {{ emp.nama_karyawan }} ({{ emp.posisi_title || emp.jabatan || '-' }})
                </option>
              </select>
              <p class="mt-0.5 text-[11px] text-muted">Kepada siapa posisi ini bertanggung jawab.</p>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-muted">
                Target Mulai / Bergabung (Start Date)
              </label>
              <input
                v-model="form.start_date"
                type="date"
                :class="formControlClass"
              />
              <p class="mt-0.5 text-[11px] text-muted">Target karyawan mulai dibutuhkan.</p>
            </div>
          </div>

          <!-- Subordinates Multi-select -->
          <div class="rounded-lg border border-default p-3 bg-muted/5 space-y-2">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-medium text-muted">
                Subordinate (Anggota Tim di Bawah Posisi Ini)
              </label>
              <span class="text-[11px] text-muted font-medium">
                {{ form.subordinates.length }} Karyawan Dipilih
              </span>
            </div>

            <!-- Selected Chips -->
            <div v-if="form.subordinates.length > 0" class="flex flex-wrap gap-1.5 p-2 bg-default rounded-md border border-default">
              <span
                v-for="sub in form.subordinates"
                :key="sub.nik"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
              >
                {{ sub.nama_karyawan }} ({{ sub.posisi }})
                <button
                  type="button"
                  class="hover:text-danger ml-0.5"
                  @click="removeSubordinate(sub.nik)"
                >
                  &times;
                </button>
              </span>
            </div>

            <!-- Search and Pick Subordinate -->
            <div class="relative">
              <input
                v-model="subordinateSearch"
                type="text"
                placeholder="Cari nama karyawan untuk ditambahkan sebagai bawahan..."
                class="w-full rounded-md border border-default bg-default px-3 py-1.5 text-xs text-highlighted outline-none focus:border-primary"
              />
              <div
                v-if="subordinateSearch.trim() && availableSubordinates.length > 0"
                class="absolute left-0 right-0 z-20 mt-1 max-h-40 overflow-y-auto rounded-md border border-default bg-default shadow-lg text-xs"
              >
                <div
                  v-for="emp in availableSubordinates.slice(0, 10)"
                  :key="emp.nik"
                  class="p-2 hover:bg-muted/15 cursor-pointer flex justify-between items-center border-b border-default/50 last:border-b-0"
                  @click="addSubordinate(emp)"
                >
                  <div>
                    <strong class="text-highlighted">{{ emp.nama_karyawan }}</strong>
                    <span class="text-muted ml-1">({{ emp.posisi_title || emp.jabatan || '-' }})</span>
                  </div>
                  <span class="text-[11px] text-muted">{{ emp.departement }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 4. Smart Checkbox GM -->
          <div class="rounded-lg border border-default p-3 bg-muted/10 flex items-start gap-3">
            <input
              id="requires_gm_checkbox"
              v-model="form.requires_gm"
              type="checkbox"
              class="mt-1 h-4 w-4 rounded border-default text-primary focus:ring-primary accent-primary"
            />
            <label for="requires_gm_checkbox" class="text-xs cursor-pointer select-none">
              <span class="font-semibold text-highlighted block">Sertakan Approval General Manager (GM)</span>
              <span class="text-muted text-[11px] block mt-0.5">
                Centang opsi ini jika struktur pengajuan atau posisi yang diajukan berada di bawah persetujuan General Manager (GM).
              </span>
            </label>
          </div>

          <!-- 5. Keterangan & Justifikasi -->
          <div>
            <label class="mb-1 block text-xs font-medium text-muted">
              Deskripsi Tugas & Justifikasi Kebutuhan
            </label>
            <textarea
              v-model="form.description"
              rows="3"
              placeholder="Jelaskan alasan penambahan / penggantian posisi ini dan tugas-tugas pokok yang akan dipegang."
              :class="formControlClass"
            ></textarea>
          </div>

          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton
              type="button"
              label="Batal"
              color="neutral"
              variant="ghost"
              @click="closeCreateDialog"
            />
            <UButton
              type="submit"
              icon="i-lucide-send"
              label="Kirim Pengajuan Manpower"
              :loading="isSubmitting"
            />
          </div>
        </form>
      </UCard>
    </div>

    <!-- Detail Dialog -->
    <div
      v-if="detailDialogOpen && selectedRecord"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Detail Manpower Request"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        @click="closeDetailDialog"
      ></button>
      <UCard class="relative max-h-[90vh] w-full max-w-xl overflow-hidden flex flex-col">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <p class="text-base font-semibold text-highlighted">{{ selectedRecord.title }}</p>
                <UBadge :color="getHiringStatusColor(selectedRecord.hiring_status || 'pending')" size="xs">
                  {{ (selectedRecord.hiring_status || 'pending').toUpperCase() }}
                </UBadge>
              </div>
              <p class="mt-0.5 text-xs text-muted">
                {{ selectedRecord.department }} - {{ selectedRecord.unit }} • {{ selectedRecord.quantity }} Orang
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="closeDetailDialog"
            />
          </div>
        </template>

        <div class="space-y-4 overflow-y-auto max-h-[70vh] pr-1 text-xs">
          <!-- Stepper Approval -->
          <div class="rounded-lg border border-default p-3 bg-muted/5 space-y-2">
            <p class="font-semibold text-highlighted">Status Alur Persetujuan</p>
            <div class="space-y-2">
              <!-- Step 1: Manager -->
              <div class="flex items-center justify-between p-2 rounded bg-default border border-default">
                <div>
                  <p class="font-medium text-highlighted">1. Manager Departemen</p>
                  <p class="text-[11px] text-muted">
                    {{ selectedRecord.manager_name || 'Menunggu penentuan' }}
                  </p>
                </div>
                <UBadge
                  :color="selectedRecord.manager_status === 'approved' ? 'success' : (selectedRecord.manager_status === 'rejected' ? 'danger' : 'warning')"
                  variant="soft"
                  size="xs"
                >
                  {{ (selectedRecord.manager_status || 'pending').toUpperCase() }}
                </UBadge>
              </div>

              <!-- Step 2: GM (If requires_gm) -->
              <div
                v-if="selectedRecord.requires_gm"
                class="flex items-center justify-between p-2 rounded bg-default border border-default"
              >
                <div>
                  <p class="font-medium text-highlighted">2. General Manager (GM)</p>
                  <p class="text-[11px] text-muted">
                    {{ selectedRecord.gm_name || 'Riswan Septiawan (GM)' }}
                  </p>
                </div>
                <UBadge
                  :color="selectedRecord.gm_status === 'approved' ? 'success' : (selectedRecord.gm_status === 'rejected' ? 'danger' : 'neutral')"
                  variant="soft"
                  size="xs"
                >
                  {{ (selectedRecord.gm_status || 'pending').toUpperCase() }}
                </UBadge>
              </div>

              <!-- Step 3: HRBP -->
              <div class="flex items-center justify-between p-2 rounded bg-default border border-default">
                <div>
                  <p class="font-medium text-highlighted">
                    {{ selectedRecord.requires_gm ? '3. Manager HRBP' : '2. Manager HRBP' }}
                  </p>
                  <p class="text-[11px] text-muted">
                    {{ selectedRecord.hrbp_name || 'Akmal Rahman (HRBP)' }}
                  </p>
                </div>
                <UBadge
                  :color="selectedRecord.hrbp_status === 'approved' ? 'success' : (selectedRecord.hrbp_status === 'rejected' ? 'danger' : 'neutral')"
                  variant="soft"
                  size="xs"
                >
                  {{ (selectedRecord.hrbp_status || 'pending').toUpperCase() }}
                </UBadge>
              </div>
            </div>
          </div>

          <!-- Parameter Informasi -->
          <div class="grid grid-cols-2 gap-3">
            <div class="p-2.5 rounded-lg border border-default bg-default space-y-1">
              <span class="text-muted text-[11px] block">Jenis Hiring:</span>
              <strong class="text-highlighted block">
                {{ selectedRecord.hiring_type === 'replacement' ? 'Replacement (Penggantian)' : 'New Hiring' }}
              </strong>
              <div v-if="selectedRecord.hiring_type === 'replacement'" class="text-[11px] text-muted pt-1 border-t border-default">
                Menggantikan: <strong>{{ selectedRecord.replaced_employee_name }}</strong> ({{ selectedRecord.replaced_employee_position }})
              </div>
            </div>
            <div class="p-2.5 rounded-lg border border-default bg-default space-y-1">
              <span class="text-muted text-[11px] block">Status Hubungan Kerja:</span>
              <strong class="text-highlighted block">
                {{ (selectedRecord.employment_status || 'PKWT').toUpperCase() }}
              </strong>
              <span class="text-muted text-[11px] block pt-1 border-t border-default">
                Target Mulai: <strong class="text-highlighted">{{ selectedRecord.start_date ? formatDate(selectedRecord.start_date) : '-' }}</strong>
              </span>
            </div>
          </div>

          <!-- Pelaporan Tim -->
          <div class="p-2.5 rounded-lg border border-default bg-default space-y-2">
            <p class="font-semibold text-highlighted">Struktur Pelaporan</p>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span class="text-muted text-[11px] block">Direct Report:</span>
                <strong class="text-highlighted">{{ selectedRecord.direct_report_name || '-' }}</strong>
              </div>
              <div>
                <span class="text-muted text-[11px] block">PIC Rekrutmen (HR):</span>
                <strong class="text-highlighted">{{ selectedRecord.pic_hiring_name || 'Belum di-assign' }}</strong>
              </div>
            </div>

            <div v-if="selectedRecord.subordinates && selectedRecord.subordinates.length > 0" class="pt-2 border-t border-default">
              <span class="text-muted text-[11px] block mb-1">Subordinate (Bawahan Langsung):</span>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="sub in selectedRecord.subordinates"
                  :key="sub.nik"
                  class="px-2 py-0.5 rounded text-[11px] bg-muted/20 text-highlighted border border-default"
                >
                  {{ sub.nama_karyawan }} ({{ sub.posisi }})
                </span>
              </div>
            </div>
          </div>

          <!-- Deskripsi & Catatan -->
          <div v-if="selectedRecord.description" class="p-2.5 rounded-lg border border-default bg-default space-y-1">
            <span class="text-muted text-[11px] block">Deskripsi / Justifikasi Kebutuhan:</span>
            <p class="text-highlighted whitespace-pre-wrap">{{ selectedRecord.description }}</p>
          </div>

          <div v-if="selectedRecord.hrd_notes" class="p-2.5 rounded-lg border border-danger/20 bg-danger/5 space-y-1 text-danger">
            <span class="font-semibold text-[11px] block">Catatan HRD / Reviewer:</span>
            <p>{{ selectedRecord.hrd_notes }}</p>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end">
            <UButton label="Tutup" color="neutral" variant="ghost" @click="closeDetailDialog" />
          </div>
        </template>
      </UCard>
    </div>
  </section>
</template>
