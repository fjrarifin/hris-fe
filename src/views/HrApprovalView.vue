<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { cancelHrApproval, decideHrApproval, getHrApprovals } from '../services/hrService'
import { apiError, formatDate, statusColor, statusLabel } from '../utils/formatters'

const route = useRoute()
const type = computed(() => route.meta.approvalType)
const title = computed(
  () =>
    ({
      leave: 'Cuti',
      overtime: 'Lembur',
      ph: 'Public Holiday',
      extra_off: 'Extra Off',
      permission: 'Izin / Sakit',
    })[type.value],
)
const requests = ref([])
const status = ref('waiting_hr')
const searchQuery = ref('')
const loading = ref(false)
const actingId = ref(null)
const message = ref('')
const errorMessage = ref('')

const documentPreview = reactive({
  open: false,
  title: '',
  url: '',
})

const isImageDocument = computed(() => {
  if (!documentPreview.url) return false
  const urlWithoutQuery = documentPreview.url.split('?')[0]
  const ext = urlWithoutQuery.split('.').pop()?.toLowerCase()
  return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)
})

function openDocumentPreview(item) {
  documentPreview.open = true
  documentPreview.title = `Surat Sakit / Dokumen - ${item.employee_name}`
  documentPreview.url = item.document_url
}

function closeDocumentPreview() {
  documentPreview.open = false
  documentPreview.title = ''
  documentPreview.url = ''
}

const filteredRequests = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return requests.value

  return requests.value.filter((item) => {
    return (
      (item.employee_name && item.employee_name.toLowerCase().includes(query)) ||
      (item.employee_nik && item.employee_nik.toLowerCase().includes(query)) ||
      (item.department && item.department.toLowerCase().includes(query))
    )
  })
})

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    requests.value = (await getHrApprovals(type.value, { status: status.value })).data.requests
  } catch (error) {
    errorMessage.value = apiError(error, 'Data approval tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function decide(item, decision) {
  const reason = decision === 'rejected' ? window.prompt('Alasan penolakan:') : null
  if (decision === 'rejected' && !reason) return

  actingId.value = item.id
  errorMessage.value = ''
  message.value = ''
  try {
    message.value = (await decideHrApproval(type.value, item.id, { decision, reason })).data.message
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    actingId.value = null
  }
}

async function cancel(item) {
  const reason = window.prompt('Alasan pembatalan approval HRD:')
  if (!reason) return

  actingId.value = item.id
  errorMessage.value = ''
  message.value = ''
  try {
    message.value = (await cancelHrApproval(type.value, item.id, { reason })).data.message
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    actingId.value = null
  }
}

watch(
  type,
  () => {
    status.value = 'waiting_hr'
    load()
  },
  { immediate: true },
)
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Approval {{ title }}</h2>
      <p class="mt-1 text-sm text-muted">
        Verifikasi akhir HRD untuk pengajuan yang telah masuk ke antrean persetujuan.
      </p>
    </div>
    <AlertToastBridge :message="message" :error="errorMessage" />

    <UCard title="Filter Status">
      <form class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="load">
        <label class="text-sm text-muted">
          Status Pengajuan
          <select
            v-model="status"
            class="mt-2 block rounded-lg border border-default bg-default p-2.5 text-highlighted"
          >
            <option value="waiting_hr">Menunggu HRD</option>
            <option value="all">Semua Status</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </label>
        <label class="flex-1 text-sm text-muted">
          Cari Karyawan
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Cari nama, NIK, atau departemen..."
            class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
          />
        </label>
        <UButton type="submit" label="Tampilkan" :loading="loading" />
      </form>
    </UCard>

    <UCard :title="`Daftar Pengajuan ${title}`">
      <div v-if="loading" class="py-10 text-center text-sm text-muted">Memuat pengajuan...</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">Karyawan</th>
              <th class="p-3">Jenis</th>
              <th class="p-3">Tanggal / Waktu</th>
              <th class="p-3">Keterangan</th>
              <th class="p-3">Status</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredRequests" :key="item.id" class="border-t border-default">
              <td class="p-3">
                <p class="font-medium text-highlighted">{{ item.employee_name }}</p>
                <p class="text-xs text-muted">{{ item.employee_nik }} - {{ item.department }}</p>
              </td>
              <td class="p-3">{{ item.label }}</td>
              <td class="p-3">
                {{ formatDate(item.date)
                }}<span v-if="item.end_date"> - {{ formatDate(item.end_date) }}</span>
                <p v-if="item.time" class="text-xs text-muted">{{ item.time }}</p>
              </td>
              <td class="max-w-60 p-3">
                <div v-if="item.document_url" class="space-y-1">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 font-medium text-primary hover:underline text-xs sm:text-sm"
                    @click="openDocumentPreview(item)"
                  >
                    <UIcon name="i-lucide-file-text" class="h-4 w-4" />
                    Lihat surat sakit
                  </button>
                  <p v-if="item.reason" class="text-xs text-muted">{{ item.reason }}</p>
                </div>
                <span v-else>{{ item.reason || item.reject_reason || '-' }}</span>
              </td>
              <td class="p-3">
                <UBadge
                  :color="statusColor(item.status)"
                  variant="subtle"
                  :label="statusLabel(item.status)"
                />
              </td>
              <td class="p-3">
                <div v-if="item.can_decide" class="flex gap-2">
                  <UButton
                    size="xs"
                    color="success"
                    variant="soft"
                    label="Setujui"
                    :loading="actingId === item.id"
                    @click="decide(item, 'approved')"
                  />
                  <UButton
                    size="xs"
                    color="error"
                    variant="soft"
                    label="Tolak"
                    :disabled="actingId === item.id"
                    @click="decide(item, 'rejected')"
                  />
                </div>
                <UButton
                  v-else-if="item.can_cancel"
                  size="xs"
                  color="error"
                  variant="soft"
                  label="Batalkan"
                  :loading="actingId === item.id"
                  @click="cancel(item)"
                />
                <span v-else class="text-xs text-muted">Selesai</span>
              </td>
            </tr>
            <tr v-if="!filteredRequests.length">
              <td colspan="6" class="p-8 text-center text-muted">
                Tidak ada pengajuan pada filter ini.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <div
      v-if="documentPreview.open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      :aria-label="documentPreview.title"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60"
        aria-label="Tutup pratinjau dokumen"
        @click="closeDocumentPreview"
      ></button>
      <UCard class="relative max-h-[90vh] w-full overflow-hidden sm:max-w-4xl">
        <div class="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold text-highlighted">{{ documentPreview.title }}</h3>
            <p class="mt-0.5 text-xs text-muted">Pratinjau berkas surat sakit / dokumen izin karyawan.</p>
          </div>
          <div class="flex items-center gap-2">
            <a
              :href="documentPreview.url"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-1 rounded-lg border border-default bg-default px-2.5 py-1.5 text-xs font-medium text-highlighted hover:bg-muted/10"
            >
              <UIcon name="i-lucide-external-link" class="h-3.5 w-3.5" />
              Buka di Tab Baru
            </a>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              aria-label="Tutup"
              @click="closeDocumentPreview"
            />
          </div>
        </div>

        <div class="flex h-[70vh] w-full items-center justify-center overflow-auto rounded-lg border border-default bg-slate-950/40 p-2">
          <img
            v-if="isImageDocument"
            :src="documentPreview.url"
            :alt="documentPreview.title"
            class="max-h-full max-w-full rounded object-contain shadow-lg"
          />
          <iframe
            v-else
            :src="documentPreview.url"
            class="h-full w-full rounded border-0 bg-white"
            title="Pratinjau Dokumen"
          ></iframe>
        </div>
      </UCard>
    </div>
  </section>
</template>
