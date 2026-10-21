<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  createHrKpi,
  decideHrKpiTemplate,
  deleteHrKpi,
  getHrKpiAssignments,
  getHrKpis,
  getHrTalentOptions,
  updateHrKpi,
} from '../services/hrService'
import { askConfirmation } from '../utils/confirmDialog'
import { apiError } from '../utils/formatters'

const activeTab = ref('waiting-hr')
const records = ref([])
const assignments = ref([])
const options = ref({ jabatans: [] })
const search = ref('')
const selectedJabatan = ref('')

const message = ref('')
const errorMessage = ref('')
const loading = ref(false)

// Builder modal state
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

// Detail modal state
const detailModal = reactive({
  open: false,
  template: null,
})

// Decision modal state
const decisionModal = reactive({
  open: false,
  template: null,
  decision: 'approved',
  notes: '',
  reason: '',
  submitting: false,
})

const satuanOptions = [
  { value: 'persen', label: 'Persen (%)' },
  { value: 'jumlah', label: 'Jumlah (Qty)' },
  { value: 'hari', label: 'Hari' },
  { value: 'rupiah', label: 'Rupiah (Rp)' },
  { value: 'skor', label: 'Skor / Nilai' },
  { value: 'dokumen', label: 'Dokumen / Laporan' },
  { value: 'poin', label: 'Poin' },
]

const totalBuilderBobot = computed(() =>
  builderModal.form.items.reduce((sum, item) => sum + Number(item.bobot || 0), 0),
)

const isBobotValid = computed(() => Math.abs(totalBuilderBobot.value - 100) < 0.001)

const waitingHrTemplates = computed(() =>
  records.value.filter((item) => item.status === 'waiting_hrd'),
)

const approvedTemplates = computed(() =>
  records.value.filter((item) => item.status === 'approved'),
)

const filteredTemplates = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return records.value.filter((item) => {
    if (selectedJabatan.value && item.master_jabatan_id !== Number(selectedJabatan.value)) {
      return false
    }
    if (!keyword) return true
    return [item.nama_template, item.departemen, item.creator_employee?.nama_karyawan]
      .some((val) => String(val || '').toLowerCase().includes(keyword))
  })
})

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

async function load() {
  loading.value = true
  try {
    const [optRes, kpiRes, assignRes] = await Promise.all([
      getHrTalentOptions(),
      getHrKpis(),
      getHrKpiAssignments(),
    ])
    options.value = optRes.data
    records.value = kpiRes.data || []
    assignments.value = assignRes.data || []
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal memuat data KPI.')
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

function openEditModal(tpl) {
  builderModal.editingId = tpl.id
  builderModal.form = {
    nama_template: tpl.nama_template,
    deskripsi: tpl.deskripsi || '',
    master_jabatan_id: tpl.master_jabatan_id || '',
    departemen: tpl.departemen || '',
    items: (tpl.items || []).map((it) => ({
      nama_kpi: it.nama_kpi,
      deskripsi: it.deskripsi || '',
      target: it.target,
      satuan: it.satuan,
      bobot: Number(it.bobot),
      formula_penilaian: it.formula_penilaian || '',
    })),
  }
  builderModal.open = true
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
    errorMessage.value = 'Minimal harus memiliki 1 butir KPI.'
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
      const res = await updateHrKpi(builderModal.editingId, payload)
      message.value = res.data.message
    } else {
      const res = await createHrKpi(payload)
      message.value = res.data.message
    }

    builderModal.open = false
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal menyimpan template KPI.')
  }
}

async function removeTemplate(tpl) {
  if (
    !(await askConfirmation({
      title: 'Hapus Template KPI',
      message: `Hapus template "${tpl.nama_template}"?`,
      confirmLabel: 'Hapus',
      color: 'error',
    }))
  )
    return

  try {
    const res = await deleteHrKpi(tpl.id)
    message.value = res.data.message
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal menghapus template KPI.')
  }
}

function openDetailModal(tpl) {
  detailModal.template = tpl
  detailModal.open = true
}

function openDecisionModal(tpl) {
  decisionModal.template = tpl
  decisionModal.decision = 'approved'
  decisionModal.notes = ''
  decisionModal.reason = ''
  decisionModal.open = true
}

async function submitDecision() {
  decisionModal.submitting = true
  try {
    const res = await decideHrKpiTemplate(decisionModal.template.id, {
      decision: decisionModal.decision,
      notes: decisionModal.notes,
      reason: decisionModal.reason,
    })
    message.value = res.data.message
    decisionModal.open = false
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal memproses persetujuan template oleh HRD.')
  } finally {
    decisionModal.submitting = false
  }
}

onMounted(load)
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-2xl font-semibold text-highlighted">Manajemen Template KPI</h2>
        <p class="mt-1 text-sm text-muted">
          Persetujuan berjenjang (SPV → Atasan Langsung → HRD), master template, dan distribusi penugasan.
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        label="Buat Template Standar"
        color="primary"
        @click="openCreateModal"
      />
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <!-- Stats Banner -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="rounded-xl border border-default bg-default p-4 shadow-sm">
        <p class="text-xs font-medium text-muted uppercase">Menunggu Verifikasi HRD</p>
        <p class="mt-2 text-2xl font-bold text-amber-500">{{ waitingHrTemplates.length }}</p>
        <p class="mt-1 text-xs text-muted">Telah disetujui atasan langsung</p>
      </div>
      <div class="rounded-xl border border-default bg-default p-4 shadow-sm">
        <p class="text-xs font-medium text-muted uppercase">Template Aktif & Disetujui</p>
        <p class="mt-2 text-2xl font-bold text-emerald-500">{{ approvedTemplates.length }}</p>
        <p class="mt-1 text-xs text-muted">Siap dan dapat ditugaskan ke karyawan</p>
      </div>
      <div class="rounded-xl border border-default bg-default p-4 shadow-sm">
        <p class="text-xs font-medium text-muted uppercase">Total Penugasan Karyawan</p>
        <p class="mt-2 text-2xl font-bold text-primary">{{ assignments.length }}</p>
        <p class="mt-1 text-xs text-muted">Karyawan aktif memegang template KPI</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-default">
      <button
        type="button"
        class="border-b-2 px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-1.5"
        :class="
          activeTab === 'waiting-hr'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted hover:text-highlighted'
        "
        @click="activeTab = 'waiting-hr'"
      >
        Persetujuan HRD
        <span
          v-if="waitingHrTemplates.length"
          class="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-500"
        >
          {{ waitingHrTemplates.length }}
        </span>
      </button>
      <button
        type="button"
        class="border-b-2 px-4 py-2.5 text-sm font-medium transition-colors"
        :class="
          activeTab === 'all-templates'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted hover:text-highlighted'
        "
        @click="activeTab = 'all-templates'"
      >
        Semua Template KPI ({{ records.length }})
      </button>
      <button
        type="button"
        class="border-b-2 px-4 py-2.5 text-sm font-medium transition-colors"
        :class="
          activeTab === 'assignments'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted hover:text-highlighted'
        "
        @click="activeTab = 'assignments'"
      >
        Distribusi Penugasan Karyawan ({{ assignments.length }})
      </button>
    </div>

    <!-- TAB 1: Menunggu Persetujuan HRD -->
    <div v-if="activeTab === 'waiting-hr'" class="space-y-4">
      <div
        v-for="tpl in waitingHrTemplates"
        :key="tpl.id"
        class="rounded-xl border border-default bg-default p-5 shadow-sm"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-base font-semibold text-highlighted">{{ tpl.nama_template }}</h3>
              <UBadge label="Menunggu Approval HRD" color="warning" variant="subtle" />
              <UBadge
                v-if="tpl.jabatan"
                :label="tpl.jabatan.nama_jabatan"
                color="neutral"
                variant="subtle"
              />
            </div>
            <p class="text-sm text-muted">
              Dibuat oleh:
              <strong class="text-highlighted">{{ tpl.creator_employee?.nama_karyawan || 'Supervisor' }}</strong>
              · Disetujui Atasan:
              <strong class="text-highlighted">{{ tpl.supervisor_employee?.nama_karyawan || 'Atasan Langsung' }}</strong>
            </p>
            <p v-if="tpl.supervisor_notes" class="text-xs text-muted italic">
              "{{ tpl.supervisor_notes }}"
            </p>
            <div class="flex items-center gap-4 text-xs text-muted pt-1">
              <span>{{ tpl.items?.length || 0 }} Butir KPI</span>
              <span>Total Bobot: <strong>{{ tpl.total_bobot }}%</strong></span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              size="sm"
              variant="outline"
              label="Lihat Rincian Butir"
              icon="i-lucide-eye"
              @click="openDetailModal(tpl)"
            />
            <UButton
              size="sm"
              color="primary"
              label="Review & Putuskan"
              icon="i-lucide-check-circle"
              @click="openDecisionModal(tpl)"
            />
          </div>
        </div>
      </div>

      <div
        v-if="!waitingHrTemplates.length && !loading"
        class="rounded-xl border border-dashed border-default p-8 text-center text-sm text-muted"
      >
        Tidak ada pengajuan template KPI yang menunggu persetujuan HRD saat ini.
      </div>
    </div>

    <!-- TAB 2: Semua Template KPI -->
    <div v-if="activeTab === 'all-templates'" class="space-y-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-1 items-center gap-3">
          <input
            v-model="search"
            type="search"
            placeholder="Cari nama template / departemen..."
            class="w-full max-w-sm rounded-lg border border-default bg-default px-3 py-2 text-sm"
          />
          <select
            v-model="selectedJabatan"
            class="rounded-lg border border-default bg-default px-3 py-2 text-sm"
          >
            <option value="">Semua Jabatan</option>
            <option v-for="j in options.jabatans" :key="j.id" :value="j.id">
              {{ j.nama_jabatan }}
            </option>
          </select>
        </div>
      </div>

      <div class="divide-y divide-default rounded-xl border border-default bg-default">
        <div
          v-for="tpl in filteredTemplates"
          :key="tpl.id"
          class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-semibold text-highlighted">{{ tpl.nama_template }}</p>
              <UBadge
                :label="statusBadge(tpl.status).label"
                :color="statusBadge(tpl.status).color"
                :variant="statusBadge(tpl.status).variant"
              />
              <span v-if="tpl.departemen" class="text-xs text-muted">({{ tpl.departemen }})</span>
            </div>
            <p class="mt-1 text-xs text-muted">
              {{ tpl.items?.length || 0 }} butir KPI · Total: {{ tpl.total_bobot }}% · Ditugaskan ke:
              <strong>{{ tpl.assignments_count || 0 }} Karyawan</strong>
            </p>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              size="xs"
              variant="outline"
              label="Detail"
              @click="openDetailModal(tpl)"
            />
            <UButton
              size="xs"
              variant="soft"
              label="Ubah"
              @click="openEditModal(tpl)"
            />
            <UButton
              size="xs"
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              @click="removeTemplate(tpl)"
            />
          </div>
        </div>

        <p v-if="!filteredTemplates.length" class="p-8 text-center text-sm text-muted">
          Tidak ada template KPI yang cocok dengan filter pencarian.
        </p>
      </div>
    </div>

    <!-- TAB 3: Distribusi Penugasan Karyawan -->
    <div v-if="activeTab === 'assignments'" class="space-y-4">
      <div class="overflow-x-auto rounded-xl border border-default bg-default">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-muted uppercase">
            <tr>
              <th class="p-3">Karyawan</th>
              <th class="p-3">Template KPI</th>
              <th class="p-3">Periode</th>
              <th class="p-3">Porsi Bobot</th>
              <th class="p-3">Ditugaskan Oleh</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-for="asg in assignments" :key="asg.id">
              <td class="p-3">
                <p class="font-medium text-highlighted">{{ asg.employee?.nama_karyawan || asg.employee_nik }}</p>
                <p class="text-xs text-muted">{{ asg.employee?.jabatan || '-' }} · {{ asg.employee?.departement || '-' }}</p>
              </td>
              <td class="p-3">
                <p class="font-medium text-highlighted">{{ asg.template?.nama_template }}</p>
                <p class="text-xs text-muted">{{ asg.template?.items?.length || 0 }} butir KPI</p>
              </td>
              <td class="p-3 text-xs text-muted">
                {{ asg.period?.nama_periode || 'Semua Periode' }}
              </td>
              <td class="p-3 font-semibold text-highlighted">
                {{ asg.weight_percentage }}%
              </td>
              <td class="p-3 text-xs text-muted">
                {{ asg.assigned_by_user?.name || 'Supervisor' }}
              </td>
            </tr>
            <tr v-if="!assignments.length">
              <td colspan="5" class="p-8 text-center text-sm text-muted">
                Belum ada penugasan template KPI ke karyawan.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL 1: Builder Modal -->
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
            <p class="text-xs text-muted">Konfigurasi indikator target kinerja perusahaan.</p>
          </div>
          <UButton color="neutral" variant="ghost" icon="i-lucide-x" @click="builderModal.open = false" />
        </div>

        <form class="mt-4 space-y-4" @submit.prevent="saveTemplate">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-semibold text-highlighted mb-1">
                Nama Template <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="builderModal.form.nama_template"
                required
                type="text"
                placeholder="misal: Template Standar Staff Kasir"
                class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm text-highlighted placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-highlighted mb-1">Jabatan Sasaran (Opsional)</label>
              <select
                v-model="builderModal.form.master_jabatan_id"
                class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm text-highlighted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Umum / Tanpa Jabatan Spesifik</option>
                <option v-for="j in options.jabatans" :key="j.id" :value="j.id">
                  {{ j.nama_jabatan }}
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-highlighted mb-1">Deskripsi</label>
            <textarea
              v-model="builderModal.form.deskripsi"
              rows="2"
              placeholder="Jelaskan tujuan dan kriteria umum template ini..."
              class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm text-highlighted placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            ></textarea>
          </div>

          <!-- Items list -->
          <div class="pt-2">
            <div class="flex items-center justify-between pb-2">
              <div class="flex items-center gap-2">
                <h4 class="text-sm font-semibold text-highlighted">Poin-Poin KPI</h4>
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
                class="rounded-xl border border-default bg-elevated p-4 space-y-3 shadow-xs"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-highlighted flex items-center gap-1.5">
                    <span class="inline-block size-2 rounded-full bg-primary"></span>
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
                    <label class="block text-xs font-semibold text-highlighted mb-1">
                      Nama Indikator KPI <span class="text-rose-500">*</span>
                    </label>
                    <input
                      v-model="item.nama_kpi"
                      required
                      type="text"
                      placeholder="misal: Akurasi Stock Opname"
                      class="w-full rounded-lg border border-default bg-default px-3 py-1.5 text-sm text-highlighted placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-highlighted mb-1">
                      Target <span class="text-rose-500">*</span>
                    </label>
                    <input
                      v-model="item.target"
                      required
                      type="text"
                      placeholder="misal: 100"
                      class="w-full rounded-lg border border-default bg-default px-3 py-1.5 text-sm text-highlighted placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-highlighted mb-1">
                      Satuan <span class="text-rose-500">*</span>
                    </label>
                    <select
                      v-model="item.satuan"
                      required
                      class="w-full rounded-lg border border-default bg-default px-3 py-1.5 text-sm text-highlighted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option v-for="opt in satuanOptions" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div>
                    <label class="block text-xs font-semibold text-highlighted mb-1">
                      Bobot (%) <span class="text-rose-500">*</span>
                    </label>
                    <input
                      v-model.number="item.bobot"
                      required
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="100"
                      class="w-full rounded-lg border border-default bg-default px-3 py-1.5 text-sm text-highlighted placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div class="sm:col-span-3">
                    <label class="block text-xs font-semibold text-highlighted mb-1">Formula / Cara Penilaian</label>
                    <input
                      v-model="item.formula_penilaian"
                      type="text"
                      placeholder="misal: (aktual / target) x 100"
                      class="w-full rounded-lg border border-default bg-default px-3 py-1.5 text-sm text-highlighted placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-default">
            <UButton variant="ghost" label="Batal" @click="builderModal.open = false" />
            <UButton
              type="submit"
              color="primary"
              label="Simpan Template"
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
            <p class="mt-1 text-xs text-muted">
              Departemen: {{ detailModal.template.departemen || '-' }} · Total: {{ detailModal.template.total_bobot }}%
            </p>
          </div>
          <UButton color="neutral" variant="ghost" icon="i-lucide-x" @click="detailModal.open = false" />
        </div>

        <div class="mt-4 space-y-4">
          <h4 class="text-sm font-semibold text-highlighted">Rincian Indikator KPI</h4>
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

    <!-- MODAL 3: HRD Decision Modal -->
    <div
      v-if="decisionModal.open && decisionModal.template"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 overflow-y-auto"
    >
      <div class="relative w-full max-w-2xl rounded-2xl border border-default bg-default p-6 shadow-2xl">
        <h3 class="text-lg font-semibold text-highlighted">Persetujuan Final HRD</h3>
        <p class="text-xs text-muted mt-1">
          Verifikasi keselarasan indikator target kinerja perusahaan.
        </p>

        <div class="mt-4 space-y-3 rounded-xl border border-default p-4 bg-elevated">
          <p class="text-sm font-semibold text-highlighted">{{ decisionModal.template.nama_template }}</p>
          <div class="text-xs text-muted space-y-1">
            <p>Pembuat: {{ decisionModal.template.creator_employee?.nama_karyawan || 'Supervisor' }}</p>
            <p>Atasan Langsung: {{ decisionModal.template.supervisor_employee?.nama_karyawan || '-' }}</p>
            <p>Total Bobot: {{ decisionModal.template.total_bobot }}% ({{ decisionModal.template.items?.length || 0 }} butir)</p>
          </div>
        </div>

        <div class="mt-4 space-y-3">
          <div>
            <label class="block text-xs font-medium text-muted mb-1">Keputusan HRD *</label>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                class="rounded-xl border p-3 text-center text-sm font-semibold transition"
                :class="
                  decisionModal.decision === 'approved'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                    : 'border-default text-muted hover:border-default'
                "
                @click="decisionModal.decision = 'approved'"
              >
                Setujui (Approved)
              </button>
              <button
                type="button"
                class="rounded-xl border p-3 text-center text-sm font-semibold transition"
                :class="
                  decisionModal.decision === 'rejected'
                    ? 'border-rose-500 bg-rose-500/10 text-rose-600'
                    : 'border-default text-muted hover:border-default'
                "
                @click="decisionModal.decision = 'rejected'"
              >
                Tolak & Minta Revisi
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-muted mb-1">
              {{ decisionModal.decision === 'rejected' ? 'Alasan Penolakan HRD (Wajib) *' : 'Catatan HRD (Opsional)' }}
            </label>
            <textarea
              v-model="decisionModal.notes"
              rows="3"
              class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm text-highlighted placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              :placeholder="decisionModal.decision === 'rejected' ? 'Tuliskan alasan penolakan untuk disampaikan ke pembuat...' : 'Catatan verifikasi...'"
            ></textarea>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <UButton variant="ghost" label="Batal" @click="decisionModal.open = false" />
          <UButton
            :color="decisionModal.decision === 'approved' ? 'primary' : 'error'"
            :loading="decisionModal.submitting"
            :label="decisionModal.decision === 'approved' ? 'Sahkan Persetujuan HRD' : 'Kirim Penolakan'"
            @click="submitDecision"
          />
        </div>
      </div>
    </div>
  </section>
</template>
