<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  createHrJobdesk,
  deleteHrJobdesk,
  getHrJobdeskPdfPreview,
  getHrJobdesks,
  getHrTalentOptions,
  updateHrJobdesk,
} from '../services/hrService'
import { askConfirmation } from '../utils/confirmDialog'
import { apiError } from '../utils/formatters'

const route = useRoute()
const jabatanId = Number(route.params.jabatanId)
const options = ref({ jabatans: [] })
const records = ref([])
const editingId = ref(null)
const message = ref('')
const errorMessage = ref('')
const loadingDocument = ref(false)
const documentPreview = reactive({ open: false, title: '', url: '', jobdeskId: null })
const jabatan = computed(() => options.value.jabatans.find((item) => item.id === jabatanId))
const form = reactive({
  master_jabatan_id: jabatanId,
  kategori: '',
  deskripsi: '',
  tipe_tugas: 'harian',
  is_active: true,
  document: null,
})

async function load() {
  options.value = (await getHrTalentOptions()).data
  records.value = (await getHrJobdesks({ master_jabatan_id: jabatanId })).data
}
function reset() {
  editingId.value = null
  Object.assign(form, {
    master_jabatan_id: jabatanId,
    kategori: '',
    deskripsi: '',
    tipe_tugas: 'harian',
    is_active: true,
    document: null,
  })
}
function edit(item) {
  editingId.value = item.id
  Object.assign(form, {
    master_jabatan_id: jabatanId,
    kategori: item.kategori,
    deskripsi: item.deskripsi,
    tipe_tugas: item.tipe_tugas,
    is_active: item.is_active,
    document: null,
  })
}
function selectDocument(event) {
  form.document = event.target.files[0] || null
}
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
    const response = await getHrJobdeskPdfPreview(item.id)
    documentPreview.url = pdfBlobUrl(response.data.content_base64, response.data.mime_type)
  } catch (error) {
    closeDocumentPreview()
    errorMessage.value = apiError(error, 'Dokumen jobdesk tidak dapat ditampilkan.')
  } finally {
    loadingDocument.value = false
  }
}
async function save() {
  try {
    const payload = new FormData()
    Object.entries(form).forEach(([key, value]) => {
      if (value !== null) payload.append(key, key === 'is_active' ? (value ? '1' : '0') : value)
    })
    if (editingId.value) payload.append('_method', 'PUT')
    const response = editingId.value
      ? await updateHrJobdesk(editingId.value, payload)
      : await createHrJobdesk(payload)
    message.value = response.data.message
    reset()
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  }
}
async function remove(item) {
  if (
    !(await askConfirmation({
      title: 'Hapus Jobdesk',
      message: 'Hapus jobdesk ini?',
      confirmLabel: 'Hapus',
      color: 'error',
    }))
  )
    return
  try {
    message.value = (await deleteHrJobdesk(item.id)).data.message
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  }
}
onMounted(load)
onBeforeUnmount(closeDocumentPreview)
</script>

<template>
  <section class="space-y-6">
    <div>
      <UButton
        to="/hr/talent/jobdesks"
        label="Kembali ke Daftar Jabatan"
        color="neutral"
        variant="soft"
        icon="i-lucide-arrow-left"
      />
      <h2 class="mt-4 text-2xl font-semibold text-highlighted">
        Jobdesk {{ jabatan?.nama_jabatan || 'Jabatan' }}
      </h2>
      <p class="mt-1 text-sm text-muted">{{ jabatan?.departemen || 'Tanpa departemen' }}</p>
    </div>
    <AlertToastBridge :message="message" :error="errorMessage" />
    <UCard :title="editingId ? 'Ubah Jobdesk' : 'Tambah Jobdesk'">
      <form class="grid gap-4 md:grid-cols-2" @submit.prevent="save">
        <input
          v-model="form.kategori"
          required
          placeholder="Kategori"
          class="rounded-lg border border-default bg-default p-2.5"
        />
        <select v-model="form.tipe_tugas" class="rounded-lg border border-default bg-default p-2.5">
          <option
            v-for="type in ['harian', 'mingguan', 'bulanan', 'tahunan', 'insidental']"
            :key="type"
          >
            {{ type }}
          </option>
        </select>
        <textarea
          v-model="form.deskripsi"
          required
          placeholder="Deskripsi tugas"
          class="rounded-lg border border-default bg-default p-2.5 md:col-span-2"
        ></textarea>
        <label class="text-sm text-muted md:col-span-2">
          Dokumen Jobdesk (opsional, PDF maksimal 10 MB)
          <input
            type="file"
            accept=".pdf,application/pdf"
            class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            @change="selectDocument"
          />
        </label>
        <label class="flex items-center gap-2 text-sm"
          ><input v-model="form.is_active" type="checkbox" /> Aktif</label
        >
        <div class="flex gap-2">
          <UButton
            type="submit"
            :label="editingId ? 'Simpan Perubahan' : 'Tambah Jobdesk'"
          /><UButton v-if="editingId" label="Batal" color="neutral" variant="soft" @click="reset" />
        </div>
      </form>
    </UCard>
    <UCard title="Seluruh Jobdesk Jabatan"
      ><div class="space-y-3">
        <div v-for="item in records" :key="item.id" class="rounded-lg border border-default p-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="font-medium text-highlighted">{{ item.kategori }}</h3>
                <UBadge :label="item.tipe_tugas" variant="subtle" /><UBadge
                  :label="item.is_active ? 'Aktif' : 'Nonaktif'"
                  :color="item.is_active ? 'success' : 'neutral'"
                  variant="subtle"
                />
              </div>
              <p class="mt-2 text-sm text-muted">{{ item.deskripsi }}</p>
            </div>
            <div class="flex gap-2">
              <UButton
                v-if="item.has_document"
                size="xs"
                label="Lihat PDF"
                variant="soft"
                :loading="loadingDocument && documentPreview.jobdeskId === item.id"
                @click="previewDocument(item)"
              /><UButton size="xs" label="Ubah" variant="soft" @click="edit(item)" /><UButton
                size="xs"
                label="Hapus"
                color="error"
                variant="soft"
                @click="remove(item)"
              />
            </div>
          </div>
        </div>
        <p v-if="!records.length" class="py-4 text-center text-sm text-muted">
          Belum ada jobdesk untuk jabatan ini.
        </p>
      </div></UCard
    >
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
            <p class="mt-1 text-sm text-muted">Pratinjau dokumen PDF jobdesk.</p>
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
