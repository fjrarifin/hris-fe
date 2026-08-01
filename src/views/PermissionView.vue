<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { createPermission, deletePermission, getPermissions } from '../services/staffService'
import { askConfirmation } from '../utils/confirmDialog'
import { apiError, formatDate, statusColor, statusLabel } from '../utils/formatters'

const requests = ref([])
const form = reactive({ type: 'izin', start_date: '', end_date: '', reason: '', document: null })
const loading = ref(true)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')
const todayDate = new Date().toISOString().slice(0, 10)

const documentPreview = reactive({
  open: false,
  title: '',
  url: '',
  loading: false,
  error: false,
})

const isImageDocument = computed(() => {
  if (!documentPreview.url) return false
  const urlWithoutQuery = documentPreview.url.split('?')[0]
  const ext = urlWithoutQuery.split('.').pop()?.toLowerCase()
  return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)
})

function openDocumentPreview(item) {
  documentPreview.open = true
  documentPreview.title = `Dokumen ${item.type === 'sakit' ? 'Surat Sakit' : 'Izin'}`
  let url = item.document_url || ''
  if (url.includes('hr.hompimplay.id/storage/')) {
    url = url.replace('hr.hompimplay.id/storage/', 'api-hr.hompimplay.id/storage/')
  }
  documentPreview.url = url
  documentPreview.loading = true
  documentPreview.error = false
}

function closeDocumentPreview() {
  documentPreview.open = false
  documentPreview.title = ''
  documentPreview.url = ''
  documentPreview.loading = false
  documentPreview.error = false
}

async function load() {
  loading.value = true
  try {
    requests.value = (await getPermissions()).data.requests
  } catch (error) {
    errorMessage.value = apiError(error, 'Data izin tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

function selectDocument(event) {
  form.document = event.target.files[0] || null
}

async function submit() {
  const payload = new FormData()
  payload.append('type', form.type)
  payload.append('start_date', form.start_date)
  payload.append('end_date', form.end_date || form.start_date)
  payload.append('reason', form.reason)
  if (form.document) payload.append('document', form.document)

  saving.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    message.value = (await createPermission(payload)).data.message
    form.start_date = ''
    form.end_date = ''
    form.reason = ''
    form.document = null
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    saving.value = false
  }
}

function permissionDateLabel(item) {
  const start = formatDate(item.start_date || item.date)
  const endValue = item.end_date || item.date
  const end = formatDate(endValue)

  return endValue && endValue !== (item.start_date || item.date) ? `${start} - ${end}` : start
}

async function remove(id) {
  if (
    !(await askConfirmation({
      title: 'Batalkan Pengajuan',
      message: 'Batalkan pengajuan izin/sakit ini?',
      confirmLabel: 'Batalkan',
      color: 'error',
    }))
  )
    return
  try {
    message.value = (await deletePermission(id)).data.message
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  }
}

onMounted(load)
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Izin / Sakit</h2>
      <p class="mt-1 text-sm text-muted">Ajukan izin atau sakit kepada atasan langsung Anda.</p>
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <UCard title="Pengajuan Baru">
      <form class="grid gap-4 lg:grid-cols-2" @submit.prevent="submit">
        <label class="text-sm text-muted">
          Jenis
          <select
            v-model="form.type"
            class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
          >
            <option value="izin">Izin</option>
            <option value="sakit">Sakit</option>
          </select>
        </label>
        <label class="text-sm text-muted">
          Dari Tanggal
          <input
            v-model="form.start_date"
            type="date"
            :min="form.type === 'izin' ? todayDate : null"
            class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            required
          />
        </label>
        <label class="text-sm text-muted">
          Sampai Tanggal
          <input
            v-model="form.end_date"
            type="date"
            :min="form.start_date || (form.type === 'izin' ? todayDate : null)"
            class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            required
          />
        </label>
        <label v-if="form.type === 'izin'" class="text-sm text-muted lg:col-span-2">
          Alasan
          <textarea
            v-model="form.reason"
            class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            rows="3"
            required
          ></textarea>
        </label>
        <label v-else class="text-sm text-muted lg:col-span-2">
          Surat Sakit
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            required
            @change="selectDocument"
          />
        </label>
        <UButton
          type="submit"
          label="Kirim Pengajuan"
          :loading="saving"
          class="lg:col-span-2 lg:w-fit"
        />
      </form>
    </UCard>

    <UCard title="Riwayat Izin / Sakit">
      <div v-if="loading" class="py-8 text-center text-sm text-muted">Memuat riwayat...</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">Tanggal</th>
              <th class="p-3">Jenis</th>
              <th class="p-3">Alasan / Dokumen</th>
              <th class="p-3">Status</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in requests" :key="item.id" class="border-t border-default">
              <td class="p-3">{{ permissionDateLabel(item) }}</td>
              <td class="p-3">{{ item.type === 'sakit' ? 'Sakit' : 'Izin' }}</td>
              <td class="p-3">
                <div v-if="item.document_url" class="space-y-1">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 font-medium text-primary hover:underline text-xs sm:text-sm"
                    @click="openDocumentPreview(item)"
                  >
                    <UIcon name="i-lucide-file-text" class="h-4 w-4" />
                    Lihat dokumen
                  </button>
                  <p v-if="item.reason" class="text-xs text-muted">{{ item.reason }}</p>
                </div>
                <span v-else>{{ item.reason || '-' }}</span>
              </td>
              <td class="p-3">
                <UBadge
                  :color="statusColor(item.status)"
                  variant="subtle"
                  :label="statusLabel(item.status)"
                />
              </td>
              <td class="p-3">
                <UButton
                  v-if="item.status === 'pending'"
                  color="error"
                  variant="ghost"
                  size="sm"
                  label="Batalkan"
                  @click="remove(item.id)"
                />
              </td>
            </tr>
            <tr v-if="!requests.length">
              <td colspan="5" class="p-6 text-center text-muted">Belum ada pengajuan izin.</td>
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
            <p class="mt-0.5 text-xs text-muted">Pratinjau berkas dokumen pengajuan.</p>
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

        <div class="relative flex h-[70vh] w-full items-center justify-center overflow-auto rounded-lg border border-default bg-slate-950/40 p-2">
          <div
            v-if="documentPreview.loading"
            class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-950/60 text-slate-200"
          >
            <UIcon name="i-lucide-loader-2" class="h-7 w-7 animate-spin text-primary" />
            <span class="text-xs">Memuat pratinjau berkas...</span>
          </div>

          <div
            v-if="documentPreview.error"
            class="flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-300 max-w-md"
          >
            <UIcon name="i-lucide-alert-triangle" class="h-10 w-10 text-amber-400" />
            <div>
              <p class="font-medium text-sm text-highlighted">Pratinjau tidak dapat dimuat langsung</p>
              <p class="text-xs text-muted mt-1">
                Berkas tidak ditemukan atau formatnya tidak didukung secara langsung oleh pratinjau browser.
              </p>
            </div>
            <a
              :href="documentPreview.url"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90 shadow"
            >
              <UIcon name="i-lucide-external-link" class="h-4 w-4" />
              Buka / Unduh Berkas Langsung
            </a>
          </div>

          <template v-else>
            <img
              v-if="isImageDocument"
              :src="documentPreview.url"
              :alt="documentPreview.title"
              class="max-h-full max-w-full rounded object-contain shadow-lg"
              @load="documentPreview.loading = false"
              @error="documentPreview.error = true; documentPreview.loading = false"
            />
            <iframe
              v-else
              :src="documentPreview.url"
              class="h-full w-full rounded border-0 bg-white"
              title="Pratinjau Dokumen"
              @load="documentPreview.loading = false"
              @error="documentPreview.error = true; documentPreview.loading = false"
            ></iframe>
          </template>
        </div>
      </UCard>
    </div>
  </section>
</template>
