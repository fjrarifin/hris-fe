<template>
  <div class="public-portal-container">
    <div class="portal-card" :class="{ 'portal-card--compact': loading || submitted || error }">
      <div class="portal-header">
        <img src="/hompimplay_icon.png" alt="Logo" class="brand-logo-public" />
        <div class="logo-placeholder">HRIS Portal</div>
        <h1>Persetujuan Permintaan Karyawan Baru (PKB)</h1>
        <p class="subtitle" v-if="data">
          Penyetuju internal: <span class="highlight">{{ data.signer_name }}</span>
        </p>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Memuat draf dokumen PKB...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <div class="status-icon status-icon--error">
          <span class="i-lucide-circle-alert"></span>
        </div>
        <h2>Permintaan Tidak Tersedia</h2>
        <p>{{ error }}</p>
      </div>

      <div v-else-if="submitted" class="success-state">
        <div class="status-icon status-icon--success"><span class="i-lucide-check"></span></div>
        <h2>PKB Berhasil Disetujui</h2>
        <p>
          Terima kasih. Tanda tangan digital persetujuan PKB Anda telah berhasil dicatat pada sistem
          HRIS.
        </p>
      </div>

      <div v-else class="pkb-layout">
        <!-- PKB Details Summary -->
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

        <!-- Signature Panel -->
        <div class="signature-form-panel">
          <h2>Tanda Tangan Digital Persetujuan</h2>
          <p class="sign-inst">
            <span class="i-lucide-info info-box-icon"></span
            ><span
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

          <div v-if="validationError" class="validation-warning">
            {{ validationError }}
          </div>

          <button type="button" @click="submitSignature" class="submit-btn" :disabled="submitting">
            {{ submitting ? 'Mengirim persetujuan...' : 'Setujui & Tanda Tangani' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getPublicPkbSigner, submitPublicPkbSignature } from '../services/hrService'
import { askConfirmation } from '../utils/confirmDialog'

const route = useRoute()
const id = route.params.id

const loading = ref(true)
const submitting = ref(false)
const submitted = ref(false)
const error = ref(null)
const validationError = ref(null)
const data = ref(null)

const canvasRef = ref(null)
let isDrawing = false
let ctx = null

onMounted(async () => {
  try {
    const res = await getPublicPkbSigner(id)
    data.value = res.data
    if (res.data.signed_at) {
      submitted.value = true
    }
  } catch (err) {
    error.value =
      'Tautan permintaan tanda tangan PKB tidak valid, sudah kedaluwarsa, atau sudah ditandatangani.'
  } finally {
    loading.value = false
  }
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

// Drawing Logic
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
    title: 'Persetujuan PKB Internal',
    message: 'Apakah Anda yakin ingin menyetujui dan menandatangani dokumen PKB ini?',
    warningTitle: 'PENTING:',
    warningMessage:
      'Tindakan ini bersifat final. Tanda tangan digital Anda akan dicatat pada sistem HRIS sebagai bukti persetujuan dokumen PKB ini.',
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
  max-width: 850px;
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

@media (max-width: 768px) {
  .pkb-layout {
    grid-template-columns: 1fr;
  }
}

.details-panel h2,
.signature-form-panel h2 {
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
}

.pkb-table td {
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
  color: #1f2937;
  font-size: 14px;
}

.salary {
  font-family: monospace;
  font-size: 15px !important;
}

.highlight-salary {
  color: #2563eb;
  font-weight: 700;
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
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
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
</style>
