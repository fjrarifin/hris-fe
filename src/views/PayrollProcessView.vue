<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  approveHrPayrollDraft,
  cancelApproveHrPayrollDraft,
  cancelSubmitHrPayrollDraft,
  downloadHrPayrollSlip,
  generateHrPayrollDrafts,
  getHrPayrollDrafts,
  exportHrPayrollDrafts,
  getHrPayrollPeriods,
  lockHrPayrollDraft,
  previewHrPayrollProcess,
  autoCorrectHrPayrollProcessAttendance,
  saveHrPayrollAdjustments,
  sendHrPayrollSlip,
  submitHrPayrollDraft,
} from '../services/hrService'
import { apiError } from '../utils/formatters'
import { notifier } from '../utils/notifications'

const router = useRouter()

const filters = reactive({ start_date: '', end_date: '' })
const tableFilters = reactive({ q: '', status: 'all', validation: 'all' })
const preview = ref(null)
const downloadingPdf = ref([])
const exporting = ref(false)
const loading = ref(false)
const generatingState = reactive({
  loading: false,
  message: ''
})
const drafts = ref([])
const draftSummary = ref(null)
const periods = ref([])
const manualComponents = ref([])
const selectedDraft = ref(null)
const adjustments = ref([])
const saving = ref(false)
const massSending = ref(false)
const actionMenuId = ref(null)
const actionMenuStyle = ref({})
const page = ref(1)
const perPage = 10
const confirmation = ref(null)
let confirmationResolver = null

const rupiah = (value) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(value || 0)

const selectedPeriod = computed({
  get: () => `${filters.start_date}|${filters.end_date}`,
  set: async (value) => {
    const [startDate, endDate] = value.split('|')
    filters.start_date = startDate
    filters.end_date = endDate
    preview.value = null
    page.value = 1
    await loadDrafts()
  },
})

const selectedPeriodRecord = computed(() =>
  periods.value.find((period) => `${period.start_date}|${period.end_date}` === selectedPeriod.value),
)
const canGenerate = computed(() => Boolean(filters.start_date && filters.end_date && selectedPeriodRecord.value?.can_generate !== false && preview.value))
const sortedDrafts = computed(() => [...drafts.value].sort((a, b) => (a.name || '').localeCompare(b.name || '')))
const filteredDrafts = computed(() => {
  const needle = tableFilters.q.trim().toLowerCase()

  return sortedDrafts.value.filter((draft) => {
    const matchSearch = !needle || [draft.name, draft.nik]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle))
    const matchStatus = tableFilters.status === 'all' || draft.status === tableFilters.status
    const matchValidation = tableFilters.validation === 'all' || draft.validation_status === tableFilters.validation

    return matchSearch && matchStatus && matchValidation
  })
})
const previewFilters = reactive({
  q: '',
  hariMasuk: 'all',
})

const totalPages = computed(() => Math.max(Math.ceil(filteredDrafts.value.length / perPage), 1))
const paginatedDrafts = computed(() => filteredDrafts.value.slice((page.value - 1) * perPage, page.value * perPage))

const hariMasukOptions = [
  { value: 'all', label: 'Semua Kehadiran' },
  { value: '0', label: '0 Hari Masuk' },
  { value: 'kurang', label: 'Kurang dari Periode' },
  { value: 'pas', label: 'Pas dengan Periode' },
  { value: 'lebih', label: 'Lebih dari Periode' },
]

const previewRows = computed(() => {
  let rows = preview.value?.records || []
  if (previewFilters.q.trim()) {
    const q = previewFilters.q.trim().toLowerCase()
    rows = rows.filter((r) => r.name?.toLowerCase().includes(q) || r.nik?.toLowerCase().includes(q))
  }
  if (previewFilters.hariMasuk !== 'all') {
    rows = rows.filter((r) => {
      const masuk = r.total_hari_masuk || 0
      const periode = r.periode_hari_kerja || 0
      if (previewFilters.hariMasuk === '0') return masuk === 0
      if (previewFilters.hariMasuk === 'kurang') return masuk > 0 && masuk < periode
      if (previewFilters.hariMasuk === 'pas') return masuk === periode
      if (previewFilters.hariMasuk === 'lebih') return masuk > periode
      return true
    })
  }
  return rows
})
const previewPage = ref(1)
const previewPerPage = 10
const totalPreviewPages = computed(() => Math.max(Math.ceil(previewRows.value.length / previewPerPage), 1))
const paginatedPreviewRows = computed(() => previewRows.value.slice((previewPage.value - 1) * previewPerPage, previewPage.value * previewPerPage))
const unlockedApprovedDrafts = computed(() => drafts.value.filter((draft) => draft.status === 'approved' && !draft.is_locked))
const sendableDrafts = computed(() => drafts.value.filter((draft) => draft.status === 'approved' && draft.is_locked))
const canSendSlip = computed(() => sendableDrafts.value.length > 0 && unlockedApprovedDrafts.value.length === 0)

const statusOptions = computed(() => ['all', ...new Set(drafts.value.map((draft) => draft.status).filter(Boolean))])
const validationOptions = computed(() => ['all', ...new Set(drafts.value.map((draft) => draft.validation_status).filter(Boolean))])

const statusMeta = {
  draft: { label: 'Draft', color: 'neutral' },
  reviewed: { label: 'Draft', color: 'neutral' },
  submitted: { label: 'Submitted', color: 'warning' },
  approved: { label: 'Approved', color: 'success' },
  sent: { label: 'Sent', color: 'info' },
}

const typeLabels = {
  earning: 'Pendapatan',
  deduction: 'Potongan',
  employer_contribution: 'Kontribusi Perusahaan',
}

function statusLabel(status) {
  return statusMeta[status]?.label || status || '-'
}

function statusColor(status) {
  return statusMeta[status]?.color || 'neutral'
}

function validationColor(status) {
  return {
    valid: 'success',
    warning: 'warning',
    invalid: 'error',
  }[status] || 'neutral'
}

function componentRows(draft) {
  return (draft?.items || []).slice().sort((a, b) => {
    const typeOrder = { earning: 1, deduction: 2, employer_contribution: 3 }
    return (typeOrder[a.type] || 9) - (typeOrder[b.type] || 9) || (a.name || '').localeCompare(b.name || '')
  })
}

function groupedTotals(draft) {
  return {
    earning: (draft?.items || []).filter((item) => item.type === 'earning').reduce((total, item) => total + item.amount, 0),
    deduction: (draft?.items || []).filter((item) => item.type === 'deduction').reduce((total, item) => total + item.amount, 0),
    employer_contribution: (draft?.items || []).filter((item) => item.type === 'employer_contribution').reduce((total, item) => total + item.amount, 0),
  }
}

async function loadPreview() {
  preview.value = null
  loading.value = true
  previewFilters.q = ''
  previewFilters.hariMasuk = 'all'
  previewPage.value = 1
  try {
    preview.value = (await previewHrPayrollProcess({ ...filters })).data
    await loadDrafts()
    notifier.info('Preview payroll berhasil dimuat.')
  } catch (error) {
    notifier.error(apiError(error, 'Preview payroll tidak dapat dimuat.'))
  } finally {
    loading.value = false
  }
}

const autoCorrecting = ref([])
async function autoCorrectAttendance(nik) {
  autoCorrecting.value.push(nik)
  try {
    const response = await autoCorrectHrPayrollProcessAttendance({
      nik,
      start_date: filters.start_date,
      end_date: filters.end_date,
    })
    notifier.success(response.data?.message || 'Koreksi berhasil.')
    // Refresh preview to get updated attendance
    preview.value = (await previewHrPayrollProcess({ ...filters })).data
  } catch (error) {
    notifier.error(apiError(error, 'Gagal mengoreksi absensi otomatis.'))
  } finally {
    autoCorrecting.value = autoCorrecting.value.filter((n) => n !== nik)
  }
}

const autoCorrectingAll = ref(false)
async function autoCorrectAll() {
  const confirmed = await askConfirmation({
    title: 'Konfirmasi Auto Koreksi Semua',
    description: `Apakah Anda yakin ingin mengoreksi otomatis semua absensi "Lupa Scan" pada periode ini?`,
    confirmLabel: 'Auto Koreksi Semua',
    color: 'warning',
  })
  if (!confirmed) return

  autoCorrectingAll.value = true
  try {
    const response = await autoCorrectHrPayrollProcessAttendance({
      nik: null, // null means all
      start_date: filters.start_date,
      end_date: filters.end_date,
    })
    notifier.success(response.data?.message || 'Koreksi massal berhasil.')
    // Refresh preview
    preview.value = (await previewHrPayrollProcess({ ...filters })).data
  } catch (error) {
    notifier.error(apiError(error, 'Gagal mengoreksi semua absensi otomatis.'))
  } finally {
    autoCorrectingAll.value = false
  }
}

async function exportDrafts() {
  exporting.value = true
  try {
    const response = await exportHrPayrollDrafts({ ...filters })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    const fileName = `Report_Payroll_${filters.start_date || 'all'}.xlsx`
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    notifier.success('Data payroll berhasil diexport ke Excel')
  } catch (error) {
    notifier.error(apiError(error, 'Gagal export data payroll'))
  } finally {
    exporting.value = false
  }
}

async function generateDrafts() {
  const confirmed = await askConfirmation({
    title: 'Konfirmasi Generate Payroll',
    description: 'Generate draft payroll untuk periode ini? Draft existing yang masih draft akan dihitung ulang dari HRIS.',
    confirmLabel: 'Generate Payroll',
    color: 'success',
  })
  if (!confirmed) return

  generatingState.loading = true
  generatingState.message = `Memproses ${preview.value?.records?.length || 0} karyawan... Mohon tunggu.`
  try {
    const response = await generateHrPayrollDrafts({ ...filters })
    notifier.success(response.data?.message || 'Payroll berhasil digenerate.')
    await loadDrafts()
    preview.value = null
  } catch (error) {
    notifier.error(apiError(error, 'Gagal generate payroll.'))
  } finally {
    generatingState.loading = false
    generatingState.message = ''
  }
}

async function loadDrafts() {
  if (!filters.start_date || !filters.end_date) return

  const response = await getHrPayrollDrafts({ ...filters })
  drafts.value = response.data.records
  draftSummary.value = response.data.summary
  manualComponents.value = response.data.manual_components
}

async function loadPeriods() {
  try {
    const response = await getHrPayrollPeriods()
    periods.value = response.data.data
    const defaultPeriod = response.data.default_period
    const latest = periods.value[0]

    if (latest) {
      filters.start_date = latest.start_date
      filters.end_date = latest.end_date
      await loadDrafts()
    } else if (defaultPeriod) {
      filters.start_date = defaultPeriod.start_date
      filters.end_date = defaultPeriod.end_date
    }
  } catch (error) {
    notifier.error(apiError(error, 'Periode payroll tidak dapat dimuat.'))
  }
}

function reviewDraft(draft) {
  selectedDraft.value = draft
  actionMenuId.value = null
  adjustments.value = manualComponents.value.map((component) => ({
    component_id: component.id,
    name: component.nama,
    type: component.type,
    amount: (draft.raw_items || draft.items).find((item) => item.component_id === component.id)?.amount || 0,
  }))
}

function closeReview() {
  selectedDraft.value = null
  adjustments.value = []
}

function detailedApiError(error, fallback) {
  const errors = error.response?.data?.errors
  const attendanceIssues = errors?.attendance_issues || []
  const base = apiError(error, fallback)

  if (attendanceIssues.length) {
    return `${base} Detail blocker: ${attendanceIssues.slice(0, 5).join(' | ')}${attendanceIssues.length > 5 ? ` | +${attendanceIssues.length - 5} lagi` : ''}`
  }

  return base
}

function attendanceIssueList(error) {
  return error.response?.data?.errors?.attendance_issues || []
}

function downloadFileName(disposition, fallback) {
  const encoded = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (encoded) {
    return decodeURIComponent(encoded)
  }

  return disposition?.match(/filename="?([^";]+)"?/i)?.[1] || fallback
}

function isPdfBlob(data) {
  return data instanceof Blob && (data.type.includes('pdf') || data.size > 0)
}

function downloadSlipBlob(data, headers, draft) {
  const fileName = downloadFileName(
    headers?.['content-disposition'],
    `Slip_Gaji_${draft.nik}.pdf`,
  )
  const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()

  if (link.parentNode) {
    link.parentNode.removeChild(link)
  }

  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function firstIncompleteScanIssue(issues) {
  return issues.find((issue) => issue.includes('Scan masuk atau pulang belum lengkap'))
}

function issueDate(issue) {
  return issue?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || ''
}

async function redirectToAttendanceCorrection(draft, issues) {
  const incompleteIssue = firstIncompleteScanIssue(issues)
  const date = issueDate(incompleteIssue)

  if (!date) return

  notifier.info('Mengarahkan ke Koreksi Absensi untuk memperbaiki scan masuk/pulang yang belum lengkap.')
  await router.push({
    name: 'hr-attendance-corrections',
    query: { date, nik: draft.nik },
  })
}

function askConfirmation({ title, description, confirmLabel = 'Lanjutkan', color = 'primary' }) {
  confirmation.value = { title, description, confirmLabel, color }

  return new Promise((resolve) => {
    confirmationResolver = resolve
  })
}

function answerConfirmation(value) {
  confirmation.value = null
  confirmationResolver?.(value)
  confirmationResolver = null
}

async function saveAdjustments() {
  saving.value = true
  try {
    const response = await saveHrPayrollAdjustments(selectedDraft.value.id, adjustments.value)
    notifier.success(response.data.message)
    await loadDrafts()
    const fresh = drafts.value.find((draft) => draft.id === selectedDraft.value.id)
    if (fresh) reviewDraft(fresh)
  } catch (error) {
    notifier.error(apiError(error, 'Adjustment payroll tidak dapat disimpan.'))
  } finally {
    saving.value = false
  }
}

async function runAction(action, draft = selectedDraft.value) {
  if (!draft) return

  const labels = {
    submit: 'submit',
    approve: 'approve',
    cancelSubmit: 'batalkan submit',
    cancelApprove: 'batalkan approval',
    lock: 'lock',
    send: 'kirim slip',
  }
  const confirmed = await askConfirmation({
    title: `Konfirmasi ${labels[action]}`,
    description: `Lanjutkan ${labels[action]} payroll ${draft.name}?`,
    confirmLabel: labels[action],
    color: ['approve', 'send'].includes(action) ? 'success' : action === 'lock' ? 'error' : 'primary',
  })
  if (!confirmed) return

  actionMenuId.value = null
  try {
    const response = {
      submit: () => submitHrPayrollDraft(draft.id),
      approve: () => approveHrPayrollDraft(draft.id),
      cancelSubmit: () => cancelSubmitHrPayrollDraft(draft.id),
      cancelApprove: () => cancelApproveHrPayrollDraft(draft.id),
      lock: () => lockHrPayrollDraft(draft.id),
      send: () => sendHrPayrollSlip(draft.id),
    }[action]()

    const result = await response
    notifier.success(result.data.message)
    await loadDrafts()

    if (selectedDraft.value?.id === draft.id) {
      const fresh = drafts.value.find((item) => item.id === draft.id)
      if (fresh) reviewDraft(fresh)
    }
  } catch (error) {
    const issues = attendanceIssueList(error)
    notifier.error(detailedApiError(error, 'Payroll tidak dapat diproses.'))
    if (action === 'submit') {
      await redirectToAttendanceCorrection(draft, issues)
    }
  }
}

async function previewSlip(draft) {
  actionMenuId.value = null

  try {
    const response = await downloadHrPayrollSlip(draft.id)
    downloadSlipBlob(response.data, response.headers, draft)
  } catch (error) {
    if (isPdfBlob(error.response?.data)) {
      downloadSlipBlob(error.response.data, error.response.headers, draft)
    }
  }
}

async function massSendSlips() {
  if (!canSendSlip.value || massSending.value) return

  const confirmed = await askConfirmation({
    title: 'Konfirmasi kirim slip massal',
    description: `Kirim slip gaji ke ${sendableDrafts.value.length} karyawan yang sudah approved dan locked?`,
    confirmLabel: 'Kirim Massal',
    color: 'success',
  })
  if (!confirmed) return

  massSending.value = true
  actionMenuId.value = null

  let sent = 0
  const failed = []

  for (const draft of sendableDrafts.value) {
    try {
      await sendHrPayrollSlip(draft.id)
      sent += 1
    } catch (error) {
      failed.push(`${draft.name}: ${apiError(error, 'gagal dikirim')}`)
    }
  }

  massSending.value = false
  await loadDrafts()

  if (sent > 0) {
    notifier.success(`${sent} slip gaji berhasil dikirim.`)
  }

  if (failed.length) {
    notifier.error(`Sebagian slip gagal dikirim. ${failed.slice(0, 3).join(' | ')}${failed.length > 3 ? ` | +${failed.length - 3} lagi` : ''}`)
  }
}

async function toggleActionMenu(draft, event) {
  if (actionMenuId.value === draft.id) {
    actionMenuId.value = null
    return
  }

  const rect = event.currentTarget.getBoundingClientRect()
  actionMenuId.value = draft.id
  await nextTick()

  const menuWidth = 220
  const menuHeight = 320
  const left = Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12))
  const top = Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - menuHeight - 12))
  actionMenuStyle.value = {
    position: 'fixed',
    left: `${left}px`,
    top: `${top}px`,
    width: `${menuWidth}px`,
    zIndex: 90,
  }
}

watch([() => tableFilters.q, () => tableFilters.status, () => tableFilters.validation], () => {
  page.value = 1
})

watch(filteredDrafts, () => {
  if (page.value > totalPages.value) page.value = totalPages.value
})

watch(previewRows, () => {
  previewPage.value = 1
})

onMounted(loadPeriods)
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Proses Payroll</h2>
      <p class="mt-1 text-sm text-muted">Generate draft per periode payroll 25-24, review komponen, submit, approve, lock, dan kirim slip payroll.</p>
    </div>

    <UCard>
      <template #header>
        <div>
          <h3 class="font-semibold text-highlighted">Periode Payroll</h3>
          <p class="text-xs text-muted">Pilih periode payroll bulanan 25-24. Generate hanya aktif untuk periode yang sudah terlewati.</p>
        </div>
      </template>
      <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
        <UFormField label="Lihat Payroll Tersimpan">
          <select v-model="selectedPeriod" class="w-full rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted">
            <option v-if="!periods.length && filters.start_date" :value="selectedPeriod">
              {{ filters.start_date }} - {{ filters.end_date }}
            </option>
            <option
              v-for="period in periods"
              :key="`${period.start_date}|${period.end_date}`"
              :value="`${period.start_date}|${period.end_date}`"
              :disabled="period.can_generate === false"
            >
              {{ period.label }}
            </option>
          </select>
        </UFormField>
        <UButton label="Preview Payroll" icon="i-lucide-search" :loading="loading" @click="loadPreview" />
        <div class="flex items-center gap-2">
          <UButton label="Generate Payroll" icon="i-lucide-calculator" color="success" :disabled="!canGenerate || generatingState.loading" :loading="generatingState.loading" @click="generateDrafts" />
          <p v-if="generatingState.loading" class="text-xs text-muted">{{ generatingState.message }}</p>
        </div>
      </div>
    </UCard>

    <div v-if="draftSummary" class="sticky top-[60px] z-10 -mx-4 mb-4 grid gap-4 px-4 py-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
      <UCard><p class="text-xs text-muted">Payroll Tersimpan</p><p class="mt-1 text-xl font-semibold">{{ draftSummary.total_payrolls }}</p></UCard>
      <UCard><p class="text-xs text-muted">Total Gross</p><p class="mt-1 text-xl font-semibold text-highlighted">{{ rupiah(draftSummary.total_gross) }}</p></UCard>
      <UCard><p class="text-xs text-muted">Total Lembur</p><p class="mt-1 text-xl font-semibold text-highlighted">{{ rupiah(draftSummary.total_lembur) }}</p></UCard>
      <UCard><p class="text-xs text-muted">BPJS Karyawan</p><p class="mt-1 text-xl font-semibold text-info">{{ rupiah(draftSummary.total_bpjs_karyawan) }}</p></UCard>
      <UCard><p class="text-xs text-muted">BPJS Perusahaan</p><p class="mt-1 text-xl font-semibold text-info">{{ rupiah(draftSummary.total_bpjs_perusahaan) }}</p></UCard>
      <UCard><p class="text-xs text-muted">Total NET</p><p class="mt-1 text-xl font-semibold text-success">{{ rupiah(draftSummary.total_net) }}</p></UCard>
    </div>

    <UCard v-if="drafts.length">
      <template #header>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="font-semibold">Data NET Payroll Tersimpan</h3>
            <p class="text-xs text-muted">Data muncul setelah payroll digenerate untuk periode yang dipilih.</p>
          </div>
          <div class="flex flex-col items-start gap-2 sm:items-end">
            <p class="text-xs text-muted">Tampil {{ filteredDrafts.length }} dari {{ drafts.length }} payroll</p>
            <div class="flex flex-wrap gap-2">
              <UButton
                label="Export Excel"
                icon="i-lucide-download"
                color="success"
                size="sm"
                variant="soft"
                :loading="exporting"
                @click="exportDrafts"
              />
              <UButton
                label="Mass Send Email"
                icon="i-lucide-mails"
                color="info"
                size="sm"
                :disabled="!canSendSlip"
                :loading="massSending"
                @click="massSendSlips"
              />
            </div>
            <p v-if="unlockedApprovedDrafts.length" class="text-xs text-error">
              {{ unlockedApprovedDrafts.length }} payroll approved belum locked.
            </p>
          </div>
        </div>
      </template>

      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="w-full sm:w-1/3">
          <UFormField label="Cari Nama / NIK">
            <UInput v-model="tableFilters.q" icon="i-lucide-search" placeholder="Contoh: FAJAR / HPP25120147" />
          </UFormField>
        </div>
        <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <UFormField label="Filter Status" class="w-full sm:w-48">
            <select v-model="tableFilters.status" class="w-full rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted">
              <option v-for="status in statusOptions" :key="status" :value="status">{{ status === 'all' ? 'Semua Status' : statusLabel(status) }}</option>
            </select>
          </UFormField>
          <UFormField label="Filter Validasi" class="w-full sm:w-48">
            <select v-model="tableFilters.validation" class="w-full rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted">
              <option v-for="status in validationOptions" :key="status || 'empty'" :value="status">{{ status === 'all' ? 'Semua Validasi' : (status || '-') }}</option>
            </select>
          </UFormField>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="border-b border-default text-left text-xs text-muted">
            <tr>
              <th class="px-3 py-3">Karyawan</th>
              <th class="px-3 py-3">Status</th>
              <th class="px-3 py-3">Validasi</th>
              <th class="px-3 py-3">Hari Masuk</th>
              <th class="px-3 py-3">Pendapatan</th>
              <th class="px-3 py-3">Potongan</th>
              <th class="px-3 py-3">NET</th>
              <th class="px-3 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="draft in paginatedDrafts" :key="draft.id" class="border-b border-default">
              <td class="px-3 py-3">
                <p class="font-medium">{{ draft.name }}</p>
                <p class="text-xs text-muted">{{ draft.nik }}</p>
              </td>
              <td class="px-3 py-3">
                <div class="flex flex-wrap gap-1">
                  <UBadge :label="statusLabel(draft.status)" :color="statusColor(draft.status)" variant="subtle" />
                  <UBadge v-if="draft.is_locked" label="Locked" color="error" variant="subtle" />
                </div>
              </td>
              <td class="px-3 py-3"><UBadge :label="draft.validation_status || '-'" :color="validationColor(draft.validation_status)" variant="subtle" /></td>
              <td class="px-3 py-3">{{ draft.total_hari_masuk }} / {{ draft.periode_hari_kerja }}<p v-if="draft.extra_off_days" class="text-xs text-success">Extra off: {{ draft.extra_off_days }}</p></td>
              <td class="px-3 py-3">{{ rupiah(draft.total_pendapatan) }}</td>
              <td class="px-3 py-3">{{ rupiah(draft.total_potongan) }}</td>
              <td class="px-3 py-3 font-medium">{{ rupiah(draft.total_dibayarkan) }}</td>
              <td class="px-3 py-3">
                <div>
                  <UButton size="xs" color="neutral" variant="ghost" label="..." @click="toggleActionMenu(draft, $event)" />
                  <div v-if="actionMenuId === draft.id" :style="actionMenuStyle" class="rounded-xl border border-default bg-default p-2 shadow-xl">
                    <button class="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-elevated" @click="reviewDraft(draft)">Review Komponen</button>
                    <button v-if="draft.status === 'submitted' && !draft.is_locked" class="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-elevated" @click="runAction('approve', draft)">Approve</button>
                    <button v-if="draft.status === 'approved' && draft.is_locked && canSendSlip" class="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-elevated" @click="runAction('send', draft)">Send Slip</button>
                    <button v-if="draft.status === 'submitted' && !draft.is_locked" class="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-elevated" @click="runAction('cancelSubmit', draft)">Cancel Submit</button>
                    <button v-if="draft.status === 'approved' && !draft.is_locked" class="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-elevated" @click="runAction('cancelApprove', draft)">Cancel Approved</button>
                    <button v-if="draft.status === 'approved' && !draft.is_locked" class="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-elevated" @click="runAction('lock', draft)">Lock</button>
                    <button class="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-elevated" @click="previewSlip(draft)">Download PDF</button>
                  </div>
                </div>
              </td>
            </tr>
            <tr v-if="!paginatedDrafts.length"><td colspan="8" class="px-3 py-8 text-center text-muted">Tidak ada payroll yang cocok dengan filter.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex flex-col gap-3 border-t border-default pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-muted">Halaman {{ page }} dari {{ totalPages }}. Per halaman {{ perPage }} data.</p>
        <div class="flex gap-2">
          <UButton size="xs" color="neutral" variant="outline" label="Prev" :disabled="page <= 1" @click="page--" />
          <UButton size="xs" color="neutral" variant="outline" label="Next" :disabled="page >= totalPages" @click="page++" />
        </div>
      </div>
    </UCard>

    <div v-if="preview" class="space-y-6">
      <UAlert
        v-if="!canSubmit && preview"
        title="Draft boleh dibuat, tetapi belum boleh disubmit"
        description="Periksa jadwal, scan absensi, izin/sakit/cuti approved, dan konflik pengajuan sampai blocker absensi bernilai nol."
        color="warning"
        variant="subtle"
      />
      <UAlert
        v-if="preview && preview.summary?.incomplete_scan_count > 0"
        title="Peringatan Absensi"
        :description="`Ada ${preview.summary.incomplete_scan_count} absensi belum lengkap (lupa absen masuk/pulang).`"
        color="error"
        variant="subtle"
        class="mt-3"
      />
      <UAlert
        v-if="preview && preview.summary?.master_incomplete > 0"
        title="Master Payroll Belum Lengkap"
        :description="`Terdapat ${preview.summary.master_incomplete} karyawan tidak bisa digenerate karena master payroll belum diisi/tidak valid.`"
        color="warning"
        variant="subtle"
        class="mt-3"
      />

      <div class="sticky top-[60px] z-10 -mx-4 grid gap-4 px-4 py-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <UCard><p class="text-xs text-muted">Total Karyawan</p><p class="mt-1 text-xl font-semibold">{{ preview.records?.length || 0 }}</p></UCard>
        <UCard><p class="text-xs text-muted">Total Gross</p><p class="mt-1 text-xl font-semibold text-highlighted">{{ rupiah(preview.summary?.total_gross || 0) }}</p></UCard>
        <UCard><p class="text-xs text-muted">Total Lembur</p><p class="mt-1 text-xl font-semibold text-highlighted">{{ rupiah(preview.summary?.total_lembur || 0) }}</p></UCard>
        <UCard><p class="text-xs text-muted">BPJS Karyawan</p><p class="mt-1 text-xl font-semibold text-info">{{ rupiah(preview.summary?.total_bpjs_karyawan || 0) }}</p></UCard>
        <UCard><p class="text-xs text-muted">BPJS Perusahaan</p><p class="mt-1 text-xl font-semibold text-info">{{ rupiah(preview.summary?.total_bpjs_perusahaan || 0) }}</p></UCard>
        <UCard><p class="text-xs text-muted">Estimasi NET</p><p class="mt-1 text-xl font-semibold text-success">{{ rupiah(preview.summary?.total_net_estimation || 0) }}</p></UCard>
      </div>

      <UCard>
        <template #header>
          <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 class="font-semibold">Preview Absensi & Estimasi</h3>
            <div class="flex items-center gap-3">
              <p class="text-xs text-muted">{{ previewRows.length }} karyawan</p>
              <UButton 
                v-if="preview.summary.incomplete_scan_days > 0"
                size="sm"
                color="warning"
                label="Auto Koreksi Semua"
                icon="i-lucide-wand-2"
                :loading="autoCorrectingAll"
                @click="autoCorrectAll"
              />
            </div>
          </div>
        </template>
        <div class="mb-4 grid gap-3 border-b border-default pb-4 lg:grid-cols-3">
          <UFormField label="Cari Nama / NIK">
            <UInput v-model="previewFilters.q" icon="i-lucide-search" placeholder="Cari karyawan di preview..." />
          </UFormField>
          <UFormField label="Filter Hari Masuk">
            <select v-model="previewFilters.hariMasuk" class="w-full rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted">
              <option v-for="opt in hariMasukOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </UFormField>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="border-b border-default text-left text-xs text-muted">
              <tr>
                <th class="px-3 py-3">Karyawan</th>
                <th class="px-3 py-3">Hari Masuk</th>
                <th class="px-3 py-3">Extra Off</th>
                <th class="px-3 py-3">NET Estimasi</th>
                <th class="px-3 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in paginatedPreviewRows" :key="record.nik" class="border-b border-default">
                <td class="px-3 py-3"><p class="font-medium">{{ record.name }}</p><p class="text-xs text-muted">{{ record.nik }}</p></td>
                <td class="px-3 py-3">{{ record.total_hari_masuk }} / {{ record.periode_hari_kerja }}</td>
                <td class="px-3 py-3">{{ record.extra_off_days }}</td>
                <td class="px-3 py-3 font-medium">{{ rupiah(record.calculation?.take_home_pay) }}</td>
                <td class="px-3 py-3 text-center">
                  <div class="flex items-center justify-center gap-2">
                    <UButton size="xs" color="primary" variant="soft" label="Koreksi Absen" :to="{ name: 'hr-attendance-corrections', query: { nik: record.nik, date: filters.start_date } }" />
                    <UButton 
                      v-if="record.issues?.some((i) => i.code === 'incomplete_scan' || i.message?.includes('belum lengkap'))" 
                      size="xs" 
                      color="warning" 
                      variant="soft" 
                      label="Auto Koreksi" 
                      :loading="autoCorrecting.includes(record.nik)"
                      @click="autoCorrectAttendance(record.nik)" 
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-4 flex flex-col gap-3 border-t border-default pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-muted">Halaman {{ previewPage }} dari {{ totalPreviewPages }}. Tampil {{ paginatedPreviewRows.length }} dari {{ previewRows.length }} data.</p>
          <div class="flex gap-2">
            <UButton size="xs" color="neutral" variant="outline" label="Prev" :disabled="previewPage <= 1" @click="previewPage--" />
            <UButton size="xs" color="neutral" variant="outline" label="Next" :disabled="previewPage >= totalPreviewPages" @click="previewPage++" />
          </div>
        </div>
      </UCard>
    </div>

    <div v-if="selectedDraft" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button class="absolute inset-0 bg-slate-950/60" aria-label="Tutup review payroll" @click="closeReview"></button>
      <UCard class="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto">
        <template #header>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="font-semibold text-highlighted">Review Payroll - {{ selectedDraft.name }}</h3>
              <p class="text-xs text-muted">{{ selectedDraft.nik }} | NET {{ rupiah(selectedDraft.total_dibayarkan) }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <UBadge :label="statusLabel(selectedDraft.status)" :color="statusColor(selectedDraft.status)" variant="subtle" />
              <UBadge v-if="selectedDraft.is_locked" label="Locked" color="error" variant="subtle" />
            </div>
          </div>
        </template>

        <div class="grid gap-4 md:grid-cols-5">
          <UCard><p class="text-xs text-muted">Hari Masuk</p><p class="mt-1 font-semibold">{{ selectedDraft.total_hari_masuk }} / {{ selectedDraft.periode_hari_kerja }}</p><p v-if="selectedDraft.extra_off_days" class="text-xs text-success">Extra off: {{ selectedDraft.extra_off_days }}</p></UCard>
          <UCard><p class="text-xs text-muted">Pendapatan</p><p class="mt-1 font-semibold">{{ rupiah(groupedTotals(selectedDraft).earning) }}</p></UCard>
          <UCard><p class="text-xs text-muted">BPJS Karyawan</p><p class="mt-1 font-semibold">{{ rupiah(groupedTotals(selectedDraft).deduction) }}</p></UCard>
          <UCard><p class="text-xs text-muted">BPJS Perusahaan</p><p class="mt-1 font-semibold">{{ rupiah(groupedTotals(selectedDraft).employer_contribution) }}</p></UCard>
          <UCard><p class="text-xs text-muted">NET</p><p class="mt-1 font-semibold text-success">{{ rupiah(selectedDraft.total_dibayarkan) }}</p></UCard>
        </div>

        <div class="mt-5 grid items-start gap-4 lg:grid-cols-2">
          <!-- PENDAPATAN -->
          <UCard class="border border-default bg-transparent shadow-none ring-0">
            <template #header>
              <h4 class="font-semibold text-highlighted">PENDAPATAN</h4>
            </template>
            <div class="flex flex-col gap-2">
              <div v-for="item in selectedDraft.items.filter((i) => i.type === 'earning')" :key="item.id" class="flex justify-between text-sm">
                <span class="text-muted">{{ item.name }}</span>
                <span class="font-medium">{{ rupiah(item.amount) }}</span>
              </div>
            </div>
            <template #footer>
              <div class="flex justify-between font-semibold">
                <span>Total Pendapatan</span>
                <span>{{ rupiah(groupedTotals(selectedDraft).earning) }}</span>
              </div>
            </template>
          </UCard>

          <!-- POTONGAN -->
          <UCard class="border border-default bg-transparent shadow-none ring-0">
            <template #header>
              <h4 class="font-semibold text-highlighted">POTONGAN</h4>
            </template>
            <div class="flex flex-col gap-2">
              <div v-for="item in selectedDraft.items.filter((i) => i.type === 'deduction')" :key="item.id" class="flex justify-between text-sm">
                <span class="text-muted">{{ item.name }}</span>
                <span class="font-medium">{{ rupiah(item.amount) }}</span>
              </div>
            </div>
            <template #footer>
              <div class="flex justify-between font-semibold">
                <span>Total Potongan</span>
                <span>{{ rupiah(groupedTotals(selectedDraft).deduction) }}</span>
              </div>
            </template>
          </UCard>
        </div>

        <!-- BENEFIT LAINNYA -->
        <UCard v-if="selectedDraft.items.filter((i) => i.type === 'employer_contribution').length" class="mt-4 border border-default bg-transparent shadow-none ring-0">
          <template #header>
            <h4 class="font-semibold text-highlighted">BENEFIT LAINNYA</h4>
          </template>
          <div class="flex flex-col gap-2">
            <div v-for="item in selectedDraft.items.filter((i) => i.type === 'employer_contribution')" :key="item.id" class="flex justify-between text-sm">
              <span class="text-muted">{{ item.name }}</span>
              <span class="font-medium">{{ rupiah(item.amount) }}</span>
            </div>
          </div>
        </UCard>

        <details v-if="!selectedDraft.is_locked && ['draft', 'reviewed'].includes(selectedDraft.status)" class="mt-5 rounded-xl border border-default p-4" open>
          <summary class="cursor-pointer font-medium text-highlighted">Adjustment Manual (Penyesuaian Pembulatan, dll)</summary>
          <div class="mt-4 grid gap-6 md:grid-cols-2">
            <!-- Kolom Penambahan -->
            <div class="space-y-4">
              <h4 class="font-semibold text-emerald-500 border-b border-default pb-2">Penambahan (Earning)</h4>
              <div class="grid gap-3">
                <UFormField v-for="adjustment in adjustments.filter(a => a.type === 'earning')" :key="adjustment.component_id" :label="adjustment.name">
                  <UInput v-model.number="adjustment.amount" type="number" min="0" />
                </UFormField>
              </div>
            </div>
            <!-- Kolom Pengurangan -->
            <div class="space-y-4">
              <h4 class="font-semibold text-rose-500 border-b border-default pb-2">Pengurangan (Deduction)</h4>
              <div class="grid gap-3">
                <UFormField v-for="adjustment in adjustments.filter(a => a.type === 'deduction')" :key="adjustment.component_id" :label="adjustment.name">
                  <UInput v-model.number="adjustment.amount" type="number" min="0" />
                </UFormField>
              </div>
            </div>
          </div>
          <UButton class="mt-6" label="Simpan Adjustment" :loading="saving" @click="saveAdjustments" />
        </details>

        <div class="mt-5 flex flex-wrap justify-end gap-2 border-t border-default pt-4">
          <UButton label="Close" color="neutral" variant="outline" @click="closeReview" />
          <UButton v-if="['draft', 'reviewed'].includes(selectedDraft.status) && !selectedDraft.is_locked" label="Submit Payroll" color="warning" @click="runAction('submit', selectedDraft)" />
          <UButton v-if="selectedDraft.status === 'submitted' && !selectedDraft.is_locked" label="Approve" color="success" @click="runAction('approve', selectedDraft)" />
          <UButton v-if="selectedDraft.status === 'approved' && selectedDraft.is_locked && canSendSlip" label="Send Slip" color="info" @click="runAction('send', selectedDraft)" />
        </div>
      </UCard>
    </div>

    <div v-if="confirmation" class="fixed inset-0 z-[110] flex items-start justify-center bg-slate-950/20 px-4 pt-16">
      <UCard class="w-full max-w-md shadow-2xl">
        <template #header>
          <h3 class="font-semibold text-highlighted">{{ confirmation.title }}</h3>
        </template>
        <p class="text-sm text-muted">{{ confirmation.description }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <UButton label="Batal" color="neutral" variant="outline" @click="answerConfirmation(false)" />
          <UButton :label="confirmation.confirmLabel" :color="confirmation.color" @click="answerConfirmation(true)" />
        </div>
      </UCard>
    </div>
  </section>
</template>
