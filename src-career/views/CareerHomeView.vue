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
const filters = reactive({ search: String(route.query.search || ''), department: String(route.query.department || ''), page: Number(route.query.page || 1) })
let searchTimer

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

watch(() => route.path, () => {
  setSeo({ title: isJobsPage.value ? 'Lowongan Kerja' : 'Bangun Karier Bersama Kami', description: `Temukan kesempatan kerja terbaru dan tumbuh bersama ${companyName}.`, path: route.path })
})

onMounted(() => {
  setSeo({ title: isJobsPage.value ? 'Lowongan Kerja' : 'Bangun Karier Bersama Kami', description: `Temukan kesempatan kerja terbaru dan tumbuh bersama ${companyName}.`, path: route.path })
  load()
})
</script>

<template>
  <section class="hero section-wrap">
    <div class="hero-copy">
      <span class="eyebrow">BERKARYA BERSAMA KAMI</span>
      <h1>Temukan tempat untuk <span>tumbuh</span> dan berdampak.</h1>
      <p>Kami mencari pribadi penuh rasa ingin tahu yang siap berkolaborasi, belajar, dan menciptakan karya terbaik bersama.</p>
      <a href="#vacancies" class="button">Temukan peluang <span>↓</span></a>
    </div>
    <div class="hero-visual glass-panel" aria-hidden="true">
      <div class="orb orb-one"></div><div class="orb orb-two"></div>
      <div class="quote-card material-card"><span>“</span><p>Ide besar lahir dari tim yang berani bertumbuh bersama.</p></div>
      <div class="floating-stat"><strong>{{ meta.total }}</strong><small>posisi tersedia</small></div>
    </div>
  </section>

  <section id="vacancies" class="vacancies-section section-wrap">
    <div class="section-heading"><div><span class="eyebrow">KESEMPATAN TERBUKA</span><h2>Posisi yang menantimu</h2></div><p>Temukan peran yang sesuai dengan keahlian dan aspirasi kariermu.</p></div>
    <div class="filter-bar glass-panel">
      <label class="search-field"><span>⌕</span><input v-model="filters.search" type="search" placeholder="Cari posisi, keahlian, atau lokasi" aria-label="Cari lowongan" @input="updateFilters" /></label>
      <label><span class="sr-only">Filter departemen</span><select v-model="filters.department" @change="updateFilters"><option value="">Semua departemen</option><option v-for="item in filterOptions.departments" :key="item">{{ item }}</option></select></label>
    </div>
    <div v-if="loading" class="job-grid" aria-live="polite"><div v-for="n in 6" :key="n" class="job-card skeleton"></div></div>
    <div v-else-if="error" class="state-card"><h3>Terjadi kendala</h3><p>{{ error }}</p><button class="button" @click="load">Coba lagi</button></div>
    <div v-else-if="!vacancies.length" class="state-card"><h3>Belum ada posisi yang sesuai</h3><p>Coba kata kunci lain atau kunjungi kembali halaman ini nanti.</p></div>
    <div v-else class="job-grid"><VacancyCard v-for="vacancy in vacancies" :key="vacancy.slug" :vacancy="vacancy" /></div>
    <nav v-if="meta.last_page > 1" class="pagination" aria-label="Pagination lowongan">
      <button :disabled="meta.current_page <= 1" @click="changePage(meta.current_page - 1)">← Sebelumnya</button>
      <span>Halaman {{ meta.current_page }} dari {{ meta.last_page }}</span>
      <button :disabled="meta.current_page >= meta.last_page" @click="changePage(meta.current_page + 1)">Berikutnya →</button>
    </nav>
  </section>
</template>
