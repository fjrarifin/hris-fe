<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import VacancyCard from '../components/VacancyCard.vue'
import { getVacancies } from '../services/careerApi'
import { companyName, setSeo } from '../utils/seo'

const route = useRoute()
const router = useRouter()
const vacancies = ref([])
const filterOptions = ref({ divisions: [], departments: [], units: [], positions: [] })
const meta = ref({ total: 0, current_page: 1, last_page: 1 })
const loading = ref(true)
const error = ref('')
const filters = reactive({
  search: String(route.query.search || ''),
  department: String(route.query.department || ''),
  page: Number(route.query.page || 1),
})
let searchTimer

// Stats calculations from vacancies
const totalPositions = computed(() => meta.value.total || vacancies.value.length || 0)
const totalDepartments = computed(() => filterOptions.value.departments?.length || 0)
const totalLocations = computed(() => {
  const locs = vacancies.value.map((v) => v.location || 'Bandung')
  return Math.max(1, [...new Set(locs)].length)
})

const isJobsPage = computed(() => route.path === '/jobs')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await getVacancies(filters)
    vacancies.value = data.data
    meta.value = data.meta
    filterOptions.value = data.filters
  } catch {
    error.value = 'Lowongan belum dapat dimuat. Silakan coba kembali.'
  } finally {
    loading.value = false
  }
}

function updateFilters() {
  clearTimeout(searchTimer)
  filters.page = 1
  searchTimer = setTimeout(() => {
    router.replace({ query: { ...filters, page: undefined } })
    load()
  }, 350)
}

function changePage(page) {
  filters.page = page
  router.replace({ query: { ...filters } })
  load()
  document.querySelector('#vacancies')?.scrollIntoView({ behavior: 'smooth' })
}

watch(
  () => route.path,
  () => {
    setSeo({
      title: isJobsPage.value ? 'Lowongan Kerja' : 'Bangun Karier Bersama Kami',
      description: `Temukan kesempatan kerja terbaru dan tumbuh bersama ${companyName}.`,
      path: route.path,
    })
  },
)

onMounted(() => {
  setSeo({
    title: isJobsPage.value ? 'Lowongan Kerja' : 'Bangun Karier Bersama Kami',
    description: `Temukan kesempatan kerja terbaru dan tumbuh bersama ${companyName}.`,
    path: route.path,
  })
  load()
})
</script>

<template>
  <div class="career-home-wrapper">
    <div class="career-content-layer">
      <!-- HERO SECTION -->
      <section class="career-hero-section">
        <div class="hero-inner">
          <h1 class="hero-heading-text">
            Temukan tempat untuk tumbuh & berdampak
          </h1>

          <p class="hero-description-text">
            Kami mencari pribadi penuh rasa ingin tahu yang siap berkolaborasi, belajar, dan
            menciptakan karya terbaik bersama.
          </p>
        </div>
      </section>

      <!-- VACANCIES SECTION -->
      <section id="vacancies" class="vacancies-search-section">
        <!-- Floating Filter Bar -->
        <div class="filter-bar-container glass-panel-premium">
          <div class="search-input-wrapper">
            <span class="search-icon-symbol">⌕</span>
            <input v-model="filters.search" type="search" placeholder="Cari posisi, keahlian, atau lokasi..."
              aria-label="Cari lowongan" class="search-text-input" @input="updateFilters" />
          </div>
          <div class="select-dropdown-wrapper">
            <select v-model="filters.department" class="department-select-input" @change="updateFilters">
              <option value="">Semua Departemen</option>
              <option v-for="item in filterOptions.departments" :key="item" :value="item">
                {{ item }}
              </option>
            </select>
          </div>
        </div>

        <!-- Job Grid -->
        <div v-if="loading" class="jobs-list-grid">
          <div v-for="n in 6" :key="n" class="skeleton-card glass-panel-premium">
            <div class="skeleton-header">
              <div class="skeleton-circle"></div>
              <div class="skeleton-line short"></div>
            </div>
            <div class="skeleton-line long"></div>
            <div class="skeleton-line medium"></div>
            <div class="skeleton-footer">
              <div class="skeleton-line short"></div>
            </div>
          </div>
        </div>

        <div v-else-if="error" class="error-state-card glass-panel-premium">
          <h3>Terjadi kendala</h3>
          <p>{{ error }}</p>
          <button class="button-action-solid" @click="load">Coba lagi</button>
        </div>

        <div v-else-if="!vacancies.length" class="empty-state-card glass-panel-premium">
          <h3>Belum ada posisi yang sesuai</h3>
          <p>Coba kata kunci lain atau kunjungi kembali halaman ini nanti.</p>
        </div>

        <div v-else class="jobs-list-grid">
          <VacancyCard v-for="vacancy in vacancies" :key="vacancy.slug" :vacancy="vacancy" />

          <!-- Optional CTA Card to fill the grid if not divisible by 3 -->
          <article v-if="vacancies.length % 3 !== 0" class="career-job-card glass-panel-premium cta-card">
            <div class="card-header-row">
              <div class="icon-box cta-theme">
                <span class="icon-emoji">📧</span>
              </div>
              <div class="category-badge cta-theme">OPEN APPLICATION</div>
            </div>

            <h3 class="job-title-text">Kirim CV Umum</h3>

            <p class="job-desc-text">
              Tidak melihat posisi yang cocok? Hubungi kami atau kirimkan lamaran umum Anda untuk
              kesempatan di masa depan.
            </p>

            <div class="job-tags-row">
              <span class="pills-tag">Semua Lokasi</span>
              <span class="pills-tag">Fleksibel</span>
            </div>

            <div class="card-footer-row">
              <span class="posted-time-text">Selalu terbuka</span>
              <a href="https://www.hompimplay.id/about-us" target="_blank" class="action-link-text">
                Hubungi kami <span class="arrow-symbol">→</span>
              </a>
            </div>
          </article>
        </div>

        <!-- Pagination -->
        <nav v-if="meta.last_page > 1" class="pagination-container" aria-label="Pagination lowongan">
          <button class="pagination-button" :disabled="meta.current_page <= 1"
            @click="changePage(meta.current_page - 1)">
            ← Sebelumnya
          </button>
          <span class="pagination-indicator-text">
            Halaman {{ meta.current_page }} dari {{ meta.last_page }}
          </span>
          <button class="pagination-button" :disabled="meta.current_page >= meta.last_page"
            @click="changePage(meta.current_page + 1)">
            Berikutnya →
          </button>
        </nav>
      </section>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

.career-home-wrapper {
  position: relative;
  min-height: 100vh;
  width: 100%;
  font-family: 'Inter', sans-serif;
  color: #0f172a;
  background: transparent;
  padding-bottom: 80px;
}

.career-content-layer {
  position: relative;
  z-index: 1;
  width: min(1200px, calc(100% - 32px));
  margin: 0 auto;
}

/* Hero Section */
.career-hero-section {
  padding-top: 100px;
  padding-bottom: 10px;
  text-align: center;
}

.hero-inner {
  max-width: 800px;
  margin: 0 auto;
}

.eyebrow-pill-container {
  margin-bottom: 24px;
}

.eyebrow-pill {
  display: inline-block;
  padding: 6px 16px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #4f46e5;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(79, 70, 229, 0.15);
  border-radius: 9999px;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.05);
}

.hero-heading-text {
  font-size: clamp(32px, 5vw, 56px);
  font-weight: 800;
  line-height: 1.15;
  color: #0f172a;
  letter-spacing: -0.02em;
  margin: 0 0 20px;
}

.gradient-text {
  background: linear-gradient(135deg, #2563eb, #db2777);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-description-text {
  font-size: 16px;
  line-height: 1.6;
  color: #475569;
  max-width: 600px;
  margin: 0 auto 48px;
}

/* Stat Cards */
.hero-stats-row {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.stat-card-glass {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 120px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 18px;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.06);
}

.stat-value-text {
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
}

.stat-label-text {
  font-size: 9.5px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.08em;
  margin-top: 4px;
}

/* Vacancies Section */
.vacancies-search-section {
  padding-top: 20px;
  margin-top: 20px;
}

/* Floating Filter Bar */
.filter-bar-container {
  display: flex;
  gap: 16px;
  width: 100%;
  max-width: 800px;
  margin: 0 auto 48px;
  padding: 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
}

.search-input-wrapper {
  position: relative;
  flex: 1;
}

.search-icon-symbol {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  font-size: 18px;
}

.search-text-input {
  width: 100%;
  padding: 12px 16px 12px 42px;
  font-size: 14px;
  border: none;
  background: transparent;
  color: #0f172a;
  outline: none;
}

.search-text-input::placeholder {
  color: #94a3b8;
}

.select-dropdown-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  border-left: 1px solid rgba(15, 23, 42, 0.08);
  padding-left: 16px;
}

.department-select-input {
  appearance: none;
  -webkit-appearance: none;
  border: none;
  background: transparent;
  padding: 8px 32px 8px 8px;
  font-size: 14px;
  font-weight: 500;
  color: #0f172a;
  outline: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23475569' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 14px;
}

/* Job Cards Grid */
.jobs-list-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 24px;
}

/* Skeleton loader */
.skeleton-card {
  height: 280px;
  padding: 24px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skeleton-circle {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.06);
}

.skeleton-line {
  height: 12px;
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.06);
}

.skeleton-line.short {
  width: 30%;
}

.skeleton-line.medium {
  width: 60%;
}

.skeleton-line.long {
  width: 85%;
}

.skeleton-footer {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
}

/* Error/Empty state card */
.error-state-card,
.empty-state-card {
  text-align: center;
  padding: 60px 40px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(14px);
}

.error-state-card h3,
.empty-state-card h3 {
  font-size: 18px;
  font-weight: 800;
  margin-bottom: 8px;
}

.error-state-card p,
.empty-state-card p {
  color: #64748b;
  margin-bottom: 24px;
}

.button-action-solid {
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 700;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.button-action-solid:hover {
  transform: translateY(-1px);
}

/* Pagination */
.pagination-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 48px;
}

.pagination-button {
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(8px);
  color: #0f172a;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pagination-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.95);
  transform: translateY(-1px);
}

.pagination-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-indicator-text {
  font-size: 13px;
  color: #64748b;
}

.career-job-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  min-height: 290px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 18px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.career-job-card:hover {
  transform: translateY(-4px);
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(37, 99, 235, 0.15);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  font-size: 18px;
}

.category-badge {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 4px 10px;
  border-radius: 6px;
  text-transform: uppercase;
}

.cta-theme.icon-box {
  background: #ecfdf5;
}

.cta-theme.category-badge {
  background: rgba(16, 185, 129, 0.08);
  color: #059669;
}

.job-title-text {
  font-size: 17px;
  font-weight: 800;
  color: #0f172a;
  margin: 18px 0 8px;
  letter-spacing: -0.01em;
  line-height: 1.35;
}

.job-title-text a {
  color: inherit;
  text-decoration: none;
}

.job-desc-text {
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
  margin-bottom: 18px;
  flex-grow: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.job-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 32px;
  align-items: center;
  margin-bottom: 18px;
}

.pills-tag {
  background: rgba(15, 23, 42, 0.04);
  color: #475569;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 8px;
}

.card-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px dashed rgba(15, 23, 42, 0.08);
  padding-top: 16px;
}

.posted-time-text {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}

.action-link-text {
  font-size: 12.5px;
  color: #2563eb;
  font-weight: 700;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-link-text:hover {
  color: #1d4ed8;
}

.arrow-symbol {
  transition: transform 0.15s ease;
}

.action-link-text:hover .arrow-symbol {
  transform: translateX(3px);
}

.cta-card {
  border: 1px dashed rgba(16, 185, 129, 0.3);
  background: rgba(240, 253, 250, 0.4);
}

.cta-card:hover {
  background: rgba(240, 253, 250, 0.7);
  border-color: rgba(16, 185, 129, 0.5);
}

@media (max-width: 768px) {
  .career-hero-section {
    padding-top: 60px;
    padding-bottom: 10px;
  }

  .filter-bar-container {
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }

  .select-dropdown-wrapper {
    border-left: none;
    border-top: 1px solid rgba(15, 23, 42, 0.08);
    padding-left: 0;
    padding-top: 12px;
    width: 100%;
  }

  .department-select-input {
    width: 100%;
  }

  .jobs-list-grid {
    grid-template-columns: 1fr;
  }

  .hero-stats-row {
    flex-wrap: wrap;
  }
}
</style>
