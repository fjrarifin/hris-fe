<template>
  <div class="public-portal-container">
    <div
      class="portal-card"
      :class="{
        'portal-card--compact': loading || submitted || error,
        'portal-card--wide': showReview,
      }"
    >
      <div class="portal-header">
        <img src="/hompimplay_icon.png" alt="Logo" class="brand-logo-public" />
        <div class="logo-placeholder">HRIS Portal</div>
        <h1>Persetujuan Permintaan Karyawan Baru (PKB)</h1>
        <p class="subtitle" v-if="data">
          Penyetuju internal: <span class="highlight">{{ data.signer_name }}</span>
        </p>
        <p class="subtitle" v-if="data && showReview">
          Tinjau seluruh hasil seleksi {{ data.candidate_name }} sebelum memberikan persetujuan.
        </p>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Memuat draf dokumen PKB...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <div class="status-icon status-icon--error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
        </div>
        <h2>Permintaan Tidak Tersedia</h2>
        <p>{{ error }}</p>
      </div>

      <div v-else-if="submitted" class="success-state">
        <div class="status-icon status-icon--success">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2>PKB Berhasil Disetujui</h2>
        <p>
          Terima kasih. Tanda tangan digital persetujuan PKB Anda telah berhasil dicatat pada sistem
          HRIS.
        </p>
      </div>

      <!-- Legacy link (sebelum ada token publik) -->
      <div v-else-if="data && data.is_legacy_link" class="pkb-layout">
        <div class="details-panel">
          <h2>Rincian Calon Karyawan</h2>
          <table class="pkb-table">
            <tr>
              <th>Nama Calon</th>
              <td>{{ data.candidate_name }}</td>
            </tr>
            <tr>
              <th>Posisi Dilamar</th>
              <td>{{ data.vacancy_title }}</td>
            </tr>
            <tr>
              <th>Perusahaan Terakhir</th>
              <td>{{ data.last_company || '-' }}</td>
            </tr>
            <tr>
              <th>Gaji Terakhir (Last Salary)</th>
              <td class="salary">Rp {{ formatNumber(data.previous_salary) }}</td>
            </tr>
            <tr>
              <th>Ekspektasi Gaji</th>
              <td class="salary">Rp {{ formatNumber(data.expected_salary) }}</td>
            </tr>
            <tr>
              <th>Gaji Ditawarkan (Offered Salary)</th>
              <td class="salary highlight-salary">Rp {{ formatNumber(data.offered_salary) }}</td>
            </tr>
            <tr>
              <th>Tanggal Mulai Kerja (Join Date)</th>
              <td>{{ formatDate(data.join_date) }}</td>
            </tr>
          </table>
        </div>
        <div class="signature-form-panel">
          <h2>Tanda Tangan Digital Persetujuan</h2>
          <p class="sign-inst">
            <svg
              class="info-box-icon"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <span
              >Dengan ini saya menyatakan menyetujui rekrutmen calon karyawan di atas dengan
              pengajuan gaji yang tertera.</span
            >
          </p>
          <div class="canvas-wrapper">
            <canvas
              ref="canvasRef"
              @mousedown="startDrawing"
              @mousemove="draw"
              @mouseup="stopDrawing"
              @mouseleave="stopDrawing"
              @touchstart="handleTouchStart"
              @touchmove="handleTouchMove"
              @touchend="stopDrawing"
              width="350"
              height="180"
              class="sig-canvas"
            ></canvas>
            <button type="button" @click="clearCanvas" class="clear-btn">Hapus</button>
          </div>
          <div v-if="validationError" class="validation-warning">{{ validationError }}</div>
          <button type="button" @click="submitSignature" class="submit-btn" :disabled="submitting">
            {{ submitting ? 'Mengirim persetujuan...' : 'Setujui & Tanda Tangani' }}
          </button>
        </div>
      </div>

      <!-- Halaman PKB lengkap -->
      <div v-else class="review-layout">
        <div class="review-content">
          <div class="review-note">
            <svg
              class="info-box-icon"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <span>
              Dokumen di bawah merupakan hasil seleksi kandidat. Mohon tinjau CV, summary
              wawancara, case study, dan hasil reference check sebelum menyetujui.
            </span>
          </div>


          <div class="review-tabs" role="tablist">
            <button
              v-for="tab in reviewTabs"
              :key="tab.key"
              type="button"
              role="tab"
              :aria-selected="activeTab === tab.key"
              :class="['review-tab', { 'is-active': activeTab === tab.key }]"
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
              <span v-if="tab.count !== null" class="tab-count">{{ tab.count }}</span>
            </button>
          </div>


          <section v-show="activeTab === 'summary'" class="tab-panel">
            <h2>Rincian Calon Karyawan</h2>
            <table class="pkb-table">
              <tr>
                <th>Nama Calon</th>
                <td>{{ data.candidate_name }}</td>
              </tr>
              <tr>
                <th>Posisi Dilamar</th>
                <td>{{ data.vacancy_title }}</td>
              </tr>
              <tr>
                <th>Pendidikan</th>
                <td>{{ formatEducation(review.candidate) }}</td>
              </tr>
              <tr>
                <th>Pengalaman Kerja</th>
                <td>{{ formatExperience(review.candidate?.years_of_experience) }}</td>
              </tr>
              <tr>
                <th>Perusahaan Terakhir</th>
                <td>{{ data.last_company || '-' }}</td>
              </tr>
              <tr>
                <th>Gaji Terakhir (Last Salary)</th>
                <td class="salary">Rp {{ formatNumber(data.previous_salary) }}</td>
              </tr>
              <tr>
                <th>Ekspektasi Gaji</th>
                <td class="salary">Rp {{ formatNumber(data.expected_salary) }}</td>
              </tr>
              <tr>
                <th>Gaji Ditawarkan (Offered Salary)</th>
                <td class="salary highlight-salary">Rp {{ formatNumber(data.offered_salary) }}</td>
              </tr>
              <tr>
                <th>Tanggal Mulai Kerja (Join Date)</th>
                <td>{{ formatDate(data.join_date) }}</td>
              </tr>
            </table>

            <div class="metric-grid">
              <div class="metric-card">
                <span class="metric-label">Rata-rata Interview User</span>
                <strong class="metric-value">{{ interviewAverage }}</strong>
                <span class="metric-hint">akumulasi seluruh round</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Rating Reference Check</span>
                <strong class="metric-value">{{ referenceAverage }}</strong>
                <span class="metric-hint">{{ review.reference_check?.consensus || 'belum ada data' }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Case Study Selesai</span>
                <strong class="metric-value">{{ caseStudyProgress }}</strong>
                <span class="metric-hint">{{ caseStudyHint }}</span>
              </div>
            </div>
          </section>


          <section v-show="activeTab === 'cv'" class="tab-panel">
            <h2>Resume / CV Kandidat</h2>
            <div class="document-card">
              <div class="document-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                  <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                  <path d="M10 9H8" />
                  <path d="M16 13H8" />
                  <path d="M16 17H8" />
                </svg>
              </div>
              <div class="document-info">
                <strong>{{ review.resume?.filename || 'Resume belum diunggah' }}</strong>
                <p v-if="review.resume?.available">
                  Berkas CV asli yang digunakan pada proses seleksi kandidat.
                </p>
                <p v-else class="empty-inline">HRD belum mengunggah CV untuk kandidat ini.</p>
              </div>
              <button
                v-if="review.resume?.available"
                type="button"
                class="doc-action-btn"
                @click="openDocument('resume', 'Resume / CV Kandidat')"
              >
                Lihat CV
              </button>
            </div>
          </section>

          <section v-show="activeTab === 'interview'" class="tab-panel">
            <div class="section-heading">
              <h2>Summary HR Interview</h2>
              <span :class="['status-pill', hrSummaryAvailable ? 'status-pill--success' : '']">
                {{ hrSummaryAvailable ? 'Tersedia' : 'Belum tersedia' }}
              </span>
            </div>

            <div class="panel-card">
              <div class="meta-line">
                <span v-if="review.hr_summary?.date">
                  Jadwal: {{ formatDate(review.hr_summary.date) }}
                  <template v-if="review.hr_summary?.time">
                    , {{ String(review.hr_summary.time).slice(0, 5) }}
                  </template>
                </span>
                <span v-else>Jadwal wawancara HR belum diisi.</span>
              </div>
              <div v-if="review.hr_summary?.text" class="text-summary">
                {{ review.hr_summary.text }}
              </div>
              <div v-if="review.hr_summary?.file_available" class="doc-actions">
                <button
                  type="button"
                  class="doc-action-btn"
                  @click="openDocument('hr-summary', 'Berkas Summary HR Interview')"
                >
                  Lihat Berkas Summary HR
                </button>
              </div>
              <p
                v-if="!review.hr_summary?.text && !review.hr_summary?.file_available"
                class="empty-state"
              >
                HRD belum mengisi catatan atau mengunggah berkas summary wawancara HR.
              </p>
            </div>

            <h2 class="section-gap">Wawancara User</h2>
            <p v-if="!review.user_interviews?.length" class="empty-state">
              Belum ada jadwal wawancara user untuk kandidat ini.
            </p>


            <div
              v-for="round in review.user_interviews"
              :key="`user-round-${round.round}`"
              class="panel-card"
            >
              <div class="section-heading">
                <h3>Round {{ round.round }}</h3>
                <span
                  :class="[
                    'status-pill',
                    round.evaluation_count ? 'status-pill--success' : 'status-pill--waiting',
                  ]"
                >
                  {{ round.evaluation_count ? `${round.evaluation_count} evaluator` : 'Menunggu evaluasi' }}
                </span>
              </div>

              <div class="meta-grid">
                <div>
                  <span class="meta-label">Pewawancara</span>
                  <strong>{{ round.interviewers?.length ? round.interviewers.join(', ') : '-' }}</strong>
                </div>
                <div>
                  <span class="meta-label">Jadwal</span>
                  <strong>
                    {{ formatDate(round.date) }}
                    <template v-if="round.time">, {{ String(round.time).slice(0, 5) }}</template>
                  </strong>
                </div>
                <div>
                  <span class="meta-label">Tipe</span>
                  <strong>{{ formatInterviewType(round.type) }}</strong>
                </div>
                <div>
                  <span class="meta-label">Lokasi / Tautan</span>
                  <strong>{{ round.location || round.meet_link || '-' }}</strong>
                </div>
              </div>

              <div v-if="round.evaluation_count" class="recap-row">
                <div>
                  <span>Rata-rata Nilai</span>
                  <strong>{{ round.average_total }} / 36</strong>
                </div>
                <div>
                  <span>Konsensus</span>
                  <strong>{{ round.consensus }}</strong>
                </div>
              </div>

              <div v-if="round.summary_file_available" class="doc-actions">
                <button
                  type="button"
                  class="doc-action-btn"
                  @click="openDocument('user-summary', `Summary User Interview Round ${round.round}`, round.round)"
                >
                  Lihat Summary Round {{ round.round }}
                </button>
              </div>

              <details
                v-for="(evaluation, index) in round.evaluations"
                :key="`evaluation-${round.round}-${index}`"
                class="evaluation-detail"
              >
                <summary>
                  <span class="evaluation-name">
                    {{ evaluation.interviewer_name || `Evaluator ${index + 1}` }}
                  </span>
                  <span class="evaluation-score">{{ evaluation.total_score ?? '-' }} / 36</span>
                  <span class="evaluation-recommendation">{{ evaluation.recommendation }}</span>
                </summary>
                <table class="aspect-table">
                  <tr v-for="aspect in evaluation.aspects" :key="aspect.label">
                    <td>{{ aspect.label }}</td>
                    <td>{{ aspect.score ?? '-' }} / 4</td>
                  </tr>
                </table>
                <div v-if="evaluation.notes" class="notes-box">
                  <strong>Catatan evaluator:</strong>
                  <p>{{ evaluation.notes }}</p>
                </div>
              </details>

              <p v-if="!round.evaluations?.length" class="empty-state">
                Evaluasi pewawancara belum dikirim.
              </p>
            </div>
          </section>


          <section v-show="activeTab === 'case-study'" class="tab-panel">
            <h2>Hasil Case Study</h2>
            <p v-if="!review.case_studies?.length" class="empty-state">
              Belum ada case study yang dikirim ke kandidat.
            </p>

            <div
              v-for="caseStudy in review.case_studies"
              :key="`case-study-${caseStudy.round}`"
              class="panel-card"
            >
              <div class="section-heading">
                <h3>{{ caseStudy.title }}</h3>
                <span
                  :class="[
                    'status-pill',
                    caseStudy.submission_file_available ? 'status-pill--success' : 'status-pill--waiting',
                  ]"
                >
                  {{ caseStudy.submission_file_available ? 'Sudah dikumpulkan' : 'Belum dikumpulkan' }}
                </span>
              </div>

              <div class="meta-grid">
                <div>
                  <span class="meta-label">Dikirim</span>
                  <strong>{{ formatDateTime(caseStudy.sent_at) }}</strong>
                </div>
                <div>
                  <span class="meta-label">Dikumpulkan</span>
                  <strong>{{ formatDateTime(caseStudy.submitted_at) }}</strong>
                </div>
              </div>

              <div v-if="caseStudy.notes" class="notes-box">
                <strong>Catatan:</strong>
                <p>{{ caseStudy.notes }}</p>
              </div>

              <div class="doc-actions">
                <button
                  v-if="caseStudy.question_file_available"
                  type="button"
                  class="doc-action-btn"
                  @click="openDocument('case-study-question', `Soal ${caseStudy.title}`, caseStudy.round)"
                >
                  Lihat Soal
                </button>
                <button
                  v-if="caseStudy.submission_file_available"
                  type="button"
                  class="doc-action-btn doc-action-btn--primary"
                  @click="openDocument('case-study', `Hasil ${caseStudy.title}`, caseStudy.round)"
                >
                  Lihat Hasil Case Study
                </button>
              </div>
            </div>
          </section>


          <section v-show="activeTab === 'reference'" class="tab-panel">
            <h2>Hasil Reference Check</h2>

            <div class="metric-grid metric-grid--compact">
              <div class="metric-card">
                <span class="metric-label">Pemberi Referensi</span>
                <strong class="metric-value">
                  {{ review.reference_check?.submitted_count || 0 }} /
                  {{ review.reference_check?.required_count || review.reference_check?.total_count || 0 }}
                </strong>
                <span class="metric-hint">sudah mengisi formulir</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Rating Rata-rata</span>
                <strong class="metric-value">{{ referenceAverage }}</strong>
                <span class="metric-hint">skala 1 - 5</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Konsensus</span>
                <strong class="metric-value metric-value--text">
                  {{ review.reference_check?.consensus || '-' }}
                </strong>
                <span class="metric-hint">
                  {{ review.reference_check?.recommended_count || 0 }} merekomendasikan
                </span>
              </div>
            </div>

            <div
              v-if="review.reference_check?.summary_file_available"
              class="doc-actions doc-actions--left"
            >
              <button
                type="button"
                class="doc-action-btn"
                @click="openDocument('reference-summary', 'Summary Reference Check')"
              >
                Lihat Summary Reference Check
              </button>
            </div>

            <p v-if="!review.reference_check?.items?.length" class="empty-state">
              Belum ada pemberi referensi untuk kandidat ini.
            </p>

            <details
              v-for="(reference, index) in review.reference_check?.items || []"
              :key="`reference-${index}`"
              class="panel-card reference-card"
            >
              <summary class="reference-summary">
                <div>
                  <strong>{{ reference.name || `Pemberi Referensi ${index + 1}` }}</strong>
                  <span class="reference-role">
                    {{ [reference.position, reference.company].filter(Boolean).join(' · ') || '-' }}
                  </span>
                </div>
                <span
                  :class="[
                    'status-pill',
                    reference.submitted_at ? 'status-pill--success' : 'status-pill--waiting',
                  ]"
                >
                  {{ reference.submitted_at ? 'Sudah diisi' : 'Menunggu' }}
                </span>
              </summary>

              <div class="meta-grid">
                <div>
                  <span class="meta-label">Hubungan Kerja</span>
                  <strong>{{ reference.relationship || '-' }}</strong>
                </div>
                <div>
                  <span class="meta-label">Tipe Formulir</span>
                  <strong>{{ reference.form_type === 'managerial' ? 'Managerial' : 'Staff' }}</strong>
                </div>
                <div>
                  <span class="meta-label">Rating</span>
                  <strong>{{ formatReferenceRating(reference.rating) }}</strong>
                </div>
                <div>
                  <span class="meta-label">Rekomendasi</span>
                  <strong>{{ reference.recommendation === 'yes' ? 'Direkomendasikan' : reference.recommendation === 'no' ? 'Tidak Direkomendasikan' : '-' }}</strong>
                </div>
              </div>

              <table v-if="reference.submitted_at" class="aspect-table aspect-table--answers">
                <tr v-for="aspect in visibleReferenceAspects(reference)" :key="aspect.key">
                  <td>{{ aspect.label }}</td>
                  <td>{{ formatReferenceAnswer(reference.answers?.[aspect.key]) }}</td>
                </tr>
              </table>
              <p v-else class="empty-state">
                Pemberi referensi belum mengirimkan jawaban.
              </p>
            </details>
          </section>
        </div>


        <aside class="signature-panel">
          <h2>Tanda Tangan Digital Persetujuan</h2>
          <p class="sign-inst">
            <svg
              class="info-box-icon"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <span>
              Dengan ini saya menyatakan telah meninjau seluruh dokumen seleksi dan menyetujui
              rekrutmen calon karyawan di atas dengan pengajuan gaji yang tertera.
            </span>
          </p>

          <div class="canvas-wrapper">
            <canvas
              ref="canvasRef"
              @mousedown="startDrawing"
              @mousemove="draw"
              @mouseup="stopDrawing"
              @mouseleave="stopDrawing"
              @touchstart="handleTouchStart"
              @touchmove="handleTouchMove"
              @touchend="stopDrawing"
              width="350"
              height="180"
              class="sig-canvas"
            ></canvas>
            <button type="button" @click="clearCanvas" class="clear-btn">Hapus</button>
          </div>

          <div v-if="validationError" class="validation-warning">{{ validationError }}</div>

          <button type="button" @click="submitSignature" class="submit-btn" :disabled="submitting">
            {{ submitting ? 'Mengirim persetujuan...' : 'Setujui & Tanda Tangani' }}
          </button>
          <p class="sign-note">
            Tindakan ini bersifat final. Tanda tangan digital Anda akan dicatat pada sistem HRIS.
          </p>
        </aside>
      </div>
    </div>

    <div v-if="docState.active" class="doc-modal" @click.self="closeDocument">
      <div class="doc-modal-card">
        <div class="doc-modal-header">
          <h3>{{ docState.title }}</h3>
          <button type="button" class="doc-modal-close" @click="closeDocument">&times;</button>
        </div>

        <div v-if="docState.loading" class="loading-state">
          <div class="spinner"></div>
          <p>Memuat dokumen...</p>
        </div>

        <div v-else-if="docState.error" class="error-state">
          <p>{{ docState.error }}</p>
        </div>

        <div v-else class="doc-modal-body">
          <VuePdfEmbed v-if="docState.isPdf" :source="docState.url" />
          <div v-else class="non-pdf-card">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
              <path d="M14 2v4a2 2 0 0 0 2 2h4" />
              <path d="M10 9H8" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
            </svg>
            <p>Pratinjau tidak tersedia untuk tipe berkas ini.</p>
            <a :href="docState.url" :download="docState.filename" class="submit-btn">
              Unduh {{ docState.filename }}
            </a>
          </div>
          <div v-if="docState.isPdf" class="doc-modal-actions">
            <a :href="docState.url" :download="docState.filename" class="download-link-btn">
              Unduh Dokumen
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import VuePdfEmbed from 'vue-pdf-embed'
import {
  getPublicPkbDocument,
  getPublicPkbSigner,
  submitPublicPkbSignature,
} from '../services/hrService'
import { askConfirmation } from '../utils/confirmDialog'

const route = useRoute()
const id = route.params.id

const loading = ref(true)
const submitting = ref(false)
const submitted = ref(false)
const error = ref(null)
const validationError = ref(null)
const data = ref(null)
const activeTab = ref('summary')

const canvasRef = ref(null)
let isDrawing = false
let ctx = null

const review = computed(() => data.value?.review || {})
const showReview = computed(() => Boolean(data.value) && !data.value.is_legacy_link)
const hrSummaryAvailable = computed(() =>
  Boolean(review.value.hr_summary?.text || review.value.hr_summary?.file_available),
)

const reviewTabs = computed(() => [
  { key: 'summary', label: 'Ringkasan', count: null },
  { key: 'cv', label: 'CV', count: review.value.resume?.available ? 1 : 0 },
  {
    key: 'interview',
    label: 'Interview',
    count:
      (review.value.user_interviews?.length || 0) + (hrSummaryAvailable.value ? 1 : 0),
  },
  { key: 'case-study', label: 'Case Study', count: review.value.case_studies?.length || 0 },
  {
    key: 'reference',
    label: 'Reference Check',
    count: review.value.reference_check?.submitted_count || 0,
  },
])

const interviewAverage = computed(() => {
  const rounds = (review.value.user_interviews || []).filter(
    (round) => round.average_total && round.average_total !== '-',
  )
  if (!rounds.length) return '-'
  const total = rounds.reduce(
    (sum, round) => sum + Number(String(round.average_total).replace(',', '.')),
    0,
  )
  return `${(total / rounds.length).toFixed(2).replace('.', ',')} / 36`
})

const referenceAverage = computed(() => {
  const rating = review.value.reference_check?.average_rating
  return rating ? `${rating} / 5` : '-'
})

const caseStudyProgress = computed(() => {
  const items = review.value.case_studies || []
  if (!items.length) return '-'
  const completed = items.filter((item) => item.submission_file_available).length
  return `${completed} / ${items.length}`
})

const caseStudyHint = computed(() => {
  const items = review.value.case_studies || []
  if (!items.length) return 'belum ada case study'
  return items.some((item) => item.submission_file_available)
    ? 'hasil sudah dikumpulkan'
    : 'menunggu pengumpulan'
})

const referenceAspectKeys = [
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
  { key: 'leadership', label: 'Kepemimpinan', managerial: true },
  { key: 'leadership_conflict', label: 'Konflik Kepemimpinan', managerial: true },
  { key: 'team_relationship', label: 'Hubungan dengan Tim', managerial: true },
  { key: 'work_again', label: 'Bersedia Bekerja Sama Lagi' },
  { key: 'additional_notes', label: 'Catatan Tambahan' },
]

const visibleReferenceAspects = (reference) =>
  referenceAspectKeys.filter((aspect) => !aspect.managerial || reference.form_type === 'managerial')


const docState = reactive({
  active: false,
  loading: false,
  error: null,
  title: '',
  filename: '',
  mime: '',
  url: '',
  isPdf: false,
})

const formatNumber = (num) => {
  if (num === null || num === undefined || num === '') return '0'
  const parsed = Number(num.toString().replace(/[^0-9]/g, ''))
  return isNaN(parsed) ? '0' : parsed.toLocaleString('id-ID')
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatEducation = (candidate) => {
  if (!candidate) return '-'
  const parts = [candidate.education_level, candidate.education_major].filter(Boolean)
  return parts.length ? parts.join(' - ') : '-'
}

const formatExperience = (years) => {
  if (years === null || years === undefined || years === '') return '-'
  return `${years} tahun`
}

const formatInterviewType = (type) => {
  if (!type) return '-'
  return type === 'online' ? 'Online' : type === 'offline' ? 'Offline' : type
}

const formatReferenceRating = (rating) => {
  const labels = {
    1: '1/5 (Sangat tidak rekomendasi)',
    2: '2/5 (Tidak direkomendasikan)',
    3: '3/5 (Dipertimbangkan)',
    4: '4/5 (Direkomendasikan)',
    5: '5/5 (Sangat direkomendasikan)',
  }
  return labels[Number(rating)] || (rating ? `${rating} / 5` : '-')
}

const formatReferenceAnswer = (answer) => {
  if (answer === null || answer === undefined || answer === '') return '-'
  if (typeof answer === 'object') return JSON.stringify(answer)
  return String(answer)
}

const base64ToBlob = (base64, mime) => {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  return new Blob([new Uint8Array(byteNumbers)], {
    type: mime || 'application/octet-stream',
  })
}

const openDocument = async (type, title, round = null) => {
  if (docState.url) {
    URL.revokeObjectURL(docState.url)
  }

  Object.assign(docState, {
    active: true,
    loading: true,
    error: null,
    title,
    filename: '',
    mime: '',
    url: '',
    isPdf: false,
  })

  try {
    const res = await getPublicPkbDocument(id, type, round)
    const payload = res.data || {}
    docState.filename = payload.filename || 'dokumen'
    docState.mime = payload.mime_type || ''
    docState.isPdf =
      docState.mime.includes('pdf') || docState.filename.toLowerCase().endsWith('.pdf')

    if (payload.content_base64) {
      docState.url = URL.createObjectURL(base64ToBlob(payload.content_base64, docState.mime))
    } else {
      docState.error = 'Isi dokumen tidak tersedia.'
    }
  } catch (err) {
    docState.error =
      err.response?.data?.message || 'Dokumen gagal dimuat. Silakan coba lagi atau hubungi HRD.'
  } finally {
    docState.loading = false
  }
}

const closeDocument = () => {
  if (docState.url) {
    URL.revokeObjectURL(docState.url)
  }
  docState.active = false
  docState.loading = false
  docState.error = null
  docState.url = ''
  docState.filename = ''
  docState.mime = ''
  docState.isPdf = false
}

onMounted(async () => {
  try {
    const res = await getPublicPkbSigner(id)
    data.value = res.data
    if (res.data.signed_at) {
      submitted.value = true
    }
  } catch (err) {
    error.value =
      err.response?.data?.message ||
      'Tautan permintaan tanda tangan PKB tidak valid, sudah kedaluwarsa, atau sudah ditandatangani.'
  } finally {
    loading.value = false
  }
})


const getCanvasCoords = (e) => {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  if (e.touches && e.touches.length > 0) {
    return {
      x: (e.touches[0].clientX - rect.left) * scaleX,
      y: (e.touches[0].clientY - rect.top) * scaleY,
    }
  }
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  }
}

const startDrawing = (e) => {
  isDrawing = true
  ctx = canvasRef.value.getContext('2d')
  ctx.beginPath()
  const coords = getCanvasCoords(e)
  ctx.moveTo(coords.x, coords.y)
}

const draw = (e) => {
  if (!isDrawing) return
  const coords = getCanvasCoords(e)
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#0f172a'
  ctx.lineTo(coords.x, coords.y)
  ctx.stroke()
}

const stopDrawing = () => {
  isDrawing = false
}

const handleTouchStart = (e) => {
  e.preventDefault()
  startDrawing(e)
}

const handleTouchMove = (e) => {
  e.preventDefault()
  draw(e)
}

const clearCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const context = canvas.getContext('2d')
  context.clearRect(0, 0, canvas.width, canvas.height)
  validationError.value = null
}

const isCanvasBlank = () => {
  const canvas = canvasRef.value
  const blank = document.createElement('canvas')
  blank.width = canvas.width
  blank.height = canvas.height
  return canvas.toDataURL() === blank.toDataURL()
}

const submitSignature = async () => {
  validationError.value = null

  if (isCanvasBlank()) {
    validationError.value =
      'Kesalahan: Harap coretkan tanda tangan Anda pada kolom yang disediakan.'
    return
  }

  const confirmed = await askConfirmation({
    title: 'Persetujuan PKB Internal',
    message: 'Apakah Anda yakin telah meninjau seluruh dokumen dan menyetujui PKB ini?',
    warningTitle: 'PENTING:',
    warningMessage:
      'Tindakan ini bersifat final. Tanda tangan digital Anda akan dicatat pada sistem HRIS sebagai bukti persetujuan dokumen PKB ini.',
    checkboxLabel:
      'Saya telah meninjau CV, hasil wawancara, case study, dan reference check kandidat.',
    confirmLabel: 'Ya, Setujui',
    cancelLabel: 'Batal',
    variant: 'structured',
    color: 'primary',
  })
  if (!confirmed) return

  submitting.value = true
  const signatureData = canvasRef.value.toDataURL('image/png')

  try {
    await submitPublicPkbSignature(id, { signature_data: signatureData })
    submitted.value = true
  } catch (err) {
    validationError.value =
      err.response?.data?.message || 'Gagal mengirim persetujuan. Silakan coba kembali.'
  } finally {
    submitting.value = false
  }
}

onBeforeUnmount(() => {
  if (docState.url) {
    URL.revokeObjectURL(docState.url)
  }
})
</script>


<style scoped>
.public-portal-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  font-family: 'Outfit', 'Inter', sans-serif;
  padding: 40px 20px;
}

.portal-card {
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  padding: 40px;
  width: 100%;
  max-width: 850px;
  color: #1e293b;
}

.portal-card--wide {
  max-width: 1180px;
}

.portal-header {
  text-align: center;
  margin-bottom: 30px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 20px;
}

.logo-placeholder {
  font-size: 20px;
  font-weight: 800;
  color: #3b82f6;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 10px;
}

h1 {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 10px;
  color: #0f172a;
}

.subtitle {
  color: #64748b;
  font-size: 15px;
  margin-top: 4px;
}

.highlight {
  color: #3b82f6;
  font-weight: 600;
}

.pkb-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

.details-panel h2,
.signature-form-panel h2,
.signature-panel h2 {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 15px;
}

.pkb-table {
  width: 100%;
  border-collapse: collapse;
}

.pkb-table th {
  text-align: left;
  padding: 12px;
  font-weight: 600;
  color: #475569;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 14px;
  width: 45%;
}

.pkb-table td {
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
  color: #1f2937;
  font-size: 14px;
}

.salary {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.highlight-salary {
  color: #2563eb;
  font-weight: 700;
}

.signature-form-panel,
.signature-panel {
  display: flex;
  flex-direction: column;
}

.sign-inst {
  font-size: 13px;
  line-height: 1.5;
  color: #64748b;
  margin-bottom: 15px;
}

.canvas-wrapper {
  position: relative;
  background: #ffffff;
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  padding: 10px;
  margin-bottom: 20px;
  text-align: center;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
}

.sig-canvas {
  background: #ffffff;
  display: block;
  margin: 0 auto;
  cursor: crosshair;
  touch-action: none;
  max-width: 100%;
}


.clear-btn {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: #e2e8f0;
  border: none;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: #cbd5e1;
}

.validation-warning {
  background: #fef2f2;
  border: 1px solid #fca5a5;
  color: #b91c1c;
  padding: 10px;
  border-radius: 8px;
  font-size: 12px;
  margin-bottom: 15px;
}

.submit-btn {
  display: inline-block;
  text-align: center;
  padding: 14px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.submit-btn:hover:not(:disabled) {
  background: #2563eb;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-state,
.error-state,
.success-state {
  text-align: center;
  padding: 40px 20px;
}

.spinner {
  border: 4px solid rgba(59, 130, 246, 0.1);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border-left-color: #3b82f6;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px auto;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.status-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 30px;
  margin: 0 auto 20px auto;
}

.status-icon--success {
  background: #10b981;
  color: white;
}

.status-icon--error {
  background: #fee2e2;
  color: #dc2626;
}

.success-state h2 {
  font-size: 24px;
  margin-bottom: 10px;
  color: #0f172a;
}

/* Review layout */
.review-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 28px;
  align-items: start;
}

.review-content {
  min-width: 0;
}

.review-note {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: #f0f7ff;
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 12.5px;
  line-height: 1.55;
  color: #1e40af;
  margin-bottom: 18px;
}

.review-note .info-box-icon {
  color: #2563eb;
}

.signature-panel .sign-inst,
.signature-form-panel .sign-inst {
  background: #f0f7ff !important;
  border: 1px solid #bfdbfe !important;
  border-radius: 12px !important;
  padding: 12px 14px !important;
  color: #1e40af !important;
  font-size: 12.5px !important;
  line-height: 1.55 !important;
}

.signature-panel .sign-inst .info-box-icon,
.signature-form-panel .sign-inst .info-box-icon {
  color: #2563eb;
}

.review-tabs {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  border-bottom: 1.5px solid #e2e8f0;
  padding-bottom: 0;
  margin-bottom: 22px;
}

.review-tabs::-webkit-scrollbar {
  display: none;
}

.review-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 10px 12px 11px;
  border: 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -1.5px;
  border-radius: 8px 8px 0 0;
  background: transparent;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 0.16s ease,
    background 0.16s ease,
    border-color 0.16s ease;
}

.review-tab:hover {
  color: #0f172a;
  background: #f8fafc;
}

.review-tab.is-active {
  color: #2563eb;
  border-bottom-color: #2563eb;
  background: transparent;
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 19px;
  height: 19px;
  padding: 0 6px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
}

.review-tab.is-active .tab-count {
  background: #dbeafe;
  color: #1d4ed8;
}

.tab-panel h2 {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 14px;
}

.section-gap {
  margin-top: 26px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.section-heading h2,
.section-heading h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
}


.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.metric-grid--compact {
  margin-bottom: 16px;
}

.metric-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-label {
  font-size: 11.5px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.metric-value {
  font-size: 20px;
  font-weight: 800;
  color: #1d4ed8;
}

.metric-value--text {
  font-size: 15px;
  line-height: 1.35;
}

.metric-hint {
  font-size: 11.5px;
  color: #94a3b8;
}

.panel-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 14px;
}

.meta-line {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 10px;
}

.text-summary {
  white-space: pre-wrap;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px;
  font-size: 13.5px;
  line-height: 1.6;
  color: #334155;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.meta-grid > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.meta-label {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.meta-grid strong {
  font-size: 13px;
  color: #1e293b;
  word-break: break-word;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
}

.status-pill--success {
  background: #d1fae5;
  color: #047857;
}

.status-pill--waiting {
  background: #fef3c7;
  color: #b45309;
}

.recap-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.recap-row > div {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recap-row span {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}

.recap-row strong {
  font-size: 15px;
  color: #1d4ed8;
}

.doc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 10px;
}

.doc-actions--left {
  justify-content: flex-start;
}

.doc-action-btn {
  padding: 9px 14px;
  border-radius: 9px;
  border: 1px solid #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;
}

.doc-action-btn:hover {
  background: #dbeafe;
  border-color: #60a5fa;
}

.doc-action-btn--primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}

.doc-action-btn--primary:hover {
  background: #1d4ed8;
}


.document-card {
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
  padding: 16px;
}

.document-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: #dbeafe;
  color: #1d4ed8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.document-info {
  flex: 1;
  min-width: 0;
}

.document-info strong {
  display: block;
  font-size: 13.5px;
  color: #0f172a;
  word-break: break-word;
}

.document-info p {
  font-size: 12.5px;
  color: #64748b;
  margin-top: 3px;
  line-height: 1.5;
}

.empty-inline {
  color: #b45309 !important;
}

.evaluation-detail {
  border-top: 1px solid #e2e8f0;
  margin-top: 12px;
  padding-top: 10px;
}

.evaluation-detail summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  list-style: none;
}

.evaluation-detail summary::-webkit-details-marker {
  display: none;
}

.evaluation-name {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  flex: 1;
  min-width: 140px;
}

.evaluation-score {
  font-size: 12px;
  font-weight: 700;
  color: #1d4ed8;
  background: #eff6ff;
  border-radius: 6px;
  padding: 3px 8px;
}

.evaluation-recommendation {
  font-size: 11.5px;
  font-weight: 700;
  color: #047857;
}

.aspect-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  font-size: 12.5px;
}

.aspect-table td {
  padding: 7px 8px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  vertical-align: top;
}

.aspect-table td:last-child {
  text-align: right;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
  width: 90px;
}

.aspect-table--answers td:first-child {
  width: 38%;
  color: #64748b;
  font-weight: 600;
}

.aspect-table--answers td:last-child {
  text-align: left;
  white-space: pre-wrap;
  width: auto;
  word-break: break-word;
}

.notes-box {
  margin-top: 10px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 9px;
  padding: 10px 12px;
  font-size: 12.5px;
  color: #78350f;
}

.notes-box p {
  margin-top: 4px;
  white-space: pre-wrap;
  line-height: 1.55;
}

.reference-card summary {
  list-style: none;
  cursor: pointer;
}

.reference-card summary::-webkit-details-marker {
  display: none;
}

.reference-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.reference-summary strong {
  display: block;
  font-size: 13.5px;
  color: #0f172a;
}

.reference-role {
  display: block;
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.empty-state {
  font-size: 13px;
  color: #64748b;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  padding: 14px;
  line-height: 1.55;
}

.signature-panel {
  position: sticky;
  top: 24px;
  background: #ffffff;
  border: 1px solid var(--public-border, rgba(15, 23, 42, 0.08));
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 10px 24px -18px rgba(15, 23, 42, 0.35);
}

.signature-panel h2 {
  margin: 0 0 16px;
  padding: 0 0 12px;
  font-size: 15px;
  font-weight: 800;
  color: var(--public-ink, #0f172a);
  border-bottom: 1px solid var(--public-border, rgba(15, 23, 42, 0.08));
}

.signature-panel .sig-canvas {
  width: 100%;
  max-width: 100%;
  height: 170px;
}

.sign-note {
  margin-top: 10px;
  font-size: 11px;
  line-height: 1.5;
  color: #94a3b8;
  text-align: center;
}


.doc-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.doc-modal-card {
  background: #ffffff;
  border-radius: 14px;
  width: min(920px, 100%);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 60px -16px rgba(0, 0, 0, 0.45);
}

.doc-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid #e2e8f0;
}

.doc-modal-header h3 {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.doc-modal-close {
  border: none;
  background: #f1f5f9;
  color: #475569;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.doc-modal-close:hover {
  background: #e2e8f0;
}

.doc-modal-body {
  padding: 16px;
  overflow-y: auto;
}

.doc-modal-body :deep(.vue-pdf-embed) {
  max-width: 100%;
}

.doc-modal-body :deep(canvas) {
  max-width: 100%;
  height: auto !important;
}

.doc-modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.doc-modal-actions .download-link-btn {
  width: auto;
}

.download-link-btn {
  display: inline-block;
  padding: 10px 16px;
  border-radius: 9px;
  border: 1px solid #2563eb;
  color: #1d4ed8;
  background: #eff6ff;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.download-link-btn:hover {
  background: #dbeafe;
}

.non-pdf-card {
  text-align: center;
  padding: 30px 16px;
  color: #475569;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.non-pdf-card .submit-btn {
  max-width: 340px;
}

@media (max-width: 1024px) {
  .review-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .signature-panel {
    position: static;
  }
}

@media (max-width: 768px) {
  .public-portal-container {
    padding: 16px 12px;
  }

  .portal-card {
    padding: 24px 16px;
  }

  h1 {
    font-size: 20px;
  }

  .pkb-layout {
    grid-template-columns: 1fr;
  }

  .metric-grid,
  .meta-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .recap-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .section-heading,
  .reference-summary {
    flex-wrap: wrap;
    gap: 8px;
  }

  .review-tabs {
    gap: 2px;
    margin: 0 -4px 18px;
    padding: 0 4px;
  }

  .review-tab {
    padding: 9px 10px 10px;
    font-size: 12.5px;
  }

  .tab-panel h2 {
    font-size: 16px;
  }

  .panel-card {
    padding: 14px;
  }

  .document-card {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 14px;
  }

  .doc-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .doc-action-btn {
    width: 100%;
    text-align: center;
  }

  .aspect-table--answers td {
    display: block;
    width: 100% !important;
    padding: 4px 0;
  }

  .aspect-table--answers td:first-child {
    padding-top: 10px;
    padding-bottom: 2px;
    border-bottom: 0;
    font-size: 11.5px;
  }

  .aspect-table--answers td:last-child {
    padding-top: 2px;
    padding-bottom: 10px;
    font-size: 13px;
  }

  .signature-panel {
    padding: 16px;
  }

  .signature-panel .sig-canvas {
    height: 180px;
  }

  .doc-modal {
    padding: 8px;
  }

  .doc-modal-card {
    max-height: 94vh;
    border-radius: 14px;
  }

  .doc-modal-header {
    padding: 12px 14px;
  }

  .doc-modal-header h3 {
    font-size: 14px;
  }

  .doc-modal-close {
    flex-shrink: 0;
  }

  .doc-modal-body {
    padding: 12px;
  }

  .doc-modal-actions .download-link-btn {
    width: 100%;
  }
}

@media (max-width: 420px) {
  .recap-row {
    grid-template-columns: 1fr;
  }
}
</style>

