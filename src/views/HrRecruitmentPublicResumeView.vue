<template>
  <div class="public-portal-container">
    <div class="portal-card" :class="{ 'preview-mode': pdfUrl, 'portal-card--compact': !pdfUrl }">
      <div class="portal-header">
        <img src="/hompimplay_icon.png" alt="Logo" class="brand-logo-public" />
        <div class="logo-placeholder">HRIS Portal</div>
        <h1>Pratinjau CV Kandidat</h1>
        <p class="subtitle" v-if="pdfUrl">Berkas CV / Resume pelamar untuk proses wawancara.</p>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Memuat dokumen CV...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <div class="status-icon status-icon--error">
          <span class="i-lucide-circle-alert"></span>
        </div>
        <h2>CV Tidak Dapat Dibuka</h2>
        <p>{{ error }}</p>
        <button type="button" @click="resetForm" class="submit-btn mt-4">Coba Lagi</button>
      </div>

      <form v-else-if="!pdfUrl" class="access-form" @submit.prevent="handleUnlock">
        <div class="access-instructions">
          <span class="i-lucide-info info-box-icon"></span>
          Masukkan password CV (default: 123456) yang tercantum pada pesan undangan untuk membuka
          dokumen CV kandidat.
        </div>
        <label for="cv-password">Password CV</label>
        <input
          id="cv-password"
          v-model="password"
          type="password"
          placeholder="Masukkan password"
          required
        />
        <div v-if="passwordError" class="validation-warning">{{ passwordError }}</div>
        <button type="submit" class="submit-btn" :disabled="loading || !password.trim()">
          Buka Dokumen CV
        </button>
      </form>

      <div v-else class="pdf-preview-container">
        <iframe :src="pdfUrl" class="pdf-iframe"></iframe>
        <div class="actions-panel mt-4">
          <a :href="pdfUrl" download="Resume-Kandidat.pdf" class="download-link-btn">
            Unduh Berkas CV (PDF)
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { getPublicResumeByEvaluationToken } from '../services/hrService'

const route = useRoute()
const token = route.params.token

const loading = ref(false)
const error = ref(null)
const password = ref('')
const passwordError = ref(null)
const pdfUrl = ref(null)

const resetForm = () => {
  error.value = null
  passwordError.value = null
  password.value = ''
  if (pdfUrl.value) {
    URL.revokeObjectURL(pdfUrl.value)
    pdfUrl.value = null
  }
}

const handleUnlock = async () => {
  passwordError.value = null
  loading.value = true
  try {
    const res = await getPublicResumeByEvaluationToken(token, {
      password: password.value,
    })

    // Decode base64 to PDF blob
    const byteCharacters = atob(res.data.content_base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'application/pdf' })
    pdfUrl.value = URL.createObjectURL(blob)
  } catch (err) {
    if (err.response?.status === 403) {
      passwordError.value = 'Password tidak valid. Silakan coba kembali.'
    } else {
      error.value =
        'CV tidak dapat dibuka. Berkas mungkin tidak tersedia atau tautan sudah kedaluwarsa. Silakan hubungi HRD.'
    }
  } finally {
    loading.value = false
  }
}

onUnmounted(() => {
  if (pdfUrl.value) {
    URL.revokeObjectURL(pdfUrl.value)
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
  max-width: 900px;
  width: 90vw;
  height: 90vh;
  display: flex;
  flex-direction: column;
}

.portal-header {
  text-align: center;
  margin-bottom: 25px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 15px;
}

.logo-placeholder {
  font-size: 18px;
  font-weight: 800;
  color: #3b82f6;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 8px;
}

h1 {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #0f172a;
}

.subtitle {
  color: #64748b;
  font-size: 13px;
}

.access-form {
  display: flex;
  flex-direction: column;
}

.access-instructions {
  margin-bottom: 20px;
  padding: 12px;
  border-left: 4px solid #3b82f6;
  border-radius: 6px;
  background: #eff6ff;
  color: #1e40af;
  font-size: 13px;
  line-height: 1.5;
}

.access-form label {
  margin-bottom: 6px;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
}

.access-form input {
  margin-bottom: 15px;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  outline: none;
  font-size: 15px;
  text-align: center;
}

.access-form input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.validation-warning {
  background: #fef2f2;
  border: 1px solid #fca5a5;
  color: #b91c1c;
  padding: 10px;
  border-radius: 8px;
  font-size: 12px;
  margin-bottom: 15px;
  text-align: center;
}

.submit-btn {
  padding: 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-btn:hover {
  background: #2563eb;
}

.pdf-preview-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.pdf-iframe {
  flex: 1;
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
}

.actions-panel {
  display: flex;
  justify-content: center;
}

.download-link-btn {
  display: inline-block;
  padding: 12px 24px;
  background: #10b981;
  color: white;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.2s ease;
}

.download-link-btn:hover {
  background: #059669;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 30px 10px;
}

.spinner {
  border: 4px solid rgba(59, 130, 246, 0.1);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: #3b82f6;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px auto;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error-icon {
  font-size: 40px;
  margin-bottom: 10px;
}

.mt-4 {
  margin-top: 16px;
}
</style>
