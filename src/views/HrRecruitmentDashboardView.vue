<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getHrRecruitmentDashboard } from '../services/hrService'
import { apiError } from '../utils/formatters'

const router = useRouter()
const dashboard = ref(null)
const loading = ref(false)
const errorMessage = ref('')

const currentMonthValue = (() => {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 7)
})()

const filters = reactive({
  month: currentMonthValue,
  vacancy_id: '',
  department: '',
  unit: '',
  pic_nik: '',
  source: '',
  status: '',
})

const stageVisuals = {
  applied: { icon: 'i-lucide-file-user', color: '#64748b', soft: '#f1f5f9' },
  screening: { icon: 'i-lucide-search-check', color: '#0284c7', soft: '#e0f2fe' },
  interview_hr: { icon: 'i-lucide-messages-square', color: '#9333ea', soft: '#f3e8ff' },
  case_study: { icon: 'i-lucide-clipboard-list', color: '#ea580c', soft: '#ffedd5' },
  interview_user: { icon: 'i-lucide-users-round', color: '#4f46e5', soft: '#e0e7ff' },
  reference_check: { icon: 'i-lucide-phone-call', color: '#0d9488', soft: '#ccfbf1' },
  offering: { icon: 'i-lucide-mail', color: '#db2777', soft: '#fce7f3' },
  pkb: { icon: 'i-lucide-file-signature', color: '#d97706', soft: '#fef3c7' },
  hired: { icon: 'i-lucide-badge-check', color: '#059669', soft: '#d1fae5' },
}

const actionColors = {
  purple: '#9333ea',
  orange: '#ea580c',
  indigo: '#4f46e5',
  teal: '#0d9488',
  pink: '#db2777',
  amber: '#d97706',
  emerald: '#059669',
  red: '#dc2626',
}

const selectedPeriodLabel = computed(() => {
  const month = dashboard.value?.period?.month || filters.month
  if (!month) return 'Bulan berjalan'
  const date = new Date(`${month}-01T00:00:00`)
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(date)
})

const kpis = computed(() => {
  const summary = dashboard.value?.summary
  if (!summary) return []

  return [
    { label: 'Kandidat Aktif', value: summary.active_candidates, note: `${summary.active_candidates} dari ${summary.total_candidates} masih dalam proses`, icon: 'i-lucide-users-round', tone: 'blue', action: () => openPipeline() },
    { label: 'Kandidat Baru', value: summary.new_candidates, note: `Applied di ${selectedPeriodLabel.value}`, icon: 'i-lucide-user-plus', tone: 'sky', action: () => openPipeline({ month: filters.month }) },
    { label: 'Lowongan Aktif', value: summary.open_vacancies, note: `${summary.approved_headcount} kebutuhan disetujui`, icon: 'i-lucide-briefcase-business', tone: 'violet', action: () => router.push({ name: 'hr-recruitment-vacancies' }) },
    { label: 'Berhasil Hired', value: summary.hired_candidates, note: `Hire rate ${summary.hire_rate}%`, icon: 'i-lucide-badge-check', tone: 'emerald', action: () => openPipeline({ status: 'hired' }) },
    { label: 'Menunggu Tindakan', value: summary.pending_actions, note: 'Perlu ditindaklanjuti HR', icon: 'i-lucide-list-todo', tone: summary.pending_actions ? 'amber' : 'emerald', action: () => openAllFollowUps() },
    { label: 'Join Bulan Terpilih', value: summary.joining_in_period ?? summary.joining_soon, note: `Tanggal mulai kerja di ${selectedPeriodLabel.value}`, icon: 'i-lucide-calendar-check-2', tone: 'pink', action: () => openPipeline({ status: 'hired' }) },
  ]
})

const maxPipelineReached = computed(() => Math.max(1, ...(dashboard.value?.pipeline || []).map((item) => item.reached)))

// Funnel konversi antar tahap — fokus ke DROP-OFF count, bukan bar reached (itu sudah ada di Pipeline kiri)
const funnelSteps = computed(() => {
  const pipeline = dashboard.value?.pipeline || []
  return pipeline.map((stage, index) => {
    const prev = pipeline[index - 1]
    const stepConversion = prev && prev.reached > 0
      ? Math.round((stage.reached / prev.reached) * 100)
      : null
    const dropOff = stepConversion !== null ? 100 - stepConversion : null
    const dropOffCount = prev ? (prev.reached - stage.reached) : 0
    return {
      ...stage,
      stepConversion,
      dropOff,
      dropOffCount,
      isBottleneck: false,
    }
  }).map((step, index, arr) => {
    const maxDrop = Math.max(...arr.filter((s) => s.dropOff !== null).map((s) => s.dropOff))
    return { ...step, isBottleneck: step.dropOff !== null && step.dropOff === maxDrop && maxDrop > 0 }
  })
})

const funnelBottleneck = computed(() => funnelSteps.value.find((s) => s.isBottleneck) || null)
const funnelOverallConversion = computed(() => {
  const pipeline = dashboard.value?.pipeline || []
  const first = pipeline[0]
  const last = pipeline[pipeline.length - 1]
  if (!first || !last || first.reached === 0) return 0
  return Math.round((last.reached / first.reached) * 100)
})

// Action Center — dikelompokkan per kandidat, diurutkan dari yang paling lama menunggu (updated_at paling lama)
const candidateActionGroups = computed(() => {
  const actions = (dashboard.value?.action_center || []).filter((item) => item.count > 0)
  const grouped = new Map()

  for (const action of actions) {
    for (const candidate of action.candidates) {
      const existing = grouped.get(candidate.id)
      if (existing) {
        existing.tasks.push({ key: action.key, label: action.label, icon: action.icon, color: action.color })
      } else {
        grouped.set(candidate.id, {
          ...candidate,
          tasks: [{ key: action.key, label: action.label, icon: action.icon, color: action.color }],
        })
      }
    }
  }

  return [...grouped.values()]
    .sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at))
    .slice(0, 8)
})

const interviewAspects = computed(() => dashboard.value?.interview_quality?.aspects || [])
// Kandidat evaluasi diurutkan berdasarkan skor tertinggi (bukan urutan acak)
const sortedEvaluationCandidates = computed(() =>
  [...(dashboard.value?.interview_quality?.candidates || [])].sort((a, b) => b.average_score - a.average_score),
)
const topSources = computed(() => (dashboard.value?.sources || []).slice(0, 6))
const maxSourceCount = computed(() => Math.max(1, ...topSources.value.map((item) => item.count)))

// Performa Lowongan — sembunyikan kolom pemenuhan jika semua data null
const hasFulfillmentData = computed(() =>
  (dashboard.value?.vacancy_performance || []).some((item) => item.fulfillment !== null),
)

// Progress Kelengkapan — dikelompokkan per fase besar
const documentPhases = computed(() => {
  const docs = dashboard.value?.document_progress || []
  const phaseMap = {
    resume: 'pre', hr_summary: 'pre', case_submission: 'pre',
    user_summary: 'post', user_evaluation: 'post', reference_summary: 'post',
    offering_letter: 'closing', pkb: 'closing', onboarding: 'closing',
  }
  const phases = {
    pre: { key: 'pre', label: 'Pra-Interview', icon: 'i-lucide-clipboard-list', items: [] },
    post: { key: 'post', label: 'Pasca-Interview', icon: 'i-lucide-clipboard-check', items: [] },
    closing: { key: 'closing', label: 'Closing', icon: 'i-lucide-handshake', items: [] },
  }
  for (const doc of docs) {
    const phaseKey = phaseMap[doc.key] || 'pre'
    phases[phaseKey].items.push(doc)
  }
  return Object.values(phases).filter((p) => p.items.length > 0)
})

// Aktivitas — filter hanya perubahan status/tahap bermakna, exclude log teknis sistem
const meaningfulActivities = computed(() => {
  const noisePatterns = ['autosave', 'import', 'draft', 'token', 'saved onboarding', 'imported to employee', 'generate']
  return (dashboard.value?.recent_activities || []).filter((item) => {
    const text = `${item.action || ''} ${item.subject || ''}`.toLowerCase()
    return !noisePatterns.some((kw) => text.includes(kw))
  })
})

async function loadDashboard() {
  loading.value = true
  errorMessage.value = ''
  try {
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '' && value !== null))
    const response = await getHrRecruitmentDashboard(params)
    dashboard.value = response.data
  } catch (error) {
    errorMessage.value = apiError(error, 'Dashboard recruitment gagal dimuat.')
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  Object.assign(filters, {
    month: currentMonthValue,
    vacancy_id: '',
    department: '',
    unit: '',
    pic_nik: '',
    source: '',
    status: '',
  })
  loadDashboard()
}

function openPipeline(query = {}) {
  router.push({ name: 'hr-recruitment-candidates', query })
}

function openAllFollowUps() {
  const query = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '' && value !== null))
  router.push({ name: 'hr-recruitment-follow-ups', query })
}

function openInterviewAgenda() {
  router.push({ name: 'hr-recruitment-interview-agenda', query: { month: filters.month } })
}

function formatPeriod(value) {
  if (!value) return '-'
  const date = new Date(value.length === 7 ? `${value}-01T00:00:00` : `${value}T00:00:00`)
  return new Intl.DateTimeFormat('id-ID', value.length === 7
    ? { month: 'short', year: 'numeric' }
    : { day: 'numeric', month: 'short' }).format(date)
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value)).replace(/,| pukul /g, ' • ') + ' WIB'
}

function formatHours(value) {
  const hours = Number(value || 0)
  if (hours >= 24) return `${(hours / 24).toFixed(1)} hari`
  return `${hours.toFixed(1)} jam`
}

function daysSince(dateStr) {
  if (!dateStr) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)))
}

onMounted(loadDashboard)
</script>

<template>
  <section class="recruitment-dashboard space-y-5">
    <header class="dashboard-hero">
      <div>
        <div class="dashboard-eyebrow">
          <UIcon name="i-lucide-chart-no-axes-combined" class="size-4" />
          Recruitment Intelligence
        </div>
        <h1>Dashboard Recruitment</h1>
        <p>Pantau funnel kandidat, pekerjaan tertunda, kelengkapan dokumen, dan kualitas proses rekrutmen.</p>
      </div>
      <div class="hero-actions">
        <UButton icon="i-lucide-kanban" label="Buka Pipeline" variant="soft" @click="openPipeline()" />
        <UButton icon="i-lucide-refresh-cw" label="Perbarui" :loading="loading" @click="loadDashboard" />
      </div>
    </header>

    <form class="dashboard-filter" @submit.prevent="loadDashboard">
      <label>
        <span class="filter-label-with-tooltip">
          Periode Bulan
          <span class="filter-tooltip-icon" title="Data berdasarkan tanggal kandidat melamar (cohort Applied)">
            <UIcon name="i-lucide-info" class="size-3" />
          </span>
        </span>
        <input v-model="filters.month" type="month" :max="currentMonthValue" required />
      </label>
      <label>
        <span>Lowongan</span>
        <select v-model="filters.vacancy_id">
          <option value="">Semua lowongan</option>
          <option v-for="item in dashboard?.filter_options?.vacancies || []" :key="item.id" :value="item.id">{{ item.title }}</option>
        </select>
      </label>
      <label>
        <span>Departemen</span>
        <select v-model="filters.department">
          <option value="">Semua departemen</option>
          <option v-for="item in dashboard?.filter_options?.departments || []" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>
      <label>
        <span>Unit</span>
        <select v-model="filters.unit">
          <option value="">Semua unit</option>
          <option v-for="item in dashboard?.filter_options?.units || []" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>
      <label>
        <span>PIC</span>
        <select v-model="filters.pic_nik">
          <option value="">Semua PIC</option>
          <option v-for="item in dashboard?.filter_options?.pics || []" :key="item.nik" :value="item.nik">{{ item.name }}</option>
        </select>
      </label>
      <label>
        <span>Sumber Kandidat</span>
        <select v-model="filters.source">
          <option value="">Semua sumber</option>
          <option v-for="item in dashboard?.filter_options?.sources || []" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>
      <label>
        <span>Status</span>
        <select v-model="filters.status">
          <option value="">Semua tahap</option>
          <option value="applied">Applied</option>
          <option value="screening">Screening</option>
          <option value="interview_hr">Wawancara HR</option>
          <option value="case_study">Case Study</option>
          <option value="interview_user">Wawancara User</option>
          <option value="reference_check">Reference Check</option>
          <option value="offering">Offering</option>
          <option value="pkb">PKB</option>
          <option value="hired">Hired & Onboarding</option>
          <option value="rejected">Rejected</option>
        </select>
      </label>
      <div class="filter-actions">
        <UButton type="button" icon="i-lucide-rotate-ccw" variant="ghost" color="neutral" label="Reset" @click="resetFilters" />
        <UButton type="submit" icon="i-lucide-filter" label="Terapkan" :loading="loading" />
      </div>
    </form>

    <div v-if="errorMessage" class="dashboard-alert">
      <UIcon name="i-lucide-circle-alert" class="size-5" />
      <span>{{ errorMessage }}</span>
      <UButton size="xs" variant="ghost" label="Coba Lagi" @click="loadDashboard" />
    </div>

    <template v-if="loading && !dashboard">
      <div class="kpi-grid">
        <div v-for="item in 6" :key="item" class="dashboard-card skeleton-card"></div>
      </div>
      <div class="dashboard-card skeleton-panel"></div>
    </template>

    <template v-else-if="dashboard">
      <div class="kpi-grid">
        <button v-for="item in kpis" :key="item.label" type="button" class="kpi-card" :class="`kpi-card--${item.tone}`" @click="item.action()">
          <span class="kpi-icon"><UIcon :name="item.icon" class="size-5" /></span>
          <span class="kpi-copy">
            <span class="kpi-label">{{ item.label }}</span>
            <strong>{{ item.value.toLocaleString('id-ID') }}</strong>
            <small>{{ item.note }}</small>
          </span>
          <UIcon name="i-lucide-arrow-up-right" class="kpi-arrow" />
        </button>
      </div>

      <!-- A1: Action Center dipindah ke posisi ke-2 (tepat setelah KPI), sesuai rekomendasi review -->
      <div class="dashboard-two-column dashboard-two-column--actions">
        <article class="dashboard-card">
          <div class="card-heading">
            <div>
              <span class="section-kicker section-kicker--warning">Action Center</span>
              <h2>Pekerjaan yang Perlu Ditindaklanjuti</h2>
              <p>Dikelompokkan per kandidat, diurutkan dari yang paling lama menunggu tindakan.</p>
            </div>
            <div class="action-heading-controls">
              <span class="heading-badge heading-badge--warning">{{ dashboard.summary.pending_actions }} tindakan</span>
              <UButton size="xs" variant="soft" icon="i-lucide-list-filter" label="Lihat Semua" @click="openAllFollowUps" />
            </div>
          </div>
          <div v-if="candidateActionGroups.length" class="action-candidate-list">
            <button
              v-for="group in candidateActionGroups"
              :key="group.id"
              type="button"
              class="action-candidate-row"
              @click="openPipeline({ candidate: group.id, status: group.stage })"
            >
              <span class="action-candidate-info">
                <strong>{{ group.name }}</strong>
                <small>{{ group.vacancy }}</small>
              </span>
              <span class="action-candidate-tasks">
                <span
                  v-for="task in group.tasks"
                  :key="task.key"
                  class="action-task-chip"
                  :style="{ '--action-color': actionColors[task.color] }"
                >
                  <UIcon :name="task.icon" class="size-2.5" />
                  {{ task.label }}
                </span>
              </span>
              <span
                class="action-waiting"
                :class="daysSince(group.updated_at) >= 7 ? 'action-waiting--danger' : daysSince(group.updated_at) >= 3 ? 'action-waiting--warn' : ''"
              >
                <UIcon name="i-lucide-clock" class="size-3" />
                {{ daysSince(group.updated_at) }} hari
              </span>
              <UIcon name="i-lucide-chevron-right" class="size-4 action-nav-icon" />
            </button>
          </div>
          <div v-else class="empty-state"><UIcon name="i-lucide-circle-check-big" class="size-8" /><strong>Semua proses terkendali</strong><p>Tidak ada tindakan recruitment yang tertunda.</p></div>
        </article>

        <article class="dashboard-card">
          <div class="card-heading">
            <div><span class="section-kicker">Agenda</span><h2>7 Hari ke Depan</h2><p>Jadwal wawancara HR dan user.</p></div>
            <UButton size="xs" variant="soft" icon="i-lucide-calendar-range" label="Lihat Semua" @click="openInterviewAgenda" />
          </div>
          <div v-if="dashboard.upcoming_schedules.length" class="schedule-list">
            <button v-for="item in dashboard.upcoming_schedules" :key="`${item.id}-${item.scheduled_at}-${item.type}`" type="button" @click="openPipeline({ candidate: item.id, status: item.stage })">
              <span class="schedule-date"><strong>{{ new Date(item.scheduled_at).getDate() }}</strong><small>{{ new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(item.scheduled_at)) }}</small></span>
              <span><strong>{{ item.name }}</strong><small>{{ item.type }} • {{ item.vacancy }}</small><em>{{ formatDateTime(item.scheduled_at) }}</em></span>
              <UIcon name="i-lucide-arrow-up-right" class="size-4" />
            </button>
          </div>
          <div v-else class="empty-state empty-state--small"><UIcon name="i-lucide-calendar-x-2" class="size-7" /><strong>Belum ada agenda</strong><p>Tidak ada wawancara dalam tujuh hari ke depan.</p></div>
        </article>
      </div>

      <div class="dashboard-two-column dashboard-two-column--wide">
        <article class="dashboard-card">
          <div class="card-heading">
            <div>
              <span class="section-kicker">Pipeline</span>
              <h2>Perjalanan Kandidat per Tahap</h2>
              <p>Menunjukkan jumlah kandidat yang sudah mencapai setiap tahap dan kandidat yang masih diproses di tahap tersebut.</p>
            </div>
            <span class="heading-badge">{{ dashboard.summary.total_candidates }} kandidat</span>
          </div>
          <div v-if="dashboard.pipeline[1]" class="pipeline-reading-guide">
            <UIcon name="i-lucide-info" class="size-4" />
            <p>
              <strong>Contoh membaca:</strong>
              {{ dashboard.pipeline[1].reached }} dari {{ dashboard.summary.total_candidates }} kandidat sudah mencapai tahap
              {{ dashboard.pipeline[1].label }}; {{ dashboard.pipeline[1].current }} kandidat masih diproses di tahap tersebut.
            </p>
          </div>
          <div class="pipeline-legend-row" aria-hidden="true">
            <span>Tahap</span>
            <span>Sudah mencapai tahap</span>
            <span>Masih di tahap</span>
            <span>% dari total</span>
          </div>
          <div class="pipeline-list">
            <button
              v-for="stage in dashboard.pipeline"
              :key="stage.key"
              type="button"
              class="pipeline-row"
              :aria-label="`${stage.label}: ${stage.reached} dari ${dashboard.summary.total_candidates} kandidat sudah mencapai tahap ini dan ${stage.current} kandidat masih diproses`"
              @click="openPipeline({ status: stage.key })"
            >
              <span
                class="pipeline-icon"
                :style="{
                  '--stage-color': stageVisuals[stage.key]?.color,
                  '--stage-soft': stageVisuals[stage.key]?.soft
                }"
              >
                <UIcon :name="stageVisuals[stage.key]?.icon" class="size-4" />
              </span>
              <span class="pipeline-name">{{ stage.label }}</span>
              <span class="pipeline-progress">
                <span class="pipeline-bar"><span :style="{ width: `${(stage.reached / maxPipelineReached) * 100}%`, background: stageVisuals[stage.key]?.color }"></span></span>
                <small>{{ stage.reached }} dari {{ dashboard.summary.total_candidates }} kandidat</small>
              </span>
              <span class="pipeline-count">
                <span><strong>{{ stage.current }}</strong><small> kandidat</small></span>
                <small>masih diproses</small>
              </span>
              <span class="pipeline-conversion" :title="`${stage.reached} dari ${dashboard.summary.total_candidates} kandidat sudah mencapai tahap ${stage.label}`">{{ stage.conversion.toLocaleString('id-ID') }}%</span>
            </button>
          </div>
        </article>

        <article class="dashboard-card funnel-card">
          <div class="card-heading">
            <div>
              <span class="section-kicker">Konversi Funnel</span>
              <h2>Drop-off Antar Tahap</h2>
              <p>Berapa kandidat yang gugur di setiap transisi tahap. Tahap dengan kehilangan terbesar adalah bottleneck rekrutmen.</p>
            </div>
            <div class="funnel-headline">
              <span class="funnel-overall">
                <UIcon name="i-lucide-trending-up" class="size-4" />
                <span>
                  <strong>{{ funnelOverallConversion }}%</strong>
                  <small>Applied → Hired</small>
                </span>
              </span>
              <span v-if="funnelBottleneck" class="funnel-bottleneck-badge">
                <UIcon name="i-lucide-alert-triangle" class="size-3" />
                Bottleneck: {{ funnelBottleneck.label }}
              </span>
            </div>
          </div>

          <div class="funnel-list">
            <div
              v-for="(step, index) in funnelSteps"
              :key="step.key"
              class="funnel-step"
              :class="{ 'funnel-step--bottleneck': step.isBottleneck }"
            >
              <!-- Baris tahap -->
              <button
                type="button"
                class="funnel-row"
                :style="{ '--stage-color': stageVisuals[step.key]?.color, '--stage-soft': stageVisuals[step.key]?.soft }"
                :aria-label="`${step.label}: konversi dari tahap sebelumnya ${step.stepConversion ?? 100}%`"
                @click="openPipeline({ status: step.key })"
              >
                <span class="funnel-icon">
                  <UIcon :name="stageVisuals[step.key]?.icon" class="size-3.5" />
                </span>
                <span class="funnel-name">{{ step.label }}</span>
                <span class="funnel-reached-count">{{ step.reached }} <small>kandidat</small></span>
                <span class="funnel-pct-col">
                  <template v-if="index === 0">
                    <span class="funnel-entry-chip">Titik masuk</span>
                  </template>
                  <template v-else-if="step.stepConversion !== null">
                    <span
                      class="funnel-pct-big"
                      :class="step.isBottleneck ? 'funnel-pct-big--danger' : step.stepConversion >= 70 ? 'funnel-pct-big--good' : 'funnel-pct-big--warn'"
                    >{{ step.stepConversion }}%</span>
                    <small class="funnel-pct-sub">lolos</small>
                  </template>
                </span>
                <UIcon name="i-lucide-arrow-up-right" class="funnel-nav-icon size-3" />
              </button>

              <!-- Konektor drop-off — hanya tampil jika ada kandidat yang gugur -->
              <div v-if="index < funnelSteps.length - 1 && step.dropOffCount > 0" class="funnel-connector">
                <span class="funnel-connector-line"></span>
                <span
                  class="funnel-dropout-chip"
                  :class="step.isBottleneck ? 'funnel-dropout-chip--danger' : step.dropOffCount >= 5 ? 'funnel-dropout-chip--warn' : 'funnel-dropout-chip--mild'"
                >
                  <UIcon name="i-lucide-user-minus" class="size-3" />
                  {{ step.dropOffCount }} gugur
                </span>
                <span class="funnel-connector-line"></span>
              </div>
              <div v-else-if="index < funnelSteps.length - 1" class="funnel-connector funnel-connector--clean">
                <span class="funnel-connector-line"></span>
              </div>
            </div>
          </div>

          <section class="duration-section">
            <div class="duration-heading">
              <strong>Rata-rata waktu di setiap tahap</strong>
              <small>Dihitung dari kandidat yang sudah selesai diproses pada tahap tersebut.</small>
            </div>
            <div class="duration-list">
              <div v-for="stage in dashboard.stage_durations.slice(0, 6)" :key="stage.key">
                <span>{{ stage.label }}</span><strong>{{ formatHours(stage.average_hours) }}</strong>
              </div>
              <p v-if="!dashboard.stage_durations.length" class="empty-copy">Durasi tahap akan tampil setelah perpindahan tahap baru tercatat.</p>
            </div>
          </section>
        </article>
      </div>


      <div class="dashboard-two-column">
        <article class="dashboard-card">
          <div class="card-heading"><div><span class="section-kicker">Dokumen</span><h2>Progress Kelengkapan</h2><p>Dikelompokkan per fase. Completion dihitung dari kandidat yang sudah mencapai tahap terkait.</p></div></div>
          <div class="document-phases">
            <div v-for="phase in documentPhases" :key="phase.key" class="doc-phase">
              <div class="doc-phase-header">
                <UIcon :name="phase.icon" class="size-3.5" />
                {{ phase.label }}
              </div>
              <button v-for="item in phase.items" :key="item.key" type="button" class="doc-row" @click="openPipeline()">
                <span class="document-copy"><strong>{{ item.label }}</strong><small>{{ item.complete }}/{{ item.eligible }} lengkap<span v-if="item.missing"> • {{ item.missing }} kurang</span></small></span>
                <span class="document-progress"><span :style="{ width: `${item.percentage}%` }"></span></span>
                <strong class="document-percent">{{ item.percentage }}%</strong>
              </button>
            </div>
          </div>
        </article>

        <article class="dashboard-card">
          <div class="card-heading"><div><span class="section-kicker">Lowongan</span><h2>Performa Lowongan</h2><p>Volume kandidat dan pemenuhan kebutuhan per posisi.</p></div><UButton size="xs" variant="ghost" icon="i-lucide-arrow-up-right" label="Semua Lowongan" :to="{ name: 'hr-recruitment-vacancies' }" /></div>
          <div class="vacancy-table-wrap">
            <table class="vacancy-table">
              <thead><tr><th>Lowongan</th><th>Kandidat</th><th>Aktif</th><th>Hired</th><th v-if="hasFulfillmentData">Pemenuhan</th></tr></thead>
              <tbody>
                <tr v-for="item in dashboard.vacancy_performance.slice(0, 7)" :key="item.id" @click="openPipeline({ vacancy_id: item.id })">
                  <td><strong>{{ item.title }}</strong><small>{{ [item.department, item.unit].filter(Boolean).join(' • ') || 'Umum' }}</small></td>
                  <td>{{ item.candidates }}</td><td>{{ item.active }}</td><td>{{ item.hired }}</td>
                  <td v-if="hasFulfillmentData"><span v-if="item.fulfillment !== null" class="fulfillment"><i :style="{ width: `${Math.min(100, item.fulfillment)}%` }"></i><small>{{ item.fulfillment }}%</small></span><span v-else class="no-target">—</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <!-- A4: Evaluasi dipisah jadi 2 card — Skor Individual + Aspek Kompetensi -->
      <div class="dashboard-two-column">
        <article class="dashboard-card">
          <div class="card-heading">
            <div>
              <span class="section-kicker">Kualitas</span>
              <h2>Skor Individual Kandidat</h2>
              <p>Rata-rata skor evaluasi wawancara user per kandidat, diurutkan dari tertinggi.</p>
            </div>
            <span class="score-pill" title="Skor akumulatif dari 9 aspek, maks. 4 poin per aspek"><small>Rata-rata</small>{{ dashboard.interview_quality.average_total_score }}<small>/36 poin</small></span>
          </div>
          <div class="evaluation-scope-summary">
            <span><UIcon name="i-lucide-user-round-check" class="size-4" /><strong>{{ dashboard.interview_quality.candidate_count }}</strong> kandidat</span>
            <span><UIcon name="i-lucide-users-round" class="size-4" /><strong>{{ dashboard.interview_quality.interviewer_count }}</strong> pewawancara</span>
            <span><UIcon name="i-lucide-clipboard-check" class="size-4" /><strong>{{ dashboard.interview_quality.submitted }}/{{ dashboard.interview_quality.total }}</strong> evaluasi diisi</span>
          </div>
          <div v-if="sortedEvaluationCandidates.length" class="evaluation-candidates">
            <button
              v-for="candidate in sortedEvaluationCandidates"
              :key="candidate.id"
              type="button"
              @click="openPipeline({ candidate: candidate.id, status: 'interview_user' })"
            >
              <span><strong>{{ candidate.name }}</strong><small>{{ candidate.vacancy }} • {{ candidate.evaluation_count }} evaluasi</small></span>
              <span class="evaluation-candidate-score" :title="`${candidate.average_score} poin dari maks. 36 (9 aspek × 4)`">
                {{ candidate.average_score }}<small>/36</small>
              </span>
              <UIcon name="i-lucide-arrow-up-right" class="size-3.5" />
            </button>
          </div>
          <p v-else class="empty-copy">Belum ada evaluasi wawancara user yang diselesaikan pada filter ini.</p>
        </article>

        <article class="dashboard-card">
          <div class="card-heading"><div><span class="section-kicker">Kompetensi</span><h2>Rata-rata Aspek Kompetensi</h2><p>Agregat nilai per aspek (maks. 4 poin) dari seluruh evaluasi yang diselesaikan.</p></div></div>
          <div class="aspect-list">
            <div v-for="aspect in interviewAspects" :key="aspect.key"><span>{{ aspect.label }}</span><span class="aspect-bar"><i :style="{ width: `${(aspect.average / 4) * 100}%` }"></i></span><strong>{{ aspect.average }}<small style="font-weight:400;font-size:8px">/4</small></strong></div>
          </div>
          <p v-if="!interviewAspects.length" class="empty-copy">Belum ada evaluasi yang diselesaikan pada filter ini.</p>
        </article>
      </div>

      <div class="dashboard-two-column">
        <article class="dashboard-card">
          <div class="card-heading"><div><span class="section-kicker">Closing</span><h2>Offering, PKB &amp; Onboarding</h2><p>Progress kandidat setelah proses seleksi.</p></div></div>
          <div class="closing-stats">
            <div><span class="closing-icon closing-icon--pink"><UIcon name="i-lucide-file-signature" /></span><p>Offering Ditandatangani<small>{{ dashboard.offering_onboarding.offering.signed }} dari {{ dashboard.offering_onboarding.offering.eligible }}</small></p><strong>{{ dashboard.offering_onboarding.offering.acceptance_rate }}%</strong></div>
            <div><span class="closing-icon closing-icon--amber"><UIcon name="i-lucide-stamp" /></span><p>Persetujuan PKB<small>{{ dashboard.offering_onboarding.pkb.signed }} signer selesai</small></p><strong>{{ dashboard.offering_onboarding.pkb.pending }} pending</strong></div>
            <div><span class="closing-icon closing-icon--green"><UIcon name="i-lucide-user-round-check" /></span><p>Onboarding Selesai<small :title="'Proses administrasi onboarding dituntaskan — berbeda dengan join date resmi'">{{ dashboard.offering_onboarding.onboarding.imported }} sudah diimpor ke data karyawan</small></p><strong>{{ dashboard.offering_onboarding.onboarding.completed }}</strong></div>
          </div>
        </article>

        <article class="dashboard-card">
          <div class="card-heading"><div><span class="section-kicker">Akuisisi</span><h2>Sumber Kandidat</h2><p>Distribusi sumber pelamar pada periode terpilih.</p></div></div>
          <div class="source-list">
            <div v-for="item in topSources" :key="item.source"><span><strong>{{ item.source }}</strong><small>{{ item.hired }} hired</small></span><span class="source-bar"><i :style="{ width: `${(item.count / maxSourceCount) * 100}%` }"></i></span><strong>{{ item.count }}</strong></div>
          </div>
          <p v-if="!topSources.length" class="empty-copy">Sumber kandidat belum tercatat.</p>
        </article>
      </div>

      <article class="dashboard-card activity-section">
        <div class="card-heading"><div><span class="section-kicker">Aktivitas</span><h2>Aktivitas Recruitment Terbaru</h2><p>Perubahan status dan tahap kandidat dalam periode filter. Log teknis sistem tidak ditampilkan di sini.</p></div></div>
        <div class="activity-list">
          <button v-for="item in meaningfulActivities" :key="item.id" type="button" @click="openPipeline({ candidate: item.candidate_id })">
            <span class="activity-dot"></span><span><strong>{{ item.actor }}</strong><p>{{ item.subject }}</p></span><time>{{ formatDateTime(item.occurred_at) }}</time><UIcon name="i-lucide-chevron-right" class="size-4" />
          </button>
          <p v-if="!meaningfulActivities.length" class="empty-copy">Belum ada perubahan status kandidat yang tercatat pada periode ini.</p>
        </div>
      </article>
    </template>
  </section>
</template>

<style scoped>
.recruitment-dashboard { --dash-border: var(--ui-border); --dash-bg: var(--ui-bg); --dash-muted: var(--ui-bg-muted); color: var(--ui-text-highlighted); }
.dashboard-hero { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; padding:26px 28px; border:1px solid #bfdbfe; border-radius:22px; background:radial-gradient(circle at 90% 0%,rgba(59,130,246,.16),transparent 36%),linear-gradient(135deg,#eff6ff,#fff 58%,#f8fafc); box-shadow:0 12px 32px rgba(15,23,42,.06); }
.dashboard-hero h1 { margin:7px 0 5px; font-size:26px; line-height:1.1; font-weight:800; letter-spacing:-.035em; }
.dashboard-hero p { max-width:720px; color:var(--ui-text-muted); font-size:13px; }
.dashboard-eyebrow { display:inline-flex; align-items:center; gap:7px; color:#2563eb; font-size:10px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; }
.hero-actions { display:flex; gap:8px; flex-shrink:0; }
.dashboard-filter { display:grid; grid-template-columns:repeat(8,minmax(100px,1fr)) auto; align-items:end; gap:10px; padding:15px; border:1px solid var(--dash-border); border-radius:16px; background:var(--dash-bg); }
.dashboard-filter label { display:grid; gap:5px; }
.dashboard-filter label>span { color:var(--ui-text-muted); font-size:10px; font-weight:700; }
.dashboard-filter input,.dashboard-filter select { width:100%; height:36px; padding:0 10px; border:1px solid var(--dash-border); border-radius:9px; background:var(--dash-bg); color:var(--ui-text-highlighted); font-size:12px; outline:none; }
.dashboard-filter input:focus,.dashboard-filter select:focus { border-color:#60a5fa; box-shadow:0 0 0 3px rgba(59,130,246,.12); }
.filter-actions { display:flex; gap:3px; }
.filter-label-with-tooltip{display:flex;align-items:center;gap:4px}
.filter-tooltip-icon{display:inline-flex;align-items:center;color:#60a5fa;cursor:help;transition:color .15s}.filter-tooltip-icon:hover{color:#2563eb}
.dashboard-alert { display:flex; align-items:center; gap:10px; padding:12px 14px; border:1px solid #fecaca; border-radius:12px; background:#fef2f2; color:#b91c1c; font-size:12px; }
.dashboard-alert span { flex:1; }
.dashboard-card,.kpi-card { border:1px solid var(--dash-border); background:var(--dash-bg); box-shadow:0 8px 24px rgba(15,23,42,.045); }
.dashboard-card { padding:20px; border-radius:18px; }
.kpi-grid { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:12px; }
.kpi-card { position:relative; display:flex; min-height:116px; align-items:flex-start; gap:11px; padding:16px; border-radius:15px; text-align:left; transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease; }
.kpi-card:hover { transform:translateY(-2px); border-color:#93c5fd; box-shadow:0 12px 25px rgba(37,99,235,.09); }
.kpi-icon { display:grid; width:34px; height:34px; flex:0 0 34px; place-items:center; border-radius:10px; }
.kpi-copy { display:flex; min-width:0; flex-direction:column; }
.kpi-label { color:var(--ui-text-muted); font-size:10px; font-weight:700; }
.kpi-copy strong { margin-top:4px; font-size:24px; line-height:1; }
.kpi-copy small { margin-top:8px; color:var(--ui-text-dimmed); font-size:10px; line-height:1.35; }
.kpi-arrow { position:absolute; top:13px; right:12px; color:var(--ui-text-dimmed); font-size:13px; }
.kpi-card--blue .kpi-icon { background:#dbeafe;color:#2563eb}.kpi-card--sky .kpi-icon{background:#e0f2fe;color:#0284c7}.kpi-card--violet .kpi-icon{background:#ede9fe;color:#7c3aed}.kpi-card--emerald .kpi-icon{background:#d1fae5;color:#059669}.kpi-card--amber .kpi-icon{background:#fef3c7;color:#d97706}.kpi-card--pink .kpi-icon{background:#fce7f3;color:#db2777}
.dashboard-two-column { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }.dashboard-two-column--wide{grid-template-columns:minmax(0,1.25fr) minmax(360px,.75fr)}.dashboard-two-column--actions{grid-template-columns:minmax(0,1.35fr) minmax(320px,.65fr)}
.dashboard-three-column { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
.card-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; margin-bottom:17px; }
.card-heading h2 { margin:3px 0 3px; font-size:14px; font-weight:800; letter-spacing:-.015em; }.card-heading p{color:var(--ui-text-muted);font-size:11px;line-height:1.5}.section-kicker{color:#2563eb;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.section-kicker--warning{color:#d97706}.heading-badge{padding:5px 8px;border-radius:999px;background:#eff6ff;color:#2563eb;font-size:10px;font-weight:800;white-space:nowrap}.heading-badge--warning{background:#fffbeb;color:#d97706}
.pipeline-list { display:grid; gap:7px; }.pipeline-row{display:grid;grid-template-columns:30px 120px minmax(80px,1fr) 70px 48px;align-items:center;gap:9px;width:100%;padding:5px;border-radius:9px;text-align:left;transition:background .15s}.pipeline-row:hover{background:var(--dash-muted)}.pipeline-icon{display:grid;width:29px;height:29px;place-items:center;border-radius:8px}.pipeline-name{font-size:11px;font-weight:700}.pipeline-bar{height:7px;overflow:hidden;border-radius:999px;background:var(--dash-muted)}.pipeline-bar span{display:block;height:100%;min-width:2px;border-radius:inherit}.pipeline-count{display:flex;align-items:baseline;gap:4px}.pipeline-count strong{font-size:13px}.pipeline-count small{color:var(--ui-text-dimmed);font-size:10px}.pipeline-conversion{color:var(--ui-text-muted);font-size:10px;font-weight:700;text-align:right}
.funnel-card .card-heading{align-items:flex-start;flex-wrap:wrap;gap:12px}.funnel-headline{display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex-shrink:0}.funnel-overall{display:flex;align-items:center;gap:8px;padding:7px 11px;border-radius:12px;background:#eff6ff;color:#2563eb}.funnel-overall span{display:flex;flex-direction:column}.funnel-overall strong{font-size:18px;line-height:1}.funnel-overall small{font-size:10px;color:#60a5fa}.funnel-bottleneck-badge{display:flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;background:#fef3c7;color:#b45309;font-size:10px;font-weight:700}
.funnel-list{display:grid;gap:0;margin-bottom:16px}
.funnel-step{display:grid}
.funnel-step--bottleneck .funnel-row{background:color-mix(in srgb,#f59e0b 6%,var(--dash-bg));border-color:color-mix(in srgb,#f59e0b 28%,var(--dash-border))}
.funnel-row{display:grid;grid-template-columns:26px minmax(80px,1fr) 56px 52px 16px;align-items:center;gap:8px;width:100%;padding:5px 6px;border-radius:9px;border:1px solid transparent;text-align:left;transition:background .15s,border-color .15s}.funnel-row:hover{background:var(--dash-muted)}
.funnel-icon{display:grid;width:26px;height:26px;place-items:center;border-radius:7px;background:var(--stage-soft,#f1f5f9);color:var(--stage-color,#64748b);flex-shrink:0}
.funnel-name{font-size:11px;font-weight:700;color:var(--ui-text-highlighted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.funnel-reached-count{font-size:12px;font-weight:700;text-align:right;white-space:nowrap}.funnel-reached-count small{font-size:10px;color:var(--ui-text-dimmed);font-weight:400}
.funnel-pct-col{display:flex;flex-direction:column;align-items:center;gap:1px}
.funnel-pct-big{font-size:15px;font-weight:900;line-height:1}
.funnel-pct-big--good{color:#059669}.funnel-pct-big--warn{color:#d97706}.funnel-pct-big--danger{color:#dc2626}
.funnel-pct-sub{color:var(--ui-text-dimmed);font-size:10px}
.funnel-entry-chip{padding:3px 7px;border-radius:999px;background:#eff6ff;color:#2563eb;font-size:10px;font-weight:700;white-space:nowrap}
.funnel-nav-icon{color:var(--ui-text-dimmed);flex-shrink:0}
.funnel-connector{display:flex;align-items:center;gap:6px;padding:0 9px;height:18px}
.funnel-connector--clean{opacity:.3}
.funnel-connector-line{flex:1;height:1px;background:var(--dash-border)}
.funnel-dropout-chip{display:flex;align-items:center;gap:3px;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;white-space:nowrap;flex-shrink:0}
.funnel-dropout-chip--mild{background:#f0fdf4;color:#16a34a}
.funnel-dropout-chip--warn{background:#fffbeb;color:#b45309}
.funnel-dropout-chip--danger{background:#fef2f2;color:#dc2626}
.duration-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:15px;padding-top:13px;border-top:1px solid var(--dash-border)}.duration-list div{display:flex;justify-content:space-between;gap:8px;padding:6px 8px;border-radius:8px;background:var(--dash-muted);font-size:11px}.duration-list span{color:var(--ui-text-muted)}
.action-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.action-card{padding:12px;border:1px solid color-mix(in srgb,var(--action-color) 22%,var(--dash-border));border-radius:12px;background:color-mix(in srgb,var(--action-color) 4%,var(--dash-bg))}.action-title{display:flex;align-items:center;gap:9px;margin-bottom:7px}.action-title>span{display:grid;width:30px;height:30px;place-items:center;border-radius:8px;background:color-mix(in srgb,var(--action-color) 13%,var(--dash-bg));color:var(--action-color)}.action-title strong{color:var(--action-color);font-size:16px}.action-title p{font-size:9px;font-weight:700}.action-candidate{display:flex;align-items:center;justify-content:space-between;width:100%;padding:6px 2px;border-top:1px solid color-mix(in srgb,var(--action-color) 12%,transparent);text-align:left;font-size:9px}.action-candidate span{display:flex;min-width:0;flex-direction:column;font-weight:700}.action-candidate small{overflow:hidden;color:var(--ui-text-dimmed);font-size:8px;font-weight:500;text-overflow:ellipsis;white-space:nowrap}.action-more{margin-top:4px;color:var(--action-color);font-size:8px;font-weight:700}
.action-heading-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
/* New: Action Center grouped per kandidat */
.action-candidate-list{display:grid;gap:5px}
.action-candidate-row{display:grid;grid-template-columns:minmax(100px,1fr) minmax(0,2fr) 80px 18px;align-items:center;gap:10px;width:100%;padding:8px 10px;border:1px solid var(--dash-border);border-radius:11px;text-align:left;transition:background .15s,border-color .15s}.action-candidate-row:hover{border-color:#93c5fd;background:#eff6ff}
.action-candidate-info{display:flex;min-width:0;flex-direction:column}.action-candidate-info strong{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.action-candidate-info small{color:var(--ui-text-dimmed);font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.action-candidate-tasks{display:flex;flex-wrap:wrap;gap:4px}
.action-task-chip{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:999px;border:1px solid color-mix(in srgb,var(--action-color) 35%,var(--dash-border));background:color-mix(in srgb,var(--action-color) 8%,var(--dash-bg));color:var(--action-color);font-size:10px;font-weight:700;white-space:nowrap}
.action-waiting{display:flex;align-items:center;gap:4px;justify-content:flex-end;color:var(--ui-text-dimmed);font-size:10px;font-weight:700;white-space:nowrap}.action-waiting--warn{color:#d97706}.action-waiting--danger{color:#dc2626}
.action-nav-icon{color:var(--ui-text-dimmed);flex-shrink:0}
/* Legacy (still used if old data shape) */
.action-priority-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.action-priority-row{display:grid;grid-template-columns:38px minmax(0,1fr) 18px;align-items:center;gap:11px;min-width:0;min-height:58px;padding:10px 11px;border:1px solid color-mix(in srgb,var(--action-color) 22%,var(--dash-border));border-radius:11px;background:color-mix(in srgb,var(--action-color) 5%,var(--dash-bg));text-align:left;transition:background .15s,border-color .15s,transform .15s}.action-priority-row:hover{border-color:color-mix(in srgb,var(--action-color) 50%,var(--dash-border));background:color-mix(in srgb,var(--action-color) 10%,var(--dash-bg));transform:translateY(-1px)}.action-priority-icon{display:grid;width:38px;height:38px;place-items:center;border-radius:10px;background:color-mix(in srgb,var(--action-color) 15%,var(--dash-bg));color:var(--action-color)}.action-priority-copy{display:flex;min-width:0;flex-direction:column}.action-priority-copy strong,.action-priority-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.action-priority-copy strong{font-size:12px;line-height:1.35}.action-priority-copy small{margin-top:4px;color:var(--ui-text-muted);font-size:11px;line-height:1.3}
.schedule-list{display:grid;gap:7px}.schedule-list button{display:grid;grid-template-columns:42px minmax(0,1fr) 16px;align-items:center;gap:10px;width:100%;padding:9px;border:1px solid var(--dash-border);border-radius:11px;text-align:left;transition:border-color .15s,background .15s}.schedule-list button:hover{border-color:#93c5fd;background:#eff6ff}.schedule-date{display:grid;height:40px;place-content:center;border-radius:9px;background:#eff6ff;color:#2563eb;text-align:center}.schedule-date strong{font-size:15px;line-height:1}.schedule-date small{text-transform:uppercase;font-size:10px}.schedule-list button>span:nth-child(2){display:flex;min-width:0;flex-direction:column}.schedule-list button>span:nth-child(2)>strong{font-size:11px}.schedule-list small,.schedule-list em{overflow:hidden;color:var(--ui-text-dimmed);font-size:10px;font-style:normal;text-overflow:ellipsis;white-space:nowrap}.schedule-list em{margin-top:3px;color:#2563eb;font-weight:600}
.document-list{display:grid;gap:12px}.document-list button{display:grid;grid-template-columns:175px minmax(80px,1fr) 42px;align-items:center;gap:12px;width:100%;text-align:left}.document-copy{display:flex;flex-direction:column}.document-copy strong{font-size:11px}.document-copy small{margin-top:2px;color:var(--ui-text-dimmed);font-size:10px}.document-progress,.source-bar,.aspect-bar{height:7px;overflow:hidden;border-radius:999px;background:var(--dash-muted)}.document-progress span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#3b82f6,#6366f1)}.document-percent{color:#2563eb;font-size:11px;text-align:right}
/* Grouped document phases */
.document-phases{display:grid;gap:14px}
.doc-phase{display:grid;gap:4px}
.doc-phase-header{display:flex;align-items:center;gap:5px;padding:4px 0;color:#2563eb;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.doc-row{display:grid;grid-template-columns:175px minmax(80px,1fr) 42px;align-items:center;gap:12px;width:100%;padding:3px 0;text-align:left;transition:opacity .15s}.doc-row:hover{opacity:.75}
.vacancy-table-wrap{overflow-x:auto}.vacancy-table{width:100%;border-collapse:collapse;font-size:11px}.vacancy-table th{padding:7px 8px;border-bottom:1px solid var(--dash-border);color:var(--ui-text-dimmed);font-size:10px;text-align:left;text-transform:uppercase}.vacancy-table td{padding:9px 8px;border-bottom:1px solid var(--dash-border)}.vacancy-table tbody tr{cursor:pointer}.vacancy-table tbody tr:hover{background:var(--dash-muted)}.vacancy-table td:first-child{display:flex;min-width:130px;flex-direction:column}.vacancy-table td:first-child small{color:var(--ui-text-dimmed);font-size:10px}.fulfillment{display:grid;grid-template-columns:minmax(50px,1fr) 30px;align-items:center;gap:5px}.fulfillment:before{content:"";grid-column:1;grid-row:1;height:6px;border-radius:9px;background:var(--dash-muted)}.fulfillment i{z-index:1;grid-column:1;grid-row:1;height:6px;border-radius:9px;background:#10b981}.fulfillment small{font-size:10px}.no-target{color:var(--ui-text-dimmed);font-size:10px}
.score-pill{padding:7px 9px;border-radius:10px;background:#eef2ff;color:#4f46e5;font-size:18px;font-weight:800}.score-pill small{font-size:10px}.aspect-list{display:grid;gap:8px}.aspect-list>div{display:grid;grid-template-columns:120px minmax(50px,1fr) 28px;align-items:center;gap:8px;font-size:11px}.aspect-bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#818cf8,#4f46e5)}.aspect-list>div>strong{text-align:right;font-size:11px}
/* Evaluation scope summary standalone (outside .evaluation-scope wrapper) */
.evaluation-scope-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--dash-border)}.evaluation-scope-summary span{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:700}
.evaluation-candidates{display:grid;gap:3px;margin-top:8px}.evaluation-candidates button{display:grid;grid-template-columns:minmax(0,1fr) auto 18px;align-items:center;gap:9px;width:100%;padding:6px 4px;border-bottom:1px solid var(--dash-border);text-align:left;font-size:11px;transition:background .12s}.evaluation-candidates button:hover{background:var(--dash-muted)}.evaluation-candidate-score{font-size:15px;font-weight:800;color:#4f46e5;text-align:right;white-space:nowrap}
.closing-stats{display:grid;gap:12px}.closing-stats>div{display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:9px;padding:10px;border:1px solid var(--dash-border);border-radius:11px}.closing-icon{display:grid;width:34px;height:34px;place-items:center;border-radius:9px;font-size:16px}.closing-icon--pink{background:#fce7f3;color:#db2777}.closing-icon--amber{background:#fef3c7;color:#d97706}.closing-icon--green{background:#d1fae5;color:#059669}.closing-stats p{display:flex;flex-direction:column;font-size:11px;font-weight:700}.closing-stats p small{color:var(--ui-text-dimmed);font-size:10px;font-weight:500}.closing-stats>div>strong{font-size:12px}
.source-list{display:grid;gap:10px}.source-list>div{display:grid;grid-template-columns:95px minmax(50px,1fr) 30px;align-items:center;gap:8px}.source-list>div>span:first-child{display:flex;min-width:0;flex-direction:column}.source-list>div>span:first-child strong{overflow:hidden;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.source-list small{color:var(--ui-text-dimmed);font-size:10px}.source-bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#2dd4bf,#0d9488)}.source-list>div>strong{font-size:11px;text-align:right}
.activity-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 18px}.activity-list button{display:grid;grid-template-columns:8px minmax(0,1fr) auto 16px;align-items:center;gap:9px;padding:9px 3px;border-bottom:1px solid var(--dash-border);text-align:left}.activity-list button:hover p{color:#2563eb}.activity-dot{width:7px;height:7px;border:2px solid #60a5fa;border-radius:999px;background:#dbeafe}.activity-list button>span:nth-child(2){min-width:0}.activity-list strong{font-size:11px}.activity-list p{overflow:hidden;color:var(--ui-text-muted);font-size:11px;text-overflow:ellipsis;white-space:nowrap}.activity-list time{color:var(--ui-text-dimmed);font-size:10px;white-space:nowrap}
.empty-state{display:grid;min-height:170px;place-items:center;align-content:center;gap:5px;color:#10b981;text-align:center}.empty-state strong{font-size:12px}.empty-state p,.empty-copy{color:var(--ui-text-dimmed);font-size:11px}.empty-state--small{min-height:130px;color:var(--ui-text-muted)}.skeleton-card,.skeleton-panel{background:linear-gradient(90deg,var(--dash-muted),var(--dash-bg),var(--dash-muted));background-size:200% 100%;animation:dashboard-shimmer 1.2s infinite}.skeleton-panel{height:320px}.skeleton-card{height:116px}@keyframes dashboard-shimmer{to{background-position:-200% 0}}
@media(max-width:1280px){.kpi-grid{grid-template-columns:repeat(3,1fr)}.dashboard-three-column{grid-template-columns:repeat(2,1fr)}.dashboard-three-column>:last-child{grid-column:span 2}.dashboard-filter{grid-template-columns:repeat(4,1fr)}.filter-actions{grid-column:span 2;justify-content:flex-end}}
@media(max-width:960px){.dashboard-hero{align-items:flex-start;flex-direction:column}.dashboard-two-column,.dashboard-two-column--wide,.dashboard-two-column--actions{grid-template-columns:1fr}.dashboard-filter{grid-template-columns:repeat(2,1fr)}.filter-actions{grid-column:span 2}.activity-list{grid-template-columns:1fr}}
@media(max-width:640px){.dashboard-hero{padding:20px}.dashboard-hero h1{font-size:23px}.hero-actions{width:100%;flex-wrap:wrap}.kpi-grid,.dashboard-three-column{grid-template-columns:1fr}.dashboard-three-column>:last-child{grid-column:auto}.dashboard-filter{grid-template-columns:1fr}.filter-actions{grid-column:auto;justify-content:stretch}.action-grid,.action-priority-list{grid-template-columns:1fr}.pipeline-row{grid-template-columns:28px 90px minmax(50px,1fr) 48px}.pipeline-conversion{display:none}.pipeline-count small{display:none}.document-list button{grid-template-columns:130px minmax(60px,1fr) 37px}.activity-list time{display:none}}

/* Dashboard layout follows the available content width after the sidebar. */
.recruitment-dashboard {
  container-name: recruitment-dashboard;
  container-type: inline-size;
  font-size: 14px;
}

.recruitment-dashboard *,
.recruitment-dashboard *::before,
.recruitment-dashboard *::after {
  box-sizing: border-box;
}

.dashboard-hero,
.dashboard-filter,
.dashboard-card,
.kpi-card,
.dashboard-two-column > *,
.dashboard-three-column > * {
  min-width: 0;
}

.dashboard-card {
  overflow: hidden;
  padding: 22px;
}

.dashboard-hero h1 {
  font-size: 30px;
}

.dashboard-hero p {
  font-size: 14px;
  line-height: 1.6;
}

.dashboard-eyebrow {
  font-size: 11px;
}

.dashboard-filter {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  padding: 18px;
}

.dashboard-filter label,
.dashboard-filter label > span,
.dashboard-filter input,
.dashboard-filter select {
  min-width: 0;
}

.dashboard-filter label > span {
  font-size: 12px;
  line-height: 1.3;
}

.dashboard-filter input,
.dashboard-filter select {
  height: 42px;
  padding: 0 12px;
  font-size: 13px;
}

.filter-actions {
  grid-column: 1 / -1;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 2px;
}

.kpi-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.kpi-card {
  min-height: 110px;
  gap: 14px;
  padding: 18px 42px 18px 18px;
  cursor: pointer;
}

.kpi-card:focus-visible,
.pipeline-row:focus-visible,
.action-candidate:focus-visible,
.schedule-list button:focus-visible,
.document-list button:focus-visible,
.vacancy-table tbody tr:focus-visible,
.activity-list button:focus-visible {
  outline: 3px solid rgba(59, 130, 246, 0.25);
  outline-offset: 2px;
}

.kpi-icon {
  width: 42px;
  height: 42px;
  flex-basis: 42px;
  border-radius: 12px;
}

.kpi-copy {
  overflow: hidden;
}

.kpi-label {
  padding-right: 4px;
  font-size: 12px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.kpi-copy strong {
  margin-top: 6px;
  font-size: 30px;
}

.kpi-copy small {
  margin-top: 9px;
  font-size: 11px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.kpi-arrow {
  top: 16px;
  right: 15px;
  font-size: 16px;
}

.card-heading {
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.card-heading > div {
  min-width: 0;
}

.card-heading h2 {
  margin-top: 5px;
  font-size: 18px;
  line-height: 1.3;
}

.card-heading p {
  max-width: 680px;
  font-size: 12px;
  line-height: 1.55;
}

.section-kicker {
  font-size: 10px;
}

.heading-badge {
  padding: 6px 10px;
  font-size: 11px;
}

.pipeline-reading-guide {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin: -4px 0 16px;
  padding: 10px 12px;
  border: 1px solid var(--dash-primary-border);
  border-radius: 11px;
  background: var(--dash-primary-soft);
  color: var(--dash-text-muted);
  font-size: 11px;
  line-height: 1.5;
}

.pipeline-reading-guide > svg {
  flex: 0 0 auto;
  margin-top: 1px;
  color: var(--dash-primary);
}

.pipeline-reading-guide strong {
  color: var(--dash-text);
}

.pipeline-list {
  gap: 2px;
}

.pipeline-legend-row {
  display: grid;
  grid-template-columns: 36px 120px minmax(150px, 1fr) 92px 64px;
  gap: 11px;
  padding: 0 7px 8px;
  color: var(--ui-text-dimmed);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.pipeline-legend-row span:first-child {
  grid-column: 1 / 3;
}

.pipeline-legend-row span:last-child {
  text-align: right;
}

.pipeline-row {
  grid-template-columns: 36px 120px minmax(150px, 1fr) 92px 64px;
  gap: 11px;
  min-height: 48px;
  padding: 5px 7px;
  cursor: pointer;
}

.pipeline-icon {
  width: 30px;
  height: 30px;
}

.pipeline-name {
  font-size: 12px;
  line-height: 1.3;
}

.pipeline-progress {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.pipeline-progress > small {
  color: var(--dash-text-dimmed);
  font-size: 9px;
  line-height: 1.2;
}

.pipeline-count strong {
  font-size: 15px;
}

.pipeline-count {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 1px;
  line-height: 1.25;
}

.pipeline-count > span {
  display: flex;
  align-items: baseline;
  gap: 2px;
  white-space: nowrap;
}

.pipeline-count > small {
  white-space: nowrap;
}

.pipeline-count small,
.pipeline-conversion,
.trend-legend,
.trend-axis {
  font-size: 10px;
}

.duration-list div {
  padding: 8px 10px;
  font-size: 11px;
}

.trend-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.trend-summary > div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 2px 10px;
  padding: 11px 12px;
  border: 1px solid var(--dash-border);
  border-radius: 11px;
  background: var(--dash-surface-subtle);
}

.trend-summary span {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--dash-text-muted);
  font-size: 11px;
  font-weight: 700;
}

.trend-summary strong {
  grid-column: 2;
  grid-row: 1 / 3;
  align-self: center;
  color: var(--dash-text);
  font-size: 23px;
  line-height: 1;
}

.trend-summary small {
  color: var(--dash-text-dimmed);
  font-size: 9px;
}

.trend-summary--applied span > svg {
  color: var(--dash-primary);
}

.trend-summary--hired span > svg {
  color: var(--dash-success);
}

.trend-legend {
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.trend-plot {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: stretch;
  gap: 7px;
}

.trend-y-axis {
  display: flex;
  height: 180px;
  flex-direction: column;
  justify-content: space-between;
  padding: 13px 0 3px;
  color: var(--dash-text-dimmed);
  font-size: 9px;
  text-align: right;
}

.trend-chart svg {
  height: 180px;
}

.trend-axis {
  margin-left: 31px;
}

.chart-point {
  stroke: var(--dash-surface);
  stroke-width: 2;
  opacity: 0.45;
  transition: opacity 150ms ease, r 150ms ease;
  vector-effect: non-scaling-stroke;
}

.chart-point:hover {
  r: 6px;
  opacity: 1;
}

.chart-point--applied {
  fill: var(--dash-primary);
}

.chart-point--hired {
  fill: var(--dash-success);
}

.duration-section {
  margin-top: 17px;
  padding-top: 15px;
  border-top: 1px solid var(--dash-border);
}

.duration-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 9px;
}

.duration-heading strong {
  color: var(--dash-text);
  font-size: 11px;
}

.duration-heading small {
  max-width: 250px;
  color: var(--dash-text-dimmed);
  font-size: 9px;
  line-height: 1.4;
  text-align: right;
}

.duration-section .duration-list {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
}

.action-grid {
  align-items: start;
  gap: 12px;
}

.action-column {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: 12px;
}

.action-card {
  min-width: 0;
  padding: 14px;
}

.action-title {
  align-items: flex-start;
  margin-bottom: 9px;
}

.action-title > span {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
}

.action-title strong {
  font-size: 20px;
}

.action-title p {
  font-size: 12px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.action-candidate {
  gap: 8px;
  padding: 9px 2px;
  font-size: 12px;
  border-radius: 8px;
  transition: background-color 160ms ease, color 160ms ease, padding 160ms ease, transform 160ms ease;
}

.action-candidate:hover {
  padding-right: 8px;
  padding-left: 8px;
  background: color-mix(in srgb, var(--action-color) 10%, var(--dash-bg));
  color: var(--action-color);
  transform: translateX(2px);
}

.action-candidate span {
  overflow: hidden;
}

.action-candidate small,
.action-more {
  font-size: 10px;
}

.schedule-list button {
  grid-template-columns: 48px minmax(0, 1fr) 18px;
  gap: 12px;
  padding: 11px;
}

.schedule-date {
  height: 46px;
}

.schedule-date strong {
  font-size: 17px;
}

.schedule-date small,
.schedule-list small,
.schedule-list em {
  font-size: 10px;
}

.schedule-list button > span:nth-child(2) > strong {
  font-size: 12px;
}

.document-list {
  gap: 0;
}

.document-list button {
  grid-template-columns: minmax(170px, 210px) minmax(80px, 1fr) 48px;
  margin: 0 -10px;
  width: calc(100% + 20px);
  padding: 8px 10px;
  border-bottom: 1px solid var(--dash-border);
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 160ms ease, transform 160ms ease;
}

.document-list button:last-child {
  border-bottom-color: transparent;
}

.document-list button:hover {
  background: color-mix(in srgb, #4f46e5 7%, var(--dash-bg));
  transform: translateX(2px);
}

.document-list button:hover .document-copy strong,
.document-list button:hover .document-percent {
  color: #4f46e5;
}

.document-copy {
  min-width: 0;
}

.document-copy strong {
  font-size: 12px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.document-copy small,
.document-percent {
  font-size: 10px;
}

.document-progress,
.source-bar,
.aspect-bar {
  height: 8px;
}

.vacancy-table {
  min-width: 620px;
  font-size: 12px;
}

.vacancy-table th {
  padding: 9px 10px;
  font-size: 10px;
}

.vacancy-table td {
  padding: 11px 10px;
}

.vacancy-table td:first-child small,
.fulfillment small,
.no-target {
  font-size: 10px;
}

.score-pill {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 2px;
  max-width: 92px;
  font-size: 20px;
}

.score-pill small:first-child {
  flex-basis: 100%;
  color: #6366f1;
  font-weight: 700;
  text-align: right;
}

.score-pill small {
  font-size: 10px;
}

.aspect-list {
  gap: 11px;
}

.evaluation-scope {
  margin-bottom: 18px;
  padding: 12px;
  border: 1px solid color-mix(in srgb, #6366f1 20%, var(--dash-border));
  border-radius: 12px;
  background: color-mix(in srgb, #6366f1 5%, var(--dash-bg));
}

.evaluation-scope-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  color: var(--ui-text-muted);
  font-size: 10px;
}

.evaluation-scope-summary span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.evaluation-scope-summary strong {
  color: #4f46e5;
  font-size: 11px;
}

.evaluation-candidates {
  display: grid;
  gap: 4px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, #6366f1 14%, transparent);
}

.evaluation-candidates button {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 16px;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 8px;
  border-radius: 8px;
  text-align: left;
  transition: background-color 160ms ease, transform 160ms ease;
}

.evaluation-candidates button:hover {
  background: color-mix(in srgb, #6366f1 10%, var(--dash-bg));
  transform: translateX(2px);
}

.evaluation-candidates button > span:first-child {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.evaluation-candidates strong {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.evaluation-candidates small {
  overflow: hidden;
  color: var(--ui-text-dimmed);
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.evaluation-candidate-score {
  color: #4f46e5;
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
}

.aspect-list > div {
  grid-template-columns: minmax(112px, 145px) minmax(55px, 1fr) 30px;
  gap: 10px;
  font-size: 11px;
}

.aspect-list > div > strong {
  font-size: 11px;
}

.closing-stats > div {
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 11px;
  padding: 12px;
}

.closing-icon {
  width: 42px;
  height: 42px;
  font-size: 19px;
}

.closing-stats p,
.closing-stats > div > strong {
  font-size: 12px;
}

.closing-stats p small {
  font-size: 10px;
}

.source-list {
  gap: 13px;
}

.source-list > div {
  grid-template-columns: minmax(100px, 140px) minmax(50px, 1fr) 28px;
  gap: 10px;
}

.source-list > div > span:first-child strong,
.source-list > div > strong {
  font-size: 11px;
}

.source-list small {
  font-size: 9px;
}

.activity-list button {
  grid-template-columns: 10px minmax(0, 1fr) auto 18px;
  gap: 11px;
  padding: 11px 4px;
}

.activity-list strong {
  font-size: 12px;
}

.activity-list p,
.activity-list time,
.empty-copy,
.empty-state p {
  font-size: 10px;
}

.empty-state strong {
  font-size: 13px;
}

.dashboard-alert {
  font-size: 13px;
}

@container recruitment-dashboard (min-width: 1400px) {
  .kpi-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

@container recruitment-dashboard (max-width: 1080px) {
  .dashboard-two-column,
  .dashboard-two-column--wide,
  .dashboard-two-column--actions {
    grid-template-columns: 1fr;
  }

  .dashboard-three-column {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-three-column > :last-child {
    grid-column: 1 / -1;
  }
}

@container recruitment-dashboard (max-width: 760px) {
  .dashboard-filter,
  .kpi-grid,
  .dashboard-three-column,
  .action-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-three-column > :last-child {
    grid-column: auto;
  }

  .filter-actions {
    grid-column: auto;
    justify-content: stretch;
  }

  .filter-actions > * {
    flex: 1;
  }

  .pipeline-row {
    grid-template-columns: 34px minmax(100px, 1fr) 58px;
  }

  .pipeline-legend-row {
    display: none;
  }

  .pipeline-progress,
  .pipeline-conversion {
    display: none;
  }

  .pipeline-count {
    justify-content: flex-end;
  }

  .document-list button {
    grid-template-columns: minmax(130px, 1fr) 70px 42px;
  }

  .activity-list {
    grid-template-columns: 1fr;
  }

  .trend-summary {
    grid-template-columns: 1fr;
  }

  .duration-heading {
    flex-direction: column;
  }

  .duration-heading small {
    max-width: none;
    text-align: left;
  }
}

/* Semantic theme layer: every dashboard surface has an explicit light/dark pair. */
.recruitment-dashboard {
  color-scheme: light;
  --dash-bg: #ffffff;
  --dash-muted: #f1f5f9;
  --dash-surface: #ffffff;
  --dash-surface-subtle: #f8fafc;
  --dash-surface-raised: #ffffff;
  --dash-border: #dbe3ef;
  --dash-border-strong: #cbd5e1;
  --dash-text: #0f172a;
  --dash-text-muted: #475569;
  --dash-text-dimmed: #64748b;
  --dash-primary: #2563eb;
  --dash-primary-hover: #1d4ed8;
  --dash-primary-soft: #eff6ff;
  --dash-primary-border: #bfdbfe;
  --dash-success: #059669;
  --dash-success-soft: #ecfdf5;
  --dash-warning: #d97706;
  --dash-warning-soft: #fffbeb;
  --dash-danger: #dc2626;
  --dash-danger-soft: #fef2f2;
  --dash-danger-border: #fecaca;
  --dash-indigo: #4f46e5;
  --dash-indigo-soft: #eef2ff;
  --dash-pink: #db2777;
  --dash-pink-soft: #fdf2f8;
  --dash-teal: #0d9488;
  --dash-teal-soft: #f0fdfa;
  --dash-shadow: 0 8px 24px rgba(15, 23, 42, 0.055);
  --dash-shadow-hover: 0 14px 30px rgba(37, 99, 235, 0.11);
  color: var(--dash-text);
}

:global(.portal-dark .recruitment-dashboard) {
  color-scheme: dark;
  --dash-bg: #111827;
  --dash-muted: #1e293b;
  --dash-surface: #111827;
  --dash-surface-subtle: #172033;
  --dash-surface-raised: #182235;
  --dash-border: #334155;
  --dash-border-strong: #475569;
  --dash-text: #f8fafc;
  --dash-text-muted: #cbd5e1;
  --dash-text-dimmed: #94a3b8;
  --dash-primary: #60a5fa;
  --dash-primary-hover: #93c5fd;
  --dash-primary-soft: rgba(59, 130, 246, 0.14);
  --dash-primary-border: rgba(96, 165, 250, 0.34);
  --dash-success: #34d399;
  --dash-success-soft: rgba(16, 185, 129, 0.13);
  --dash-warning: #fbbf24;
  --dash-warning-soft: rgba(245, 158, 11, 0.13);
  --dash-danger: #f87171;
  --dash-danger-soft: rgba(239, 68, 68, 0.13);
  --dash-danger-border: rgba(248, 113, 113, 0.32);
  --dash-indigo: #a5b4fc;
  --dash-indigo-soft: rgba(99, 102, 241, 0.15);
  --dash-pink: #f9a8d4;
  --dash-pink-soft: rgba(236, 72, 153, 0.13);
  --dash-teal: #5eead4;
  --dash-teal-soft: rgba(20, 184, 166, 0.13);
  --dash-shadow: 0 10px 28px rgba(0, 0, 0, 0.26);
  --dash-shadow-hover: 0 16px 34px rgba(0, 0, 0, 0.34);
}

.dashboard-card,
.kpi-card,
.dashboard-filter {
  border-color: var(--dash-border);
  background: var(--dash-surface);
  box-shadow: var(--dash-shadow);
}

.dashboard-hero {
  border-color: var(--dash-primary-border);
  background:
    radial-gradient(circle at 90% 0%, color-mix(in srgb, var(--dash-primary) 17%, transparent), transparent 38%),
    linear-gradient(135deg, var(--dash-primary-soft), var(--dash-surface) 58%, var(--dash-surface-subtle));
  box-shadow: var(--dash-shadow);
}

.dashboard-hero h1,
.card-heading h2,
.kpi-copy strong,
.pipeline-name,
.pipeline-count strong,
.action-title p,
.action-candidate,
.schedule-list button > span:nth-child(2) > strong,
.document-copy strong,
.vacancy-table td,
.aspect-list,
.closing-stats p,
.closing-stats > div > strong,
.source-list > div > span:first-child strong,
.source-list > div > strong,
.activity-list strong,
.empty-state strong {
  color: var(--dash-text);
}

.dashboard-hero p,
.dashboard-filter label > span,
.kpi-label,
.card-heading p,
.pipeline-conversion,
.trend-legend,
.duration-list span,
.evaluation-scope-summary,
.activity-list p,
.empty-state--small {
  color: var(--dash-text-muted);
}

.kpi-copy small,
.kpi-arrow,
.pipeline-legend-row,
.pipeline-count small,
.trend-axis,
.action-candidate small,
.schedule-list small,
.document-copy small,
.vacancy-table th,
.vacancy-table td:first-child small,
.no-target,
.evaluation-candidates small,
.closing-stats p small,
.source-list small,
.activity-list time,
.empty-copy,
.empty-state p {
  color: var(--dash-text-dimmed);
}

.dashboard-eyebrow,
.section-kicker,
.schedule-list em,
.document-percent {
  color: var(--dash-primary);
}

.section-kicker--warning {
  color: var(--dash-warning);
}

.dashboard-filter input,
.dashboard-filter select {
  border-color: var(--dash-border-strong);
  background: var(--dash-surface-subtle);
  color: var(--dash-text);
}

.dashboard-filter input::placeholder {
  color: var(--dash-text-dimmed);
}

.dashboard-filter select option {
  background: var(--dash-surface);
  color: var(--dash-text);
}

.dashboard-filter input:focus,
.dashboard-filter select:focus {
  border-color: var(--dash-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--dash-primary) 20%, transparent);
}

.dashboard-alert {
  border-color: var(--dash-danger-border);
  background: var(--dash-danger-soft);
  color: var(--dash-danger);
}

.heading-badge {
  background: var(--dash-primary-soft);
  color: var(--dash-primary);
}

.heading-badge--warning {
  background: var(--dash-warning-soft);
  color: var(--dash-warning);
}

.kpi-card:hover {
  border-color: var(--dash-primary-border);
  box-shadow: var(--dash-shadow-hover);
}

.kpi-card--blue .kpi-icon { background: var(--dash-primary-soft); color: var(--dash-primary); }
.kpi-card--sky .kpi-icon { background: color-mix(in srgb, #0ea5e9 13%, var(--dash-surface)); color: color-mix(in srgb, #0284c7 75%, var(--dash-text)); }
.kpi-card--violet .kpi-icon { background: color-mix(in srgb, #8b5cf6 14%, var(--dash-surface)); color: color-mix(in srgb, #8b5cf6 76%, var(--dash-text)); }
.kpi-card--emerald .kpi-icon { background: var(--dash-success-soft); color: var(--dash-success); }
.kpi-card--amber .kpi-icon { background: var(--dash-warning-soft); color: var(--dash-warning); }
.kpi-card--pink .kpi-icon { background: var(--dash-pink-soft); color: var(--dash-pink); }

.pipeline-row:hover,
.vacancy-table tbody tr:hover,
.activity-list button:hover {
  background: var(--dash-surface-subtle);
}

.pipeline-icon {
  color: var(--stage-color);
  background: var(--stage-soft);
}

:global(.portal-dark .recruitment-dashboard .pipeline-icon) {
  color: color-mix(in srgb, var(--stage-color) 58%, #ffffff);
  background: color-mix(in srgb, var(--stage-color) 18%, var(--dash-surface));
  filter: none;
}

.pipeline-bar,
.document-progress,
.source-bar,
.aspect-bar,
.fulfillment::before {
  background: var(--dash-muted);
}

.chart-grid,
.duration-list,
.action-candidate,
.document-list button,
.vacancy-table th,
.vacancy-table td,
.activity-list button {
  border-color: var(--dash-border);
}

.legend-applied,
.chart-line--applied {
  color: var(--dash-primary);
}

.legend-hired,
.chart-line--hired {
  color: var(--dash-success);
}

.chart-line--applied { stroke: var(--dash-primary); }
.chart-line--hired { stroke: var(--dash-success); }
.legend-applied { background: var(--dash-primary); }
.legend-hired { background: var(--dash-success); }

.duration-list div {
  background: var(--dash-surface-subtle);
  color: var(--dash-text);
}

.action-card {
  border-color: color-mix(in srgb, var(--action-color) 28%, var(--dash-border));
  background: color-mix(in srgb, var(--action-color) 7%, var(--dash-surface));
}

.action-title > span {
  background: color-mix(in srgb, var(--action-color) 17%, var(--dash-surface));
}

.action-candidate:hover {
  background: color-mix(in srgb, var(--action-color) 13%, var(--dash-surface));
}

.schedule-list button,
.closing-stats > div {
  border-color: var(--dash-border);
  background: var(--dash-surface-subtle);
}

.schedule-list button:hover {
  border-color: var(--dash-primary-border);
  background: var(--dash-primary-soft);
}

.schedule-date {
  background: var(--dash-primary-soft);
  color: var(--dash-primary);
}

.document-list button:hover,
.evaluation-candidates button:hover {
  background: var(--dash-indigo-soft);
}

.document-list button:hover .document-copy strong,
.document-list button:hover .document-percent,
.evaluation-scope-summary strong,
.evaluation-candidate-score {
  color: var(--dash-indigo);
}

.document-progress span {
  background: linear-gradient(90deg, var(--dash-primary), var(--dash-indigo));
}

.vacancy-table-wrap {
  scrollbar-color: var(--dash-border-strong) transparent;
}

.fulfillment i {
  background: var(--dash-success);
}

.score-pill,
.evaluation-scope {
  border-color: color-mix(in srgb, var(--dash-indigo) 25%, var(--dash-border));
  background: var(--dash-indigo-soft);
  color: var(--dash-indigo);
}

.score-pill small:first-child,
.evaluation-candidate-score {
  color: var(--dash-indigo);
}

.evaluation-candidates {
  border-color: color-mix(in srgb, var(--dash-indigo) 22%, transparent);
}

.aspect-bar i {
  background: linear-gradient(90deg, color-mix(in srgb, var(--dash-indigo) 65%, #ffffff), var(--dash-indigo));
}

.closing-icon--pink { background: var(--dash-pink-soft); color: var(--dash-pink); }
.closing-icon--amber { background: var(--dash-warning-soft); color: var(--dash-warning); }
.closing-icon--green { background: var(--dash-success-soft); color: var(--dash-success); }

.source-bar i {
  background: linear-gradient(90deg, color-mix(in srgb, var(--dash-teal) 65%, #ffffff), var(--dash-teal));
}

.activity-list button:hover p {
  color: var(--dash-primary);
}

.activity-dot {
  border-color: var(--dash-primary);
  background: var(--dash-primary-soft);
}

.empty-state {
  color: var(--dash-success);
}

.skeleton-card,
.skeleton-panel {
  background: linear-gradient(90deg, var(--dash-muted), var(--dash-surface-raised), var(--dash-muted));
  background-size: 200% 100%;
}

.kpi-card:focus-visible,
.pipeline-row:focus-visible,
.action-candidate:focus-visible,
.schedule-list button:focus-visible,
.document-list button:focus-visible,
.vacancy-table tbody tr:focus-visible,
.activity-list button:focus-visible {
  outline-color: color-mix(in srgb, var(--dash-primary) 38%, transparent);
}

:global(.portal-dark .recruitment-dashboard .kpi-icon),
:global(.portal-dark .recruitment-dashboard .closing-icon),
:global(.portal-dark .recruitment-dashboard .schedule-date) {
  filter: none;
}
</style>
