<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import VuePdfEmbed from 'vue-pdf-embed'
import {
  getHrCandidates,
  createHrCandidate,
  updateHrCandidate,
  getHrVacancies,
  uploadHrCandidateResume,
  getHrCandidateResumePreview,
  getHrCandidateDetail,
  uploadHrCandidatePhoto,
  uploadHrCandidateOffering,
  getHrCandidateOfferingPreview,
  lockHrCandidateInterview,
  sendHrCandidateInterviewerWa,
  sendHrCandidateInterviewWa,
  scheduleHrCandidateInterview,
  completeHrCandidateInterview,
  uploadHrCandidateInterviewSummary,
  getHrInterviewSummaryPreview,
  sendHrCandidateCaseStudy,
  uploadHrCandidateCaseStudySubmission,
  getCaseStudySubmissionPreview,
  scheduleUserInterviewRound,
  completeUserInterviewRound,
  saveUserInterviewRoundEvaluation,
  uploadUserInterviewRoundSummary,
  sendUserInterviewEvaluationWa,
  sendUserInterviewCandidateWa,
  getEvaluationReportPreview,
  sendReferenceCheckRequest,
  sendReferenceCheckWa,
  previewReferenceCheckSummary,
  getUserInterviewSummaryPreview,
  getUserInterviewEvaluationRecapPreview,
  getPkbApprovalRecapPreview,
  uploadReferenceCheckSummary,
  sendOfferingLetterWithSignature,
  sendOfferingLetterWa,
  sendPkbApprovalRequest,
  resendPkbSignerWa,
  sendOnboardingFormLink,
  sendOnboardingWa,
  sendHrCandidateCaseStudyWa,
  importOnboarding,
  saveOnboardingDraft,
  getMasterPositionTitles,
  getMasterDivisions,
  getMasterDepartments,
  getMasterUnits,
} from '../services/hrService'
import { getEmployees } from '../services/employeeService'
import { apiError, formatDate, formatDateTime } from '../utils/formatters'
import { toYMD } from '../utils/formatters'
import { notifier } from '../utils/notifications'

const route = useRoute()

const candidates = ref([])
const vacancies = ref([])
const selectedVacancyFilter = ref(route.query.vacancy_id ? String(route.query.vacancy_id) : '')
const selectedStatusFilters = ref(route.query.status ? [String(route.query.status)] : [])
const selectedPicFilter = ref('')
const search = ref('')
const message = ref('')
const errorMessage = ref('')
const lastClickedBtn = ref('')
const viewMode = ref('pipeline') // 'pipeline' or 'table'
const isSubmitting = ref(false)
const loadingDocument = ref(false)
const minimumScreenWidth = 1080
const currentTimestamp = ref(Date.now())
const interviewCompletionDelayMs = 60 * 60 * 1000
let interviewAvailabilityTimer = null

const minimumInterviewDate = computed(() => {
  const now = new Date(currentTimestamp.value)
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

const minimumInterviewTime = computed(() => {
  const now = new Date(currentTimestamp.value)
  const nextMinute = new Date(currentTimestamp.value + 60_000)
  if (nextMinute.toDateString() !== now.toDateString()) return '23:59'
  return `${String(nextMinute.getHours()).padStart(2, '0')}:${String(nextMinute.getMinutes()).padStart(2, '0')}`
})

// Master data for onboarding form dropdowns
const masterPositionTitles = ref([])
const masterDivisions = ref([])
const masterDepartments = ref([])
const masterUnits = ref([])
const masterDataLoaded = ref(false)
const isLargeScreen = ref(
  globalThis.matchMedia?.(`(min-width: ${minimumScreenWidth}px)`).matches ?? true,
)
let largeScreenMediaQuery = null

const documentPreview = reactive({
  open: false,
  title: '',
  url: '',
})

const createDialogOpen = ref(false)
const editDialogOpen = ref(false)
const onboardingVerificationModalOpen = ref(false)
const importConfirmationModalOpen = ref(false)
const importDataChecked = ref(false)
const interviewCompletionConfirmation = reactive({
  open: false,
  type: '',
  round: null,
  title: '',
  description: '',
  date: '',
  time: '',
  endTime: '',
})

const form = reactive({
  vacancy_id: '',
  name: '',
  email: '',
  phone: '',
  status: 'applied',
  expected_salary: '',
  previous_salary: '',
  education_level: '',
  education_major: '',
  marital_status: '',
  known_person: '',
  referred_from: '',
  pic_nik: '',
  last_company: '',
})

const editForm = reactive({
  id: null,
  vacancy_id: '',
  name: '',
  email: '',
  phone: '',
  notes: '',
  expected_salary: '',
  previous_salary: '',
  education_level: '',
  education_major: '',
  marital_status: '',
  known_person: '',
  referred_from: '',
  pic_nik: '',
  last_company: '',
})

const stages = [
  { key: 'applied', label: 'Applied', color: 'neutral', icon: 'i-lucide-file-user' },
  { key: 'screening', label: 'Screening', color: 'sky', icon: 'i-lucide-search-check' },
  { key: 'interview_hr', label: 'Wawancara HR', color: 'purple', icon: 'i-lucide-messages-square' },
  { key: 'case_study', label: 'Case Study', color: 'orange', icon: 'i-lucide-clipboard-list' },
  { key: 'interview_user', label: 'Wawancara User', color: 'indigo', icon: 'i-lucide-users-round' },
  { key: 'reference_check', label: 'Reference Check', color: 'teal', icon: 'i-lucide-phone-call' },
  { key: 'offering', label: 'Offering Letter', color: 'pink', icon: 'i-lucide-mail' },
  { key: 'pkb', label: 'Persetujuan PKB', color: 'amber', icon: 'i-lucide-file-signature' },
  { key: 'hired', label: 'Hired & Onboarding', color: 'success', icon: 'i-lucide-badge-check' },
  { key: 'rejected', label: 'Rejected', color: 'danger', icon: 'i-lucide-circle-x' },
]

function getStageClass(status) {
  return status ? status.toLowerCase() : 'applied'
}

const formControlClass =
  'w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

const onboardingFormControlClass =
  'w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-bg)] px-3 py-1.5 text-[var(--ui-text-highlighted)] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:bg-[var(--ui-bg-muted)] disabled:text-[var(--ui-text-dimmed)]'

const filteredCandidates = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return candidates.value.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(keyword) ||
      c.email.toLowerCase().includes(keyword) ||
      (c.phone || '').toLowerCase().includes(keyword)

    const matchesVacancy =
      !selectedVacancyFilter.value || Number(c.vacancy_id) === Number(selectedVacancyFilter.value)
    const matchesStatus =
      !selectedStatusFilters.value.length || selectedStatusFilters.value.includes(c.status)
    const matchesPic = !selectedPicFilter.value || c.pic_nik === selectedPicFilter.value

    return matchesSearch && matchesVacancy && matchesStatus && matchesPic
  })
})

const candidatesByStage = computed(() => {
  const grouped = {}
  stages.forEach((s) => {
    grouped[s.key] = []
  })
  filteredCandidates.value.forEach((c) => {
    if (grouped[c.status]) {
      grouped[c.status].push(c)
    }
  })
  return grouped
})

const employees = ref([])
const selectedCandidateDetails = ref(null)
const changeLogs = ref([])
const isAuditLogsExpanded = ref(false)
const loadingDetails = ref(false)

const activeCandidate = computed(() => {
  return selectedCandidateDetails.value || selectedCandidate.value
})

const viewedStageKey = ref(null)
const displayedStageKey = computed(
  () => viewedStageKey.value || activeCandidate.value?.status || '',
)
const isViewingHistoricalStage = computed(() =>
  Boolean(viewedStageKey.value && viewedStageKey.value !== activeCandidate.value?.status),
)

const onboardingPublicLink = computed(() => {
  const token = activeCandidate.value?.onboarding_token
  if (!token) return ''

  return `${globalThis.location?.origin || ''}/public/onboarding/${token}`
})

const formattedEmployees = computed(() => {
  const allowedLevels = [
    'leader',
    'spv',
    'supervisor',
    'asst manager',
    'assistant manager',
    'manager',
    'gm',
    'general manager',
  ]

  return employees.value
    .filter((emp) => {
      const position = (emp.position || emp.jabatan || '').toLowerCase().trim()
      return allowedLevels.some((level) => position.includes(level))
    })
    .map((emp) => {
      const deptInfo = emp.department ? ` - ${emp.department}` : ''
      const divInfo = emp.divisi || emp.division ? ` / ${emp.divisi || emp.division}` : ''
      return {
        nik: emp.nik,
        label: `${emp.nik} - ${emp.name || emp.nama_karyawan} (${emp.position || emp.jabatan || '-'}${deptInfo}${divInfo})`,
      }
    })
})

const hrbpStaffEmployees = computed(() => {
  return employees.value
    .filter((emp) => {
      const dept = (emp.department || '').toLowerCase().trim()
      const level = (emp.level || emp.position || '').toLowerCase().trim()
      return dept === 'hrbp' && level.includes('staff')
    })
    .map((emp) => {
      return {
        nik: emp.nik,
        name: emp.name,
        label: `${emp.nik} - ${emp.name} (${emp.position || '-'})`,
      }
    })
})

async function load() {
  try {
    const [cRes, vRes, eRes] = await Promise.all([
      getHrCandidates(),
      getHrVacancies(),
      getEmployees(),
    ])
    candidates.value = cRes.data
    vacancies.value = vRes.data
    employees.value = eRes.data.data ?? []

    // If there is an active candidate, refresh their details
    if (activeCandidate.value) {
      await selectCandidate(activeCandidate.value)
    }
  } catch (error) {
    errorMessage.value = apiError(error)
  }
}

async function loadMasterData() {
  if (masterDataLoaded.value) return
  try {
    const [ptRes, divRes, deptRes, unitRes] = await Promise.all([
      getMasterPositionTitles(),
      getMasterDivisions(),
      getMasterDepartments(),
      getMasterUnits(),
    ])
    masterPositionTitles.value = ptRes.data.filter((i) => i.is_active)
    masterDivisions.value = divRes.data.filter((i) => i.is_active)
    masterDepartments.value = deptRes.data.filter((i) => i.is_active)
    masterUnits.value = unitRes.data.filter((i) => i.is_active)
    masterDataLoaded.value = true
  } catch (e) {
    // non-critical, ignore silently
  }
}

const createCandidateCvFile = ref(null)

function handleCreateCandidateCvChange(event) {
  createCandidateCvFile.value = event.target.files[0]
}

function openCreateDialog() {
  Object.assign(form, {
    vacancy_id: selectedVacancyFilter.value || '',
    name: '',
    email: '',
    phone: '',
    status: 'applied',
    expected_salary: '',
    previous_salary: '',
    education_level: '',
    education_major: '',
    marital_status: '',
    known_person: '',
    referred_from: '',
    pic_nik: '',
  })
  createCandidateCvFile.value = null
  createDialogOpen.value = true
}

function closeCreateDialog() {
  createDialogOpen.value = false
}

async function saveCandidate() {
  if (isSubmitting.value) return
  if (!createCandidateCvFile.value) {
    errorMessage.value = 'Silakan unggah CV / Resume pelamar (Wajib).'
    return
  }

  isSubmitting.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const formData = new FormData()
    formData.append('vacancy_id', form.vacancy_id || '')
    formData.append('name', form.name)
    formData.append('email', form.email)
    formData.append('phone', form.phone)
    formData.append('status', form.status)
    formData.append('expected_salary', form.expected_salary ? Number(form.expected_salary) : '')
    formData.append('previous_salary', form.previous_salary ? Number(form.previous_salary) : '')
    formData.append('education_level', form.education_level)
    formData.append('education_major', form.education_major)
    formData.append('marital_status', form.marital_status)
    formData.append('known_person', form.known_person || '')
    formData.append('referred_from', form.referred_from || '')
    formData.append('pic_nik', form.pic_nik)
    formData.append('last_company', form.last_company || '')
    formData.append('resume', createCandidateCvFile.value)

    const response = await createHrCandidate(formData)
    message.value = response.data.message || 'Kandidat berhasil ditambahkan.'
    closeCreateDialog()
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    isSubmitting.value = false
  }
}

function openEditDialog(candidate) {
  Object.assign(editForm, {
    id: candidate.id,
    vacancy_id: candidate.vacancy_id || '',
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone || '',
    notes: candidate.notes || '',
    expected_salary: candidate.expected_salary || '',
    previous_salary: candidate.previous_salary || '',
    education_level: candidate.education_level || '',
    education_major: candidate.education_major || '',
    marital_status: candidate.marital_status || '',
    known_person: candidate.known_person || '',
    referred_from: candidate.referred_from || '',
    pic_nik: candidate.pic_nik || '',
    last_company: candidate.last_company || '',
  })
  editDialogOpen.value = true
}

function closeEditDialog() {
  editDialogOpen.value = false
}

async function updateCandidate() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const candidateStatus =
      candidates.value.find((candidate) => candidate.id === editForm.id)?.status ||
      activeCandidate.value?.status
    const response = await updateHrCandidate(editForm.id, {
      vacancy_id: editForm.vacancy_id || null,
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      status: candidateStatus,
      notes: editForm.notes,
      expected_salary: editForm.expected_salary ? Number(editForm.expected_salary) : null,
      previous_salary: editForm.previous_salary ? Number(editForm.previous_salary) : null,
      education_level: editForm.education_level,
      education_major: editForm.education_major,
      marital_status: editForm.marital_status,
      known_person: editForm.known_person,
      referred_from: editForm.referred_from,
      pic_nik: editForm.pic_nik,
      last_company: editForm.last_company,
    })
    message.value = response.data.message || 'Kandidat berhasil diperbarui.'
    closeEditDialog()
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    isSubmitting.value = false
  }
}

const updatingStage = ref(false)

async function updateStage(candidate, newStage) {
  if (newStage === 'interview_hr') {
    openHrInterviewModal()
    return
  }
  if (newStage === 'interview_user') {
    openUserInterviewModal(1)
    return
  }
  if (updatingStage.value) return
  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    await updateHrCandidate(candidate.id, {
      vacancy_id: candidate.vacancy_id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      status: newStage,
      notes: candidate.notes,
      expected_salary: candidate.expected_salary,
    })
    await load()
    message.value = `Status ${candidate.name} berhasil diperbarui menjadi ${getStageLabel(newStage)}.`
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal memperbarui tahapan kandidat.')
  } finally {
    updatingStage.value = false
  }
}

async function triggerResumeUpload(event, candidate) {
  const file = event.target.files[0]
  if (!file) return

  const formData = new FormData()
  formData.append('resume', file)

  isSubmitting.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const response = await uploadHrCandidateResume(candidate.id, formData)
    message.value = response.data.message || 'Resume berhasil diunggah.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    isSubmitting.value = false
  }
}

function pdfBlobUrl(contentBase64, mimeType) {
  const bytes = Uint8Array.from(atob(contentBase64), (character) => character.charCodeAt(0))
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }))
}

function downloadPreviewResponse(response) {
  const url = pdfBlobUrl(response.data.content_base64, response.data.mime_type)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = response.data.filename || 'dokumen'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function openDocumentInNewTab(path) {
  globalThis.open(`/storage/${path}`, '_blank', 'noopener,noreferrer')
}

function closeDocumentPreview() {
  if (documentPreview.url) {
    URL.revokeObjectURL(documentPreview.url)
  }
  Object.assign(documentPreview, { open: false, title: '', url: '' })
}

async function previewResume(candidate) {
  closeDocumentPreview()
  Object.assign(documentPreview, {
    open: true,
    title: `Resume - ${candidate.name}`,
    url: '',
  })
  loadingDocument.value = true
  try {
    const response = await getHrCandidateResumePreview(candidate.id)
    documentPreview.url = pdfBlobUrl(response.data.content_base64, response.data.mime_type)
  } catch (error) {
    closeDocumentPreview()
    errorMessage.value = apiError(error, 'Dokumen resume tidak dapat ditampilkan.')
  } finally {
    loadingDocument.value = false
  }
}

const selectedCandidateId = ref(null)

const selectedCandidate = computed(() => {
  if (!filteredCandidates.value.length) return null
  const selected = filteredCandidates.value.find((c) => c.id === selectedCandidateId.value)
  return selected || filteredCandidates.value[0]
})

const stepperLabelOverrides = {
  reference_check: 'Reference',
  offering: 'Offering',
  pkb: 'PKB',
  hired: 'Hired & Onboard',
}

const stepperStages = stages
  .filter((stage) => stage.key !== 'rejected')
  .map((stage) => ({
    ...stage,
    label: stepperLabelOverrides[stage.key] || stage.label,
  }))

const currentStageIndex = computed(() => {
  if (!activeCandidate.value) return -1
  if (activeCandidate.value.status === 'rejected') return -1
  return stepperStages.findIndex((s) => s.key === activeCandidate.value.status)
})

const displayedStageLabel = computed(
  () =>
    stepperStages.find((stage) => stage.key === displayedStageKey.value)?.label ||
    displayedStageKey.value,
)

const maxSalary = computed(() => {
  if (!activeCandidate.value) return 1
  const prev = Number(activeCandidate.value.previous_salary || 0)
  const exp = Number(activeCandidate.value.expected_salary || 0)
  const off = Number(activeCandidate.value.offered_salary || 0)
  return Math.max(prev, exp, off, 1)
})

const salaryComparisonMessage = computed(() => {
  if (!activeCandidate.value) return ''
  const prev = Number(activeCandidate.value.previous_salary || 0)
  const exp = Number(activeCandidate.value.expected_salary || 0)
  const off = Number(activeCandidate.value.offered_salary || 0)

  if (!off) return ''

  let messages = []
  if (prev > 0) {
    const diffPrev = off - prev
    const pctPrev = Math.round((diffPrev / prev) * 100)
    if (pctPrev > 0) {
      messages.push(`Ditawarkan ${pctPrev}% di atas gaji saat ini`)
    } else if (pctPrev < 0) {
      messages.push(`Ditawarkan ${Math.abs(pctPrev)}% di bawah gaji saat ini`)
    } else {
      messages.push(`Ditawarkan sama dengan gaji saat ini`)
    }
  }

  if (exp > 0) {
    const diffExp = off - exp
    const pctExp = Math.round((diffExp / exp) * 100)
    if (pctExp > 0) {
      messages.push(`${pctExp}% di atas ekspektasi kandidat`)
    } else if (pctExp < 0) {
      messages.push(`${Math.abs(pctExp)}% di bawah ekspektasi kandidat`)
    } else {
      messages.push(`sama dengan ekspektasi kandidat`)
    }
  }

  return messages.join(', ')
})

function viewPipelineStage(stage, index) {
  if (activeCandidate.value?.status === 'rejected' || index > currentStageIndex.value) return
  viewedStageKey.value = stage.key === activeCandidate.value?.status ? null : stage.key
}

function getAvatarStyle(name) {
  const colors = [
    { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', text: 'text-blue-600' },
    { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', text: 'text-amber-600' },
    { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', text: 'text-emerald-600' },
    { bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', text: 'text-purple-600' },
    { bg: 'bg-pink-500/10 text-pink-600 dark:text-pink-400', text: 'text-pink-600' },
    { bg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400', text: 'text-teal-600' },
    { bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', text: 'text-rose-600' },
    { bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400', text: 'text-indigo-600' },
  ]
  let hash = 0
  const cleanName = name || ''
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  return colors[index]
}

function getInitials(name) {
  if (!name) return ''
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatSalaryInput(value) {
  if (value === null || value === undefined || value === '') return ''
  const clean = String(value).replace(/\D/g, '')
  if (!clean) return ''
  return Number(clean).toLocaleString('id-ID')
}

function parseSalaryInput(formattedValue) {
  if (!formattedValue) return ''
  return formattedValue.replace(/\D/g, '')
}

function getCandidateSource(candidate) {
  if (!candidate) return '-'
  if (candidate.referred_from) return candidate.referred_from
  const notes = (candidate.notes || '').toLowerCase()
  if (notes.includes('linkedin')) return 'LinkedIn'
  if (notes.includes('jobstreet')) return 'JobStreet'
  if (notes.includes('indeed')) return 'Indeed'
  if (notes.includes('instagram')) return 'Instagram'
  if (notes.includes('website')) return 'Website Resmi'
  return 'Lainnya / Umum'
}

function getCandidatePic(candidate) {
  if (!candidate) return '-'
  const notes = candidate.notes || ''
  const match = notes.match(/pic:\s*([^\n\r]+)/i)
  if (match) return match[1].trim()
  return 'Tim HRD'
}

const nextStageMap = {
  applied: { key: 'screening', label: 'Screening' },
  screening: { key: 'interview_hr', label: 'Wawancara HR' },
  interview_hr: { key: 'interview_user', label: 'Wawancara User' },
  case_study: { key: 'interview_user', label: 'Wawancara User' },
  interview_user: { key: 'reference_check', label: 'Reference Check' },
  reference_check: { key: 'offering', label: 'Offering' },
  offering: { key: 'pkb', label: 'Persetujuan PKB' },
  pkb: { key: 'hired', label: 'Hired & Onboarding' },
}

const nextStage = computed(() => {
  if (!selectedCandidate.value) return null
  return nextStageMap[selectedCandidate.value.status] || null
})

async function promoteCandidate() {
  if (!selectedCandidate.value || !nextStage.value) return
  await updateStage(selectedCandidate.value, nextStage.value.key)
}

async function rejectCandidate() {
  if (!selectedCandidate.value) return
  await updateStage(selectedCandidate.value, 'rejected')
}

async function restoreCandidate() {
  if (!selectedCandidate.value) return
  await updateStage(selectedCandidate.value, 'applied')
}

async function selectCandidate(candidate) {
  if (!candidate) return
  viewedStageKey.value = null
  selectedCandidateId.value = candidate.id
  loadingDetails.value = true
  isAuditLogsExpanded.value = false
  try {
    const res = await getHrCandidateDetail(candidate.id)
    selectedCandidateDetails.value = res.data.candidate
    changeLogs.value = res.data.change_logs

    let obData = res.data.candidate?.onboarding_data
    if (obData && typeof obData === 'string') {
      try {
        obData = JSON.parse(obData)
      } catch (e) {
        console.error('Failed parsing onboarding_data JSON string:', e)
      }
    }
    const data = obData || {}

    onboardingEditForm.nik = res.data.candidate.employee_nik || data.nik || ''
    onboardingEditForm.pin = data.pin || ''
    onboardingEditForm.nama_karyawan = data.nama_karyawan || res.data.candidate.name || ''
    onboardingEditForm.email = data.email || res.data.candidate.email || ''
    onboardingEditForm.no_hp = data.no_hp || res.data.candidate.phone || ''
    onboardingEditForm.tanggal_lahir = data.tanggal_lahir || ''
    onboardingEditForm.jenis_kelamin = data.jenis_kelamin || ''
    onboardingEditForm.alamat = data.alamat || ''
    onboardingEditForm.tempat_lahir = data.tempat_lahir || ''
    onboardingEditForm.no_ktp = data.no_ktp || ''
    onboardingEditForm.agama = data.agama || ''
    onboardingEditForm.kewarganegaraan = data.kewarganegaraan || 'Indonesia'
    onboardingEditForm.status_pernikahan = data.status_pernikahan || ''
    onboardingEditForm.golongan_darah = data.golongan_darah || ''
    onboardingEditForm.nama_pasangan = data.nama_pasangan || ''
    onboardingEditForm.jumlah_anak = data.jumlah_anak || 0
    onboardingEditForm.nama_anak_1 = data.nama_anak_1 || ''
    onboardingEditForm.nama_anak_2 = data.nama_anak_2 || ''
    onboardingEditForm.nama_anak_3 = data.nama_anak_3 || ''
    onboardingEditForm.no_npwp = data.no_npwp || ''
    onboardingEditForm.no_bpjs = data.no_bpjs || ''
    onboardingEditForm.bank = data.bank || ''
    onboardingEditForm.no_rekening = data.no_rekening || ''
    onboardingEditForm.pendidikan_terakhir = data.pendidikan_terakhir || ''
    onboardingEditForm.nama_institusi = data.nama_institusi || ''
    onboardingEditForm.jurusan = data.jurusan || ''
    onboardingEditForm.nama_ayah = data.nama_ayah || ''
    onboardingEditForm.nama_ibu = data.nama_ibu || ''
    onboardingEditForm.kontak_darurat_nama = data.kontak_darurat_nama || ''
    onboardingEditForm.kontak_darurat_hubungan = data.kontak_darurat_hubungan || ''
    onboardingEditForm.kontak_darurat_no_hp = data.kontak_darurat_no_hp || ''

    onboardingEditForm.status_karyawan = data.status_karyawan || 'kontrak'
    onboardingEditForm.join_date =
      toYMD(res.data.candidate.join_date) || toYMD(data.join_date) || ''
    onboardingEditForm.end_date = data.end_date || ''
    onboardingEditForm.jabatan = data.jabatan || res.data.candidate.vacancy?.title || ''
    onboardingEditForm.posisi_level = data.posisi_level || ''
    onboardingEditForm.posisi_title = data.posisi_title || ''
    onboardingEditForm.posisi =
      data.posisi || [data.posisi_level, data.posisi_title].filter(Boolean).join(' ') || ''
    onboardingEditForm.divisi = data.divisi || ''
    onboardingEditForm.departement =
      data.departement || res.data.candidate.vacancy?.department || ''
    onboardingEditForm.unit = data.unit || res.data.candidate.vacancy?.unit || ''
    onboardingEditForm.atasan_langsung = data.atasan_langsung || ''
    onboardingEditForm.atasan_tidak_langsung = data.atasan_tidak_langsung || ''
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal memuat detail pelamar.')
  } finally {
    loadingDetails.value = false
  }
}

function getStageIndex(status) {
  return stepperStages.findIndex((s) => s.key === status)
}

function getStageBadgeColor(status) {
  const stage = stages.find((s) => s.key === status)
  return stage ? stage.color : 'neutral'
}

function getStageLabel(status) {
  if (status === 'rejected') return 'Rejected'
  const s = stepperStages.find((st) => st.key === status)
  return s ? s.label : status
}

const interviewModalOpen = ref(false)
const interviewForm = reactive({
  candidate_id: null,
  interview_date: '',
  interview_time: '',
  interviewer_nik: '',
  interview_type: 'online',
  interview_location: '',
  interview_meet_link: '',
})

function openInterviewModal(candidate) {
  interviewForm.candidate_id = candidate.id
  interviewForm.interview_date = candidate.interview_date || ''
  interviewForm.interview_time = candidate.interview_time
    ? candidate.interview_time.substring(0, 5)
    : ''
  interviewForm.interviewer_nik = candidate.interviewer_nik || ''
  interviewForm.interview_type = candidate.interview_type || 'online'
  interviewForm.interview_location = candidate.interview_location || ''
  interviewForm.interview_meet_link = candidate.interview_meet_link || ''
  interviewModalOpen.value = true
}

async function saveInterviewSchedule() {
  const candidate = filteredCandidates.value.find((c) => c.id === interviewForm.candidate_id)
  if (!candidate) return

  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const payload = {
      vacancy_id: candidate.vacancy_id || null,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      status: 'interview',
      notes: candidate.notes,
      expected_salary: candidate.expected_salary ? Number(candidate.expected_salary) : null,
      interview_date: interviewForm.interview_date || null,
      interview_time: interviewForm.interview_time || null,
      interviewer_nik: interviewForm.interviewer_nik || null,
      interview_type: interviewForm.interview_type || null,
      interview_location: interviewForm.interview_location || null,
      interview_meet_link: interviewForm.interview_meet_link || null,
    }
    await updateHrCandidate(candidate.id, payload)
    interviewModalOpen.value = false
    await load()
    if (selectedCandidateId.value === candidate.id) {
      await selectCandidate(candidate)
    }
    message.value = `Jadwal interview untuk ${candidate.name} berhasil disimpan.`
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal menyimpan jadwal interview.')
  } finally {
    updatingStage.value = false
  }
}

const offeringModalOpen = ref(false)
const offeringLastCompany = ref('')
const offeringOfferedSalary = ref('')
const offeringJoinDate = ref('')

function openOfferingModal(candidate) {
  offeringLetterFile.value = null
  offeringLastCompany.value = candidate.last_company ?? ''
  offeringOfferedSalary.value = candidate.offered_salary
    ? Number(candidate.offered_salary).toLocaleString('id-ID')
    : ''
  offeringJoinDate.value = candidate.join_date ? candidate.join_date.substring(0, 10) : ''
  offeringModalOpen.value = true
}

async function lockInterviewSchedule() {
  if (!activeCandidate.value) return
  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    await lockHrCandidateInterview(activeCandidate.value.id)
    await load()
    if (activeCandidate.value) {
      await selectCandidate(activeCandidate.value)
    }
    message.value =
      'Jadwal interview berhasil dikunci dan undangan email telah dikirim ke kandidat.'
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengunci jadwal interview.')
  } finally {
    updatingStage.value = false
  }
}

async function sendInterviewerWaInvitation() {
  if (!activeCandidate.value) return
  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    await sendHrCandidateInterviewerWa(activeCandidate.value.id)
    await load()
    if (activeCandidate.value) {
      await selectCandidate(activeCandidate.value)
    }
    message.value = 'Undangan WhatsApp berhasil dikirim ke pewawancara.'
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengirim undangan WhatsApp ke pewawancara.')
  } finally {
    updatingStage.value = false
  }
}

async function uploadPhoto(event) {
  const file = event.target.files[0]
  if (!file || !activeCandidate.value) return

  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const formData = new FormData()
    formData.append('photo', file)

    await uploadHrCandidatePhoto(activeCandidate.value.id, formData)
    await load()
    if (activeCandidate.value) {
      await selectCandidate(activeCandidate.value)
    }
    message.value = 'Foto profil pelamar berhasil diperbarui.'
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal memperbarui foto profil.')
  } finally {
    updatingStage.value = false
  }
}

function formatLogChanges(changes) {
  if (!Array.isArray(changes)) return ''
  const readableKeys = {
    status: 'Status',
    email: 'Email',
    phone: 'No. HP',
    expected_salary: 'Ekspektasi Gaji',
    interview_date: 'Tanggal Interview',
    interview_time: 'Waktu Interview',
    interviewer_nik: 'NIK Pewawancara',
    interview_type: 'Tipe Interview',
    interview_location: 'Lokasi Interview',
    interview_meet_link: 'Link Meet',
    interview_is_locked: 'Jadwal Dikunci',
    offering_letter_path: 'Surat Penawaran',
    resume_path: 'Resume/CV',
    name: 'Nama',
    notes: 'Catatan',
  }
  return changes
    .map((change) => {
      const fieldName = change.field
      const label = readableKeys[fieldName] || change.label || fieldName
      const oldVal =
        change.old !== null && change.old !== undefined && change.old !== '' ? change.old : '-'
      const newVal =
        change.new !== null && change.new !== undefined && change.new !== '' ? change.new : '-'
      return `${label}: "${oldVal}" → "${newVal}"`
    })
    .join(', ')
}

function getReadableFieldLabel(change) {
  if (!change) return ''
  const readableKeys = {
    status: 'Status/Tahap',
    email: 'Email',
    phone: 'No. HP',
    expected_salary: 'Gaji Diharapkan',
    previous_salary: 'Gaji Saat Ini',
    offered_salary: 'Gaji Ditawarkan',
    interview_date: 'Tanggal Wawancara',
    interview_time: 'Waktu Wawancara',
    interviewer_nik: 'NIK Pewawancara',
    interview_type: 'Tipe Wawancara',
    interview_location: 'Lokasi Wawancara',
    interview_meet_link: 'Link Meet',
    interview_is_locked: 'Jadwal Wawancara Dikunci',
    offering_letter_path: 'Surat Penawaran (Offering)',
    resume_path: 'Dokumen CV',
    name: 'Nama Lengkap',
    notes: 'Catatan',
    vacancy_id: 'Lowongan',
    pic_nik: 'PIC Screening',
    education_level: 'Pendidikan Terakhir',
    education_major: 'Jurusan',
    marital_status: 'Status Pernikahan',
    known_person: 'Orang Dikenal di Hompimplay',
    referred_from: 'Sumber Lamaran',
    join_date: 'Tanggal Mulai Kerja',
    reference_check_email_sent_at: 'Kirim Email Permintaan Referensi',
    reference_check_summary_path: 'Upload Summary Reference Check',
    case_study_sent_at: 'Kirim Soal Case Study',
    case_study_submitted_at: 'Kandidat Mengirim Jawaban Case Study',
    case_study_document_path: 'Upload Soal Case Study',
    case_study_submitted_file_path: 'Upload Jawaban Case Study oleh Kandidat',
    interview_hr_summary_path: 'Upload Summary Wawancara HR',
    onboarding_signed_file_path: 'Upload Dokumen Onboarding',
  }
  const fieldName = change.field || ''
  return readableKeys[fieldName] || change.label || fieldName
}

function formatChangeValue(field, value) {
  if (value === null || value === undefined || value === '' || value === '-') {
    return '(Kosong)'
  }

  // Format Salary fields
  if (['expected_salary', 'previous_salary', 'offered_salary'].includes(field)) {
    return 'Rp ' + Number(value).toLocaleString('id-ID')
  }

  // Format File Paths
  if (field.endsWith('_path') || field.endsWith('_file_path')) {
    return 'Sudah diunggah'
  }

  // Format Date Timestamps
  if (field.endsWith('_at')) {
    try {
      if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
        return formatDateTime(value)
      }
    } catch (e) {}
  }

  // Format Resume/CV path
  if (field === 'resume_path' && typeof value === 'string' && value.includes('/')) {
    return 'File CV'
  }

  // Format Status fields
  if (field === 'status') {
    return getStageLabel(value)
  }

  // Format Vacancy ID
  if (field === 'vacancy_id') {
    const v = vacancies.value.find((v) => Number(v.id) === Number(value))
    return v ? v.title : `Lowongan ID: ${value}`
  }

  return value
}

function filteredLogChanges(changes) {
  if (!Array.isArray(changes)) return []
  const ignoredFields = ['id', 'created_at', 'updated_at', 'deleted_at']
  return changes.filter((change) => {
    const field = change.field || ''
    if (ignoredFields.includes(field)) return false

    // Ignore system fields: tokens and passwords
    if (field.endsWith('_token') || field.endsWith('_password')) {
      return false
    }

    // Ignore WhatsApp notification logs (date/time/type of WA sent)
    if (field.includes('_wa_sent_') || field.endsWith('_wa_sent_at') || field.includes('wa_sent')) {
      return false
    }

    return true
  })
}

function getParsedChanges(changes) {
  if (!changes) return []
  if (Array.isArray(changes)) return changes
  if (typeof changes === 'string') {
    try {
      const parsed = JSON.parse(changes)
      if (Array.isArray(parsed)) return parsed
    } catch (e) {
      // Return empty or fallback
    }
  }
  return []
}

async function previewOfferingLetterDoc(candidate) {
  if (!candidate.offering_letter_path) return
  loadingDocument.value = true
  documentPreview.open = true
  documentPreview.title = `Offering Letter - ${candidate.name}`
  documentPreview.url = ''
  try {
    const res = await getHrCandidateOfferingPreview(candidate.id)
    const base64 = res.data.content_base64
    documentPreview.url = `data:application/pdf;base64,${base64}`
  } catch (error) {
    closeDocumentPreview()
    errorMessage.value = apiError(error, 'Dokumen offering letter tidak dapat ditampilkan.')
  } finally {
    loadingDocument.value = false
  }
}

const recruitmentStageOrder = [
  'applied',
  'screening',
  'interview_hr',
  'case_study',
  'interview_user',
  'reference_check',
  'offering',
  'pkb',
  'hired',
]

const previousStageDocuments = computed(() => {
  const candidate = activeCandidate.value
  if (!candidate) return []

  const currentStageIndex = recruitmentStageOrder.indexOf(
    displayedStageKey.value || candidate.status,
  )
  const documents = []
  const isAfter = (stage) => currentStageIndex > recruitmentStageOrder.indexOf(stage)

  if (isAfter('interview_hr')) {
    if (candidate.interview_hr_summary_path) {
      documents.push({
        key: 'hr-file',
        label: 'Summary Wawancara HR',
        type: 'hr-summary',
        stageLabel: 'Wawancara HR',
        tone: 'hr',
        icon: 'i-lucide-messages-square',
        fileType: getDocumentFileType(candidate.interview_hr_summary_path),
        date: combineDocumentDateTime(candidate.interview_hr_date, candidate.interview_hr_time),
      })
    }
    if (candidate.interview_hr_text_summary) {
      documents.push({
        key: 'hr-text',
        label: 'Catatan Summary Wawancara HR',
        type: 'hr-text',
        stageLabel: 'Wawancara HR',
        tone: 'hr',
        icon: 'i-lucide-messages-square',
        fileType: 'CATATAN',
        date: combineDocumentDateTime(candidate.interview_hr_date, candidate.interview_hr_time),
      })
    }
  }

  if (isAfter('case_study') && candidate.case_study_submitted_file_path) {
    documents.push({
      key: 'case-study',
      label: 'Hasil / Summary Case Study',
      type: 'case-study',
      stageLabel: 'Case Study',
      tone: 'case-study',
      icon: 'i-lucide-clipboard-list',
      fileType: getDocumentFileType(candidate.case_study_submitted_file_path),
      date: candidate.case_study_submitted_at,
    })
  }

  if (isAfter('interview_user')) {
    for (const interview of candidate.user_interviews || []) {
      if (interview.summary_path) {
        documents.push({
          key: `user-${interview.round}`,
          label: `Summary Wawancara User Round ${interview.round}`,
          type: 'user-summary',
          round: interview.round,
          stageLabel: 'Wawancara User',
          tone: 'user',
          icon: 'i-lucide-users-round',
          fileType: getDocumentFileType(interview.summary_path),
          date: interview.updated_at || interview.interview_date,
        })
      }
    }

    const hasCompletedEvaluations = (candidate.user_interview_evaluations || []).some(
      (evaluation) => evaluation.submitted_at,
    )

    if (hasCompletedEvaluations) {
      documents.push({
        key: 'user-evaluation-recap-all',
        label: 'Konsensus & Rekap Nilai Wawancara User (Semua Tahap)',
        type: 'user-evaluation-recap-all',
        stageLabel: 'Wawancara User',
        tone: 'user',
        icon: 'i-lucide-users-round',
        fileType: 'PDF',
        date: getLatestDocumentDate(candidate.user_interview_evaluations, 'submitted_at'),
      })
    }
  }

  if (isAfter('reference_check') && candidate.reference_check_summary_path) {
    documents.push({
      key: 'reference',
      label: 'Summary Reference Check',
      type: 'reference-summary',
      stageLabel: 'Reference Check',
      tone: 'reference',
      icon: 'i-lucide-phone-call',
      fileType: getDocumentFileType(candidate.reference_check_summary_path),
      date: candidate.reference_check_submitted_at,
    })
  }

  if (isAfter('offering') && candidate.offering_letter_path) {
    documents.push({
      key: 'offering',
      label: 'Offering Letter',
      type: 'offering',
      stageLabel: 'Offering',
      tone: 'offering',
      icon: 'i-lucide-mail',
      fileType: getDocumentFileType(candidate.offering_letter_path),
      date: candidate.offering_letter_signed_at || candidate.offering_letter_sent_at,
    })
  }

  if (isAfter('pkb') && (candidate.pkb_signers || []).length) {
    documents.push({
      key: 'pkb-approval',
      label: 'Dokumen Persetujuan PKB',
      type: 'pkb-approval',
      stageLabel: 'PKB',
      tone: 'pkb',
      icon: 'i-lucide-file-signature',
      fileType: 'PDF',
      date: getLatestDocumentDate(candidate.pkb_signers, 'signed_at', 'sent_at'),
    })
  }

  return documents
})

function getDocumentFileType(path, fallback = 'PDF') {
  const cleanPath = String(path || '').split('?')[0]
  const extension = cleanPath.includes('.') ? cleanPath.split('.').pop() : ''
  return extension && extension.length <= 5 ? extension.toUpperCase() : fallback
}

function getLatestDocumentDate(items, primaryField, fallbackField = null) {
  const dates = (items || [])
    .map((item) => item?.[primaryField] || (fallbackField ? item?.[fallbackField] : null))
    .filter(Boolean)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())

  return dates[0] || null
}

function combineDocumentDateTime(date, time) {
  if (!date) return null
  if (!time) return date

  return `${String(date).slice(0, 10)}T${String(time).slice(0, 8)}`
}

function formatDocumentDate(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return (
    new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'Asia/Jakarta',
    })
      .format(date)
      .replace(/,| pukul /g, ' • ') + ' WIB'
  )
}

async function openPreviousStageDocument(documentItem) {
  const candidate = activeCandidate.value
  if (!candidate) return

  if (documentItem.type === 'hr-summary') return previewHrInterviewSummaryDoc(candidate)
  if (documentItem.type === 'case-study') return previewCaseStudySubmissionDoc(candidate)
  if (documentItem.type === 'reference-summary') return previewReferenceCheckSummaryDoc(candidate)
  if (documentItem.type === 'offering') return previewOfferingLetterDoc(candidate)

  if (documentItem.type === 'hr-text') {
    closeDocumentPreview()
    Object.assign(documentPreview, {
      open: true,
      title: documentItem.label,
      url: URL.createObjectURL(
        new Blob([candidate.interview_hr_text_summary], { type: 'text/plain;charset=utf-8' }),
      ),
    })
    return
  }

  if (documentItem.type === 'user-summary') {
    closeDocumentPreview()
    Object.assign(documentPreview, { open: true, title: documentItem.label, url: '' })
    loadingDocument.value = true
    try {
      const response = await getUserInterviewSummaryPreview(candidate.id, documentItem.round)
      documentPreview.url = pdfBlobUrl(response.data.content_base64, response.data.mime_type)
    } catch (error) {
      closeDocumentPreview()
      errorMessage.value = apiError(error, 'Summary wawancara user tidak dapat ditampilkan.')
    } finally {
      loadingDocument.value = false
    }
  }

  if (documentItem.type === 'user-evaluation-recap-all') {
    consensusModalOpen.value = true
    return
  }

  if (documentItem.type === 'pkb-approval') {
    closeDocumentPreview()
    Object.assign(documentPreview, { open: true, title: documentItem.label, url: '' })
    loadingDocument.value = true
    try {
      const response = await getPkbApprovalRecapPreview(candidate.id)
      documentPreview.url = pdfBlobUrl(response.data.content_base64, response.data.mime_type)
    } catch (error) {
      closeDocumentPreview()
      errorMessage.value = apiError(error, 'Dokumen persetujuan PKB tidak dapat ditampilkan.')
    } finally {
      loadingDocument.value = false
    }
  }
}

function formatAction(action) {
  const map = {
    created: 'pembuatan data pelamar',
    updated: 'perubahan data pelamar',
    deleted: 'penghapusan data pelamar',
  }
  return map[action] || action
}

// --- 10-Stage Workflow Reactive States & Methods ---

// Wawancara HR
const hrInterviewModalOpen = ref(false)
const hrInterviewForm = reactive({
  interview_hr_date: '',
  interview_hr_time: '',
  interview_hr_type: 'online',
  interview_hr_location: '',
  interview_hr_meet_link: '',
})

function openHrInterviewModal() {
  if (activeCandidate.value) {
    hrInterviewForm.interview_hr_date = activeCandidate.value.interview_hr_date || ''
    hrInterviewForm.interview_hr_time = activeCandidate.value.interview_hr_time || ''
    hrInterviewForm.interview_hr_type = activeCandidate.value.interview_hr_type || 'online'
    hrInterviewForm.interview_hr_location = activeCandidate.value.interview_hr_location || ''
    hrInterviewForm.interview_hr_meet_link = activeCandidate.value.interview_hr_meet_link || ''
  }
  hrInterviewModalOpen.value = true
}

async function submitHrInterview() {
  if (!activeCandidate.value) return
  if (
    !isInterviewScheduleInFuture(
      hrInterviewForm.interview_hr_date,
      hrInterviewForm.interview_hr_time,
    )
  ) {
    errorMessage.value =
      'Jadwal Wawancara HR tidak boleh menggunakan tanggal atau waktu yang sudah lewat.'
    return
  }
  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const res = await scheduleHrCandidateInterview(activeCandidate.value.id, hrInterviewForm)
    hrInterviewModalOpen.value = false
    message.value = 'Jadwal wawancara HR berhasil disimpan dan email dikirim.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal menyimpan jadwal wawancara HR.')
  } finally {
    updatingStage.value = false
  }
}

function isInterviewScheduleInFuture(date, time) {
  if (!date || !time) return false
  const scheduledAt = new Date(`${String(date).slice(0, 10)}T${String(time).slice(0, 8)}`)
  return !Number.isNaN(scheduledAt.getTime()) && scheduledAt.getTime() > Date.now()
}

function canMarkInterviewCompleted(date, time) {
  if (!date || !time) return false
  const scheduledAt = new Date(`${String(date).slice(0, 10)}T${String(time).slice(0, 8)}`)
  return (
    !Number.isNaN(scheduledAt.getTime()) &&
    scheduledAt.getTime() + interviewCompletionDelayMs <= currentTimestamp.value
  )
}

function interviewCompletionButtonTitle(date, time, interviewLabel) {
  return canMarkInterviewCompleted(date, time)
    ? `Konfirmasi bahwa ${interviewLabel} telah selesai`
    : 'Tombol aktif 1 jam setelah jadwal interview dimulai'
}

function addMinutesToTime(time, minutes) {
  const [hours, minute] = String(time || '')
    .slice(0, 5)
    .split(':')
    .map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minute)) return ''
  const totalMinutes = Math.min(23 * 60 + 59, hours * 60 + minute + minutes)
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`
}

const interviewEndTimeError = computed(() => {
  if (!interviewCompletionConfirmation.open) return ''
  if (!interviewCompletionConfirmation.endTime) return 'Jam selesai wawancara wajib dipilih.'

  const date = String(interviewCompletionConfirmation.date || '').slice(0, 10)
  const startAt = new Date(
    `${date}T${String(interviewCompletionConfirmation.time || '').slice(0, 8)}`,
  )
  const completedAt = new Date(`${date}T${interviewCompletionConfirmation.endTime}:00`)
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(completedAt.getTime()))
    return 'Format jam selesai wawancara tidak valid.'
  if (completedAt <= startAt) return 'Jam selesai harus lebih akhir dari jam mulai wawancara.'
  if (completedAt > new Date()) return 'Jam selesai wawancara tidak boleh melebihi waktu sekarang.'
  return ''
})

function markHrInterviewCompleted() {
  if (!activeCandidate.value || activeCandidate.value.interview_hr_completed_at) return
  Object.assign(interviewCompletionConfirmation, {
    open: true,
    type: 'hr',
    round: null,
    title: 'Tandai Interview HR Selesai',
    description:
      'Setelah dikonfirmasi, jadwal Interview HR tidak dapat diubah dan HRD dapat mulai mengisi summary wawancara.',
    date: activeCandidate.value.interview_hr_date,
    time: activeCandidate.value.interview_hr_time,
    endTime: addMinutesToTime(activeCandidate.value.interview_hr_time, 60),
  })
}

async function shareInterviewHrWa(candidate) {
  if (!candidate || !candidate.interview_hr_date) return
  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const res = await sendHrCandidateInterviewWa(candidate.id)
    message.value = res.data.message || 'Undangan WhatsApp berhasil dikirim ke kandidat.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengirim undangan WhatsApp ke kandidat.')
  } finally {
    updatingStage.value = false
  }
}

async function shareCaseStudyWa(candidate) {
  if (!candidate || !candidate.case_study_sent_at) return
  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const res = await sendHrCandidateCaseStudyWa(candidate.id)
    message.value = res.data.message || 'Notifikasi WhatsApp berhasil dikirim ke kandidat.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengirim notifikasi WhatsApp ke kandidat.')
  } finally {
    updatingStage.value = false
  }
}

async function submitHrSummary(event) {
  const file = event.target.files[0]
  if (!file || !activeCandidate.value) return
  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const formData = new FormData()
    formData.append('summary', file)
    await uploadHrCandidateInterviewSummary(activeCandidate.value.id, formData)
    message.value = 'Summary wawancara HR berhasil diunggah.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengunggah summary wawancara HR.')
  } finally {
    updatingStage.value = false
  }
}

// Case Study
const caseStudyModalOpen = ref(false)
const caseStudyForm = reactive({
  link: '',
  file: null,
})

function handleCaseStudyFileChange(event) {
  caseStudyForm.file = event.target.files[0]
}

async function submitCaseStudy() {
  if (!activeCandidate.value) return

  if (!caseStudyForm.file && !caseStudyForm.link) {
    errorMessage.value = 'Harap isi tautan soal atau unggah file dokumen studi kasus.'
    return
  }

  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const formData = new FormData()
    if (caseStudyForm.file) {
      formData.append('document', caseStudyForm.file)
    }
    if (caseStudyForm.link) {
      formData.append('link', caseStudyForm.link)
    }
    await sendHrCandidateCaseStudy(activeCandidate.value.id, formData)
    caseStudyModalOpen.value = false
    message.value = 'Soal studi kasus berhasil dikirim ke email kandidat.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengirim soal studi kasus.')
  } finally {
    updatingStage.value = false
  }
}

async function submitCaseStudySubmission(event) {
  const file = event.target.files[0]
  if (!file || !activeCandidate.value) return
  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const formData = new FormData()
    formData.append('submission', file)
    await uploadHrCandidateCaseStudySubmission(activeCandidate.value.id, formData)
    message.value = 'Penyelesaian studi kasus berhasil diunggah.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengunggah penyelesaian studi kasus.')
  } finally {
    updatingStage.value = false
  }
}

async function deleteCaseStudySubmissionFile(candidate) {
  if (!confirm('Apakah Anda yakin ingin menghapus dokumen jawaban studi kasus?')) return
  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    await updateHrCandidate(candidate.id, {
      vacancy_id: candidate.vacancy_id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      status: candidate.status,
      notes: candidate.notes,
      expected_salary: candidate.expected_salary,
      case_study_submitted_file_path: null,
    })
    message.value = 'Dokumen jawaban studi kasus berhasil dihapus.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal menghapus dokumen jawaban.')
  } finally {
    updatingStage.value = false
  }
}

async function previewCaseStudySubmissionDoc(candidate) {
  if (!candidate.case_study_submitted_file_path) return
  closeDocumentPreview()
  Object.assign(documentPreview, {
    open: true,
    title: `Jawaban Case Study - ${candidate.name}`,
    url: '',
  })
  loadingDocument.value = true
  try {
    const res = await getCaseStudySubmissionPreview(candidate.id)
    documentPreview.url = pdfBlobUrl(res.data.content_base64, res.data.mime_type)
  } catch (error) {
    closeDocumentPreview()
    errorMessage.value = apiError(error, 'Gagal menampilkan dokumen jawaban.')
  } finally {
    loadingDocument.value = false
  }
}

// Wawancara User (Round-based)
const userInterviewModalOpen = ref(false)
const userInterviewForm = reactive({
  round: 1,
  interview_date: '',
  interview_time: '',
  interview_type: 'online',
  interview_location: '',
  interview_meet_link: '',
  interviewer_niks: [],
})

const scheduleConflicts = ref([])
const isCheckingConflict = ref(false)

async function performScheduleConflictCheck() {
  if (
    !userInterviewForm.interview_date ||
    !userInterviewForm.interview_time ||
    !userInterviewForm.interviewer_niks ||
    !userInterviewForm.interviewer_niks.length
  ) {
    scheduleConflicts.value = []
    return
  }
  if (
    !isInterviewScheduleInFuture(userInterviewForm.interview_date, userInterviewForm.interview_time)
  ) {
    scheduleConflicts.value = []
    return
  }
  isCheckingConflict.value = true
  try {
    const res = await checkHrScheduleConflict({
      candidate_id: activeCandidate.value?.id || null,
      round: userInterviewForm.round,
      interview_date: userInterviewForm.interview_date,
      interview_time: userInterviewForm.interview_time,
      interviewer_niks: userInterviewForm.interviewer_niks,
    })
    scheduleConflicts.value = res.data.conflicts || []
  } catch (error) {
    console.error('Failed to check conflict:', error)
  } finally {
    isCheckingConflict.value = false
  }
}

watch(
  () => [
    userInterviewForm.interview_date,
    userInterviewForm.interview_time,
    userInterviewForm.interviewer_niks,
  ],
  () => {
    performScheduleConflictCheck()
  },
  { deep: true },
)

function openUserInterviewModal(round) {
  userInterviewForm.round = round
  const existing = activeCandidate.value?.user_interviews?.find(
    (u) => Number(u.round) === Number(round),
  )
  userInterviewForm.interview_date = existing?.interview_date || ''
  userInterviewForm.interview_time = existing?.interview_time || ''
  userInterviewForm.interview_type = existing?.interview_type || 'online'
  userInterviewForm.interview_location = existing?.interview_location || ''
  userInterviewForm.interview_meet_link = existing?.interview_meet_link || ''
  userInterviewForm.interviewer_niks = existing?.interviewer_nik
    ? existing.interviewer_nik.split(',').map((s) => s.trim())
    : []
  scheduleConflicts.value = []
  userInterviewModalOpen.value = true
}

async function submitUserInterview() {
  if (!activeCandidate.value) return
  if (
    !isInterviewScheduleInFuture(userInterviewForm.interview_date, userInterviewForm.interview_time)
  ) {
    errorMessage.value = `Jadwal Wawancara User Tahap ${userInterviewForm.round} tidak boleh menggunakan tanggal atau waktu yang sudah lewat.`
    return
  }
  if (!userInterviewForm.interviewer_niks || !userInterviewForm.interviewer_niks.length) {
    errorMessage.value = 'Harap pilih minimal 1 orang pewawancara.'
    return
  }

  if (scheduleConflicts.value && scheduleConflicts.value.length > 0) {
    const hasCandidateConflict = scheduleConflicts.value.some((c) => c.nik === 'CANDIDATE')
    errorMessage.value = hasCandidateConflict
      ? 'Jadwal bentrok! Kandidat sudah memiliki jadwal wawancara lain (Wawancara HR atau User tahap lain) dalam rentang waktu kurang dari 2 jam.'
      : 'Jadwal bentrok! Pewawancara sudah memiliki jadwal wawancara lain dalam rentang waktu kurang dari 2 jam.'
    return
  }

  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const payload = {
      ...userInterviewForm,
      interviewer_nik: userInterviewForm.interviewer_niks.join(','),
    }
    await scheduleUserInterviewRound(activeCandidate.value.id, payload)
    userInterviewModalOpen.value = false
    message.value = `Jadwal Wawancara User Round ${userInterviewForm.round} berhasil disimpan.`
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal menyimpan jadwal wawancara user.')
  } finally {
    updatingStage.value = false
  }
}

function markUserInterviewRoundCompleted(round) {
  const interview = getUserInterview(round)
  if (!activeCandidate.value || !interview || interview.completed_at) return
  Object.assign(interviewCompletionConfirmation, {
    open: true,
    type: 'user',
    round,
    title: `Tandai Interview User Tahap #${round} Selesai`,
    description: `Setelah dikonfirmasi, jadwal Interview User Tahap #${round} tidak dapat diubah dan link evaluasi dapat dikirim kepada pewawancara.`,
    date: interview.interview_date,
    time: interview.interview_time,
    endTime: addMinutesToTime(interview.interview_time, 60),
  })
}

function closeInterviewCompletionConfirmation() {
  if (updatingStage.value) return
  interviewCompletionConfirmation.open = false
}

async function confirmInterviewCompletion() {
  if (!activeCandidate.value || updatingStage.value) return
  if (interviewEndTimeError.value) return

  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    if (interviewCompletionConfirmation.type === 'hr') {
      const response = await completeHrCandidateInterview(activeCandidate.value.id, {
        completed_time: interviewCompletionConfirmation.endTime,
      })
      message.value = response.data.message || 'Wawancara HR berhasil ditandai selesai.'
    } else {
      const round = interviewCompletionConfirmation.round
      const response = await completeUserInterviewRound(activeCandidate.value.id, round, {
        completed_time: interviewCompletionConfirmation.endTime,
      })
      message.value =
        response.data.message || `Wawancara User Tahap ${round} berhasil ditandai selesai.`
    }
    interviewCompletionConfirmation.open = false
    await load()
  } catch (error) {
    const fallback =
      interviewCompletionConfirmation.type === 'hr'
        ? 'Gagal menandai wawancara HR selesai.'
        : `Gagal menandai Wawancara User Tahap ${interviewCompletionConfirmation.round} selesai.`
    errorMessage.value = apiError(error, fallback)
  } finally {
    updatingStage.value = false
  }
}

// User Interview Scorecard Evaluation (Round-based)
const evalModalOpen = ref(false)
const evalRound = ref(1)
const evalForm = reactive({
  interview_appearance: 3,
  interview_attitude: 3,
  interview_communication: 3,
  interview_motivation: 3,
  interview_initiative: 3,
  interview_teamwork: 3,
  interview_domain_experience: 3,
  interview_general_knowledge: 3,
  interview_growth_potential: 3,
  interview_evaluation_notes: '',
})

const evalTotalScore = computed(() => {
  return (
    Number(evalForm.interview_appearance || 0) +
    Number(evalForm.interview_attitude || 0) +
    Number(evalForm.interview_communication || 0) +
    Number(evalForm.interview_motivation || 0) +
    Number(evalForm.interview_initiative || 0) +
    Number(evalForm.interview_teamwork || 0) +
    Number(evalForm.interview_domain_experience || 0) +
    Number(evalForm.interview_general_knowledge || 0) +
    Number(evalForm.interview_growth_potential || 0)
  )
})

const evalRecommendation = computed(() => {
  const score = evalTotalScore.value
  if (score >= 9 && score <= 12) return 'tidak_disarankan'
  if (score >= 13 && score <= 25) return 'dipertimbangkan'
  if (score >= 26 && score <= 36) return 'disarankan'
  return ''
})

const evalRecommendationLabel = (rec) => {
  if (rec === 'tidak_disarankan') return 'Tidak disarankan'
  if (rec === 'dipertimbangkan') return 'Dipertimbangkan'
  if (rec === 'disarankan') return 'Disarankan'
  return '-'
}

function openEvalModal(round) {
  evalRound.value = round
  const existing = activeCandidate.value?.user_interviews?.find(
    (u) => Number(u.round) === Number(round),
  )
  evalForm.interview_appearance = existing?.interview_appearance || 3
  evalForm.interview_attitude = existing?.interview_attitude || 3
  evalForm.interview_communication = existing?.interview_communication || 3
  evalForm.interview_motivation = existing?.interview_motivation || 3
  evalForm.interview_initiative = existing?.interview_initiative || 3
  evalForm.interview_teamwork = existing?.interview_teamwork || 3
  evalForm.interview_domain_experience = existing?.interview_domain_experience || 3
  evalForm.interview_general_knowledge = existing?.interview_general_knowledge || 3
  evalForm.interview_growth_potential = existing?.interview_growth_potential || 3
  evalForm.interview_evaluation_notes = existing?.interview_evaluation_notes || ''
  evalModalOpen.value = true
}

async function submitEval() {
  if (!activeCandidate.value) return
  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const payload = {
      round: evalRound.value,
      interview_appearance: Number(evalForm.interview_appearance),
      interview_attitude: Number(evalForm.interview_attitude),
      interview_communication: Number(evalForm.interview_communication),
      interview_motivation: Number(evalForm.interview_motivation),
      interview_initiative: Number(evalForm.interview_initiative),
      interview_teamwork: Number(evalForm.interview_teamwork),
      interview_domain_experience: Number(evalForm.interview_domain_experience),
      interview_general_knowledge: Number(evalForm.interview_general_knowledge),
      interview_growth_potential: Number(evalForm.interview_growth_potential),
      interview_total_score: evalTotalScore.value,
      interview_evaluation_notes: evalForm.interview_evaluation_notes,
      interview_recommendation: evalRecommendation.value,
    }
    await saveUserInterviewRoundEvaluation(activeCandidate.value.id, payload)
    evalModalOpen.value = false
    message.value = `Hasil evaluasi Wawancara User Round ${evalRound.value} berhasil disimpan.`
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal menyimpan hasil evaluasi.')
  } finally {
    updatingStage.value = false
  }
}

async function submitUserInterviewSummary(event, round) {
  const file = event.target.files[0]
  if (!file || !activeCandidate.value) return
  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const formData = new FormData()
    formData.append('round', round)
    formData.append('summary', file)
    await uploadUserInterviewRoundSummary(activeCandidate.value.id, formData)
    message.value = `Summary Wawancara User Round ${round} berhasil diunggah.`
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengunggah summary wawancara user.')
  } finally {
    updatingStage.value = false
  }
}

// Reference Check
async function triggerReferenceCheckRequest() {
  if (!activeCandidate.value) return
  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    await sendReferenceCheckRequest(activeCandidate.value.id)
    message.value = 'Email permintaan referensi kerja berhasil dikirim ke kandidat.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengirim permintaan referensi kerja.')
  } finally {
    updatingStage.value = false
  }
}

function getReferencePublicUrl(reference) {
  if (!reference?.public_code) return ''
  return `${window.location.origin}/r/${reference.public_code}`
}

async function copyReferencePublicUrl(reference) {
  const url = getReferencePublicUrl(reference)
  if (!url) {
    errorMessage.value = 'Short URL belum tersedia. Muat ulang data kandidat lalu coba kembali.'
    return
  }

  message.value = ''
  errorMessage.value = ''
  const successMessage = `Link reference check untuk ${reference.name} berhasil disalin.`

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(url)
      message.value = successMessage
    } catch {
      fallbackCopyText(url, successMessage)
    }
  } else {
    fallbackCopyText(url, successMessage)
  }
}

async function triggerReferenceCheckWa() {
  if (!activeCandidate.value) return
  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    await sendReferenceCheckWa(activeCandidate.value.id)
    message.value = 'Notifikasi WhatsApp permintaan referensi kerja berhasil dikirim ke kandidat.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengirim notifikasi WhatsApp.')
  } finally {
    updatingStage.value = false
  }
}

async function submitReferenceSummary(event) {
  const file = event.target.files[0]
  if (!file || !activeCandidate.value) return
  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const formData = new FormData()
    formData.append('summary', file)
    await uploadReferenceCheckSummary(activeCandidate.value.id, formData)
    message.value = 'Summary reference check berhasil diunggah.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengunggah summary reference check.')
  } finally {
    updatingStage.value = false
  }
}

// HR Interview Summary Text and File
const isEditingHrTextSummary = ref(false)
const hrTextSummaryInput = ref('')

function startEditHrTextSummary(text) {
  hrTextSummaryInput.value = text || ''
  isEditingHrTextSummary.value = true
}

async function saveHrTextSummary() {
  if (!activeCandidate.value) return
  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    await uploadHrCandidateInterviewSummary(activeCandidate.value.id, {
      summary_text: hrTextSummaryInput.value,
    })
    isEditingHrTextSummary.value = false
    message.value = 'Catatan summary wawancara HR berhasil disimpan.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal menyimpan catatan summary.')
  } finally {
    updatingStage.value = false
  }
}

async function deleteHrSummaryFile(candidate) {
  if (!confirm('Apakah Anda yakin ingin menghapus dokumen summary wawancara HR?')) return
  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    await updateHrCandidate(candidate.id, {
      vacancy_id: candidate.vacancy_id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      status: candidate.status,
      notes: candidate.notes,
      expected_salary: candidate.expected_salary,
      interview_hr_summary_path: null,
    })
    message.value = 'Dokumen summary berhasil dihapus.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal menghapus dokumen summary.')
  } finally {
    updatingStage.value = false
  }
}

async function previewHrInterviewSummaryDoc(candidate) {
  if (!candidate.interview_hr_summary_path) return
  closeDocumentPreview()
  Object.assign(documentPreview, {
    open: true,
    title: `Summary Wawancara HR - ${candidate.name}`,
    url: '',
  })
  loadingDocument.value = true
  try {
    const res = await getHrInterviewSummaryPreview(candidate.id)
    documentPreview.url = pdfBlobUrl(res.data.content_base64, res.data.mime_type)
  } catch (error) {
    closeDocumentPreview()
    errorMessage.value = apiError(error, 'Gagal menampilkan dokumen summary.')
  } finally {
    loadingDocument.value = false
  }
}

async function previewReferenceCheckSummaryDoc(candidate) {
  if (!candidate.reference_check_summary_path) return
  closeDocumentPreview()
  Object.assign(documentPreview, {
    open: true,
    title: `Summary Reference Check - ${candidate.name}`,
    url: '',
  })
  loadingDocument.value = true
  try {
    const res = await previewReferenceCheckSummary(candidate.id)
    documentPreview.url = pdfBlobUrl(res.data.content_base64, res.data.mime_type)
  } catch (error) {
    closeDocumentPreview()
    errorMessage.value = apiError(error, 'Gagal menampilkan dokumen summary.')
  } finally {
    loadingDocument.value = false
  }
}

async function downloadReferenceCheckSummaryDoc(candidate) {
  if (!candidate.reference_check_summary_path || loadingDocument.value) return
  loadingDocument.value = true
  errorMessage.value = ''
  try {
    const response = await previewReferenceCheckSummary(candidate.id)
    downloadPreviewResponse(response)
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengunduh dokumen summary reference check.')
  } finally {
    loadingDocument.value = false
  }
}

// Offering Letter with signature
const offeringLetterFile = ref(null)
const pkbPreviousSalaryInput = ref('')

function parseRupiah(value) {
  if (!value) return 0
  return Number(value.toString().replace(/[^0-9]/g, ''))
}

watch(
  () => [
    activeCandidate.value?.id,
    activeCandidate.value?.status,
    activeCandidate.value?.previous_salary,
  ],
  ([, status, previousSalary]) => {
    if (status === 'pkb') {
      pkbPreviousSalaryInput.value = previousSalary
        ? Number(previousSalary).toLocaleString('id-ID')
        : ''
    }
  },
)

watch(pkbPreviousSalaryInput, (newVal) => {
  if (newVal === null || newVal === undefined || newVal === '') return
  const clean = newVal.toString().replace(/[^0-9]/g, '')
  const formatted = clean ? Number(clean).toLocaleString('id-ID') : ''
  if (newVal !== formatted) {
    pkbPreviousSalaryInput.value = formatted
  }
})

watch(offeringOfferedSalary, (newVal) => {
  if (newVal === null || newVal === undefined || newVal === '') return
  const clean = newVal.toString().replace(/[^0-9]/g, '')
  const formatted = clean ? Number(clean).toLocaleString('id-ID') : ''
  if (newVal !== formatted) {
    offeringOfferedSalary.value = formatted
  }
})

function handleOfferingFileChange(event) {
  offeringLetterFile.value = event.target.files[0]
}

async function submitOfferingLetterWithSignature() {
  if (!offeringLetterFile.value || !activeCandidate.value) {
    errorMessage.value = 'Pilih file PDF offering letter terlebih dahulu.'
    return
  }
  if (!offeringLastCompany.value) {
    errorMessage.value = 'Masukkan nama perusahaan terakhir terlebih dahulu.'
    return
  }
  if (!offeringOfferedSalary.value) {
    errorMessage.value = 'Masukkan gaji ditawarkan terlebih dahulu.'
    return
  }
  if (!offeringJoinDate.value) {
    errorMessage.value = 'Masukkan tanggal mulai kerja terlebih dahulu.'
    return
  }

  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const formData = new FormData()
    formData.append('offering_letter', offeringLetterFile.value)
    formData.append('last_company', offeringLastCompany.value)
    formData.append('offered_salary', parseRupiah(offeringOfferedSalary.value))
    formData.append('join_date', offeringJoinDate.value)

    await sendOfferingLetterWithSignature(activeCandidate.value.id, formData)
    offeringModalOpen.value = false
    message.value = 'Offering letter berhasil diunggah dan tautan ttd dikirim ke kandidat.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengunggah offering letter.')
  } finally {
    updatingStage.value = false
  }
}

async function triggerOfferingLetterWa() {
  if (!activeCandidate.value) return
  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    await sendOfferingLetterWa(activeCandidate.value.id)
    message.value = 'Notifikasi WhatsApp offering letter berhasil dikirim ke kandidat.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengirim notifikasi WhatsApp.')
  } finally {
    updatingStage.value = false
  }
}

// PKB Signers Approval
const selectedPkbSigners = ref([])

const formattedAllEmployees = computed(() => {
  const existingNiks = new Set(
    (activeCandidate.value?.pkb_signers || []).map((s) => s.employee_nik),
  )
  return employees.value
    .filter((emp) => !existingNiks.has(emp.nik))
    .map((emp) => {
      const deptInfo = emp.department ? ` - ${emp.department}` : ''
      return {
        nik: emp.nik,
        label: `${emp.nik} - ${emp.name || emp.nama_karyawan} (${emp.position || emp.jabatan || '-'}${deptInfo})`,
      }
    })
})

const selectedPkbSignerEmployees = computed(() => {
  const selectedNiks = new Set(selectedPkbSigners.value)
  return formattedAllEmployees.value.filter((employee) => selectedNiks.has(employee.nik))
})

function removePkbSigner(nik) {
  selectedPkbSigners.value = selectedPkbSigners.value.filter((selectedNik) => selectedNik !== nik)
}

async function submitPkbRequest() {
  if (!selectedPkbSigners.value.length || !activeCandidate.value) {
    errorMessage.value = 'Pilih minimal 1 orang karyawan penyetuju PKB.'
    return
  }

  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const response = await sendPkbApprovalRequest(activeCandidate.value.id, {
      employee_niks: selectedPkbSigners.value,
      previous_salary: activeCandidate.value.previous_salary,
    })
    message.value =
      response.data.message || 'Permintaan tanda tangan PKB berhasil dikirim melalui WhatsApp.'
    selectedPkbSigners.value = []
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengirim permintaan tanda tangan PKB.')
  } finally {
    updatingStage.value = false
  }
}

async function triggerResendPkbSignerWa(signerId) {
  if (!activeCandidate.value) return
  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    await resendPkbSignerWa(activeCandidate.value.id, signerId)
    message.value = 'Permintaan tanda tangan PKB berhasil dikirim ulang melalui WhatsApp.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengirim ulang WhatsApp.')
  } finally {
    updatingStage.value = false
  }
}

function copySignLink(signerId) {
  const signLink = `${window.location.origin}/public/pkb/sign-request/${signerId}`
  const successMessage = 'Tautan tanda tangan digital berhasil disalin!'

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard
      .writeText(signLink)
      .then(() => {
        message.value = successMessage
      })
      .catch(() => {
        fallbackCopyText(signLink, successMessage)
      })
  } else {
    fallbackCopyText(signLink, successMessage)
  }
}

function fallbackCopyText(text, successMessage = 'Tautan berhasil disalin!') {
  let textArea
  try {
    textArea = document.createElement('textarea')
    textArea.value = text
    textArea.setAttribute('readonly', '')
    textArea.style.opacity = '0'
    textArea.style.pointerEvents = 'none'
    textArea.style.position = 'fixed'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    textArea.setSelectionRange(0, text.length)
    const successful = document.execCommand('copy')
    if (successful) {
      message.value = successMessage
    } else {
      errorMessage.value = 'Gagal menyalin tautan.'
    }
  } catch (err) {
    errorMessage.value = 'Gagal menyalin tautan.'
  } finally {
    if (textArea?.parentNode) textArea.parentNode.removeChild(textArea)
  }
}

// Onboarding
async function triggerOnboardingFormLink() {
  if (!activeCandidate.value) return
  updatingStage.value = true
  lastClickedBtn.value = 'email'
  message.value = ''
  errorMessage.value = ''
  try {
    await sendOnboardingFormLink(activeCandidate.value.id)
    message.value = 'Formulir onboarding terenkripsi berhasil dikirim ke email kandidat.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengirim tautan onboarding.')
  } finally {
    updatingStage.value = false
    lastClickedBtn.value = ''
  }
}

async function triggerOnboardingWa() {
  if (!activeCandidate.value) return
  updatingStage.value = true
  lastClickedBtn.value = 'wa'
  message.value = ''
  errorMessage.value = ''
  try {
    const response = await sendOnboardingWa(activeCandidate.value.id)
    message.value =
      response.data.message || 'Notifikasi WhatsApp onboarding berhasil dikirim ke kandidat.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengirim WhatsApp onboarding.')
  } finally {
    updatingStage.value = false
    lastClickedBtn.value = ''
  }
}

const onboardingEditForm = reactive({
  nik: '',
  pin: '',
  nama_karyawan: '',
  email: '',
  no_hp: '',
  tanggal_lahir: '',
  jenis_kelamin: '',
  alamat: '',
  tempat_lahir: '',
  no_ktp: '',
  agama: '',
  kewarganegaraan: 'Indonesia',
  status_pernikahan: '',
  golongan_darah: '',
  nama_pasangan: '',
  jumlah_anak: 0,
  nama_anak_1: '',
  nama_anak_2: '',
  nama_anak_3: '',
  no_npwp: '',
  no_bpjs: '',
  bank: '',
  no_rekening: '',
  pendidikan_terakhir: '',
  nama_institusi: '',
  jurusan: '',
  nama_ayah: '',
  nama_ibu: '',
  kontak_darurat_nama: '',
  kontak_darurat_hubungan: '',
  kontak_darurat_no_hp: '',
  status_karyawan: 'kontrak',
  join_date: '',
  end_date: '',
  jabatan: '',
  posisi: '',
  posisi_level: '',
  posisi_title: '',
  divisi: '',
  departement: '',
  unit: '',
  atasan_langsung: '',
  atasan_tidak_langsung: '',
})

async function submitSaveOnboardingDraft() {
  if (!activeCandidate.value) return

  message.value = ''
  errorMessage.value = ''

  // Validasi Informasi Kepegawaian & Penugasan
  if (!onboardingEditForm.status_karyawan) {
    errorMessage.value = 'Status Karyawan wajib diisi.'
    return
  }
  if (!onboardingEditForm.join_date) {
    errorMessage.value = 'Tanggal Mulai Kerja wajib diisi.'
    return
  }
  if (onboardingEditForm.status_karyawan !== 'tetap' && !onboardingEditForm.end_date) {
    errorMessage.value = 'Tanggal Akhir Kontrak wajib diisi untuk status karyawan selain Tetap.'
    return
  }
  if (!onboardingEditForm.jabatan) {
    errorMessage.value = 'Jabatan wajib diisi.'
    return
  }
  if (!onboardingEditForm.posisi_level) {
    errorMessage.value = 'Level Posisi wajib diisi.'
    return
  }
  if (!onboardingEditForm.posisi_title) {
    errorMessage.value = 'Title Posisi wajib diisi.'
    return
  }
  if (!onboardingEditForm.divisi) {
    errorMessage.value = 'Divisi wajib diisi.'
    return
  }
  if (!onboardingEditForm.departement) {
    errorMessage.value = 'Departemen wajib diisi.'
    return
  }
  if (!onboardingEditForm.unit) {
    errorMessage.value = 'Unit wajib diisi.'
    return
  }
  if (!onboardingEditForm.atasan_langsung) {
    errorMessage.value = 'Atasan Langsung wajib diisi.'
    return
  }
  if (!onboardingEditForm.atasan_tidak_langsung) {
    errorMessage.value = 'Atasan Tidak Langsung wajib diisi.'
    return
  }

  updatingStage.value = true
  try {
    const res = await saveOnboardingDraft(activeCandidate.value.id, onboardingEditForm)
    message.value = res.data.message || 'Draf data onboarding berhasil disimpan.'
    onboardingVerificationModalOpen.value = false
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal menyimpan draf data onboarding.')
  } finally {
    updatingStage.value = false
  }
}

function openImportConfirmationModal() {
  if (
    !onboardingEditForm.status_karyawan ||
    !onboardingEditForm.join_date ||
    (onboardingEditForm.status_karyawan !== 'tetap' && !onboardingEditForm.end_date) ||
    !onboardingEditForm.jabatan ||
    !onboardingEditForm.posisi_level ||
    !onboardingEditForm.posisi_title ||
    !onboardingEditForm.divisi ||
    !onboardingEditForm.departement ||
    !onboardingEditForm.unit ||
    !onboardingEditForm.atasan_langsung ||
    !onboardingEditForm.atasan_tidak_langsung
  ) {
    notifier.error(
      'Informasi Kepegawaian & Penugasan wajib dilengkapi terlebih dahulu melalui tombol Lengkapi / Edit Data.',
    )
    return
  }
  if (!onboardingEditForm.nik) {
    notifier.error('NIK Karyawan wajib diisi terlebih dahulu melalui tombol Lengkapi / Edit Data.')
    return
  }
  if (!onboardingEditForm.pin) {
    notifier.error('PIN Karyawan wajib diisi terlebih dahulu melalui tombol Lengkapi / Edit Data.')
    return
  }
  importDataChecked.value = false
  importConfirmationModalOpen.value = true
}

// Auto-compute posisi from level + title
watch(
  () => [onboardingEditForm.posisi_level, onboardingEditForm.posisi_title],
  ([level, title]) => {
    const parts = [level, title].filter(Boolean)
    onboardingEditForm.posisi = parts.join(' ') || ''
  },
)

// Auto-clear end_date when status switches to permanent (tetap)
watch(
  () => onboardingEditForm.status_karyawan,
  (status) => {
    if (status === 'tetap') {
      onboardingEditForm.end_date = ''
    }
  },
)

async function confirmAndImportOnboarding() {
  if (!activeCandidate.value) return
  if (!onboardingEditForm.nik) {
    errorMessage.value = 'NIK Karyawan wajib diisi.'
    return
  }
  if (!onboardingEditForm.pin) {
    errorMessage.value = 'PIN Karyawan wajib diisi.'
    return
  }
  if (!importDataChecked.value) {
    errorMessage.value = 'Anda harus mencentang persetujuan kebenaran data.'
    return
  }

  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const res = await importOnboarding(activeCandidate.value.id, onboardingEditForm)
    message.value = res.data.message || 'Kandidat berhasil diimpor sebagai karyawan.'
    importConfirmationModalOpen.value = false
    await load()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengimpor data onboarding.')
  } finally {
    updatingStage.value = false
  }
}

function openOnboardingVerificationModal() {
  onboardingVerificationModalOpen.value = true
  loadMasterData() // Load dropdown options lazily
  let obData = activeCandidate.value?.onboarding_data
  if (obData && typeof obData === 'string') {
    try {
      obData = JSON.parse(obData)
    } catch (e) {
      console.error('Failed parsing onboarding_data JSON string:', e)
    }
  }
  const data = obData || {}

  onboardingEditForm.nik = activeCandidate.value?.employee_nik || data.nik || ''
  onboardingEditForm.pin = data.pin || ''
  onboardingEditForm.nama_karyawan = data.nama_karyawan || activeCandidate.value?.name || ''
  onboardingEditForm.email = data.email || activeCandidate.value?.email || ''
  onboardingEditForm.no_hp = data.no_hp || activeCandidate.value?.phone || ''
  onboardingEditForm.tanggal_lahir = data.tanggal_lahir || ''
  onboardingEditForm.jenis_kelamin = data.jenis_kelamin || ''
  onboardingEditForm.alamat = data.alamat || ''
  onboardingEditForm.tempat_lahir = data.tempat_lahir || ''
  onboardingEditForm.no_ktp = data.no_ktp || ''
  onboardingEditForm.agama = data.agama || ''
  onboardingEditForm.kewarganegaraan = data.kewarganegaraan || 'Indonesia'
  onboardingEditForm.status_pernikahan = data.status_pernikahan || ''
  onboardingEditForm.golongan_darah = data.golongan_darah || ''
  onboardingEditForm.nama_pasangan = data.nama_pasangan || ''
  onboardingEditForm.jumlah_anak = data.jumlah_anak || 0
  onboardingEditForm.nama_anak_1 = data.nama_anak_1 || ''
  onboardingEditForm.nama_anak_2 = data.nama_anak_2 || ''
  onboardingEditForm.nama_anak_3 = data.nama_anak_3 || ''
  onboardingEditForm.no_npwp = data.no_npwp || ''
  onboardingEditForm.no_bpjs = data.no_bpjs || ''
  onboardingEditForm.bank = data.bank || ''
  onboardingEditForm.no_rekening = data.no_rekening || ''
  onboardingEditForm.pendidikan_terakhir = data.pendidikan_terakhir || ''
  onboardingEditForm.nama_institusi = data.nama_institusi || ''
  onboardingEditForm.jurusan = data.jurusan || ''
  onboardingEditForm.nama_ayah = data.nama_ayah || ''
  onboardingEditForm.nama_ibu = data.nama_ibu || ''
  onboardingEditForm.kontak_darurat_nama = data.kontak_darurat_nama || ''
  onboardingEditForm.kontak_darurat_hubungan = data.kontak_darurat_hubungan || ''
  onboardingEditForm.kontak_darurat_no_hp = data.kontak_darurat_no_hp || ''

  onboardingEditForm.status_karyawan = data.status_karyawan || 'kontrak'
  onboardingEditForm.join_date =
    toYMD(activeCandidate.value?.join_date) || toYMD(data.join_date) || ''
  onboardingEditForm.end_date = data.end_date || ''
  onboardingEditForm.jabatan = data.jabatan || activeCandidate.value?.vacancy?.title || ''
  onboardingEditForm.posisi_level = data.posisi_level || ''
  onboardingEditForm.posisi_title = data.posisi_title || ''
  onboardingEditForm.posisi =
    data.posisi || [data.posisi_level, data.posisi_title].filter(Boolean).join(' ') || ''
  onboardingEditForm.divisi = data.divisi || ''
  onboardingEditForm.departement =
    data.departement || activeCandidate.value?.vacancy?.department || ''
  onboardingEditForm.unit = data.unit || activeCandidate.value?.vacancy?.unit || ''
  // debug logs removed
}

const isHrSummaryValid = computed(() => {
  if (!activeCandidate.value) return false
  const hasFile = !!activeCandidate.value.interview_hr_summary_path
  const text = activeCandidate.value.interview_hr_text_summary || ''
  const trimmed = text.trim()
  if (!hasFile && !trimmed) return false

  if (trimmed) {
    const wordCount = trimmed.split(/\s+/).filter((w) => w.length > 0).length
    const charCount = trimmed.length
    const textIsValid = wordCount >= 5 || charCount >= 20
    if (textIsValid) return true
    return hasFile
  }

  return hasFile
})

const canPromoteCandidate = computed(() => {
  if (!activeCandidate.value) return false
  const status = activeCandidate.value.status
  if (status === 'interview_hr') {
    return !!activeCandidate.value.interview_hr_completed_at && isHrSummaryValid.value
  }
  if (status === 'case_study') {
    return !!(
      activeCandidate.value.case_study_sent_at &&
      activeCandidate.value.case_study_submitted_file_path
    )
  }
  if (status === 'interview_user') {
    const rounds = activeCandidate.value.user_interviews || []
    if (rounds.length === 0) return false
    const evals = activeCandidate.value.user_interview_evaluations || []
    return rounds.every((round) => {
      const roundEvals = evals.filter((e) => Number(e.round) === Number(round.round))
      return (
        !!round.completed_at && roundEvals.length > 0 && roundEvals.every((e) => !!e.submitted_at)
      )
    })
  }
  if (status === 'reference_check') {
    const references = activeCandidate.value.references || []
    return references.length > 0 && references.every((reference) => !!reference.submitted_at)
  }
  if (status === 'offering') {
    return !!activeCandidate.value.offering_letter_signed_at
  }
  if (status === 'pkb') {
    const signers = activeCandidate.value.pkb_signers || []
    return signers.length > 0 && signers.every((s) => !!s.signed_at)
  }
  return true
})

function getUserInterview(round) {
  return activeCandidate.value?.user_interviews?.find((u) => Number(u.round) === Number(round))
}
function hasUserInterviewScheduled(round) {
  const ui = getUserInterview(round)
  return !!(ui && ui.interview_date)
}
function hasUserInterviewEvaluation(round) {
  const ui = getUserInterview(round)
  return !!(ui && ui.interview_recommendation)
}

async function triggerUserInterviewEvaluationWa(round, evalId) {
  if (!activeCandidate.value) return
  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    await sendUserInterviewEvaluationWa(activeCandidate.value.id, round, evalId)
    message.value = 'Tautan formulir evaluasi berhasil dikirim via WhatsApp ke pewawancara.'
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengirim tautan via WhatsApp.')
  } finally {
    updatingStage.value = false
  }
}

async function triggerUserInterviewCandidateWa(round) {
  if (!activeCandidate.value) return
  updatingStage.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const res = await sendUserInterviewCandidateWa(activeCandidate.value.id, round)
    message.value = res.data.message || 'Undangan WhatsApp berhasil dikirim ke kandidat.'
    await load()
    if (activeCandidate.value) {
      await selectCandidate(activeCandidate.value)
    }
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengirim undangan WhatsApp ke kandidat.')
  } finally {
    updatingStage.value = false
  }
}

async function previewInterviewerEvaluation(evalId, interviewerName) {
  closeDocumentPreview()
  Object.assign(documentPreview, {
    open: true,
    title: `Laporan Evaluasi - ${interviewerName}`,
    url: '',
  })
  loadingDocument.value = true
  try {
    const res = await getEvaluationReportPreview(evalId)
    documentPreview.url = pdfBlobUrl(res.data.content_base64, res.data.mime_type)
  } catch (error) {
    closeDocumentPreview()
    errorMessage.value = apiError(error, 'Gagal menampilkan laporan evaluasi.')
  } finally {
    loadingDocument.value = false
  }
}

function getRoundEvaluations(round) {
  return (
    activeCandidate.value?.user_interview_evaluations?.filter(
      (e) => Number(e.round) === Number(round),
    ) || []
  )
}

function isRoundEvaluationCompleted(round) {
  const evals = getRoundEvaluations(round)
  if (!evals || !evals.length) return false
  return evals.every((ev) => ev.submitted_at)
}

function getRoundEvaluationProgress(round) {
  const evaluations = getRoundEvaluations(round)
  return {
    completed: evaluations.filter((evaluation) => !!evaluation.submitted_at).length,
    total: evaluations.length,
  }
}

const displayedUserInterviewRounds = computed(() => {
  const rounds = (activeCandidate.value?.user_interviews || [])
    .map((interview) => Number(interview.round))
    .filter((round) => round >= 1 && round <= 3)

  return rounds.length ? [...new Set(rounds)].sort((a, b) => a - b) : [1]
})

const nextUserInterviewRound = computed(() => {
  const existingRounds = (activeCandidate.value?.user_interviews || []).map((interview) =>
    Number(interview.round),
  )
  return existingRounds.length ? Math.max(...existingRounds) + 1 : 1
})

const canAddUserInterviewRound = computed(() => {
  const nextRound = nextUserInterviewRound.value
  if (nextRound <= 1 || nextRound > 3) return false

  const previousRound = nextRound - 1
  return (
    !!getUserInterview(previousRound)?.completed_at && isRoundEvaluationCompleted(previousRound)
  )
})

function getRoundAverageScore(round) {
  const evals =
    activeCandidate.value?.user_interview_evaluations?.filter(
      (e) => Number(e.round) === Number(round) && e.submitted_at,
    ) || []
  if (!evals.length) return '-'
  const sum = evals.reduce((acc, curr) => acc + curr.interview_total_score, 0)
  return (sum / evals.length).toFixed(1)
}

function getRoundConsensusRecommendation(round) {
  const evals =
    activeCandidate.value?.user_interview_evaluations?.filter(
      (e) => Number(e.round) === Number(round) && e.submitted_at,
    ) || []
  if (!evals.length) return '-'
  const counts = evals.reduce((acc, curr) => {
    acc[curr.interview_recommendation] = (acc[curr.interview_recommendation] || 0) + 1
    return acc
  }, {})

  let maxVal = 0
  let consensus = '-'
  Object.keys(counts).forEach((k) => {
    if (counts[k] > maxVal) {
      maxVal = counts[k]
      consensus = k
    }
  })

  if (consensus === 'disarankan') return 'Disarankan'
  if (consensus === 'dipertimbangkan') return 'Dipertimbangkan'
  if (consensus === 'tidak_disarankan') return 'Tidak Disarankan'
  return consensus
}

const overallUserInterviewAverageScore = computed(() => {
  const evals =
    activeCandidate.value?.user_interview_evaluations?.filter((e) => e.submitted_at) || []
  if (!evals.length) return null
  const sum = evals.reduce((acc, curr) => acc + curr.interview_total_score, 0)
  return (sum / evals.length).toFixed(1)
})

const consensusModalOpen = ref(false)
const referenceRecapModalOpen = ref(false)

const submittedReferences = computed(() => {
  return (
    activeCandidate.value?.references?.filter(
      (reference) => reference.submitted_at && reference.answers,
    ) || []
  )
})

const allReferencesSubmitted = computed(() => {
  const references = activeCandidate.value?.references || []
  return references.length > 0 && references.every((reference) => !!reference.submitted_at)
})

const referenceAnswerAspects = [
  { key: 'worked_together_duration', label: 'Lama Bekerja Bersama' },
  { key: 'candidate_last_position', label: 'Posisi Terakhir Kandidat' },
  { key: 'candidate_exit_reason', label: 'Alasan Keluar' },
  { key: 'achievements', label: 'Pencapaian' },
  { key: 'top_strengths', label: 'Tiga Kelebihan Utama' },
  { key: 'teamwork', label: 'Kerja Sama Tim' },
  { key: 'learning_adaptability', label: 'Adaptasi dan Pembelajaran' },
  { key: 'conflict_handling', label: 'Penanganan Konflik' },
  { key: 'improvement_areas', label: 'Area Peningkatan' },
  { key: 'reliability', label: 'Keandalan' },
  { key: 'pressure_handling', label: 'Menghadapi Tekanan' },
  { key: 'commitment_attendance', label: 'Komitmen dan Kehadiran' },
  { key: 'work_again', label: 'Bersedia Bekerja Sama Lagi' },
  { key: 'additional_notes', label: 'Catatan Tambahan' },
  { key: 'leadership', label: 'Kepemimpinan', managerial: true },
  { key: 'leadership_conflict', label: 'Konflik Kepemimpinan', managerial: true },
  { key: 'team_relationship', label: 'Hubungan dengan Tim', managerial: true },
]

const visibleReferenceAnswerAspects = computed(() =>
  referenceAnswerAspects.filter((aspect) => {
    return (
      !aspect.managerial ||
      submittedReferences.value.some((reference) => reference.form_type === 'managerial')
    )
  }),
)

const averageReferenceRating = computed(() => {
  if (!submittedReferences.value.length) return '-'
  const total = submittedReferences.value.reduce(
    (sum, reference) => sum + Number(reference.answers.rating || 0),
    0,
  )
  return (total / submittedReferences.value.length).toFixed(1)
})

const referenceRecommendationConsensus = computed(() => {
  if (!submittedReferences.value.length) return '-'
  const recommended = submittedReferences.value.filter(
    (reference) => reference.answers.recommendation === 'yes',
  ).length
  return recommended > submittedReferences.value.length / 2
    ? 'Direkomendasikan'
    : recommended === submittedReferences.value.length / 2
      ? 'Berimbang'
      : 'Tidak Direkomendasikan'
})

const submittedEvaluations = computed(() => {
  return activeCandidate.value?.user_interview_evaluations?.filter((e) => e.submitted_at) || []
})

const evaluationAspects = [
  { key: 'interview_appearance', label: 'Penampilan / Kerapian' },
  { key: 'interview_attitude', label: 'Sikap / Sopan Santun' },
  { key: 'interview_communication', label: 'Kemampuan Berkomunikasi' },
  { key: 'interview_motivation', label: 'Motivasi Kerja' },
  { key: 'interview_initiative', label: 'Inisiatif' },
  { key: 'interview_teamwork', label: 'Kerjasama Tim' },
  { key: 'interview_domain_experience', label: 'Pengalaman Bidang Kerja' },
  { key: 'interview_general_knowledge', label: 'Pengetahuan Umum' },
  { key: 'interview_growth_potential', label: 'Potensi Berkembang' },
]

function getAspectAverageScore(aspectKey) {
  const evals = submittedEvaluations.value
  if (!evals.length) return '-'
  const sum = evals.reduce((acc, curr) => acc + (curr[aspectKey] || 0), 0)
  return (sum / evals.length).toFixed(1)
}

function handleScreenSizeChange(event) {
  isLargeScreen.value = event.matches
  if (event.matches && !candidates.value.length) load()
}

onMounted(async () => {
  interviewAvailabilityTimer = globalThis.setInterval(() => {
    currentTimestamp.value = Date.now()
  }, 30_000)

  largeScreenMediaQuery = globalThis.matchMedia(`(min-width: ${minimumScreenWidth}px)`)
  isLargeScreen.value = largeScreenMediaQuery.matches
  largeScreenMediaQuery.addEventListener('change', handleScreenSizeChange)

  if (isLargeScreen.value) {
    await load()
    const candidateId = Number(route.query.candidate || 0)
    const requestedCandidate = candidates.value.find(
      (candidate) => Number(candidate.id) === candidateId,
    )
    if (requestedCandidate) await selectCandidate(requestedCandidate)
  }
})

onBeforeUnmount(() => {
  if (interviewAvailabilityTimer) globalThis.clearInterval(interviewAvailabilityTimer)
  largeScreenMediaQuery?.removeEventListener('change', handleScreenSizeChange)
})
</script>

<template>
  <section
    v-if="!isLargeScreen"
    class="flex min-h-[calc(100vh-10rem)] items-center justify-center px-4 py-10"
  >
    <div
      class="w-full max-w-xl rounded-2xl border border-default bg-default p-6 text-center shadow-sm sm:p-10"
    >
      <span
        class="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <UIcon name="i-lucide-monitor-up" class="size-8" />
      </span>
      <h2 class="mt-5 text-xl font-bold text-highlighted">Layar Perangkat Terlalu Kecil</h2>
      <p class="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
        Halaman Pipeline Pelamar hanya dapat diakses melalui perangkat dengan lebar layar minimal
        <strong class="text-highlighted">1080 px</strong>.
      </p>
      <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
        Silakan gunakan laptop, notebook, atau komputer desktop dengan layar yang lebih besar untuk
        mengakses halaman ini.
      </p>
      <div
        class="mt-6 inline-flex items-center gap-2 rounded-lg border border-default bg-muted/10 px-4 py-2 text-xs text-muted"
      >
        <UIcon name="i-lucide-info" class="size-4 shrink-0 text-primary" />
        Perbesar jendela browser jika perangkat Anda sudah mendukung resolusi tersebut.
      </div>
    </div>
  </section>

  <section v-else class="space-y-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 class="text-2xl font-semibold text-highlighted">Pipeline Pelamar (Recruitment)</h2>
        <p class="mt-1 text-sm text-muted">
          Pantau tahapan pelamar kerja dan kelola profil kandidat secara internal.
        </p>
      </div>
      <div class="flex gap-2">
        <UButton
          size="sm"
          color="neutral"
          variant="soft"
          icon="i-lucide-plus"
          label="Tambah Pelamar"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <!-- Main Split View Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Left Panel: Candidates List (Col span 4) -->
      <UCard
        class="lg:col-span-4 lg:sticky lg:top-20 max-h-[calc(100vh-120px)] flex flex-col"
        :ui="{ body: 'p-0 flex-1 overflow-hidden flex flex-col' }"
      >
        <template #header>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-sm font-bold text-highlighted uppercase tracking-wide">
                {{ filteredCandidates.length }} Kandidat
              </span>
            </div>
            <div class="flex flex-col gap-2">
              <input
                v-model="search"
                type="search"
                placeholder="Cari nama, email, hp..."
                class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <div class="grid grid-cols-2 gap-2">
                <select
                  v-model="selectedVacancyFilter"
                  class="rounded-lg border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 w-full"
                >
                  <option value="">Semua Lowongan</option>
                  <option v-for="v in vacancies" :key="v.id" :value="v.id">{{ v.title }}</option>
                </select>
                <USelectMenu
                  v-model="selectedStatusFilters"
                  :items="stages"
                  value-key="key"
                  label-key="label"
                  placeholder="Filter Tahap"
                  multiple
                  class="w-full"
                >
                  <!-- Custom trigger display -->
                  <template #default>
                    <div class="flex items-center gap-1 overflow-hidden max-w-full">
                      <span v-if="!selectedStatusFilters.length" class="text-muted/60 text-xs"
                        >Filter Tahap</span
                      >
                      <div v-else class="flex items-center gap-1 flex-wrap max-w-full">
                        <span
                          v-for="statusKey in selectedStatusFilters"
                          :key="statusKey"
                          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border shadow-xs"
                          :class="`stage-${getStageClass(statusKey)}`"
                        >
                          <span
                            class="w-1 h-1 rounded-full"
                            :class="`stage-bullet-${getStageClass(statusKey)}`"
                          ></span>
                          {{ getStageLabel(statusKey) }}
                        </span>
                      </div>
                    </div>
                  </template>

                  <!-- Custom leading bullet in dropdown list -->
                  <template #item-leading="{ item }">
                    <span
                      class="size-2 rounded-full shrink-0"
                      :class="`stage-bullet-${getStageClass(item.key)}`"
                    ></span>
                  </template>

                  <!-- Custom label styling in dropdown list -->
                  <template #item-label="{ item }">
                    <span
                      class="font-bold text-xs"
                      :class="`dropdown-text-stage-${getStageClass(item.key)}`"
                      >{{ item.label }}</span
                    >
                  </template>
                </USelectMenu>
              </div>
              <select
                v-model="selectedPicFilter"
                class="rounded-lg border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 w-full"
              >
                <option value="">Semua PIC Screening</option>
                <option v-for="emp in hrbpStaffEmployees" :key="emp.nik" :value="emp.nik">
                  {{ emp.name }}
                </option>
              </select>
            </div>
          </div>
        </template>

        <div class="overflow-y-auto divide-y divide-default flex-1">
          <div
            v-for="candidate in filteredCandidates"
            :key="candidate.id"
            @click="selectCandidate(candidate)"
            class="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/10 transition-colors"
            :class="
              selectedCandidate?.id === candidate.id ? 'bg-accented border-l-4 border-primary' : ''
            "
          >
            <!-- Avatar Circle -->
            <div
              class="size-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
              :class="getAvatarStyle(candidate.name).bg"
            >
              {{ getInitials(candidate.name) }}
            </div>
            <div class="min-w-0 flex-1">
              <h4 class="font-bold text-sm text-highlighted truncate">
                {{ candidate.name }}
              </h4>
              <p class="text-xs text-muted truncate mt-0.5">
                {{ candidate.vacancy?.title || 'Umum' }}
              </p>
              <!-- Stage Badge -->
              <div class="mt-1.5 flex">
                <span
                  class="candidate-stage-badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-xs transition-colors"
                  :class="`stage-${getStageClass(candidate.status)}`"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    :class="`stage-bullet-${getStageClass(candidate.status)}`"
                  ></span>
                  {{ getStageLabel(candidate.status) }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="!filteredCandidates.length" class="text-center text-sm text-muted py-12">
            Tidak ada pelamar ditemukan.
          </div>
        </div>
      </UCard>

      <!-- Right Panel: Candidate Details (Col span 8) -->
      <UCard v-if="selectedCandidate" class="lg:col-span-8 shadow-sm">
        <div v-if="loadingDetails" class="py-20 text-center text-sm text-muted">
          Memuat detail pelamar...
        </div>
        <div v-else>
          <!-- Header: Avatar, Name, Info, Edit/Delete Actions -->
          <div
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-default pb-6 mb-6"
          >
            <div class="flex items-center gap-4">
              <!-- Candidate Photo with Camera Upload Overlay -->
              <div class="relative group">
                <img
                  v-if="activeCandidate.photo_path"
                  :src="`/api/hr/recruitment/candidates/${activeCandidate.id}/photo`"
                  class="size-16 rounded-full object-cover shrink-0"
                />
                <div
                  v-else
                  class="size-16 rounded-full flex items-center justify-center font-bold text-2xl shrink-0"
                  :class="getAvatarStyle(activeCandidate.name).bg"
                >
                  {{ getInitials(activeCandidate.name) }}
                </div>
                <label
                  class="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                >
                  <UIcon name="i-lucide-camera" class="size-5 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    class="hidden"
                    :disabled="updatingStage"
                    @change="uploadPhoto($event)"
                  />
                </label>
              </div>
              <div>
                <h3 class="text-xl font-bold text-highlighted">
                  {{ activeCandidate.name }}
                </h3>
                <p class="text-sm text-muted mt-1 flex flex-wrap gap-x-2 gap-y-1">
                  <span>{{ activeCandidate.email }}</span>
                  <span class="text-muted/40">•</span>
                  <span>{{ activeCandidate.phone || '-' }}</span>
                </p>
              </div>
            </div>
            <!-- Candidate Quick Actions -->
            <div class="flex gap-2">
              <!-- CV Actions -->
              <UButton
                v-if="activeCandidate.resume_path"
                size="sm"
                type="button"
                variant="outline"
                color="neutral"
                icon="i-lucide-file-text"
                label="Lihat CV"
                :disabled="updatingStage"
                @click="previewResume(activeCandidate)"
              />
              <label
                v-else
                class="cursor-pointer"
                :class="{ 'opacity-60 cursor-not-allowed': updatingStage }"
              >
                <span
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-default rounded-lg hover:bg-muted/10 transition text-highlighted bg-default shadow-sm"
                >
                  <UIcon name="i-lucide-upload" class="size-3.5" />
                  Upload CV
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  class="hidden"
                  :disabled="updatingStage"
                  @change="triggerResumeUpload($event, activeCandidate)"
                />
              </label>

              <!-- Badge: Kandidat Sudah Diterima -->
              <UBadge
                v-if="activeCandidate.status === 'hired'"
                color="green"
                variant="subtle"
                class="whitespace-nowrap text-xs font-semibold bg-green-50 dark:bg-green-500 text-green-800 dark:text-green-100"
              >
                ✓ Sudah Diterima
              </UBadge>

              <UButton
                v-if="activeCandidate.status !== 'hired'"
                size="sm"
                variant="outline"
                color="neutral"
                icon="i-lucide-pencil"
                label="Edit"
                :disabled="updatingStage"
                @click="openEditDialog(activeCandidate)"
              />
            </div>
          </div>

          <!-- Stepper Component -->
          <div class="mb-8 bg-muted/5 border border-default rounded-2xl p-6 overflow-x-auto">
            <div class="min-w-[600px] flex items-center justify-between relative px-0">
              <!-- Connector Line -->
              <div class="absolute top-[58px] left-[48px] right-[48px] h-0.5 bg-default z-0"></div>
              <!-- Completed Highlight Line -->
              <div
                class="absolute top-[58px] left-[54px] right-[54px] h-0.5 origin-left bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500 z-0 transition-transform duration-300"
                :style="{
                  transform: `scaleX(${currentStageIndex >= 0 ? currentStageIndex / (stepperStages.length - 1) : 0})`,
                }"
              ></div>

              <!-- Steps -->
              <div
                v-for="(stage, idx) in stepperStages"
                :key="stage.key"
                class="flex flex-col items-center relative z-10 w-24"
              >
                <!-- Label above bullet (for even steps: Screening, Case Study, Reference Check, PKB) -->
                <span
                  v-if="idx % 2 !== 0"
                  class="mb-2 text-xs font-semibold text-center leading-tight select-none h-8 flex items-end justify-center"
                  :class="
                    stage.key === displayedStageKey
                      ? [`text-stage-${getStageClass(stage.key)}`, 'font-bold']
                      : 'text-muted'
                  "
                >
                  {{ stage.label }}
                </span>
                <div v-else class="h-8 mb-2"></div>

                <!-- Step Circle -->
                <button
                  type="button"
                  class="candidate-step-bullet size-9 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300"
                  :disabled="activeCandidate.status === 'rejected' || idx > currentStageIndex"
                  :title="
                    idx <= currentStageIndex
                      ? `Lihat tahap ${stage.label}`
                      : `Tahap ${stage.label} belum dilewati`
                  "
                  :aria-label="
                    idx <= currentStageIndex
                      ? `Lihat tahap ${stage.label}`
                      : `Tahap ${stage.label} belum dilewati`
                  "
                  :aria-current="stage.key === displayedStageKey ? 'step' : undefined"
                  @click="viewPipelineStage(stage, idx)"
                  :class="[
                    activeCandidate.status === 'rejected'
                      ? 'bg-muted text-muted-dimmed border-2 border-default'
                      : idx < currentStageIndex
                        ? [
                            `stage-${getStageClass(stage.key)}`,
                            'cursor-pointer hover:scale-105 border-2',
                          ]
                        : idx === currentStageIndex
                          ? [
                              `stage-solid-${getStageClass(stage.key)}`,
                              'font-bold cursor-pointer hover:scale-105',
                            ]
                          : 'bg-default text-muted border-2 border-default cursor-not-allowed',
                    stage.key === displayedStageKey
                      ? ['ring-4', `stage-ring-${getStageClass(stage.key)}`, 'scale-105']
                      : '',
                  ]"
                >
                  <UIcon :name="stage.icon" class="size-4.5" aria-hidden="true" />
                </button>

                <!-- Label below bullet (for odd steps: Applied, Wawancara HR, Wawancara User, Offering, Hired & Onboard) -->
                <span
                  v-if="idx % 2 === 0"
                  class="mt-2 text-xs font-semibold text-center leading-tight select-none h-8 flex items-start justify-center"
                  :class="
                    stage.key === displayedStageKey
                      ? [`text-stage-${getStageClass(stage.key)}`, 'font-bold']
                      : 'text-muted'
                  "
                >
                  {{ stage.label }}
                </span>
                <div v-else class="h-8 mt-2"></div>
              </div>
            </div>
          </div>

          <div
            v-if="isViewingHistoricalStage"
            class="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3"
          >
            <div>
              <p class="text-sm font-semibold text-primary">
                Melihat riwayat tahap {{ displayedStageLabel }}
              </p>
              <p class="mt-0.5 text-xs text-muted">
                Status kandidat tetap {{ getStageLabel(activeCandidate.status) }}. Tampilan ini
                tidak mengubah pipeline.
              </p>
            </div>
            <UButton
              type="button"
              size="xs"
              variant="soft"
              color="primary"
              icon="i-lucide-rotate-ccw"
              label="Kembali ke Tahap Aktif"
              @click="viewedStageKey = null"
            />
          </div>
          <!-- INFORMASI LAMARAN -->
          <div class="mb-6">
            <h4
              class="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5 select-none"
            >
              <span>📋</span> Informasi Lamaran
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- LOWONGAN -->
              <div class="bg-muted/10 border border-default rounded-xl p-4 flex flex-col gap-1">
                <span class="text-[10px] font-bold text-muted uppercase tracking-wider"
                  >Lowongan</span
                >
                <span class="text-sm font-semibold text-highlighted">
                  {{ activeCandidate.vacancy?.title || 'Umum' }}
                </span>
              </div>

              <!-- TANGGAL MELAMAR -->
              <div class="bg-muted/10 border border-default rounded-xl p-4 flex flex-col gap-1">
                <span class="text-[10px] font-bold text-muted uppercase tracking-wider"
                  >Tanggal Melamar</span
                >
                <span class="text-sm font-semibold text-highlighted">
                  {{ formatDate(activeCandidate.created_at) }}
                </span>
              </div>

              <!-- SUMBER LAMARAN -->
              <div class="bg-muted/10 border border-default rounded-xl p-4 flex flex-col gap-1">
                <span class="text-[10px] font-bold text-muted uppercase tracking-wider"
                  >Sumber Lamaran</span
                >
                <span class="text-sm font-semibold text-highlighted">
                  {{ getCandidateSource(activeCandidate) }}
                </span>
              </div>

              <!-- PIC PELAMAR -->
              <div class="bg-muted/10 border border-default rounded-xl p-4 flex flex-col gap-1">
                <span class="text-[10px] font-bold text-muted uppercase tracking-wider"
                  >PIC Pelamar</span
                >
                <span class="text-sm font-semibold text-highlighted truncate">
                  {{
                    activeCandidate.pic
                      ? activeCandidate.pic.name || activeCandidate.pic.nama_karyawan
                      : getCandidatePic(activeCandidate)
                  }}
                </span>
              </div>

              <!-- STATUS CV -->
              <div class="bg-muted/10 border border-default rounded-xl p-4 flex flex-col gap-1">
                <span class="text-[10px] font-bold text-muted uppercase tracking-wider"
                  >Status CV</span
                >
                <span class="text-sm font-semibold text-highlighted">
                  {{ activeCandidate.resume_path ? 'Sudah diunggah' : 'Belum diunggah' }}
                </span>
              </div>

              <!-- ORANG DIKENAL DI HOMPIMPLAY -->
              <div class="bg-muted/10 border border-default rounded-xl p-4 flex flex-col gap-1">
                <span class="text-[10px] font-bold text-muted uppercase tracking-wider"
                  >Orang Dikenal di Hompimplay</span
                >
                <span class="text-sm font-semibold text-highlighted truncate">
                  {{ activeCandidate.known_person || 'Tidak ada' }}
                </span>
              </div>

              <!-- NOMOR TELEPON -->
              <div class="bg-muted/10 border border-default rounded-xl p-4 flex flex-col gap-1">
                <span class="text-[10px] font-bold text-muted uppercase tracking-wider"
                  >Nomor Telepon</span
                >
                <span class="text-sm font-semibold text-highlighted truncate">
                  {{ activeCandidate.phone || '-' }}
                </span>
              </div>

              <!-- EMAIL -->
              <div class="bg-muted/10 border border-default rounded-xl p-4 flex flex-col gap-1">
                <span class="text-[10px] font-bold text-muted uppercase tracking-wider">Email</span>
                <span class="text-sm font-semibold text-highlighted truncate">
                  {{ activeCandidate.email || '-' }}
                </span>
              </div>

              <!-- ATASAN LANGSUNG -->
              <div class="bg-muted/10 border border-default rounded-xl p-4 flex flex-col gap-1">
                <span class="text-[10px] font-bold text-muted uppercase tracking-wider"
                  >Atasan Langsung</span
                >
                <span class="text-sm font-semibold text-highlighted truncate">
                  {{ activeCandidate.vacancy?.supervisor_name || '-' }}
                </span>
              </div>
            </div>
          </div>

          <!-- DATA DIRI & RIWAYAT -->
          <div class="mb-6">
            <h4
              class="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5 select-none"
            >
              <span>👨</span> Data Diri & Riwayat
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- PENDIDIKAN TERAKHIR -->
              <div class="bg-muted/10 border border-default rounded-xl p-4 flex flex-col gap-1">
                <span class="text-[10px] font-bold text-muted uppercase tracking-wider"
                  >Pendidikan Terakhir</span
                >
                <span class="text-sm font-semibold text-highlighted truncate">
                  {{ activeCandidate.education_level || '-' }} -
                  {{ activeCandidate.education_major || '-' }}
                </span>
              </div>

              <!-- STATUS PERNIKAHAN -->
              <div class="bg-muted/10 border border-default rounded-xl p-4 flex flex-col gap-1">
                <span class="text-[10px] font-bold text-muted uppercase tracking-wider"
                  >Status Pernikahan</span
                >
                <span class="text-sm font-semibold text-highlighted">
                  {{ activeCandidate.marital_status || '-' }}
                </span>
              </div>

              <!-- PERUSAHAAN SEBELUMNYA -->
              <div class="bg-muted/10 border border-default rounded-xl p-4 flex flex-col gap-1">
                <span class="text-[10px] font-bold text-muted uppercase tracking-wider"
                  >Perusahaan Sebelumnya</span
                >
                <span class="text-sm font-semibold text-highlighted truncate">
                  {{ activeCandidate.last_company || '-' }}
                </span>
              </div>
            </div>
          </div>

          <!-- KOMPENSASI -->
          <div class="mb-6">
            <h4
              class="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5 select-none"
            >
              <span>💰</span> Kompensasi
            </h4>
            <div class="bg-default/40 border border-default rounded-xl p-6 flex flex-col gap-4">
              <!-- GAJI SAAT INI -->
              <div class="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <span class="text-xs font-semibold text-muted md:w-32">Gaji Saat Ini</span>
                <div class="flex-1 bg-default h-4 rounded-full overflow-hidden relative">
                  <div
                    class="bg-slate-400 dark:bg-slate-500 h-full rounded-full transition-all duration-500"
                    :style="{
                      width: `${(Number(activeCandidate.previous_salary || 0) / maxSalary) * 100}%`,
                    }"
                  ></div>
                </div>
                <span class="text-sm font-bold text-highlighted md:w-36 text-right">
                  {{
                    activeCandidate.previous_salary
                      ? 'Rp ' + Number(activeCandidate.previous_salary).toLocaleString('id-ID')
                      : 'Rp 0'
                  }}
                </span>
              </div>

              <!-- GAJI DIHARAPKAN -->
              <div class="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <span class="text-xs font-semibold text-muted md:w-32">Gaji Diharapkan</span>
                <div class="flex-1 bg-default h-4 rounded-full overflow-hidden relative">
                  <div
                    class="bg-amber-500 h-full rounded-full transition-all duration-500"
                    :style="{
                      width: `${(Number(activeCandidate.expected_salary || 0) / maxSalary) * 100}%`,
                    }"
                  ></div>
                </div>
                <span class="text-sm font-bold text-highlighted md:w-36 text-right">
                  {{
                    activeCandidate.expected_salary
                      ? 'Rp ' + Number(activeCandidate.expected_salary).toLocaleString('id-ID')
                      : 'Rp 0'
                  }}
                </span>
              </div>

              <!-- GAJI DITAWARKAN -->
              <div class="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <span class="text-xs font-semibold text-muted md:w-32">Gaji Ditawarkan</span>
                <div class="flex-1 bg-default h-4 rounded-full overflow-hidden relative">
                  <div
                    class="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    :style="{
                      width: `${(Number(activeCandidate.offered_salary || 0) / maxSalary) * 100}%`,
                    }"
                  ></div>
                </div>
                <span class="text-sm font-bold text-highlighted md:w-36 text-right">
                  {{
                    activeCandidate.offered_salary
                      ? 'Rp ' + Number(activeCandidate.offered_salary).toLocaleString('id-ID')
                      : '-'
                  }}
                </span>
              </div>

              <!-- INFO TEXT -->
              <div
                v-if="salaryComparisonMessage"
                class="text-xs text-emerald-600 dark:text-emerald-400 font-semibold text-right mt-1"
              >
                {{ salaryComparisonMessage }}
              </div>
            </div>
          </div>

          <div
            v-if="['applied', 'screening'].includes(displayedStageKey)"
            class="mt-6 rounded-xl border border-default bg-muted/5 p-4"
          >
            <h4 class="text-xs font-bold uppercase tracking-wider text-muted">
              {{ displayedStageKey === 'applied' ? 'Tahap Lamaran Masuk' : 'Tahap Screening' }}
            </h4>
            <p class="mt-2 text-sm text-highlighted">
              {{
                displayedStageKey === 'applied'
                  ? 'Data profil kandidat dan CV digunakan sebagai dokumen utama pada tahap ini.'
                  : 'Tahap screening kandidat telah dilewati. Catatan hasil screening tersedia pada bagian Catatan / Evaluasi HRD.'
              }}
            </p>
          </div>
          <!-- Stage 3: Wawancara HR -->
          <div
            v-if="displayedStageKey === 'interview_hr'"
            class="interview-workflow-section mt-6 border-t border-default pt-6"
          >
            <div class="interview-section-heading">
              <div class="interview-section-title">
                <span><UIcon name="i-lucide-messages-square" class="size-5" /></span>
                <div>
                  <h4>Wawancara HR</h4>
                  <p>Kelola jadwal, komunikasi kandidat, penyelesaian, dan summary wawancara.</p>
                </div>
              </div>
              <div class="interview-heading-actions">
                <UButton
                  v-if="!isViewingHistoricalStage && !activeCandidate.interview_hr_completed_at"
                  size="xs"
                  variant="soft"
                  color="neutral"
                  icon="i-lucide-pencil"
                  :label="
                    activeCandidate.interview_hr_date ? 'Ubah Jadwal' : 'Atur Jadwal Wawancara HR'
                  "
                  :disabled="updatingStage"
                  @click="openHrInterviewModal"
                />
                <UButton
                  v-if="
                    !isViewingHistoricalStage &&
                    activeCandidate.interview_hr_date &&
                    !activeCandidate.interview_hr_completed_at
                  "
                  size="xs"
                  color="success"
                  icon="i-lucide-circle-check-big"
                  label="Tandai Interview Selesai"
                  :loading="updatingStage"
                  :disabled="
                    updatingStage ||
                    !canMarkInterviewCompleted(
                      activeCandidate.interview_hr_date,
                      activeCandidate.interview_hr_time,
                    )
                  "
                  :title="
                    interviewCompletionButtonTitle(
                      activeCandidate.interview_hr_date,
                      activeCandidate.interview_hr_time,
                      'wawancara HR',
                    )
                  "
                  @click="markHrInterviewCompleted"
                />
              </div>
            </div>

            <div
              v-if="activeCandidate.interview_hr_date"
              class="interview-round-card interview-round-body space-y-4"
            >
              <div class="interview-schedule-grid">
                <!-- 1. Jadwal Interview -->
                <!-- 1. Jadwal Interview -->
                <div class="interview-info-tile interview-info-tile--primary">
                  <span class="interview-info-icon"
                    ><UIcon name="i-lucide-calendar-clock" class="size-5"
                  /></span>
                  <div class="min-w-0 flex-1">
                    <span class="interview-info-label">Jadwal Interview</span>
                    <span class="interview-info-value truncate block">
                      {{ formatDate(activeCandidate.interview_hr_date) }},
                      {{ activeCandidate.interview_hr_time.substring(0, 5) }} WIB
                    </span>
                  </div>
                </div>

                <!-- 2. Tipe & Lokasi -->
                <div class="interview-info-tile">
                  <span class="interview-info-icon"
                    ><UIcon
                      :name="
                        activeCandidate.interview_hr_type === 'online'
                          ? 'i-lucide-video'
                          : 'i-lucide-map-pin'
                      "
                      class="size-5"
                  /></span>
                  <div class="min-w-0 flex-1">
                    <span class="interview-info-label">Tipe & Lokasi</span>
                    <span class="interview-info-value interview-type-value capitalize">{{
                      activeCandidate.interview_hr_type
                    }}</span>
                    <a
                      v-if="
                        activeCandidate.interview_hr_type === 'online' &&
                        activeCandidate.interview_hr_meet_link
                      "
                      :href="activeCandidate.interview_hr_meet_link"
                      target="_blank"
                      class="interview-location-value is-link truncate block"
                      :title="activeCandidate.interview_hr_meet_link"
                    >
                      {{ activeCandidate.interview_hr_meet_link }}
                    </a>
                    <span
                      v-else
                      class="interview-location-value truncate block"
                      :title="activeCandidate.interview_hr_location"
                      >{{ activeCandidate.interview_hr_location || '-' }}</span
                    >
                  </div>
                </div>

                <!-- 3. Status Wawancara -->
                <div
                  class="interview-info-tile interview-info-tile--status"
                  :class="activeCandidate.interview_hr_completed_at ? 'is-complete' : 'is-pending'"
                >
                  <span class="interview-info-icon">
                    <UIcon
                      :name="
                        activeCandidate.interview_hr_completed_at
                          ? 'i-lucide-circle-check-big'
                          : 'i-lucide-clock-3'
                      "
                      class="size-5"
                    />
                  </span>
                  <div class="min-w-0 flex-1">
                    <span class="interview-info-label">Status Wawancara</span>
                    <span
                      v-if="activeCandidate.interview_hr_completed_at"
                      class="interview-info-value truncate block"
                    >
                      Selesai {{ formatDateTime(activeCandidate.interview_hr_completed_at) }}
                    </span>
                    <span v-else class="interview-info-value truncate block"
                      >Belum ditandai selesai</span
                    >
                  </div>
                </div>
              </div>

              <!-- Notification status tracking -->
              <div class="interview-communication-panel">
                <div class="interview-notification-item">
                  <span class="interview-info-icon"
                    ><UIcon name="i-lucide-mail" class="size-4"
                  /></span>
                  <div>
                    <span class="interview-info-label">Email Kandidat</span>
                    <p
                      class="interview-notification-value"
                      :class="activeCandidate.interview_hr_email_sent_at ? 'is-sent' : 'is-pending'"
                    >
                      <span
                        v-if="activeCandidate.interview_hr_email_sent_at"
                        class="text-emerald-500 flex items-center gap-1"
                      >
                        <UIcon name="i-lucide-circle-check" class="size-4" /> Terkirim ({{
                          formatDateTime(activeCandidate.interview_hr_email_sent_at)
                        }})
                      </span>
                      <span v-else class="text-amber-500 flex items-center gap-1">
                        <UIcon name="i-lucide-alert-circle" class="size-4" /> Belum Dikirim
                      </span>
                    </p>
                  </div>
                </div>
                <div class="interview-notification-item">
                  <span class="interview-info-icon"
                    ><UIcon name="i-lucide-message-circle" class="size-4"
                  /></span>
                  <div>
                    <span class="interview-info-label">WhatsApp Kandidat</span>
                    <p
                      class="interview-notification-value"
                      :class="
                        activeCandidate.interview_hr_wa_sent_at &&
                        activeCandidate.interview_hr_wa_sent_date ===
                          activeCandidate.interview_hr_date &&
                        activeCandidate.interview_hr_wa_sent_time ===
                          activeCandidate.interview_hr_time &&
                        activeCandidate.interview_hr_wa_sent_type ===
                          activeCandidate.interview_hr_type
                          ? 'is-sent'
                          : 'is-pending'
                      "
                    >
                      <span
                        v-if="
                          activeCandidate.interview_hr_wa_sent_at &&
                          activeCandidate.interview_hr_wa_sent_date ===
                            activeCandidate.interview_hr_date &&
                          activeCandidate.interview_hr_wa_sent_time ===
                            activeCandidate.interview_hr_time &&
                          activeCandidate.interview_hr_wa_sent_type ===
                            activeCandidate.interview_hr_type
                        "
                        class="text-emerald-500 flex items-center gap-1"
                      >
                        <UIcon name="i-lucide-circle-check" class="size-4" /> Terkirim ({{
                          formatDateTime(activeCandidate.interview_hr_wa_sent_at)
                        }})
                      </span>
                      <span v-else class="text-amber-500 flex items-center gap-1">
                        <UIcon name="i-lucide-alert-circle" class="size-4" /> Belum Dikirim
                      </span>
                    </p>
                  </div>
                </div>
                <div class="interview-communication-action">
                  <UButton
                    v-slot:default
                    v-if="
                      !isViewingHistoricalStage &&
                      activeCandidate.interview_hr_date &&
                      !activeCandidate.interview_hr_completed_at
                    "
                    size="xs"
                    variant="soft"
                    color="success"
                    icon="i-lucide-send"
                    label="Kirim Info WA ke Kandidat"
                    :loading="updatingStage"
                    :disabled="
                      updatingStage ||
                      (activeCandidate.interview_hr_wa_sent_at &&
                        activeCandidate.interview_hr_wa_sent_date ===
                          activeCandidate.interview_hr_date &&
                        activeCandidate.interview_hr_wa_sent_time ===
                          activeCandidate.interview_hr_time &&
                        activeCandidate.interview_hr_wa_sent_type ===
                          activeCandidate.interview_hr_type)
                    "
                    @click="shareInterviewHrWa(activeCandidate)"
                  />
                </div>
              </div>
            </div>
            <div
              v-else
              class="bg-muted/5 border border-default rounded-xl p-6 text-center mb-4 text-muted text-sm"
            >
              Jadwal wawancara HR belum diatur.
            </div>

            <!-- Summary Wawancara HR (Upload & Text Editor) -->
            <div class="interview-summary-panel space-y-4">
              <div class="interview-subsection-heading">
                <span><UIcon name="i-lucide-file-text" class="size-4" /></span>
                <div>
                  <h5>Summary Wawancara HR</h5>
                  <p>Dokumen dan catatan hasil interview HR.</p>
                </div>
              </div>
              <div
                v-if="!activeCandidate.interview_hr_completed_at"
                class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600"
              >
                <p class="flex items-start gap-2 font-semibold">
                  <UIcon name="i-lucide-lock-keyhole" class="mt-0.5 size-4 shrink-0" />
                  Tandai wawancara HR sebagai selesai terlebih dahulu. Setelah itu dokumen atau
                  catatan summary dapat diisi.
                </p>
              </div>

              <!-- 1. File Upload / Preview Section -->
              <div v-if="activeCandidate.interview_hr_completed_at">
                <p class="text-[10px] text-muted mb-1.5 font-bold uppercase tracking-wider">
                  Dokumen Lampiran Summary
                </p>
                <div
                  v-if="activeCandidate.interview_hr_summary_path"
                  class="flex items-center justify-between bg-muted/10 p-3 rounded-lg border border-default"
                >
                  <span class="text-xs font-medium text-highlighted flex items-center gap-2">
                    <UIcon name="i-lucide-file-text" class="text-primary" /> Dokumen Summary
                    Wawancara HR
                  </span>
                  <div class="flex items-center gap-1.5">
                    <UButton
                      size="xs"
                      variant="soft"
                      color="primary"
                      icon="i-lucide-eye"
                      label="Lihat Summary"
                      @click="previewHrInterviewSummaryDoc(activeCandidate)"
                    />
                    <UButton
                      size="xs"
                      variant="soft"
                      color="neutral"
                      icon="i-lucide-download"
                      label="Unduh"
                      @click="openDocumentInNewTab(activeCandidate.interview_hr_summary_path)"
                    />
                    <UButton
                      v-if="!isViewingHistoricalStage"
                      size="xs"
                      variant="ghost"
                      color="danger"
                      icon="i-lucide-trash-2"
                      :loading="updatingStage"
                      @click="deleteHrSummaryFile(activeCandidate)"
                    />
                  </div>
                </div>
                <div
                  v-else-if="!isViewingHistoricalStage"
                  class="flex flex-col items-center justify-center p-3 bg-muted/5 border border-dashed border-default rounded-lg"
                >
                  <label class="cursor-pointer">
                    <span
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-default rounded bg-default hover:bg-muted/10 text-highlighted"
                    >
                      <UIcon name="i-lucide-upload" class="size-3.5" /> Upload File Summary (PDF)
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      class="hidden"
                      @change="submitHrSummary($event)"
                    />
                  </label>
                </div>
              </div>

              <!-- 2. Text Summary Section -->
              <div
                v-if="activeCandidate.interview_hr_completed_at"
                class="border-t border-default/50 pt-3"
              >
                <p class="text-[10px] text-muted mb-1.5 font-bold uppercase tracking-wider">
                  Catatan Summary Tertulis
                </p>
                <div
                  v-if="!isEditingHrTextSummary || isViewingHistoricalStage"
                  class="bg-muted/5 border border-default rounded-xl p-3 text-xs"
                >
                  <p
                    v-if="activeCandidate.interview_hr_text_summary"
                    class="text-highlighted whitespace-pre-wrap leading-relaxed"
                  >
                    {{ activeCandidate.interview_hr_text_summary }}
                  </p>
                  <p v-else class="text-muted italic">Belum ada catatan tertulis.</p>
                  <div class="mt-2 flex justify-end">
                    <UButton
                      v-if="!isViewingHistoricalStage"
                      size="xs"
                      variant="ghost"
                      color="primary"
                      icon="i-lucide-pencil"
                      label="Tulis / Edit Catatan"
                      @click="startEditHrTextSummary(activeCandidate.interview_hr_text_summary)"
                    />
                  </div>
                </div>
                <div v-else class="space-y-2">
                  <textarea
                    v-model="hrTextSummaryInput"
                    rows="4"
                    class="w-full text-xs rounded-lg border border-default bg-default p-2 text-highlighted outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    placeholder="Ketik ringkasan evaluasi wawancara HR langsung di sini..."
                  ></textarea>
                  <div class="flex justify-end gap-2">
                    <UButton
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      label="Batal"
                      @click="isEditingHrTextSummary = false"
                    />
                    <UButton
                      size="xs"
                      color="primary"
                      icon="i-lucide-check"
                      label="Simpan Catatan"
                      :loading="updatingStage"
                      :disabled="!hrTextSummaryInput.trim()"
                      @click="saveHrTextSummary"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Stage 4: Case Study -->
          <div v-if="displayedStageKey === 'case_study'" class="mt-6 border-t border-default pt-6">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-xs font-bold text-muted uppercase tracking-wider">
                Case Study (Studi Kasus)
              </h4>
              <div class="flex items-center gap-2">
                <UButton
                  v-if="!isViewingHistoricalStage && activeCandidate.case_study_sent_at"
                  size="xs"
                  variant="soft"
                  color="success"
                  icon="i-lucide-message-square"
                  label="Kirim WA"
                  :disabled="
                    updatingStage ||
                    (activeCandidate.case_study_wa_sent_at &&
                      activeCandidate.case_study_wa_sent_at >= activeCandidate.case_study_sent_at)
                  "
                  @click="shareCaseStudyWa(activeCandidate)"
                />
                <UButton
                  v-if="
                    !isViewingHistoricalStage &&
                    !activeCandidate.case_study_submitted_at &&
                    !activeCandidate.case_study_submitted_file_path
                  "
                  size="xs"
                  variant="soft"
                  color="primary"
                  icon="i-lucide-send"
                  label="Kirim/Edit Soal Case Study"
                  @click="caseStudyModalOpen = true"
                />
              </div>
            </div>

            <div
              class="bg-muted/5 border border-default rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm"
            >
              <div>
                <p class="text-xs text-muted">Tanggal Dikirim</p>
                <p class="font-medium text-highlighted mt-0.5">
                  {{
                    activeCandidate.case_study_sent_at
                      ? formatDate(activeCandidate.case_study_sent_at)
                      : 'Belum dikirim'
                  }}
                </p>
              </div>
              <div>
                <p class="text-xs text-muted">Tanggal Dikirim Jawaban (Submit)</p>
                <p class="font-medium text-highlighted mt-0.5">
                  {{
                    activeCandidate.case_study_submitted_at
                      ? formatDateTime(activeCandidate.case_study_submitted_at)
                      : 'Belum disubmit'
                  }}
                </p>
              </div>
              <div v-if="activeCandidate.case_study_link" class="md:col-span-2">
                <p class="text-xs text-muted">Tautan Soal</p>
                <a
                  :href="activeCandidate.case_study_link"
                  target="_blank"
                  class="text-primary hover:underline font-medium break-all"
                  >{{ activeCandidate.case_study_link }}</a
                >
              </div>
              <div v-if="activeCandidate.case_study_document_path" class="md:col-span-2">
                <p class="text-xs text-muted">Dokumen Soal Terlampir</p>
                <a
                  :href="'/storage/' + activeCandidate.case_study_document_path"
                  target="_blank"
                  class="text-primary hover:underline font-medium"
                  >Download Dokumen Soal</a
                >
              </div>

              <!-- Divider line -->
              <div class="md:col-span-2 border-t border-default/50 my-1"></div>

              <div>
                <p class="text-xs text-muted">Status Notifikasi Email</p>
                <p class="mt-0.5 flex items-center gap-1.5 font-medium">
                  <span
                    v-if="activeCandidate.case_study_sent_at"
                    class="text-emerald-500 flex items-center gap-1"
                  >
                    <UIcon name="i-lucide-circle-check" class="size-4" /> Terkirim ({{
                      formatDateTime(activeCandidate.case_study_sent_at)
                    }})
                  </span>
                  <span v-else class="text-amber-500 flex items-center gap-1">
                    <UIcon name="i-lucide-alert-circle" class="size-4" /> Belum Terkirim
                  </span>
                </p>
              </div>
              <div>
                <p class="text-xs text-muted">Status Notifikasi WhatsApp</p>
                <p class="mt-0.5 flex items-center gap-1.5 font-medium">
                  <span
                    v-if="
                      activeCandidate.case_study_wa_sent_at &&
                      activeCandidate.case_study_wa_sent_at >= activeCandidate.case_study_sent_at
                    "
                    class="text-emerald-500 flex items-center gap-1"
                  >
                    <UIcon name="i-lucide-circle-check" class="size-4" /> Terkirim ({{
                      formatDateTime(activeCandidate.case_study_wa_sent_at)
                    }})
                  </span>
                  <span v-else class="text-amber-500 flex items-center gap-1">
                    <UIcon name="i-lucide-alert-circle" class="size-4" /> Belum Terkirim
                  </span>
                </p>
              </div>
            </div>

            <!-- Upload Candidate Case Study Submission -->
            <div class="border-t border-default pt-4">
              <h5 class="text-xs font-bold text-muted uppercase mb-2">
                Jawaban / Penyelesaian Soal
              </h5>
              <div
                v-if="activeCandidate.case_study_submitted_file_path"
                class="flex items-center justify-between bg-muted/10 p-3 rounded-lg border border-default"
              >
                <span class="text-sm font-medium text-highlighted flex items-center gap-2">
                  <UIcon name="i-lucide-file-archive" class="text-emerald-500" /> Jawaban Studi
                  Kasus Kandidat
                </span>
                <div class="flex items-center gap-1.5">
                  <UButton
                    size="xs"
                    variant="soft"
                    color="primary"
                    icon="i-lucide-eye"
                    label="Lihat Jawaban"
                    @click="previewCaseStudySubmissionDoc(activeCandidate)"
                  />
                  <UButton
                    size="xs"
                    variant="soft"
                    color="neutral"
                    icon="i-lucide-download"
                    label="Unduh"
                    @click="openDocumentInNewTab(activeCandidate.case_study_submitted_file_path)"
                  />
                </div>
              </div>
              <div
                v-else-if="!isViewingHistoricalStage"
                class="flex flex-col items-center justify-center p-4 bg-muted/5 border border-dashed border-default rounded-lg"
              >
                <p
                  v-if="!activeCandidate.case_study_sent_at"
                  class="mb-2 text-xs font-semibold text-amber-500 text-center"
                >
                  Soal case study belum dikirim. Upload jawaban pelamar akan aktif setelah soal
                  dikirim ke kandidat.
                </p>
                <label
                  :class="
                    activeCandidate.case_study_sent_at ? 'cursor-pointer' : 'cursor-not-allowed'
                  "
                >
                  <span
                    :class="[
                      'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-default rounded',
                      activeCandidate.case_study_sent_at
                        ? 'bg-default hover:bg-muted/10 text-highlighted'
                        : 'bg-muted/10 text-muted opacity-60',
                    ]"
                  >
                    <UIcon name="i-lucide-upload" class="size-3.5" /> Upload Jawaban Pelamar
                  </span>
                  <input
                    type="file"
                    :disabled="!activeCandidate.case_study_sent_at"
                    @change="submitCaseStudySubmission($event)"
                    class="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          <!-- Stage 5: Wawancara User (Dynamic Rounds) -->
          <div
            v-if="displayedStageKey === 'interview_user'"
            class="mt-6 border-t border-default pt-6 interview-workflow-section"
          >
            <div class="interview-section-heading">
              <div class="interview-section-title">
                <span><UIcon name="i-lucide-users-round" class="size-5" /></span>
                <div>
                  <h4>Wawancara User</h4>
                  <p>Kelola jadwal, komunikasi, dan evaluasi setiap tahap wawancara.</p>
                </div>
              </div>
              <div class="interview-heading-actions">
                <UBadge
                  v-if="overallUserInterviewAverageScore !== null"
                  color="success"
                  variant="soft"
                  size="md"
                  class="font-extrabold text-xs"
                >
                  Nilai Akhir: {{ overallUserInterviewAverageScore }} / 36
                </UBadge>
                <UButton
                  v-if="overallUserInterviewAverageScore !== null"
                  size="xs"
                  variant="soft"
                  color="info"
                  icon="i-lucide-eye"
                  label="Lihat Ringkasan Nilai"
                  @click="consensusModalOpen = true"
                />
                <UButton
                  v-if="!isViewingHistoricalStage && canAddUserInterviewRound"
                  size="xs"
                  variant="soft"
                  color="primary"
                  icon="i-lucide-plus"
                  :label="`Tambah Interview Tahap #${nextUserInterviewRound}`"
                  @click="openUserInterviewModal(nextUserInterviewRound)"
                />
              </div>
            </div>

            <!-- Loop Tahapan -->
            <div class="interview-round-list">
              <article
                v-for="round in displayedUserInterviewRounds"
                :key="round"
                class="interview-round-card"
              >
                <div class="interview-round-header">
                  <div class="interview-round-identity">
                    <span>{{ round }}</span>
                    <div>
                      <h5>Interview Tahap {{ round }}</h5>
                      <p>
                        {{
                          hasUserInterviewScheduled(round)
                            ? 'Jadwal dan evaluasi pewawancara'
                            : 'Belum ada jadwal interview'
                        }}
                      </p>
                    </div>
                  </div>
                  <div class="interview-heading-actions">
                    <UButton
                      v-if="
                        !isViewingHistoricalStage &&
                        !getUserInterview(round)?.completed_at &&
                        !isRoundEvaluationCompleted(round)
                      "
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      icon="i-lucide-pencil"
                      label="Atur Jadwal"
                      @click="openUserInterviewModal(round)"
                    />
                    <UButton
                      v-if="
                        !isViewingHistoricalStage &&
                        hasUserInterviewScheduled(round) &&
                        !getUserInterview(round)?.completed_at
                      "
                      size="xs"
                      color="success"
                      icon="i-lucide-circle-check-big"
                      label="Tandai Interview Selesai"
                      :loading="updatingStage"
                      :disabled="
                        updatingStage ||
                        !canMarkInterviewCompleted(
                          getUserInterview(round).interview_date,
                          getUserInterview(round).interview_time,
                        )
                      "
                      :title="
                        interviewCompletionButtonTitle(
                          getUserInterview(round).interview_date,
                          getUserInterview(round).interview_time,
                          `Wawancara User Tahap ${round}`,
                        )
                      "
                      @click="markUserInterviewRoundCompleted(round)"
                    />
                  </div>
                </div>

                <!-- Schedule info -->
                <div v-if="hasUserInterviewScheduled(round)" class="interview-round-body">
                  <div class="interview-schedule-grid">
                    <div class="interview-info-tile interview-info-tile--primary">
                      <span class="interview-info-icon"
                        ><UIcon name="i-lucide-calendar-clock" class="size-5"
                      /></span>
                      <div class="min-w-0 flex-1">
                        <span class="interview-info-label">Jadwal Interview</span>
                        <span class="interview-info-value truncate block"
                          >{{ formatDate(getUserInterview(round).interview_date) }},
                          {{ getUserInterview(round).interview_time.substring(0, 5) }} WIB</span
                        >
                      </div>
                    </div>
                    <div class="interview-info-tile">
                      <span class="interview-info-icon"
                        ><UIcon
                          :name="
                            getUserInterview(round).interview_type === 'online'
                              ? 'i-lucide-video'
                              : 'i-lucide-map-pin'
                          "
                          class="size-5"
                      /></span>
                      <div class="min-w-0 flex-1">
                        <span class="interview-info-label">Tipe & Lokasi</span>
                        <span class="interview-info-value interview-type-value capitalize">{{
                          getUserInterview(round).interview_type
                        }}</span>
                        <a
                          v-if="
                            getUserInterview(round).interview_type === 'online' &&
                            getUserInterview(round).interview_meet_link
                          "
                          :href="getUserInterview(round).interview_meet_link"
                          target="_blank"
                          class="interview-location-value is-link truncate block"
                          :title="getUserInterview(round).interview_meet_link"
                        >
                          {{ getUserInterview(round).interview_meet_link }}
                        </a>
                        <span
                          v-else
                          class="interview-location-value truncate block"
                          :title="getUserInterview(round).interview_location"
                          >{{ getUserInterview(round).interview_location || '-' }}</span
                        >
                      </div>
                    </div>
                    <div
                      class="interview-info-tile interview-info-tile--status"
                      :class="getUserInterview(round).completed_at ? 'is-complete' : 'is-pending'"
                    >
                      <span class="interview-info-icon">
                        <UIcon
                          :name="
                            getUserInterview(round).completed_at
                              ? 'i-lucide-circle-check-big'
                              : 'i-lucide-clock-3'
                          "
                          class="size-5"
                        />
                      </span>
                      <div>
                        <span class="interview-info-label">Status Wawancara</span>
                        <span
                          v-if="getUserInterview(round).completed_at"
                          class="interview-info-value"
                        >
                          Selesai {{ formatDateTime(getUserInterview(round).completed_at) }}
                        </span>
                        <span v-else class="interview-info-value">Belum ditandai selesai</span>
                      </div>
                    </div>
                  </div>

                  <!-- Notification status tracking -->
                  <div class="interview-communication-panel">
                    <div class="interview-notification-item">
                      <span class="interview-info-icon"
                        ><UIcon name="i-lucide-mail" class="size-4"
                      /></span>
                      <div>
                        <span class="interview-info-label">Email Kandidat</span>
                        <p
                          class="interview-notification-value"
                          :class="getUserInterview(round).email_sent_at ? 'is-sent' : 'is-pending'"
                        >
                          <span
                            v-if="getUserInterview(round).email_sent_at"
                            class="text-emerald-500 flex items-center gap-1"
                          >
                            <UIcon name="i-lucide-circle-check" class="size-4" /> Terkirim ({{
                              formatDateTime(getUserInterview(round).email_sent_at)
                            }})
                          </span>
                          <span v-else class="text-amber-500 flex items-center gap-1">
                            <UIcon name="i-lucide-alert-circle" class="size-4" /> Belum Dikirim
                          </span>
                        </p>
                      </div>
                    </div>
                    <div class="interview-notification-item">
                      <span class="interview-info-icon"
                        ><UIcon name="i-lucide-message-circle" class="size-4"
                      /></span>
                      <div>
                        <span class="interview-info-label">WhatsApp Kandidat</span>
                        <p
                          class="interview-notification-value"
                          :class="getUserInterview(round).wa_sent_at ? 'is-sent' : 'is-pending'"
                        >
                          <span
                            v-if="getUserInterview(round).wa_sent_at"
                            class="text-emerald-500 flex items-center gap-1"
                          >
                            <UIcon name="i-lucide-circle-check" class="size-4" /> Terkirim ({{
                              formatDateTime(getUserInterview(round).wa_sent_at)
                            }})
                          </span>
                          <span v-else class="text-amber-500 flex items-center gap-1">
                            <UIcon name="i-lucide-alert-circle" class="size-4" /> Belum Dikirim
                          </span>
                        </p>
                      </div>
                    </div>
                    <div class="interview-communication-action">
                      <UButton
                        v-if="!isViewingHistoricalStage && !getUserInterview(round)?.completed_at"
                        size="xs"
                        variant="soft"
                        color="success"
                        icon="i-lucide-send"
                        label="Kirim Info WA ke Kandidat"
                        :loading="updatingStage"
                        :disabled="
                          updatingStage ||
                          (getUserInterview(round).wa_sent_at &&
                            new Date(getUserInterview(round).wa_sent_at) >=
                              new Date(getUserInterview(round).updated_at))
                        "
                        @click="triggerUserInterviewCandidateWa(round)"
                      />
                    </div>
                  </div>
                  <!-- Interviewer Evaluations List -->
                  <div class="interview-evaluation-panel">
                    <div class="interview-subsection-heading">
                      <span><UIcon name="i-lucide-clipboard-check" class="size-4" /></span>
                      <div>
                        <h5>Evaluasi Pewawancara</h5>
                        <p>
                          {{ getRoundEvaluationProgress(round).completed }} dari
                          {{ getRoundEvaluationProgress(round).total }} evaluator sudah mengisi
                        </p>
                      </div>
                      <UBadge color="primary" variant="soft" size="md"
                        >{{ getRoundEvaluationProgress(round).completed }}/{{
                          getRoundEvaluationProgress(round).total
                        }}</UBadge
                      >
                    </div>
                    <div class="interview-evaluator-list">
                      <div
                        v-for="ev in getRoundEvaluations(round)"
                        :key="ev.id"
                        class="interview-evaluator-row"
                      >
                        <span class="interview-evaluator-avatar"
                          ><UIcon name="i-lucide-user-round" class="size-4"
                        /></span>
                        <div class="interview-evaluator-identity">
                          <strong>{{ ev.interviewer?.nama_karyawan || ev.interviewer_nik }}</strong>
                          <span>NIK {{ ev.interviewer_nik }}</span>
                        </div>
                        <div class="interview-evaluator-actions">
                          <UBadge
                            :color="ev.submitted_at ? 'success' : 'warning'"
                            size="md"
                            class="px-3 py-1 leading-none"
                          >
                            {{
                              ev.submitted_at
                                ? `Selesai Mengisi (Skor: ${ev.interview_total_score}/36)`
                                : 'Menunggu Pengisian'
                            }}
                          </UBadge>

                          <UButton
                            v-if="!isViewingHistoricalStage && !ev.submitted_at"
                            size="xs"
                            variant="soft"
                            color="info"
                            icon="i-lucide-send"
                            label="Kirim Link Evaluasi Interview"
                            :loading="updatingStage"
                            :disabled="updatingStage || !getUserInterview(round).completed_at"
                            :title="
                              getUserInterview(round).completed_at
                                ? 'Kirim formulir evaluasi ke pewawancara'
                                : 'Tandai interview selesai terlebih dahulu'
                            "
                            @click="triggerUserInterviewEvaluationWa(round, ev.id)"
                          />
                          <UButton
                            v-if="ev.submitted_at"
                            size="xs"
                            variant="soft"
                            color="primary"
                            icon="i-lucide-eye"
                            label="Lihat Evaluasi"
                            @click="
                              previewInterviewerEvaluation(
                                ev.id,
                                ev.interviewer?.nama_karyawan || ev.interviewer_nik,
                              )
                            "
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Tahap Consensus / Average Recap Box -->
                  <div v-if="getRoundAverageScore(round) !== '-'" class="interview-score-summary">
                    <div>
                      <span class="block text-[10px] font-bold uppercase text-muted mb-0.5"
                        >Rata-rata Nilai Tahap {{ round }}</span
                      >
                      <span class="text-lg font-extrabold text-primary"
                        >{{ getRoundAverageScore(round) }}
                        <span class="text-xs text-slate-500 font-normal">/ 36</span></span
                      >
                    </div>
                    <div class="sm:text-right">
                      <span class="block text-[10px] font-bold uppercase text-muted mb-0.5"
                        >Konsensus Rekomendasi</span
                      >
                      <UBadge
                        :color="
                          getRoundConsensusRecommendation(round) === 'Disarankan'
                            ? 'success'
                            : getRoundConsensusRecommendation(round) === 'Dipertimbangkan'
                              ? 'warning'
                              : 'danger'
                        "
                        size="md"
                        class="px-3 py-1 leading-none"
                      >
                        {{ getRoundConsensusRecommendation(round) }}
                      </UBadge>
                    </div>
                  </div>
                </div>
                <div v-else class="interview-empty-state">
                  <span><UIcon name="i-lucide-calendar-plus" class="size-6" /></span>
                  <strong>Interview tahap {{ round }} belum dijadwalkan</strong>
                  <p>Atur jadwal saat tahap lanjutan dibutuhkan.</p>
                </div>
              </article>
            </div>
          </div>

          <!-- Stage 6: Reference Check -->
          <div
            v-if="displayedStageKey === 'reference_check'"
            class="mt-6 border-t border-default pt-6"
          >
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-xs font-bold text-muted uppercase tracking-wider">
                Reference Check (Verifikasi Referensi)
              </h4>
              <UButton
                v-if="!isViewingHistoricalStage && !activeCandidate.reference_check_submitted_at"
                size="xs"
                variant="soft"
                color="primary"
                icon="i-lucide-send"
                label="Kirim Permintaan Referensi"
                :disabled="updatingStage"
                @click="triggerReferenceCheckRequest"
              />
            </div>

            <!-- Reference Check Tracking Card (Identik dengan Case Study) -->
            <div
              class="bg-muted/5 border border-default rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm"
            >
              <div>
                <p class="text-xs text-muted">Tanggal Dikirim</p>
                <p class="font-medium text-highlighted mt-0.5">
                  {{
                    activeCandidate.reference_check_email_sent_at
                      ? formatDate(activeCandidate.reference_check_email_sent_at)
                      : 'Belum dikirim'
                  }}
                </p>
              </div>
              <div>
                <p class="text-xs text-muted">Tanggal Dikirim Jawaban (Submit)</p>
                <p class="font-medium text-highlighted mt-0.5">
                  {{
                    activeCandidate.reference_check_submitted_at
                      ? formatDateTime(activeCandidate.reference_check_submitted_at)
                      : 'Belum disubmit'
                  }}
                </p>
              </div>

              <!-- Divider line -->
              <div class="md:col-span-2 border-t border-default/50 my-1"></div>

              <div>
                <p class="text-xs text-muted">Status Notifikasi Email</p>
                <p class="mt-0.5 flex items-center gap-1.5 font-medium">
                  <span
                    v-if="activeCandidate.reference_check_email_sent_at"
                    class="text-emerald-500 flex items-center gap-1"
                  >
                    <UIcon name="i-lucide-circle-check" class="size-4" /> Terkirim ({{
                      formatDateTime(activeCandidate.reference_check_email_sent_at)
                    }})
                  </span>
                  <span v-else class="text-amber-500 flex items-center gap-1">
                    <UIcon name="i-lucide-alert-circle" class="size-4" /> Belum Terkirim
                  </span>
                </p>
              </div>
              <div>
                <p class="text-xs text-muted">Status Notifikasi WhatsApp</p>
                <div class="mt-0.5 flex items-center justify-between gap-2 flex-wrap">
                  <p class="flex items-center gap-1.5 font-medium">
                    <span
                      v-if="activeCandidate.reference_check_wa_sent_at"
                      class="text-emerald-500 flex items-center gap-1"
                    >
                      <UIcon name="i-lucide-circle-check" class="size-4" /> Terkirim ({{
                        formatDateTime(activeCandidate.reference_check_wa_sent_at)
                      }})
                    </span>
                    <span v-else class="text-amber-500 flex items-center gap-1">
                      <UIcon name="i-lucide-alert-circle" class="size-4" /> Belum Terkirim
                    </span>
                  </p>
                  <UButton
                    v-if="
                      !isViewingHistoricalStage &&
                      activeCandidate.reference_check_token &&
                      !allReferencesSubmitted
                    "
                    size="xs"
                    variant="soft"
                    color="success"
                    icon="i-lucide-send"
                    label="Kirim Info WA ke Kandidat"
                    :loading="updatingStage"
                    :disabled="
                      updatingStage ||
                      (activeCandidate.reference_check_wa_sent_at &&
                        new Date(activeCandidate.reference_check_wa_sent_at) >=
                          new Date(activeCandidate.updated_at))
                    "
                    @click="triggerReferenceCheckWa"
                  />
                </div>
              </div>
            </div>

            <!-- List reference entries if submitted -->
            <div v-if="(activeCandidate.references || []).length" class="space-y-4 mb-4">
              <h5 class="text-xs font-bold text-muted uppercase">
                Daftar Referensi yang Disubmit Kandidat
              </h5>
              <div class="grid gap-2 sm:grid-cols-2">
                <div
                  v-for="ref in activeCandidate.references"
                  :key="ref.id"
                  class="bg-muted/5 border border-default rounded-xl p-3 text-xs space-y-1"
                >
                  <div class="flex items-start justify-between gap-2">
                    <p class="font-bold text-highlighted text-sm">{{ ref.name }}</p>
                    <UBadge
                      :color="ref.submitted_at ? 'success' : 'warning'"
                      variant="soft"
                      size="sm"
                      >{{ ref.submitted_at ? 'Selesai Diisi' : 'Menunggu' }}</UBadge
                    >
                  </div>
                  <p v-if="ref.relationship">
                    <span class="text-muted">Hubungan:</span> {{ ref.relationship }}
                  </p>
                  <p><span class="text-muted">Perusahaan:</span> {{ ref.company }}</p>
                  <p><span class="text-muted">Jabatan:</span> {{ ref.position }}</p>
                  <p><span class="text-muted">No. Telp/WA:</span> {{ ref.phone }}</p>
                  <p>
                    <span class="text-muted">Tipe Form:</span>
                    {{ ref.form_type === 'managerial' ? 'Managerial' : 'Staff' }}
                  </p>
                  <div
                    v-if="ref.public_code && !ref.submitted_at"
                    class="flex flex-wrap gap-2 pt-2"
                  >
                    <UButton
                      size="xs"
                      variant="soft"
                      icon="i-lucide-copy"
                      label="Salin Link"
                      @click="copyReferencePublicUrl(ref)"
                    />
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="soft"
                      icon="i-lucide-external-link"
                      label="Buka"
                      :to="getReferencePublicUrl(ref)"
                      target="_blank"
                    />
                  </div>
                  <div
                    v-if="ref.submitted_at && ref.answers"
                    class="mt-2 rounded-lg border p-2.5"
                    :class="
                      ref.answers.recommendation === 'yes'
                        ? 'border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-600 dark:bg-emerald-900 dark:text-emerald-50'
                        : 'border-rose-300 bg-rose-100 text-rose-950 dark:border-rose-600 dark:bg-rose-900 dark:text-rose-50'
                    "
                  >
                    <p class="font-bold">Rating: {{ ref.answers.rating }} / 5</p>
                    <p class="font-semibold">
                      Rekomendasi:
                      {{
                        ref.answers.recommendation === 'yes'
                          ? 'Direkomendasikan'
                          : 'Tidak Direkomendasikan'
                      }}
                    </p>
                    <p class="mt-1 text-[10px] opacity-90">
                      Diisi {{ formatDateTime(ref.submitted_at) }}
                    </p>
                  </div>
                </div>
              </div>

              <UButton
                v-if="activeCandidate.references.some((ref) => ref.submitted_at && ref.answers)"
                color="primary"
                variant="soft"
                icon="i-lucide-clipboard-check"
                label="Lihat Rekap Jawaban Reference Check"
                @click="referenceRecapModalOpen = true"
              />
            </div>

            <!-- Upload Reference Check Summary Document -->
            <div class="border-t border-default pt-4">
              <h5 class="text-xs font-bold text-muted uppercase mb-2">
                Summary Hasil Reference Check
              </h5>
              <div
                v-if="activeCandidate.reference_check_summary_path"
                class="flex items-center justify-between gap-2 bg-muted/10 p-3 rounded-lg border border-default"
              >
                <span class="text-sm font-medium text-highlighted flex items-center gap-2">
                  <UIcon name="i-lucide-file-text" class="text-primary" /> Dokumen Hasil Reference
                  Check
                </span>
                <div class="flex items-center gap-2 shrink-0">
                  <UButton
                    icon="i-lucide-eye"
                    size="xs"
                    color="primary"
                    variant="soft"
                    label="Lihat Summary"
                    @click="previewReferenceCheckSummaryDoc(activeCandidate)"
                  />
                  <UButton
                    icon="i-lucide-download"
                    size="xs"
                    color="neutral"
                    variant="soft"
                    label="Unduh Summary"
                    :loading="loadingDocument"
                    @click="downloadReferenceCheckSummaryDoc(activeCandidate)"
                  />
                </div>
              </div>
              <div
                v-else-if="!isViewingHistoricalStage && !allReferencesSubmitted"
                class="flex flex-col items-center justify-center p-4 bg-muted/5 border border-dashed border-default rounded-lg"
              >
                <p
                  v-if="
                    !(activeCandidate.references || []).length ||
                    (activeCandidate.references || []).some((ref) => !ref.submitted_at)
                  "
                  class="mb-2 text-xs font-semibold text-amber-500 text-center"
                >
                  Upload summary aktif setelah seluruh pemberi referensi menyelesaikan formulir
                  Reference Check.
                </p>
                <label
                  :class="
                    (activeCandidate.references || []).length &&
                    (activeCandidate.references || []).every((ref) => ref.submitted_at)
                      ? 'cursor-pointer'
                      : 'cursor-not-allowed'
                  "
                >
                  <span
                    :class="[
                      'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-default rounded',
                      (activeCandidate.references || []).length &&
                      (activeCandidate.references || []).every((ref) => ref.submitted_at)
                        ? 'bg-default hover:bg-muted/10 text-highlighted'
                        : 'bg-muted/10 text-muted opacity-60',
                    ]"
                  >
                    <UIcon name="i-lucide-upload" class="size-3.5" /> Upload Summary Hasil Referensi
                  </span>
                  <input
                    v-if="
                      (activeCandidate.references || []).length &&
                      (activeCandidate.references || []).every((ref) => ref.submitted_at)
                    "
                    type="file"
                    accept=".pdf,.doc,.docx"
                    class="hidden"
                    @change="submitReferenceSummary($event)"
                  />
                </label>
              </div>
            </div>
          </div>

          <!-- Stage 7: Offering Letter -->
          <div v-if="displayedStageKey === 'offering'" class="mt-6 border-t border-default pt-6">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-xs font-bold text-muted uppercase tracking-wider">
                Offering Letter (Surat Penawaran)
              </h4>
              <div class="flex items-center gap-2">
                <UButton
                  v-if="
                    !isViewingHistoricalStage &&
                    activeCandidate.offering_letter_sent_at &&
                    !activeCandidate.offering_letter_signed_at
                  "
                  size="xs"
                  variant="soft"
                  color="success"
                  icon="i-lucide-send"
                  label="Kirim Info WA ke Kandidat"
                  :loading="updatingStage"
                  :disabled="
                    updatingStage ||
                    (activeCandidate.offering_letter_wa_sent_at &&
                      new Date(activeCandidate.offering_letter_wa_sent_at) >=
                        new Date(activeCandidate.updated_at))
                  "
                  @click="triggerOfferingLetterWa"
                />
                <UButton
                  v-if="!isViewingHistoricalStage && !activeCandidate.offering_letter_signed_at"
                  size="xs"
                  variant="soft"
                  color="primary"
                  icon="i-lucide-upload"
                  :label="
                    activeCandidate.offering_letter_path
                      ? 'Ganti & Kirim Ulang Offering'
                      : 'Upload & Kirim Offering Letter'
                  "
                  :disabled="updatingStage"
                  @click="openOfferingModal(activeCandidate)"
                />
              </div>
            </div>

            <!-- Notification Tracking & Submission Tracking -->
            <div
              v-if="activeCandidate.offering_letter_path"
              class="grid gap-4 md:grid-cols-2 bg-muted/5 border border-default rounded-xl p-4 mb-4 text-xs"
            >
              <div class="space-y-3">
                <div>
                  <label class="block text-[10px] font-bold uppercase text-muted"
                    >Tanggal Tanda Tangan Kandidat</label
                  >
                  <p class="mt-1 font-semibold text-highlighted">
                    <span
                      v-if="activeCandidate.offering_letter_signed_at"
                      class="text-emerald-500 flex items-center gap-1"
                    >
                      <UIcon name="i-lucide-circle-check" class="size-4" />
                      {{ formatDateTime(activeCandidate.offering_letter_signed_at) }}
                    </span>
                    <span
                      v-else-if="activeCandidate.offering_letter_sent_at"
                      class="text-amber-500"
                    >
                      Menunggu Tanda Tangan Kandidat
                    </span>
                    <span v-else class="text-muted"> Belum dikirim </span>
                  </p>
                </div>
                <div>
                  <label class="block text-[10px] font-bold uppercase text-muted"
                    >Ekspektasi Gaji</label
                  >
                  <p class="mt-1 font-semibold text-highlighted">
                    Rp
                    {{
                      activeCandidate.expected_salary
                        ? Number(activeCandidate.expected_salary).toLocaleString('id-ID')
                        : '-'
                    }}
                  </p>
                </div>
              </div>
              <div class="space-y-3">
                <div>
                  <label class="block text-[10px] font-bold uppercase text-muted"
                    >Status Notifikasi Email Kandidat</label
                  >
                  <p class="mt-1 flex items-center gap-1.5 font-medium text-highlighted">
                    <span
                      v-if="activeCandidate.offering_letter_sent_at"
                      class="text-emerald-500 flex items-center gap-1"
                    >
                      <UIcon name="i-lucide-circle-check" class="size-4" /> Terkirim ({{
                        formatDateTime(activeCandidate.offering_letter_sent_at)
                      }})
                    </span>
                    <span v-else class="text-amber-500 flex items-center gap-1">
                      <UIcon name="i-lucide-alert-circle" class="size-4" /> Belum Dikirim
                    </span>
                  </p>
                </div>
                <div>
                  <label class="block text-[10px] font-bold uppercase text-muted"
                    >Status Notifikasi WA Kandidat</label
                  >
                  <p class="mt-1 flex items-center gap-1.5 font-medium text-highlighted">
                    <span
                      v-if="activeCandidate.offering_letter_wa_sent_at"
                      class="text-emerald-500 flex items-center gap-1"
                    >
                      <UIcon name="i-lucide-circle-check" class="size-4" /> Terkirim ({{
                        formatDateTime(activeCandidate.offering_letter_wa_sent_at)
                      }})
                    </span>
                    <span v-else class="text-amber-500 flex items-center gap-1">
                      <UIcon name="i-lucide-alert-circle" class="size-4" /> Belum Dikirim
                    </span>
                  </p>
                </div>
              </div>
            </div>
            <div
              v-else
              class="bg-muted/5 border border-default rounded-xl p-6 text-center mb-4 text-muted text-sm"
            >
              <p class="mb-2">
                Offering letter belum diunggah. Ekspektasi Gaji: Rp
                {{
                  activeCandidate.expected_salary
                    ? Number(activeCandidate.expected_salary).toLocaleString('id-ID')
                    : '-'
                }}
              </p>
              <p class="text-xs text-muted/60">
                Silakan unggah dokumen Offering Letter untuk memulai proses pengiriman ke kandidat.
              </p>
            </div>

            <div v-if="activeCandidate.offering_letter_path" class="mt-3 flex justify-end">
              <UButton
                size="xs"
                variant="soft"
                color="primary"
                icon="i-lucide-eye"
                label="Lihat Offering Letter"
                :loading="loadingDocument"
                @click="previewOfferingLetterDoc(activeCandidate)"
              />
            </div>

            <!-- Signature preview if signed -->
            <div
              v-if="activeCandidate.offering_letter_signature_data"
              class="mt-4 border border-default rounded-xl p-4 bg-white text-center"
            >
              <span class="text-[10px] font-bold text-muted uppercase tracking-wider block mb-2"
                >Tanda Tangan Digital Kandidat</span
              >
              <img
                :src="activeCandidate.offering_letter_signature_data"
                alt="Tanda Tangan"
                class="max-h-[100px] mx-auto"
              />
            </div>
          </div>

          <!-- Stage 8: Persetujuan PKB -->
          <div v-if="displayedStageKey === 'pkb'" class="mt-6 border-t border-default pt-6">
            <h4 class="text-xs font-bold text-muted uppercase tracking-wider mb-4">
              Persetujuan PKB (Internal)
            </h4>

            <!-- Send PKB Request Form -->
            <div
              v-if="!isViewingHistoricalStage"
              class="bg-muted/5 border border-default rounded-xl p-4 mb-6"
            >
              <h5 class="text-xs font-bold text-muted uppercase mb-2">Pilih Karyawan Penyetuju</h5>

              <USelectMenu
                v-model="selectedPkbSigners"
                :items="formattedAllEmployees"
                value-key="nik"
                label-key="label"
                multiple
                placeholder="Cari dan pilih karyawan berdasarkan nama atau NIK"
                :search-input="{ placeholder: 'Ketik nama atau NIK karyawan...' }"
                icon="i-lucide-search"
                class="w-full mb-3"
              />

              <div
                v-if="selectedPkbSignerEmployees.length"
                class="mb-4 rounded-lg border border-default bg-default/60 p-3"
              >
                <p class="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                  {{ selectedPkbSignerEmployees.length }} karyawan dipilih
                </p>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="signer in selectedPkbSignerEmployees"
                    :key="signer.nik"
                    class="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary"
                  >
                    <span class="truncate">{{ signer.label }}</span>
                    <button
                      type="button"
                      class="i-lucide-x size-3.5 shrink-0 cursor-pointer opacity-70 hover:opacity-100"
                      :aria-label="`Hapus ${signer.label}`"
                      @click="removePkbSigner(signer.nik)"
                    ></button>
                  </span>
                </div>
              </div>

              <UButton
                size="xs"
                color="primary"
                icon="i-lucide-send"
                label="Kirim Permintaan Persetujuan PKB"
                :disabled="!selectedPkbSigners.length || updatingStage"
                @click="submitPkbRequest"
              />
            </div>

            <!-- PKB Signers list table -->
            <div class="border border-default rounded-xl overflow-hidden text-xs">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr
                    class="bg-muted/10 border-b border-default text-muted uppercase font-bold text-[10px]"
                  >
                    <th class="p-3">Nama Penyetuju</th>
                    <th class="p-3">Tgl Kirim (WA)</th>
                    <th class="p-3">Status</th>
                    <th class="p-3">Tanda Tangan</th>
                    <th class="p-3">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-default">
                  <tr
                    v-for="signer in activeCandidate.pkb_signers"
                    :key="signer.id"
                    class="text-highlighted"
                  >
                    <td class="p-3">
                      <p class="font-semibold">
                        {{ signer.employee ? signer.employee.nama_karyawan : '-' }}
                      </p>
                      <p class="text-muted text-[10px]">{{ signer.employee_nik }}</p>
                    </td>
                    <td class="p-3 font-medium">
                      <span v-if="signer.sent_at" class="text-emerald-500 flex items-center gap-1">
                        <UIcon name="i-lucide-circle-check" class="size-4" />
                        {{ formatDateTime(signer.sent_at) }}
                      </span>
                      <span v-else class="text-amber-500"> Belum terkirim </span>
                    </td>
                    <td class="p-3">
                      <span v-if="signer.signed_at" class="text-emerald-500 font-bold"
                        >Disetujui ({{ formatDate(signer.signed_at) }})</span
                      >
                      <span v-else class="text-amber-500">Menunggu</span>
                    </td>
                    <td class="p-3">
                      <img
                        v-if="signer.signature_data"
                        :src="signer.signature_data"
                        alt="TTD PKB"
                        class="max-h-[40px] bg-white border rounded"
                      />
                      <span v-else class="text-muted-dimmed">-</span>
                    </td>
                    <td class="p-3">
                      <div class="flex items-center gap-1.5">
                        <UButton
                          v-if="!isViewingHistoricalStage && !signer.signed_at"
                          size="xs"
                          variant="soft"
                          color="success"
                          icon="i-lucide-send"
                          label="Kirim Ulang WA"
                          :loading="updatingStage"
                          @click="triggerResendPkbSignerWa(signer.id)"
                        />
                        <UButton
                          v-if="!signer.signed_at"
                          size="xs"
                          variant="soft"
                          color="neutral"
                          icon="i-lucide-copy"
                          label="Salin Link"
                          @click="copySignLink(signer.id)"
                        />
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!(activeCandidate.pkb_signers || []).length">
                    <td colspan="5" class="p-4 text-center text-muted">
                      Belum ada karyawan yang ditugaskan untuk menyetujui PKB.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Stage 9: Hired & Onboarding -->
          <div v-if="displayedStageKey === 'hired'" class="mt-6 border-t border-default pt-6">
            <h4 class="text-xs font-bold text-muted uppercase tracking-wider mb-4">
              Hired & Onboarding
            </h4>
            <!-- Grid Atas: Parameter Utama (1 Baris, Pembagian 1:3) -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <!-- Kolom Kiri (1/4): Tanggal Mulai Kerja -->
              <div
                v-if="activeCandidate.join_date"
                :class="
                  activeCandidate.offering_letter_signed_at
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-400'
                    : 'bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400'
                "
                class="md:col-span-1 rounded-xl p-4 flex flex-col justify-center items-center gap-1"
              >
                <span class="text-[12px] font-bold uppercase tracking-wider opacity-80">
                  {{
                    activeCandidate.offering_letter_signed_at
                      ? 'Tanggal Mulai Kerja'
                      : 'Estimasi Tanggal Mulai Kerja'
                  }}
                </span>
                <span class="text-md font-bold">
                  {{ formatDate(activeCandidate.join_date) }}
                </span>
              </div>
              <div
                v-else
                class="md:col-span-1 bg-muted/5 border border-default border-dashed rounded-xl p-4 flex flex-col justify-center gap-1 text-center text-muted"
              >
                <span class="text-[10px] font-bold uppercase tracking-wider"
                  >Tanggal Mulai Kerja</span
                >
                <span class="text-xs">Belum ditentukan</span>
              </div>

              <!-- Kolom Kanan (3/4): Status Onboarding Kandidat -->
              <div
                class="md:col-span-3 bg-muted/5 border border-default rounded-xl p-4 flex flex-col justify-between gap-3 min-w-0"
              >
                <span class="text-[10px] font-bold uppercase tracking-wider text-muted"
                  >Status Onboarding Kandidat</span
                >

                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-bold text-highlighted">
                        {{ activeCandidate.onboarding_completed_at ? 'Selesai' : 'Belum Selesai' }}
                      </span>
                      <UIcon
                        v-if="activeCandidate.onboarding_completed_at"
                        name="i-lucide-circle-check"
                        class="text-emerald-500 size-4.5 shrink-0"
                      />
                      <UIcon
                        v-else
                        name="i-lucide-alert-circle"
                        class="text-amber-500 size-4.5 shrink-0"
                      />
                    </div>

                    <!-- Deskripsi Status Onboarding -->
                    <p class="mt-1.5 text-[11px] text-muted leading-relaxed">
                      <template v-if="activeCandidate.onboarding_completed_at">
                        <template v-if="activeCandidate.employee_nik">
                          Biodata kandidat telah berhasil diimpor ke master data karyawan dengan NIK
                          Resmi:
                          <span class="font-semibold text-highlighted dark:text-emerald-400">{{
                            activeCandidate.employee_nik
                          }}</span
                          >.
                        </template>
                        <template v-else>
                          Kandidat telah menyelesaikan pengisian data onboarding mandiri. Silakan
                          lakukan verifikasi dan kirim ke master karyawan.
                        </template>
                      </template>
                      <template v-else>
                        Kandidat belum mengisi formulir data onboarding mandiri. Silakan kirimkan
                        tautan onboarding via Email / WhatsApp di bawah ini.
                      </template>
                    </p>
                  </div>

                  <!-- Aksi di Kanan -->
                  <div class="shrink-0 flex items-center">
                    <template v-if="activeCandidate.onboarding_completed_at">
                      <UButton
                        v-if="activeCandidate.employee_nik"
                        size="xs"
                        color="primary"
                        variant="soft"
                        icon="i-lucide-eye"
                        label="Lihat Detail Onboarding"
                        @click="openOnboardingVerificationModal"
                      />
                      <div v-else class="flex flex-col gap-2 w-full sm:w-48">
                        <UButton
                          size="xs"
                          color="warning"
                          variant="soft"
                          icon="i-lucide-edit"
                          label="Lengkapi / Edit Data"
                          @click="openOnboardingVerificationModal"
                        />
                        <UButton
                          size="xs"
                          color="primary"
                          icon="i-lucide-send"
                          label="Kirim ke Data Karyawan"
                          :disabled="
                            !onboardingEditForm.nik || !onboardingEditForm.pin || updatingStage
                          "
                          @click="openImportConfirmationModal"
                        />
                      </div>
                    </template>
                    <template v-else>
                      <UBadge color="warning" class="whitespace-nowrap">
                        Menunggu Pengisian
                      </UBadge>
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <!-- Detail Panel Tindakan / Pengiriman (Hanya jika belum selesai) -->
            <div
              v-if="!activeCandidate.onboarding_completed_at"
              class="bg-muted/5 border border-default rounded-xl p-4 space-y-4"
            >
              <!-- Notification Tracking & Link details -->
              <div
                v-if="activeCandidate.onboarding_password"
                class="grid gap-4 md:grid-cols-2 bg-default border border-default rounded-xl p-4 text-xs"
              >
                <div class="space-y-3">
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-muted"
                      >Status Notifikasi Email Kandidat</label
                    >
                    <p class="mt-1 flex items-center gap-1.5 font-semibold text-highlighted">
                      <span
                        v-if="activeCandidate.onboarding_sent_at"
                        class="text-emerald-500 flex items-center gap-1"
                      >
                        <UIcon name="i-lucide-circle-check" class="size-4" /> Terkirim ({{
                          formatDateTime(activeCandidate.onboarding_sent_at)
                        }})
                      </span>
                      <span v-else class="text-amber-500 flex items-center gap-1">
                        <UIcon name="i-lucide-alert-circle" class="size-4" /> Belum Dikirim
                      </span>
                    </p>
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-muted"
                      >Password 6-Digit</label
                    >
                    <p class="mt-1 font-semibold text-primary text-sm font-mono tracking-wider">
                      {{ activeCandidate.onboarding_password }}
                    </p>
                  </div>
                </div>
                <div class="space-y-3">
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-muted"
                      >Status Notifikasi WA Kandidat</label
                    >
                    <p class="mt-1 flex items-center gap-1.5 font-semibold text-highlighted">
                      <span
                        v-if="activeCandidate.onboarding_wa_sent_at"
                        class="text-emerald-500 flex items-center gap-1"
                      >
                        <UIcon name="i-lucide-circle-check" class="size-4" /> Terkirim ({{
                          formatDateTime(activeCandidate.onboarding_wa_sent_at)
                        }})
                      </span>
                      <span v-else class="text-amber-500 flex items-center gap-1">
                        <UIcon name="i-lucide-alert-circle" class="size-4" /> Belum Dikirim
                      </span>
                    </p>
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-muted"
                      >Tautan Portal Onboarding</label
                    >
                    <p class="mt-1 font-semibold text-highlighted">
                      <a
                        :href="onboardingPublicLink"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-primary hover:underline break-all"
                        >{{ onboardingPublicLink }}</a
                      >
                    </p>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2 pt-2 border-t border-default/50">
                <UButton
                  size="sm"
                  color="primary"
                  icon="i-lucide-send"
                  label="Kirim Tautan Onboarding via Email"
                  :disabled="updatingStage"
                  :loading="updatingStage && lastClickedBtn === 'email'"
                  @click="triggerOnboardingFormLink"
                />
                <UButton
                  size="sm"
                  color="success"
                  icon="i-lucide-message-circle"
                  label="Kirim Info ke WA Kandidat"
                  :disabled="!activeCandidate.onboarding_sent_at || updatingStage"
                  :loading="updatingStage && lastClickedBtn === 'wa'"
                  @click="triggerOnboardingWa"
                />
              </div>
            </div>
          </div>

          <div v-if="previousStageDocuments.length" class="previous-documents-panel mt-6">
            <div class="mb-4 flex items-start justify-between gap-3">
              <div>
                <h4 class="text-xs font-extrabold text-highlighted uppercase tracking-wide">
                  Dokumen Tahap Sebelumnya
                </h4>
                <p class="mt-1 text-[11px] text-muted">
                  Seluruh summary dan dokumen dari proses yang telah dilewati.
                </p>
              </div>
              <span class="shrink-0 text-[11px] font-semibold text-muted"
                >{{ previousStageDocuments.length }} dokumen</span
              >
            </div>
            <div class="previous-documents-grid">
              <button
                v-for="documentItem in previousStageDocuments"
                :key="documentItem.key"
                type="button"
                class="previous-document-card"
                :class="`previous-document-card--${documentItem.tone}`"
                :aria-label="`Lihat ${documentItem.label}`"
                @click="openPreviousStageDocument(documentItem)"
              >
                <span class="previous-document-icon" aria-hidden="true">
                  <UIcon :name="documentItem.icon" class="size-[18px]" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="previous-document-stage">{{ documentItem.stageLabel }}</span>
                  <span class="previous-document-title">{{ documentItem.label }}</span>
                  <span class="previous-document-meta">
                    {{ documentItem.fileType }}
                    <template v-if="formatDocumentDate(documentItem.date)">
                      <span aria-hidden="true">&bull;</span>
                      {{ formatDocumentDate(documentItem.date) }}
                    </template>
                  </span>
                </span>
                <UIcon
                  name="i-lucide-arrow-up-right"
                  class="previous-document-action"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          <!-- Notes / Evaluasi HRD Section -->
          <div class="mt-6 border-t border-default pt-6">
            <h4 class="text-xs font-bold text-muted uppercase tracking-wider mb-2">
              Catatan / Evaluasi HRD
            </h4>
            <div
              class="bg-muted/10 border border-default rounded-xl p-4 min-h-[80px] text-sm text-highlighted whitespace-pre-wrap"
            >
              {{ activeCandidate.notes || 'Tidak ada catatan tambahan.' }}
            </div>
          </div>

          <!-- Riwayat Aktivitas / Log Perubahan -->
          <div v-if="changeLogs.length" class="mt-6 border-t border-default pt-6">
            <div
              class="flex items-center justify-between cursor-pointer select-none mb-4 group"
              @click="isAuditLogsExpanded = !isAuditLogsExpanded"
            >
              <h4
                class="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5 group-hover:text-highlighted transition-colors"
              >
                <span>Riwayat Perubahan (Audit Log)</span>
                <span
                  class="text-[10px] bg-muted/20 px-1.5 py-0.5 rounded-full text-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors"
                >
                  {{ changeLogs.length }}
                </span>
              </h4>
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                :icon="isAuditLogsExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                :label="isAuditLogsExpanded ? 'Sembunyikan' : 'Tampilkan'"
              />
            </div>

            <div
              v-show="isAuditLogsExpanded"
              class="relative pl-6 border-l border-default space-y-6 pt-2"
            >
              <div v-for="log in changeLogs" :key="log.id" class="relative">
                <!-- Log Dot -->
                <span
                  class="absolute -left-[31px] top-1 size-3 rounded-full bg-default border-2 border-primary"
                ></span>
                <div>
                  <p class="text-xs font-semibold text-highlighted">
                    {{ log.actor_name || log.actor_username }}
                    <span class="font-normal text-muted"> melakukan </span>
                    <span class="font-bold text-primary">{{ formatAction(log.action) }}</span>
                  </p>
                  <!-- Log Changes details -->
                  <div
                    v-if="
                      log.changes &&
                      getParsedChanges(log.changes).length > 0 &&
                      filteredLogChanges(getParsedChanges(log.changes)).length > 0
                    "
                    class="text-xs text-muted mt-2 leading-relaxed bg-muted/10 p-3 rounded-lg border border-default"
                  >
                    <ul class="space-y-1.5 list-disc list-inside">
                      <li
                        v-for="(change, cIdx) in filteredLogChanges(getParsedChanges(log.changes))"
                        :key="cIdx"
                      >
                        <span class="font-semibold text-highlighted"
                          >{{ getReadableFieldLabel(change) }}:</span
                        >
                        <span class="text-muted-dimmed line-through mx-1">{{
                          formatChangeValue(change.field, change.old)
                        }}</span>
                        <span class="text-muted mx-1">→</span>
                        <span
                          class="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[11px] shadow-2xs"
                        >
                          {{ formatChangeValue(change.field, change.new) }}
                        </span>
                      </li>
                    </ul>
                  </div>
                  <p
                    v-else-if="log.changes && getParsedChanges(log.changes).length === 0"
                    class="text-xs text-muted mt-1 leading-relaxed bg-muted/10 p-2 rounded-lg border border-default"
                  >
                    {{ log.changes }}
                  </p>
                  <p class="text-[10px] text-muted-dimmed mt-1">
                    {{ formatDateTime(log.occurred_at) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions Panel -->
          <div
            v-if="!isViewingHistoricalStage"
            class="mt-8 border-t border-default pt-6 flex flex-wrap items-center gap-3"
          >
            <div
              v-if="nextStage && activeCandidate.status !== 'rejected'"
              class="flex flex-col gap-1"
            >
              <div class="flex items-center gap-2">
                <UButton
                  type="button"
                  icon="i-lucide-arrow-right"
                  trailing
                  :label="`Lanjutkan ke ${nextStage.label}`"
                  :loading="updatingStage"
                  :disabled="!canPromoteCandidate"
                  @click="promoteCandidate"
                  class="shadow-sm"
                />

                <UButton
                  v-if="activeCandidate.status === 'interview_hr'"
                  type="button"
                  color="info"
                  variant="soft"
                  icon="i-lucide-file-code"
                  label="Gunakan Case Study (Opsional)"
                  :loading="updatingStage"
                  :disabled="!activeCandidate.interview_hr_completed_at || !isHrSummaryValid"
                  @click="updateStage(activeCandidate, 'case_study')"
                  class="shadow-sm"
                />
              </div>
              <p
                v-if="
                  activeCandidate.status === 'interview_hr' &&
                  !activeCandidate.interview_hr_completed_at
                "
                class="text-[10px] text-amber-500 font-semibold mt-1"
              >
                *Tandai wawancara HR sebagai selesai terlebih dahulu.
              </p>
              <p
                v-else-if="activeCandidate.status === 'interview_hr' && !isHrSummaryValid"
                class="text-[10px] text-amber-500 font-semibold mt-1"
              >
                *Harap lengkapi catatan summary tertulis (minimal 5 kata atau 20 karakter) atau
                unggah berkas summary wawancara HR terlebih dahulu.
              </p>
              <p
                v-if="
                  activeCandidate.status === 'case_study' && !activeCandidate.case_study_sent_at
                "
                class="text-[10px] text-amber-500 font-semibold mt-1"
              >
                *Harap kirimkan instruksi case study kepada kandidat terlebih dahulu.
              </p>
              <p
                v-else-if="
                  activeCandidate.status === 'case_study' &&
                  !activeCandidate.case_study_submitted_file_path
                "
                class="text-[10px] text-amber-500 font-semibold mt-1"
              >
                *Menunggu kandidat mengunggah berkas jawaban case study.
              </p>
              <p
                v-if="
                  activeCandidate.status === 'interview_user' &&
                  !(activeCandidate.user_interviews || []).length
                "
                class="text-[10px] text-amber-500 font-semibold mt-1"
              >
                *Harap jadwalkan minimal 1 sesi wawancara user terlebih dahulu.
              </p>
              <p
                v-else-if="
                  activeCandidate.status === 'interview_user' &&
                  (activeCandidate.user_interviews || []).some((round) => !round.completed_at)
                "
                class="text-[10px] text-amber-500 font-semibold mt-1"
              >
                *Tandai seluruh sesi wawancara user yang aktif sebagai selesai terlebih dahulu.
              </p>
              <p
                v-else-if="activeCandidate.status === 'interview_user' && !canPromoteCandidate"
                class="text-[10px] text-amber-500 font-semibold mt-1"
              >
                *Harap lengkapi seluruh hasil evaluasi wawancara user round yang aktif.
              </p>
              <p
                v-if="activeCandidate.status === 'reference_check' && !allReferencesSubmitted"
                class="text-[10px] text-amber-500 font-semibold mt-1"
              >
                *Menunggu seluruh pemberi referensi menyelesaikan penilaian.
              </p>
              <p
                v-else-if="
                  activeCandidate.status === 'offering' && !activeCandidate.offering_letter_path
                "
                class="text-[10px] text-amber-500 font-semibold mt-1"
              >
                *Unggah dan kirim offering letter kepada kandidat terlebih dahulu.
              </p>
              <p
                v-else-if="
                  activeCandidate.status === 'offering' &&
                  !activeCandidate.offering_letter_signed_at
                "
                class="text-[10px] text-amber-500 font-semibold mt-1"
              >
                *Menunggu kandidat menandatangani offering letter.
              </p>
              <p
                v-if="activeCandidate.status === 'pkb' && !canPromoteCandidate"
                class="text-[10px] text-amber-500 font-semibold mt-1"
              >
                *Menunggu persetujuan PKB selesai ditandatangani oleh seluruh penyetuju.
              </p>
            </div>
            <UButton
              v-if="activeCandidate.status === 'rejected'"
              type="button"
              color="primary"
              variant="outline"
              icon="i-lucide-rotate-ccw"
              label="Pulihkan Pipeline Kandidat"
              :loading="updatingStage"
              @click="restoreCandidate"
            />

            <!-- Reject button -->
            <UButton
              v-if="activeCandidate.status !== 'rejected' && activeCandidate.status !== 'hired'"
              type="button"
              variant="ghost"
              color="danger"
              icon="i-lucide-x-circle"
              label="Tandai Ditolak"
              :loading="updatingStage"
              @click="rejectCandidate"
              class="ml-auto"
            />
          </div>
        </div>
      </UCard>

      <!-- Empty State if no candidates at all -->
      <UCard v-else class="lg:col-span-8 text-center py-20 text-muted">
        <span class="i-lucide-users size-12 mx-auto text-muted/30"></span>
        <h3 class="mt-4 font-semibold text-highlighted">Belum Ada Pelamar</h3>
        <p class="mt-1 text-sm text-muted">
          Silakan tambah pelamar baru untuk memulai pipeline rekrutmen.
        </p>
      </UCard>
    </div>

    <!-- Onboarding Verification & Import Dialog -->
    <div
      v-if="onboardingVerificationModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60"
        @click="onboardingVerificationModalOpen = false"
      ></button>
      <UCard class="relative max-h-[88vh] w-full max-w-4xl overflow-y-auto">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-highlighted">
                {{
                  activeCandidate?.employee_nik
                    ? 'Detail Onboarding Karyawan'
                    : 'Verifikasi & Lengkapi Data Karyawan Baru'
                }}
              </p>
              <p class="mt-1 text-xs text-muted">
                {{
                  activeCandidate?.employee_nik
                    ? 'Data onboarding karyawan yang telah diimpor.'
                    : 'Tinjau biodata mandiri kandidat, isi NIK & PIN resmi untuk mengirim ke data karyawan master.'
                }}
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="onboardingVerificationModalOpen = false"
            />
          </div>
        </template>

        <div class="space-y-6 text-xs text-default">
          <div class="space-y-4">
            <h5
              class="text-xs font-bold text-highlighted uppercase tracking-wider mb-2 pb-1 border-b border-default"
            >
              Identitas Utama
            </h5>
            <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted">Nama Karyawan</label>
                <input
                  v-model="onboardingEditForm.nama_karyawan"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="text"
                />
              </div>
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted">Email</label>
                <input
                  v-model="onboardingEditForm.email"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="email"
                />
              </div>
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted">No. HP</label>
                <input
                  v-model="onboardingEditForm.no_hp"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="text"
                />
              </div>
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted">Tempat Lahir</label>
                <input
                  v-model="onboardingEditForm.tempat_lahir"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="text"
                />
              </div>
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted">Tanggal Lahir</label>
                <input
                  v-model="onboardingEditForm.tanggal_lahir"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="date"
                />
              </div>
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted">Jenis Kelamin</label>
                <select
                  v-model="onboardingEditForm.jenis_kelamin"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                >
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted">No. KTP</label>
                <input
                  v-model="onboardingEditForm.no_ktp"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="text"
                />
              </div>
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted">Agama</label>
                <input
                  v-model="onboardingEditForm.agama"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="text"
                />
              </div>
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted">Golongan Darah</label>
                <select
                  v-model="onboardingEditForm.golongan_darah"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="AB">AB</option>
                  <option value="O">O</option>
                </select>
              </div>
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted">Status Pernikahan</label>
                <select
                  v-model="onboardingEditForm.status_pernikahan"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                >
                  <option value="Belum Menikah">Belum Menikah</option>
                  <option value="Menikah">Menikah</option>
                  <option value="Janda/Duda">Janda/Duda</option>
                </select>
              </div>
              <div class="form-group-sm" v-if="onboardingEditForm.status_pernikahan === 'Menikah'">
                <label class="text-[10px] font-bold uppercase text-muted">Nama Pasangan</label>
                <input
                  v-model="onboardingEditForm.nama_pasangan"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="text"
                />
              </div>
              <div class="form-group-sm" v-if="onboardingEditForm.status_pernikahan === 'Menikah'">
                <label class="text-[10px] font-bold uppercase text-muted">Jumlah Anak</label>
                <input
                  v-model.number="onboardingEditForm.jumlah_anak"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="number"
                  min="0"
                  max="3"
                />
              </div>
            </div>

            <div
              class="grid gap-3 sm:grid-cols-3"
              v-if="
                onboardingEditForm.status_pernikahan === 'Menikah' &&
                onboardingEditForm.jumlah_anak > 0
              "
            >
              <div class="form-group-sm" v-if="onboardingEditForm.jumlah_anak >= 1">
                <label class="text-[10px] font-bold uppercase text-muted">Nama Anak ke-1</label>
                <input
                  v-model="onboardingEditForm.nama_anak_1"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="text"
                />
              </div>
              <div class="form-group-sm" v-if="onboardingEditForm.jumlah_anak >= 2">
                <label class="text-[10px] font-bold uppercase text-muted">Nama Anak ke-2</label>
                <input
                  v-model="onboardingEditForm.nama_anak_2"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="text"
                />
              </div>
              <div class="form-group-sm" v-if="onboardingEditForm.jumlah_anak >= 3">
                <label class="text-[10px] font-bold uppercase text-muted">Nama Anak ke-3</label>
                <input
                  v-model="onboardingEditForm.nama_anak_3"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="text"
                />
              </div>
            </div>

            <div class="form-group-sm">
              <label class="text-[10px] font-bold uppercase text-muted"
                >Alamat Tempat Tinggal</label
              >
              <textarea
                v-model="onboardingEditForm.alamat"
                :disabled="!!activeCandidate?.employee_nik"
                :class="onboardingFormControlClass + ' h-16 resize-none'"
                rows="2"
              ></textarea>
            </div>
          </div>

          <div class="space-y-4">
            <h5
              class="text-xs font-bold text-highlighted uppercase tracking-wider mb-2 pb-1 border-b border-default"
            >
              Pendidikan & Rekening Bank
            </h5>
            <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted"
                  >Pendidikan Terakhir</label
                >
                <select
                  v-model="onboardingEditForm.pendidikan_terakhir"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                >
                  <option value="">Pilih Pendidikan</option>
                  <option value="SMA/SMK">SMA/SMK</option>
                  <option value="D3">D3</option>
                  <option value="S1">S1</option>
                  <option value="S2">S2</option>
                  <option value="S3">S3</option>
                </select>
              </div>
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted">Nama Institusi</label>
                <input
                  v-model="onboardingEditForm.nama_institusi"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="text"
                />
              </div>
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted">Jurusan</label>
                <input
                  v-model="onboardingEditForm.jurusan"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="text"
                />
              </div>
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted">Kewarganegaraan</label>
                <input
                  v-model="onboardingEditForm.kewarganegaraan"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="text"
                />
              </div>
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted">Bank</label>
                <input
                  v-model="onboardingEditForm.bank"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="text"
                />
              </div>
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted">No. Rekening</label>
                <input
                  v-model="onboardingEditForm.no_rekening"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="text"
                />
              </div>
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted">No. NPWP</label>
                <input
                  v-model="onboardingEditForm.no_npwp"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="text"
                  placeholder="Opsional"
                />
              </div>
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted">No. BPJS</label>
                <input
                  v-model="onboardingEditForm.no_bpjs"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="text"
                  placeholder="Opsional"
                />
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <h5
              class="text-xs font-bold text-highlighted uppercase tracking-wider mb-2 pb-1 border-b border-default"
            >
              Kontak Darurat & Keluarga
            </h5>
            <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted">Nama Ayah</label>
                <input
                  v-model="onboardingEditForm.nama_ayah"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="text"
                />
              </div>
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted">Nama Ibu</label>
                <input
                  v-model="onboardingEditForm.nama_ibu"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="text"
                />
              </div>
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted"
                  >Nama Kontak Darurat</label
                >
                <input
                  v-model="onboardingEditForm.kontak_darurat_nama"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="text"
                />
              </div>
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted">Hubungan Kontak</label>
                <input
                  v-model="onboardingEditForm.kontak_darurat_hubungan"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="text"
                />
              </div>
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted">No. HP Darurat</label>
                <input
                  v-model="onboardingEditForm.kontak_darurat_no_hp"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="text"
                />
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <h5
              class="text-xs font-bold text-highlighted uppercase tracking-wider mb-2 pb-1 border-b border-default"
            >
              Informasi Kepegawaian & Penugasan
            </h5>
            <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <!-- Status Karyawan -->
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted"
                  >Status Karyawan <span class="required">*</span></label
                >
                <select
                  v-model="onboardingEditForm.status_karyawan"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  required
                >
                  <option value="kontrak">Kontrak</option>
                  <option value="tetap">Tetap</option>
                  <option value="magang">Magang</option>
                  <option value="harian">Harian</option>
                  <option value="probation">Probation</option>
                </select>
              </div>
              <!-- Tanggal Mulai Kerja — auto-populated from offering stage join_date -->
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted"
                  >Tanggal Mulai Kerja <span class="required">*</span></label
                >
                <input
                  v-model="onboardingEditForm.join_date"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="date"
                  required
                />
              </div>
              <!-- Tanggal Akhir Kerja — hanya tampil jika status bukan 'tetap' -->
              <div class="form-group-sm" v-if="onboardingEditForm.status_karyawan !== 'tetap'">
                <label class="text-[10px] font-bold uppercase text-muted">
                  Tanggal Akhir Kontrak
                  <span class="required" v-if="onboardingEditForm.status_karyawan !== 'tetap'"
                    >*</span
                  >
                </label>
                <input
                  v-model="onboardingEditForm.end_date"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="date"
                  :min="onboardingEditForm.join_date || undefined"
                  :required="onboardingEditForm.status_karyawan !== 'tetap'"
                />
              </div>
              <!-- Jabatan (free text) -->
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted"
                  >Jabatan <span class="required">*</span></label
                >
                <input
                  v-model="onboardingEditForm.jabatan"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="text"
                  required
                />
              </div>
              <!-- Level Posisi dropdown: Jr. / Md. / Sr. -->
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted"
                  >Level Posisi <span class="required">*</span></label
                >
                <select
                  v-model="onboardingEditForm.posisi_level"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  required
                >
                  <option value="">— Pilih Level —</option>
                  <option value="Jr.">Jr. (Junior)</option>
                  <option value="Md.">Md. (Middle)</option>
                  <option value="Sr.">Sr. (Senior)</option>
                </select>
              </div>
              <!-- Title Posisi dropdown from master_position_titles -->
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted"
                  >Title Posisi <span class="required">*</span></label
                >
                <select
                  v-model="onboardingEditForm.posisi_title"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  required
                >
                  <option value="">— Pilih Title —</option>
                  <option v-for="pt in masterPositionTitles" :key="pt.id" :value="pt.name">
                    {{ pt.name }}
                  </option>
                </select>
              </div>
              <!-- Posisi — auto-computed from level + title, read-only -->
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted">
                  Posisi <span class="required">*</span>
                  <span class="ml-1 normal-case font-normal text-muted opacity-70">(otomatis)</span>
                </label>
                <input
                  :value="onboardingEditForm.posisi"
                  disabled
                  :class="onboardingFormControlClass"
                  type="text"
                  placeholder="Terisi otomatis dari Level + Title"
                />
              </div>
              <!-- Divisi dropdown from master_divisions -->
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted"
                  >Divisi <span class="required">*</span></label
                >
                <select
                  v-model="onboardingEditForm.divisi"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  required
                >
                  <option value="">— Pilih Divisi —</option>
                  <option v-for="div in masterDivisions" :key="div.id" :value="div.name">
                    {{ div.name }}
                  </option>
                </select>
              </div>
              <!-- Departemen dropdown from master_departments -->
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted"
                  >Departemen <span class="required">*</span></label
                >
                <select
                  v-model="onboardingEditForm.departement"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  required
                >
                  <option value="">— Pilih Departemen —</option>
                  <option v-for="dept in masterDepartments" :key="dept.id" :value="dept.name">
                    {{ dept.name }}
                  </option>
                </select>
              </div>
              <!-- Unit dropdown from master_units -->
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted"
                  >Unit <span class="required">*</span></label
                >
                <select
                  v-model="onboardingEditForm.unit"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  required
                >
                  <option value="">— Pilih Unit —</option>
                  <option v-for="unit in masterUnits" :key="unit.id" :value="unit.name">
                    {{ unit.name }}
                  </option>
                </select>
              </div>
              <!-- Atasan Langsung -->
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted"
                  >Atasan Langsung <span class="required">*</span></label
                >
                <USelectMenu
                  v-model="onboardingEditForm.atasan_langsung"
                  :items="formattedEmployees"
                  value-key="nik"
                  label-key="label"
                  placeholder="Pilih Atasan Langsung"
                  :disabled="!!activeCandidate?.employee_nik"
                  class="mt-2 w-full"
                />
              </div>
              <!-- Atasan Tidak Langsung -->
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted"
                  >Atasan Tidak Langsung <span class="required">*</span></label
                >
                <USelectMenu
                  v-model="onboardingEditForm.atasan_tidak_langsung"
                  :items="formattedEmployees"
                  value-key="nik"
                  label-key="label"
                  placeholder="Pilih Atasan Tidak Langsung"
                  :disabled="!!activeCandidate?.employee_nik"
                  class="mt-2 w-full"
                />
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <h5
              class="text-xs font-bold text-highlighted uppercase tracking-wider mb-2 pb-1 border-b border-default"
            >
              Pengaturan NIK & PIN Karyawan Resmi
            </h5>
            <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <div class="form-group-sm">
                <label class="text-[10px] font-bold uppercase text-muted"
                  >Nomor Induk Karyawan (NIK) <span class="required">*</span></label
                >
                <input
                  v-model="onboardingEditForm.nik"
                  :disabled="!!activeCandidate?.employee_nik"
                  :class="onboardingFormControlClass"
                  type="text"
                  placeholder="Contoh: HPP000000001"
                  required
                />
              </div>
              <div class="form-group-sm" v-if="!activeCandidate?.employee_nik">
                <label class="text-[10px] font-bold uppercase text-muted"
                  >PIN Absensi / Akses Karyawan <span class="required">*</span></label
                >
                <input
                  v-model="onboardingEditForm.pin"
                  :class="onboardingFormControlClass"
                  type="text"
                  placeholder="Contoh: 1234"
                  required
                />
              </div>
              <div class="form-group-sm" v-else>
                <label class="text-[10px] font-bold uppercase text-muted">PIN Absensi</label>
                <input value="******" disabled :class="onboardingFormControlClass" type="text" />
              </div>
            </div>
          </div>
        </div>

        <template #footer v-if="!activeCandidate?.employee_nik">
          <div class="flex justify-end gap-3">
            <UButton
              size="sm"
              color="neutral"
              variant="ghost"
              label="Batal"
              @click="onboardingVerificationModalOpen = false"
            />
            <UButton
              size="sm"
              color="primary"
              icon="i-lucide-save"
              label="Simpan Perubahan"
              :disabled="updatingStage"
              :loading="updatingStage"
              @click="submitSaveOnboardingDraft"
            />
          </div>
        </template>
      </UCard>
    </div>

    <!-- Interview Completion Confirmation Modal -->
    <div
      v-if="interviewCompletionConfirmation.open"
      class="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      :aria-label="interviewCompletionConfirmation.title"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60"
        aria-label="Tutup modal"
        @click="closeInterviewCompletionConfirmation"
      ></button>
      <UCard class="relative w-full max-w-md overflow-hidden">
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <div class="flex min-w-0 items-center gap-3">
              <span
                class="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500/12 text-emerald-500"
              >
                <UIcon name="i-lucide-circle-check-big" class="size-5" />
              </span>
              <div class="min-w-0">
                <p class="text-sm font-bold text-highlighted">
                  {{ interviewCompletionConfirmation.title }}
                </p>
                <p class="mt-0.5 text-xs text-muted">Konfirmasi penyelesaian jadwal wawancara</p>
              </div>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              :disabled="updatingStage"
              @click="closeInterviewCompletionConfirmation"
            />
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-sm leading-6 text-default">
            Anda akan menandai wawancara kandidat
            <strong class="text-highlighted">{{ activeCandidate?.name }}</strong>
            sebagai selesai.
          </p>

          <div class="grid grid-cols-2 gap-3 rounded-xl border border-default bg-muted/10 p-3">
            <div>
              <span class="block text-[10px] font-bold uppercase tracking-wide text-muted"
                >Tanggal Interview</span
              >
              <strong class="mt-1 block text-xs text-highlighted">{{
                formatDate(interviewCompletionConfirmation.date)
              }}</strong>
            </div>
            <div>
              <span class="block text-[10px] font-bold uppercase tracking-wide text-muted"
                >Waktu Interview</span
              >
              <strong class="mt-1 block text-xs text-highlighted"
                >{{
                  String(interviewCompletionConfirmation.time || '').substring(0, 5)
                }}
                WIB</strong
              >
            </div>
            <div class="col-span-2 border-t border-default/60 pt-3">
              <label class="mb-1.5 flex items-center gap-1 text-xs font-bold text-highlighted">
                <UIcon name="i-lucide-clock-check" class="size-4 text-emerald-500" />
                Jam Wawancara Selesai <span class="text-red-500">*</span>
              </label>
              <input
                v-model="interviewCompletionConfirmation.endTime"
                type="time"
                required
                :min="addMinutesToTime(interviewCompletionConfirmation.time, 1)"
                :class="formControlClass"
              />
              <p class="mt-1.5 text-[11px] leading-4 text-muted">
                Pilih waktu wawancara benar-benar berakhir. Waktu ini digunakan sebagai waktu
                selesai, bukan waktu tombol diklik.
              </p>
              <p
                v-if="interviewEndTimeError"
                class="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-red-500"
              >
                <UIcon name="i-lucide-circle-alert" class="size-3.5 shrink-0" />
                {{ interviewEndTimeError }}
              </p>
            </div>
          </div>

          <div
            class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-600"
          >
            <p class="flex items-start gap-2 font-semibold">
              <UIcon name="i-lucide-triangle-alert" class="mt-0.5 size-4 shrink-0" />
              <span>{{ interviewCompletionConfirmation.description }}</span>
            </p>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton
              size="sm"
              color="neutral"
              variant="ghost"
              label="Batal"
              :disabled="updatingStage"
              @click="closeInterviewCompletionConfirmation"
            />
            <UButton
              size="sm"
              color="success"
              icon="i-lucide-circle-check-big"
              label="Ya, Tandai Selesai"
              :loading="updatingStage"
              :disabled="updatingStage || !!interviewEndTimeError"
              @click="confirmInterviewCompletion"
            />
          </div>
        </template>
      </UCard>
    </div>

    <!-- Import Confirmation Modal -->
    <div
      v-if="importConfirmationModalOpen"
      class="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60"
        @click="importConfirmationModalOpen = false"
      ></button>
      <UCard class="relative w-full max-w-md overflow-hidden">
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <p class="text-sm font-bold text-highlighted uppercase tracking-wide">
              Konfirmasi Kirim Data Karyawan
            </p>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="importConfirmationModalOpen = false"
            />
          </div>
        </template>

        <div class="space-y-4 text-xs text-default">
          <p>
            Anda akan mengirimkan data onboarding
            <strong class="text-highlighted">{{ activeCandidate?.name }}</strong> ke database master
            karyawan utama.
          </p>

          <div class="warning-alert-box rounded-lg p-3 text-xs space-y-1">
            <p class="font-bold flex items-center gap-1">
              <span class="i-lucide-alert-triangle text-amber-500"></span> PENTING:
            </p>
            <p>
              Pastikan Anda telah mengisi NIK Resmi dan PIN Absensi melalui tombol
              <strong>Lengkapi / Edit Data</strong> sebelumnya. NIK dan PIN ini hanya dapat
              dimasukkan 1 kali dan tidak dapat diubah.
            </p>
            <div class="mt-2 text-default space-y-1 font-semibold">
              <p>
                Draft NIK:
                <span class="text-highlighted">{{ onboardingEditForm.nik || 'Belum diisi!' }}</span>
              </p>
              <p>
                Draft PIN:
                <span class="text-highlighted">{{ onboardingEditForm.pin || 'Belum diisi!' }}</span>
              </p>
            </div>
          </div>

          <label
            class="flex items-start gap-2.5 cursor-pointer text-xs select-none mt-4 p-2 bg-[var(--ui-bg-muted)] rounded-lg border border-[var(--ui-border)]"
          >
            <input
              v-model="importDataChecked"
              type="checkbox"
              class="mt-0.5 rounded border-[var(--ui-border)] text-primary focus:ring-primary"
            />
            <span class="text-muted leading-relaxed">
              Saya menyatakan bahwa data onboarding kandidat ini sudah benar dan siap dikirim ke
              database karyawan master.
            </span>
          </label>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton
              size="sm"
              color="neutral"
              variant="ghost"
              label="Batal"
              @click="importConfirmationModalOpen = false"
            />
            <UButton
              size="sm"
              color="success"
              icon="i-lucide-send"
              label="Ya, Kirim Sekarang"
              :disabled="
                updatingStage ||
                !importDataChecked ||
                !onboardingEditForm.nik ||
                !onboardingEditForm.pin
              "
              :loading="updatingStage"
              @click="confirmAndImportOnboarding"
            />
          </div>
        </template>
      </UCard>
    </div>

    <!-- Create Candidate Dialog -->
    <div
      v-if="createDialogOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Tambah pelamar baru"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60"
        @click="closeCreateDialog"
      ></button>
      <UCard class="relative max-h-[88vh] w-full max-w-2xl overflow-y-auto">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-highlighted">Tambah Pelamar Kerja</p>
              <p class="mt-1 text-xs text-muted">Input profil pelamar baru secara internal.</p>
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

        <form class="space-y-6" @submit.prevent="saveCandidate">
          <!-- Lowongan & PIC Screening -->
          <div class="border-b border-default pb-5">
            <h4 class="text-xs font-bold text-muted uppercase tracking-wider mb-3.5">
              Informasi Lowongan
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="mb-2 block text-sm font-medium text-muted">Posisi Lowongan</label>
                <select v-model="form.vacancy_id" :class="formControlClass">
                  <option value="">Umum (Tanpa lowongan spesifik)</option>
                  <option v-for="v in vacancies" :key="v.id" :value="v.id">{{ v.title }}</option>
                </select>
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-muted"
                  >PIC Screening <span class="text-danger">*</span></label
                >
                <select v-model="form.pic_nik" required :class="formControlClass">
                  <option value="" disabled selected>Pilih PIC (Staff HRBP)</option>
                  <option v-for="emp in hrbpStaffEmployees" :key="emp.nik" :value="emp.nik">
                    {{ emp.label }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Data Pribadi & Kontak -->
          <div class="border-b border-default pb-5">
            <h4 class="text-xs font-bold text-muted uppercase tracking-wider mb-3.5">
              Profil & Kontak
            </h4>
            <div class="space-y-4">
              <div>
                <label class="mb-2 block text-sm font-medium text-muted"
                  >Nama Lengkap <span class="text-danger">*</span></label
                >
                <input
                  v-model="form.name"
                  required
                  placeholder="Nama lengkap pelamar"
                  :class="formControlClass"
                />
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="mb-2 block text-sm font-medium text-muted"
                    >Email <span class="text-danger">*</span></label
                  >
                  <input
                    v-model="form.email"
                    type="email"
                    required
                    placeholder="email@domain.com"
                    :class="formControlClass"
                  />
                </div>
                <div>
                  <label class="mb-2 block text-sm font-medium text-muted"
                    >Nomor Telepon / HP <span class="text-danger">*</span></label
                  >
                  <input
                    v-model="form.phone"
                    required
                    placeholder="Contoh: 08123456789"
                    :class="formControlClass"
                  />
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="mb-2 block text-sm font-medium text-muted"
                    >Status Pernikahan <span class="text-danger">*</span></label
                  >
                  <select v-model="form.marital_status" required :class="formControlClass">
                    <option value="" disabled selected>Pilih Status</option>
                    <option value="Belum Menikah">Belum Menikah</option>
                    <option value="Menikah">Menikah</option>
                    <option value="Duda / Janda">Duda / Janda</option>
                  </select>
                </div>
                <div>
                  <label class="mb-2 block text-sm font-medium text-muted"
                    >Orang yang Dikenal di Hompimplay (Opsional)</label
                  >
                  <input
                    v-model="form.known_person"
                    placeholder="Nama kerabat jika ada"
                    :class="formControlClass"
                  />
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="mb-2 block text-sm font-medium text-muted"
                    >Perusahaan Sebelumnya</label
                  >
                  <input
                    v-model="form.last_company"
                    placeholder="Nama perusahaan terakhir"
                    :class="formControlClass"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Pendidikan & Finansial -->
          <div class="space-y-4">
            <h4 class="text-xs font-bold text-muted uppercase tracking-wider mb-3.5">
              Pendidikan & Finansial
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="mb-2 block text-sm font-medium text-muted"
                  >Pendidikan Terakhir <span class="text-danger">*</span></label
                >
                <select v-model="form.education_level" required :class="formControlClass">
                  <option value="" disabled selected>Pilih Pendidikan</option>
                  <option value="SMK">SMK</option>
                  <option value="SMA">SMA</option>
                  <option value="D3">D3</option>
                  <option value="D4">D4</option>
                  <option value="S1">S1</option>
                </select>
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-muted"
                  >Jurusan Pendidikan Terakhir <span class="text-danger">*</span></label
                >
                <input
                  v-model="form.education_major"
                  required
                  placeholder="Contoh: Teknik Informatika"
                  :class="formControlClass"
                />
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="mb-2 block text-sm font-medium text-muted"
                  >Gaji Saat Ini (Take Home Pay) <span class="text-danger">*</span></label
                >
                <input
                  :value="formatSalaryInput(form.previous_salary)"
                  @input="form.previous_salary = parseSalaryInput($event.target.value)"
                  type="text"
                  required
                  placeholder="Contoh: 5.000.000"
                  :class="formControlClass"
                />
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-muted"
                  >Gaji yang Diharapkan (Take Home Pay) <span class="text-danger">*</span></label
                >
                <input
                  :value="formatSalaryInput(form.expected_salary)"
                  @input="form.expected_salary = parseSalaryInput($event.target.value)"
                  type="text"
                  required
                  placeholder="Contoh: 7.000.000"
                  :class="formControlClass"
                />
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="mb-2 block text-sm font-medium text-muted"
                  >Mengetahui Info Lowongan Dari</label
                >
                <select v-model="form.referred_from" :class="formControlClass">
                  <option value="">Pilih Sumber Info</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="JobStreet">JobStreet</option>
                  <option value="Indeed">Indeed</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Website Resmi">Website Resmi</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-muted"
                  >Unggah CV / Resume (PDF) <span class="text-danger">*</span></label
                >
                <input
                  type="file"
                  accept=".pdf"
                  required
                  @change="handleCreateCandidateCvChange"
                  :class="formControlClass"
                />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton
              type="button"
              label="Batal"
              color="neutral"
              variant="ghost"
              @click="closeCreateDialog"
            />
            <UButton type="submit" label="Simpan Pelamar" :loading="isSubmitting" />
          </div>
        </form>
      </UCard>
    </div>

    <!-- Edit Candidate Dialog -->
    <div
      v-if="editDialogOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Edit detail pelamar"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60"
        @click="closeEditDialog"
      ></button>
      <UCard class="relative max-h-[88vh] w-full max-w-2xl overflow-y-auto">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-highlighted">Edit Data Pelamar</p>
              <p class="mt-1 text-xs text-muted">Perbarui profil dan catatan pelamar.</p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="closeEditDialog"
            />
          </div>
        </template>

        <form class="space-y-6" @submit.prevent="updateCandidate">
          <!-- Profil & Kontak -->
          <div class="border-b border-default pb-5">
            <h4 class="text-xs font-bold text-muted uppercase tracking-wider mb-3.5">
              Profil & Kontak
            </h4>
            <div class="space-y-4">
              <div>
                <label class="mb-2 block text-sm font-medium text-muted"
                  >Nama Lengkap <span class="text-danger">*</span></label
                >
                <input v-model="editForm.name" required :class="formControlClass" />
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="mb-2 block text-sm font-medium text-muted"
                    >Email <span class="text-danger">*</span></label
                  >
                  <input v-model="editForm.email" type="email" required :class="formControlClass" />
                </div>
                <div>
                  <label class="mb-2 block text-sm font-medium text-muted"
                    >Nomor Telepon / HP <span class="text-danger">*</span></label
                  >
                  <input v-model="editForm.phone" required :class="formControlClass" />
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="mb-2 block text-sm font-medium text-muted"
                    >Status Pernikahan <span class="text-danger">*</span></label
                  >
                  <select v-model="editForm.marital_status" required :class="formControlClass">
                    <option value="" disabled>Pilih Status</option>
                    <option value="Belum Menikah">Belum Menikah</option>
                    <option value="Menikah">Menikah</option>
                    <option value="Duda / Janda">Duda / Janda</option>
                  </select>
                </div>
                <div>
                  <label class="mb-2 block text-sm font-medium text-muted"
                    >Orang yang Dikenal di Hompimplay (Opsional)</label
                  >
                  <input v-model="editForm.known_person" :class="formControlClass" />
                </div>
              </div>
            </div>
          </div>

          <!-- Pendidikan & Finansial -->
          <div class="border-b border-default pb-5 space-y-4">
            <h4 class="text-xs font-bold text-muted uppercase tracking-wider mb-3.5">
              Pendidikan & Finansial
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="mb-2 block text-sm font-medium text-muted"
                  >Pendidikan Terakhir <span class="text-danger">*</span></label
                >
                <select v-model="editForm.education_level" required :class="formControlClass">
                  <option value="" disabled>Pilih Pendidikan</option>
                  <option value="SMK">SMK</option>
                  <option value="SMA">SMA</option>
                  <option value="D3">D3</option>
                  <option value="D4">D4</option>
                  <option value="S1">S1</option>
                </select>
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-muted"
                  >Jurusan Pendidikan Terakhir <span class="text-danger">*</span></label
                >
                <input v-model="editForm.education_major" required :class="formControlClass" />
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="mb-2 block text-sm font-medium text-muted"
                  >Gaji Saat Ini (Take Home Pay) <span class="text-danger">*</span></label
                >
                <input
                  :value="formatSalaryInput(editForm.previous_salary)"
                  @input="editForm.previous_salary = parseSalaryInput($event.target.value)"
                  type="text"
                  required
                  placeholder="Contoh: 5.000.000"
                  :class="formControlClass"
                />
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-muted"
                  >Gaji yang Diharapkan (Take Home Pay) <span class="text-danger">*</span></label
                >
                <input
                  :value="formatSalaryInput(editForm.expected_salary)"
                  @input="editForm.expected_salary = parseSalaryInput($event.target.value)"
                  type="text"
                  required
                  placeholder="Contoh: 7.000.000"
                  :class="formControlClass"
                />
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="mb-2 block text-sm font-medium text-muted">Posisi Lowongan</label>
                <select v-model="editForm.vacancy_id" :class="formControlClass">
                  <option value="">Umum (Tanpa lowongan spesifik)</option>
                  <option v-for="v in vacancies" :key="v.id" :value="v.id">{{ v.title }}</option>
                </select>
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-muted"
                  >PIC Screening <span class="text-danger">*</span></label
                >
                <select v-model="editForm.pic_nik" required :class="formControlClass">
                  <option value="" disabled>Pilih PIC (Staff HRBP)</option>
                  <option v-for="emp in hrbpStaffEmployees" :key="emp.nik" :value="emp.nik">
                    {{ emp.label }}
                  </option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="mb-2 block text-sm font-medium text-muted"
                  >Mengetahui Info Lowongan Dari</label
                >
                <select v-model="editForm.referred_from" :class="formControlClass">
                  <option value="">Pilih Sumber Info</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="JobStreet">JobStreet</option>
                  <option value="Indeed">Indeed</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Website Resmi">Website Resmi</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-muted"
                  >Perusahaan Sebelumnya</label
                >
                <input
                  v-model="editForm.last_company"
                  placeholder="Nama perusahaan terakhir"
                  :class="formControlClass"
                />
              </div>
            </div>
          </div>

          <!-- Catatan / Evaluasi HRD -->
          <div>
            <label class="mb-2 block text-sm font-medium text-muted">Catatan & Evaluasi HRD</label>
            <textarea v-model="editForm.notes" rows="4" :class="formControlClass"></textarea>
          </div>

          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton
              type="button"
              label="Batal"
              color="neutral"
              variant="ghost"
              @click="closeEditDialog"
            />
            <UButton type="submit" label="Simpan Perubahan" :loading="isSubmitting" />
          </div>
        </form>
      </UCard>
    </div>
    <!-- HR Interview Schedule Modal -->
    <div
      v-if="hrInterviewModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Atur Jadwal Wawancara HR"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60"
        @click="hrInterviewModalOpen = false"
      ></button>
      <UCard class="relative max-h-[88vh] w-full max-w-lg overflow-y-auto">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-highlighted">Atur Jadwal Wawancara HR</p>
              <p class="mt-1 text-xs text-muted">Tentukan waktu dan tipe wawancara HR.</p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="hrInterviewModalOpen = false"
            />
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="submitHrInterview">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-muted">Tanggal</label>
              <input
                v-model="hrInterviewForm.interview_hr_date"
                type="date"
                required
                :min="minimumInterviewDate"
                :class="formControlClass"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-muted">Jam (WIB)</label>
              <input
                v-model="hrInterviewForm.interview_hr_time"
                type="time"
                required
                :min="
                  hrInterviewForm.interview_hr_date === minimumInterviewDate
                    ? minimumInterviewTime
                    : undefined
                "
                :class="formControlClass"
              />
            </div>
          </div>
          <p class="flex items-center gap-1.5 text-xs text-muted">
            <span class="i-lucide-info size-3.5 text-primary"></span>
            Jadwal harus menggunakan tanggal dan waktu yang belum lewat.
          </p>
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Tipe Wawancara</label>
            <select v-model="hrInterviewForm.interview_hr_type" :class="formControlClass">
              <option value="online">Online (Google Meet / Zoom)</option>
              <option value="offline">Offline (Lokasi Kantor)</option>
            </select>
          </div>
          <div v-if="hrInterviewForm.interview_hr_type === 'online'">
            <label class="mb-1 block text-sm font-medium text-muted">Link Meeting</label>
            <input
              v-model="hrInterviewForm.interview_hr_meet_link"
              required
              placeholder="https://meet.google.com/xxx"
              :class="formControlClass"
            />
          </div>
          <div v-else>
            <label class="mb-1 block text-sm font-medium text-muted">Lokasi Fisik</label>
            <textarea
              v-model="hrInterviewForm.interview_hr_location"
              required
              placeholder="Tuliskan nama ruangan / alamat kantor..."
              rows="2"
              :class="formControlClass"
            ></textarea>
          </div>

          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton
              type="button"
              label="Batal"
              color="neutral"
              variant="ghost"
              @click="hrInterviewModalOpen = false"
            />
            <UButton
              type="submit"
              label="Simpan & Kirim Undangan"
              :loading="updatingStage"
              :disabled="
                updatingStage ||
                !isInterviewScheduleInFuture(
                  hrInterviewForm.interview_hr_date,
                  hrInterviewForm.interview_hr_time,
                )
              "
            />
          </div>
        </form>
      </UCard>
    </div>

    <!-- Case Study Sending Modal -->
    <div
      v-if="caseStudyModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Kirim Soal Studi Kasus"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60"
        @click="caseStudyModalOpen = false"
      ></button>
      <UCard class="relative max-h-[88vh] w-full max-w-lg overflow-y-auto">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-highlighted">Kirim Soal Studi Kasus</p>
              <p class="mt-1 text-xs text-muted">
                Lampirkan file PDF soal atau sertakan tautan eksternal studi kasus.
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="caseStudyModalOpen = false"
            />
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="submitCaseStudy">
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Tautan Soal (Opsional)</label>
            <input
              v-model="caseStudyForm.link"
              placeholder="https://github.com/example/case-study"
              :class="formControlClass"
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-muted"
              >File Soal (.pdf, .zip, .docx) (Opsional)</label
            >
            <input type="file" @change="handleCaseStudyFileChange" :class="formControlClass" />
          </div>

          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton
              type="button"
              label="Batal"
              color="neutral"
              variant="ghost"
              @click="caseStudyModalOpen = false"
            />
            <UButton type="submit" label="Kirim Email Soal" :loading="updatingStage" />
          </div>
        </form>
      </UCard>
    </div>

    <!-- Modal Rekap Jawaban Reference Check -->
    <div
      v-if="referenceRecapModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Rekap Jawaban Reference Check"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60"
        @click="referenceRecapModalOpen = false"
      ></button>
      <UCard
        class="relative flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden"
        :ui="{ body: 'p-0 min-h-0 flex-1 overflow-y-auto' }"
      >
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-highlighted">
                Rekap Jawaban Reference Check - {{ activeCandidate?.name }}
              </p>
              <p class="mt-1 text-xs text-muted">
                Rangkuman jawaban dari seluruh pemberi referensi kandidat.
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="referenceRecapModalOpen = false"
            />
          </div>
        </template>

        <div class="min-w-[760px] p-4 sm:p-6">
          <table class="w-full border-collapse text-left text-xs">
            <thead>
              <tr
                class="border-b border-default bg-muted/10 text-[10px] font-bold uppercase tracking-wider text-muted"
              >
                <th class="px-4 py-3">Aspek Penilaian</th>
                <th
                  v-for="(ref, index) in submittedReferences"
                  :key="`reference-head-${ref.id}`"
                  class="min-w-52 px-4 py-3 text-center"
                >
                  <span class="block font-bold text-highlighted">{{ ref.name }}</span>
                  <span class="mt-0.5 block text-[9px] font-normal text-muted"
                    >Referensi {{ index + 1 }} ·
                    {{ ref.form_type === 'managerial' ? 'Managerial' : 'Staff' }}</span
                  >
                </th>
                <th class="px-4 py-3 text-center font-bold text-primary">Rata-rata</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr
                v-for="aspect in visibleReferenceAnswerAspects"
                :key="aspect.key"
                class="align-top transition-colors hover:bg-muted/5"
              >
                <td class="px-4 py-3 font-semibold text-highlighted">{{ aspect.label }}</td>
                <td
                  v-for="ref in submittedReferences"
                  :key="`${aspect.key}-${ref.id}`"
                  class="px-4 py-3 text-center text-muted"
                >
                  <p class="whitespace-pre-wrap">{{ ref.answers[aspect.key] || '-' }}</p>
                </td>
                <td class="px-4 py-3 text-center font-semibold text-muted">–</td>
              </tr>
              <tr class="border-t-2 border-default bg-muted/10">
                <td class="px-4 py-4 text-sm font-bold text-highlighted">Rating</td>
                <td
                  v-for="ref in submittedReferences"
                  :key="`rating-${ref.id}`"
                  class="px-4 py-4 text-center font-bold text-highlighted"
                >
                  {{ ref.answers.rating }} / 5
                </td>
                <td class="px-4 py-4 text-center text-sm font-extrabold text-primary">
                  {{ averageReferenceRating }} / 5
                </td>
              </tr>
              <tr class="bg-muted/5">
                <td class="px-4 py-4 text-sm font-bold text-highlighted">Rekomendasi</td>
                <td
                  v-for="ref in submittedReferences"
                  :key="`recommendation-${ref.id}`"
                  class="px-4 py-4 text-center"
                >
                  <UBadge
                    :color="ref.answers.recommendation === 'yes' ? 'success' : 'error'"
                    variant="solid"
                    size="sm"
                  >
                    {{
                      ref.answers.recommendation === 'yes'
                        ? 'Direkomendasikan'
                        : 'Tidak Direkomendasikan'
                    }}
                  </UBadge>
                </td>
                <td class="px-4 py-4 text-center">
                  <UBadge
                    :color="
                      referenceRecommendationConsensus === 'Direkomendasikan'
                        ? 'success'
                        : referenceRecommendationConsensus === 'Berimbang'
                          ? 'warning'
                          : 'error'
                    "
                    variant="solid"
                    size="sm"
                  >
                    {{ referenceRecommendationConsensus }}
                  </UBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <template #footer>
          <div class="flex justify-end">
            <UButton
              type="button"
              label="Tutup"
              color="neutral"
              variant="soft"
              @click="referenceRecapModalOpen = false"
            />
          </div>
        </template>
      </UCard>
    </div>

    <!-- Modal Konsensus & Ringkasan Nilai Wawancara User -->
    <div
      v-if="consensusModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Konsensus & Ringkasan Nilai Wawancara User"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60"
        @click="consensusModalOpen = false"
      ></button>
      <UCard
        class="relative max-h-[88vh] w-full max-w-4xl overflow-y-auto"
        :ui="{ body: 'p-0 overflow-x-auto' }"
      >
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-highlighted">
                Konsensus & Ringkasan Nilai Wawancara User - {{ activeCandidate?.name }}
              </p>
              <p class="mt-1 text-xs text-muted">
                Perbandingan nilai dan ulasan dari seluruh pewawancara lintas tahap.
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="consensusModalOpen = false"
            />
          </div>
        </template>

        <div class="p-6 space-y-6 min-w-[700px]">
          <!-- Matrix Table -->
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr
                class="border-b border-default bg-muted/10 text-muted uppercase tracking-wider text-[10px] font-bold"
              >
                <th class="py-3 px-4">Aspek Penilaian</th>
                <th v-for="ev in submittedEvaluations" :key="ev.id" class="py-3 px-4 text-center">
                  <span class="block text-highlighted font-bold">{{
                    ev.interviewer?.nama_karyawan || ev.interviewer_nik
                  }}</span>
                  <span class="block text-[9px] text-muted font-normal mt-0.5"
                    >Tahap {{ ev.round }}</span
                  >
                </th>
                <th class="py-3 px-4 text-center text-primary font-bold">Rata-Rata</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr
                v-for="aspect in evaluationAspects"
                :key="aspect.key"
                class="hover:bg-muted/5 transition-colors"
              >
                <td class="py-3 px-4 font-medium text-highlighted">{{ aspect.label }}</td>
                <td
                  v-for="ev in submittedEvaluations"
                  :key="ev.id"
                  class="py-3 px-4 text-center font-bold"
                >
                  {{
                    ev[aspect.key] !== null && ev[aspect.key] !== undefined ? ev[aspect.key] : '-'
                  }}
                </td>
                <td class="py-3 px-4 text-center font-bold text-primary">
                  {{ getAspectAverageScore(aspect.key) }}
                </td>
              </tr>
              <!-- Totals row -->
              <tr class="border-t-2 border-default bg-muted/10 font-bold">
                <td class="py-4 px-4 text-sm font-bold text-highlighted">Total Skor (Komulatif)</td>
                <td
                  v-for="ev in submittedEvaluations"
                  :key="ev.id"
                  class="py-4 px-4 text-center text-sm font-bold text-highlighted"
                >
                  {{ ev.interview_total_score }} / 36
                </td>
                <td class="py-4 px-4 text-center text-sm font-extrabold text-primary">
                  {{ overallUserInterviewAverageScore }} / 36
                </td>
              </tr>
              <!-- Recommendations row -->
              <tr class="bg-muted/5 font-bold">
                <td class="py-4 px-4 text-sm font-bold text-highlighted">Rekomendasi Kelulusan</td>
                <td v-for="ev in submittedEvaluations" :key="ev.id" class="py-4 px-4 text-center">
                  <UBadge
                    :color="
                      ev.interview_recommendation === 'disarankan'
                        ? 'success'
                        : ev.interview_recommendation === 'dipertimbangkan'
                          ? 'warning'
                          : 'danger'
                    "
                    size="md"
                    class="px-2 py-0.5 capitalize"
                  >
                    {{ evalRecommendationLabel(ev.interview_recommendation) }}
                  </UBadge>
                </td>
                <td class="py-4 px-4 text-center text-sm text-primary font-bold">-</td>
              </tr>
            </tbody>
          </table>

          <!-- Interviewer Comments Section -->
          <div class="border-t border-default pt-6 space-y-4">
            <h5 class="font-bold text-sm text-highlighted">Catatan & Ulasan Setiap Pewawancara</h5>
            <div class="grid grid-cols-1 gap-4">
              <div
                v-for="ev in submittedEvaluations"
                :key="ev.id"
                class="bg-muted/10 border border-default p-4 rounded-xl space-y-2"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <span class="font-bold text-highlighted block">{{
                      ev.interviewer?.nama_karyawan || ev.interviewer_nik
                    }}</span>
                    <span class="text-[10px] text-muted block"
                      >NIK: {{ ev.interviewer_nik }} &bull; Wawancara User Tahap
                      {{ ev.round }}</span
                    >
                  </div>
                  <UBadge
                    :color="
                      ev.interview_recommendation === 'disarankan'
                        ? 'success'
                        : ev.interview_recommendation === 'dipertimbangkan'
                          ? 'warning'
                          : 'danger'
                    "
                    size="md"
                    class="px-2 py-0.5 capitalize"
                  >
                    {{ evalRecommendationLabel(ev.interview_recommendation) }}
                  </UBadge>
                </div>
                <p
                  class="text-xs text-highlighted/80 whitespace-pre-line leading-relaxed italic bg-default/40 p-3 rounded-lg border border-default/50 mt-1"
                >
                  &ldquo;{{
                    ev.interview_evaluation_notes || 'Tidak ada catatan ulasan tambahan.'
                  }}&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end">
            <UButton
              type="button"
              label="Tutup"
              color="neutral"
              variant="soft"
              @click="consensusModalOpen = false"
            />
          </div>
        </template>
      </UCard>
    </div>

    <!-- User Interview Scheduling Modal -->
    <div
      v-if="userInterviewModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Atur Jadwal Wawancara User"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60"
        @click="userInterviewModalOpen = false"
      ></button>
      <UCard class="relative max-h-[88vh] w-full max-w-lg overflow-y-auto">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-highlighted">
                Atur Jadwal Wawancara User - Tahap #{{ userInterviewForm.round }}
              </p>
              <p class="mt-1 text-xs text-muted">Tentukan waktu, tipe, dan pewawancara internal.</p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="userInterviewModalOpen = false"
            />
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="submitUserInterview">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-muted">Tanggal</label>
              <input
                v-model="userInterviewForm.interview_date"
                type="date"
                required
                :min="minimumInterviewDate"
                :class="formControlClass"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-muted">Jam (WIB)</label>
              <input
                v-model="userInterviewForm.interview_time"
                type="time"
                required
                :min="
                  userInterviewForm.interview_date === minimumInterviewDate
                    ? minimumInterviewTime
                    : undefined
                "
                :class="formControlClass"
              />
            </div>
          </div>
          <p class="flex items-center gap-1.5 text-xs text-muted">
            <span class="i-lucide-info size-3.5 text-primary"></span>
            Jadwal harus menggunakan tanggal dan waktu yang belum lewat.
          </p>
          <div>
            <label class="mb-1 block text-sm font-medium text-muted"
              >Pewawancara (Hanya level Leader/SPV/Asst Mgr/Manager/GM)</label
            >
            <USelectMenu
              v-model="userInterviewForm.interviewer_niks"
              :items="formattedEmployees"
              value-key="nik"
              label-key="label"
              placeholder="Pilih pewawancara (bisa lebih dari satu)"
              multiple
              class="w-full"
            />
          </div>

          <!-- Conflict Warning Banner -->
          <div
            v-if="scheduleConflicts.length"
            class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-600 space-y-1"
          >
            <p class="font-bold flex items-center gap-1.5">
              <span class="i-lucide-alert-triangle"></span> Peringatan Jadwal Bentrok!
            </p>
            <ul class="list-disc pl-4 space-y-1">
              <li v-for="conflict in scheduleConflicts" :key="conflict.nik">
                <template v-if="conflict.nik === 'CANDIDATE'">
                  <strong>Kandidat sendiri</strong> sudah memiliki agenda
                  <strong>{{ conflict.conflict_type }}</strong> pada pukul {{ conflict.time }} WIB.
                </template>
                <template v-else>
                  <strong>{{ conflict.interviewer_name }}</strong> sudah memiliki jadwal
                  <strong>{{ conflict.conflict_type }}</strong> pada pukul {{ conflict.time }} WIB
                  dengan kandidat <strong>{{ conflict.candidate_name }}</strong
                  >.
                </template>
              </li>
            </ul>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Tipe Wawancara</label>
            <select v-model="userInterviewForm.interview_type" :class="formControlClass">
              <option value="online">Online (Google Meet / Zoom)</option>
              <option value="offline">Offline (Lokasi Kantor)</option>
            </select>
          </div>
          <div v-if="userInterviewForm.interview_type === 'online'">
            <label class="mb-1 block text-sm font-medium text-muted">Link Meeting</label>
            <input
              v-model="userInterviewForm.interview_meet_link"
              required
              placeholder="https://meet.google.com/xxx"
              :class="formControlClass"
            />
          </div>
          <div v-else>
            <label class="mb-1 block text-sm font-medium text-muted">Lokasi Fisik</label>
            <textarea
              v-model="userInterviewForm.interview_location"
              required
              placeholder="Tuliskan nama ruangan / alamat kantor..."
              rows="2"
              :class="formControlClass"
            ></textarea>
          </div>

          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton
              type="button"
              label="Batal"
              color="neutral"
              variant="ghost"
              @click="userInterviewModalOpen = false"
            />
            <UButton
              type="submit"
              label="Simpan & Kirim Jadwal"
              :loading="updatingStage"
              :disabled="
                updatingStage ||
                !isInterviewScheduleInFuture(
                  userInterviewForm.interview_date,
                  userInterviewForm.interview_time,
                )
              "
            />
          </div>
        </form>
      </UCard>
    </div>

    <!-- User Interview Evaluation scorecard Modal -->
    <div
      v-if="evalModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Formulir Evaluasi Wawancara User"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60"
        @click="evalModalOpen = false"
      ></button>
      <UCard class="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-highlighted">
                Formulir Evaluasi Wawancara User - Tahap #{{ evalRound }}
              </p>
              <p class="mt-1 text-xs text-muted">Nilai aspek wawancara kandidat (Skor 1-4).</p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="evalModalOpen = false"
            />
          </div>
        </template>

        <form class="space-y-6" @submit.prevent="submitEval">
          <!-- Scoring Table -->
          <div
            class="border border-default rounded-xl overflow-hidden divide-y divide-default bg-muted/5"
          >
            <!-- Table Header -->
            <div
              class="grid grid-cols-12 gap-2 p-3 bg-muted/20 text-[10px] font-bold text-muted uppercase tracking-wider items-center"
            >
              <div class="col-span-8">Aspek Penilaian</div>
              <div class="col-span-1 text-center text-red-500">
                <span class="block text-xs font-bold">1</span>
                <span class="block text-[8px] sm:text-[9px]">(BAD)</span>
              </div>
              <div class="col-span-1 text-center text-amber-500">
                <span class="block text-xs font-bold">2</span>
                <span class="block text-[8px] sm:text-[9px]">(POOR)</span>
              </div>
              <div class="col-span-1 text-center text-blue-500">
                <span class="block text-xs font-bold">3</span>
                <span class="block text-[8px] sm:text-[9px]">(GOOD)</span>
              </div>
              <div class="col-span-1 text-center text-green-500">
                <span class="block text-xs font-bold">4</span>
                <span class="block text-[8px] sm:text-[9px]">(V.GOOD)</span>
              </div>
            </div>

            <!-- Aspect rows -->
            <!-- 1. Penampilan -->
            <div class="grid grid-cols-12 gap-2 p-3 text-xs items-center">
              <div class="col-span-8">
                <span class="font-semibold text-highlighted block">1. Penampilan</span>
                <span class="text-[10px] text-muted block mt-0.5"
                  >Menggambarkan kesopanan, kebersihan dan kerapihan penampilan</span
                >
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_appearance" type="radio" value="1" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_appearance" type="radio" value="2" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_appearance" type="radio" value="3" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_appearance" type="radio" value="4" />
              </div>
            </div>

            <!-- 2. Sikap -->
            <div class="grid grid-cols-12 gap-2 p-3 text-xs items-center">
              <div class="col-span-8">
                <span class="font-semibold text-highlighted block">2. Sikap</span>
                <span class="text-[10px] text-muted block mt-0.5"
                  >Sikap ketika wawancara, cara berhadapan, sopan santun, nonverbal</span
                >
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_attitude" type="radio" value="1" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_attitude" type="radio" value="2" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_attitude" type="radio" value="3" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_attitude" type="radio" value="4" />
              </div>
            </div>

            <!-- 3. Komunikasi -->
            <div class="grid grid-cols-12 gap-2 p-3 text-xs items-center">
              <div class="col-span-8">
                <span class="font-semibold text-highlighted block">3. Komunikasi</span>
                <span class="text-[10px] text-muted block mt-0.5"
                  >Kemampuan menyampaikan ide/pikiran, kepercayaan diri, bahasa asing</span
                >
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_communication" type="radio" value="1" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_communication" type="radio" value="2" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_communication" type="radio" value="3" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_communication" type="radio" value="4" />
              </div>
            </div>

            <!-- 4. Motivasi -->
            <div class="grid grid-cols-12 gap-2 p-3 text-xs items-center">
              <div class="col-span-8">
                <span class="font-semibold text-highlighted block">4. Motivasi</span>
                <span class="text-[10px] text-muted block mt-0.5"
                  >Gambaran dorongan dan keinginan untuk bekerja & hasil terbaik</span
                >
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_motivation" type="radio" value="1" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_motivation" type="radio" value="2" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_motivation" type="radio" value="3" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_motivation" type="radio" value="4" />
              </div>
            </div>

            <!-- 5. Inisiatif -->
            <div class="grid grid-cols-12 gap-2 p-3 text-xs items-center">
              <div class="col-span-8">
                <span class="font-semibold text-highlighted block">5. Inisiatif</span>
                <span class="text-[10px] text-muted block mt-0.5"
                  >Kemampuan memutuskan/melakukan sesuatu tanpa diperintah</span
                >
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_initiative" type="radio" value="1" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_initiative" type="radio" value="2" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_initiative" type="radio" value="3" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_initiative" type="radio" value="4" />
              </div>
            </div>

            <!-- 6. Kerjasama -->
            <div class="grid grid-cols-12 gap-2 p-3 text-xs items-center">
              <div class="col-span-8">
                <span class="font-semibold text-highlighted block">6. Kerjasama</span>
                <span class="text-[10px] text-muted block mt-0.5"
                  >Kemampuan bekerjasama dalam tim secara aktif mencapai tujuan</span
                >
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_teamwork" type="radio" value="1" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_teamwork" type="radio" value="2" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_teamwork" type="radio" value="3" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_teamwork" type="radio" value="4" />
              </div>
            </div>

            <!-- 7. Pengalaman di bidangnya -->
            <div class="grid grid-cols-12 gap-2 p-3 text-xs items-center">
              <div class="col-span-8">
                <span class="font-semibold text-highlighted block">7. Pengalaman di Bidangnya</span>
                <span class="text-[10px] text-muted block mt-0.5"
                  >Pengetahuan dan keterampilan/skill di bidang yang dilamar</span
                >
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_domain_experience" type="radio" value="1" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_domain_experience" type="radio" value="2" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_domain_experience" type="radio" value="3" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_domain_experience" type="radio" value="4" />
              </div>
            </div>

            <!-- 8. Pengetahuan umum -->
            <div class="grid grid-cols-12 gap-2 p-3 text-xs items-center">
              <div class="col-span-8">
                <span class="font-semibold text-highlighted block">8. Pengetahuan Umum</span>
                <span class="text-[10px] text-muted block mt-0.5"
                  >Pengetahuan mengenai perusahaan, brand, dan bidang usaha umum</span
                >
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_general_knowledge" type="radio" value="1" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_general_knowledge" type="radio" value="2" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_general_knowledge" type="radio" value="3" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_general_knowledge" type="radio" value="4" />
              </div>
            </div>

            <!-- 9. Potensi untuk berkembang -->
            <div class="grid grid-cols-12 gap-2 p-3 text-xs items-center">
              <div class="col-span-8">
                <span class="font-semibold text-highlighted block"
                  >9. Potensi untuk Berkembang</span
                >
                <span class="text-[10px] text-muted block mt-0.5"
                  >Gambaran keinginan & kemampuan belajar serta berkembang</span
                >
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_growth_potential" type="radio" value="1" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_growth_potential" type="radio" value="2" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_growth_potential" type="radio" value="3" />
              </div>
              <div class="col-span-1 flex justify-center">
                <input v-model="evalForm.interview_growth_potential" type="radio" value="4" />
              </div>
            </div>
          </div>

          <!-- Total Score Summary Card -->
          <div
            class="bg-muted/10 border border-default p-4 rounded-xl flex items-center justify-between"
          >
            <div>
              <span class="text-xs text-muted block">Skor Kumulatif</span>
              <span class="text-2xl font-bold text-highlighted">{{ evalTotalScore }} / 36</span>
            </div>
            <div class="text-right">
              <span class="text-xs text-muted block">Klasifikasi Rekomendasi</span>
              <UBadge
                :color="
                  evalRecommendation === 'disarankan'
                    ? 'success'
                    : evalRecommendation === 'dipertimbangkan'
                      ? 'warning'
                      : 'danger'
                "
                variant="subtle"
                size="md"
                class="font-bold px-3 py-1 mt-1"
              >
                {{ evalRecommendationLabel(evalRecommendation) }}
              </UBadge>
            </div>
          </div>

          <!-- Notes / Catatan -->
          <div>
            <label class="mb-1 block text-sm font-medium text-muted"
              >Catatan Pewawancara (Interviewer Notes)</label
            >
            <textarea
              v-model="evalForm.interview_evaluation_notes"
              rows="3"
              placeholder="Tuliskan catatan, evaluasi detail, atau alasan rekomendasi..."
              :class="formControlClass"
            ></textarea>
          </div>

          <!-- Footer Actions -->
          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton
              type="button"
              label="Batal"
              color="neutral"
              variant="ghost"
              @click="evalModalOpen = false"
            />
            <UButton type="submit" label="Simpan Penilaian Evaluasi" :loading="updatingStage" />
          </div>
        </form>
      </UCard>
    </div>

    <!-- Offering Letter Upload Modal -->
    <div
      v-if="offeringModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Unggah Offering Letter"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60"
        @click="offeringModalOpen = false"
      ></button>
      <UCard class="relative max-h-[88vh] w-full max-w-lg overflow-hidden">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-highlighted">Unggah Offering Letter</p>
              <p class="mt-1 text-xs text-muted">
                Lampirkan surat penawaran kerja untuk dikirim dan ditandatangani oleh kandidat.
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="offeringModalOpen = false"
            />
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="submitOfferingLetterWithSignature">
          <div>
            <label class="mb-1 block text-sm font-medium text-muted"
              >Berkas Surat Penawaran (PDF)</label
            >
            <div
              class="mt-2 border-2 border-dashed border-default rounded-xl p-6 text-center cursor-pointer hover:border-primary transition relative"
            >
              <input
                type="file"
                accept=".pdf"
                class="absolute inset-0 opacity-0 cursor-pointer"
                @change="handleOfferingFileChange"
              />
              <div class="flex flex-col items-center">
                <span class="i-lucide-file-text size-10 text-muted/60 mb-2"></span>
                <p class="text-sm font-medium text-highlighted">
                  {{
                    offeringLetterFile
                      ? offeringLetterFile.name
                      : 'Klik atau seret file PDF ke sini'
                  }}
                </p>
                <p class="text-xs text-muted mt-1">Ukuran berkas maksimal 5MB</p>
              </div>
            </div>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-muted"
              >Perusahaan Terakhir Kandidat</label
            >
            <input
              v-model="offeringLastCompany"
              type="text"
              placeholder="Contoh: PT. ABC Indonesia"
              :class="formControlClass"
              required
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-muted"
              >Gaji yang Ditawarkan (Rp)</label
            >
            <input
              v-model="offeringOfferedSalary"
              type="text"
              placeholder="Contoh: 10.000.000"
              :class="formControlClass"
              required
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Tanggal Mulai Kerja</label>
            <input v-model="offeringJoinDate" type="date" :class="formControlClass" required />
          </div>

          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton
              type="button"
              label="Batal"
              color="neutral"
              variant="ghost"
              @click="offeringModalOpen = false"
            />
            <UButton
              type="submit"
              label="Upload & Kirim Offering Letter"
              :loading="updatingStage"
            />
          </div>
        </form>
      </UCard>
    </div>

    <!-- Shared Document Preview Modal (CV and recruitment summaries) -->
    <div
      v-if="documentPreview.open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      :aria-label="documentPreview.title"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60"
        aria-label="Tutup pratinjau dokumen"
        @click="closeDocumentPreview"
      ></button>
      <UCard class="relative h-[85vh] w-full overflow-hidden lg:w-2/3">
        <div class="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold text-highlighted">{{ documentPreview.title }}</h3>
            <p class="mt-1 text-sm text-muted">Pratinjau dokumen rekrutmen.</p>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            aria-label="Tutup"
            @click="closeDocumentPreview"
          />
        </div>
        <div v-if="loadingDocument" class="py-16 text-center text-sm text-muted">
          Memuat dokumen berkas...
        </div>
        <div
          v-else-if="documentPreview.url"
          class="h-[calc(85vh-100px)] w-full rounded-md border border-default bg-slate-100 overflow-y-auto p-4"
        >
          <VuePdfEmbed :source="documentPreview.url" />
        </div>
      </UCard>
    </div>
  </section>
</template>

<style>
/* Global Stage Badge & Stepper Custom Colors */

/* Candidate list badges use solid colors to preserve text contrast in both themes. */
.candidate-stage-badge,
.candidate-step-bullet[class*='stage-solid-'] {
  color: #ffffff !important;
}
.candidate-stage-badge.stage-applied,
.candidate-step-bullet.stage-solid-applied {
  background-color: #475569 !important;
  border-color: #334155 !important;
}
.candidate-stage-badge.stage-screening,
.candidate-step-bullet.stage-solid-screening {
  background-color: #0369a1 !important;
  border-color: #075985 !important;
}
.candidate-stage-badge.stage-interview_hr,
.candidate-stage-badge.stage-interview,
.candidate-step-bullet.stage-solid-interview_hr,
.candidate-step-bullet.stage-solid-interview {
  background-color: #7e22ce !important;
  border-color: #6b21a8 !important;
}
.candidate-stage-badge.stage-case_study,
.candidate-step-bullet.stage-solid-case_study {
  background-color: #c2410c !important;
  border-color: #9a3412 !important;
}
.candidate-stage-badge.stage-interview_user,
.candidate-step-bullet.stage-solid-interview_user {
  background-color: #4338ca !important;
  border-color: #3730a3 !important;
}
.candidate-stage-badge.stage-reference_check,
.candidate-step-bullet.stage-solid-reference_check {
  background-color: #0f766e !important;
  border-color: #115e59 !important;
}
.candidate-stage-badge.stage-offering,
.candidate-stage-badge.stage-offered,
.candidate-step-bullet.stage-solid-offering,
.candidate-step-bullet.stage-solid-offered {
  background-color: #be185d !important;
  border-color: #9d174d !important;
}
.candidate-stage-badge.stage-pkb,
.candidate-step-bullet.stage-solid-pkb {
  background-color: #b45309 !important;
  border-color: #92400e !important;
}
.candidate-stage-badge.stage-hired,
.candidate-step-bullet.stage-solid-hired {
  background-color: #047857 !important;
  border-color: #065f46 !important;
}
.candidate-stage-badge.stage-rejected,
.candidate-step-bullet.stage-solid-rejected {
  background-color: #b91c1c !important;
  border-color: #991b1b !important;
}
.candidate-stage-badge > span {
  background-color: currentColor !important;
}

/* Softer candidate badges and completed step bullets, with high-contrast text. */
.candidate-stage-badge.stage-applied,
.candidate-step-bullet.stage-applied {
  background-color: #f1f5f9 !important;
  color: #334155 !important;
  border-color: #94a3b8 !important;
}
.candidate-stage-badge.stage-screening,
.candidate-step-bullet.stage-screening {
  background-color: #e0f2fe !important;
  color: #075985 !important;
  border-color: #38bdf8 !important;
}
.candidate-stage-badge.stage-interview_hr,
.candidate-stage-badge.stage-interview,
.candidate-step-bullet.stage-interview_hr,
.candidate-step-bullet.stage-interview {
  background-color: #f3e8ff !important;
  color: #6b21a8 !important;
  border-color: #c084fc !important;
}
.candidate-stage-badge.stage-case_study,
.candidate-step-bullet.stage-case_study {
  background-color: #ffedd5 !important;
  color: #9a3412 !important;
  border-color: #fb923c !important;
}
.candidate-stage-badge.stage-interview_user,
.candidate-step-bullet.stage-interview_user {
  background-color: #e0e7ff !important;
  color: #3730a3 !important;
  border-color: #818cf8 !important;
}
.candidate-stage-badge.stage-reference_check,
.candidate-step-bullet.stage-reference_check {
  background-color: #ccfbf1 !important;
  color: #115e59 !important;
  border-color: #2dd4bf !important;
}
.candidate-stage-badge.stage-offering,
.candidate-stage-badge.stage-offered,
.candidate-step-bullet.stage-offering,
.candidate-step-bullet.stage-offered {
  background-color: #fce7f3 !important;
  color: #9d174d !important;
  border-color: #f472b6 !important;
}
.candidate-stage-badge.stage-pkb,
.candidate-step-bullet.stage-pkb {
  background-color: #fef3c7 !important;
  color: #92400e !important;
  border-color: #f59e0b !important;
}
.candidate-stage-badge.stage-hired,
.candidate-step-bullet.stage-hired {
  background-color: #d1fae5 !important;
  color: #065f46 !important;
  border-color: #34d399 !important;
}
.candidate-stage-badge.stage-rejected,
.candidate-step-bullet.stage-rejected {
  background-color: #fee2e2 !important;
  color: #991b1b !important;
  border-color: #f87171 !important;
}

/* Applied */
.stage-applied {
  background-color: #f1f5f9;
  color: #334155;
  border-color: #cbd5e1;
}
.stage-bullet-applied {
  background-color: #64748b;
}
.stage-solid-applied {
  background-color: #64748b;
  border-color: #64748b;
  color: #ffffff;
}
.text-stage-applied {
  color: #334155;
}
.stage-ring-applied {
  --tw-ring-color: rgba(100, 116, 139, 0.25);
}

.portal-dark .stage-applied {
  background-color: rgba(148, 163, 184, 0.1);
  color: #cbd5e1;
  border-color: rgba(148, 163, 184, 0.2);
}
.portal-dark .stage-solid-applied {
  background-color: #475569;
  border-color: #475569;
  color: #ffffff;
}
.portal-dark .text-stage-applied {
  color: #cbd5e1;
}

/* Screening */
.stage-screening {
  background-color: #e0f2fe;
  color: #0369a1;
  border-color: #bae6fd;
}
.stage-bullet-screening {
  background-color: #0284c7;
}
.stage-solid-screening {
  background-color: #0284c7;
  border-color: #0284c7;
  color: #ffffff;
}
.text-stage-screening {
  color: #0369a1;
}
.stage-ring-screening {
  --tw-ring-color: rgba(2, 132, 199, 0.25);
}

.portal-dark .stage-screening {
  background-color: rgba(14, 165, 233, 0.15);
  color: #7dd3fc;
  border-color: rgba(14, 165, 233, 0.3);
}
.portal-dark .stage-solid-screening {
  background-color: #0284c7;
  border-color: #0284c7;
  color: #ffffff;
}
.portal-dark .text-stage-screening {
  color: #7dd3fc;
}

/* Wawancara HR / interview */
.stage-interview_hr,
.stage-interview {
  background-color: #f3e8ff;
  color: #6b21a8;
  border-color: #e9d5ff;
}
.stage-bullet-interview_hr,
.stage-bullet-interview {
  background-color: #8b5cf6;
}
.stage-solid-interview_hr,
.stage-solid-interview {
  background-color: #8b5cf6;
  border-color: #8b5cf6;
  color: #ffffff;
}
.text-stage-interview_hr,
.text-stage-interview {
  color: #6b21a8;
}
.stage-ring-interview_hr,
.stage-ring-interview {
  --tw-ring-color: rgba(139, 92, 246, 0.25);
}

.portal-dark .stage-interview_hr,
.portal-dark .stage-interview {
  background-color: rgba(168, 85, 247, 0.15);
  color: #d8b4fe;
  border-color: rgba(168, 85, 247, 0.3);
}
.portal-dark .stage-solid-interview_hr,
.portal-dark .stage-solid-interview {
  background-color: #8b5cf6;
  border-color: #8b5cf6;
  color: #ffffff;
}
.portal-dark .text-stage-interview_hr,
.portal-dark .text-stage-interview {
  color: #d8b4fe;
}

/* Case Study */
.stage-case_study {
  background-color: #ffedd5;
  color: #c2410c;
  border-color: #fed7aa;
}
.stage-bullet-case_study {
  background-color: #f97316;
}
.stage-solid-case_study {
  background-color: #f97316;
  border-color: #f97316;
  color: #ffffff;
}
.text-stage-case_study {
  color: #c2410c;
}
.stage-ring-case_study {
  --tw-ring-color: rgba(249, 115, 22, 0.25);
}

.portal-dark .stage-case_study {
  background-color: rgba(249, 115, 22, 0.15);
  color: #ffb780;
  border-color: rgba(249, 115, 22, 0.3);
}
.portal-dark .stage-solid-case_study {
  background-color: #ea580c;
  border-color: #ea580c;
  color: #ffffff;
}
.portal-dark .text-stage-case_study {
  color: #ffb780;
}

/* Wawancara User */
.stage-interview_user {
  background-color: #e0e7ff;
  color: #3730a3;
  border-color: #c7d2fe;
}
.stage-bullet-interview_user {
  background-color: #6366f1;
}
.stage-solid-interview_user {
  background-color: #6366f1;
  border-color: #6366f1;
  color: #ffffff;
}
.text-stage-interview_user {
  color: #3730a3;
}
.stage-ring-interview_user {
  --tw-ring-color: rgba(99, 102, 241, 0.25);
}

.portal-dark .stage-interview_user {
  background-color: rgba(99, 102, 241, 0.15);
  color: #c7d2fe;
  border-color: rgba(99, 102, 241, 0.3);
}
.portal-dark .stage-solid-interview_user {
  background-color: #4f46e5;
  border-color: #4f46e5;
  color: #ffffff;
}
.portal-dark .text-stage-interview_user {
  color: #c7d2fe;
}

/* Reference Check */
.stage-reference_check {
  background-color: #ccfbf1;
  color: #0f766e;
  border-color: #99f6e4;
}
.stage-bullet-reference_check {
  background-color: #14b8a6;
}
.stage-solid-reference_check {
  background-color: #14b8a6;
  border-color: #14b8a6;
  color: #ffffff;
}
.text-stage-reference_check {
  color: #0f766e;
}
.stage-ring-reference_check {
  --tw-ring-color: rgba(20, 184, 166, 0.25);
}

.portal-dark .stage-reference_check {
  background-color: rgba(20, 184, 166, 0.15);
  color: #99f6e4;
  border-color: rgba(20, 184, 166, 0.3);
}
.portal-dark .stage-solid-reference_check {
  background-color: #0d9488;
  border-color: #0d9488;
  color: #ffffff;
}
.portal-dark .text-stage-reference_check {
  color: #99f6e4;
}

/* Offering / offered */
.stage-offering,
.stage-offered {
  background-color: #fce7f3;
  color: #be185d;
  border-color: #fbcfe8;
}
.stage-bullet-offering,
.stage-bullet-offered {
  background-color: #ec4899;
}
.stage-solid-offering,
.stage-solid-offered {
  background-color: #ec4899;
  border-color: #ec4899;
  color: #ffffff;
}
.text-stage-offering,
.text-stage-offered {
  color: #be185d;
}
.stage-ring-offering,
.stage-ring-offered {
  --tw-ring-color: rgba(236, 72, 153, 0.25);
}

.portal-dark .stage-offering,
.portal-dark .stage-offered {
  background-color: rgba(236, 72, 153, 0.15);
  color: #fbcfe8;
  border-color: rgba(236, 72, 153, 0.3);
}
.portal-dark .stage-solid-offering,
.portal-dark .stage-solid-offered {
  background-color: #db2777;
  border-color: #db2777;
  color: #ffffff;
}
.portal-dark .text-stage-offering,
.portal-dark .text-stage-offered {
  color: #fbcfe8;
}

/* PKB */
.stage-pkb {
  background-color: #fef3c7;
  color: #92400e;
  border-color: #fde68a;
}
.stage-bullet-pkb {
  background-color: #f59e0b;
}
.stage-solid-pkb {
  background-color: #f59e0b;
  border-color: #f59e0b;
  color: #ffffff;
}
.text-stage-pkb {
  color: #92400e;
}
.stage-ring-pkb {
  --tw-ring-color: rgba(245, 158, 11, 0.25);
}

.portal-dark .stage-pkb {
  background-color: rgba(245, 158, 11, 0.15);
  color: #fde68a;
  border-color: rgba(245, 158, 11, 0.3);
}
.portal-dark .stage-solid-pkb {
  background-color: #d97706;
  border-color: #d97706;
  color: #ffffff;
}
.portal-dark .text-stage-pkb {
  color: #fde68a;
}

/* Hired */
.stage-hired {
  background-color: #d1fae5;
  color: #065f46;
  border-color: #a7f3d0;
}
.stage-bullet-hired {
  background-color: #10b981;
}
.stage-solid-hired {
  background-color: #10b981;
  border-color: #10b981;
  color: #ffffff;
}
.text-stage-hired {
  color: #065f46;
}
.stage-ring-hired {
  --tw-ring-color: rgba(16, 185, 129, 0.25);
}

.portal-dark .stage-hired {
  background-color: rgba(16, 185, 129, 0.15);
  color: #a7f3d0;
  border-color: rgba(16, 185, 129, 0.3);
}
.portal-dark .stage-solid-hired {
  background-color: #059669;
  border-color: #059669;
  color: #ffffff;
}
.portal-dark .text-stage-hired {
  color: #a7f3d0;
}

/* Rejected */
.stage-rejected {
  background-color: #fee2e2;
  color: #991b1b;
  border-color: #fca5a5;
}
.stage-bullet-rejected {
  background-color: #ef4444;
}
.stage-solid-rejected {
  background-color: #ef4444;
  border-color: #ef4444;
  color: #ffffff;
}
.text-stage-rejected {
  color: #991b1b;
}
.stage-ring-rejected {
  --tw-ring-color: rgba(239, 68, 68, 0.25);
}

.portal-dark .stage-rejected {
  background-color: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.3);
}
.portal-dark .stage-solid-rejected {
  background-color: #dc2626;
  border-color: #dc2626;
  color: #ffffff;
}
.portal-dark .text-stage-rejected {
  color: #fca5a5;
}

/* Teleported Dropdown Item Specific Custom Text Colors */

.dropdown-text-stage-applied {
  color: #334155;
}
.dark .dropdown-text-stage-applied {
  color: #cbd5e1;
}

.dropdown-text-stage-screening {
  color: #0369a1;
}
.dark .dropdown-text-stage-screening {
  color: #7dd3fc;
}

.dropdown-text-stage-interview_hr,
.dropdown-text-stage-interview {
  color: #6b21a8;
}
.dark .dropdown-text-stage-interview_hr,
.dark .dropdown-text-stage-interview {
  color: #d8b4fe;
}

.dropdown-text-stage-case_study {
  color: #c2410c;
}
.dark .dropdown-text-stage-case_study {
  color: #ffb780;
}

.dropdown-text-stage-interview_user {
  color: #3730a3;
}
.dark .dropdown-text-stage-interview_user {
  color: #c7d2fe;
}

.dropdown-text-stage-reference_check {
  color: #0f766e;
}
.dark .dropdown-text-stage-reference_check {
  color: #99f6e4;
}

.dropdown-text-stage-offering,
.dropdown-text-stage-offered {
  color: #be185d;
}
.dark .dropdown-text-stage-offering,
.dark .dropdown-text-stage-offered {
  color: #fbcfe8;
}

.dropdown-text-stage-pkb {
  color: #92400e;
}
.dark .dropdown-text-stage-pkb {
  color: #fde68a;
}

.dropdown-text-stage-hired {
  color: #065f46;
}
.dark .dropdown-text-stage-hired {
  color: #a7f3d0;
}

.dropdown-text-stage-rejected {
  color: #991b1b;
}
.dark .dropdown-text-stage-rejected {
  color: #fca5a5;
}

.form-group-sm {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.form-group-sm label {
  font-size: 10px;
}
.form-control-sm {
  width: 100% !important;
  padding: 6px 10px !important;
  font-size: 12px !important;
  background-color: #ffffff !important;
  border: 1px solid #d1d5db !important;
  border-radius: 6px !important;
  color: #1f2937 !important;
  outline: none !important;
  transition:
    border-color 0.15s ease-in-out,
    box-shadow 0.15s ease-in-out !important;
}
.dark .form-control-sm {
  background-color: #1f2937 !important;
  border-color: #374151 !important;
  color: #f3f4f6 !important;
}
.form-control-sm:disabled {
  background-color: #f3f4f6 !important;
  color: #9ca3af !important;
  cursor: not-allowed !important;
}
.dark .form-control-sm:disabled {
  background-color: #374151 !important;
  color: #6b7280 !important;
}
.form-control-sm:focus {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
}

.previous-documents-panel {
  padding: 20px;
  border: 1px solid var(--ui-border);
  border-radius: 18px;
  background: var(--ui-bg);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}

.previous-documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.previous-document-card {
  --document-accent: #64748b;
  --document-soft: #f1f5f9;
  display: flex;
  min-height: 86px;
  align-items: flex-start;
  gap: 11px;
  padding: 13px 12px;
  border: 1px solid var(--ui-border);
  border-radius: 13px;
  background: var(--ui-bg);
  color: var(--ui-text-highlighted);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.previous-document-card:hover,
.previous-document-card:focus-visible {
  border-color: color-mix(in srgb, var(--document-accent) 45%, transparent);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--document-accent) 12%, transparent);
  transform: translateY(-1px);
  outline: none;
}

.previous-document-icon {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  place-items: center;
  border-radius: 9px;
  background: var(--document-soft);
  color: var(--document-accent);
  font-size: 17px;
}

.previous-document-stage,
.previous-document-title,
.previous-document-meta {
  display: block;
}

.previous-document-stage {
  margin-bottom: 3px;
  color: var(--document-accent);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.025em;
  line-height: 1.2;
  text-transform: uppercase;
}

.previous-document-title {
  color: var(--ui-text-highlighted);
  font-size: 11px;
  font-weight: 750;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.previous-document-meta {
  margin-top: 5px;
  color: var(--ui-text-dimmed);
  font-size: 9px;
  font-weight: 500;
  line-height: 1.2;
}

.previous-document-action {
  margin-top: 7px;
  flex: 0 0 auto;
  color: color-mix(in srgb, var(--document-accent) 68%, var(--ui-text-dimmed));
  font-size: 13px;
}

.previous-document-card--hr {
  --document-accent: #2563eb;
  --document-soft: #dbeafe;
}

.previous-document-card--case-study {
  --document-accent: #7c3aed;
  --document-soft: #ede9fe;
}

.previous-document-card--user {
  --document-accent: #d97706;
  --document-soft: #fef3c7;
}

.previous-document-card--reference {
  --document-accent: #0d9488;
  --document-soft: #ccfbf1;
}

.previous-document-card--offering {
  --document-accent: #db2777;
  --document-soft: #fce7f3;
}

.previous-document-card--pkb {
  --document-accent: #059669;
  --document-soft: #d1fae5;
}

.dark .previous-document-card {
  --document-soft: color-mix(in srgb, var(--document-accent) 17%, var(--ui-bg));
}

@media (max-width: 640px) {
  .previous-documents-panel {
    padding: 16px;
  }

  .previous-documents-grid {
    grid-template-columns: 1fr;
  }
}

/* Interview workflow: one reading order for HR and multi-round user interviews. */
.interview-workflow-section {
  --interview-soft: color-mix(in srgb, var(--ui-primary) 6%, var(--ui-bg));
  --interview-border: color-mix(in srgb, var(--ui-border) 82%, var(--ui-primary));
}

.interview-section-heading,
.interview-round-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.interview-section-heading {
  margin-bottom: 14px;
}

.interview-section-title,
.interview-round-identity {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.interview-section-title > span,
.interview-subsection-heading > span {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  place-items: center;
  border-radius: 10px;
  background: color-mix(in srgb, var(--ui-primary) 13%, var(--ui-bg));
  color: var(--ui-primary);
  font-size: 19px;
}

.interview-section-title h4 {
  color: var(--ui-text-highlighted);
  font-size: 15px;
  font-weight: 800;
  line-height: 1.2;
}

.interview-section-title p,
.interview-round-identity p,
.interview-subsection-heading p,
.interview-empty-state p {
  margin-top: 2px;
  color: var(--ui-text-muted);
  font-size: 10.5px;
  line-height: 1.4;
}

.interview-heading-actions,
.interview-evaluator-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
  flex-wrap: wrap;
}

.interview-detail-card,
.interview-round-body {
  display: grid;
  gap: 11px;
}

.interview-detail-card {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 14px;
  padding: 13px;
  border: 1px solid var(--interview-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--ui-bg) 96%, var(--ui-bg-muted));
}

.interview-schedule-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.interview-info-tile {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border: 1px solid var(--ui-border);
  border-radius: 11px;
  background: var(--ui-bg);
}

.interview-info-tile--primary {
  border-color: color-mix(in srgb, var(--ui-primary) 24%, var(--ui-border));
  background: var(--interview-soft);
}

.interview-info-tile--status.is-complete {
  border-color: color-mix(in srgb, #10b981 32%, var(--ui-border));
  background: color-mix(in srgb, #10b981 9%, var(--ui-bg));
}

.interview-info-tile--status.is-complete .interview-info-icon {
  background: color-mix(in srgb, #10b981 14%, var(--ui-bg));
  color: #10b981;
}

.interview-info-tile--status.is-complete .interview-info-value {
  color: color-mix(in srgb, #10b981 82%, var(--ui-text-highlighted));
}

.interview-info-tile--status.is-pending {
  border-color: color-mix(in srgb, #f59e0b 34%, var(--ui-border));
  background: color-mix(in srgb, #f59e0b 8%, var(--ui-bg));
}

.interview-info-tile--status.is-pending .interview-info-icon {
  background: color-mix(in srgb, #f59e0b 14%, var(--ui-bg));
  color: #f59e0b;
}

.interview-info-tile > div,
.interview-notification-item > div {
  min-width: 0;
}

.interview-info-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  place-items: center;
  border-radius: 9px;
  background: color-mix(in srgb, var(--ui-primary) 11%, var(--ui-bg));
  color: var(--ui-primary);
  font-size: 17px;
}

.interview-info-label {
  display: block;
  color: var(--ui-text-muted);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.055em;
  line-height: 1.2;
  text-transform: uppercase;
}

.interview-info-value {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
  margin-top: 3px;
  color: var(--ui-text-highlighted);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.interview-type-value {
  color: var(--ui-primary);
  text-transform: capitalize;
  white-space: nowrap;
}

.interview-location-value {
  display: block;
  margin-top: 2px;
  color: var(--ui-text-highlighted);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.interview-location-value.is-link {
  color: var(--ui-primary);
}

.interview-location-value.is-link:hover {
  text-decoration: underline;
}

.interview-communication-panel {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)) auto;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--ui-border);
  border-radius: 11px;
  background: color-mix(in srgb, var(--ui-bg-muted) 45%, var(--ui-bg));
}

.interview-notification-item {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}

.interview-notification-value {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
  margin-top: 3px;
  color: var(--ui-text-highlighted);
  font-size: 10.5px;
  font-weight: 650;
  line-height: 1.35;
}

.interview-execution-status,
.interview-progress-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid;
  border-radius: 11px;
  font-size: 10.5px;
  font-weight: 650;
  line-height: 1.45;
}

.interview-execution-status {
  grid-column: 1 / -1;
}

.interview-execution-status.is-complete,
.interview-progress-banner.is-complete {
  border-color: color-mix(in srgb, #10b981 32%, var(--ui-border));
  background: color-mix(in srgb, #10b981 9%, var(--ui-bg));
  color: color-mix(in srgb, #10b981 82%, var(--ui-text-highlighted));
}

.interview-execution-status.is-pending,
.interview-progress-banner.is-pending {
  border-color: color-mix(in srgb, #f59e0b 34%, var(--ui-border));
  background: color-mix(in srgb, #f59e0b 9%, var(--ui-bg));
  color: color-mix(in srgb, #d97706 82%, var(--ui-text-highlighted));
}

.interview-summary-panel {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid var(--ui-border);
  border-radius: 14px;
  background: var(--ui-bg);
}

.interview-subsection-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}

.interview-subsection-heading > span {
  width: 32px;
  height: 32px;
  flex-basis: 32px;
  border-radius: 8px;
  font-size: 16px;
}

.interview-subsection-heading > div {
  min-width: 0;
  flex: 1;
}

.interview-subsection-heading h5 {
  color: var(--ui-text-highlighted);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.25;
}

.interview-round-list {
  display: grid;
  gap: 14px;
}

.interview-round-card {
  overflow: hidden;
  border: 1px solid var(--interview-border);
  border-radius: 14px;
  background: var(--ui-bg);
}

.interview-round-header {
  padding: 11px 13px;
  border-bottom: 1px solid var(--ui-border);
  background: color-mix(in srgb, var(--ui-bg-muted) 42%, var(--ui-bg));
}

.interview-round-identity > span {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--ui-primary) 14%, var(--ui-bg));
  color: var(--ui-primary);
  font-size: 13px;
  font-weight: 850;
}

.interview-round-identity h5 {
  color: var(--ui-text-highlighted);
  font-size: 13px;
  font-weight: 800;
  line-height: 1.25;
}

.interview-round-body {
  padding: 13px;
}

.interview-evaluation-panel {
  overflow: hidden;
  border: 1px solid var(--ui-border);
  border-radius: 12px;
  background: var(--ui-bg);
}

.interview-evaluation-panel > .interview-subsection-heading {
  padding: 10px 11px;
  border-bottom: 1px solid var(--ui-border);
  background: color-mix(in srgb, var(--ui-bg-muted) 46%, var(--ui-bg));
}

.interview-evaluator-list {
  display: grid;
}

.interview-evaluator-row {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px 11px;
  border-bottom: 1px solid var(--ui-border);
}

.interview-evaluator-row:last-child {
  border-bottom: 0;
}

.interview-evaluator-avatar {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 9px;
  background: color-mix(in srgb, var(--ui-primary) 10%, var(--ui-bg));
  color: var(--ui-primary);
  font-size: 16px;
}

.interview-evaluator-identity {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.interview-evaluator-identity strong {
  color: var(--ui-text-highlighted);
  font-size: 11.5px;
  font-weight: 750;
  line-height: 1.3;
}

.interview-evaluator-identity span {
  margin-top: 2px;
  color: var(--ui-text-muted);
  font-size: 9.5px;
}

.interview-score-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border: 1px solid color-mix(in srgb, var(--ui-primary) 24%, var(--ui-border));
  border-radius: 11px;
  background: var(--interview-soft);
}

.interview-score-summary > div:last-child {
  text-align: right;
}

.interview-empty-state {
  display: grid;
  min-height: 130px;
  place-items: center;
  align-content: center;
  gap: 5px;
  padding: 24px;
  color: var(--ui-text-muted);
  text-align: center;
}

.interview-empty-state > span {
  margin-bottom: 3px;
  color: var(--ui-primary);
  font-size: 25px;
}

.interview-empty-state strong {
  color: var(--ui-text-highlighted);
  font-size: 12px;
}

@media (max-width: 780px) {
  .interview-section-heading,
  .interview-round-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .interview-heading-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .interview-detail-card,
  .interview-schedule-grid,
  .interview-communication-panel,
  .interview-score-summary {
    grid-template-columns: 1fr;
  }

  .interview-evaluator-row {
    grid-template-columns: 32px minmax(0, 1fr);
  }

  .interview-evaluator-actions {
    grid-column: 2;
    justify-content: flex-start;
  }

  .interview-score-summary > div:last-child {
    text-align: left;
  }
}
</style>
