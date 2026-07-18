<template>
  <div class="public-portal-container">
    <div class="portal-card" :class="{ 'portal-card--compact': !candidate || submitted || error }">
      <div class="portal-header">
        <img src="/hompimplay_icon.png" alt="Logo" class="brand-logo-public" />
        <div class="logo-placeholder">HRIS Portal</div>
        <h1>Surat Penawaran Kerja (Offering Letter)</h1>
        <p class="subtitle" v-if="candidate">
          Persetujuan kontrak kerja untuk: <span class="highlight">{{ candidate.name }}</span> -
          Posisi <span class="highlight">{{ candidate.vacancy_title }}</span>
        </p>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Memuat draf surat penawaran...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <div class="status-icon status-icon--error">
          <span class="i-lucide-circle-alert"></span>
        </div>
        <h2>Offering Letter Tidak Tersedia</h2>
        <p>{{ error }}</p>
      </div>

      <div v-else-if="submitted" class="success-state">
        <div class="status-icon status-icon--success"><span class="i-lucide-check"></span></div>
        <h2>Persetujuan Berhasil Dikirim</h2>
        <p>
          Terima kasih. Surat penawaran kerja Anda telah berhasil ditandatangani dan dikirim kembali
          ke HRD.
        </p>
        <p class="follow-up">
          Tim rekrutmen kami akan segera menghubungi Anda untuk langkah selanjutnya.
        </p>
      </div>

      <form v-else-if="!candidate" class="access-form" @submit.prevent="handleUnlock">
        <div class="access-instructions">
          <span class="i-lucide-info info-box-icon"></span>
          Masukkan PIN 6 digit yang tercantum pada email Offering Letter untuk membuka dokumen.
        </div>
        <label for="offering-password">PIN Offering Letter</label>
        <input
          id="offering-password"
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
          {{ loading ? 'Memeriksa...' : 'Buka Offering Letter' }}
        </button>
      </form>

      <div v-else class="offering-layout">
        <!-- PDF Document Preview Panel -->
        <div class="document-preview-panel">
          <h2>Pratinjau Dokumen</h2>
          <div class="pdf-container" v-if="candidate.pdf_base64">
            <div class="pdf-viewer-scroll">
              <VuePdfEmbed :source="'data:application/pdf;base64,' + candidate.pdf_base64" />
            </div>
          </div>
          <div v-else class="no-pdf">
            <p>Pratinjau PDF tidak tersedia. Harap periksa lampiran email Anda.</p>
          </div>
        </div>

        <!-- Signature Panel -->
        <div class="signature-form-panel">
          <h2>Tanda Tangan Digital</h2>
          <p class="sign-inst">
            <span class="i-lucide-info info-box-icon"></span
            ><span
              >Dengan membubuhkan tanda tangan di bawah ini, saya menyatakan menyetujui seluruh
              ketentuan pekerjaan dan penawaran gaji yang diajukan oleh perusahaan.</span
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

          <div v-if="validationError" class="validation-warning">
            {{ validationError }}
          </div>

          <button type="button" @click="submitSignature" class="submit-btn" :disabled="submitting">
            {{ submitting ? 'Mengirim persetujuan...' : 'Kirim Tanda Tangan & Setujui' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import VuePdfEmbed from 'vue-pdf-embed'
import { getPublicOffering, submitPublicOfferingSignature } from '../services/hrService'
import { askConfirmation } from '../utils/confirmDialog'

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

const canvasRef = ref(null)
let isDrawing = false
let ctx = null

const handleUnlock = async () => {
  passwordError.value = null
  loading.value = true
  try {
    const res = await getPublicOffering(token, password.value)
    candidate.value = res.data
  } catch (err) {
    if (err.response?.status === 403 || err.response?.status === 422) {
      passwordError.value = 'PIN tidak valid. Periksa kembali 6 digit angka pada email.'
    } else if (err.response?.status === 429) {
      passwordError.value = 'Terlalu banyak percobaan. Tunggu satu menit lalu coba kembali.'
    } else {
      error.value =
        'Tautan surat penawaran tidak valid, sudah kedaluwarsa, atau sudah ditandatangani.'
    }
  } finally {
    loading.value = false
  }
}

// Signature Canvas Drawing Logic
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
  } else {
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
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
    title: 'Setujui & Tandatangani Offering Letter',
    message: 'Apakah Anda yakin ingin menyetujui penawaran kerja ini?',
    warningTitle: 'PENTING:',
    warningMessage:
      'Tindakan ini bersifat final. Dengan menyetujui, tanda tangan digital Anda akan dicatat pada sistem sebagai persetujuan resmi atas penawaran kerja ini.',
    checkboxLabel:
      'Saya secara sadar dan sukarela menyetujui seluruh ketentuan penawaran kerja yang tertera.',
    confirmLabel: 'Ya, Setujui',
    cancelLabel: 'Batal',
    variant: 'structured',
    color: 'primary',
  })
  if (!confirmed) return

  submitting.value = true
  const signatureData = canvasRef.value.toDataURL('image/png')

  try {
    await submitPublicOfferingSignature(token, {
      password: password.value,
      signature_data: signatureData,
    })
    submitted.value = true
  } catch (err) {
    validationError.value =
      err.response?.data?.message || 'Gagal mengirim persetujuan. Silakan coba kembali.'
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

.offering-layout {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 30px;
}

@media (max-width: 768px) {
  .offering-layout {
    grid-template-columns: 1fr;
  }
}

.document-preview-panel h2,
.signature-form-panel h2 {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 15px;
}

.pdf-container {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 8px;
}

.pdf-viewer-scroll {
  height: 500px;
  overflow-y: auto;
  background: #f1f5f9;
  border-radius: 8px;
}

.no-pdf {
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  padding: 40px;
  border-radius: 10px;
  text-align: center;
  color: #64748b;
}

.signature-form-panel {
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

.loading-state,
.error-state,
.success-state {
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
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
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
</style>
