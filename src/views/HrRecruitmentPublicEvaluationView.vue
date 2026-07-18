<template>
  <div
    class="public-portal-container min-h-screen bg-slate-900 flex items-center justify-center p-4"
  >
    <div
      class="portal-card"
      :class="{
        'portal-card--compact': loading || error || submitted || evaluationData?.submitted_at,
      }"
    >
      <div class="portal-header text-center mb-8">
        <img src="/hompimplay_icon.png" alt="Logo" class="brand-logo-public" />
        <div
          class="logo-placeholder inline-block bg-gradient-to-r from-primary to-blue-600 text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3 shadow-md shadow-primary/20"
        >
          HRIS Portal
        </div>
        <h1 class="text-2xl font-bold text-white tracking-tight">
          Formulir Evaluasi Wawancara User
        </h1>
        <p class="subtitle text-slate-400 mt-2 text-sm" v-if="candidateName">
          Calon pelamar: <span class="highlight">{{ candidateName }}</span> — Posisi
          <span class="highlight">{{ vacancyTitle }}</span> (Tahap {{ round }})
        </p>
      </div>

      <div v-if="loading" class="loading-state text-center py-12">
        <div
          class="spinner border-4 border-primary/20 border-t-primary rounded-full w-10 h-10 mx-auto animate-spin mb-4"
        ></div>
        <p class="text-slate-400 text-sm">Memuat formulir evaluasi...</p>
      </div>

      <div v-else-if="error" class="error-state text-center py-12">
        <div class="status-icon status-icon--error">
          <span class="i-lucide-circle-alert"></span>
        </div>
        <h2>Tautan Evaluasi Tidak Tersedia</h2>
        <p>{{ error }}</p>
        <p class="state-note">
          Silakan hubungi tim HRD jika Anda masih perlu mengisi evaluasi ini.
        </p>
      </div>

      <div
        v-else-if="submitted || evaluationData?.submitted_at"
        class="success-state text-center py-12"
      >
        <div class="status-icon status-icon--success"><span class="i-lucide-check"></span></div>
        <h2>Evaluasi Terkirim</h2>
        <p>Terima kasih atas partisipasi Anda. Evaluasi hasil wawancara telah berhasil disimpan.</p>
        <p class="state-note">Anda dapat menutup jendela browser ini sekarang.</p>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="portal-form space-y-6">
        <div class="instructions">
          <span class="i-lucide-info info-box-icon"></span>
          <p>
            <strong>Petunjuk pengisian:</strong> Berikan penilaian pada sembilan aspek kompetensi
            dengan skala 1–4. Lengkapi seluruh aspek, catatan umpan balik, dan rekomendasi.
          </p>
        </div>

        <!-- Aspek Penilaian -->
        <div class="space-y-4">
          <div v-for="aspect in aspectsList" :key="aspect.key" class="assessment-card">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <span class="assessment-title">{{ aspect.label }}</span>
              <span class="assessment-description">{{ aspect.desc }}</span>
            </div>

            <div class="grid grid-cols-4 gap-2">
              <label
                v-for="score in [1, 2, 3, 4]"
                :key="score"
                :class="['score-option', form[aspect.key] === score ? 'is-selected' : '']"
              >
                <input
                  type="radio"
                  :name="aspect.key"
                  :value="score"
                  v-model="form[aspect.key]"
                  class="hidden"
                />
                <span class="text-base font-extrabold">{{ score }}</span>
                <span class="text-[9px] uppercase tracking-wider mt-0.5 font-bold">{{
                  scoreLabels[score]
                }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Notes / Umpan Balik -->
        <div class="space-y-1.5">
          <label>Catatan Evaluasi / Keterangan Penilaian</label>
          <textarea
            v-model="form.interview_evaluation_notes"
            required
            rows="4"
            placeholder="Tuliskan ulasan mengenai performa kandidat, kekuatan, kelemahan, dan poin penting hasil diskusi..."
            class="evaluation-notes"
          ></textarea>
        </div>

        <!-- Rekomendasi Kelulusan -->
        <div class="space-y-1.5">
          <label>Rekomendasi Kelulusan</label>
          <div class="recommendation-grid" role="radiogroup" aria-label="Rekomendasi kelulusan">
            <label
              class="recommendation-option recommendation-option--danger"
              :class="{ 'is-selected': form.interview_recommendation === 'tidak_disarankan' }"
            >
              <input
                v-model="form.interview_recommendation"
                name="interview_recommendation"
                type="radio"
                value="tidak_disarankan"
                required
              />
              <span>Tidak Lulus</span>
            </label>
            <label
              class="recommendation-option recommendation-option--warning"
              :class="{ 'is-selected': form.interview_recommendation === 'dipertimbangkan' }"
            >
              <input
                v-model="form.interview_recommendation"
                name="interview_recommendation"
                type="radio"
                value="dipertimbangkan"
                required
              />
              <span>Pertimbangan</span>
            </label>
            <label
              class="recommendation-option recommendation-option--success"
              :class="{ 'is-selected': form.interview_recommendation === 'disarankan' }"
            >
              <input
                v-model="form.interview_recommendation"
                name="interview_recommendation"
                type="radio"
                value="disarankan"
                required
              />
              <span>Lulus</span>
            </label>
          </div>
        </div>

        <!-- Total Score Recap -->
        <div class="score-recap">
          <div>
            <span class="score-recap-label">Total Nilai Akumulasi</span>
            <span class="score-recap-value">{{ totalScore }} <small>/ 36</small></span>
          </div>
          <div class="text-right">
            <span class="score-recap-label">Pewawancara</span>
            <span class="score-recap-name">{{ interviewerName }}</span>
          </div>
        </div>

        <div v-if="validationError" class="validation-warning">
          {{ validationError }}
        </div>

        <button type="submit" class="submit-btn" :disabled="submitting || !isFormComplete">
          {{ submitting ? 'Menyimpan evaluasi...' : 'Kirim Evaluasi Wawancara' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getPublicEvaluation, submitPublicEvaluation } from '../services/hrService'
import { askConfirmation } from '../utils/confirmDialog'

const route = useRoute()
const token = route.params.token

const loading = ref(true)
const submitting = ref(false)
const submitted = ref(false)
const error = ref(null)
const validationError = ref(null)

const candidateName = ref('')
const vacancyTitle = ref('')
const round = ref(1)
const interviewerName = ref('')
const evaluationData = ref(null)

const form = reactive({
  interview_appearance: null,
  interview_attitude: null,
  interview_communication: null,
  interview_motivation: null,
  interview_initiative: null,
  interview_teamwork: null,
  interview_domain_experience: null,
  interview_general_knowledge: null,
  interview_growth_potential: null,
  interview_evaluation_notes: '',
  interview_recommendation: '',
})

const aspectsList = [
  {
    key: 'interview_appearance',
    label: 'Penampilan / Kerapihan',
    desc: 'Kerapihan pakaian, kesopanan berpakaian, pembawaan diri.',
  },
  {
    key: 'interview_attitude',
    label: 'Sikap / Kepribadian',
    desc: 'Kesopanan berbicara, etika, kerendahan hati, respon emosi.',
  },
  {
    key: 'interview_communication',
    label: 'Kemampuan Komunikasi',
    desc: 'Kelancaran bicara, artikulasi, kejelasan menyampaikan ide/argumen.',
  },
  {
    key: 'interview_motivation',
    label: 'Motivasi Kerja',
    desc: 'Semangat, antusiasme terhadap posisi/pekerjaan, daya juang.',
  },
  {
    key: 'interview_initiative',
    label: 'Inisiatif',
    desc: 'Proaktif, ketangkasan berpikir solusi, kemandirian.',
  },
  {
    key: 'interview_teamwork',
    label: 'Kerjasama Tim',
    desc: 'Kemampuan berkolaborasi, toleransi perbedaan pendapat.',
  },
  {
    key: 'interview_domain_experience',
    label: 'Keahlian Bidang / Pengalaman',
    desc: 'Pemahaman teknikal, relevansi keahlian dengan posisi lamaran.',
  },
  {
    key: 'interview_general_knowledge',
    label: 'Pengetahuan Umum',
    desc: 'Wawasan umum, adaptabilitas logika dasar.',
  },
  {
    key: 'interview_growth_potential',
    label: 'Potensi Berkembang',
    desc: 'Kemauan belajar hal baru, growth mindset, adaptasi tren.',
  },
]

const scoreLabels = {
  1: 'Bad',
  2: 'Poor',
  3: 'Good',
  4: 'Excellent',
}

const totalScore = computed(() => {
  return (
    Number(form.interview_appearance || 0) +
    Number(form.interview_attitude || 0) +
    Number(form.interview_communication || 0) +
    Number(form.interview_motivation || 0) +
    Number(form.interview_initiative || 0) +
    Number(form.interview_teamwork || 0) +
    Number(form.interview_domain_experience || 0) +
    Number(form.interview_general_knowledge || 0) +
    Number(form.interview_growth_potential || 0)
  )
})

const isFormComplete = computed(() => {
  const aspectsFilled = aspectsList.every((aspect) => form[aspect.key] !== null)
  return (
    aspectsFilled &&
    form.interview_evaluation_notes.trim() !== '' &&
    form.interview_recommendation !== ''
  )
})

onMounted(async () => {
  try {
    const res = await getPublicEvaluation(token)
    evaluationData.value = res.data.evaluation
    candidateName.value = res.data.candidate_name
    vacancyTitle.value = res.data.vacancy_title
    round.value = res.data.round
    interviewerName.value = res.data.interviewer_name

    // If already submitted
    if (res.data.submitted_at) {
      submitted.value = true
    } else {
      // Pre-fill if exists
      const evalItem = res.data.evaluation
      aspectsList.forEach((aspect) => {
        if (evalItem[aspect.key] !== null && evalItem[aspect.key] !== undefined) {
          form[aspect.key] = Number(evalItem[aspect.key])
        }
      })
      form.interview_evaluation_notes = evalItem.interview_evaluation_notes || ''
      form.interview_recommendation = evalItem.interview_recommendation || ''
    }
  } catch (err) {
    console.error('Failed to load evaluation details', err)
    error.value = 'Tautan evaluasi tidak valid atau telah kedaluwarsa.'
  } finally {
    loading.value = false
  }
})

async function handleSubmit() {
  if (!isFormComplete.value) return

  const confirmed = await askConfirmation({
    title: 'Kirim Evaluasi Wawancara',
    message: 'Apakah Anda yakin ingin mengirim penilaian hasil evaluasi wawancara ini?',
    warningTitle: 'PENTING:',
    warningMessage:
      'Pastikan semua nilai, catatan evaluasi, dan rekomendasi keputusan rekrutmen sudah sesuai. Penilaian yang terkirim bersifat final dan tidak dapat diubah kembali.',
    confirmLabel: 'Ya, Kirim',
    cancelLabel: 'Batal',
    variant: 'structured',
    color: 'primary',
  })
  if (!confirmed) return

  submitting.value = true
  validationError.value = null
  try {
    const payload = {
      ...form,
      interview_total_score: totalScore.value,
    }
    await submitPublicEvaluation(token, payload)
    submitted.value = true
  } catch (err) {
    console.error('Failed to submit evaluation', err)
    validationError.value = err.response?.data?.message || 'Gagal mengirim evaluasi. Hubungi HRD.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.public-portal-container {
  font-family:
    'Inter',
    system-ui,
    -apple-system,
    sans-serif;
}
.portal-card {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}
.spinner {
  border-top-color: #3b82f6;
}
</style>
