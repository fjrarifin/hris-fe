<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  getHrRecruitmentRequests,
  getHrRecruitmentRequestOptions,
  decideHrRecruitmentRequest,
  updateHrRecruitmentRequestHiring,
  getHrVacancies,
} from '../services/hrService'
import { apiError, formatDate } from '../utils/formatters'

const records = ref([])
const vacancies = ref([])
const recruiters = ref([])
const allEmployees = ref([])
const search = ref('')
const filterStatus = ref('all')
const filterHiringStatus = ref('all')
const filterHiringType = ref('all')
const message = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

const decideDialogOpen = ref(false)
const hiringDialogOpen = ref(false)
const detailDialogOpen = ref(false)
const selectedRecord = ref(null)

const decideForm = reactive({
  id: null,
  title: '',
  requester_name: '',
  quantity: 1,
  status: 'approved',
  hrd_notes: '',
  vacancy_link_mode: 'new',
  vacancy_id: '',
  pic_hiring_nik: '',
  start_date: '',
  finished_date: '',
})

const hiringForm = reactive({
  id: null,
  title: '',
  hiring_status: 'ongoing',
  pic_hiring_nik: '',
  start_date: '',
  finished_date: '',
  hrd_notes: '',
  vacancy_id: '',
  vacancy_link_mode: 'none',
  vacancy: null,
})

const formControlClass =
  'w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

const stats = computed(() => {
  const total = records.value.length
  const pending = records.value.filter((r) => r.status === 'pending').length
  const approved = records.value.filter((r) => r.status === 'approved').length
  const ongoing = records.value.filter((r) => r.hiring_status === 'ongoing').length
  const hired = records.value.filter((r) => r.hiring_status === 'hired').length
  return { total, pending, approved, ongoing, hired }
})

const filteredRecords = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return records.value.filter((record) => {
    const requesterName = record.requester?.nama_karyawan || ''
    const matchesKeyword =
      record.title.toLowerCase().includes(keyword) ||
      (record.department || '').toLowerCase().includes(keyword) ||
      (record.unit || '').toLowerCase().includes(keyword) ||
      requesterName.toLowerCase().includes(keyword) ||
      (record.pic_hiring_name || '').toLowerCase().includes(keyword) ||
      (record.replaced_employee_name || '').toLowerCase().includes(keyword)

    const matchesStatus = filterStatus.value === 'all' || record.status === filterStatus.value
    const matchesHiringStatus =
      filterHiringStatus.value === 'all' || record.hiring_status === filterHiringStatus.value
    const matchesHiringType =
      filterHiringType.value === 'all' || record.hiring_type === filterHiringType.value

    return matchesKeyword && matchesStatus && matchesHiringStatus && matchesHiringType
  })
})

async function load() {
  try {
    const [reqsRes, vacsRes, optsRes] = await Promise.all([
      getHrRecruitmentRequests(),
      getHrVacancies(),
      getHrRecruitmentRequestOptions(),
    ])
    records.value = reqsRes.data
    vacancies.value = vacsRes.data.filter((v) => v.status === 'open')
    recruiters.value = optsRes.data.recruiters || []
    allEmployees.value = optsRes.data.all_employees || []
  } catch (error) {
    errorMessage.value = apiError(error)
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

function openDecideDialog(item) {
  Object.assign(decideForm, {
    id: item.id,
    title: item.title,
    requester_name: item.requester?.nama_karyawan || item.requester_nik,
    quantity: item.quantity,
    status: 'approved',
    hrd_notes: item.hrd_notes || '',
    vacancy_link_mode: 'new',
    vacancy_id: item.vacancy_id || '',
    pic_hiring_nik: item.pic_hiring_nik || '',
    start_date: item.start_date || '',
    finished_date: item.finished_date || '',
  })
  decideDialogOpen.value = true
}

function closeDecideDialog() {
  decideDialogOpen.value = false
}

async function submitDecision() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const payload = {
      status: decideForm.status,
      hrd_notes: decideForm.hrd_notes,
      vacancy_link_mode: decideForm.status === 'approved' ? decideForm.vacancy_link_mode : 'none',
      vacancy_id:
        decideForm.status === 'approved' && decideForm.vacancy_link_mode === 'existing'
          ? decideForm.vacancy_id
          : null,
      pic_hiring_nik: decideForm.pic_hiring_nik || null,
      start_date: decideForm.start_date || null,
      finished_date: decideForm.finished_date || null,
    }
    const response = await decideHrRecruitmentRequest(decideForm.id, payload)
    message.value = response.data.message || 'Keputusan berhasil disimpan.'
    closeDecideDialog()
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    isSubmitting.value = false
  }
}

function openHiringDialog(item) {
  Object.assign(hiringForm, {
    id: item.id,
    title: item.title,
    hiring_status: item.hiring_status || 'ongoing',
    pic_hiring_nik: item.pic_hiring_nik || '',
    start_date: item.start_date || '',
    finished_date: item.finished_date || '',
    hrd_notes: item.hrd_notes || '',
    vacancy_id: item.vacancy_id || '',
    vacancy_link_mode: 'none',
    vacancy: item.vacancy || null,
  })
  hiringDialogOpen.value = true
}

function closeHiringDialog() {
  hiringDialogOpen.value = false
}

async function submitHiringUpdate() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const payload = {
      hiring_status: hiringForm.hiring_status,
      pic_hiring_nik: hiringForm.pic_hiring_nik || null,
      start_date: hiringForm.start_date || null,
      finished_date: hiringForm.finished_date || null,
      hrd_notes: hiringForm.hrd_notes || null,
      vacancy_link_mode: hiringForm.vacancy_link_mode || 'none',
      vacancy_id: hiringForm.vacancy_link_mode === 'existing' ? (hiringForm.vacancy_id || null) : null,
    }
    const response = await updateHrRecruitmentRequestHiring(hiringForm.id, payload)
    message.value = response.data.message || 'Status operasional rekrutmen berhasil diperbarui.'
    closeHiringDialog()
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    isSubmitting.value = false
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'approved':
      return 'success'
    case 'rejected':
      return 'danger'
    default:
      return 'neutral'
  }
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
      return 'Review'
  }
}

onMounted(load)
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-2xl font-semibold text-highlighted">
          Persetujuan Lowongan (Manpower Requests)
        </h2>
        <p class="mt-1 text-sm text-muted">
          Tinjau alur persetujuan bertingkat (Manager &bull; GM &bull; HRBP), kelola PIC Recruiter, dan pantau status pemenuhan kandidat.
        </p>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <div class="p-3.5 rounded-lg border border-default bg-default shadow-sm">
        <span class="text-xs text-muted block">Total Pengajuan</span>
        <strong class="text-xl font-bold text-highlighted mt-0.5 block">{{ stats.total }}</strong>
      </div>
      <div class="p-3.5 rounded-lg border border-warning/30 bg-warning/5 shadow-sm">
        <span class="text-xs text-warning block">Menunggu Approval</span>
        <strong class="text-xl font-bold text-warning mt-0.5 block">{{ stats.pending }}</strong>
      </div>
      <div class="p-3.5 rounded-lg border border-info/30 bg-info/5 shadow-sm">
        <span class="text-xs text-info block">Disetujui (Accepted)</span>
        <strong class="text-xl font-bold text-info mt-0.5 block">{{ stats.approved }}</strong>
      </div>
      <div class="p-3.5 rounded-lg border border-primary/30 bg-primary/5 shadow-sm">
        <span class="text-xs text-primary block">Proses Sourcing (Ongoing)</span>
        <strong class="text-xl font-bold text-primary mt-0.5 block">{{ stats.ongoing }}</strong>
      </div>
      <div class="p-3.5 rounded-lg border border-success/30 bg-success/5 shadow-sm">
        <span class="text-xs text-success block">Terpenuhi (Hired)</span>
        <strong class="text-xl font-bold text-success mt-0.5 block">{{ stats.hired }}</strong>
      </div>
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <UCard>
      <template #header>
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 class="font-semibold text-highlighted">Semua Pengajuan Manpower</h3>
            <p class="mt-0.5 text-xs text-muted">
              Filter dan kelola persetujuan serta status rekrutmen lapangan.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <select v-model="filterStatus" class="rounded-lg border border-default bg-default p-2 text-xs text-highlighted">
              <option value="all">Semua Approval</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select v-model="filterHiringStatus" class="rounded-lg border border-default bg-default p-2 text-xs text-highlighted">
              <option value="all">Semua Status Hiring</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="ongoing">Ongoing</option>
              <option value="hired">Hired</option>
              <option value="canceled">Canceled</option>
              <option value="rejected">Rejected</option>
            </select>
            <select v-model="filterHiringType" class="rounded-lg border border-default bg-default p-2 text-xs text-highlighted">
              <option value="all">Semua Jenis Hiring</option>
              <option value="new_hiring">New Hiring</option>
              <option value="replacement">Replacement</option>
            </select>
            <input
              v-model="search"
              type="search"
              placeholder="Cari posisi, pengaju, PIC..."
              class="w-full sm:w-48 rounded-lg border border-default bg-default p-2 text-xs text-highlighted"
            />
          </div>
        </div>
      </template>

      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="text-left text-muted border-b border-default">
              <th class="p-3">Pengaju</th>
              <th class="p-3">Posisi & Kebutuhan</th>
              <th class="p-3">Jenis & Status</th>
              <th class="p-3">Alur Approval</th>
              <th class="p-3">Status Hiring</th>
              <th class="p-3">PIC Hiring</th>
              <th class="p-3">Target / Selesai</th>
              <th class="p-3 text-right">Aksi</th>
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
                <p class="font-semibold text-highlighted">
                  {{ item.requester?.nama_karyawan || item.requester_nik }}
                </p>
                <p class="text-[11px] text-muted">{{ item.department || '-' }}</p>
              </td>
              <td class="p-3">
                <p class="font-semibold text-highlighted">{{ item.title }}</p>
                <p class="text-[11px] text-muted">
                  Unit: {{ item.unit || '-' }} • <strong>{{ item.quantity }} Orang</strong>
                </p>
                <div v-if="item.status === 'approved'" class="mt-1">
                  <span v-if="item.vacancy" class="text-[10px] text-success font-medium inline-flex items-center gap-1">
                    ✓ Loker Terhubung (#{{ item.vacancy.id }})
                  </span>
                  <span v-else class="text-[10px] text-amber-500 font-medium inline-flex items-center gap-1">
                    ⚠️ Belum ada loker
                  </span>
                </div>
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
                  <span class="text-[11px] text-muted">
                    {{ (item.employment_status || 'PKWT').toUpperCase() }}
                  </span>
                  <span
                    v-if="item.hiring_type === 'replacement' && item.replaced_employee_name"
                    class="text-[11px] text-muted truncate max-w-[140px]"
                    :title="`Menggantikan: ${item.replaced_employee_name}`"
                  >
                    Gantikan: {{ item.replaced_employee_name }}
                  </span>
                </div>
              </td>
              <td class="p-3">
                <UBadge :color="getStatusColor(item.status)" variant="soft" size="xs">
                  {{ getApprovalStepLabel(item) }}
                </UBadge>
                <p v-if="item.requires_gm" class="mt-0.5 text-[10px] text-secondary font-medium">
                  + Review GM
                </p>
              </td>
              <td class="p-3">
                <UBadge :color="getHiringStatusColor(item.hiring_status || 'pending')" variant="solid" size="xs">
                  {{ (item.hiring_status || 'pending').toUpperCase() }}
                </UBadge>
              </td>
              <td class="p-3">
                <span v-if="item.pic_hiring_name" class="font-medium text-highlighted">
                  {{ item.pic_hiring_name }}
                </span>
                <span v-else class="text-muted italic">Belum di-assign</span>
              </td>
              <td class="p-3 text-[11px]">
                <p v-if="item.start_date" class="text-highlighted">
                  Mulai: {{ formatDate(item.start_date) }}
                </p>
                <p v-if="item.finished_date" class="text-success">
                  Selesai: {{ formatDate(item.finished_date) }}
                </p>
                <span v-if="!item.start_date && !item.finished_date" class="text-muted italic">-</span>
              </td>
              <td class="p-3 text-right space-x-1" @click.stop>
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-eye"
                  label="Detail"
                  @click="openDetailDialog(item)"
                />
                <UButton
                  v-if="item.status === 'pending'"
                  size="xs"
                  label="Proses"
                  color="primary"
                  variant="soft"
                  icon="i-lucide-gavel"
                  @click="openDecideDialog(item)"
                />
                <UButton
                  v-else
                  size="xs"
                  label="Kelola"
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-settings-2"
                  @click="openHiringDialog(item)"
                />
              </td>
            </tr>
            <tr v-if="!filteredRecords.length">
              <td colspan="8" class="p-6 text-center text-muted">
                Pengajuan manpower tidak ditemukan.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Detail Dialog -->
    <div
      v-if="detailDialogOpen && selectedRecord"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button type="button" class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" @click="closeDetailDialog"></button>
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
                Pengaju: {{ selectedRecord.requester?.nama_karyawan || selectedRecord.requester_nik }} ({{ selectedRecord.department }} - {{ selectedRecord.unit }})
              </p>
            </div>
            <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-x" @click="closeDetailDialog" />
          </div>
        </template>

        <div class="space-y-4 overflow-y-auto max-h-[70vh] pr-1 text-xs">
          <!-- Stepper Persetujuan -->
          <div class="rounded-lg border border-default p-3 bg-muted/5 space-y-2">
            <p class="font-semibold text-highlighted">Status Persetujuan Bertingkat</p>
            <div class="space-y-2">
              <div class="flex items-center justify-between p-2 rounded bg-default border border-default">
                <div>
                  <p class="font-medium text-highlighted">1. Manager Departemen</p>
                  <p class="text-[11px] text-muted">{{ selectedRecord.manager_name || 'Menunggu penentuan' }}</p>
                </div>
                <UBadge :color="selectedRecord.manager_status === 'approved' ? 'success' : (selectedRecord.manager_status === 'rejected' ? 'danger' : 'warning')" size="xs">
                  {{ (selectedRecord.manager_status || 'pending').toUpperCase() }}
                </UBadge>
              </div>
              <div v-if="selectedRecord.requires_gm" class="flex items-center justify-between p-2 rounded bg-default border border-default">
                <div>
                  <p class="font-medium text-highlighted">2. General Manager (GM)</p>
                  <p class="text-[11px] text-muted">{{ selectedRecord.gm_name || 'Riswan Septiawan (GM)' }}</p>
                </div>
                <UBadge :color="selectedRecord.gm_status === 'approved' ? 'success' : (selectedRecord.gm_status === 'rejected' ? 'danger' : 'neutral')" size="xs">
                  {{ (selectedRecord.gm_status || 'pending').toUpperCase() }}
                </UBadge>
              </div>
              <div class="flex items-center justify-between p-2 rounded bg-default border border-default">
                <div>
                  <p class="font-medium text-highlighted">{{ selectedRecord.requires_gm ? '3. Manager HRBP' : '2. Manager HRBP' }}</p>
                  <p class="text-[11px] text-muted">{{ selectedRecord.hrbp_name || 'Akmal Rahman (HRBP)' }}</p>
                </div>
                <UBadge :color="selectedRecord.hrbp_status === 'approved' ? 'success' : (selectedRecord.hrbp_status === 'rejected' ? 'danger' : 'neutral')" size="xs">
                  {{ (selectedRecord.hrbp_status || 'pending').toUpperCase() }}
                </UBadge>
              </div>
            </div>
          </div>

          <!-- Parameter Informasi -->
          <div class="grid grid-cols-2 gap-3">
            <div class="p-2.5 rounded-lg border border-default bg-default space-y-1">
              <span class="text-muted text-[11px] block">Jenis Kebutuhan:</span>
              <strong class="text-highlighted block">{{ selectedRecord.hiring_type === 'replacement' ? 'Replacement (Penggantian)' : 'New Hiring' }}</strong>
              <div v-if="selectedRecord.hiring_type === 'replacement'" class="text-[11px] text-muted pt-1 border-t border-default">
                Menggantikan: <strong>{{ selectedRecord.replaced_employee_name }}</strong> ({{ selectedRecord.replaced_employee_position }})
              </div>
            </div>
            <div class="p-2.5 rounded-lg border border-default bg-default space-y-1">
              <span class="text-muted text-[11px] block">Status Hubungan Kerja:</span>
              <strong class="text-highlighted block">{{ (selectedRecord.employment_status || 'PKWT').toUpperCase() }}</strong>
              <span class="text-muted text-[11px] block pt-1 border-t border-default">
                Jumlah: <strong class="text-highlighted">{{ selectedRecord.quantity }} Orang</strong>
              </span>
            </div>
          </div>

          <!-- Pelaporan Tim -->
          <div class="p-2.5 rounded-lg border border-default bg-default space-y-2">
            <p class="font-semibold text-highlighted">Struktur Pelaporan & Rekrutmen</p>
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
              <span class="text-muted text-[11px] block mb-1">Subordinate (Bawahan):</span>
              <div class="flex flex-wrap gap-1">
                <span v-for="sub in selectedRecord.subordinates" :key="sub.nik" class="px-2 py-0.5 rounded text-[11px] bg-muted/20 text-highlighted border border-default">
                  {{ sub.nama_karyawan }} ({{ sub.posisi }})
                </span>
              </div>
            </div>
          </div>

          <!-- Deskripsi & Catatan -->
          <div v-if="selectedRecord.description" class="p-2.5 rounded-lg border border-default bg-default space-y-1">
            <span class="text-muted text-[11px] block">Justifikasi Kebutuhan:</span>
            <p class="text-highlighted whitespace-pre-wrap">{{ selectedRecord.description }}</p>
          </div>
          <div v-if="selectedRecord.hrd_notes" class="p-2.5 rounded-lg border border-default bg-default space-y-1">
            <span class="text-muted text-[11px] block">Catatan HRD:</span>
            <p class="text-highlighted whitespace-pre-wrap">{{ selectedRecord.hrd_notes }}</p>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton label="Tutup" color="neutral" variant="ghost" @click="closeDetailDialog" />
            <UButton
              v-if="selectedRecord.status === 'pending'"
              label="Proses Keputusan"
              color="primary"
              @click="closeDetailDialog(); openDecideDialog(selectedRecord)"
            />
            <UButton
              v-else
              label="Kelola Status Operasional"
              color="neutral"
              variant="soft"
              @click="closeDetailDialog(); openHiringDialog(selectedRecord)"
            />
          </div>
        </template>
      </UCard>
    </div>

    <!-- Decide Dialog -->
    <div
      v-if="decideDialogOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button type="button" class="absolute inset-0 bg-slate-950/60" @click="closeDecideDialog"></button>
      <UCard class="relative max-h-[88vh] w-full max-w-lg overflow-hidden">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-highlighted">Proses Keputusan Manpower</p>
              <p class="mt-1 text-xs text-muted">
                Permintaan: {{ decideForm.title }} ({{ decideForm.quantity }} Orang) oleh {{ decideForm.requester_name }}
              </p>
            </div>
            <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-x" @click="closeDecideDialog" />
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="submitDecision">
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Keputusan</label>
            <select v-model="decideForm.status" :class="formControlClass">
              <option value="approved">Setujui (Approved)</option>
              <option value="rejected">Tolak (Rejected)</option>
            </select>
          </div>

          <div v-if="decideForm.status === 'approved'" class="space-y-3 border border-default rounded-lg p-3 bg-muted/5">
            <div>
              <label class="mb-1 block text-xs font-semibold text-highlighted">Link Lowongan Kerja</label>
              <select v-model="decideForm.vacancy_link_mode" :class="formControlClass">
                <option value="new">Buat lowongan baru otomatis</option>
                <option value="existing">Hubungkan ke lowongan yang sudah ada</option>
                <option value="none">Setujui saja (belum dibuatkan lowongan)</option>
              </select>
            </div>
            <div v-if="decideForm.vacancy_link_mode === 'existing'">
              <label class="mb-1 block text-xs font-medium text-muted">Pilih Lowongan Aktif</label>
              <select v-model="decideForm.vacancy_id" required :class="formControlClass">
                <option value="">Pilih lowongan...</option>
                <option v-for="v in vacancies" :key="v.id" :value="v.id">
                  {{ v.title }} ({{ v.department || 'Tanpa Divisi' }})
                </option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-muted">Tugaskan PIC Recruiter (Opsional)</label>
              <select v-model="decideForm.pic_hiring_nik" :class="formControlClass">
                <option value="">-- Belum Ditugaskan --</option>
                <option v-for="r in recruiters" :key="r.nik" :value="r.nik">
                  {{ r.nama_karyawan }} ({{ r.posisi_title || 'HR' }})
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Catatan Keputusan / HRD Notes</label>
            <textarea
              v-model="decideForm.hrd_notes"
              rows="3"
              placeholder="Tuliskan catatan dari HRD (wajib diisi jika ditolak)"
              :required="decideForm.status === 'rejected'"
              :class="formControlClass"
            ></textarea>
          </div>

          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton type="button" label="Batal" color="neutral" variant="ghost" @click="closeDecideDialog" />
            <UButton type="submit" label="Simpan Keputusan" :loading="isSubmitting" />
          </div>
        </form>
      </UCard>
    </div>

    <!-- Manage Hiring Dialog -->
    <div
      v-if="hiringDialogOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button type="button" class="absolute inset-0 bg-slate-950/60" @click="closeHiringDialog"></button>
      <UCard class="relative max-h-[88vh] w-full max-w-lg overflow-hidden">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-highlighted">Kelola Operasional Rekrutmen</p>
              <p class="mt-1 text-xs text-muted">Posisi: {{ hiringForm.title }}</p>
            </div>
            <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-x" @click="closeHiringDialog" />
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="submitHiringUpdate">
          <div>
            <label class="mb-1 block text-xs font-medium text-muted">Status Operasional Hiring</label>
            <select v-model="hiringForm.hiring_status" required :class="formControlClass">
              <option value="accepted">Accepted (Pengajuan Diterima)</option>
              <option value="ongoing">Ongoing (Proses Sourcing & Interview)</option>
              <option value="hired">Hired (Kandidat Terpilih & Terpenuhi)</option>
              <option value="canceled">Canceled (Dibatalkan)</option>
              <option value="rejected">Rejected (Ditolak)</option>
            </select>
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-muted">PIC Hiring (Recruiter Ditugaskan)</label>
            <select v-model="hiringForm.pic_hiring_nik" :class="formControlClass">
              <option value="">-- Pilih PIC Recruiter --</option>
              <option v-for="r in recruiters" :key="r.nik" :value="r.nik">
                {{ r.nama_karyawan }} ({{ r.posisi_title || 'HR' }})
              </option>
            </select>
          </div>

          <!-- Integrasi Lowongan Kerja -->
          <div class="rounded-lg border border-default p-3 bg-muted/5 space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold text-highlighted">Status Lowongan Kerja (Job Vacancy)</label>
              <UBadge v-if="hiringForm.vacancy" color="success" variant="soft" size="xs">
                Terhubung: #{{ hiringForm.vacancy.id }}
              </UBadge>
              <UBadge v-else color="warning" variant="soft" size="xs">
                Belum Terhubung
              </UBadge>
            </div>

            <div v-if="hiringForm.vacancy" class="text-xs text-muted flex flex-wrap items-center justify-between gap-2 pt-1">
              <span>Lowongan: <strong class="text-highlighted">{{ hiringForm.vacancy.title }}</strong> ({{ (hiringForm.vacancy.status || 'open').toUpperCase() }})</span>
              <div class="flex gap-2">
                <RouterLink
                  to="/hr/recruitment/vacancies"
                  class="text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  Daftar Lowongan &rarr;
                </RouterLink>
                <RouterLink
                  :to="`/hr/recruitment/candidates?vacancy_id=${hiringForm.vacancy.id}`"
                  class="text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  Pipeline Pelamar &rarr;
                </RouterLink>
              </div>
            </div>

            <div v-else class="space-y-2 pt-1">
              <p class="text-[11px] text-muted">
                Pengajuan ini sudah disetujui, namun belum terhubung ke lowongan kerja. Hubungkan agar calon kandidat bisa mendaftar atau dimasukkan ke pipeline:
              </p>
              <div>
                <select v-model="hiringForm.vacancy_link_mode" :class="formControlClass">
                  <option value="none">Belum dihubungkan sekarang</option>
                  <option value="new">Buat Lowongan Baru Otomatis (Status: Open)</option>
                  <option value="existing">Hubungkan ke Lowongan Aktif yang Ada</option>
                </select>
              </div>
              <div v-if="hiringForm.vacancy_link_mode === 'existing'">
                <label class="mb-1 block text-xs font-medium text-muted">Pilih Lowongan Aktif</label>
                <select v-model="hiringForm.vacancy_id" required :class="formControlClass">
                  <option value="">Pilih lowongan...</option>
                  <option v-for="v in vacancies" :key="v.id" :value="v.id">
                    {{ v.title }} ({{ v.department || 'Tanpa Divisi' }})
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-xs font-medium text-muted">Target Mulai (Start Date)</label>
              <input v-model="hiringForm.start_date" type="date" :class="formControlClass" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-muted">Tanggal Selesai (Finished Date)</label>
              <input v-model="hiringForm.finished_date" type="date" :class="formControlClass" />
            </div>
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-muted">Catatan Perkembangan / HRD Notes</label>
            <textarea
              v-model="hiringForm.hrd_notes"
              rows="3"
              placeholder="Catatan progres kandidat atau kendala rekrutmen..."
              :class="formControlClass"
            ></textarea>
          </div>

          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton type="button" label="Batal" color="neutral" variant="ghost" @click="closeHiringDialog" />
            <UButton type="submit" label="Simpan Perubahan" :loading="isSubmitting" />
          </div>
        </form>
      </UCard>
    </div>
  </section>
</template>
