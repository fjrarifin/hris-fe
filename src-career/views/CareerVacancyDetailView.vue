<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getVacancies, getVacancy, submitApplication } from '../services/careerApi'
import { companyName, setSeo, siteUrl } from '../utils/seo'

const route = useRoute()
const vacancy = ref(null)
const loading = ref(true)
const notFound = ref(false)
const submitting = ref(false)
const success = ref('')
const formError = ref('')
const errors = ref({})
const showModal = ref(false)
const step = ref(1)
const applicationCard = ref(null)
const showMobileCta = ref(true)
const showConfirmModal = ref(false)
const confirmChecked = ref(false)
const relatedVacancies = ref([])
const activeTab = ref('description')

const parsedDesc = computed(() => {
  const raw = vacancy.value?.description || ''

  let mainParagraph = raw
  let highlightSentence = ''
  let techStack = []
  let valueAdded = []

  const linesArray = raw.split(/\r?\n/)
  const cleanParagraphs = []

  for (let line of linesArray) {
    const trimLine = line.trim()
    if (!trimLine) continue

    const lower = trimLine.toLowerCase()
    if (
      lower.startsWith('tech stack:') ||
      lower.startsWith('teknologi:') ||
      lower.startsWith('stack:')
    ) {
      const content = trimLine.substring(trimLine.indexOf(':') + 1).trim()
      techStack = content
        .split(/,+/)
        .map((s) => s.trim())
        .filter(Boolean)
    } else if (lower.startsWith('nilai tambah:') || lower.startsWith('nice to have:')) {
      const content = trimLine.substring(trimLine.indexOf(':') + 1).trim()
      valueAdded = content
        .split(/,+/)
        .map((s) => s.trim())
        .filter(Boolean)
    } else if (
      lower.startsWith('cocok untuk:') ||
      lower.startsWith('cocok untuk kandidat yang tertarik:')
    ) {
      highlightSentence = trimLine.substring(trimLine.indexOf(':') + 1).trim()
    } else if (
      lower.startsWith('cocok untuk kandidat yang tertarik') ||
      lower.includes('cocok untuk kandidat')
    ) {
      highlightSentence = trimLine
    } else {
      cleanParagraphs.push(trimLine)
    }
  }

  if (techStack.length === 0) {
    const commonTech = [
      'Laravel',
      'PHP',
      'Javascript',
      'Vue',
      'React',
      'Node',
      'MySQL',
      'Python',
      'Java',
      'Go',
      'Kotlin',
      'Swift',
      'Flutter',
      'HTML',
      'CSS',
      'PostgreSQL',
      'MongoDB',
      'Postgres',
      'SQL',
      'Git',
    ]
    const commonValue = [
      'Docker',
      'Kubernetes',
      'CI/CD',
      'AWS',
      'GCP',
      'Scrum',
      'Agile',
      'Unit Testing',
      'Redis',
      'Elasticsearch',
    ]

    commonTech.forEach((tech) => {
      const regex = new RegExp(`\\b${tech}\\b`, 'i')
      if (regex.test(raw)) {
        techStack.push(tech)
      }
    })

    commonValue.forEach((val) => {
      const regex = new RegExp(`\\b${val}\\b`, 'i')
      if (regex.test(raw)) {
        valueAdded.push(val)
      }
    })
  }

  if (cleanParagraphs.length > 0) {
    mainParagraph = cleanParagraphs.join('\n\n')
  }

  return {
    mainParagraph,
    highlightSentence,
    techStack,
    valueAdded,
  }
})

const form = reactive({
  name: '',
  email: '',
  phone: '',
  marital_status: '',
  known_person: '',
  last_company: '',
  education_level: '',
  education_major: '',
  previous_salary: '',
  expected_salary: '',
  referred_from: '',
  resume: null,
  website: '',
})

const labels = {
  full_time: 'Penuh Waktu',
  part_time: 'Paruh Waktu',
  contract: 'Kontrak',
  internship: 'Magang',
  temporary: 'Sementara',
  onsite: 'On-site',
  hybrid: 'Hybrid',
  remote: 'Remote',
}

const lines = (value) =>
  String(value || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean)

const formatSalary = (value) => {
  const digits = String(value || '').replace(/\D/g, '')
  return digits ? Number(digits).toLocaleString('id-ID') : ''
}

const updateSalary = (field, value) => {
  form[field] = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 10)
}

const onFile = (event) => {
  form.resume = event.target.files?.[0] || null
}

const deptIcon = (dept) => {
  const d = String(dept || '').toLowerCase()
  if (d.includes('sale') || d.includes('market')) return '🎯'
  if (d.includes('it') || d.includes('tech') || d.includes('engine')) return '💻'
  if (d.includes('general') || d.includes('operation') || d.includes('affair')) return '💼'
  if (d.includes('activity') || d.includes('play')) return '🧩'
  return '✨'
}

const deptColorClass = (dept) => {
  const d = String(dept || '').toLowerCase()
  if (d.includes('sale') || d.includes('market')) return 'sales-theme'
  if (d.includes('it') || d.includes('tech') || d.includes('engine')) return 'it-theme'
  if (d.includes('general') || d.includes('operation') || d.includes('affair'))
    return 'general-theme'
  if (d.includes('activity') || d.includes('play')) return 'activity-theme'
  return 'default-theme'
}

function openApplication() {
  success.value = ''
  formError.value = ''
  errors.value = {}
  step.value = 1
  showModal.value = true
  document.body.style.overflow = 'hidden'
}

function closeApplication() {
  if (submitting.value) return
  showModal.value = false
  document.body.style.overflow = ''
}

function validateStep(activeStep) {
  const nextErrors = {}
  if (activeStep === 1) {
    if (form.name.trim().length < 2) nextErrors.name = ['Nama lengkap wajib diisi.']
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      nextErrors.email = ['Alamat email tidak valid.']
    if (!/^(?:0?8|628)[0-9]{8,12}$/.test(form.phone.replace(/\D/g, '')))
      nextErrors.phone = ['Nomor WhatsApp Indonesia tidak valid.']
    if (!form.marital_status) nextErrors.marital_status = ['Status pernikahan wajib dipilih.']
  } else if (activeStep === 2) {
    if (!form.education_level) nextErrors.education_level = ['Pendidikan terakhir wajib dipilih.']
    if (!form.education_major.trim())
      nextErrors.education_major = ['Jurusan pendidikan wajib diisi.']
    if (!form.previous_salary) nextErrors.previous_salary = ['Gaji saat ini wajib diisi.']
    if (!form.expected_salary) nextErrors.expected_salary = ['Gaji yang diharapkan wajib diisi.']
    if (!form.referred_from) nextErrors.referred_from = ['Sumber informasi wajib dipilih.']
    if (!form.resume) nextErrors.resume = ['CV wajib dipilih.']
    else if (form.resume.type !== 'application/pdf') nextErrors.resume = ['CV harus berupa PDF.']
    else if (form.resume.size > 5 * 1024 * 1024) nextErrors.resume = ['Ukuran CV maksimal 5 MB.']
  }
  errors.value = nextErrors
  formError.value = Object.keys(nextErrors).length
    ? 'Mohon lengkapi field yang ditandai sebelum melanjutkan.'
    : ''
  return !Object.keys(nextErrors).length
}

function nextStep() {
  if (!validateStep(step.value)) return
  step.value++
  formError.value = ''
  document.querySelector('.application-modal-card')?.scrollTo({ top: 0, behavior: 'smooth' })
}

function previousStep() {
  step.value = Math.max(1, step.value - 1)
  formError.value = ''
  errors.value = {}
}

function updateMobileCta() {
  if (!applicationCard.value) return
  showMobileCta.value = applicationCard.value.getBoundingClientRect().top > window.innerHeight
}

function jobPosting(job) {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: [job.description, job.responsibilities, job.requirements]
      .filter(Boolean)
      .join('\n\n'),
    datePosted: job.published_at,
    validThrough: job.application_deadline
      ? `${job.application_deadline}T23:59:59+07:00`
      : undefined,
    employmentType: job.employment_type?.toUpperCase(),
    hiringOrganization: {
      '@type': 'Organization',
      name: companyName,
      sameAs: siteUrl,
    },
    jobLocation: job.location
      ? {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: job.location,
          addressCountry: 'ID',
        },
      }
      : undefined,
    jobLocationType: job.workplace_type === 'remote' ? 'TELECOMMUTE' : undefined,
  }
}

async function loadRelated() {
  try {
    const { data } = await getVacancies({ department: vacancy.value.department })
    let filtered = data.data.filter((v) => v.slug !== vacancy.value.slug)
    if (!filtered.length) {
      const allRes = await getVacancies()
      filtered = allRes.data.data.filter((v) => v.slug !== vacancy.value.slug)
    }
    relatedVacancies.value = filtered.slice(0, 2)
  } catch (err) {
    console.error('Failed to load related vacancies:', err)
  }
}

async function load() {
  loading.value = true
  try {
    const { data } = await getVacancy(route.params.slug)
    vacancy.value = data.data
    setSeo({
      title: data.data.title,
      description: `${data.data.title} di ${data.data.location || companyName}. Lihat tanggung jawab, kualifikasi, dan kirim lamaran.`,
      path: `/jobs/${data.data.slug}`,
      jsonLd: jobPosting(data.data),
    })
    await loadRelated()
  } catch (error) {
    notFound.value = error.response?.status === 404
    setSeo({
      title: 'Lowongan Tidak Tersedia',
      description: 'Lowongan ini tidak tersedia.',
      path: route.path,
      robots: 'noindex,follow',
    })
  } finally {
    loading.value = false
    await nextTick()
    updateMobileCta()
  }
}

function apply() {
  if (submitting.value || !validateStep(1) || !validateStep(2)) return
  confirmChecked.value = false
  showConfirmModal.value = true
}

async function executeApply() {
  showConfirmModal.value = false
  submitting.value = true
  formError.value = ''
  errors.value = {}
  const payload = new FormData()
  Object.entries(form).forEach(([key, value]) => value !== null && payload.append(key, value))
  try {
    const { data } = await submitApplication(vacancy.value.slug, payload)
    success.value = data.message
  } catch (error) {
    errors.value = error.response?.data?.errors || {}
    formError.value =
      error.response?.status === 429
        ? 'Terlalu banyak percobaan. Silakan tunggu sebelum mencoba kembali.'
        : error.response?.data?.message || 'Lamaran gagal dikirim. Periksa kembali data Anda.'
    step.value = Object.keys(errors.value).some((key) =>
      ['name', 'email', 'phone', 'marital_status'].includes(key),
    )
      ? 1
      : 2
  } finally {
    submitting.value = false
  }
}

watch(
  () => route.params.slug,
  () => {
    load()
  },
)

onMounted(() => {
  load()
  window.addEventListener('scroll', updateMobileCta, { passive: true })
  window.addEventListener('resize', updateMobileCta)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateMobileCta)
  window.removeEventListener('resize', updateMobileCta)
  document.body.style.overflow = ''
})
</script>

<template>
  <div v-if="loading" class="detail-loading section-wrap">
    <div class="skeleton detail-skeleton"></div>
  </div>
  <section v-else-if="notFound || !vacancy" class="state-page section-wrap">
    <span class="eyebrow">LOWONGAN TIDAK TERSEDIA</span>
    <h1>Posisi ini sudah ditutup</h1>
    <p>Silakan lihat kesempatan lain yang masih terbuka.</p>
    <RouterLink to="/jobs" class="button">Lihat lowongan lain</RouterLink>
  </section>

  <template v-else>
    <div class="career-detail-container">
      <!-- HEADER BANNER AREA -->
      <section class="vacancy-detail-hero">
        <div class="section-wrap">
          <span class="category-eyebrow">{{ vacancy.division || 'KESEMPATAN BERKARIER' }}</span>
          <h1 class="vacancy-title-header">{{ vacancy.title }}</h1>
          <div class="chips-row">
            <span class="glass-pill-badge">{{ vacancy.location || 'Lokasi belum ditentukan' }}</span>
            <span v-if="vacancy.employment_type" class="glass-pill-badge">{{ labels[vacancy.employment_type] }}</span>
            <span v-if="vacancy.workplace_type" class="glass-pill-badge">{{ labels[vacancy.workplace_type] }}</span>
          </div>
        </div>
      </section>

      <!-- TWO-COLUMN LAYOUT -->
      <section class="detail-layout section-wrap">
        <!-- LEFT COLUMN: CONTENT WITH TABS -->
        <article class="job-content-details">
          <!-- Horizontal Tab Navigation -->
          <div class="tabs-container">
            <button class="tab-btn" :class="{ active: activeTab === 'description' }" type="button"
              @click="activeTab = 'description'">
              Deskripsi
            </button>
            <button v-if="lines(vacancy.responsibilities).length" class="tab-btn"
              :class="{ active: activeTab === 'responsibilities' }" type="button"
              @click="activeTab = 'responsibilities'">
              Tanggung Jawab ({{ lines(vacancy.responsibilities).length }})
            </button>
            <button v-if="lines(vacancy.requirements).length" class="tab-btn"
              :class="{ active: activeTab === 'requirements' }" type="button" @click="activeTab = 'requirements'">
              Kualifikasi ({{ lines(vacancy.requirements).length }})
            </button>
            <button v-if="lines(vacancy.benefits).length" class="tab-btn" :class="{ active: activeTab === 'benefits' }"
              type="button" @click="activeTab = 'benefits'">
              Benefit ({{ lines(vacancy.benefits).length }})
            </button>
          </div>

          <!-- Tab Content Panels -->
          <div class="tab-content-panels">
            <!-- Tab 1: Deskripsi -->
            <div v-show="activeTab === 'description'" class="tab-panel-item">
              <h2 class="section-subheading">Tentang posisi ini</h2>
              <p class="prose-paragraph">
                {{ parsedDesc.mainParagraph }}
              </p>

              <div v-if="parsedDesc.highlightSentence" class="highlight-box-tertarik">
                <strong>Cocok untuk kandidat yang tertarik:</strong>
                <p class="highlight-text">{{ parsedDesc.highlightSentence }}</p>
              </div>

              <!-- Tech Stack & Nice to Have Tags -->
              <div v-if="parsedDesc.techStack.length" class="tags-group-section">
                <h4 class="tags-section-title">Tech Stack</h4>
                <div class="tags-row-flex">
                  <span v-for="tag in parsedDesc.techStack" :key="tag" class="tech-tag">
                    {{ tag }}
                  </span>
                </div>
              </div>

              <div v-if="parsedDesc.valueAdded.length" class="tags-group-section">
                <h4 class="tags-section-title">Nilai Tambah</h4>
                <div class="tags-row-flex">
                  <span v-for="tag in parsedDesc.valueAdded" :key="tag" class="value-tag">
                    {{ tag }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Tab 2: Tanggung Jawab -->
            <div v-show="activeTab === 'responsibilities'" class="tab-panel-item">
              <h2 class="section-subheading">Tanggung jawab</h2>
              <ul class="checkmark-list">
                <li v-for="item in lines(vacancy.responsibilities)" :key="item">
                  <span class="checkmark-symbol">✓</span>
                  <span class="list-item-text">{{ item }}</span>
                </li>
              </ul>
            </div>

            <!-- Tab 3: Kualifikasi -->
            <div v-show="activeTab === 'requirements'" class="tab-panel-item">
              <h2 class="section-subheading">Kualifikasi</h2>
              <ul class="checkmark-list">
                <li v-for="item in lines(vacancy.requirements)" :key="item">
                  <span class="checkmark-symbol">✓</span>
                  <span class="list-item-text">{{ item }}</span>
                </li>
              </ul>
            </div>

            <!-- Tab 4: Benefit -->
            <div v-show="activeTab === 'benefits'" class="tab-panel-item">
              <h2 class="section-subheading">Yang akan kamu dapatkan</h2>
              <ul class="checkmark-list">
                <li v-for="item in lines(vacancy.benefits)" :key="item">
                  <span class="checkmark-symbol">✓</span>
                  <span class="list-item-text">{{ item }}</span>
                </li>
              </ul>
            </div>
          </div>
        </article>

        <!-- RIGHT COLUMN: SUMMARY & CTA -->
        <aside class="sidebar-column">
          <!-- Summary Info Card (New) -->
          <div class="summary-info-card glass-panel-premium">
            <div class="info-row">
              <span class="info-label">Departemen</span>
              <strong class="info-value">{{ vacancy.department || 'General' }}</strong>
            </div>
            <div class="info-row">
              <span class="info-label">Lokasi</span>
              <strong class="info-value">{{ vacancy.location || 'Bandung' }}</strong>
            </div>
            <div class="info-row">
              <span class="info-label">Tipe Kerja</span>
              <strong class="info-value">{{
                labels[vacancy.employment_type] || vacancy.employment_type || 'Penuh Waktu'
              }}</strong>
            </div>
            <div class="info-row" v-if="vacancy.workplace_type">
              <span class="info-label">Tempat Kerja</span>
              <strong class="info-value">{{
                labels[vacancy.workplace_type] || vacancy.workplace_type
              }}</strong>
            </div>
          </div>

          <!-- CTA Apply Step Card -->
          <div id="apply" ref="applicationCard" class="application-cta-premium-card">
            <span class="interest-eyebrow">TERTARIK DENGAN POSISI INI?</span>
            <h2 class="steps-heading">Yuk, mulai langkahmu</h2>
            <p class="steps-subtext">
              Lengkapi profil, tinjau sekali lagi, lalu kirim — cuma butuh beberapa menit.
            </p>

            <div class="steps-list">
              <div class="step-item-box">
                <div class="step-num-circle">1</div>
                <div class="step-details">
                  <strong class="step-title">Lengkapi profil</strong>
                  <span class="step-desc">Data diri, pendidikan, dan ekspektasi gaji</span>
                </div>
              </div>

              <div class="step-item-box">
                <div class="step-num-circle">2</div>
                <div class="step-details">
                  <strong class="step-title">Tinjau lamaran</strong>
                  <span class="step-desc">Cek ulang supaya semua informasi akurat</span>
                </div>
              </div>

              <div class="step-item-box">
                <div class="step-num-circle">3</div>
                <div class="step-details">
                  <strong class="step-title">Kirim lamaran</strong>
                  <span class="step-desc">Tim kami akan segera meninjaunya</span>
                </div>
              </div>
            </div>

            <button class="royal-blue-cta-btn" type="button" @click="openApplication">
              Lamar Sekarang →
            </button>
            <p class="security-privacy-note">CV hanya dapat diakses oleh tim recruitment.</p>
          </div>
        </aside>
      </section>

      <!-- MOBILE CTA BAR -->
      <Transition name="mobile-cta">
        <div v-if="showMobileCta" class="mobile-apply-bar">
          <button type="button" class="button" @click="openApplication">
            Lamar Sekarang <span>→</span>
          </button>
        </div>
      </Transition>

      <!-- APPLICATION POPUP FORM MODAL -->
      <Teleport to="body">
        <div v-if="showModal" class="application-modal" role="dialog" aria-modal="true"
          aria-labelledby="application-modal-title">
          <button class="modal-backdrop" type="button" aria-label="Tutup formulir" @click="closeApplication"></button>
          <div class="application-modal-card glass-panel">
            <header class="modal-header">
              <div>
                <span class="eyebrow">LAMAR POSISI</span>
                <h2 id="application-modal-title">{{ vacancy.title }}</h2>
              </div>
              <button class="modal-close" type="button" aria-label="Tutup" @click="closeApplication">
                ×
              </button>
            </header>
            <div v-if="!success" class="stepper">
              <div v-for="item in 3" :key="item" :class="{ active: step === item, done: step > item }">
                <span>{{ step > item ? '✓' : item }}</span>
                <small>{{
                  ['Profil & Kontak', 'Pendidikan & Finansial', 'Review'][item - 1]
                }}</small>
              </div>
            </div>
            <div v-if="success" class="success-state">
              <span>✓</span>
              <h2>Lamaran terkirim</h2>
              <p>{{ success }}</p>
              <button type="button" class="button" @click="closeApplication">Selesai</button>
            </div>
            <form v-else class="application-wizard" @submit.prevent="apply" novalidate>
              <div v-if="formError" class="form-alert" role="alert">
                {{ formError }}
              </div>
              <section v-show="step === 1" class="modal-step">
                <div class="step-heading">
                  <span>LANGKAH 1 DARI 3</span>
                  <h3>Profil & Kontak</h3>
                  <p>Ceritakan informasi dasar dan kontak aktifmu.</p>
                </div>
                <div class="modal-form-grid">
                  <label class="full-field">Nama lengkap
                    <input v-model.trim="form.name" autocomplete="name" placeholder="Nama sesuai identitas" />
                    <small v-if="errors.name">{{ errors.name[0] }}</small>
                  </label>
                  <label>Email
                    <input v-model.trim="form.email" type="email" autocomplete="email" placeholder="nama@email.com" />
                    <small v-if="errors.email">{{ errors.email[0] }}</small>
                  </label>
                  <label>Nomor WhatsApp
                    <input v-model.trim="form.phone" type="tel" autocomplete="tel" inputmode="tel"
                      placeholder="0812 3456 7890" />
                    <small v-if="errors.phone">{{ errors.phone[0] }}</small>
                  </label>
                  <label>Status pernikahan
                    <select v-model="form.marital_status">
                      <option value="" disabled>Pilih status</option>
                      <option>Belum Menikah</option>
                      <option>Menikah</option>
                      <option>Duda / Janda</option>
                    </select>
                    <small v-if="errors.marital_status">{{ errors.marital_status[0] }}</small>
                  </label>
                  <label>Orang yang dikenal <span class="optional">Opsional</span>
                    <input v-model.trim="form.known_person" placeholder="Nama kerabat jika ada" />
                  </label>
                  <label class="full-field">Perusahaan sebelumnya <span class="optional">Opsional</span>
                    <input v-model.trim="form.last_company" placeholder="Nama perusahaan terakhir" />
                  </label>
                </div>
              </section>
              <section v-show="step === 2" class="modal-step">
                <div class="step-heading">
                  <span>LANGKAH 2 DARI 3</span>
                  <h3>Pendidikan & Finansial</h3>
                  <p>Lengkapi latar belakang dan ekspektasi kariermu.</p>
                </div>
                <div class="modal-form-grid">
                  <label>Pendidikan terakhir
                    <select v-model="form.education_level">
                      <option value="" disabled>Pilih pendidikan</option>
                      <option>SMK</option>
                      <option>SMA</option>
                      <option>D3</option>
                      <option>D4</option>
                      <option>S1</option>
                    </select>
                    <small v-if="errors.education_level">{{ errors.education_level[0] }}</small>
                  </label>
                  <label>Jurusan pendidikan
                    <input v-model.trim="form.education_major" placeholder="Contoh: Teknik Informatika" />
                    <small v-if="errors.education_major">{{ errors.education_major[0] }}</small>
                  </label>
                  <label>Gaji saat ini
                    <div class="money-input">
                      <span>Rp</span>
                      <input :value="formatSalary(form.previous_salary)" inputmode="numeric" placeholder="5.000.000"
                        @input="updateSalary('previous_salary', $event.target.value)" />
                    </div>
                    <small v-if="errors.previous_salary">{{ errors.previous_salary[0] }}</small>
                  </label>
                  <label>Gaji yang diharapkan
                    <div class="money-input">
                      <span>Rp</span>
                      <input :value="formatSalary(form.expected_salary)" inputmode="numeric" placeholder="7.000.000"
                        @input="updateSalary('expected_salary', $event.target.value)" />
                    </div>
                    <small v-if="errors.expected_salary">{{ errors.expected_salary[0] }}</small>
                  </label>
                  <label>Info lowongan dari
                    <select v-model="form.referred_from">
                      <option value="" disabled>Pilih sumber info</option>
                      <option>LinkedIn</option>
                      <option>JobStreet</option>
                      <option>Indeed</option>
                      <option>Instagram</option>
                      <option>Website Resmi</option>
                      <option>Lainnya</option>
                    </select>
                    <small v-if="errors.referred_from">{{ errors.referred_from[0] }}</small>
                  </label>
                  <label class="file-field">CV / Resume (PDF, maks. 5 MB)
                    <input type="file" accept="application/pdf,.pdf" @change="onFile" />
                    <span>{{ form.resume?.name || 'Pilih file PDF' }}</span>
                    <small v-if="errors.resume">{{ errors.resume[0] }}</small>
                  </label>
                </div>
              </section>
              <section v-show="step === 3" class="modal-step">
                <div class="step-heading">
                  <span>LANGKAH 3 DARI 3</span>
                  <h3>Review Lamaran</h3>
                  <p>Pastikan seluruh informasi sudah benar sebelum dikirim.</p>
                </div>
                <div class="review-position">
                  <small>Posisi yang dilamar</small>
                  <strong>{{ vacancy.title }}</strong>
                  <span>{{ vacancy.location || vacancy.department || companyName }}</span>
                </div>
                <div class="review-section">
                  <div class="review-title">
                    <h4>Profil & Kontak</h4>
                    <button type="button" @click="step = 1">Ubah</button>
                  </div>
                  <dl>
                    <div>
                      <dt>Nama lengkap</dt>
                      <dd>{{ form.name }}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{{ form.email }}</dd>
                    </div>
                    <div>
                      <dt>Nomor WhatsApp</dt>
                      <dd>{{ form.phone }}</dd>
                    </div>
                    <div>
                      <dt>Status pernikahan</dt>
                      <dd>{{ form.marital_status }}</dd>
                    </div>
                    <div>
                      <dt>Orang yang dikenal</dt>
                      <dd>{{ form.known_person || '-' }}</dd>
                    </div>
                    <div>
                      <dt>Perusahaan sebelumnya</dt>
                      <dd>{{ form.last_company || '-' }}</dd>
                    </div>
                  </dl>
                </div>
                <div class="review-section">
                  <div class="review-title">
                    <h4>Pendidikan & Finansial</h4>
                    <button type="button" @click="step = 2">Ubah</button>
                  </div>
                  <dl>
                    <div>
                      <dt>Pendidikan</dt>
                      <dd>{{ form.education_level }} — {{ form.education_major }}</dd>
                    </div>
                    <div>
                      <dt>Gaji saat ini</dt>
                      <dd>Rp {{ formatSalary(form.previous_salary) }}</dd>
                    </div>
                    <div>
                      <dt>Gaji yang diharapkan</dt>
                      <dd>Rp {{ formatSalary(form.expected_salary) }}</dd>
                    </div>
                    <div>
                      <dt>Sumber informasi</dt>
                      <dd>{{ form.referred_from }}</dd>
                    </div>
                    <div>
                      <dt>CV / Resume</dt>
                      <dd>{{ form.resume?.name }}</dd>
                    </div>
                  </dl>
                </div>
                <div class="review-consent">
                  Dengan mengirim lamaran, Anda menyetujui pemrosesan data untuk kebutuhan
                  recruitment.
                </div>
              </section>
              <label class="honeypot" aria-hidden="true">Website<input v-model="form.website" tabindex="-1"
                  autocomplete="off" /></label>
              <footer class="modal-actions">
                <button v-if="step > 1" type="button" class="button-secondary" @click="previousStep">
                  ← Kembali
                </button>
                <span v-else></span>
                <button v-if="step < 3" type="button" class="button" @click="nextStep">
                  Lanjut →
                </button>
                <button v-else class="button" :disabled="submitting">
                  {{ submitting ? 'Mengirim...' : 'Kirim lamaran' }} →
                </button>
              </footer>
            </form>
          </div>
        </div>
      </Teleport>

      <!-- Custom Confirmation Modal -->
      <Teleport to="body">
        <div v-if="showConfirmModal" class="career-modal-overlay" role="dialog" aria-modal="true">
          <div class="career-modal-card">
            <header class="career-modal-header">
              <h3>Konfirmasi Kirim Lamaran Pekerjaan</h3>
              <button type="button" class="career-modal-close" @click="showConfirmModal = false">
                <span class="i-lucide-x"></span>
              </button>
            </header>

            <div class="career-modal-body">
              <p>
                Anda akan mengirimkan berkas lamaran pekerjaan untuk posisi
                <strong class="highlight-title">{{ vacancy?.title }}</strong>
                .
              </p>

              <div class="career-warning-box">
                <p class="warning-title"><span class="i-lucide-alert-triangle"></span> PENTING:</p>
                <p>
                  Pastikan seluruh informasi pribadi, detail kontak, dan berkas CV Anda sudah terisi
                  dengan benar. Lamaran yang sudah dikirim bersifat final dan tidak dapat diubah
                  kembali.
                </p>
              </div>

              <label class="career-checkbox-label">
                <input v-model="confirmChecked" type="checkbox" class="career-checkbox" />
                <span class="checkbox-text">
                  Saya menyatakan bahwa data lamaran saya sudah benar dan siap untuk dikirim.
                </span>
              </label>
            </div>

            <footer class="career-modal-footer">
              <button type="button" class="button button-secondary" @click="showConfirmModal = false">
                Batal
              </button>
              <button type="button" class="button button-primary" :disabled="!confirmChecked" @click="executeApply">
                Ya, Kirim Sekarang
              </button>
            </footer>
          </div>
        </div>
      </Teleport>
    </div>
  </template>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

.career-detail-container {
  min-height: 100vh;
  width: 100%;
  font-family: 'Inter', sans-serif;
  color: #0f172a;
  background: transparent;
  padding-bottom: 100px;
  overflow-x: hidden;
}

/* Hero section / Header banner */
.vacancy-detail-hero {
  padding-top: 50px;
  padding-bottom: 10px;
}

.back-link-btn {
  display: inline-block;
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
  text-decoration: none;
  margin-bottom: 24px;
  transition: color 0.15s ease;
}

.back-link-btn:hover {
  color: #2563eb;
}

.category-eyebrow {
  display: block;
  font-size: 11px;
  font-weight: 800;
  color: #2563eb;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 12px;
  padding-left: 10px;
}

.vacancy-title-header {
  font-size: clamp(28px, 4.5vw, 42px);
  font-weight: 800;
  color: #0f172a;
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin: 0 0 20px;
  padding-left: 10px;
}

.chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.glass-pill-badge {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(15, 23, 42, 0.08);
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 9999px;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.02);
}

/* Two column layout */
.two-col-grid {
  display: grid;
  grid-template-columns: 1.8fr 1fr;
  gap: 40px;
  align-items: start;
}

/* Left column content styling */
.job-content-details {
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.03);
  min-width: 0;
  overflow: hidden;
}

.content-block {
  margin-bottom: 36px;
}

.content-block:last-child {
  margin-bottom: 0;
}

.section-subheading {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 16px;
  letter-spacing: -0.01em;
}

.prose-paragraph {
  font-size: 14.5px;
  line-height: 1.7;
  color: #475569;
}

.checkmark-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkmark-list li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.checkmark-symbol {
  color: #059669;
  font-weight: 900;
  font-size: 15px;
  line-height: 1.4;
}

.list-item-text {
  font-size: 14px;
  line-height: 1.55;
  color: #475569;
}

/* Right column sidebar widgets */
.sidebar-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: sticky;
  top: 100px;
}

/* Apply CTA Card */
.application-cta-premium-card {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
}

.interest-eyebrow {
  display: block;
  font-size: 10px;
  font-weight: 800;
  color: #2563eb;
  letter-spacing: 0.1em;
  margin-bottom: 12px;
}

.steps-heading {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 8px;
  letter-spacing: -0.02em;
}

.steps-subtext {
  font-size: 12.5px;
  line-height: 1.65;
  color: #64748b;
  margin: 0 0 24px;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.step-item-box {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(15, 23, 42, 0.04);
  padding: 14px;
  border-radius: 14px;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.01);
}

.step-num-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #2563eb;
  color: white;
  font-weight: 800;
  font-size: 11px;
  flex-shrink: 0;
  margin-top: 2px;
}

.step-details {
  display: flex;
  flex-direction: column;
}

.step-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.step-desc {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
  line-height: 1.4;
}

.royal-blue-cta-btn {
  width: 100%;
  padding: 14px;
  font-size: 14px;
  font-weight: 700;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(37, 99, 235, 0.25);
  transition: all 0.2s ease;
}

.royal-blue-cta-btn:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(37, 99, 235, 0.3);
}

.security-privacy-note {
  font-size: 11px;
  color: #94a3b8;
  text-align: center;
  margin: 12px 0 0;
}

/* Summary Info Card (New) */
.summary-info-card {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.04);
  padding-bottom: 10px;
}

.info-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.info-label {
  color: #64748b;
  font-weight: 500;
}

.info-value {
  color: #0f172a;
  font-weight: 700;
  text-align: right;
}

/* Horizontal tabs container style */
.tabs-container {
  display: flex;
  gap: 8px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 9999px;
  padding: 6px;
  margin-bottom: 30px;
  overflow-x: auto;
  scrollbar-width: none;
  /* Hide scrollbar */
  flex-wrap: nowrap;
  white-space: nowrap;
}

.tabs-container::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 13.5px;
  font-weight: 700;
  padding: 10px 20px;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 0 0 auto;
}

.tab-btn:hover:not(.active) {
  color: #0f172a;
  background: rgba(255, 255, 255, 0.5);
}

.tab-btn.active {
  background: #2563eb;
  color: white;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}

/* Highlight boxes & Tags list styling */
.highlight-box-tertarik {
  background: rgba(244, 114, 182, 0.06);
  border-left: 4px solid #db2777;
  padding: 16px;
  border-radius: 0 12px 12px 0;
  margin-top: 24px;
}

.highlight-box-tertarik strong {
  font-size: 13.5px;
  color: #db2777;
  display: block;
  margin-bottom: 4px;
}

.highlight-text {
  font-size: 14px;
  line-height: 1.5;
  color: #475569;
  margin: 0;
}

.tags-group-section {
  margin-top: 24px;
}

.tags-section-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 10px;
  letter-spacing: 0.04em;
}

.tags-row-flex {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tech-tag {
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
  border: 1px solid rgba(37, 99, 235, 0.15);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
  display: inline-block;
}

.value-tag {
  background: rgba(16, 185, 129, 0.08);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.15);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
  display: inline-block;
}

@media (max-width: 991px) {
  .sidebar-column {
    position: static;
  }
}

@media (max-width: 620px) {
  .job-content-details {
    padding: 20px;
    border-radius: 16px;
  }

  .tabs-container {
    flex-wrap: wrap;
    white-space: normal;
    overflow-x: visible;
    border-radius: 18px;
    padding: 8px;
    justify-content: flex-start;
  }

  .tab-btn {
    flex: 0 0 auto;
    text-align: left;
    padding: 8px 14px;
    font-size: 12.5px;
  }
}
</style>
