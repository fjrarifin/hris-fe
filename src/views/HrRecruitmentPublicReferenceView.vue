<template>
  <div class="public-portal-container">
    <div class="portal-card" :class="{ 'portal-card--compact': !candidate || submitted || error }">
      <div class="portal-header">
        <img src="/hompimplay_icon.png" alt="Logo" class="brand-logo-public" />
        <div class="logo-placeholder">HRIS Portal</div>
        <h1>Referensi Kerja Profesional</h1>
        <p class="subtitle" v-if="candidate">
          Formulir referensi untuk calon kandidat: <span class="highlight">{{ candidate.name }}</span> - Posisi <span class="highlight">{{ candidate.vacancy_title }}</span>
        </p>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Memuat data...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <div class="status-icon status-icon--error"><span class="i-lucide-circle-alert"></span></div>
        <h2>Tautan Tidak Dapat Digunakan</h2>
        <p>{{ error }}</p>
      </div>

      <div v-else-if="submitted" class="success-state">
        <div class="status-icon status-icon--success"><span class="i-lucide-check"></span></div>
        <h2>Terima Kasih</h2>
        <p>Referensi kerja profesional Anda berhasil disimpan. Anda dapat menutup halaman ini sekarang.</p>
      </div>

      <form v-else-if="!candidate" @submit.prevent="handleUnlock" class="portal-form access-form">
        <div class="instructions">
          <span class="i-lucide-info info-box-icon"></span>
          <p>Masukkan password 6 digit yang tercantum pada email permintaan referensi kerja.</p>
        </div>

        <div class="form-group">
          <label for="reference-password">Password Formulir <span class="required">*</span></label>
          <input
            id="reference-password"
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
        </div>

        <div v-if="passwordError" class="validation-warning">
          {{ passwordError }}
        </div>

        <button type="submit" class="submit-btn" :disabled="loading || password.length !== 6">
          {{ loading ? 'Memeriksa...' : 'Buka Formulir' }}
        </button>
      </form>

      <form v-else @submit.prevent="handleSubmit" class="portal-form">
        <div class="instructions">
          <span class="i-lucide-info info-box-icon"></span>
          <p>Silakan isi detail kontak untuk minimal {{ requiredReferenceCount }} ({{ requiredReferenceCount === 2 ? 'dua' : 'tiga' }}) orang referensi kerja profesional yang terpisah (misalnya: mantan atasan, rekan sejawat, atau pihak manajemen di perusahaan sebelumnya).</p>
        </div>

        <div v-for="(ref, index) in form.references" :key="index" class="reference-section">
          <div class="reference-heading">
            <h3>Referensi #{{ index + 1 }}</h3>
            <button
              v-if="form.references.length > requiredReferenceCount"
              type="button"
              class="remove-reference-btn"
              @click="removeReference(index)"
            >
              Hapus
            </button>
          </div>
          
          <div class="form-grid">
            <div class="form-group">
              <label :for="'name-' + index">Nama Lengkap <span class="required">*</span></label>
              <input 
                :id="'name-' + index" 
                v-model="ref.name" 
                type="text" 
                :class="{ 'input-error': getNameError(index) }"
                placeholder="Masukkan nama lengkap" 
                required 
              />
              <span v-if="getNameError(index)" class="field-error">{{ getNameError(index) }}</span>
            </div>

            <div class="form-group">
              <label :for="'phone-' + index">Nomor Telepon/WA <span class="required">*</span></label>
              <input 
                :id="'phone-' + index" 
                v-model="ref.phone" 
                type="tel" 
                :class="{ 'input-error': getPhoneError(index) }"
                placeholder="Contoh: 08123456789" 
                required 
              />
              <span v-if="getPhoneError(index)" class="field-error">{{ getPhoneError(index) }}</span>
            </div>

            <div class="form-group">
              <label :for="'company-' + index">Perusahaan <span class="required">*</span></label>
              <input 
                :id="'company-' + index" 
                v-model="ref.company" 
                type="text" 
                placeholder="Perusahaan tempat bekerja" 
                required 
              />
            </div>

            <div class="form-group">
              <label :for="'position-' + index">Jabatan <span class="required">*</span></label>
              <input 
                :id="'position-' + index" 
                v-model="ref.position" 
                type="text" 
                placeholder="Jabatan terakhir" 
                required 
              />
            </div>

            <div class="form-group">
              <label :for="'relationship-' + index">Hubungan / Tipe Referensi <span class="required">*</span></label>
              <select 
                :id="'relationship-' + index" 
                v-model="ref.relationship" 
                required
              >
                <option value="" disabled>Pilih Hubungan</option>
                <option value="Atasan Langsung">Atasan Langsung (Direct Report/Supervisor)</option>
                <option value="Peer (Rekan Kerja)">Peer (Rekan Kerja)</option>
                <option value="Bawahan">Bawahan (Subordinate)</option>
              </select>
            </div>
          </div>
        </div>

        <button
          v-if="form.references.length < 10"
          type="button"
          class="add-reference-btn"
          @click="addReference"
        >
          + Tambah Referensi
        </button>

        <div v-if="validationError" class="validation-warning">
          {{ validationError }}
        </div>

        <button type="submit" class="submit-btn" :disabled="submitting">
          {{ submitting ? 'Mengirim data...' : 'Simpan Referensi Kerja' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { getPublicReferenceCheck, submitPublicReferenceCheck } from '../services/hrService'

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
const requiredReferenceCount = ref(2)

const form = reactive({
  references: []
})

const emptyReference = () => ({ name: '', phone: '', company: '', position: '', relationship: '' })
const addReference = () => form.references.push(emptyReference())
const removeReference = (index) => form.references.splice(index, 1)

const handleUnlock = async () => {
  passwordError.value = null
  loading.value = true

  try {
    const res = await getPublicReferenceCheck(token, password.value)
    if (res.data.reference_check_submitted) {
      submitted.value = true
      return
    }
    candidate.value = res.data
    requiredReferenceCount.value = res.data.required_reference_count
    form.references = Array.from({ length: requiredReferenceCount.value }, emptyReference)
  } catch (err) {
    if (err.response?.status === 403 || err.response?.status === 422) {
      passwordError.value = 'Password tidak valid. Periksa kembali 6 digit angka pada email.'
    } else {
      error.value = 'Tautan referensi tidak valid, sudah kedaluwarsa, atau sudah pernah diisi.'
    }
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  validationError.value = null
  
  // Validate that all names and phones are distinct
  const names = form.references.map(r => r.name.trim().toLowerCase())
  const phones = form.references.map(r => r.phone.trim())
  
  const uniqueNames = new Set(names)
  const uniquePhones = new Set(phones)
  
  if (uniqueNames.size !== form.references.length) {
    validationError.value = 'Kesalahan: Masing-masing nama referensi harus diisi dengan nama individu yang berbeda.'
    return
  }
  
  if (uniquePhones.size !== form.references.length) {
    validationError.value = 'Kesalahan: Masing-masing nomor telepon referensi harus berbeda.'
    return
  }

  submitting.value = true
  try {
    await submitPublicReferenceCheck(token, {
      password: password.value,
      references: form.references,
    })
    submitted.value = true
  } catch (err) {
    validationError.value = err.response?.data?.message || 'Gagal mengirim data. Silakan coba kembali.'
  } finally {
    submitting.value = false
  }
}

const getPhoneError = (index) => {
  const phone = form.references[index]?.phone?.trim()
  if (!phone) return null
  const duplicates = form.references.filter((r, idx) => idx !== index && r.phone?.trim() === phone)
  if (duplicates.length > 0) {
    return 'Nomor telepon ini duplikat dengan referensi lain.'
  }
  return null
}

const getNameError = (index) => {
  const name = form.references[index]?.name?.trim()?.toLowerCase()
  if (!name) return null
  const duplicates = form.references.filter((r, idx) => idx !== index && r.name?.trim()?.toLowerCase() === name)
  if (duplicates.length > 0) {
    return 'Nama ini duplikat dengan referensi lain.'
  }
  return null
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
  max-width: 800px;
  color: #1e293b;
}

.portal-header {
  text-align: center;
  margin-bottom: 30px;
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
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 10px;
  color: #0f172a;
}

.subtitle {
  color: #64748b;
  font-size: 15px;
}

.highlight {
  color: #3b82f6;
  font-weight: 600;
}

.instructions {
  background: #eff6ff;
  border-left: 4px solid #3b82f6;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 25px;
  font-size: 14px;
  line-height: 1.5;
  color: #1e3a8a;
}

.access-form {
  max-width: 420px;
  margin: 0 auto;
}

.access-form .form-group {
  margin-bottom: 20px;
}

.access-form input {
  text-align: center;
  font-size: 22px;
  letter-spacing: 6px;
}

.reference-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 25px;
}

.reference-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 15px;
  padding-bottom: 8px;
}

.reference-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.remove-reference-btn {
  border: 0;
  background: transparent;
  color: #dc2626;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

.add-reference-btn {
  width: 100%;
  margin: -5px 0 20px;
  padding: 11px;
  border: 1px dashed #3b82f6;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
  cursor: pointer;
  font-weight: 600;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

@media (max-width: 600px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
}

label {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
  color: #475569;
}

.required {
  color: #ef4444;
}

input, select {
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;
  background-color: white;
}

input:focus, select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.validation-warning {
  background: #fef2f2;
  border: 1px solid #fca5a5;
  color: #b91c1c;
  padding: 12px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 20px;
  text-align: center;
}

.submit-btn {
  width: 100%;
  padding: 14px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
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
  border: 4px solid rgba(59, 130, 246, 0.1);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border-left-color: #3b82f6;
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

.field-error {
  color: #ef4444;
  font-size: 11px;
  margin-top: 5px;
  font-weight: 500;
  text-align: left;
}

.input-error {
  border-color: #fca5a5 !important;
  background-color: #fef2f2 !important;
}
</style>
