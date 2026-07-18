<template>
  <div class="public-portal-container">
    <div class="portal-card" :class="{ 'portal-card--compact': loading || error || submitted || !unlocked }">
      <div class="portal-header">
        <img src="/hompimplay_icon.png" alt="Logo" class="brand-logo-public" />
        <div class="logo-placeholder">HRIS Portal</div>
        <h1>Formulir Onboarding Mandiri Karyawan Baru</h1>
        <p class="subtitle" v-if="candidate">
          Selamat datang, <span class="highlight">{{ candidate.name }}</span>! Silakan lengkapi biodata Anda di bawah ini.
        </p>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Memuat formulir onboarding...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <div class="status-icon status-icon--error"><span class="i-lucide-circle-alert"></span></div>
        <h2>Formulir Tidak Tersedia</h2>
        <p>{{ error }}</p>
      </div>

      <div v-else-if="submitted" class="success-state">
        <div class="status-icon status-icon--success"><span class="i-lucide-check"></span></div>
        <h2>Onboarding Selesai</h2>
        <p>Terima kasih. Seluruh data pribadi Anda telah berhasil disimpan dan didaftarkan pada sistem database karyawan.</p>
        <p class="follow-up">HRD kami akan segera memproses detail akun Anda.</p>
      </div>

      <!-- Password Lock Screen -->
      <div v-else-if="!unlocked" class="lock-screen">
        <div class="status-icon status-icon--info"><span class="i-lucide-lock-keyhole"></span></div>
        <h2>Formulir Terkunci</h2>
        <p class="lock-desc">Silakan masukkan kode sandi 6-digit yang dikirimkan dalam email undangan onboarding Anda untuk membuka formulir.</p>
        
        <form @submit.prevent="unlockForm" class="lock-form">
          <input 
            v-model="password" 
            type="text" 
            maxlength="6" 
            placeholder="KODE SANDI 6-DIGIT" 
            required 
            class="password-input"
          />
          <button type="submit" class="unlock-btn">Buka Formulir</button>
          <p v-if="lockError" class="lock-error">{{ lockError }}</p>
        </form>
      </div>

      <!-- Onboarding Form -->
      <form v-else @submit.prevent="handleSubmit" class="portal-form">
        <!-- Section 1: Data Diri Utama -->
        <div class="form-section">
          <h2>1. Data Pribadi Utama</h2>
          
          <div class="form-grid">
            <div class="form-group">
              <label>Nama Lengkap <span class="required">*</span></label>
              <input v-model="form.nama_karyawan" type="text" required />
            </div>

            <div class="form-group">
              <label>Email <span class="required">*</span></label>
              <input v-model="form.email" type="email" required />
            </div>

            <div class="form-group">
              <label>Nomor Telepon/HP <span class="required">*</span></label>
              <input v-model="form.no_hp" type="text" required />
            </div>

            <div class="form-group">
              <label>No. KTP / NIK KTP <span class="required">*</span></label>
              <input v-model="form.no_ktp" type="text" required />
            </div>

            <div class="form-group">
              <label>Tempat Lahir <span class="required">*</span></label>
              <input v-model="form.tempat_lahir" type="text" required />
            </div>

            <div class="form-group">
              <label>Tanggal Lahir <span class="required">*</span></label>
              <input v-model="form.tanggal_lahir" type="date" required />
            </div>

            <div class="form-group">
              <label>Jenis Kelamin <span class="required">*</span></label>
              <select v-model="form.jenis_kelamin" required>
                <option value="">Pilih Jenis Kelamin</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            <div class="form-group">
              <label>Agama <span class="required">*</span></label>
              <input v-model="form.agama" type="text" required placeholder="Islam, Kristen, dll." />
            </div>

            <div class="form-group">
              <label>Kewarganegaraan <span class="required">*</span></label>
              <input v-model="form.kewarganegaraan" type="text" required />
            </div>

            <div class="form-group">
              <label>Status Pernikahan <span class="required">*</span></label>
              <select v-model="form.status_pernikahan" required>
                <option value="">Pilih Status</option>
                <option value="Belum Menikah">Belum Menikah</option>
                <option value="Menikah">Menikah</option>
                <option value="Janda/Duda">Janda/Duda</option>
              </select>
            </div>

            <div class="form-group">
              <label>Golongan Darah <span class="required">*</span></label>
              <select v-model="form.golongan_darah" required>
                <option value="">Pilih Golongan Darah</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="AB">AB</option>
                <option value="O">O</option>
              </select>
            </div>
          </div>

          <div class="form-group full-width" style="margin-top: 15px;">
            <label>Alamat Lengkap (Sesuai KTP) <span class="required">*</span></label>
            <textarea v-model="form.alamat" required rows="3"></textarea>
          </div>
        </div>

        <div v-if="form.status_pernikahan === 'Menikah'" class="form-section">
          <h2>2. Data Pasangan & Anak</h2>
          <div class="form-grid">
            <div class="form-group">
              <label>Nama Pasangan <span class="required">*</span></label>
              <input v-model="form.nama_pasangan" type="text" maxlength="150" required />
            </div>

            <div class="form-group">
              <label>Jumlah Anak <span class="required">*</span></label>
              <input
                v-model.number="form.jumlah_anak"
                type="number"
                min="0"
                max="20"
                required
              />
              <small class="field-hint">Isi 0 jika belum memiliki anak.</small>
            </div>
          </div>

          <div v-if="form.children.length" class="children-grid">
            <div v-for="(_, index) in form.children" :key="index" class="form-group">
              <label>Nama Anak Ke-{{ index + 1 }} <span class="required">*</span></label>
              <input v-model="form.children[index]" type="text" maxlength="150" required />
            </div>
          </div>
        </div>

        <!-- Section 2: Administrasi Keuangan -->
        <div class="form-section">
          <h2>{{ form.status_pernikahan === 'Menikah' ? '3' : '2' }}. Administrasi & Keuangan</h2>
          <div class="form-grid">
            <div class="form-group">
              <label>Nomor NPWP <span class="optional">(Opsional)</span></label>
              <input v-model="form.no_npwp" type="text" />
            </div>

            <div class="form-group">
              <label>Nomor BPJS (Kesehatan/Ketenagakerjaan) <span class="optional">(Opsional)</span></label>
              <input v-model="form.no_bpjs" type="text" />
            </div>

            <div class="form-group">
              <label>Nama Bank <span class="required">*</span></label>
              <input v-model="form.bank" type="text" required placeholder="BCA, Mandiri, BNI, dll." />
            </div>

            <div class="form-group">
              <label>Nomor Rekening <span class="required">*</span></label>
              <input v-model="form.no_rekening" type="text" required />
            </div>
          </div>
        </div>

        <!-- Section 3: Latar Belakang Pendidikan -->
        <div class="form-section">
          <h2>{{ form.status_pernikahan === 'Menikah' ? '4' : '3' }}. Riwayat Pendidikan Terakhir</h2>
          <div class="form-grid">
            <div class="form-group">
              <label>Pendidikan Terakhir <span class="required">*</span></label>
              <select v-model="form.pendidikan_terakhir" required>
                <option value="">Pilih Pendidikan</option>
                <option value="SMA/SMK">SMA/SMK</option>
                <option value="D3">D3</option>
                <option value="S1">S1</option>
                <option value="S2">S2</option>
                <option value="S3">S3</option>
              </select>
            </div>

            <div class="form-group">
              <label>Nama Institusi / Universitas <span class="required">*</span></label>
              <input v-model="form.nama_institusi" type="text" required />
            </div>

            <div class="form-group">
              <label>Jurusan <span class="required">*</span></label>
              <input v-model="form.jurusan" type="text" required />
            </div>
          </div>
        </div>

        <!-- Section 4: Data Orang Tua -->
        <div class="form-section">
          <h2>{{ form.status_pernikahan === 'Menikah' ? '5' : '4' }}. Nama Orang Tua Kandung</h2>
          <div class="form-grid">
            <div class="form-group">
              <label>Nama Ayah Kandung <span class="required">*</span></label>
              <input v-model="form.nama_ayah" type="text" required />
            </div>

            <div class="form-group">
              <label>Nama Ibu Kandung <span class="required">*</span></label>
              <input v-model="form.nama_ibu" type="text" required />
            </div>
          </div>
        </div>

        <!-- Section 5: Kontak Darurat -->
        <div class="form-section">
          <h2>{{ form.status_pernikahan === 'Menikah' ? '6' : '5' }}. Hubungan Kontak Darurat</h2>
          <div class="form-grid">
            <div class="form-group">
              <label>Nama Kontak Darurat <span class="required">*</span></label>
              <input v-model="form.kontak_darurat_nama" type="text" required />
            </div>

            <div class="form-group">
              <label>Hubungan <span class="required">*</span></label>
              <input v-model="form.kontak_darurat_hubungan" type="text" required placeholder="Orang Tua, Pasangan, Saudara, dll." />
            </div>

            <div class="form-group">
              <label>No. HP Kontak Darurat <span class="required">*</span></label>
              <input v-model="form.kontak_darurat_no_hp" type="text" required />
            </div>
          </div>
        </div>

        <div class="declaration-checkbox-group">
          <label class="declaration-label">
            <input 
              v-model="declarationChecked" 
              type="checkbox" 
              required 
            />
            <span>Saya menyatakan dengan sebenar-benarnya bahwa seluruh data dan dokumen yang saya isi dalam formulir ini adalah lengkap, akurat, dan sesuai dengan berkas aslinya.</span>
          </label>
        </div>

        <div v-if="validationError" class="validation-warning">
          {{ validationError }}
        </div>

        <button type="submit" class="submit-btn" :disabled="submitting || !declarationChecked">
          {{ submitting ? 'Mengirim data onboarding...' : 'Kirim Data Onboarding' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getPublicOnboarding, submitPublicOnboarding } from '../services/hrService'

const route = useRoute()
const token = route.params.token

const loading = ref(true)
const submitting = ref(false)
const submitted = ref(false)
const unlocked = ref(false)
const error = ref(null)
const validationError = ref(null)
const lockError = ref(null)
const declarationChecked = ref(false)

const candidate = ref(null)
const password = ref('')

const form = reactive({
  nama_karyawan: '',
  email: '',
  no_hp: '',
  tanggal_lahir: '',
  jenis_kelamin: '',
  alamat: '',
  tempat_lahir: '',
  no_ktp: '',
  agama: '',
  kewarganegaraan: 'Indonesia',
  status_pernikahan: '',
  golongan_darah: '',
  nama_pasangan: '',
  jumlah_anak: 0,
  children: [],
  no_npwp: '',
  no_bpjs: '',
  bank: '',
  no_rekening: '',
  pendidikan_terakhir: '',
  nama_institusi: '',
  jurusan: '',
  nama_ayah: '',
  nama_ibu: '',
  kontak_darurat_nama: '',
  kontak_darurat_hubungan: '',
  kontak_darurat_no_hp: ''
})

watch(
  [() => form.status_pernikahan, () => form.jumlah_anak],
  ([maritalStatus, childCount]) => {
    if (maritalStatus !== 'Menikah') {
      form.nama_pasangan = ''
      form.jumlah_anak = 0
      form.children.splice(0)
      return
    }

    const normalizedCount = Math.min(20, Math.max(0, Number(childCount) || 0))
    if (form.jumlah_anak !== normalizedCount) form.jumlah_anak = normalizedCount

    while (form.children.length < normalizedCount) form.children.push('')
    if (form.children.length > normalizedCount) form.children.splice(normalizedCount)
  },
)

onMounted(async () => {
  try {
    const res = await getPublicOnboarding(token)
    candidate.value = res.data
    
    // Pre-fill default details
    form.nama_karyawan = res.data.name
    form.email = res.data.email
    form.no_hp = res.data.phone || ''
  } catch (err) {
    error.value = 'Formulir onboarding tidak dapat dibuka. Tautan mungkin tidak valid, sudah kedaluwarsa, atau sudah pernah diselesaikan. Silakan hubungi HRD.'
  } finally {
    loading.value = false
  }
})

const unlockForm = () => {
  lockError.value = null
  if (!password.value || password.value.trim().length !== 6) {
    lockError.value = 'Kesalahan: Harap masukkan kode sandi 6-digit dengan lengkap.'
    return
  }
  
  unlocked.value = true
}

const handleSubmit = async () => {
  validationError.value = null
  submitting.value = true
  
  try {
    await submitPublicOnboarding(token, {
      password: password.value,
      ...form
    })
    submitted.value = true
  } catch (err) {
    const fieldErrors = Object.values(err.response?.data?.errors || {}).flat()
    validationError.value = fieldErrors.length
      ? fieldErrors.join(' ')
      : err.response?.data?.message || 'Gagal mengirim biodata. Silakan periksa kembali kolom isian Anda.'
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
  max-width: 900px;
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
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 10px;
  color: #0f172a;
}

.subtitle {
  color: #64748b;
  font-size: 15px;
}

.highlight {
  color: #10b981;
  font-weight: 600;
}

.lock-screen {
  text-align: center;
  padding: 30px 10px;
  max-width: 400px;
  margin: 0 auto;
}

.lock-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.lock-desc {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 25px;
  line-height: 1.5;
}

.password-input {
  width: 100%;
  padding: 14px;
  border: 2px solid #cbd5e1;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 700;
  text-align: center;
  letter-spacing: 4px;
  margin-bottom: 15px;
  text-transform: uppercase;
}

.unlock-btn {
  width: 100%;
  padding: 12px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.unlock-btn:hover {
  background: #059669;
}

.lock-error {
  color: #ef4444;
  font-size: 13px;
  margin-top: 10px;
}

.form-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 30px;
}

.form-section h2 {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 20px;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 10px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

@media (max-width: 600px) {
  .form-grid,
  .children-grid {
    grid-template-columns: 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
}

.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
  color: #475569;
  display: flex;
  align-items: flex-end;
  min-height: 38px;
}

.required {
  color: #ef4444;
}

.optional,
.field-hint {
  color: #64748b;
  font-weight: 400;
}

.field-hint {
  font-size: 12px;
  margin-top: 6px;
}

.children-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-top: 18px;
}

@media (max-width: 600px) {
  .children-grid {
    grid-template-columns: 1fr;
  }
}

input, select, textarea {
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;
  background: #ffffff;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
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
  padding: 16px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
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

.declaration-checkbox-group {
  margin-top: 24px;
  margin-bottom: 20px;
  padding: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  display: flex;
  align-items: flex-start;
}

.declaration-label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  font-size: 13px;
  color: #334155;
  user-select: none;
  line-height: 1.5;
}

.declaration-label input[type="checkbox"] {
  margin-top: 3px;
  cursor: pointer;
  accent-color: #10b981;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
</style>
