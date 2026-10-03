<template>
  <div class="public-portal-container">
    <div class="portal-card" :class="{ 'preview-mode': summaryData, 'portal-card--compact': !summaryData }">
      <div class="portal-header">
        <img src="/hompimplay_icon.png" alt="Logo" class="brand-logo-public" />
        <div class="logo-placeholder">HRIS Portal</div>
        <h1>Hasil Summary HR</h1>
        <p class="subtitle" v-if="summaryData">
          Rangkuman hasil wawancara & screening awal oleh tim HRD untuk {{ summaryData.candidate_name }} ({{ summaryData.vacancy_title }}).
        </p>
        <p class="subtitle" v-else>
          Masukkan password untuk membuka hasil summary wawancara HR kandidat.
        </p>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Memuat dokumen summary HR...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <div class="status-icon status-icon--error">
          <span class="i-lucide-circle-alert"></span>
        </div>
        <h2>Summary HR Tidak Dapat Dibuka</h2>
        <p>{{ error }}</p>
        <button type="button" @click="resetForm" class="submit-btn mt-4">Coba Lagi</button>
      </div>

      <form v-else-if="!summaryData" class="access-form" @submit.prevent="handleUnlock">
        <div class="access-instructions">
          <span class="i-lucide-info info-box-icon"></span>
          Masukkan password Summary HR (default: 123456) yang tercantum pada pesan undangan wawancara.
        </div>
        <label for="hr-password">Password Summary HR</label>
        <input
          id="hr-password"
          v-model="password"
          type="password"
          placeholder="Masukkan password"
          required
        />
        <div v-if="passwordError" class="validation-warning">{{ passwordError }}</div>
        <button type="submit" class="submit-btn" :disabled="loading || !password.trim()">
          Buka Summary HR
        </button>
      </form>

      <div v-else class="summary-content-container">
        <!-- Candidate Meta Info -->
        <div class="candidate-meta-card">
          <div class="meta-item">
            <span class="meta-label">Nama Kandidat</span>
            <strong class="meta-value">{{ summaryData.candidate_name }}</strong>
          </div>
          <div class="meta-item">
            <span class="meta-label">Posisi Dilamar</span>
            <strong class="meta-value">{{ summaryData.vacancy_title }}</strong>
          </div>
        </div>

        <!-- Text Summary Section -->
        <div v-if="summaryData.text_summary" class="text-summary-card">
          <div class="text-summary-header">
            <span class="i-lucide-file-text header-icon"></span>
            <h3>Catatan & Rangkuman HR</h3>
          </div>
          <div class="text-summary-body">
            {{ summaryData.text_summary }}
          </div>
        </div>

        <!-- Attached File Section -->
        <div v-if="summaryData.has_file" class="file-summary-section">
          <div v-if="isPdf && fileUrl" class="pdf-preview-container">
            <div class="pdf-viewer-scroll">
              <VuePdfEmbed :source="fileUrl" />
            </div>
            <div class="actions-panel mt-4">
              <a :href="fileUrl" :download="summaryData.file?.filename || 'Summary-HR.pdf'" class="download-link-btn">
                Unduh Dokumen Summary (PDF)
              </a>
            </div>
          </div>
          <div v-else class="non-pdf-download-card">
            <div class="file-icon-box">
              <span class="i-lucide-file-text"></span>
            </div>
            <div class="file-details">
              <strong>{{ summaryData.file?.filename || 'Dokumen Summary HR' }}</strong>
              <p>Lampiran berkas summary wawancara HR.</p>
            </div>
            <a v-if="fileUrl" :href="fileUrl" :download="summaryData.file?.filename || 'Summary-HR'" class="download-link-btn">
              Unduh Berkas
            </a>
          </div>
        </div>

        <div v-if="!summaryData.text_summary && !summaryData.has_file" class="empty-summary-note">
          <p>Belum ada catatan tertulis atau berkas lampiran yang diunggah untuk summary HR ini.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import VuePdfEmbed from 'vue-pdf-embed'
import { getPublicHrSummaryByEvaluationToken } from '../services/hrService'

const route = useRoute()
const token = route.params.token

const loading = ref(false)
const error = ref(null)
const password = ref('')
const passwordError = ref(null)
const summaryData = ref(null)
const fileUrl = ref(null)

const isPdf = computed(() => {
  if (!summaryData.value?.file) return false
  const mime = summaryData.value.file.mime_type || ''
  const name = summaryData.value.file.filename || ''
  return mime.includes('pdf') || name.toLowerCase().endsWith('.pdf')
})

const resetForm = () => {
  error.value = null
  passwordError.value = null
  password.value = ''
  summaryData.value = null
  if (fileUrl.value) {
    URL.revokeObjectURL(fileUrl.value)
    fileUrl.value = null
  }
}

const handleUnlock = async () => {
  passwordError.value = null
  loading.value = true
  try {
    const res = await getPublicHrSummaryByEvaluationToken(token, {
      password: password.value,
    })

    summaryData.value = res.data

    if (res.data.has_file && res.data.file?.content_base64) {
      const mime = res.data.file.mime_type || 'application/octet-stream'
      const byteCharacters = atob(res.data.file.content_base64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: mime })
      fileUrl.value = URL.createObjectURL(blob)
    }
  } catch (err) {
    if (err.response?.status === 403) {
      passwordError.value = 'Password tidak valid. Silakan coba kembali.'
    } else if (err.response?.status === 404) {
      error.value = err.response.data?.message || 'Dokumen summary HR belum tersedia untuk kandidat ini.'
    } else {
      error.value =
        'Dokumen tidak dapat dibuka. Berkas mungkin tidak tersedia atau tautan sudah kedaluwarsa. Silakan hubungi HRD.'
    }
  } finally {
    loading.value = false
  }
}

onUnmounted(() => {
  if (fileUrl.value) {
    URL.revokeObjectURL(fileUrl.value)
  }
})
</script>

<style scoped>
.public-portal-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  font-family: 'Outfit', 'Inter', sans-serif;
  padding: 40px 20px;
}

.portal-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  padding: 40px;
  width: 100%;
  max-width: 500px;
  color: #1e293b;
  transition: all 0.3s ease;
}

.portal-card.preview-mode {
  max-width: 860px;
  padding: 32px;
}

.portal-header {
  text-align: center;
  margin-bottom: 24px;
}

.brand-logo-public {
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  display: block;
}

.logo-placeholder {
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #64748b;
  margin-bottom: 6px;
}

.portal-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}

.access-form {
  display: flex;
  flex-direction: column;
}

.access-instructions {
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 20px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.access-form label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 6px;
}

.access-form input {
  padding: 12px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 15px;
  margin-bottom: 12px;
  outline: none;
  transition: border-color 0.2s;
}

.access-form input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.validation-warning {
  color: #dc2626;
  font-size: 13px;
  margin-top: -6px;
  margin-bottom: 12px;
}

.submit-btn {
  background-color: #2563eb;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background-color: #1d4ed8;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.candidate-meta-card {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 20px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}

.meta-value {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.text-summary-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #8b5cf6;
  border-radius: 12px;
  padding: 18px 20px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.text-summary-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.text-summary-header .header-icon {
  font-size: 18px;
  color: #8b5cf6;
}

.text-summary-header h3 {
  font-size: 14px;
  font-weight: 700;
  color: #1e1b4b;
  margin: 0;
}

.text-summary-body {
  font-size: 13.5px;
  line-height: 1.65;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-word;
}

.pdf-preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pdf-viewer-scroll {
  width: 100%;
  max-height: 65vh;
  overflow-y: auto;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  padding: 10px;
}

.non-pdf-download-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 18px 20px;
}

.file-icon-box {
  width: 44px;
  height: 44px;
  background: #e0e7ff;
  color: #4338ca;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 22px;
  flex-shrink: 0;
}

.file-details {
  flex: 1;
  min-width: 0;
}

.file-details strong {
  display: block;
  font-size: 14px;
  color: #0f172a;
  word-break: break-all;
}

.file-details p {
  margin: 2px 0 0 0;
  font-size: 12px;
  color: #64748b;
}

.download-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background-color: #2563eb;
  color: white;
  text-decoration: none;
  font-weight: 600;
  font-size: 13px;
  padding: 10px 18px;
  border-radius: 8px;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.download-link-btn:hover {
  background-color: #1d4ed8;
}

.empty-summary-note {
  padding: 24px;
  text-align: center;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  color: #64748b;
  font-size: 13px;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 30px 0;
}

.spinner {
  border: 3px solid rgba(37, 99, 235, 0.2);
  border-top-color: #2563eb;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.status-icon--error {
  font-size: 40px;
  color: #ef4444;
  margin-bottom: 12px;
}
</style>
