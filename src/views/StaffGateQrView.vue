<script setup>
import { computed, onMounted, ref } from 'vue'
import QRCode from 'qrcode'
import { getStaffGateQrHistory, getStaffProfile, logStaffGateQrReason } from '../services/staffService'
import { apiError, formatDate, formatDateTime, toYMD } from '../utils/formatters'

const data = ref(null)
const loading = ref(true)
const errorMessage = ref('')
const message = ref('')
const qrReasonModalOpen = ref(false)
const qrReason = ref('')
const qrReasonSaving = ref(false)
const qrReasonMessage = ref('')
const qrModalOpen = ref(false)
const qrDataUrl = ref('')
const qrAccessDateCode = ref('')
const qrLoading = ref(false)

const historyLoading = ref(false)
const historyData = ref([])
const historyMeta = ref({ current_page: 1, last_page: 1, total: 0 })

const displayedName = computed(() => data.value?.employee?.nama_karyawan || data.value?.user?.name || 'Karyawan')
const positionLabel = computed(() => data.value?.employee?.jabatan || data.value?.employee?.posisi || data.value?.user?.position || '-')
const departmentLabel = computed(() => data.value?.employee?.departement || data.value?.employee?.divisi || '-')
const joinDate = computed(() => formatDate(data.value?.employee?.join_date))
const qrEmployeeNik = computed(() => String(data.value?.employee?.nik || data.value?.user?.username || '').trim())
const qrPayload = computed(() =>
  JSON.stringify({
    t: `${qrAccessDateCode.value}${qrEmployeeNik.value.slice(-4)}`,
    m: qrEmployeeNik.value,
    c: qrAccessDateCode.value,
    x: [[9, 100, 374]],
  }),
)

const todayYmd = computed(() => toYMD(new Date()))

const todayLog = computed(() => {
  if (!historyData.value || !historyData.value.length) return null
  return historyData.value.find((item) => {
    const itemYmd = toYMD(item.used_at || item.created_at)
    return itemYmd === todayYmd.value
  })
})

const hasTodayLog = computed(() => !!todayLog.value)

function isTodayItem(item) {
  if (!item) return false
  return toYMD(item.used_at || item.created_at) === todayYmd.value
}

async function loadProfile() {
  errorMessage.value = ''
  try {
    const response = await getStaffProfile()
    data.value = response.data
  } catch (error) {
    errorMessage.value = apiError(error, 'Profil tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function loadHistory(page = 1) {
  historyLoading.value = true
  try {
    const response = await getStaffGateQrHistory({ page })
    historyData.value = response.data.data || []
    historyMeta.value = {
      current_page: response.data.current_page || 1,
      last_page: response.data.last_page || 1,
      total: response.data.total || 0,
    }
  } catch (error) {
    // Silent fail or standard error log
  } finally {
    historyLoading.value = false
  }
}

function formatQrDateCode(date) {
  const year = String(date.getFullYear()).slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}${month}${day}`
}

async function refreshQrCode() {
  qrLoading.value = true
  qrAccessDateCode.value = formatQrDateCode(new Date())
  qrDataUrl.value = ''

  try {
    qrDataUrl.value = await QRCode.toDataURL(qrPayload.value, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 280,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
  } catch (error) {
    errorMessage.value = apiError(error, 'QR code tidak dapat dibuat.')
  } finally {
    qrLoading.value = false
  }
}

function openReasonModal() {
  qrReason.value = ''
  qrReasonMessage.value = ''
  qrReasonModalOpen.value = true
}

function closeReasonModal(force = false) {
  if (qrReasonSaving.value && !force) return
  qrReasonModalOpen.value = false
}

function closeQrModal() {
  qrModalOpen.value = false
}

async function openQrModal() {
  qrModalOpen.value = true
  await refreshQrCode()
}

async function submitQrReason() {
  const reason = qrReason.value.trim()
  if (reason.length < 5) {
    qrReasonMessage.value = 'Alasan minimal 5 karakter.'
    return
  }

  qrReasonSaving.value = true
  qrReasonMessage.value = ''
  errorMessage.value = ''

  try {
    const response = await logStaffGateQrReason({ reason })
    message.value = response.data.message || ''
    closeReasonModal(true)
    await loadHistory()
    await openQrModal()
  } catch (error) {
    qrReasonMessage.value = apiError(error, 'Alasan QR gate tidak dapat disimpan.')
  } finally {
    qrReasonSaving.value = false
  }
}

onMounted(async () => {
  await loadProfile()
  await loadHistory()
  if (!errorMessage.value && !hasTodayLog.value) {
    openReasonModal()
  }
})
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-2xl font-semibold text-highlighted">QR Gate</h2>
        <p class="mt-1 text-sm text-muted">Tampilan khusus untuk membuka QR Gate dengan input alasan.</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <template v-if="hasTodayLog">
          <UButton color="primary" icon="i-lucide-qr-code" label="Lihat QR Hari Ini" @click="openQrModal" />
          <UButton color="neutral" variant="outline" icon="i-lucide-plus" label="Isi Alasan Baru"
            @click="openReasonModal" />
        </template>
        <template v-else>
          <UButton color="primary" icon="i-lucide-qr-code" label="Input Alasan & Buka QR" @click="openReasonModal" />
        </template>
      </div>
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <div v-if="loading" class="py-12 text-center text-sm text-muted">Memuat data profil...</div>

    <template v-if="!loading && data">
      <UCard class="space-y-4">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-xs uppercase font-medium tracking-wide text-muted">Nama Karyawan</p>
            <h3 class="text-xl font-bold text-highlighted mt-0.5">{{ displayedName }}</h3>
            <p class="mt-1 text-sm text-muted">{{ positionLabel }} • {{ departmentLabel }}</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-history" class="size-5 text-primary" />
            <h3 class="text-base font-semibold text-highlighted">Riwayat Pengajuan QR Gate</h3>
          </div>
          <UButton variant="ghost" color="neutral" icon="i-lucide-refresh-cw" label="Refresh" :loading="historyLoading"
            @click="loadHistory(historyMeta.current_page)" />
        </div>

        <div v-if="historyLoading" class="py-8 text-center text-sm text-muted">
          Memuat riwayat pengaksesan...
        </div>

        <div v-else-if="!historyData.length" class="py-8 text-center text-sm text-muted">
          Belum ada riwayat pengaksesan QR Gate.
        </div>

        <div v-else class="space-y-4">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="border-b border-default text-xs font-semibold text-muted uppercase">
                <tr>
                  <th class="p-3">Waktu Akses</th>
                  <th class="p-3">Alasan Pengaksesan</th>
                  <th class="p-3">Status Notifikasi</th>
                  <th class="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default">
                <tr v-for="item in historyData" :key="item.id" class="hover:bg-muted/30">
                  <td class="whitespace-nowrap p-3 font-medium text-highlighted">
                    {{ formatDateTime(item.used_at || item.created_at) }}
                  </td>
                  <td class="p-3 text-highlighted">
                    {{ item.reason }}
                  </td>
                  <td class="whitespace-nowrap p-3">
                    <UBadge color="success" variant="subtle" label="Terkirim HRD" icon="i-lucide-check-circle" />
                  </td>
                  <td class="whitespace-nowrap p-3 text-right">
                    <UButton v-if="isTodayItem(item)" size="xs" color="primary" variant="subtle" icon="i-lucide-qr-code"
                      label="Lihat QR" @click="openQrModal" />
                    <span v-else class="text-xs text-muted">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="historyMeta.last_page > 1"
            class="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-muted">
            <span>Halaman {{ historyMeta.current_page }} dari {{ historyMeta.last_page }} (Total {{ historyMeta.total }}
              riwayat)</span>
            <div class="flex items-center gap-2">
              <UButton size="xs" color="neutral" variant="outline" label="Sebelumnya"
                :disabled="historyMeta.current_page <= 1 || historyLoading"
                @click="loadHistory(historyMeta.current_page - 1)" />
              <UButton size="xs" color="neutral" variant="outline" label="Selanjutnya"
                :disabled="historyMeta.current_page >= historyMeta.last_page || historyLoading"
                @click="loadHistory(historyMeta.current_page + 1)" />
            </div>
          </div>
        </div>
      </UCard>
    </template>

    <Teleport to="body">
      <div v-if="qrReasonModalOpen" class="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4" role="dialog"
        aria-modal="true">
        <button type="button" class="absolute inset-0" aria-label="Tutup modal alasan"
          @click="closeReasonModal"></button>
        <UCard class="relative w-full max-w-lg p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold text-highlighted">Alasan Menggunakan QR Gate</h3>
              <p class="mt-1 text-sm text-muted">HRD akan menerima notifikasi penggunaan QR ini.</p>
            </div>
            <UButton variant="ghost" color="neutral" icon="i-lucide-x" aria-label="Tutup" :disabled="qrReasonSaving"
              @click="closeReasonModal" />
          </div>

          <div class="mt-5 space-y-4">
            <label class="block text-sm text-muted">
              <span class="mb-2 block font-medium">Alasan Penggunaan</span>
              <textarea v-model.trim="qrReason" rows="5"
                class="w-full rounded-2xl border border-default bg-transparent p-4 text-sm text-highlighted outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Contoh: kartu akses tertinggal" :disabled="qrReasonSaving" />
            </label>

            <p v-if="qrReasonMessage"
              class="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
              {{ qrReasonMessage }}</p>

            <div class="flex flex-wrap justify-end gap-3">
              <UButton color="neutral" variant="outline" label="Batal" :disabled="qrReasonSaving"
                @click="closeReasonModal" />
              <UButton label="Tampilkan QR" icon="i-lucide-send" :loading="qrReasonSaving"
                :disabled="qrReasonSaving || qrReason.trim().length < 5" @click="submitQrReason" />
            </div>
          </div>
        </UCard>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="qrModalOpen" class="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4" role="dialog"
        aria-modal="true">
        <button type="button" class="absolute inset-0" aria-label="Tutup QR modal" @click="closeQrModal"></button>
        <UCard class="relative w-full max-w-lg p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold text-highlighted">QR Akses Gate Hari Ini</h3>
              <p class="mt-1 text-sm text-muted">{{ displayedName }} · {{ qrEmployeeNik }}</p>
            </div>
            <UButton variant="ghost" color="neutral" icon="i-lucide-x" aria-label="Tutup" :disabled="qrLoading"
              @click="closeQrModal" />
          </div>

          <div class="mt-5 space-y-4">
            <div
              class="mx-auto grid h-full w-full max-w-[320px] place-items-center rounded-3xl bg-white p-4 shadow-inner">
              <img v-if="qrDataUrl && !qrLoading" :src="qrDataUrl" alt="QR akses gate" class="max-w-full" />
              <div v-else class="flex h-56 w-full items-center justify-center text-sm text-slate-500">
                {{ qrLoading ? 'Membuat QR...' : 'QR sedang dimuat...' }}
              </div>
            </div>

            <div class="flex flex-wrap justify-end gap-3">
              <UButton color="neutral" variant="outline" label="Refresh" :disabled="qrLoading" @click="refreshQrCode" />
              <UButton color="primary" label="Tutup" @click="closeQrModal" />
            </div>
          </div>
        </UCard>
      </div>
    </Teleport>
  </section>
</template>
