<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { getStaffJobdeskPdfPreview, getStaffTalent } from '../services/staffService'
import { apiError } from '../utils/formatters'

const data = ref(null)
const errorMessage = ref('')
const loadingDocument = ref(false)
const documentPreview = reactive({ open: false, title: '', url: '', jobdeskId: null })

function closeDocumentPreview() {
  if (documentPreview.url) URL.revokeObjectURL(documentPreview.url)
  Object.assign(documentPreview, { open: false, title: '', url: '', jobdeskId: null })
}

function pdfBlobUrl(contentBase64, mimeType) {
  const bytes = Uint8Array.from(atob(contentBase64), (character) => character.charCodeAt(0))
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }))
}

async function previewDocument(item) {
  closeDocumentPreview()
  Object.assign(documentPreview, {
    open: true,
    title: `Jobdesk ${item.kategori}`,
    jobdeskId: item.id,
  })
  loadingDocument.value = true
  try {
    const response = await getStaffJobdeskPdfPreview(item.id)
    documentPreview.url = pdfBlobUrl(response.data.content_base64, response.data.mime_type)
  } catch (error) {
    closeDocumentPreview()
    errorMessage.value = apiError(error, 'Dokumen jobdesk tidak dapat ditampilkan.')
  } finally {
    loadingDocument.value = false
  }
}

async function load() {
  try {
    data.value = (await getStaffTalent()).data
  } catch (error) {
    errorMessage.value = apiError(error, 'Jobdesk dan KPI tidak dapat dimuat.')
  }
}

onMounted(load)
onBeforeUnmount(closeDocumentPreview)
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Jobdesk & KPI Saya</h2>
      <p class="mt-1 text-sm text-muted">Referensi tugas dan target aktif untuk jabatan Anda.</p>
    </div>
    <AlertToastBridge :error="errorMessage" />
    <UCard v-if="data" title="Informasi Jabatan">
      <p class="font-semibold text-highlighted">{{ data.employee.jabatan }}</p>
      <p class="mt-1 text-sm text-muted">{{ data.employee.departemen || 'Tanpa departemen' }}</p>
    </UCard>
    <UCard v-if="data" title="Jobdesk Aktif">
      <div class="space-y-3">
        <div
          v-for="item in data.jobdesks"
          :key="item.id"
          class="rounded-lg border border-default p-4"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-medium text-highlighted">{{ item.kategori }}</h3>
                <UBadge :label="item.tipe_tugas" variant="subtle" />
              </div>
              <p class="mt-2 text-sm text-muted">{{ item.deskripsi }}</p>
            </div>
            <UButton
              v-if="item.has_document"
              size="xs"
              label="Lihat PDF"
              variant="soft"
              :loading="loadingDocument && documentPreview.jobdeskId === item.id"
              @click="previewDocument(item)"
            />
          </div>
        </div>
        <p v-if="!data.jobdesks.length" class="py-4 text-center text-sm text-muted">
          Belum ada jobdesk aktif untuk jabatan Anda.
        </p>
      </div>
    </UCard>
    <UCard v-if="data" title="KPI Aktif">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-muted">
              <th class="p-3">KPI</th>
              <th class="p-3">Target</th>
              <th class="p-3">Bobot</th>
              <th class="p-3">Formula</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in data.kpis" :key="item.id" class="border-t border-default">
              <td class="p-3">
                <p class="font-medium text-highlighted">{{ item.nama_kpi }}</p>
                <p class="mt-1 text-xs text-muted">{{ item.deskripsi }}</p>
              </td>
              <td class="p-3">{{ item.target }} {{ item.satuan }}</td>
              <td class="p-3">{{ item.bobot }}%</td>
              <td class="p-3">{{ item.formula_penilaian || '-' }}</td>
            </tr>
            <tr v-if="!data.kpis.length">
              <td colspan="4" class="p-6 text-center text-muted">
                Belum ada KPI aktif untuk jabatan Anda.
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
        aria-label="Tutup dokumen jobdesk"
        @click="closeDocumentPreview"
      ></button>
      <UCard class="relative h-[85vh] w-full overflow-hidden lg:w-2/3">
        <div class="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold text-highlighted">{{ documentPreview.title }}</h3>
            <p class="mt-1 text-sm text-muted">Pratinjau dokumen PDF jobdesk Anda.</p>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            aria-label="Tutup"
            @click="closeDocumentPreview"
          />
        </div>
        <div v-if="loadingDocument" class="py-16 text-center text-sm text-muted">
          Memuat dokumen jobdesk...
        </div>
        <iframe
          v-else-if="documentPreview.url"
          :src="documentPreview.url"
          :title="documentPreview.title"
          class="h-[calc(85vh-6rem)] w-full rounded-lg border border-default bg-white"
        ></iframe>
      </UCard>
    </div>
  </section>
</template>
