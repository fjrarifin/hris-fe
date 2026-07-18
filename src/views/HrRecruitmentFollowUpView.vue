<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getHrRecruitmentDashboard } from '../services/hrService'
import { apiError } from '../utils/formatters'

const route = useRoute()
const router = useRouter()
const dashboard = ref(null)
const loading = ref(false)
const errorMessage = ref('')
const search = ref('')
const selectedCategory = ref('')
const selectedStage = ref('')
const currentPage = ref(1)
const pageSize = 25

const currentMonth = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 7)
const selectedMonth = ref(String(route.query.month || currentMonth))

const actionColors = {
  purple: '#9333ea', orange: '#ea580c', indigo: '#4f46e5', teal: '#0d9488',
  pink: '#db2777', amber: '#d97706', emerald: '#059669', red: '#dc2626',
}

const stageLabels = {
  applied: 'Applied', screening: 'Screening', interview_hr: 'Wawancara HR',
  case_study: 'Case Study', interview_user: 'Wawancara User', reference_check: 'Reference Check',
  offering: 'Offering', pkb: 'PKB', hired: 'Hired & Onboarding', rejected: 'Rejected',
}

const activeActions = computed(() => (dashboard.value?.action_center || []).filter(action => action.count > 0))

const allRows = computed(() => activeActions.value.flatMap(action =>
  action.candidates.map(candidate => ({
    ...candidate,
    actionKey: action.key,
    actionLabel: action.label,
    actionIcon: action.icon,
    actionColor: action.color,
  })),
))

const filteredRows = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return allRows.value.filter(row => {
    const matchesSearch = !keyword || [row.name, row.vacancy, row.detail, row.actionLabel, row.pic]
      .some(value => String(value || '').toLowerCase().includes(keyword))
    const matchesCategory = !selectedCategory.value || row.actionKey === selectedCategory.value
    const matchesStage = !selectedStage.value || row.stage === selectedStage.value
    return matchesSearch && matchesCategory && matchesStage
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize)))
const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredRows.value.slice(start, start + pageSize)
})
const uniqueCandidateCount = computed(() => new Set(allRows.value.map(row => row.id)).size)
const activeStageOptions = computed(() => [...new Set(allRows.value.map(row => row.stage))].filter(Boolean))

watch([search, selectedCategory, selectedStage], () => { currentPage.value = 1 })
watch(totalPages, value => { if (currentPage.value > value) currentPage.value = value })

function dashboardQuery() {
  const allowedKeys = ['vacancy_id', 'department', 'unit', 'pic_nik', 'source', 'status']
  return Object.fromEntries(allowedKeys
    .filter(key => route.query[key] !== undefined && route.query[key] !== '')
    .map(key => [key, route.query[key]]))
}

async function loadFollowUps() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await getHrRecruitmentDashboard({
      ...dashboardQuery(),
      month: selectedMonth.value,
      action_full: 1,
    })
    dashboard.value = response.data
  } catch (error) {
    errorMessage.value = apiError(error, 'Daftar follow-up recruitment gagal dimuat.')
  } finally {
    loading.value = false
  }
}

function openCandidate(row) {
  router.push({ name: 'hr-recruitment-candidates', query: { candidate: row.id, status: row.stage } })
}

function backToDashboard() {
  router.push({ name: 'hr-recruitment-dashboard', query: { ...dashboardQuery(), month: selectedMonth.value } })
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  }).format(new Date(value)).replace(/,| pukul /g, ' • ') + ' WIB'
}

onMounted(loadFollowUps)
</script>

<template>
  <section class="follow-up-page">
    <header class="follow-up-hero">
      <div>
        <button type="button" class="back-link" @click="backToDashboard">
          <UIcon name="i-lucide-arrow-left" class="size-4" /> Dashboard Recruitment
        </button>
        <span class="eyebrow">Recruitment Action Center</span>
        <h1>Daftar Pekerjaan yang Perlu Ditindaklanjuti</h1>
        <p>Seluruh hambatan proses kandidat yang memerlukan tindakan HRD agar recruitment dapat berlanjut.</p>
      </div>
      <UButton icon="i-lucide-refresh-cw" label="Perbarui" :loading="loading" @click="loadFollowUps" />
    </header>

    <div v-if="errorMessage" class="error-banner">
      <UIcon name="i-lucide-circle-alert" class="size-5" />
      <span>{{ errorMessage }}</span>
      <UButton size="xs" variant="ghost" label="Coba Lagi" @click="loadFollowUps" />
    </div>

    <div class="summary-grid">
      <article><span class="summary-icon summary-icon--amber"><UIcon name="i-lucide-list-todo" /></span><p>Total Pekerjaan<strong>{{ dashboard?.summary?.pending_actions || 0 }}</strong></p></article>
      <article><span class="summary-icon summary-icon--indigo"><UIcon name="i-lucide-layout-list" /></span><p>Jenis Tindak Lanjut<strong>{{ activeActions.length }}</strong></p></article>
      <article><span class="summary-icon summary-icon--teal"><UIcon name="i-lucide-users-round" /></span><p>Kandidat Terdampak<strong>{{ uniqueCandidateCount }}</strong></p></article>
    </div>

    <article class="follow-up-card">
      <div class="toolbar">
        <label class="month-filter"><span>Periode</span><input v-model="selectedMonth" type="month" :max="currentMonth" @change="loadFollowUps" /></label>
        <label class="search-filter"><span class="sr-only">Cari</span><UIcon name="i-lucide-search" class="size-4" /><input v-model="search" type="search" placeholder="Cari kandidat, pekerjaan, lowongan, atau PIC..." /></label>
        <select v-model="selectedCategory" aria-label="Filter jenis tindak lanjut">
          <option value="">Semua pekerjaan</option>
          <option v-for="action in activeActions" :key="action.key" :value="action.key">{{ action.label }} ({{ action.count }})</option>
        </select>
        <select v-model="selectedStage" aria-label="Filter tahapan kandidat">
          <option value="">Semua tahap</option>
          <option v-for="stage in activeStageOptions" :key="stage" :value="stage">{{ stageLabels[stage] || stage }}</option>
        </select>
      </div>

      <div class="result-heading">
        <div><strong>{{ filteredRows.length }} pekerjaan</strong><small>Klik baris untuk membuka detail kandidat pada pipeline.</small></div>
        <span v-if="loading"><UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" /> Memuat data</span>
      </div>

      <div v-if="paginatedRows.length" class="follow-up-table-wrap">
        <table class="follow-up-table">
          <thead><tr><th>Pekerjaan</th><th>Kandidat</th><th>Detail Hambatan</th><th>Tahap</th><th>Aktivitas Terakhir</th><th></th></tr></thead>
          <tbody>
            <tr v-for="row in paginatedRows" :key="`${row.actionKey}-${row.id}`" tabindex="0" @click="openCandidate(row)" @keydown.enter="openCandidate(row)">
              <td>
                <div class="follow-up-task-cell">
                  <span class="task-icon" :style="{ '--task-color': actionColors[row.actionColor] }">
                    <UIcon :name="row.actionIcon" class="size-4" />
                  </span>
                  <strong>{{ row.actionLabel }}</strong>
                </div>
              </td>
              <td><strong>{{ row.name }}</strong><small>{{ row.vacancy }}</small></td>
              <td>{{ row.detail || 'Perlu ditindaklanjuti oleh HRD' }}</td>
              <td><span class="stage-badge">{{ stageLabels[row.stage] || row.stage }}</span></td>
              <td>{{ formatDateTime(row.updated_at) }}</td>
              <td><UIcon name="i-lucide-arrow-up-right" class="size-4" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="!loading" class="empty-state">
        <UIcon name="i-lucide-circle-check-big" class="size-10" />
        <strong>Tidak ada pekerjaan yang cocok</strong>
        <p>Ubah pencarian atau filter untuk melihat tindak lanjut lainnya.</p>
      </div>

      <footer v-if="filteredRows.length > pageSize" class="pagination">
        <span>Halaman {{ currentPage }} dari {{ totalPages }}</span>
        <div>
          <UButton size="xs" variant="soft" color="neutral" icon="i-lucide-chevron-left" :disabled="currentPage === 1" @click="currentPage--" />
          <UButton size="xs" variant="soft" color="neutral" icon="i-lucide-chevron-right" :disabled="currentPage === totalPages" @click="currentPage++" />
        </div>
      </footer>
    </article>
  </section>
</template>

<style scoped>
.follow-up-page{display:grid;gap:18px;color:var(--ui-text-highlighted)}
.follow-up-hero,.follow-up-card,.summary-grid article{border:1px solid var(--ui-border);background:var(--ui-bg);box-shadow:0 8px 24px rgba(15,23,42,.05)}
.follow-up-hero{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:24px;border-radius:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--ui-primary) 9%,var(--ui-bg)),var(--ui-bg) 58%)}
.back-link{display:flex;align-items:center;gap:6px;margin-bottom:14px;color:var(--ui-primary);font-size:12px;font-weight:700}.back-link:hover{text-decoration:underline}
.eyebrow{color:var(--ui-primary);font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.follow-up-hero h1{margin-top:5px;font-size:25px;font-weight:850;letter-spacing:-.025em}.follow-up-hero p{margin-top:5px;color:var(--ui-text-muted);font-size:13px}
.error-banner{display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid color-mix(in srgb,#ef4444 30%,var(--ui-border));border-radius:12px;background:color-mix(in srgb,#ef4444 8%,var(--ui-bg));color:#dc2626}.error-banner span{flex:1;font-size:12px}
.summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.summary-grid article{display:flex;align-items:center;gap:12px;padding:16px;border-radius:14px}.summary-grid p{display:flex;flex-direction:column;color:var(--ui-text-muted);font-size:11px}.summary-grid strong{margin-top:3px;color:var(--ui-text-highlighted);font-size:23px;line-height:1}.summary-icon{display:grid;width:42px;height:42px;place-items:center;border-radius:12px;font-size:20px}.summary-icon--amber{background:#fef3c7;color:#d97706}.summary-icon--indigo{background:#e0e7ff;color:#4f46e5}.summary-icon--teal{background:#ccfbf1;color:#0d9488}
.follow-up-card{overflow:hidden;border-radius:16px}.toolbar{display:grid;grid-template-columns:150px minmax(240px,1fr) minmax(210px,.55fr) minmax(165px,.4fr);gap:10px;padding:16px;border-bottom:1px solid var(--ui-border)}.toolbar label{min-width:0}.month-filter{display:flex;flex-direction:column;gap:4px}.month-filter span{color:var(--ui-text-muted);font-size:10px;font-weight:700}.toolbar input,.toolbar select{width:100%;height:39px;border:1px solid var(--ui-border);border-radius:9px;background:var(--ui-bg);padding:0 10px;color:var(--ui-text-highlighted);font-size:12px;outline:none}.toolbar input:focus,.toolbar select:focus{border-color:var(--ui-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--ui-primary) 12%,transparent)}.search-filter{position:relative;align-self:end}.search-filter svg{position:absolute;top:12px;left:11px;color:var(--ui-text-dimmed)}.search-filter input{padding-left:34px}.toolbar select{align-self:end}
.result-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 16px;background:color-mix(in srgb,var(--ui-bg-muted) 45%,var(--ui-bg))}.result-heading>div{display:flex;flex-direction:column}.result-heading strong{font-size:13px}.result-heading small{margin-top:2px;color:var(--ui-text-muted);font-size:10px}.result-heading>span{display:flex;align-items:center;gap:5px;color:var(--ui-primary);font-size:10px;font-weight:700}
.follow-up-table-wrap{overflow-x:auto}.follow-up-table{width:100%;border-collapse:collapse;table-layout:fixed}.follow-up-table th{padding:10px 12px;border-bottom:1px solid var(--ui-border);color:var(--ui-text-dimmed);font-size:9px;letter-spacing:.06em;text-align:left;text-transform:uppercase}.follow-up-table th:nth-child(1){width:25%}.follow-up-table th:nth-child(2){width:17%}.follow-up-table th:nth-child(3){width:18%}.follow-up-table th:nth-child(4){width:13%}.follow-up-table th:nth-child(5){width:18%}.follow-up-table th:last-child{width:36px}.follow-up-table td{padding:11px 12px;border-bottom:1px solid var(--ui-border);color:var(--ui-text-muted);font-size:11px;vertical-align:middle}.follow-up-table tbody tr{cursor:pointer;transition:background .15s}.follow-up-table tbody tr:hover,.follow-up-table tbody tr:focus{background:color-mix(in srgb,var(--ui-primary) 5%,var(--ui-bg));outline:none}.follow-up-table td:first-child{color:var(--ui-text-highlighted)}.follow-up-task-cell{display:flex;align-items:center;gap:9px}.follow-up-table td:nth-child(2){color:var(--ui-text-highlighted)}.follow-up-table td:nth-child(2) strong,.follow-up-table td:nth-child(2) small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.follow-up-table td:nth-child(2) small{margin-top:3px;color:var(--ui-text-dimmed);font-size:9px}.task-icon{display:grid;width:31px;height:31px;flex:0 0 31px;place-items:center;border-radius:8px;background:color-mix(in srgb,var(--task-color) 14%,var(--ui-bg));color:var(--task-color)}.stage-badge{display:inline-flex;padding:4px 7px;border-radius:999px;background:color-mix(in srgb,var(--ui-primary) 10%,var(--ui-bg));color:var(--ui-primary);font-size:9px;font-weight:750;white-space:nowrap}
.empty-state{display:grid;min-height:300px;place-items:center;align-content:center;gap:6px;color:#10b981}.empty-state strong{font-size:14px}.empty-state p{color:var(--ui-text-muted);font-size:11px}.pagination{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;color:var(--ui-text-muted);font-size:10px}.pagination div{display:flex;gap:6px}
@media(max-width:1100px){.toolbar{grid-template-columns:150px 1fr}.summary-grid{grid-template-columns:repeat(3,1fr)}.follow-up-table{min-width:900px}}
@media(max-width:700px){.follow-up-hero{align-items:flex-start;flex-direction:column}.summary-grid{grid-template-columns:1fr}.toolbar{grid-template-columns:1fr}.follow-up-hero h1{font-size:21px}}
</style>
