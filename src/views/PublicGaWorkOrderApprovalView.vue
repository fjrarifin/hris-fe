<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api, { backendUrl } from '../services/api'

const route = useRoute()
const token = computed(() => String(route.params.token || '').trim())

const loading = ref(true)
const busy = ref(false)
const error = ref('')
const feedback = ref('')
const data = ref(null)
const comment = ref('')

const wo = computed(() => data.value?.work_order || null)
const approval = computed(() => data.value?.approval || null)
const approver = computed(() => data.value?.approver || null)
const canAct = computed(() => Boolean(data.value?.can_act))
const initialApprovals = computed(() => (data.value?.approvals || []).filter((a) => a.stage === 'initial'))
const rabApprovals = computed(() => (data.value?.approvals || []).filter((a) => a.stage === 'rab'))

const attachmentUrl = (type, index = 0) =>
  `${backendUrl}/api/public/ga-work-orders/${encodeURIComponent(token.value)}/attachments/${type}${type === 'photo' ? `?index=${index}` : ''}`
const photoList = computed(() => {
  if (Array.isArray(wo.value?.photo_paths) && wo.value.photo_paths.length) return wo.value.photo_paths
  return wo.value?.photo_path ? [wo.value.photo_path] : []
})
const isPdfPath = (path) => /\.pdf($|\?)/i.test(String(path || '')) || String(path || '').startsWith('data:application/pdf')
const formatRp = (val) => new Intl.NumberFormat('id-ID').format(Math.round(Number(val || 0)))
const formatQty = (val) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.round(Number(val || 0)))

const statusLabel = (s) =>
  ({
    WAITING_APPROVAL: 'Menunggu Persetujuan',
    PENDING_GA: 'Menunggu Review GA',
    RAB_PENDING: 'Menunggu Persetujuan RAB',
    RAB_APPROVED: 'RAB Disetujui',
    SPL_PENDING: 'Menunggu Finance (SPL)',
    BUYING_MATERIAL: 'Pembelian Material',
    ON_PROGRESS: 'Sedang Dikerjakan',
    DONE: 'Selesai',
    HOLD: 'Ditunda',
    REJECTED: 'Ditolak',
    BATAL: 'Dibatalkan',
  })[s] || s

const approvalStatusLabel = (s) =>
  ({
    approved: 'Disetujui',
    rejected: 'Ditolak',
    pending: 'Menunggu',
  })[s] || s

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get(`/public/ga-work-orders/${encodeURIComponent(token.value)}`)
    data.value = res.data
  } catch (err) {
    error.value = err.response?.data?.message || 'Tautan persetujuan tidak valid atau Work Order telah dibatalkan.'
  } finally {
    loading.value = false
  }
}

async function submitDecision(decision) {
  if (decision === 'reject' && !comment.value.trim()) {
    error.value = 'Alasan penolakan atau catatan revisi wajib diisi.'
    return
  }
  busy.value = true
  error.value = ''
  feedback.value = ''
  try {
    const res = await api.post(`/public/ga-work-orders/${encodeURIComponent(token.value)}/decide`, {
      decision,
      comment: comment.value.trim() || null,
    })
    feedback.value = res.data?.message || 'Keputusan persetujuan berhasil dicatat.'
    comment.value = ''
    await loadData()
  } catch (err) {
    error.value = err.response?.data?.message || 'Gagal menyimpan keputusan persetujuan.'
  } finally {
    busy.value = false
  }
}

onMounted(() => loadData())
</script>

<template>
  <div class="min-h-screen bg-slate-100 px-3 py-6 text-slate-900 sm:px-6 sm:py-10">
    <div class="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <!-- Header -->
      <div class="border-b border-slate-200 bg-slate-900 px-5 py-5 text-white sm:px-7">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <img src="/hompimplay_icon.png" alt="Hompimplay" class="size-10 rounded-xl bg-white p-1 object-contain" />
            <div>
              <p class="text-xs font-medium text-slate-300">HRIS &amp; General Affair Portal</p>
              <h1 class="text-lg font-bold tracking-tight sm:text-xl">
                {{ approval?.stage === 'rab' ? 'Persetujuan RAB Work Order' : 'Persetujuan Work Order GA' }}
              </h1>
            </div>
          </div>
          <span
            v-if="wo"
            class="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white"
          >
            {{ statusLabel(wo.status) }}
          </span>
        </div>
        <p v-if="approver" class="mt-3 text-xs text-slate-300">
          Penyetuju: <strong class="text-white">{{ approver.name }}</strong>
          <span v-if="approver.nik"> ({{ approver.nik }})</span>
        </p>
      </div>

      <div class="space-y-5 p-5 sm:p-7">
        <div v-if="loading" class="py-10 text-center text-sm text-slate-500">
          Memuat rincian Work Order...
        </div>

        <div v-else-if="error && !wo" class="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
          <p class="text-base font-bold text-red-700">Tautan Tidak Tersedia</p>
          <p class="mt-1 text-sm text-red-600">{{ error }}</p>
        </div>

        <template v-else-if="wo">
          <div v-if="feedback" role="status" class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {{ feedback }}
          </div>
          <div v-if="error" role="alert" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {{ error }}
          </div>

          <!-- Ringkasan Work Order -->
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-sm font-bold text-slate-900">Work Order #{{ wo.excel_no || wo.id }}</h2>
              <span class="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">
                {{ wo.job_type }}
              </span>
            </div>
            <dl class="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt class="text-slate-500">Pemohon</dt>
                <dd class="font-semibold text-slate-900">{{ data?.requester?.name || '-' }} <span v-if="data?.requester?.nik" class="font-normal text-slate-500">({{ data.requester.nik }})</span></dd>
              </div>
              <div>
                <dt class="text-slate-500">Area / Unit</dt>
                <dd class="font-semibold text-slate-900">{{ wo.area_name }}</dd>
              </div>
              <div>
                <dt class="text-slate-500">Tanggal Pengajuan</dt>
                <dd class="font-semibold text-slate-900 tabular-nums">{{ wo.request_date || '-' }}</dd>
              </div>
              <div>
                <dt class="text-slate-500">Target Selesai</dt>
                <dd class="font-semibold text-slate-900 tabular-nums">{{ wo.target_date || '-' }}</dd>
              </div>
            </dl>
            <div class="mt-3 border-t border-slate-200 pt-3">
              <p class="text-xs font-semibold text-slate-500">Deskripsi Pekerjaan / Kerusakan</p>
              <p class="mt-1 whitespace-pre-line text-sm text-slate-900">{{ wo.project_description }}</p>
            </div>
          </div>

          <!-- Lampiran Foto & Dokumen -->
          <div v-if="wo.photo_path || wo.request_document_path || wo.spl_document_path" class="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 class="mb-3 text-xs font-bold uppercase tracking-wide text-slate-600">Lampiran Foto &amp; Dokumen</h3>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div v-if="photoList.length" class="flex flex-col justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3" :class="{ 'sm:col-span-2': !wo.request_document_path }">
                <div>
                  <p class="mb-2 text-xs font-semibold text-slate-900">Foto Pengajuan / Kondisi ({{ photoList.length }} foto)</p>
                  <div :class="['grid gap-2', photoList.length > 1 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1']">
                    <div v-for="(_, idx) in photoList" :key="idx" class="flex flex-col gap-1.5">
                      <a :href="attachmentUrl('photo', idx)" target="_blank" rel="noopener noreferrer">
                        <img
                          :src="attachmentUrl('photo', idx)"
                          :alt="`Foto lampiran ${idx + 1}`"
                          class="h-40 w-full rounded-lg border border-slate-200 object-cover"
                        />
                      </a>
                      <a
                        :href="attachmentUrl('photo', idx)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        Buka Foto {{ photoList.length > 1 ? idx + 1 : 'Penuh' }}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="wo.request_document_path" class="flex flex-col justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3">
                <div>
                  <p class="mb-2 text-xs font-semibold text-slate-900">Dokumen Pendukung</p>
                  <a v-if="!isPdfPath(wo.request_document_path)" :href="attachmentUrl('document')" target="_blank" rel="noopener noreferrer">
                    <img
                      :src="attachmentUrl('document')"
                      alt="Dokumen lampiran Work Order"
                      class="h-44 w-full rounded-lg border border-slate-200 object-cover"
                    />
                  </a>
                  <div v-else class="flex h-44 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 text-center">
                    <span class="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">DOKUMEN PDF</span>
                    <span class="text-xs text-slate-500">Klik tombol di bawah untuk membuka atau mengunduh dokumen.</span>
                  </div>
                </div>
                <a
                  :href="attachmentUrl('document')"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Lihat / Unduh Dokumen
                </a>
              </div>
            </div>
          </div>

          <!-- Rincian RAB (jika ada) -->
          <div v-if="data?.rab_items?.length" class="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 class="mb-2 text-sm font-bold text-slate-900">Rincian RAB (Total: Rp {{ formatRp(wo.rab_total) }})</h3>
            <div class="overflow-x-auto">
              <table class="w-full border-collapse text-left text-xs">
                <thead>
                  <tr class="border-b border-slate-200 text-slate-500">
                    <th class="px-2 py-2">Item</th>
                    <th class="px-2 py-2">Qty</th>
                    <th class="px-2 py-2">Harga Satuan</th>
                    <th class="px-2 py-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 tabular-nums">
                  <tr v-for="item in data.rab_items" :key="item.id">
                    <td class="px-2 py-2 font-medium text-slate-900">{{ item.item_name }}</td>
                    <td class="px-2 py-2 text-slate-600">{{ formatQty(item.qty) }} {{ item.unit }}</td>
                    <td class="px-2 py-2 text-slate-600">Rp {{ formatRp(item.unit_price) }}</td>
                    <td class="px-2 py-2 font-semibold text-slate-900">Rp {{ formatRp(item.subtotal) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Form Keputusan Approval -->
          <div v-if="canAct" class="rounded-xl border border-blue-200 bg-blue-50/70 p-4 sm:p-5">
            <h3 class="text-sm font-bold text-slate-900">
              {{ approval?.stage === 'rab' ? 'Berikan Keputusan Persetujuan RAB' : 'Berikan Keputusan Persetujuan Work Order' }}
            </h3>
            <p class="mt-1 text-xs text-slate-600">
              {{
                approval?.stage === 'rab'
                  ? 'Setujui agar GA dapat mengajukan biaya (SPL) ke Finance, atau minta revisi RAB.'
                  : 'Setujui agar Work Order ini masuk ke antrian review Admin GA.'
              }}
            </p>
            <textarea
              v-model="comment"
              rows="3"
              placeholder="Catatan persetujuan (opsional) atau alasan penolakan/revisi (wajib jika menolak)..."
              class="mt-3 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                :disabled="busy"
                class="min-h-[42px] flex-1 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
                @click="submitDecision('approve')"
              >
                {{ busy ? 'Memproses...' : approval?.stage === 'rab' ? 'Setujui RAB' : 'Setujui Work Order' }}
              </button>
              <button
                type="button"
                :disabled="busy"
                class="min-h-[42px] flex-1 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-50"
                @click="submitDecision('reject')"
              >
                {{ approval?.stage === 'rab' ? 'Minta Revisi RAB' : 'Tolak Work Order' }}
              </button>
            </div>
          </div>

          <div
            v-else
            class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
          >
            <p class="font-bold">
              {{
                approval?.status === 'approved'
                  ? 'Anda telah MENYETUJUI pengajuan ini.'
                  : approval?.status === 'rejected'
                    ? 'Anda telah MENOLAK / MEMINTA REVISI pada pengajuan ini.'
                    : 'Tahap persetujuan ini sudah tidak aktif atau sudah diproses.'
              }}
            </p>
            <p v-if="approval?.acted_at" class="mt-1 text-xs text-emerald-700 tabular-nums">
              Diproses pada: {{ approval.acted_at }}
              <span v-if="approval?.comment"> — Catatan: "{{ approval.comment }}"</span>
            </p>
          </div>

          <!-- Status Daftar Approver -->
          <div v-if="initialApprovals.length || rabApprovals.length" class="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 class="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Status Persetujuan</h3>
            <div v-if="initialApprovals.length" class="flex flex-wrap gap-2">
              <div
                v-for="a in initialApprovals"
                :key="a.id"
                class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs"
              >
                <span class="font-medium text-slate-900">{{ a.approver_name }}</span>
                <span
                  :class="[
                    'rounded px-1.5 py-0.5 text-[11px] font-semibold',
                    a.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : a.status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-800',
                  ]"
                >
                  {{ approvalStatusLabel(a.status) }}
                </span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
