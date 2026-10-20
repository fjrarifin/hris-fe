<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  assignStaffKpiTemplate,
  createStaffKpiTemplate,
  decideStaffKpiTemplate,
  deleteStaffKpiTemplate,
  getStaffKpiSubordinates,
  getStaffKpiTemplateOptions,
  getStaffKpiTemplates,
  submitStaffKpiTemplate,
  unassignStaffKpiTemplate,
  updateStaffKpiTemplate,
} from '../services/staffService'
import { askConfirmation } from '../utils/confirmDialog'
import { apiError } from '../utils/formatters'

const activeTab = ref('my-templates')
const myTemplates = ref([])
const pendingApprovals = ref([])
const approvedTeamTemplates = ref([])
const subordinates = ref([])
const options = ref({ jabatans: [], periods: [], satuan_options: [] })

const loading = ref(false)
const message = ref('')
const errorMessage = ref('')

// Builder Modal State
const builderModal = reactive({
  open: false,
  editingId: null,
  form: {
    nama_template: '',
    deskripsi: '',
    master_jabatan_id: '',
    departemen: '',
    items: [],
  },
})

// Detail Modal State
const detailModal = reactive({
  open: false,
  template: null,
})

// Decision / Approval Modal State
const decisionModal = reactive({
  open: false,
  template: null,
  decision: 'approved',
  notes: '',
  reason: '',
  submitting: false,
})

// Assign Modal State
const assignModal = reactive({
  open: false,
  template: null,
  selectedNiks: [],
  periodId: '',
  weightPercentage: 100,
  notes: '',
  submitting: false,
})

const totalBuilderBobot = computed(() => {
  return builderModal.form.items.reduce((sum, item) => sum + Number(item.bobot || 0), 0)
})

const isBobotValid = computed(() => Math.abs(totalBuilderBobot.value - 100) < 0.001)

function statusBadge(status) {
  switch (status) {
    case 'approved':
      return { label: 'Disetujui', color: 'success', variant: 'subtle' }
    case 'waiting_supervisor':
      return { label: 'Menunggu Atasan', color: 'warning', variant: 'subtle' }
    case 'waiting_hrd':
      return { label: 'Menunggu HRD', color: 'info', variant: 'subtle' }
    case 'rejected':
      return { label: 'Ditolak / Revisi', color: 'error', variant: 'subtle' }
    default:
      return { label: 'Draft', color: 'neutral', variant: 'subtle' }
  }
}

async function loadData() {
  loading.value = true
  try {
    const [templatesRes, optionsRes, subRes] = await Promise.all([
      getStaffKpiTemplates(),
      getStaffKpiTemplateOptions(),
      getStaffKpiSubordinates(),
    ])
    myTemplates.value = templatesRes.data.my_templates || []
    pendingApprovals.value = templatesRes.data.pending_approvals || []
    approvedTeamTemplates.value = templatesRes.data.approved_team_templates || []
    options.value = optionsRes.data
    subordinates.value = subRes.data || []
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal memuat data KPI template.')
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  builderModal.editingId = null
  builderModal.form = {
    nama_template: '',
    deskripsi: '',
    master_jabatan_id: '',
    departemen: '',
    items: [
      {
        nama_kpi: '',
        deskripsi: '',
        target: '',
        satuan: 'persen',
        bobot: 100,
        formula_penilaian: '',
      },
    ],
  }
  builderModal.open = true
}

function openEditModal(template) {
  builderModal.editingId = template.id
  builderModal.form = {
    nama_template: template.nama_template,
    deskripsi: template.deskripsi || '',
    master_jabatan_id: template.master_jabatan_id || '',
    departemen: template.departemen || '',
    items: (template.items || []).map((item) => ({
      nama_kpi: item.nama_kpi,
      deskripsi: item.deskripsi || '',
      target: item.target,
      satuan: item.satuan,
      bobot: Number(item.bobot),
      formula_penilaian: item.formula_penilaian || '',
    })),
  }
  builderModal.open = true
}

function closeBuilderModal() {
  builderModal.open = false
}

function addItemRow() {
  builderModal.form.items.push({
    nama_kpi: '',
    deskripsi: '',
    target: '',
    satuan: 'persen',
    bobot: 0,
    formula_penilaian: '',
  })
}

function removeItemRow(index) {
  if (builderModal.form.items.length <= 1) return
  builderModal.form.items.splice(index, 1)
}

async function saveTemplate() {
  if (!builderModal.form.items.length) {
    errorMessage.value = 'Harus ada minimal 1 butir KPI.'
    return
  }

  try {
    const payload = {
      nama_template: builderModal.form.nama_template,
      deskripsi: builderModal.form.deskripsi,
      master_jabatan_id: builderModal.form.master_jabatan_id || null,
      departemen: builderModal.form.departemen,
      items: builderModal.form.items.map((i) => ({
        nama_kpi: i.nama_kpi,
        deskripsi: i.deskripsi,
        target: i.target,
        satuan: i.satuan,
        bobot: Number(i.bobot),
        formula_penilaian: i.formula_penilaian,
      })),
    }

    if (builderModal.editingId) {
      const res = await updateStaffKpiTemplate(builderModal.editingId, payload)
      message.value = res.data.message
    } else {
      const res = await createStaffKpiTemplate(payload)
      message.value = res.data.message
    }
    closeBuilderModal()
    await loadData()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal menyimpan template KPI.')
  }
}

async function deleteTemplate(template) {
  if (
    !(await askConfirmation({
      title: 'Hapus Template KPI',
      message: `Hapus template "${template.nama_template}"?`,
      confirmLabel: 'Hapus',
      color: 'error',
    }))
  )
    return

  try {
    const res = await deleteStaffKpiTemplate(template.id)
    message.value = res.data.message
    await loadData()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal menghapus template KPI.')
  }
}

async function submitTemplate(template) {
  if (
    !(await askConfirmation({
      title: 'Kirim Template untuk Persetujuan',
      message: `Kirim template "${template.nama_template}" ke Atasan Langsung untuk disetujui?`,
      confirmLabel: 'Kirim',
      color: 'primary',
    }))
  )
    return

  try {
    const res = await submitStaffKpiTemplate(template.id)
    message.value = res.data.message
    await loadData()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengirim template KPI.')
  }
}

function openDetailModal(template) {
  detailModal.template = template
  detailModal.open = true
}

function openDecisionModal(template) {
  decisionModal.template = template
  decisionModal.decision = 'approved'
  decisionModal.notes = ''
  decisionModal.reason = ''
  decisionModal.open = true
}

async function submitDecision() {
  decisionModal.submitting = true
  try {
    const res = await decideStaffKpiTemplate(decisionModal.template.id, {
      decision: decisionModal.decision,
      notes: decisionModal.notes,
      reason: decisionModal.reason,
    })
    message.value = res.data.message
    decisionModal.open = false
    await loadData()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal memproses persetujuan template.')
  } finally {
    decisionModal.submitting = false
  }
}

function openAssignModal(template) {
  assignModal.template = template
  assignModal.selectedNiks = []
  assignModal.periodId = options.value.periods[0]?.id || ''
  assignModal.weightPercentage = 100
  assignModal.notes = ''
  assignModal.open = true
}

function toggleSelectAllSubordinates() {
  if (assignModal.selectedNiks.length === subordinates.value.length) {
    assignModal.selectedNiks = []
  } else {
    assignModal.selectedNiks = subordinates.value.map((s) => s.nik)
  }
}

async function submitAssign() {
  if (!assignModal.selectedNiks.length) {
    errorMessage.value = 'Pilih minimal satu karyawan bawahan.'
    return
  }

  assignModal.submitting = true
  try {
    const res = await assignStaffKpiTemplate(assignModal.template.id, {
      employee_niks: assignModal.selectedNiks,
      performance_period_id: assignModal.periodId || null,
      weight_percentage: assignModal.weightPercentage,
      notes: assignModal.notes,
    })
    message.value = res.data.message
    assignModal.open = false
    await loadData()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal menugaskan template KPI ke tim.')
  } finally {
    assignModal.submitting = false
  }
}

async function unassign(assignment) {
  if (
    !(await askConfirmation({
      title: 'Batalkan Penugasan KPI',
      message: `Hapus penugasan KPI untuk karyawan ini?`,
      confirmLabel: 'Hapus Penugasan',
      color: 'error',
    }))
  )
    return

  try {
    const res = await unassignStaffKpiTemplate(assignment.id)
    message.value = res.data.message
    await loadData()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal membatalkan penugasan.')
  }
}

onMounted(loadData)
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-2xl font-semibold text-highlighted">Template & Penugasan KPI Tim</h2>
        <p class="mt-1 text-sm text-muted">
          Penyusunan indikator target kinerja, persetujuan atasan langsung & HRD, serta penugasan ke bawahan.
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        label="Buat Template KPI Baru"
        color="primary"
        @click="openCreateModal"
      />
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <!-- Summary Stats -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="rounded-xl border border-default bg-default p-4 shadow-sm">
        <p class="text-xs font-medium text-muted uppercase">Template Saya</p>
        <p class="mt-2 text-2xl font-bold text-highlighted">{{ myTemplates.length }}</p>
        <p class="mt-1 text-xs text-muted">Dibuat oleh Anda</p>
      </div>
      <div class="rounded-xl border border-default bg-default p-4 shadow-sm">
        <p class="text-xs font-medium text-muted uppercase">Persetujuan Masuk (Atasan)</p>
        <p class="mt-2 text-2xl font-bold text-amber-500">{{ pendingApprovals.length }}</p>
        <p class="mt-1 text-xs text-muted">Menunggu review Anda sebagai atasan langsung</p>
      </div>
      <div class="rounded-xl border border-default bg-default p-4 shadow-sm">
        <p class="text-xs font-medium text-muted uppercase">Template Siap Ditugaskan</p>
        <p class="mt-2 text-2xl font-bold text-emerald-500">{{ approvedTeamTemplates.length }}</p>
        <p class="mt-1 text-xs text-muted">Status Approved (Disetujui HRD)</p>
      </div>
    </div>

    <!-- Tab Bar -->
    <div class="flex border-b border-default">
      <button
        type="button"
        class="border-b-2 px-4 py-2.5 text-sm font-medium transition-colors"
        :class="
          activeTab === 'my-templates'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted hover:text-highlighted'
        "
        @click="activeTab = 'my-templates'"
      >
        Template KPI Saya ({{ myTemplates.length }})
      </button>
      <button
        type="button"
        class="border-b-2 px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-1.5"
        :class="
          activeTab === 'pending-approvals'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted hover:text-highlighted'
        "
        @click="activeTab = 'pending-approvals'"
      >
        Persetujuan Atasan
        <span
          v-if="pendingApprovals.length"
          class="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-500"
        >
          {{ pendingApprovals.length }}
        </span>
      </button>
      <button
        type="button"
        class="border-b-2 px-4 py-2.5 text-sm font-medium transition-colors"
        :class="
          activeTab === 'team-assignment'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted hover:text-highlighted'
        "
        @click="activeTab = 'team-assignment'"
      >
        Penugasan KPI ke Tim
      </button>
    </div>

    <!-- TAB 1: Template KPI Saya -->
    <div v-if="activeTab === 'my-templates'" class="space-y-4">
      <div
        v-for="tpl in myTemplates"
        :key="tpl.id"
        class="rounded-xl border border-default bg-default p-5 shadow-sm transition hover:border-slate-300"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-base font-semibold text-highlighted">{{ tpl.nama_template }}</h3>
              <UBadge
                :label="statusBadge(tpl.status).label"
                :color="statusBadge(tpl.status).color"
                :variant="statusBadge(tpl.status).variant"
              />
              <UBadge
                v-if="tpl.jabatan"
                :label="tpl.jabatan.nama_jabatan"
                color="neutral"
                variant="subtle"
              />
            </div>
            <p v-if="tpl.deskripsi" class="text-sm text-muted">{{ tpl.deskripsi }}</p>
            <div class="flex flex-wrap items-center gap-4 text-xs text-muted pt-1">
              <span>{{ tpl.items?.length || 0 }} Butir KPI</span>
              <span>Total Bobot: <strong class="text-highlighted">{{ tpl.total_bobot }}%</strong></span>
              <span>Departemen: {{ tpl.departemen || '-' }}</span>
              <span v-if="tpl.assignments_count > 0" class="text-emerald-600 font-medium">
                Ditugaskan ke {{ tpl.assignments_count }} Karyawan
              </span>
            </div>
            <!-- Alert notes if rejected -->
            <div
              v-if="tpl.status === 'rejected' && tpl.reject_reason"
              class="mt-2 rounded-lg bg-rose-500/10 p-3 text-xs text-rose-600 border border-rose-500/20"
            >
              <strong>Catatan Penolakan:</strong> {{ tpl.reject_reason }}
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-wrap items-center gap-2">
            <UButton
              size="xs"
              variant="outline"
              label="Detail Butir"
              icon="i-lucide-eye"
              @click="openDetailModal(tpl)"
            />
            <UButton
              v-if="tpl.status === 'approved'"
              size="xs"
              color="primary"
              label="Tugaskan ke Tim"
              icon="i-lucide-user-plus"
              @click="openAssignModal(tpl)"
            />
            <UButton
              v-if="['draft', 'rejected'].includes(tpl.status)"
              size="xs"
              color="emerald"
              label="Kirim Persetujuan"
              icon="i-lucide-send"
              @click="submitTemplate(tpl)"
            />
            <UButton
              v-if="['draft', 'rejected'].includes(tpl.status)"
              size="xs"
              variant="soft"
              label="Ubah"
              icon="i-lucide-edit-3"
              @click="openEditModal(tpl)"
            />
            <UButton
              v-if="['draft', 'rejected'].includes(tpl.status)"
              size="xs"
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              @click="deleteTemplate(tpl)"
            />
          </div>
        </div>
      </div>

      <div
        v-if="!myTemplates.length && !loading"
        class="rounded-xl border border-dashed border-default p-8 text-center text-sm text-muted"
      >
        <p>Anda belum membuat template KPI.</p>
        <UButton
          class="mt-3"
          size="sm"
          color="primary"
          label="Mulai Buat Template KPI"
          @click="openCreateModal"
        />
      </div>
    </div>

    <!-- TAB 2: Persetujuan Atasan Langsung -->
    <div v-if="activeTab === 'pending-approvals'" class="space-y-4">
      <div
        v-for="tpl in pendingApprovals"
        :key="tpl.id"
        class="rounded-xl border border-default bg-default p-5 shadow-sm"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <h3 class="text-base font-semibold text-highlighted">{{ tpl.nama_template }}</h3>
              <UBadge label="Menunggu Persetujuan Anda" color="warning" variant="subtle" />
            </div>
            <p class="text-sm text-muted">
              Diajukan oleh:
              <strong class="text-highlighted">{{ tpl.creator_employee?.nama_karyawan || tpl.creator?.name || 'Staff' }}</strong>
              ({{ tpl.creator_employee?.jabatan || '-' }})
            </p>
            <p v-if="tpl.deskripsi" class="text-xs text-muted">{{ tpl.deskripsi }}</p>
            <div class="flex items-center gap-4 text-xs text-muted pt-1">
              <span>{{ tpl.items?.length || 0 }} Butir KPI</span>
              <span>Total Bobot: <strong>{{ tpl.total_bobot }}%</strong></span>
            </div>
          </div>
          <UButton
            color="primary"
            size="sm"
            label="Review & Putuskan"
            icon="i-lucide-check-circle"
            @click="openDecisionModal(tpl)"
          />
        </div>
      </div>

      <div
        v-if="!pendingApprovals.length && !loading"
        class="rounded-xl border border-dashed border-default p-8 text-center text-sm text-muted"
      >
        Tidak ada pengajuan template KPI yang menunggu persetujuan Anda saat ini.
      </div>
    </div>

    <!-- TAB 3: Penugasan KPI ke Tim -->
    <div v-if="activeTab === 'team-assignment'" class="space-y-6">
      <UCard title="Daftar Template Siap Ditugaskan (Disetujui HRD)">
        <div v-if="approvedTeamTemplates.length" class="divide-y divide-default">
          <div
            v-for="tpl in approvedTeamTemplates"
            :key="tpl.id"
            class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p class="font-medium text-highlighted">{{ tpl.nama_template }}</p>
              <p class="text-xs text-muted">
                {{ tpl.items?.length || 0 }} butir KPI · Total Bobot: {{ tpl.total_bobot }}% ·
                Ditugaskan ke: <span class="font-semibold text-highlighted">{{ tpl.assignments_count || 0 }} Karyawan</span>
              </p>
            </div>
            <div class="flex items-center gap-2">
              <UButton
                size="xs"
                variant="outline"
                label="Lihat Butir"
                @click="openDetailModal(tpl)"
              />
              <UButton
                size="xs"
                color="primary"
                label="Tugaskan ke Tim"
                icon="i-lucide-user-plus"
                @click="openAssignModal(tpl)"
              />
            </div>
          </div>
        </div>
        <p v-else class="py-6 text-center text-sm text-muted">
          Belum ada template KPI Anda yang berstatus Disetujui (Approved).
        </p>
      </UCard>
    </div>

    <!-- MODAL 1: Template Builder Modal -->
    <div
      v-if="builderModal.open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 overflow-y-auto"
    >
      <div class="relative w-full max-w-4xl rounded-2xl border border-default bg-default p-6 shadow-2xl my-8">
        <div class="flex items-center justify-between pb-4 border-b border-default">
          <div>
            <h3 class="text-lg font-semibold text-highlighted">
              {{ builderModal.editingId ? 'Ubah Template KPI' : 'Buat Template KPI Baru' }}
            </h3>
            <p class="text-xs text-muted">Tentukan indikator, target, satuan, dan bobot untuk template ini.</p>
          </div>
          <UButton color="neutral" variant="ghost" icon="i-lucide-x" @click="closeBuilderModal" />
        </div>

        <form class="mt-4 space-y-4" @submit.prevent="saveTemplate">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Nama Template <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="builderModal.form.nama_template"
                required
                type="text"
                placeholder="misal: KPI Staf Barista Outlet"
                class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">Jabatan Sasaran (Opsional)</label>
              <select
                v-model="builderModal.form.master_jabatan_id"
                class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Umum / Tanpa Jabatan Spesifik</option>
                <option v-for="j in options.jabatans" :key="j.id" :value="j.id">
                  {{ j.nama_jabatan }} ({{ j.departemen || '-' }})
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">Deskripsi Template</label>
            <textarea
              v-model="builderModal.form.deskripsi"
              rows="2"
              placeholder="Jelaskan tujuan dan kriteria umum template ini..."
              class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            ></textarea>
          </div>

          <!-- KPI Items Dynamic List -->
          <div class="pt-2">
            <div class="flex items-center justify-between pb-2">
              <div class="flex items-center gap-2">
                <h4 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Poin-Poin KPI</h4>
                <span
                  class="rounded-full px-2.5 py-0.5 text-xs font-bold"
                  :class="
                    isBobotValid
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                  "
                >
                  Total Bobot: {{ totalBuilderBobot }}% {{ isBobotValid ? '(Pas 100%)' : '(Wajib 100%)' }}
                </span>
              </div>
              <UButton
                size="xs"
                variant="soft"
                icon="i-lucide-plus"
                label="Tambah Poin KPI"
                @click="addItemRow"
              />
            </div>

            <div class="space-y-3 max-h-80 overflow-y-auto pr-1">
              <div
                v-for="(item, idx) in builderModal.form.items"
                :key="idx"
                class="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/80 p-4 space-y-3 shadow-xs"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span class="inline-block size-2 rounded-full bg-primary-500"></span>
                    Poin KPI #{{ idx + 1 }}
                  </span>
                  <button
                    v-if="builderModal.form.items.length > 1"
                    type="button"
                    class="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline"
                    @click="removeItemRow(idx)"
                  >
                    Hapus Poin
                  </button>
                </div>
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div class="sm:col-span-2">
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Nama Indikator KPI <span class="text-rose-500">*</span>
                    </label>
                    <input
                      v-model="item.nama_kpi"
                      required
                      type="text"
                      placeholder="misal: Akurasi Stock Opname"
                      class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Target <span class="text-rose-500">*</span>
                    </label>
                    <input
                      v-model="item.target"
                      required
                      type="text"
                      placeholder="misal: 100"
                      class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Satuan <span class="text-rose-500">*</span>
                    </label>
                    <select
                      v-model="item.satuan"
                      required
                      class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    >
                      <option
                        v-for="opt in options.satuan_options"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </option>
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Bobot (%) <span class="text-rose-500">*</span>
                    </label>
                    <input
                      v-model.number="item.bobot"
                      required
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="100"
                      class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div class="sm:col-span-3">
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">Formula / Keterangan Penilaian</label>
                    <input
                      v-model="item.formula_penilaian"
                      type="text"
                      placeholder="misal: (aktual / target) x 100"
                      class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-default">
            <UButton variant="ghost" label="Batal" @click="closeBuilderModal" />
            <UButton
              type="submit"
              color="primary"
              :label="builderModal.editingId ? 'Simpan Perubahan' : 'Simpan sebagai Draft'"
            />
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 2: Detail Modal -->
    <div
      v-if="detailModal.open && detailModal.template"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 overflow-y-auto"
    >
      <div class="relative w-full max-w-3xl rounded-2xl border border-default bg-default p-6 shadow-2xl">
        <div class="flex items-start justify-between pb-4 border-b border-default">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-semibold text-highlighted">{{ detailModal.template.nama_template }}</h3>
              <UBadge
                :label="statusBadge(detailModal.template.status).label"
                :color="statusBadge(detailModal.template.status).color"
              />
            </div>
            <p v-if="detailModal.template.deskripsi" class="mt-1 text-sm text-muted">
              {{ detailModal.template.deskripsi }}
            </p>
          </div>
          <UButton color="neutral" variant="ghost" icon="i-lucide-x" @click="detailModal.open = false" />
        </div>

        <div class="mt-4 space-y-4">
          <h4 class="text-sm font-semibold text-highlighted">Daftar Poin KPI</h4>
          <div class="overflow-x-auto rounded-xl border border-default">
            <table class="w-full text-left text-sm">
              <thead class="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-muted uppercase">
                <tr>
                  <th class="p-3">Indikator</th>
                  <th class="p-3">Target</th>
                  <th class="p-3">Bobot</th>
                  <th class="p-3">Formula</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default">
                <tr v-for="it in detailModal.template.items" :key="it.id">
                  <td class="p-3 font-medium text-highlighted">
                    {{ it.nama_kpi }}
                    <p v-if="it.deskripsi" class="text-xs text-muted">{{ it.deskripsi }}</p>
                  </td>
                  <td class="p-3 text-muted">{{ it.target }} {{ it.satuan }}</td>
                  <td class="p-3 font-semibold text-highlighted">{{ it.bobot }}%</td>
                  <td class="p-3 text-xs text-muted">{{ it.formula_penilaian || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <UButton label="Tutup" @click="detailModal.open = false" />
        </div>
      </div>
    </div>

    <!-- MODAL 3: Atasan Langsung Decision Modal -->
    <div
      v-if="decisionModal.open && decisionModal.template"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 overflow-y-auto"
    >
      <div class="relative w-full max-w-2xl rounded-2xl border border-default bg-default p-6 shadow-2xl">
        <h3 class="text-lg font-semibold text-highlighted">Persetujuan Atasan Langsung</h3>
        <p class="text-xs text-muted mt-1">
          Review template KPI yang diajukan oleh
          <strong>{{ decisionModal.template.creator_employee?.nama_karyawan || 'Bawahan' }}</strong>
        </p>

        <div class="mt-4 space-y-3 rounded-xl border border-slate-200 dark:border-slate-700/80 p-4 bg-slate-50 dark:bg-slate-800/80">
          <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ decisionModal.template.nama_template }}</p>
          <div class="text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <p>Total Butir: <span class="font-medium text-slate-900 dark:text-slate-100">{{ decisionModal.template.items?.length || 0 }} item</span></p>
            <p>Total Bobot: <span class="font-bold text-emerald-600 dark:text-emerald-400">{{ decisionModal.template.total_bobot }}%</span></p>
          </div>
        </div>

        <div class="mt-4 space-y-3">
          <div>
            <label class="block text-xs font-medium text-muted mb-1">Keputusan Anda *</label>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                class="rounded-xl border p-3 text-center text-sm font-semibold transition"
                :class="
                  decisionModal.decision === 'approved'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                    : 'border-default text-muted hover:border-slate-300'
                "
                @click="decisionModal.decision = 'approved'"
              >
                Setujui & Teruskan ke HRD
              </button>
              <button
                type="button"
                class="rounded-xl border p-3 text-center text-sm font-semibold transition"
                :class="
                  decisionModal.decision === 'rejected'
                    ? 'border-rose-500 bg-rose-500/10 text-rose-600'
                    : 'border-default text-muted hover:border-slate-300'
                "
                @click="decisionModal.decision = 'rejected'"
              >
                Tolak & Minta Revisi
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-muted mb-1">
              {{ decisionModal.decision === 'rejected' ? 'Alasan Penolakan (Wajib) *' : 'Catatan Tambahan (Opsional)' }}
            </label>
            <textarea
              v-model="decisionModal.notes"
              rows="3"
              :placeholder="
                decisionModal.decision === 'rejected'
                  ? 'Tuliskan butir KPI yang perlu diperbaiki oleh bawahan...'
                  : 'Catatan persetujuan untuk HRD...'
              "
              class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm"
            ></textarea>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <UButton variant="ghost" label="Batal" @click="decisionModal.open = false" />
          <UButton
            :color="decisionModal.decision === 'approved' ? 'primary' : 'error'"
            :loading="decisionModal.submitting"
            :label="decisionModal.decision === 'approved' ? 'Kirim Persetujuan' : 'Kirim Penolakan'"
            @click="submitDecision"
          />
        </div>
      </div>
    </div>

    <!-- MODAL 4: Assign to Subordinates Modal -->
    <div
      v-if="assignModal.open && assignModal.template"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 overflow-y-auto"
    >
      <div class="relative w-full max-w-2xl rounded-2xl border border-default bg-default p-6 shadow-2xl">
        <div class="flex items-center justify-between pb-3 border-b border-default">
          <div>
            <h3 class="text-lg font-semibold text-highlighted">Tugaskan Template KPI ke Tim</h3>
            <p class="text-xs text-muted">{{ assignModal.template.nama_template }}</p>
          </div>
          <UButton color="neutral" variant="ghost" icon="i-lucide-x" @click="assignModal.open = false" />
        </div>

        <div class="mt-4 space-y-4">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-medium text-muted mb-1">Periode Kinerja (Opsional)</label>
              <select
                v-model="assignModal.periodId"
                class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm"
              >
                <option value="">Semua / Berjalan Terus</option>
                <option v-for="p in options.periods" :key="p.id" :value="p.id">
                  {{ p.nama_periode }} ({{ p.status }})
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-muted mb-1">Porsi Bobot Template (%)</label>
              <input
                v-model.number="assignModal.weightPercentage"
                type="number"
                min="1"
                max="100"
                class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm"
              />
              <span class="text-[11px] text-muted">100% jika ini template utama karyawan.</span>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between pb-2">
              <label class="text-xs font-medium text-muted">Pilih Karyawan Tim Bawahannya *</label>
              <button
                type="button"
                class="text-xs text-primary hover:underline font-medium"
                @click="toggleSelectAllSubordinates"
              >
                {{ assignModal.selectedNiks.length === subordinates.length ? 'Batal Pilih Semua' : 'Pilih Semua' }}
              </button>
            </div>
            <div class="max-h-60 overflow-y-auto rounded-xl border border-default divide-y divide-default p-2">
              <label
                v-for="sub in subordinates"
                :key="sub.nik"
                class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer"
              >
                <input
                  v-model="assignModal.selectedNiks"
                  type="checkbox"
                  :value="sub.nik"
                  class="rounded border-default text-primary"
                />
                <div>
                  <p class="text-sm font-medium text-highlighted">{{ sub.nama_karyawan }}</p>
                  <p class="text-xs text-muted">{{ sub.nik }} · {{ sub.jabatan }} · {{ sub.departement || '-' }}</p>
                </div>
              </label>
              <p v-if="!subordinates.length" class="py-4 text-center text-xs text-muted">
                Tidak ada data bawahan langsung yang ditemukan.
              </p>
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <UButton variant="ghost" label="Batal" @click="assignModal.open = false" />
          <UButton
            color="primary"
            :loading="assignModal.submitting"
            label="Simpan Penugasan"
            @click="submitAssign"
          />
        </div>
      </div>
    </div>
  </section>
</template>
