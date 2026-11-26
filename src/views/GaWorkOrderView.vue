<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { gaWorkOrderService } from '../services/gaWorkOrderService'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const auth = useAuthStore()
const isApprovalPage = computed(() => route.meta?.workOrderScope === 'approvals')
const canCreateWorkOrder = computed(() => Boolean(auth.user?.allow_work_order || auth.user?.level === 0))

const loading = ref(false)
const busy = ref(false)
const error = ref('')
const feedback = ref('')

const workOrders = ref({ data: [], current_page: 1, last_page: 1, total: 0 })
const filters = ref({ search: '', status: '' })

// Create WO modal
const showCreateModal = ref(false)
const approvers = ref([])
const masterUnits = ref([])
const approverSearch = ref('')
const photoItems = ref([])
const documentFileName = ref('')
const newWo = ref({
  division: 'MEP',
  job_type: 'WORK ORDER',
  area_name: '',
  project_description: '',
  target_date: '',
  notes: '',
  photos: [],
  approver_ids: [],
})

// Detail & Approval modal
const activeDetailId = ref(null)
const activeDetailDivision = ref('MEP')
const detailLoading = ref(false)
const detail = ref(null)
const approvalComment = ref('')
const showRevisionForm = ref(false)
const reviewNotes = ref('')
const revisionPhotoItems = ref([])
const attachments = ref({
  photoUrls: [],
  completionUrl: '',
  revisionUrls: [],
  documentUrl: '',
  documentIsImage: false,
  splUrl: '',
  splIsImage: false,
  loading: false,
})

function revokeAttachmentUrls() {
  for (const url of [...(attachments.value.photoUrls || []), ...(attachments.value.revisionUrls || [])]) {
    if (url) URL.revokeObjectURL(url)
  }
  for (const key of ['completionUrl', 'documentUrl', 'splUrl']) {
    if (attachments.value[key]) {
      URL.revokeObjectURL(attachments.value[key])
    }
  }
  attachments.value = {
    photoUrls: [],
    completionUrl: '',
    revisionUrls: [],
    documentUrl: '',
    documentIsImage: false,
    splUrl: '',
    splIsImage: false,
    loading: false,
  }
}

function closeDetailModal() {
  revokeAttachmentUrls()
  activeDetailId.value = null
  detail.value = null
  showRevisionForm.value = false
  reviewNotes.value = ''
  revisionPhotoItems.value = []
}

async function loadDetailAttachments(id, order, division = 'MEP') {
  revokeAttachmentUrls()
  if (!order) return
  attachments.value.loading = true
  try {
    const photoList = Array.isArray(order.photo_paths) && order.photo_paths.length
      ? order.photo_paths
      : order.photo_path
        ? [order.photo_path]
        : []

    const urls = []
    for (let i = 0; i < photoList.length; i++) {
      try {
        const { blob } = await gaWorkOrderService.fetchAttachmentBlob(id, 'photo', i, division)
        urls.push(URL.createObjectURL(blob))
      } catch {
        urls.push('')
      }
    }
    attachments.value.photoUrls = urls

    if (order.completion_photo_path) {
      try {
        const { blob } = await gaWorkOrderService.fetchAttachmentBlob(id, 'completion', 0, division)
        attachments.value.completionUrl = URL.createObjectURL(blob)
      } catch {
        // will fetch on click
      }
    }

    const revList = Array.isArray(order.revision_photo_paths) ? order.revision_photo_paths : []
    const revUrls = []
    for (let i = 0; i < revList.length; i++) {
      try {
        const { blob } = await gaWorkOrderService.fetchAttachmentBlob(id, 'revision', i, division)
        revUrls.push(URL.createObjectURL(blob))
      } catch {
        revUrls.push('')
      }
    }
    attachments.value.revisionUrls = revUrls

    if (order.request_document_path && !/\.pdf($|\?)/i.test(order.request_document_path)) {
      try {
        const { blob, contentType } = await gaWorkOrderService.fetchAttachmentBlob(id, 'document', 0, division)
        attachments.value.documentUrl = URL.createObjectURL(blob)
        attachments.value.documentIsImage = String(contentType).startsWith('image/')
      } catch {
        // will fetch on click
      }
    }
    if (order.spl_document_path && !/\.pdf($|\?)/i.test(order.spl_document_path)) {
      try {
        const { blob, contentType } = await gaWorkOrderService.fetchAttachmentBlob(id, 'spl', 0, division)
        attachments.value.splUrl = URL.createObjectURL(blob)
        attachments.value.splIsImage = String(contentType).startsWith('image/')
      } catch {
        // will fetch on click
      }
    }
  } finally {
    attachments.value.loading = false
  }
}

async function openAttachmentType(type, index = 0) {
  if (type === 'photo' || type === 'revision') {
    const arrKey = type === 'photo' ? 'photoUrls' : 'revisionUrls'
    const cached = attachments.value[arrKey]?.[index]
    if (cached) {
      window.open(cached, '_blank', 'noopener,noreferrer')
      return
    }
    if (!activeDetailId.value) return
    try {
      const { blob } = await gaWorkOrderService.fetchAttachmentBlob(activeDetailId.value, type, index, activeDetailDivision.value)
      const url = URL.createObjectURL(blob)
      attachments.value[arrKey][index] = url
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      error.value = err.response?.data?.message || 'Gagal membuka foto lampiran.'
    }
    return
  }

  const keyMap = { completion: 'completionUrl', document: 'documentUrl', spl: 'splUrl' }
  const key = keyMap[type]
  if (key && attachments.value[key]) {
    window.open(attachments.value[key], '_blank', 'noopener,noreferrer')
    return
  }
  if (!activeDetailId.value) return
  try {
    const { blob, contentType } = await gaWorkOrderService.fetchAttachmentBlob(activeDetailId.value, type, 0, activeDetailDivision.value)
    const url = URL.createObjectURL(blob)
    if (key) attachments.value[key] = url
    if (type === 'document') attachments.value.documentIsImage = String(contentType).startsWith('image/')
    if (type === 'spl') attachments.value.splIsImage = String(contentType).startsWith('image/')
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch (err) {
    error.value = err.response?.data?.message || 'Gagal membuka lampiran.'
  }
}

onBeforeUnmount(() => revokeAttachmentUrls())

const filteredApprovers = computed(() => {
  const q = approverSearch.value.trim().toLowerCase()
  if (!q) return approvers.value
  return approvers.value.filter(
    (u) =>
      u.name?.toLowerCase().includes(q) ||
      u.nik?.toLowerCase().includes(q) ||
      u.jabatan?.toLowerCase().includes(q),
  )
})

const selectedApprovers = computed(() => {
  const byId = new Map(approvers.value.map((u) => [u.hris_user_id, u]))
  return newWo.value.approver_ids.map((id) => byId.get(id)).filter(Boolean)
})

function removeApprover(id) {
  newWo.value.approver_ids = newWo.value.approver_ids.filter((item) => item !== id)
}

const wo = computed(() => detail.value?.work_order || null)
const initialApprovals = computed(() => (detail.value?.approvals || []).filter((a) => a.stage === 'initial'))
const rabApprovals = computed(() => (detail.value?.approvals || []).filter((a) => a.stage === 'rab'))
const myPendingStage = computed(() => detail.value?.my_pending_stage || null)

const formatRp = (val) => new Intl.NumberFormat('id-ID').format(Math.round(Number(val || 0)))
const formatQty = (val) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.round(Number(val || 0)))

const attachmentSummary = (item) => {
  let photoCount = 0
  if (Array.isArray(item?.photo_paths)) {
    photoCount = item.photo_paths.filter(Boolean).length
  } else if (typeof item?.photo_paths === 'string' && item.photo_paths.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(item.photo_paths)
      if (Array.isArray(parsed)) photoCount = parsed.filter(Boolean).length
    } catch {
      photoCount = 0
    }
  }
  if (photoCount === 0 && item?.photo_path) photoCount = 1

  const docCount = item?.request_document_path ? 1 : 0
  const parts = []
  if (photoCount > 0) parts.push(`${photoCount} Foto`)
  if (docCount > 0) parts.push(`${docCount} Dokumen`)
  return parts.length ? parts.join(' / ') : '-'
}

const statusLabel = (s) => {
  if (String(s || '').startsWith('REV-')) return `Revisi ${String(s).slice(4)}`
  return ({
    WAITING_APPROVAL: 'Menunggu Persetujuan',
    PENDING_GA: 'Menunggu Review GA',
    RAB_PENDING: 'Menunggu Persetujuan RAB',
    RAB_APPROVED: 'RAB Disetujui',
    SPL_PENDING: 'Menunggu Finance (SPL)',
    BUYING_MATERIAL: 'Pembelian Material',
    ON_PROGRESS: 'Sedang Dikerjakan',
    PROGRES: 'Sedang Dikerjakan',
    REVIEW: 'Menunggu Review Pemohon',
    DONE: 'Selesai',
    HOLD: 'Ditunda',
    REJECTED: 'Ditolak',
    BATAL: 'Dibatalkan',
    'BELUM DIKERJAKAN': 'Belum Dikerjakan',
  })[s] || s
}

const actionLabel = (action) =>
  ({
    'wo.created': 'Pengajuan Work Order dibuat',
    'wo.created_from_hris': 'Pengajuan Work Order dibuat',
    'wo.created_ga': 'Work Order internal GA dibuat',
    'initial.approved': 'Pengajuan disetujui atasan',
    'initial.rejected': 'Pengajuan ditolak atasan',
    'rab.submitted': 'RAB biaya diajukan oleh GA',
    'rab.approved': 'RAB biaya disetujui',
    'rab.rejected': 'RAB biaya ditolak',
    'rab.revision_requested': 'Revisi RAB diminta',
    'spl.submitted': 'Form SPL diajukan ke Finance',
    'ga.start_progress': 'Mulai dikerjakan tim teknisi',
    'ga.buying_material': 'Proses pembelian material',
    'ga.hold': 'Pekerjaan ditunda sementara',
    'ga.cancel': 'Work Order dibatalkan',
    'technician.submitted_review': 'Teknisi selesai mengerjakan (menunggu review)',
    'requester.confirmed_done': 'Pemohon mengonfirmasi pekerjaan selesai',
    'requester.requested_revision': 'Pemohon mengajukan revisi pekerjaan',
    'wo.updated': 'Progres pekerjaan diperbarui',
  })[action] || action

const approvalStatusLabel = (s) =>
  ({
    approved: 'Disetujui',
    rejected: 'Ditolak',
    pending: 'Menunggu',
  })[s] || s

const statusPillClass = (s) => {
  if (['DONE', 'RAB_APPROVED'].includes(s)) return 'wo-pill-ok'
  if (['ON_PROGRESS', 'PROGRES', 'BUYING_MATERIAL'].includes(s)) return 'wo-pill-info'
  if (['REJECTED', 'BATAL'].includes(s) || String(s || '').startsWith('REV-')) return 'wo-pill-err'
  return 'wo-pill-warn'
}

async function fetchList(page = 1) {
  loading.value = true
  error.value = ''
  try {
    workOrders.value = await gaWorkOrderService.list({
      page,
      per_page: 12,
      scope: isApprovalPage.value ? 'approvals' : 'all',
      search: filters.value.search || undefined,
      status: filters.value.status || undefined,
    })
  } catch (err) {
    error.value = err.response?.data?.message || 'Gagal memuat daftar Work Order.'
  } finally {
    loading.value = false
  }
}

async function openCreateModal() {
  showCreateModal.value = true
  error.value = ''
  const tasks = []
  if (!approvers.value.length) {
    tasks.push(
      gaWorkOrderService.approvers().then((list) => {
        approvers.value = list
      }).catch(() => { approvers.value = [] }),
    )
  }
  if (!masterUnits.value.length) {
    tasks.push(
      gaWorkOrderService.units().then((list) => {
        masterUnits.value = list
      }).catch(() => { masterUnits.value = [] }),
    )
  }
  if (tasks.length) await Promise.allSettled(tasks)
}

function onPhotoSelected(event) {
  const files = Array.from(event.target.files || [])
  if (!files.length) return
  const remaining = 3 - photoItems.value.length
  if (remaining <= 0) {
    error.value = 'Maksimal 3 foto yang dapat dilampirkan.'
    event.target.value = ''
    return
  }
  const toProcess = files.slice(0, remaining)
  if (files.length > remaining) {
    error.value = 'Maksimal 3 foto yang dapat dilampirkan. Hanya foto pertama yang ditambahkan.'
  } else {
    error.value = ''
  }

  for (const file of toProcess) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      error.value = 'Lampiran foto harus berupa JPG, PNG, atau WebP.'
      continue
    }
    if (file.size > 2 * 1024 * 1024) {
      error.value = `Ukuran foto "${file.name}" melebihi 2 MB.`
      continue
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (photoItems.value.length < 3) {
        photoItems.value.push({ name: file.name, dataUri: String(reader.result || '') })
        newWo.value.photos = photoItems.value.map((p) => p.dataUri)
      }
    }
    reader.readAsDataURL(file)
  }
  event.target.value = ''
}

function removePhoto(index) {
  photoItems.value.splice(index, 1)
  newWo.value.photos = photoItems.value.map((p) => p.dataUri)
}

function onDocumentSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    error.value = 'Lampiran dokumen harus berupa PDF, JPG, PNG, atau WebP.'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'Ukuran dokumen maksimal 5 MB.'
    return
  }
  error.value = ''
  documentFileName.value = file.name
  const reader = new FileReader()
  reader.onload = () => {
    newWo.value.document = String(reader.result || '')
  }
  reader.readAsDataURL(file)
}

function removeDocument() {
  newWo.value.document = ''
  documentFileName.value = ''
}

async function submitNewWo() {
  if (!newWo.value.area_name) {
    error.value = 'Pilih Area / Lokasi dari daftar Master Units.'
    return
  }
  if (!newWo.value.photos.length) {
    error.value = 'Lampiran foto minimal 1 wajib diunggah (maksimal 3 foto).'
    return
  }
  if (newWo.value.photos.length > 3) {
    error.value = 'Lampiran foto maksimal 3 foto.'
    return
  }
  if (!newWo.value.approver_ids.length) {
    error.value = 'Pilih minimal 1 approver (Supervisor / Asst. Manager / Manager / General Manager).'
    return
  }
  busy.value = true
  error.value = ''
  feedback.value = ''
  try {
    const res = await gaWorkOrderService.create({
      division: newWo.value.division,
      job_type: newWo.value.job_type,
      area_name: newWo.value.area_name,
      project_description: newWo.value.project_description,
      target_date: newWo.value.target_date || null,
      notes: newWo.value.notes || null,
      photos: newWo.value.photos,
      approver_ids: newWo.value.approver_ids,
    })
    feedback.value = res.message || 'Work Order berhasil diajukan.'
    showCreateModal.value = false
    newWo.value = {
      division: 'MEP',
      job_type: 'WORK ORDER',
      area_name: '',
      project_description: '',
      target_date: '',
      notes: '',
      photos: [],
      approver_ids: [],
    }
    photoItems.value = []
    documentFileName.value = ''
    approverSearch.value = ''
    await fetchList(1)
  } catch (err) {
    error.value =
      Object.values(err.response?.data?.errors || {}).flat().join(' ') ||
      err.response?.data?.message ||
      'Gagal mengajukan Work Order.'
  } finally {
    busy.value = false
  }
}

async function openDetail(id) {
  revokeAttachmentUrls()
  activeDetailId.value = id
  activeDetailDivision.value = workOrders.value.data.find((row) => row.id === id)?.division || 'MEP'
  detailLoading.value = true
  approvalComment.value = ''
  error.value = ''
  try {
    detail.value = await gaWorkOrderService.show(id, activeDetailDivision.value)
    loadDetailAttachments(id, detail.value?.work_order, activeDetailDivision.value)
  } catch (err) {
    error.value = err.response?.data?.message || 'Gagal memuat detail Work Order.'
    activeDetailId.value = null
  } finally {
    detailLoading.value = false
  }
}

async function submitDecision(decision) {
  if (!activeDetailId.value || !myPendingStage.value) return
  if (decision === 'reject' && !approvalComment.value.trim()) {
    error.value = 'Alasan penolakan atau catatan revisi wajib diisi.'
    return
  }
  busy.value = true
  error.value = ''
  feedback.value = ''
  try {
    const res = await gaWorkOrderService.approve(activeDetailId.value, {
      stage: myPendingStage.value,
      decision,
      comment: approvalComment.value.trim() || null,
    }, activeDetailDivision.value)
    feedback.value = res.message || 'Keputusan berhasil disimpan.'
    approvalComment.value = ''
    detail.value = await gaWorkOrderService.show(activeDetailId.value, activeDetailDivision.value)
    await fetchList(workOrders.value.current_page || 1)
  } catch (err) {
    error.value = err.response?.data?.message || 'Gagal menyimpan keputusan.'
  } finally {
    busy.value = false
  }
}

function onRevisionPhotoSelected(event) {
  const files = Array.from(event.target.files || [])
  if (!files.length) return
  const remaining = 3 - revisionPhotoItems.value.length
  if (remaining <= 0) {
    error.value = 'Maksimal 3 foto revisi yang dapat dilampirkan.'
    event.target.value = ''
    return
  }
  const toProcess = files.slice(0, remaining)
  error.value = files.length > remaining ? 'Maksimal 3 foto revisi. Hanya foto pertama yang ditambahkan.' : ''

  for (const file of toProcess) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      error.value = 'Foto revisi harus berupa JPG, PNG, atau WebP.'
      continue
    }
    if (file.size > 2 * 1024 * 1024) {
      error.value = `Ukuran foto "${file.name}" melebihi 2 MB.`
      continue
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (revisionPhotoItems.value.length < 3) {
        revisionPhotoItems.value.push({ name: file.name, dataUri: String(reader.result || '') })
      }
    }
    reader.readAsDataURL(file)
  }
  event.target.value = ''
}

function removeRevisionPhoto(index) {
  revisionPhotoItems.value.splice(index, 1)
}

async function submitReviewDecision(decision) {
  if (!activeDetailId.value) return
  if (decision === 'revision') {
    if (!reviewNotes.value.trim()) {
      error.value = 'Catatan revisi wajib diisi agar teknisi tahu bagian yang perlu diperbaiki.'
      return
    }
    if (!revisionPhotoItems.value.length) {
      error.value = 'Lampiran foto revisi minimal 1 wajib diunggah (maksimal 3 foto).'
      return
    }
  } else if (!window.confirm('Konfirmasi pekerjaan sudah sesuai dan selesaikan Work Order ini (Done)?')) {
    return
  }

  busy.value = true
  error.value = ''
  feedback.value = ''
  try {
    const res = await gaWorkOrderService.review(activeDetailId.value, {
      decision,
      notes: reviewNotes.value.trim() || null,
      photos: decision === 'revision' ? revisionPhotoItems.value.map((p) => p.dataUri) : undefined,
    }, activeDetailDivision.value)
    feedback.value = res.message || 'Status Work Order berhasil diperbarui.'
    showRevisionForm.value = false
    reviewNotes.value = ''
    revisionPhotoItems.value = []
    detail.value = await gaWorkOrderService.show(activeDetailId.value, activeDetailDivision.value)
    loadDetailAttachments(activeDetailId.value, detail.value?.work_order, activeDetailDivision.value)
    await fetchList(workOrders.value.current_page || 1)
  } catch (err) {
    error.value =
      Object.values(err.response?.data?.errors || {}).flat().join(' ') ||
      err.response?.data?.message ||
      'Gagal menyimpan hasil tinjauan Work Order.'
  } finally {
    busy.value = false
  }
}

async function cancelWorkOrder(id) {
  if (!id) return
  if (!window.confirm('Batalkan dan hapus Work Order ini secara permanen dari database? Tindakan ini tidak dapat dibatalkan.')) {
    return
  }
  busy.value = true
  error.value = ''
  feedback.value = ''
  try {
    const division = workOrders.value.data.find((row) => row.id === id)?.division || activeDetailDivision.value
    const res = await gaWorkOrderService.cancel(id, division)
    feedback.value = res.message || 'Work Order berhasil dibatalkan dan dihapus.'
    if (activeDetailId.value === id) {
      closeDetailModal()
    }
    await fetchList(1)
  } catch (err) {
    error.value = err.response?.data?.message || 'Gagal membatalkan Work Order.'
  } finally {
    busy.value = false
  }
}

watch(
  () => route.name,
  () => {
    closeDetailModal()
    fetchList(1)
  },
)

onMounted(() => fetchList(1))
</script>

<template>
  <div class="wo-view w-full space-y-5 p-4 sm:p-6 lg:p-8">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-xs font-semibold text-muted">General Affair &amp; Engineering</p>
        <h1 class="text-2xl font-bold tracking-tight text-highlighted">
          {{ isApprovalPage ? 'Approval Work Order' : 'Work Order' }}
        </h1>
        <p class="text-sm text-muted">
          {{
            isApprovalPage
              ? 'Tinjau pengajuan Work Order dan RAB dari karyawan yang membutuhkan persetujuan Anda.'
              : 'Ajukan perbaikan fasilitas, setujui pengajuan & RAB, dan pantau progres pengerjaan tim GA.'
          }}
        </p>
      </div>
      <button
        v-if="canCreateWorkOrder && !isApprovalPage"
        type="button"
        class="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
        @click="openCreateModal"
      >
        + Buat Work Order
      </button>
    </div>

    <!-- Feedback & Error Banners (hanya saat tidak ada modal terbuka) -->
    <div v-if="feedback && !showCreateModal && !activeDetailId" role="status" class="wo-banner wo-banner-ok">
      {{ feedback }}
    </div>
    <div v-if="error && !showCreateModal && !activeDetailId" role="alert" class="wo-banner wo-banner-err">
      {{ error }}
    </div>

    <!-- Main Full-Width Panel -->
    <div class="wo-surface w-full overflow-hidden rounded-xl border border-default">
      <div class="wo-toolbar flex flex-col gap-2.5 border-b border-default px-4 py-3 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3">
        <div class="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            v-model="filters.search"
            type="search"
            placeholder="Cari deskripsi, unit/area, atau pemohon..."
            class="wo-input min-h-[38px] w-full rounded-lg px-3 text-sm sm:max-w-xs"
            @input="fetchList(1)"
          />
          <select
            v-model="filters.status"
            class="wo-input min-h-[38px] w-full rounded-lg px-3 text-sm sm:w-auto"
            @change="fetchList(1)"
          >
            <option value="">Semua Status</option>
            <option value="WAITING_APPROVAL">Menunggu Persetujuan</option>
            <option value="PENDING_GA">Menunggu Review GA</option>
            <option value="RAB_PENDING">Menunggu Persetujuan RAB</option>
            <option value="RAB_APPROVED">RAB Disetujui</option>
            <option value="SPL_PENDING">Menunggu Finance (SPL)</option>
            <option value="BUYING_MATERIAL">Pembelian Material</option>
            <option value="ON_PROGRESS">Sedang Dikerjakan</option>
            <option value="REVIEW">Menunggu Review Pemohon</option>
            <option value="DONE">Selesai</option>
            <option value="REJECTED">Ditolak</option>
          </select>
        </div>
        <span class="text-xs font-medium text-muted tabular-nums">{{ workOrders.total || 0 }} Work Order</span>
      </div>

      <!-- Mobile Card List (Zero Horizontal Scroll) -->
      <div class="divide-y divide-[var(--ui-border)] md:hidden">
        <div v-if="loading" class="px-4 py-8 text-center text-sm text-muted">
          Memuat data Work Order...
        </div>
        <div v-else-if="!workOrders.data?.length" class="px-4 py-8 text-center text-sm text-muted">
          Belum ada Work Order yang Anda ajukan atau perlu persetujuan Anda.
        </div>
        <article
          v-for="item in workOrders.data"
          :key="`m-${item.id}`"
          class="space-y-3 p-4"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex flex-wrap items-center gap-1.5 text-xs text-muted tabular-nums">
              <span class="font-bold text-highlighted">#{{ item.excel_no || item.id }}</span>
              <span>•</span>
              <span>{{ item.request_date || '-' }}</span>
            </div>
            <span :class="['wo-pill shrink-0', statusPillClass(item.status)]">
              {{ statusLabel(item.status) }}
            </span>
          </div>

          <div>
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-sm font-bold text-highlighted">{{ item.area_name }}</span>
              <span class="wo-type-chip text-[11px] text-muted">{{ item.job_type }}</span>
            </div>
            <p v-if="item.requester_name" class="mt-0.5 text-xs text-muted">
              Pemohon: {{ item.requester_name }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span class="wo-type-chip">Lampiran: {{ attachmentSummary(item) }}</span>
            <span v-if="item.completion_photo_path" class="wo-pill wo-pill-ok">Ada Foto Hasil</span>
          </div>

          <div
            v-if="item.my_pending_stage || item.can_review || item.approval_total_count > 0 || Number(item.rab_total || 0) > 0"
            class="flex flex-wrap items-center gap-2 text-xs text-muted"
          >
            <span v-if="item.my_pending_stage" class="wo-pill wo-pill-warn">
              Perlu Approval Anda
            </span>
            <span v-if="item.can_review" class="wo-pill wo-pill-info">
              Perlu Review Anda
            </span>
            <span v-if="item.approval_total_count > 0">
              Approval: <strong class="text-highlighted">{{ item.approval_done_count }}/{{ item.approval_total_count }}</strong>
            </span>
            <span v-if="Number(item.rab_total || 0) > 0" class="tabular-nums">
              RAB: <strong class="text-highlighted">Rp {{ formatRp(item.rab_total) }}</strong>
            </span>
          </div>

          <div class="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              :title="item.my_pending_stage ? 'Review & Setujui' : item.can_review ? 'Tinjau Hasil' : 'Detail & Progres'"
              :aria-label="item.my_pending_stage ? 'Review & Setujui' : item.can_review ? 'Tinjau Hasil' : 'Detail & Progres'"
              class="wo-btn-outline inline-flex size-9 items-center justify-center rounded-lg transition"
              @click="openDetail(item.id)"
            >
              <UIcon :name="item.my_pending_stage || item.can_review ? 'i-lucide-clipboard-check' : 'i-lucide-eye'" class="size-4" />
            </button>
            <button
              v-if="item.can_cancel"
              type="button"
              :disabled="busy"
              title="Batalkan & Hapus WO"
              aria-label="Batalkan & Hapus Work Order"
              class="inline-flex size-9 items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 text-red-600 transition hover:bg-red-500/20 disabled:opacity-50"
              @click="cancelWorkOrder(item.id)"
            >
              <UIcon name="i-lucide-trash-2" class="size-4" />
            </button>
          </div>
        </article>
      </div>

      <!-- Desktop Table (Unchanged) -->
      <div class="hidden overflow-x-auto md:block">
        <table class="w-full border-collapse text-left text-sm">
          <thead>
            <tr class="wo-thead-row border-b border-default text-xs font-semibold text-muted">
              <th class="whitespace-nowrap px-4 py-3">No</th>
              <th class="whitespace-nowrap px-4 py-3">Tanggal</th>
              <th class="whitespace-nowrap px-4 py-3">Area / Unit &amp; Pemohon</th>
              <th class="whitespace-nowrap px-4 py-3">Lampiran</th>
              <th class="whitespace-nowrap px-4 py-3">Approval / RAB</th>
              <th class="whitespace-nowrap px-4 py-3">Status</th>
              <th class="whitespace-nowrap px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--ui-border)]">
            <tr v-if="loading">
              <td colspan="7" class="px-4 py-8 text-center text-muted">Memuat data Work Order...</td>
            </tr>
            <tr v-else-if="!workOrders.data?.length">
              <td colspan="7" class="px-4 py-8 text-center text-muted">
                Belum ada Work Order yang Anda ajukan atau perlu persetujuan Anda.
              </td>
            </tr>
            <tr v-for="item in workOrders.data" :key="item.id" class="wo-tr">
              <td class="whitespace-nowrap px-4 py-3 font-semibold text-muted tabular-nums">
                #{{ item.excel_no || item.id }}
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-muted tabular-nums">
                {{ item.request_date || '-' }}
              </td>
              <td class="px-4 py-3">
                <div class="font-semibold text-highlighted">{{ item.area_name }}</div>
                <div class="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                  <span class="wo-type-chip">{{ item.job_type }}</span>
                  <span v-if="item.requester_name">{{ item.requester_name }}</span>
                </div>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-xs text-muted">
                <div class="flex flex-col items-start gap-1">
                  <span class="font-medium text-highlighted tabular-nums">{{ attachmentSummary(item) }}</span>
                  <span v-if="item.completion_photo_path" class="wo-pill wo-pill-ok">Foto Hasil Teknisi</span>
                </div>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-xs text-muted">
                <div class="flex flex-col items-start gap-1">
                  <span v-if="item.my_pending_stage" class="wo-pill wo-pill-warn">
                    Perlu Approval Anda
                  </span>
                  <span v-if="item.can_review" class="wo-pill wo-pill-info">
                    Perlu Review Anda
                  </span>
                  <span v-if="item.approval_total_count > 0">
                    Approval: <strong class="text-highlighted">{{ item.approval_done_count }}/{{ item.approval_total_count }}</strong>
                  </span>
                  <span v-if="Number(item.rab_total || 0) > 0" class="tabular-nums">
                    RAB: <strong class="text-highlighted">Rp {{ formatRp(item.rab_total) }}</strong>
                  </span>
                </div>
              </td>
              <td class="whitespace-nowrap px-4 py-3">
                <span :class="['wo-pill', statusPillClass(item.status)]">
                  {{ statusLabel(item.status) }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3">
                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    :title="item.my_pending_stage ? 'Review & Setujui' : item.can_review ? 'Tinjau Hasil' : 'Detail & Progres'"
                    :aria-label="item.my_pending_stage ? 'Review & Setujui' : item.can_review ? 'Tinjau Hasil' : 'Detail & Progres'"
                    class="wo-btn-outline inline-flex size-8 items-center justify-center rounded-lg transition"
                    @click="openDetail(item.id)"
                  >
                    <UIcon :name="item.my_pending_stage || item.can_review ? 'i-lucide-clipboard-check' : 'i-lucide-eye'" class="size-4" />
                  </button>
                  <button
                    v-if="item.can_cancel"
                    type="button"
                    :disabled="busy"
                    title="Batalkan & Hapus WO"
                    aria-label="Batalkan & Hapus Work Order"
                    class="inline-flex size-8 items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 text-red-600 transition hover:bg-red-500/20 disabled:opacity-50"
                    @click="cancelWorkOrder(item.id)"
                  >
                    <UIcon name="i-lucide-trash-2" class="size-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="workOrders.last_page > 1" class="flex items-center justify-end gap-3 border-t border-default px-4 py-3 text-xs">
        <button
          type="button"
          class="wo-btn-outline rounded-lg px-3 py-1.5 font-semibold disabled:opacity-50"
          :disabled="workOrders.current_page <= 1"
          @click="fetchList(workOrders.current_page - 1)"
        >
          Sebelumnya
        </button>
        <span class="font-medium text-muted tabular-nums">
          Halaman {{ workOrders.current_page }} / {{ workOrders.last_page }}
        </span>
        <button
          type="button"
          class="wo-btn-outline rounded-lg px-3 py-1.5 font-semibold disabled:opacity-50"
          :disabled="workOrders.current_page >= workOrders.last_page"
          @click="fetchList(workOrders.current_page + 1)"
        >
          Berikutnya
        </button>
      </div>
    </div>

    <!-- MODAL BUAT WORK ORDER -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/65 p-0 sm:items-center sm:p-4"
      @click.self="showCreateModal = false"
    >
      <div class="wo-surface max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-default p-5 sm:max-w-2xl sm:rounded-2xl sm:p-6">
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold text-highlighted">Ajukan Work Order</h2>
            <p class="text-xs text-muted">Wajib melampirkan 1–3 foto, opsional maks. 1 dokumen, dan memilih approver (Supervisor / Asst. Manager / Manager / General Manager).</p>
          </div>
          <button type="button" class="wo-btn-outline rounded-lg px-2.5 py-1 text-xs font-semibold" @click="showCreateModal = false">
            ✕
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="submitNewWo">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-semibold text-highlighted">Divisi <span class="text-red-500">*</span></label>
              <select v-model="newWo.division" class="wo-input min-h-[40px] w-full rounded-lg px-3 text-sm" required>
                <option value="MEP">MEP (Engineering)</option>
                <option value="IT">IT (Information Technology)</option>
                <option value="HSSE" disabled>HSSE (segera hadir)</option>
                <option value="GS" disabled>GS (segera hadir)</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-highlighted">Jenis Pekerjaan</label>
              <select v-model="newWo.job_type" class="wo-input min-h-[40px] w-full rounded-lg px-3 text-sm" required>
                <option value="WORK ORDER">WORK ORDER</option>
                <option value="PROJECT">PROJECT</option>
                <option value="LAIN - LAIN">LAIN - LAIN</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-semibold text-highlighted">
                Area / Lokasi (Master Units) <span class="text-red-500">*</span>
              </label>
              <select v-model="newWo.area_name" class="wo-input min-h-[40px] w-full rounded-lg px-3 text-sm" required>
                <option value="" disabled>-- Pilih Unit / Area --</option>
                <option v-for="unit in masterUnits" :key="unit" :value="unit">{{ unit }}</option>
              </select>
            </div>
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold text-highlighted">Deskripsi Pekerjaan / Kerusakan <span class="text-red-500">*</span></label>
            <textarea
              v-model="newWo.project_description"
              rows="3"
              placeholder="Jelaskan detail perbaikan atau kebutuhan fasilitas..."
              class="wo-input w-full rounded-lg p-3 text-sm"
              required
            />
          </div>

          <div class="wo-subtle-box rounded-lg border border-default p-3">
            <div class="mb-1 flex items-center justify-between gap-2">
              <label class="text-xs font-semibold text-highlighted">
                Lampiran Foto (Min. 1, Maks. 3) <span class="text-red-500">*</span>
              </label>
              <span class="text-[11px] font-medium text-muted tabular-nums">{{ photoItems.length }} / 3</span>
            </div>
            <input
              v-if="photoItems.length < 3"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              class="block w-full text-xs text-muted file:mr-2 file:rounded-md file:border-0 file:bg-blue-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-800"
              @change="onPhotoSelected"
            />
            <p class="mt-1 text-[11px] text-muted">JPG / PNG / WebP, maks. 2 MB per foto</p>
            <div v-if="photoItems.length" class="mt-2 grid grid-cols-3 gap-2">
              <div v-for="(p, idx) in photoItems" :key="idx" class="relative overflow-hidden rounded-lg border border-default">
                <img :src="p.dataUri" :alt="p.name" class="h-24 w-full object-cover" />
                <button
                  type="button"
                  aria-label="Hapus foto"
                  class="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-slate-900/80 text-[10px] font-bold text-white hover:bg-red-600"
                  @click="removePhoto(idx)"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold text-highlighted">
              Pilih Approver (Supervisor / Asst. Manager / Manager / General Manager) <span class="text-red-500">*</span>
            </label>
            <div v-if="selectedApprovers.length" class="mb-2 flex flex-wrap gap-1.5">
              <span
                v-for="u in selectedApprovers"
                :key="`sel-${u.hris_user_id}`"
                class="wo-approver-badge"
              >
                <span class="max-w-[240px] truncate">{{ u.name }}</span>
                <button
                  type="button"
                  :aria-label="`Hapus ${u.name} dari approver`"
                  title="Hapus approver"
                  class="wo-approver-badge-remove"
                  @click="removeApprover(u.hris_user_id)"
                >
                  <UIcon name="i-lucide-x" class="size-3.5" />
                </button>
              </span>
            </div>
            <input
              v-model="approverSearch"
              type="search"
              placeholder="Cari nama, NIK, atau jabatan..."
              class="wo-input mb-2 min-h-[38px] w-full rounded-lg px-3 text-sm"
            />
            <div class="wo-subtle-box max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-default p-2.5">
              <label
                v-for="u in filteredApprovers"
                :key="u.hris_user_id"
                class="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1 text-sm"
              >
                <input v-model="newWo.approver_ids" type="checkbox" :value="u.hris_user_id" class="size-4 shrink-0 rounded" />
                <span class="font-medium text-highlighted">{{ u.name }}</span>
                <span class="text-xs text-muted">({{ u.jabatan }} • {{ u.nik }})</span>
              </label>
              <p v-if="!filteredApprovers.length" class="py-2 text-center text-xs text-muted">
                Tidak ada approver level Supervisor / Asst. Manager / Manager / General Manager ditemukan.
              </p>
            </div>
            <p class="mt-1 text-xs text-muted">{{ newWo.approver_ids.length }} approver dipilih.</p>
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold text-highlighted">Target Tanggal Selesai (Opsional)</label>
            <input v-model="newWo.target_date" type="date" class="wo-input min-h-[40px] w-full rounded-lg px-3 text-sm" />
          </div>

          <div v-if="error" role="alert" class="wo-banner wo-banner-err text-xs">
            {{ error }}
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button type="button" class="wo-btn-outline min-h-[40px] rounded-lg px-4 text-sm font-semibold" @click="showCreateModal = false">
              Batal
            </button>
            <button type="submit" :disabled="busy" class="min-h-[40px] rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
              {{ busy ? 'Mengirim...' : 'Kirim Pengajuan WO' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL DETAIL, APPROVAL & TIMELINE AUDIT -->
    <div
      v-if="activeDetailId"
      class="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/65 p-0 sm:items-center sm:p-4"
      @click.self="closeDetailModal"
    >
      <div class="wo-surface flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-default sm:max-w-3xl sm:rounded-2xl">
        <div class="flex items-start justify-between gap-3 border-b border-default px-5 py-4">
          <div class="min-w-0">
            <h2 class="text-lg font-bold text-highlighted">Detail Work Order #{{ wo?.excel_no || activeDetailId }}</h2>
            <p v-if="wo" class="text-xs text-muted">
              {{ wo.area_name }} • {{ wo.job_type }}{{ wo.division ? ` • Divisi ${wo.division}` : '' }}
              <span v-if="detail?.requester"> • Pemohon: <strong class="text-highlighted">{{ detail.requester.name }}</strong></span>
            </p>
            <div v-if="wo" class="mt-2">
              <span :class="['wo-pill', statusPillClass(wo.status)]">
                {{ statusLabel(wo.status) }}
              </span>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <button
              v-if="detail?.can_cancel"
              type="button"
              :disabled="busy"
              class="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50"
              @click="cancelWorkOrder(activeDetailId)"
            >
              Batal
            </button>
            <button
              type="button"
              title="Tutup"
              aria-label="Tutup modal"
              class="wo-btn-outline inline-flex size-8 items-center justify-center rounded-lg"
              @click="closeDetailModal"
            >
              <UIcon name="i-lucide-x" class="size-4" />
            </button>
          </div>
        </div>

        <div class="space-y-4 overflow-y-auto p-5">
          <div v-if="feedback" role="status" class="wo-banner wo-banner-ok text-xs">
            {{ feedback }}
          </div>
          <div v-if="error" role="alert" class="wo-banner wo-banner-err text-xs">
            {{ error }}
          </div>
          <p v-if="detailLoading" class="text-sm text-muted">Memuat detail Work Order...</p>

          <template v-if="wo && !detailLoading">
            <div class="wo-subtle-box rounded-xl border border-default p-4">
              <h3 class="mb-1 text-xs font-semibold text-muted">Deskripsi Pekerjaan</h3>
              <p class="whitespace-pre-line break-words text-sm text-highlighted">{{ wo.project_description }}</p>
              <div class="mt-3 flex flex-wrap gap-4 text-xs text-muted tabular-nums">
                <span>Diajukan: <strong class="text-highlighted">{{ wo.request_date || '-' }}</strong></span>
                <span>Target: <strong class="text-highlighted">{{ wo.target_date || '-' }}</strong></span>
                <span v-if="Number(wo.rab_total || 0) > 0">Total RAB: <strong class="text-highlighted">Rp {{ formatRp(wo.rab_total) }}</strong></span>
              </div>
              <p v-if="wo.rejection_reason" class="wo-banner wo-banner-warn mt-3 text-xs">
                <strong>Catatan Penolakan / Revisi RAB:</strong> {{ wo.rejection_reason }}
              </p>
              <p v-if="wo.revision_notes" class="wo-banner wo-banner-err mt-3 text-xs">
                <strong>Catatan Revisi Pekerjaan (Revisi {{ wo.revision_count || 1 }}):</strong> {{ wo.revision_notes }}
              </p>
            </div>

            <!-- AKSI REVIEW HASIL PEKERJAAN TEKNISI (PEMOHON) -->
            <div v-if="detail?.can_review" class="wo-action-box rounded-xl p-4">
              <h3 class="text-sm font-bold text-highlighted">Tinjau Hasil Pekerjaan Teknisi</h3>
              <p class="mt-1 text-xs text-muted">
                Teknisi telah menyelesaikan pekerjaan dan melampirkan foto hasil di bawah. Periksa hasil pekerjaan di lapangan, lalu pilih <strong>Selesai (Done)</strong> jika sudah sesuai atau <strong>Ajukan Revisi</strong> jika masih ada yang kurang pas.
              </p>

              <div v-if="!showRevisionForm" class="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  :disabled="busy"
                  class="min-h-[40px] rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  @click="submitReviewDecision('done')"
                >
                  Pekerjaan Sesuai → Selesai (Done)
                </button>
                <button
                  type="button"
                  :disabled="busy"
                  class="min-h-[40px] rounded-lg bg-red-700 px-4 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                  @click="showRevisionForm = true"
                >
                  Ajukan Revisi (Rev-{{ (wo.revision_count || 0) + 1 }})
                </button>
              </div>

              <div v-else class="mt-3 space-y-3 rounded-lg border border-default p-3 wo-surface">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-xs font-bold text-highlighted">Form Pengajuan Revisi (Status akan menjadi Rev-{{ (wo.revision_count || 0) + 1 }})</p>
                  <button type="button" class="text-xs font-semibold text-muted hover:underline" @click="showRevisionForm = false">
                    Batal
                  </button>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-semibold text-highlighted">
                    Catatan Bagian yang Perlu Direvisi <span class="text-red-500">*</span>
                  </label>
                  <textarea
                    v-model="reviewNotes"
                    rows="2"
                    placeholder="Jelaskan detail hasil pekerjaan yang masih kurang sesuai..."
                    class="wo-input w-full rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div>
                  <div class="mb-1 flex items-center justify-between gap-2">
                    <label class="text-xs font-semibold text-highlighted">
                      Foto Bukti Revisi (Min. 1, Maks. 3) <span class="text-red-500">*</span>
                    </label>
                    <span class="text-[11px] font-medium text-muted tabular-nums">{{ revisionPhotoItems.length }} / 3</span>
                  </div>
                  <input
                    v-if="revisionPhotoItems.length < 3"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    class="block w-full text-xs text-muted file:mr-2 file:rounded-md file:border-0 file:bg-blue-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-800"
                    @change="onRevisionPhotoSelected"
                  />
                  <div v-if="revisionPhotoItems.length" class="mt-2 grid grid-cols-3 gap-2">
                    <div v-for="(p, idx) in revisionPhotoItems" :key="idx" class="relative overflow-hidden rounded-lg border border-default">
                      <img :src="p.dataUri" :alt="p.name" class="h-20 w-full object-cover" />
                      <button
                        type="button"
                        aria-label="Hapus foto revisi"
                        class="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-slate-900/80 text-[10px] font-bold text-white hover:bg-red-600"
                        @click="removeRevisionPhoto(idx)"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    :disabled="busy"
                    class="min-h-[38px] rounded-lg bg-red-700 px-4 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                    @click="submitReviewDecision('revision')"
                  >
                    {{ busy ? 'Mengirim...' : `Kirim Revisi (Rev-${(wo.revision_count || 0) + 1})` }}
                  </button>
                  <button
                    type="button"
                    class="wo-btn-outline min-h-[38px] rounded-lg px-4 text-xs font-semibold"
                    @click="showRevisionForm = false"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>

            <!-- Lampiran Foto & Dokumen -->
            <div v-if="wo.photo_path || wo.photo_paths?.length || wo.completion_photo_path || wo.revision_photo_paths?.length || wo.request_document_path || wo.spl_document_path" class="wo-subtle-box rounded-xl border border-default p-4">
              <div class="mb-3 flex items-center justify-between gap-2">
                <h3 class="text-xs font-semibold text-muted">Lampiran Foto &amp; Dokumen</h3>
                <span v-if="attachments.loading" class="text-[11px] text-muted">Memuat lampiran...</span>
              </div>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div v-if="wo.photo_path || wo.photo_paths?.length" class="wo-surface flex flex-col justify-between gap-2 rounded-lg border border-default p-3" :class="{ 'sm:col-span-2': !wo.request_document_path }">
                  <div>
                    <p class="mb-2 text-xs font-semibold text-highlighted">
                      Foto Pengajuan / Kondisi ({{ (wo.photo_paths?.length || 1) }} foto)
                    </p>
                    <div :class="['grid gap-2', (wo.photo_paths?.length || 1) > 1 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1']">
                      <div
                        v-for="(_, idx) in (wo.photo_paths?.length ? wo.photo_paths : [wo.photo_path])"
                        :key="idx"
                        class="flex flex-col gap-1.5"
                      >
                        <img
                          v-if="attachments.photoUrls?.[idx]"
                          :src="attachments.photoUrls[idx]"
                          :alt="`Foto lampiran ${idx + 1}`"
                          class="h-36 w-full cursor-pointer rounded-lg border border-default object-cover"
                          @click="openAttachmentType('photo', idx)"
                        />
                        <div v-else class="flex h-28 items-center justify-center rounded-lg border border-default text-xs text-muted">
                          {{ attachments.loading ? 'Memuat...' : `Foto ${idx + 1}` }}
                        </div>
                        <button
                          type="button"
                          class="wo-btn-outline w-full rounded-lg px-2 py-1 text-[11px] font-semibold"
                          @click="openAttachmentType('photo', idx)"
                        >
                          Buka Foto {{ (wo.photo_paths?.length || 1) > 1 ? idx + 1 : 'Penuh' }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="wo.completion_photo_path" class="wo-surface flex flex-col justify-between gap-2 rounded-lg border border-default p-3">
                  <div>
                    <p class="mb-2 text-xs font-semibold text-highlighted">Foto Hasil Pekerjaan Teknisi</p>
                    <img
                      v-if="attachments.completionUrl"
                      :src="attachments.completionUrl"
                      alt="Foto hasil pekerjaan teknisi"
                      class="h-40 w-full cursor-pointer rounded-lg border border-default object-cover"
                      @click="openAttachmentType('completion')"
                    />
                    <div v-else class="flex h-28 items-center justify-center rounded-lg border border-default text-xs text-muted">
                      {{ attachments.loading ? 'Memuat foto...' : 'Klik tombol di bawah untuk membuka foto hasil' }}
                    </div>
                  </div>
                  <button
                    type="button"
                    class="wo-btn-outline w-full rounded-lg px-3 py-1.5 text-xs font-semibold"
                    @click="openAttachmentType('completion')"
                  >
                    Buka Foto Hasil
                  </button>
                </div>

                <div v-if="wo.revision_photo_paths?.length" class="wo-surface flex flex-col justify-between gap-2 rounded-lg border border-default p-3 sm:col-span-2">
                  <p class="text-xs font-semibold text-highlighted">
                    Foto Revisi Pemohon ({{ wo.revision_photo_paths.length }} foto)
                  </p>
                  <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div v-for="(_, idx) in wo.revision_photo_paths" :key="`rv-${idx}`" class="flex flex-col gap-1.5">
                      <img
                        v-if="attachments.revisionUrls?.[idx]"
                        :src="attachments.revisionUrls[idx]"
                        :alt="`Foto revisi ${idx + 1}`"
                        class="h-32 w-full cursor-pointer rounded-lg border border-default object-cover"
                        @click="openAttachmentType('revision', idx)"
                      />
                      <button
                        type="button"
                        class="wo-btn-outline w-full rounded-lg px-2 py-1 text-[11px] font-semibold"
                        @click="openAttachmentType('revision', idx)"
                      >
                        Buka Revisi #{{ idx + 1 }}
                      </button>
                    </div>
                  </div>
                </div>

                <div v-if="wo.request_document_path" class="wo-surface flex flex-col justify-between gap-2 rounded-lg border border-default p-3">
                  <div>
                    <p class="mb-2 text-xs font-semibold text-highlighted">Dokumen Pendukung</p>
                    <img
                      v-if="attachments.documentUrl && attachments.documentIsImage"
                      :src="attachments.documentUrl"
                      alt="Dokumen lampiran Work Order"
                      class="h-40 w-full cursor-pointer rounded-lg border border-default object-cover"
                      @click="openAttachmentType('document')"
                    />
                    <div v-else class="flex h-40 flex-col items-center justify-center gap-1 rounded-lg border border-default px-3 text-center">
                      <span class="wo-type-chip text-xs">PDF / DOKUMEN</span>
                      <span class="text-xs text-muted">Klik tombol di bawah untuk membuka atau mengunduh dokumen.</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="wo-btn-outline w-full rounded-lg px-3 py-1.5 text-xs font-semibold"
                    @click="openAttachmentType('document')"
                  >
                    Lihat / Unduh Dokumen
                  </button>
                </div>

                <div v-if="wo.spl_document_path" class="wo-surface flex flex-col justify-between gap-2 rounded-lg border border-default p-3 sm:col-span-2">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p class="text-xs font-semibold text-highlighted">Dokumen Form SPL (Finance)</p>
                      <p class="text-[11px] text-muted">Lampiran pengajuan biaya dari Admin GA ke Finance.</p>
                    </div>
                    <button
                      type="button"
                      class="wo-btn-outline rounded-lg px-3 py-1.5 text-xs font-semibold"
                      @click="openAttachmentType('spl')"
                    >
                      Lihat Form SPL
                    </button>
                  </div>
                  <img
                    v-if="attachments.splUrl && attachments.splIsImage"
                    :src="attachments.splUrl"
                    alt="Lampiran Form SPL"
                    class="mt-1 h-40 w-full cursor-pointer rounded-lg border border-default object-cover"
                    @click="openAttachmentType('spl')"
                  />
                </div>
              </div>
            </div>

            <div v-if="myPendingStage" class="wo-action-box rounded-xl p-4">
              <h3 class="text-sm font-bold text-highlighted">
                {{ myPendingStage === 'initial' ? 'Persetujuan Pengajuan Work Order' : 'Persetujuan RAB Material & Biaya' }}
              </h3>
              <p class="mt-1 text-xs text-muted">
                {{ myPendingStage === 'initial'
                  ? 'Setujui agar Work Order ini masuk ke antrian review Admin GA.'
                  : 'Tinjau rincian biaya RAB di bawah. Setujui untuk lanjut ke Finance (SPL), atau minta revisi ke GA.' }}
              </p>
              <textarea
                v-model="approvalComment"
                rows="2"
                placeholder="Catatan persetujuan atau alasan penolakan/revisi..."
                class="wo-input mt-2.5 w-full rounded-lg p-2.5 text-sm"
              />
              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  :disabled="busy"
                  class="min-h-[38px] rounded-lg bg-blue-700 px-4 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                  @click="submitDecision('approve')"
                >
                  {{ myPendingStage === 'initial' ? 'Setujui Work Order' : 'Setujui RAB' }}
                </button>
                <button
                  type="button"
                  :disabled="busy"
                  class="min-h-[38px] rounded-lg bg-red-700 px-4 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                  @click="submitDecision('reject')"
                >
                  {{ myPendingStage === 'initial' ? 'Tolak Work Order' : 'Minta Revisi RAB' }}
                </button>
              </div>
            </div>

            <div v-if="detail?.rab_items?.length" class="wo-subtle-box rounded-xl border border-default p-4">
              <h3 class="mb-2 text-sm font-bold text-highlighted">Rincian RAB (Total: Rp {{ formatRp(wo.rab_total) }})</h3>
              <div class="overflow-x-auto">
                <table class="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr class="wo-thead-row border-b border-default text-muted">
                      <th class="px-3 py-2">Item</th>
                      <th class="px-3 py-2">Qty</th>
                      <th class="px-3 py-2">Harga Satuan</th>
                      <th class="px-3 py-2">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[var(--ui-border)] tabular-nums">
                    <tr v-for="item in detail.rab_items" :key="item.id">
                      <td class="px-3 py-2 font-medium text-highlighted">{{ item.item_name }}</td>
                      <td class="px-3 py-2 text-muted">{{ formatQty(item.qty) }} {{ item.unit }}</td>
                      <td class="px-3 py-2 text-muted">Rp {{ formatRp(item.unit_price) }}</td>
                      <td class="px-3 py-2 font-semibold text-highlighted">Rp {{ formatRp(item.subtotal) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div v-if="initialApprovals.length || rabApprovals.length" class="wo-subtle-box space-y-3 rounded-xl border border-default p-4">
              <div v-if="initialApprovals.length">
                <h3 class="mb-2 text-xs font-semibold text-muted">Approval Pengajuan Awal</h3>
                <div class="flex flex-wrap gap-2">
                  <div v-for="a in initialApprovals" :key="a.id" class="inline-flex items-center gap-2 rounded-lg border border-default px-2.5 py-1 text-xs">
                    <span class="font-medium text-highlighted">{{ a.approver_name }}</span>
                    <span :class="['wo-pill', a.status === 'approved' ? 'wo-pill-ok' : a.status === 'rejected' ? 'wo-pill-err' : 'wo-pill-warn']">
                      {{ approvalStatusLabel(a.status) }}
                    </span>
                  </div>
                </div>
              </div>
              <div v-if="rabApprovals.length">
                <h3 class="mb-2 text-xs font-semibold text-muted">Approval RAB Biaya</h3>
                <div class="flex flex-wrap gap-2">
                  <div v-for="a in rabApprovals" :key="a.id" class="inline-flex items-center gap-2 rounded-lg border border-default px-2.5 py-1 text-xs">
                    <span class="font-medium text-highlighted">{{ a.approver_name }}</span>
                    <span :class="['wo-pill', a.status === 'approved' ? 'wo-pill-ok' : a.status === 'rejected' ? 'wo-pill-err' : 'wo-pill-warn']">
                      {{ approvalStatusLabel(a.status) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="wo-subtle-box rounded-xl border border-default p-4">
              <h3 class="mb-3 text-sm font-bold text-highlighted">Riwayat Progres Work Order</h3>
              <ul v-if="detail?.events?.length" class="space-y-3">
                <li v-for="ev in detail.events" :key="ev.id" class="border-l-2 border-blue-600 pl-3 text-xs">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-bold text-highlighted">{{ actionLabel(ev.action) }}</span>
                    <span class="font-semibold text-blue-600">
                      {{ ev.from_status ? `${statusLabel(ev.from_status)} → ` : '' }}{{ statusLabel(ev.to_status) }}
                    </span>
                    <span class="ml-auto text-muted tabular-nums">{{ ev.created_at }}</span>
                  </div>
                  <p class="mt-0.5 text-muted">
                    Oleh: {{ ev.actor_name || 'Sistem' }}<span v-if="ev.notes"> — "{{ ev.notes }}"</span>
                  </p>
                </li>
              </ul>
              <p v-else class="text-xs text-muted">Belum ada riwayat progres.</p>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wo-surface {
  background: var(--ui-bg, #ffffff);
  color: var(--ui-text, #334155);
}
.wo-toolbar,
.wo-thead-row,
.wo-subtle-box {
  background: var(--ui-bg-elevated, #f8fafc);
}
.wo-tr:hover {
  background: var(--ui-bg-accented, #eaf2ff);
}
.wo-input {
  background: var(--ui-bg, #ffffff);
  color: var(--ui-text-highlighted, #0f172a);
  border: 1px solid var(--ui-border-accented, #b8c7dc);
}
.wo-input:focus {
  outline: none;
  border-color: #2563eb;
}
.wo-btn-outline {
  background: var(--ui-bg, #ffffff);
  color: var(--ui-text-highlighted, #0f172a);
  border: 1px solid var(--ui-border-accented, #b8c7dc);
}
.wo-btn-outline:hover:not(:disabled) {
  background: var(--ui-bg-accented, #eaf2ff);
}
.wo-type-chip {
  border-radius: 4px;
  border: 1px solid var(--ui-border, #d6e0ee);
  background: var(--ui-bg-muted, #f3f7ff);
  padding: 1px 6px;
  font-weight: 600;
}
.wo-action-box {
  border: 1px solid rgba(37, 99, 235, 0.35);
  background: rgba(37, 99, 235, 0.08);
}
.wo-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 6px;
  border: 1px solid transparent;
  padding: 2px 9px;
  font-size: 12px;
  font-weight: 600;
}
.wo-pill-ok {
  background: rgba(16, 185, 129, 0.14);
  color: #059669;
  border-color: rgba(16, 185, 129, 0.35);
}
.wo-pill-info {
  background: rgba(37, 99, 235, 0.14);
  color: #2563eb;
  border-color: rgba(37, 99, 235, 0.35);
}
.wo-approver-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 9999px;
  border: 1px solid rgba(37, 99, 235, 0.32);
  background: rgba(37, 99, 235, 0.12);
  color: #2563eb;
  padding: 3px 6px 3px 10px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
}
.wo-approver-badge-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  color: inherit;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.wo-approver-badge-remove:hover {
  background: rgba(37, 99, 235, 0.22);
  color: #1d4ed8;
}
.wo-pill-warn {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.35);
}
.wo-pill-err {
  background: rgba(239, 68, 68, 0.14);
  color: #dc2626;
  border-color: rgba(239, 68, 68, 0.35);
}
.wo-banner {
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13.5px;
  font-weight: 500;
  border: 1px solid transparent;
}
.wo-banner-ok {
  background: rgba(16, 185, 129, 0.14);
  color: #059669;
  border-color: rgba(16, 185, 129, 0.35);
}
.wo-banner-warn {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.35);
}
.wo-banner-err {
  background: rgba(239, 68, 68, 0.14);
  color: #dc2626;
  border-color: rgba(239, 68, 68, 0.35);
}
</style>
