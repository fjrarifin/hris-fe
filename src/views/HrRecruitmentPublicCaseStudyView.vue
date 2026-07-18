<template>
  <div class="public-portal-container">
    <div class="portal-card" :class="{ 'portal-card--compact': !candidate || submitted || error }">
      <div class="portal-header">
        <img src="/hompimplay_icon.png" alt="Logo" class="brand-logo-public" />
        <div class="logo-placeholder">HRIS Portal</div>
        <h1>Pengumpulan Jawaban Case Study</h1>
        <p class="subtitle" v-if="candidate">
          Pengerjaan Case Study untuk: <span class="highlight">{{ candidate.name }}</span> - Posisi <span class="highlight">{{ candidate.vacancy_title }}</span>
        </p>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Memuat informasi case study...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <div class="status-icon status-icon--error"><span class="i-lucide-circle-alert"></span></div>
        <h2>Tautan Tidak Dapat Digunakan</h2>
        <p>{{ error }}</p>
      </div>

      <div v-else-if="submitted" class="success-state">
        <div class="status-icon status-icon--success"><span class="i-lucide-check"></span></div>
        <h2>Jawaban Berhasil Dikirim</h2>
        <p>Terima kasih. Jawaban case study Anda telah berhasil diunggah dan tersimpan dalam sistem kami.</p>
        <p class="follow-up">Tim rekrutmen kami akan segera meninjau hasil pengerjaan Anda.</p>
      </div>

      <form v-else-if="!candidate" class="access-form" @submit.prevent="handleUnlock">
        <div class="access-instructions">
          <span class="i-lucide-info info-box-icon"></span>
          Masukkan PIN 6 digit yang tercantum pada email instruksi Case Study untuk mengakses halaman pengumpulan.
        </div>
        <label for="case-study-password">PIN Case Study</label>
        <input
          id="case-study-password"
          v-model="password"
          type="password"
          inputmode="numeric"
          pattern="[0-9]{6}"
          maxlength="6"
          autocomplete="one-time-code"
          placeholder="6 digit angka"
          @input="password = password.replace(/\D/g, '')"
          required
        />
        <div v-if="passwordError" class="validation-warning">{{ passwordError }}</div>
        <button type="submit" class="submit-btn" :disabled="loading || password.length !== 6">
          {{ loading ? 'Memeriksa...' : 'Buka Halaman Pengumpulan' }}
        </button>
      </form>

      <div v-else class="case-study-layout">
        <!-- Document Submission Panel -->
        <div class="submission-form-panel">
          <div class="warning-alert-box">
            <span class="i-lucide-triangle-alert info-box-icon"></span>
            <span><strong>Penting:</strong> Kirim jawaban hanya setelah Anda benar-benar selesai mengerjakan case study.</span>
          </div>

          <div v-if="candidate.case_study_submitted" class="submitted-badge">
            <span class="badge-icon i-lucide-check"></span> Anda sudah mengunggah jawaban sebelumnya. Anda masih dapat mengunggah berkas baru untuk memperbaruinya.
          </div>

          <div class="form-group">
            <label for="submission-file">Unggah Berkas Jawaban Case Study</label>
            <p class="field-desc">Tipe berkas yang diizinkan: PDF, DOCX, DOC, ZIP, atau RAR (Maks. 15MB)</p>
            <input 
              type="file" 
              id="submission-file" 
              ref="fileInputRef"
              accept=".pdf,.docx,.doc,.zip,.rar"
              class="file-input"
              @change="handleFileChange"
            />
          </div>

          <div v-if="validationError" class="validation-warning">
            {{ validationError }}
          </div>

          <button 
            type="button" 
            @click="submitCaseStudyFile" 
            class="submit-btn w-full mt-6" 
            :disabled="submitting || !selectedFile"
          >
            {{ submitting ? 'Mengunggah jawaban...' : 'Upload & Kirim Jawaban' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { getPublicCaseStudy, submitPublicCaseStudy } from '../services/hrService'

const route = useRoute()
const token = route.params.token

const loading = ref(false)
const submitting = ref(false)
const submitted = ref(false)
const error = ref(null)
const password = ref('')
const passwordError = ref(null)
const validationError = ref(null)
const candidate = ref(null)
const selectedFile = ref(null)
const fileInputRef = ref(null)

const handleUnlock = async () => {
  passwordError.value = null
  loading.value = true
  try {
    const res = await getPublicCaseStudy(token, password.value)
    candidate.value = res.data
    if (res.data.case_study_submitted) {
      submitted.value = true
    }
  } catch (err) {
    if (err.response?.status === 403 || err.response?.status === 422) {
      passwordError.value = 'PIN tidak valid. Periksa kembali 6 digit angka pada email.'
    } else if (err.response?.status === 429) {
      passwordError.value = 'Terlalu banyak percobaan. Tunggu satu menit lalu coba kembali.'
    } else {
      error.value = 'Tautan case study tidak valid atau sudah kedaluwarsa.'
    }
  } finally {
    loading.value = false
  }
}

const handleFileChange = (e) => {
  validationError.value = null
  const file = e.target.files[0]
  if (!file) {
    selectedFile.value = null
    return
  }

  // Validate file size (15MB)
  if (file.size > 15 * 1024 * 1024) {
    validationError.value = 'Kesalahan: Ukuran berkas tidak boleh melebihi 15 MB.'
    selectedFile.value = null
    if (fileInputRef.value) fileInputRef.value.value = ''
    return
  }

  // Validate file type
  const allowedExtensions = ['pdf', 'docx', 'doc', 'zip', 'rar']
  const fileExtension = file.name.split('.').pop().toLowerCase()
  if (!allowedExtensions.includes(fileExtension)) {
    validationError.value = 'Kesalahan: Format berkas tidak diizinkan. Gunakan berkas bertipe: PDF, DOCX, DOC, ZIP, atau RAR.'
    selectedFile.value = null
    if (fileInputRef.value) fileInputRef.value.value = ''
    return
  }

  selectedFile.value = file
}

const submitCaseStudyFile = async () => {
  validationError.value = null
  if (!selectedFile.value) {
    validationError.value = 'Kesalahan: Harap pilih berkas jawaban Anda terlebih dahulu.'
    return
  }

  submitting.value = true
  
  try {
    const formData = new FormData()
    formData.append('password', password.value)
    formData.append('submission', selectedFile.value)

    await submitPublicCaseStudy(token, formData)
    submitted.value = true
    selectedFile.value = null
    if (fileInputRef.value) fileInputRef.value.value = ''
    
    // Refresh candidate state
    const res = await getPublicCaseStudy(token, password.value)
    candidate.value = res.data
  } catch (err) {
    validationError.value = err.response?.data?.message || 'Gagal mengirim berkas jawaban. Silakan coba kembali.'
  } finally {
    submitting.value = false
  }
}
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
  max-width: 600px;
  color: #1e293b;
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
  color: #10b981;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 10px;
}

h1 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 10px;
  color: #0f172a;
}

.subtitle {
  color: #64748b;
  font-size: 14px;
}

.highlight {
  color: #10b981;
  font-weight: 600;
}

.access-form {
  display: flex;
  flex-direction: column;
  max-width: 420px;
  margin: 0 auto;
}

.access-instructions {
  margin-bottom: 20px;
  padding: 14px;
  border-left: 4px solid #10b981;
  border-radius: 6px;
  background: #ecfdf5;
  color: #065f46;
  font-size: 13px;
  line-height: 1.5;
}

.access-form label {
  margin-bottom: 7px;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
}

.access-form input {
  margin-bottom: 15px;
  padding: 12px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  outline: none;
  text-align: center;
  font-size: 22px;
  letter-spacing: 6px;
}

.access-form input:focus {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}

.submission-form-panel {
  display: flex;
  flex-direction: column;
}

.warning-alert-box {
  background-color: #fffbeb;
  border: 1px solid #fef3c7;
  border-left: 4px solid #f59e0b;
  color: #92400e;
  padding: 14px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 20px;
}

.submitted-badge {
  background-color: #ecfdf5;
  border: 1px solid #d1fae5;
  color: #065f46;
  padding: 12px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.badge-icon {
  background-color: #10b981;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 11px;
}

.form-group {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 5px;
}

.field-desc {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 10px;
}

.file-input {
  padding: 12px;
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
  background-color: #f8fafc;
  cursor: pointer;
}

.file-input:focus {
  outline: none;
  border-color: #10b981;
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
  padding: 14px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-btn:hover:not(:disabled) {
  background: #059669;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-state, .error-state, .success-state {
  text-align: center;
  padding: 40px 20px;
}

.spinner {
  border: 4px solid rgba(16, 185, 129, 0.1);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border-left-color: #10b981;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.success-icon {
  background: #10b981;
  color: white;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 32px;
  margin: 0 auto 20px auto;
}

.success-state h2 {
  font-size: 24px;
  margin-bottom: 10px;
  color: #0f172a;
}

.success-state p {
  color: #475569;
  line-height: 1.5;
}

.follow-up {
  font-size: 13px;
  margin-top: 10px;
  font-style: italic;
}

.mt-6 {
  margin-top: 24px;
}
.w-full {
  width: 100%;
}
</style>
