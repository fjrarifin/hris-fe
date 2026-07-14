<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  getHrCandidates,
  createHrCandidate,
  updateHrCandidate,
  deleteHrCandidate,
  getHrVacancies,
  uploadHrCandidateResume,
  getHrCandidateResumePreview,
} from '../services/hrService'
import { apiError } from '../utils/formatters'

const candidates = ref([])
const vacancies = ref([])
const selectedVacancyFilter = ref('')
const selectedStatusFilter = ref('')
const search = ref('')
const message = ref('')
const errorMessage = ref('')
const viewMode = ref('pipeline') // 'pipeline' or 'table'
const isSubmitting = ref(false)
const loadingDocument = ref(false)

const documentPreview = reactive({
  open: false,
  title: '',
  url: '',
})

const createDialogOpen = ref(false)
const editDialogOpen = ref(false)

const form = reactive({
  vacancy_id: '',
  name: '',
  email: '',
  phone: '',
  status: 'applied',
  notes: '',
})

const editForm = reactive({
  id: null,
  vacancy_id: '',
  name: '',
  email: '',
  phone: '',
  status: 'applied',
  notes: '',
})

const stages = [
  { key: 'applied', label: 'Applied', color: 'neutral' },
  { key: 'screening', label: 'Screening', color: 'primary' },
  { key: 'interview', label: 'Interview', color: 'warning' },
  { key: 'offered', label: 'Offered', color: 'info' },
  { key: 'hired', label: 'Hired', color: 'success' },
  { key: 'rejected', label: 'Rejected', color: 'danger' },
]

const formControlClass =
  'w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

const filteredCandidates = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return candidates.value.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(keyword) ||
      c.email.toLowerCase().includes(keyword) ||
      (c.phone || '').toLowerCase().includes(keyword)

    const matchesVacancy = !selectedVacancyFilter.value || Number(c.vacancy_id) === Number(selectedVacancyFilter.value)
    const matchesStatus = !selectedStatusFilter.value || c.status === selectedStatusFilter.value

    return matchesSearch && matchesVacancy && matchesStatus
  })
})

const candidatesByStage = computed(() => {
  const grouped = {}
  stages.forEach((s) => {
    grouped[s.key] = []
  })
  filteredCandidates.value.forEach((c) => {
    if (grouped[c.status]) {
      grouped[c.status].push(c)
    }
  })
  return grouped
})

async function load() {
  try {
    const [cRes, vRes] = await Promise.all([getHrCandidates(), getHrVacancies()])
    candidates.value = cRes.data
    vacancies.value = vRes.data
  } catch (error) {
    errorMessage.value = apiError(error)
  }
}

function openCreateDialog() {
  Object.assign(form, {
    vacancy_id: selectedVacancyFilter.value || '',
    name: '',
    email: '',
    phone: '',
    status: 'applied',
    notes: '',
  })
  createDialogOpen.value = true
}

function closeCreateDialog() {
  createDialogOpen.value = false
}

async function saveCandidate() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const response = await createHrCandidate(form)
    message.value = response.data.message || 'Kandidat berhasil ditambahkan.'
    closeCreateDialog()
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    isSubmitting.value = false
  }
}

function openEditDialog(candidate) {
  Object.assign(editForm, {
    id: candidate.id,
    vacancy_id: candidate.vacancy_id || '',
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone || '',
    status: candidate.status,
    notes: candidate.notes || '',
  })
  editDialogOpen.value = true
}

function closeEditDialog() {
  editDialogOpen.value = false
}

async function updateCandidate() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const response = await updateHrCandidate(editForm.id, {
      vacancy_id: editForm.vacancy_id || null,
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      status: editForm.status,
      notes: editForm.notes,
    })
    message.value = response.data.message || 'Kandidat berhasil diperbarui.'
    closeEditDialog()
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    isSubmitting.value = false
  }
}

async function deleteCandidate(candidate) {
  if (!confirm(`Apakah Anda yakin ingin menghapus kandidat "${candidate.name}"?`)) return
  message.value = ''
  errorMessage.value = ''

  try {
    const response = await deleteHrCandidate(candidate.id)
    message.value = response.data.message || 'Kandidat berhasil dihapus.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  }
}

async function updateStage(candidate, newStage) {
  try {
    await updateHrCandidate(candidate.id, {
      vacancy_id: candidate.vacancy_id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      status: newStage,
      notes: candidate.notes,
    })
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  }
}

async function triggerResumeUpload(event, candidate) {
  const file = event.target.files[0]
  if (!file) return

  const formData = new FormData()
  formData.append('resume', file)

  isSubmitting.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const response = await uploadHrCandidateResume(candidate.id, formData)
    message.value = response.data.message || 'Resume berhasil diunggah.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    isSubmitting.value = false
  }
}

function pdfBlobUrl(contentBase64, mimeType) {
  const bytes = Uint8Array.from(atob(contentBase64), (character) => character.charCodeAt(0))
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }))
}

function closeDocumentPreview() {
  if (documentPreview.url) {
    URL.revokeObjectURL(documentPreview.url)
  }
  Object.assign(documentPreview, { open: false, title: '', url: '' })
}

async function previewResume(candidate) {
  closeDocumentPreview()
  Object.assign(documentPreview, {
    open: true,
    title: `Resume - ${candidate.name}`,
    url: '',
  })
  loadingDocument.value = true
  try {
    const response = await getHrCandidateResumePreview(candidate.id)
    documentPreview.url = pdfBlobUrl(response.data.content_base64, response.data.mime_type)
  } catch (error) {
    closeDocumentPreview()
    errorMessage.value = apiError(error, 'Dokumen resume tidak dapat ditampilkan.')
  } finally {
    loadingDocument.value = false
  }
}

function getBadgeColor(status) {
  const stage = stages.find((s) => s.key === status)
  return stage ? stage.color : 'neutral'
}

onMounted(load)
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 class="text-2xl font-semibold text-highlighted">Pipeline Pelamar (Recruitment)</h2>
        <p class="mt-1 text-sm text-muted">Pantau tahapan pelamar kerja dan kelola profil kandidat secara internal.</p>
      </div>
      <div class="flex gap-2">
        <UButton
          size="sm"
          color="neutral"
          variant="soft"
          icon="i-lucide-plus"
          label="Tambah Pelamar"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <!-- Search and Filters -->
    <UCard>
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3 w-full md:max-w-3xl">
          <input
            v-model="search"
            type="search"
            placeholder="Cari nama, email, hp..."
            class="rounded-lg border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <select v-model="selectedVacancyFilter" class="rounded-lg border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
            <option value="">Semua Lowongan</option>
            <option v-for="v in vacancies" :key="v.id" :value="v.id">{{ v.title }}</option>
          </select>
          <select v-if="viewMode === 'table'" v-model="selectedStatusFilter" class="rounded-lg border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
            <option value="">Semua Tahapan</option>
            <option v-for="s in stages" :key="s.key" :value="s.key">{{ s.label }}</option>
          </select>
        </div>

        <div class="flex border border-default rounded-lg overflow-hidden bg-default size-fit">
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition"
            :class="viewMode === 'pipeline' ? 'bg-primary text-white' : 'text-muted hover:bg-muted/10'"
            @click="viewMode = 'pipeline'"
          >
            <span class="i-lucide-kanban size-3.5"></span>
            Pipeline (Kanban)
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition"
            :class="viewMode === 'table' ? 'bg-primary text-white' : 'text-muted hover:bg-muted/10'"
            @click="viewMode = 'table'"
          >
            <span class="i-lucide-list size-3.5"></span>
            Daftar (Tabel)
          </button>
        </div>
      </div>
    </UCard>

    <!-- Pipeline View (Kanban) -->
    <div v-if="viewMode === 'pipeline'" class="flex gap-4 overflow-x-auto pb-4 w-full items-start">
      <div v-for="stage in stages" :key="stage.key" class="bg-muted/10 rounded-2xl border border-default p-4 flex flex-col w-80 shrink-0 max-h-[75vh] shadow-sm">
        <div class="mb-3 flex items-center justify-between border-b border-default pb-2">
          <span class="text-sm font-semibold text-highlighted">{{ stage.label }}</span>
          <UBadge :color="stage.color" variant="soft" size="xs">{{ candidatesByStage[stage.key]?.length || 0 }}</UBadge>
        </div>
        
        <div class="flex-1 overflow-y-auto space-y-3 pr-1">
          <div
            v-for="candidate in candidatesByStage[stage.key]"
            :key="candidate.id"
            class="bg-default border border-default rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-200 group relative flex flex-col gap-2"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-2">
                <div class="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
                  {{ candidate.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() }}
                </div>
                <div>
                  <h4 class="font-semibold text-sm text-highlighted group-hover:text-primary transition-colors leading-tight">
                    {{ candidate.name }}
                  </h4>
                  <p class="text-[11px] text-muted mt-0.5 truncate max-w-[140px]">{{ candidate.email }}</p>
                </div>
              </div>
              <div class="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2.5 top-2.5 bg-default/90 backdrop-blur-sm rounded-lg border border-default p-0.5 flex gap-0.5 shadow-sm">
                <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-pencil" @click="openEditDialog(candidate)" />
                <UButton size="xs" variant="ghost" color="danger" icon="i-lucide-trash-2" @click="deleteCandidate(candidate)" />
              </div>
            </div>
            
            <div class="mt-1 flex flex-wrap gap-1.5">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <span class="i-lucide-briefcase size-2.5"></span>
                {{ candidate.vacancy?.title || 'Umum' }}
              </span>
              <span v-if="candidate.phone" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                <span class="i-lucide-phone size-2.5"></span>
                {{ candidate.phone }}
              </span>
            </div>

            <div class="mt-2 pt-2 border-t border-default flex items-center justify-between text-xs gap-2">
              <!-- Resume Handler -->
              <div class="flex items-center gap-1.5">
                <UButton
                  v-if="candidate.resume_path"
                  size="xs"
                  variant="ghost"
                  icon="i-lucide-file-text"
                  label="CV"
                  @click="previewResume(candidate)"
                />
                <label v-else class="text-primary hover:text-primary-hover text-[11px] font-medium cursor-pointer flex items-center gap-1 hover:underline transition">
                  <span class="i-lucide-upload size-3"></span>
                  Upload CV
                  <input type="file" accept=".pdf" class="hidden" @change="triggerResumeUpload($event, candidate)" />
                </label>
              </div>

              <!-- Quick Status Mover -->
              <div class="relative flex items-center">
                <select
                  v-model="candidate.status"
                  class="appearance-none bg-muted/10 border border-default hover:border-primary/30 rounded-md px-2 py-1 pr-5 text-[11px] text-muted hover:text-primary cursor-pointer outline-none transition"
                  @change="updateStage(candidate, candidate.status)"
                >
                  <option v-for="s in stages" :key="s.key" :value="s.key">{{ s.label }}</option>
                </select>
                <span class="i-lucide-chevron-down size-3 absolute right-1.5 pointer-events-none text-muted"></span>
              </div>
            </div>
          </div>

          <div v-if="!candidatesByStage[stage.key]?.length" class="text-center text-xs text-muted py-8">
            Kosong
          </div>
        </div>
      </div>
    </div>

    <!-- Table View -->
    <div v-else>
      <UCard>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-muted border-b border-default">
                <th class="p-3">Kandidat</th>
                <th class="p-3">Posisi Lowongan</th>
                <th class="p-3">Status Pipeline</th>
                <th class="p-3">CV / Resume</th>
                <th class="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in filteredCandidates" :key="c.id" class="border-t border-default hover:bg-muted/10 transition">
                <td class="p-3">
                  <p class="font-semibold text-highlighted">{{ c.name }}</p>
                  <p class="mt-0.5 text-xs text-muted">{{ c.email }} • {{ c.phone || '-' }}</p>
                </td>
                <td class="p-3 text-highlighted">{{ c.vacancy?.title || 'Umum (Tanpa Lowongan)' }}</td>
                <td class="p-3">
                  <UBadge :color="getBadgeColor(c.status)" variant="soft">
                    {{ c.status.toUpperCase() }}
                  </UBadge>
                </td>
                <td class="p-3">
                  <div class="flex items-center gap-2">
                    <UButton
                      v-if="c.resume_path"
                      size="xs"
                      variant="soft"
                      icon="i-lucide-eye"
                      label="Lihat CV"
                      @click="previewResume(c)"
                    />
                    <label class="cursor-pointer">
                      <span class="inline-flex items-center gap-1 text-xs text-primary border border-primary/20 bg-primary/5 rounded px-2 py-1 hover:bg-primary/10 transition">
                        <span class="i-lucide-upload size-3"></span>
                        Upload
                      </span>
                      <input type="file" accept=".pdf" class="hidden" @change="triggerResumeUpload($event, c)" />
                    </label>
                  </div>
                </td>
                <td class="p-3 text-right space-x-2">
                  <UButton size="xs" variant="soft" icon="i-lucide-pencil" label="Edit" @click="openEditDialog(c)" />
                  <UButton size="xs" variant="soft" color="danger" icon="i-lucide-trash-2" label="Hapus" @click="deleteCandidate(c)" />
                </td>
              </tr>
              <tr v-if="!filteredCandidates.length">
                <td colspan="5" class="p-6 text-center text-muted">Kandidat tidak ditemukan.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </div>

    <!-- Create Candidate Dialog -->
    <div
      v-if="createDialogOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Tambah pelamar baru"
    >
      <button type="button" class="absolute inset-0 bg-slate-950/60" @click="closeCreateDialog"></button>
      <UCard class="relative max-h-[88vh] w-full max-w-lg overflow-hidden">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-highlighted">Tambah Pelamar Kerja</p>
              <p class="mt-1 text-xs text-muted">Input profil pelamar baru secara internal.</p>
            </div>
            <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-x" @click="closeCreateDialog" />
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="saveCandidate">
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Nama Pelamar</label>
            <input v-model="form.name" required placeholder="Nama lengkap" :class="formControlClass" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Email</label>
            <input v-model="form.email" type="email" required placeholder="email@domain.com" :class="formControlClass" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Nomor Telepon / HP</label>
            <input v-model="form.phone" placeholder="08xxxxxxxxx" :class="formControlClass" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Posisi Lowongan</label>
            <select v-model="form.vacancy_id" :class="formControlClass">
              <option value="">Umum (Tanpa lowongan spesifik)</option>
              <option v-for="v in vacancies" :key="v.id" :value="v.id">{{ v.title }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Tahapan Pipeline</label>
            <select v-model="form.status" :class="formControlClass">
              <option v-for="s in stages" :key="s.key" :value="s.key">{{ s.label }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Catatan Pelamar</label>
            <textarea v-model="form.notes" rows="3" placeholder="Informasi tambahan, kualifikasi, dll." :class="formControlClass"></textarea>
          </div>
          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton type="button" label="Batal" color="neutral" variant="ghost" @click="closeCreateDialog" />
            <UButton type="submit" label="Simpan Pelamar" :loading="isSubmitting" />
          </div>
        </form>
      </UCard>
    </div>

    <!-- Edit Candidate Dialog -->
    <div
      v-if="editDialogOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Edit detail pelamar"
    >
      <button type="button" class="absolute inset-0 bg-slate-950/60" @click="closeEditDialog"></button>
      <UCard class="relative max-h-[88vh] w-full max-w-lg overflow-hidden">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-highlighted">Edit Data Pelamar</p>
              <p class="mt-1 text-xs text-muted">Perbarui profil dan catatan pelamar.</p>
            </div>
            <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-x" @click="closeEditDialog" />
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="updateCandidate">
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Nama Pelamar</label>
            <input v-model="editForm.name" required :class="formControlClass" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Email</label>
            <input v-model="editForm.email" type="email" required :class="formControlClass" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Nomor Telepon / HP</label>
            <input v-model="editForm.phone" :class="formControlClass" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Posisi Lowongan</label>
            <select v-model="editForm.vacancy_id" :class="formControlClass">
              <option value="">Umum (Tanpa lowongan spesifik)</option>
              <option v-for="v in vacancies" :key="v.id" :value="v.id">{{ v.title }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Tahapan Pipeline</label>
            <select v-model="editForm.status" :class="formControlClass">
              <option v-for="s in stages" :key="s.key" :value="s.key">{{ s.label }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Catatan & Evaluasi HRD</label>
            <textarea v-model="editForm.notes" rows="4" :class="formControlClass"></textarea>
          </div>
          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton type="button" label="Batal" color="neutral" variant="ghost" @click="closeEditDialog" />
            <UButton type="submit" label="Simpan Perubahan" :loading="isSubmitting" />
          </div>
        </form>
      </UCard>
    </div>

    <!-- CV Document Preview Modal -->
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
        aria-label="Tutup pratinjau resume"
        @click="closeDocumentPreview"
      ></button>
      <UCard class="relative h-[85vh] w-full overflow-hidden lg:w-2/3">
        <div class="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold text-highlighted">{{ documentPreview.title }}</h3>
            <p class="mt-1 text-sm text-muted">Pratinjau CV/Resume pelamar.</p>
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
          Memuat dokumen resume...
        </div>
        <iframe
          v-else-if="documentPreview.url"
          :src="documentPreview.url"
          class="h-[calc(85vh-100px)] w-full rounded-md border border-default"
        ></iframe>
      </UCard>
    </div>
  </section>
</template>
