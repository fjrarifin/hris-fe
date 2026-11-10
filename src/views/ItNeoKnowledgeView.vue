<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  convertNeoUnresolvedToFaq,
  createNeoFaq,
  createNeoKnowledge,
  deleteNeoFaq,
  deleteNeoKnowledge,
  deleteNeoUnresolved,
  getNeoFaqs,
  getNeoKnowledge,
  getNeoKnowledgeRevisions,
  getNeoUnresolved,
  restoreNeoKnowledgeRevision,
  testNeoFaqMatch,
  updateNeoFaq,
  updateNeoKnowledge,
  updateNeoUnresolved,
} from '../services/neoKnowledgeService'
import { notifier } from '../utils/notifications'
import { askConfirmation } from '../utils/confirmDialog'
import { apiError, formatDateTime } from '../utils/formatters'

// Tabs: 'knowledge' | 'faqs' | 'unresolved' | 'guide'
const activeTab = ref('knowledge')

// -------------------------------------------------------------
// TAB 1: BASIC KNOWLEDGE STATE
// -------------------------------------------------------------
const knowledgeSections = ref([])
const knowledgeKpi = ref({
  total_count: 0,
  active_count: 0,
  active_chars: 0,
  char_limit: 30000,
})
const knowledgeLoading = ref(false)
const knowledgeSearch = ref('')

const filteredKnowledge = computed(() => {
  const q = knowledgeSearch.value.trim().toLowerCase()
  if (!q) return knowledgeSections.value
  return knowledgeSections.value.filter(
    (s) =>
      s.title?.toLowerCase().includes(q) ||
      s.section_key?.toLowerCase().includes(q) ||
      s.content?.toLowerCase().includes(q),
  )
})

const knowledgeModalOpen = ref(false)
const knowledgeModalMode = ref('create') // 'create' | 'edit'
const knowledgeSaving = ref(false)
const knowledgeFormErrors = ref({})
const knowledgeForm = ref({
  id: null,
  title: '',
  content: '',
  sort_order: 10,
  is_active: true,
})

// Revisions Modal
const revisionsModalOpen = ref(false)
const revisionsLoading = ref(false)
const currentSectionRevisions = ref([])
const currentRevisionSection = ref(null)

// -------------------------------------------------------------
// TAB 2: FAQ BOT STATE
// -------------------------------------------------------------
const faqs = ref([])
const faqsKpi = ref({ total_count: 0, active_count: 0, inactive_count: 0 })
const faqsLoading = ref(false)
const faqsSearch = ref('')
const faqsStatusFilter = ref('')
const faqsPage = ref(1)
const faqsPerPage = ref(15)
const faqsMeta = ref({ current_page: 1, last_page: 1, total: 0 })

const faqModalOpen = ref(false)
const faqModalMode = ref('create')
const faqSaving = ref(false)
const faqFormErrors = ref({})
const faqForm = ref({
  id: null,
  topic: '',
  keywords: '',
  answer: '',
  priority: 0,
  max_user_level: 3,
  match_type: 'contains',
  is_active: true,
})

// FAQ Simulator / Test
const testModalOpen = ref(false)
const testQuestion = ref('')
const testLevel = ref(3)
const testingFaq = ref(false)
const testResult = ref(null)

// -------------------------------------------------------------
// TAB 3: UNRESOLVED QUERIES STATE
// -------------------------------------------------------------
const unresolvedList = ref([])
const unresolvedKpi = ref({ pending_count: 0, resolved_count: 0, ignored_count: 0 })
const unresolvedLoading = ref(false)
const unresolvedSearch = ref('')
const unresolvedStatusFilter = ref('pending')
const unresolvedPage = ref(1)
const unresolvedPerPage = ref(15)
const unresolvedMeta = ref({ current_page: 1, last_page: 1, total: 0 })

// Edit Unresolved Modal
const unresolvedModalOpen = ref(false)
const unresolvedSaving = ref(false)
const unresolvedForm = ref({
  id: null,
  question: '',
  sender_name: '',
  sender_phone: '',
  status: 'pending',
  admin_notes: '',
})

// Convert to FAQ Modal
const toFaqModalOpen = ref(false)
const toFaqSaving = ref(false)
const toFaqErrors = ref({})
const toFaqForm = ref({
  unresolved_id: null,
  topic: '',
  keywords: '',
  answer: '',
  priority: 10,
  max_user_level: 3,
  match_type: 'contains',
})

// -------------------------------------------------------------
// METHODS: KNOWLEDGE
// -------------------------------------------------------------
async function fetchKnowledge() {
  knowledgeLoading.value = true
  try {
    const { data } = await getNeoKnowledge()
    knowledgeSections.value = data.data || []
    if (data.kpi) {
      knowledgeKpi.value = data.kpi
    }
  } catch (err) {
    notifier.error(apiError(err, 'Gagal memuat basic knowledge Neo.'))
  } finally {
    knowledgeLoading.value = false
  }
}

function openCreateKnowledge() {
  knowledgeModalMode.value = 'create'
  knowledgeFormErrors.value = {}
  knowledgeForm.value = {
    id: null,
    title: '',
    content: '',
    sort_order: (knowledgeSections.value.length + 1) * 10,
    is_active: true,
  }
  knowledgeModalOpen.value = true
}

function openEditKnowledge(item) {
  knowledgeModalMode.value = 'edit'
  knowledgeFormErrors.value = {}
  knowledgeForm.value = {
    id: item.id,
    title: item.title,
    content: item.content,
    sort_order: item.sort_order ?? 0,
    is_active: Boolean(item.is_active),
  }
  knowledgeModalOpen.value = true
}

async function handleSaveKnowledge() {
  knowledgeFormErrors.value = {}
  knowledgeSaving.value = true

  const payload = {
    title: knowledgeForm.value.title.trim(),
    content: knowledgeForm.value.content.trim(),
    sort_order: Number(knowledgeForm.value.sort_order || 0),
    is_active: knowledgeForm.value.is_active,
  }

  try {
    if (knowledgeModalMode.value === 'create') {
      await createNeoKnowledge(payload)
      notifier.success('Seksi knowledge berhasil ditambahkan.')
    } else {
      await updateNeoKnowledge(knowledgeForm.value.id, payload)
      notifier.success('Seksi knowledge berhasil diperbarui & riwayat tersimpan.')
    }
    knowledgeModalOpen.value = false
    await fetchKnowledge()
  } catch (err) {
    if (err.response?.status === 422 && err.response?.data?.errors) {
      knowledgeFormErrors.value = err.response.data.errors
    } else {
      notifier.error(apiError(err, 'Gagal menyimpan seksi knowledge.'))
    }
  } finally {
    knowledgeSaving.value = false
  }
}

async function handleDeleteKnowledge(item) {
  const confirmed = await askConfirmation({
    title: 'Hapus Seksi Knowledge',
    message: `Apakah Anda yakin ingin menghapus seksi "${item.title}"? Perubahan akan langsung mempengaruhi jawaban AI Neo.`,
    color: 'error',
    confirmLabel: 'Ya, Hapus',
    cancelLabel: 'Batal',
  })

  if (!confirmed) return

  try {
    await deleteNeoKnowledge(item.id)
    notifier.success('Seksi knowledge berhasil dihapus.')
    await fetchKnowledge()
  } catch (err) {
    notifier.error(apiError(err, 'Gagal menghapus seksi.'))
  }
}

async function openRevisions(item) {
  currentRevisionSection.value = item
  revisionsLoading.value = true
  revisionsModalOpen.value = true
  try {
    const { data } = await getNeoKnowledgeRevisions(item.id)
    currentSectionRevisions.value = data.data || []
  } catch (err) {
    notifier.error(apiError(err, 'Gagal memuat riwayat revisi.'))
  } finally {
    revisionsLoading.value = false
  }
}

async function handleRestoreRevision(rev) {
  const confirmed = await askConfirmation({
    title: 'Pulihkan Revisi Lama',
    message: `Apakah Anda yakin ingin memulihkan seksi ini ke versi tanggal ${formatDateTime(rev.created_at)}?`,
    color: 'warning',
    confirmLabel: 'Ya, Pulihkan',
    cancelLabel: 'Batal',
  })

  if (!confirmed) return

  try {
    await restoreNeoKnowledgeRevision(currentRevisionSection.value.id, rev.id)
    notifier.success('Revisi berhasil dipulihkan.')
    revisionsModalOpen.value = false
    await fetchKnowledge()
  } catch (err) {
    notifier.error(apiError(err, 'Gagal memulihkan revisi.'))
  }
}

// -------------------------------------------------------------
// METHODS: FAQ
// -------------------------------------------------------------
async function fetchFaqs() {
  faqsLoading.value = true
  try {
    const { data } = await getNeoFaqs({
      search: faqsSearch.value,
      status: faqsStatusFilter.value,
      page: faqsPage.value,
      per_page: faqsPerPage.value,
    })
    faqs.value = data.data || []
    faqsMeta.value = data.meta || { current_page: 1, last_page: 1, total: 0 }
    if (data.kpi) {
      faqsKpi.value = data.kpi
    }
  } catch (err) {
    notifier.error(apiError(err, 'Gagal memuat daftar FAQ bot.'))
  } finally {
    faqsLoading.value = false
  }
}

function openCreateFaq() {
  faqModalMode.value = 'create'
  faqFormErrors.value = {}
  faqForm.value = {
    id: null,
    topic: '',
    keywords: '',
    answer: '',
    priority: 0,
    max_user_level: 3,
    match_type: 'contains',
    is_active: true,
  }
  faqModalOpen.value = true
}

function openEditFaq(item) {
  faqModalMode.value = 'edit'
  faqFormErrors.value = {}
  faqForm.value = {
    id: item.id,
    topic: item.topic || '',
    keywords: item.keywords || '',
    answer: item.answer || '',
    priority: item.priority ?? 0,
    max_user_level: item.max_user_level ?? 3,
    match_type: item.match_type || 'contains',
    is_active: Boolean(item.is_active),
  }
  faqModalOpen.value = true
}

async function handleSaveFaq() {
  faqFormErrors.value = {}
  faqSaving.value = true

  const payload = {
    topic: faqForm.value.topic.trim() || null,
    keywords: faqForm.value.keywords.trim(),
    answer: faqForm.value.answer.trim(),
    priority: Number(faqForm.value.priority || 0),
    max_user_level: Number(faqForm.value.max_user_level ?? 3),
    match_type: faqForm.value.match_type,
    is_active: faqForm.value.is_active,
  }

  try {
    if (faqModalMode.value === 'create') {
      await createNeoFaq(payload)
      notifier.success('FAQ berhasil ditambahkan.')
    } else {
      await updateNeoFaq(faqForm.value.id, payload)
      notifier.success('FAQ berhasil diperbarui.')
    }
    faqModalOpen.value = false
    await fetchFaqs()
  } catch (err) {
    if (err.response?.status === 422 && err.response?.data?.errors) {
      faqFormErrors.value = err.response.data.errors
    } else {
      notifier.error(apiError(err, 'Gagal menyimpan FAQ.'))
    }
  } finally {
    faqSaving.value = false
  }
}

async function handleDeleteFaq(item) {
  const confirmed = await askConfirmation({
    title: 'Hapus FAQ',
    message: `Apakah Anda yakin ingin menghapus FAQ "${item.topic || item.keywords}"?`,
    color: 'error',
    confirmLabel: 'Ya, Hapus',
    cancelLabel: 'Batal',
  })

  if (!confirmed) return

  try {
    await deleteNeoFaq(item.id)
    notifier.success('FAQ berhasil dihapus.')
    await fetchFaqs()
  } catch (err) {
    notifier.error(apiError(err, 'Gagal menghapus FAQ.'))
  }
}

function openSimulator() {
  testQuestion.value = ''
  testLevel.value = 3
  testResult.value = null
  testModalOpen.value = true
}

async function runSimulator() {
  if (!testQuestion.value.trim()) return
  testingFaq.value = true
  testResult.value = null
  try {
    const { data } = await testNeoFaqMatch({
      question: testQuestion.value.trim(),
      level: Number(testLevel.value),
    })
    testResult.value = data
  } catch (err) {
    notifier.error(apiError(err, 'Gagal menguji simulasi FAQ.'))
  } finally {
    testingFaq.value = false
  }
}

// -------------------------------------------------------------
// METHODS: UNRESOLVED
// -------------------------------------------------------------
async function fetchUnresolved() {
  unresolvedLoading.value = true
  try {
    const { data } = await getNeoUnresolved({
      search: unresolvedSearch.value,
      status: unresolvedStatusFilter.value,
      page: unresolvedPage.value,
      per_page: unresolvedPerPage.value,
    })
    unresolvedList.value = data.data || []
    unresolvedMeta.value = data.meta || { current_page: 1, last_page: 1, total: 0 }
    if (data.kpi) {
      unresolvedKpi.value = data.kpi
    }
  } catch (err) {
    notifier.error(apiError(err, 'Gagal memuat pertanyaan belum terjawab.'))
  } finally {
    unresolvedLoading.value = false
  }
}

function openEditUnresolved(item) {
  unresolvedForm.value = {
    id: item.id,
    question: item.question,
    sender_name: item.sender_name || '-',
    sender_phone: item.sender_phone || '-',
    status: item.status || 'pending',
    admin_notes: item.admin_notes || '',
  }
  unresolvedModalOpen.value = true
}

async function handleSaveUnresolved() {
  unresolvedSaving.value = true
  try {
    await updateNeoUnresolved(unresolvedForm.value.id, {
      status: unresolvedForm.value.status,
      admin_notes: unresolvedForm.value.admin_notes.trim() || null,
    })
    notifier.success('Catatan pertanyaan berhasil disimpan.')
    unresolvedModalOpen.value = false
    await fetchUnresolved()
  } catch (err) {
    notifier.error(apiError(err, 'Gagal memperbarui catatan.'))
  } finally {
    unresolvedSaving.value = false
  }
}

async function handleDeleteUnresolved(item) {
  const confirmed = await askConfirmation({
    title: 'Hapus Catatan Pertanyaan',
    message: `Hapus log pertanyaan "${item.question.slice(0, 60)}..." dari daftar evaluasi?`,
    color: 'error',
    confirmLabel: 'Ya, Hapus',
    cancelLabel: 'Batal',
  })

  if (!confirmed) return

  try {
    await deleteNeoUnresolved(item.id)
    notifier.success('Pertanyaan berhasil dihapus.')
    await fetchUnresolved()
  } catch (err) {
    notifier.error(apiError(err, 'Gagal menghapus pertanyaan.'))
  }
}

function openToFaq(item) {
  toFaqErrors.value = {}
  toFaqForm.value = {
    unresolved_id: item.id,
    topic: item.question.slice(0, 50),
    keywords: item.question
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 4)
      .join(' ')
      .toLowerCase(),
    answer: '',
    priority: 10,
    max_user_level: 3,
    match_type: 'contains',
  }
  toFaqModalOpen.value = true
}

async function handleConvertToFaq() {
  toFaqErrors.value = {}
  toFaqSaving.value = true

  const payload = {
    topic: toFaqForm.value.topic.trim() || null,
    keywords: toFaqForm.value.keywords.trim(),
    answer: toFaqForm.value.answer.trim(),
    priority: Number(toFaqForm.value.priority || 0),
    max_user_level: Number(toFaqForm.value.max_user_level ?? 3),
    match_type: toFaqForm.value.match_type,
  }

  try {
    await convertNeoUnresolvedToFaq(toFaqForm.value.unresolved_id, payload)
    notifier.success('FAQ baru berhasil dibuat dan pertanyaan ditandai selesai!')
    toFaqModalOpen.value = false
    await fetchUnresolved()
    if (faqs.value.length) {
      await fetchFaqs()
    }
  } catch (err) {
    if (err.response?.status === 422 && err.response?.data?.errors) {
      toFaqErrors.value = err.response.data.errors
    } else {
      notifier.error(apiError(err, 'Gagal membuat FAQ dari pertanyaan ini.'))
    }
  } finally {
    toFaqSaving.value = false
  }
}

// -------------------------------------------------------------
// WATCHERS
// -------------------------------------------------------------
let faqSearchTimer = null
watch([faqsSearch, faqsStatusFilter], () => {
  clearTimeout(faqSearchTimer)
  faqSearchTimer = setTimeout(() => {
    faqsPage.value = 1
    fetchFaqs()
  }, 300)
})

watch(faqsPage, () => {
  fetchFaqs()
})

let unresSearchTimer = null
watch([unresolvedSearch, unresolvedStatusFilter], () => {
  clearTimeout(unresSearchTimer)
  unresSearchTimer = setTimeout(() => {
    unresolvedPage.value = 1
    fetchUnresolved()
  }, 300)
})

watch(unresolvedPage, () => {
  fetchUnresolved()
})

watch(activeTab, (tab) => {
  if (tab === 'knowledge' && !knowledgeSections.value.length) {
    fetchKnowledge()
  } else if (tab === 'faqs' && !faqs.value.length) {
    fetchFaqs()
  } else if (tab === 'unresolved' && !unresolvedList.value.length) {
    fetchUnresolved()
  }
})

onMounted(() => {
  fetchKnowledge()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header Section -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex items-center gap-2.5">
          <h1 class="text-2xl font-bold tracking-tight text-highlighted">
            Neo Knowledge Hub
          </h1>
          <UBadge color="primary" variant="subtle" size="sm" class="font-semibold">
            Agent HRIS AI
          </UBadge>
        </div>
        <p class="mt-1 text-sm text-muted">
          Pusat kendali pengetahuan, SOP resmi, FAQ deterministik, dan memori percakapan asisten WhatsApp Neo.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <UButton
          v-if="activeTab === 'knowledge'"
          color="primary"
          class="cursor-pointer font-semibold"
          @click="openCreateKnowledge"
        >
          <template #leading>
            <UIcon name="i-lucide-plus" class="size-4" />
          </template>
          Tambah Seksi SOP
        </UButton>

        <UButton
          v-if="activeTab === 'faqs'"
          color="neutral"
          variant="outline"
          class="cursor-pointer font-medium"
          @click="openSimulator"
        >
          <template #leading>
            <UIcon name="i-lucide-play" class="size-4 text-primary" />
          </template>
          Uji Simulator FAQ
        </UButton>

        <UButton
          v-if="activeTab === 'faqs'"
          color="primary"
          class="cursor-pointer font-semibold"
          @click="openCreateFaq"
        >
          <template #leading>
            <UIcon name="i-lucide-plus" class="size-4" />
          </template>
          Tambah FAQ Baru
        </UButton>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex border-b border-default overflow-x-auto">
      <button
        type="button"
        class="flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
        :class="activeTab === 'knowledge' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-highlighted'"
        @click="activeTab = 'knowledge'"
      >
        <UIcon name="i-lucide-book-open" class="size-4" />
        Basic Knowledge (SOP & Manual)
      </button>

      <button
        type="button"
        class="flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
        :class="activeTab === 'faqs' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-highlighted'"
        @click="activeTab = 'faqs'"
      >
        <UIcon name="i-lucide-message-square" class="size-4" />
        FAQ Bot WhatsApp (Pencocokan Cepat)
      </button>

      <button
        type="button"
        class="flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
        :class="activeTab === 'unresolved' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-highlighted'"
        @click="activeTab = 'unresolved'"
      >
        <UIcon name="i-lucide-help-circle" class="size-4" />
        Pertanyaan Belum Terjawab
        <span
          v-if="unresolvedKpi.pending_count > 0"
          class="ml-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400"
        >
          {{ unresolvedKpi.pending_count }}
        </span>
      </button>

      <button
        type="button"
        class="flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
        :class="activeTab === 'guide' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-highlighted'"
        @click="activeTab = 'guide'"
      >
        <UIcon name="i-lucide-cpu" class="size-4" />
        Panduan & Eksekusi Neo
      </button>
    </div>

    <!-- ============================================================= -->
    <!-- TAB 1: BASIC KNOWLEDGE                                        -->
    <!-- ============================================================= -->
    <div v-if="activeTab === 'knowledge'" class="space-y-4">
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-muted">Total Seksi SOP</p>
              <h3 class="mt-2 text-2xl font-bold text-highlighted">{{ knowledgeKpi.total_count }}</h3>
            </div>
            <div class="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <UIcon name="i-lucide-layers" class="size-6" />
            </div>
          </div>
        </UCard>

        <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-muted">Seksi Aktif</p>
              <h3 class="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{{ knowledgeKpi.active_count }}</h3>
            </div>
            <div class="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <UIcon name="i-lucide-check-circle" class="size-6" />
            </div>
          </div>
        </UCard>

        <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-muted">Total Karakter Masuk AI</p>
              <h3 class="mt-2 text-2xl font-bold text-highlighted">
                {{ Number(knowledgeKpi.active_chars || 0).toLocaleString('id-ID') }}
              </h3>
            </div>
            <div class="flex size-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <UIcon name="i-lucide-file-text" class="size-6" />
            </div>
          </div>
        </UCard>

        <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-muted">Status Kapasitas Prompt</p>
              <h3
                class="mt-2 text-sm font-bold"
                :class="knowledgeKpi.active_chars > knowledgeKpi.char_limit ? 'text-amber-500' : 'text-emerald-600'"
              >
                {{ knowledgeKpi.active_chars > knowledgeKpi.char_limit ? 'Melebihi Rekomendasi' : 'Optimal & Aman' }}
              </h3>
              <p class="mt-0.5 text-[11px] text-muted">Batas aman: {{ knowledgeKpi.char_limit.toLocaleString('id-ID') }} char</p>
            </div>
            <div class="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <UIcon name="i-lucide-shield-check" class="size-6" />
            </div>
          </div>
        </UCard>
      </div>

      <!-- Toolbar -->
      <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] p-2">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <UInput
            v-model="knowledgeSearch"
            placeholder="Cari judul seksi, kata kunci SOP..."
            class="w-full max-w-sm"
          >
            <template #leading>
              <UIcon name="i-lucide-search" class="size-4 text-muted" />
            </template>
          </UInput>
          <span class="text-xs text-muted">
            Menampilkan {{ filteredKnowledge.length }} dari {{ knowledgeSections.length }} seksi SOP
          </span>
        </div>
      </UCard>

      <!-- Knowledge Sections List -->
      <div v-if="knowledgeLoading" class="py-12 text-center text-muted">
        <UIcon name="i-lucide-loader-2" class="size-6 animate-spin mx-auto text-primary" />
        <p class="mt-2 text-xs">Memuat daftar seksi knowledge...</p>
      </div>

      <div v-else-if="filteredKnowledge.length === 0" class="py-12 text-center text-muted">
        <UIcon name="i-lucide-book-x" class="size-8 mx-auto text-muted/50" />
        <p class="mt-2 text-sm font-medium">Tidak ada seksi knowledge ditemukan</p>
      </div>

      <div v-else class="space-y-3">
        <UCard
          v-for="item in filteredKnowledge"
          :key="item.id"
          class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs transition-colors hover:border-primary/40"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-bold text-primary">#{{ item.sort_order }}</span>
                <h3 class="font-bold text-highlighted text-base">{{ item.title }}</h3>
                <UBadge
                  :color="item.is_active ? 'success' : 'neutral'"
                  variant="subtle"
                  size="xs"
                  class="font-semibold"
                >
                  {{ item.is_active ? 'Aktif' : 'Non-Aktif' }}
                </UBadge>
              </div>
              <p class="mt-1 text-xs font-mono text-muted">
                Key: {{ item.section_key }} • {{ item.content_length.toLocaleString('id-ID') }} karakter
                <span v-if="item.updated_by">• Diperbarui oleh @{{ item.updated_by }} ({{ formatDateTime(item.updated_at) }})</span>
              </p>
              <div class="mt-3 max-h-24 overflow-hidden rounded border border-default/60 bg-muted/10 p-2.5 text-xs text-muted font-mono whitespace-pre-wrap">
                {{ item.content.slice(0, 350) }}{{ item.content.length > 350 ? '...' : '' }}
              </div>
            </div>

            <div class="flex items-center gap-1.5 self-end sm:self-start">
              <UButton
                size="xs"
                color="neutral"
                variant="outline"
                class="cursor-pointer"
                title="Lihat Riwayat Revisi"
                @click="openRevisions(item)"
              >
                <UIcon name="i-lucide-history" class="size-3.5" />
                Revisi
              </UButton>

              <UButton
                size="xs"
                color="primary"
                variant="solid"
                class="cursor-pointer"
                title="Edit Seksi"
                @click="openEditKnowledge(item)"
              >
                <UIcon name="i-lucide-pencil" class="size-3.5" />
                Edit
              </UButton>

              <UButton
                size="xs"
                color="error"
                variant="ghost"
                class="cursor-pointer text-red-500 hover:text-red-600"
                title="Hapus Seksi"
                @click="handleDeleteKnowledge(item)"
              >
                <UIcon name="i-lucide-trash-2" class="size-3.5" />
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- TAB 2: FAQ BOT WHATSAPP                                       -->
    <!-- ============================================================= -->
    <div v-if="activeTab === 'faqs'" class="space-y-4">
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-muted">Total FAQ</p>
              <h3 class="mt-2 text-2xl font-bold text-highlighted">{{ faqsKpi.total_count }}</h3>
            </div>
            <div class="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <UIcon name="i-lucide-message-square" class="size-6" />
            </div>
          </div>
        </UCard>

        <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-muted">FAQ Aktif</p>
              <h3 class="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{{ faqsKpi.active_count }}</h3>
            </div>
            <div class="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <UIcon name="i-lucide-check-circle-2" class="size-6" />
            </div>
          </div>
        </UCard>

        <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-muted">FAQ Non-Aktif</p>
              <h3 class="mt-2 text-2xl font-bold text-slate-500">{{ faqsKpi.inactive_count }}</h3>
            </div>
            <div class="flex size-12 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-500">
              <UIcon name="i-lucide-x-circle" class="size-6" />
            </div>
          </div>
        </UCard>
      </div>

      <!-- Toolbar -->
      <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] p-2">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-1 items-center gap-2.5">
            <UInput
              v-model="faqsSearch"
              placeholder="Cari kata kunci, topik, atau isi jawaban FAQ..."
              class="w-full max-w-sm"
            >
              <template #leading>
                <UIcon name="i-lucide-search" class="size-4 text-muted" />
              </template>
            </UInput>

            <select
              v-model="faqsStatusFilter"
              class="rounded-md border border-default bg-default px-3 py-2 text-xs font-medium text-highlighted focus:border-primary focus:outline-none"
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Non-Aktif</option>
            </select>
          </div>
        </div>
      </UCard>

      <!-- FAQs Table Card -->
      <UCard class="overflow-hidden border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-default bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th class="px-4 py-3.5">Prioritas</th>
                <th class="px-4 py-3.5">Topik & Kata Kunci</th>
                <th class="px-4 py-3.5">Tipe & Level</th>
                <th class="px-4 py-3.5">Jawaban Bot</th>
                <th class="px-4 py-3.5 text-center">Status</th>
                <th class="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-if="faqsLoading">
                <td colspan="6" class="py-12 text-center text-muted">
                  <UIcon name="i-lucide-loader-2" class="size-6 animate-spin mx-auto text-primary" />
                  <p class="mt-2 text-xs">Memuat daftar FAQ...</p>
                </td>
              </tr>

              <tr v-else-if="faqs.length === 0">
                <td colspan="6" class="py-12 text-center text-muted">
                  <UIcon name="i-lucide-message-square-dashed" class="size-8 mx-auto text-muted/50" />
                  <p class="mt-2 text-sm font-medium">Belum ada FAQ bot terdaftar</p>
                </td>
              </tr>

              <tr
                v-for="faq in faqs"
                v-else
                :key="faq.id"
                class="hover:bg-muted/30 transition-colors"
              >
                <td class="px-4 py-3.5 font-mono text-xs font-bold text-primary">
                  {{ faq.priority ?? 0 }}
                </td>
                <td class="px-4 py-3.5 max-w-xs">
                  <div class="font-bold text-highlighted">{{ faq.topic || '(Tanpa Judul Topik)' }}</div>
                  <div class="mt-1 flex flex-wrap gap-1">
                    <span
                      v-for="(kw, idx) in (faq.keywords || '').split(',').map(s => s.trim()).filter(Boolean)"
                      :key="idx"
                      class="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-primary font-semibold"
                    >
                      {{ kw }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3.5 whitespace-nowrap">
                  <UBadge color="neutral" variant="subtle" size="xs">
                    {{ faq.match_type === 'exact' ? 'Sama Persis' : 'Mengandung Kata' }}
                  </UBadge>
                  <div class="mt-1 text-[11px] text-muted">
                    Level &le; {{ faq.max_user_level === 3 ? 'Semua (3)' : faq.max_user_level === 2 ? 'HRD & IT (2)' : 'IT (0)' }}
                  </div>
                </td>
                <td class="px-4 py-3.5 text-xs text-muted max-w-md">
                  <div class="line-clamp-3 whitespace-pre-wrap font-sans text-highlighted">{{ faq.answer }}</div>
                </td>
                <td class="px-4 py-3.5 text-center whitespace-nowrap">
                  <UBadge
                    :color="faq.is_active ? 'success' : 'neutral'"
                    variant="subtle"
                    size="sm"
                    class="font-semibold"
                  >
                    {{ faq.is_active ? 'Aktif' : 'Non-Aktif' }}
                  </UBadge>
                </td>
                <td class="px-4 py-3.5 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-1">
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      class="cursor-pointer"
                      title="Edit FAQ"
                      @click="openEditFaq(faq)"
                    >
                      <UIcon name="i-lucide-pencil" class="size-3.5" />
                    </UButton>

                    <UButton
                      size="xs"
                      color="error"
                      variant="ghost"
                      class="cursor-pointer text-red-500 hover:text-red-600"
                      title="Hapus FAQ"
                      @click="handleDeleteFaq(faq)"
                    >
                      <UIcon name="i-lucide-trash-2" class="size-3.5" />
                    </UButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="faqsMeta.total > faqsMeta.per_page" class="flex items-center justify-between border-t border-default p-4">
          <p class="text-xs text-muted">
            Menampilkan {{ faqs.length }} dari total {{ faqsMeta.total }} FAQ
          </p>
          <UPagination
            v-model="faqsPage"
            :page-count="faqsMeta.per_page"
            :total="faqsMeta.total"
          />
        </div>
      </UCard>
    </div>

    <!-- ============================================================= -->
    <!-- TAB 3: PERTANYAAN BELUM TERJAWAB (UNRESOLVED MEMORY)          -->
    <!-- ============================================================= -->
    <div v-if="activeTab === 'unresolved'" class="space-y-4">
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-muted">Menunggu Evaluasi</p>
              <h3 class="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">{{ unresolvedKpi.pending_count }}</h3>
            </div>
            <div class="flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <UIcon name="i-lucide-clock" class="size-6" />
            </div>
          </div>
        </UCard>

        <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-muted">Sudah Dituntaskan</p>
              <h3 class="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{{ unresolvedKpi.resolved_count }}</h3>
            </div>
            <div class="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <UIcon name="i-lucide-check-check" class="size-6" />
            </div>
          </div>
        </UCard>

        <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-muted">Diabaikan</p>
              <h3 class="mt-2 text-2xl font-bold text-slate-500">{{ unresolvedKpi.ignored_count }}</h3>
            </div>
            <div class="flex size-12 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-500">
              <UIcon name="i-lucide-eye-off" class="size-6" />
            </div>
          </div>
        </UCard>
      </div>

      <!-- Toolbar -->
      <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] p-2">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-1 items-center gap-2.5">
            <UInput
              v-model="unresolvedSearch"
              placeholder="Cari isi pertanyaan, nama karyawan, NIK..."
              class="w-full max-w-sm"
            >
              <template #leading>
                <UIcon name="i-lucide-search" class="size-4 text-muted" />
              </template>
            </UInput>

            <select
              v-model="unresolvedStatusFilter"
              class="rounded-md border border-default bg-default px-3 py-2 text-xs font-medium text-highlighted focus:border-primary focus:outline-none"
            >
              <option value="">Semua Status</option>
              <option value="pending">Menunggu (Pending)</option>
              <option value="resolved">Selesai (Resolved)</option>
              <option value="ignored">Diabaikan (Ignored)</option>
            </select>
          </div>
        </div>
      </UCard>

      <!-- Table Card -->
      <UCard class="overflow-hidden border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-default bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th class="px-4 py-3.5">Frekuensi & Waktu</th>
                <th class="px-4 py-3.5">Pengirim</th>
                <th class="px-4 py-3.5">Pertanyaan Karyawan</th>
                <th class="px-4 py-3.5">Status</th>
                <th class="px-4 py-3.5">Catatan Admin</th>
                <th class="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-if="unresolvedLoading">
                <td colspan="6" class="py-12 text-center text-muted">
                  <UIcon name="i-lucide-loader-2" class="size-6 animate-spin mx-auto text-primary" />
                  <p class="mt-2 text-xs">Memuat catatan pertanyaan belum terjawab...</p>
                </td>
              </tr>

              <tr v-else-if="unresolvedList.length === 0">
                <td colspan="6" class="py-12 text-center text-muted">
                  <UIcon name="i-lucide-sparkles" class="size-8 mx-auto text-emerald-500/50" />
                  <p class="mt-2 text-sm font-medium">Bagus! Tidak ada pertanyaan karyawan yang belum terjawab</p>
                </td>
              </tr>

              <tr
                v-for="item in unresolvedList"
                v-else
                :key="item.id"
                class="hover:bg-muted/30 transition-colors"
              >
                <td class="px-4 py-3.5 whitespace-nowrap">
                  <div class="flex items-center gap-1.5">
                    <UBadge
                      :color="item.ask_count > 1 ? 'error' : 'neutral'"
                      variant="subtle"
                      size="xs"
                      class="font-mono font-bold"
                    >
                      {{ item.ask_count }}x
                    </UBadge>
                    <span class="text-xs text-muted">{{ formatDateTime(item.last_asked_at || item.created_at) }}</span>
                  </div>
                </td>
                <td class="px-4 py-3.5 whitespace-nowrap">
                  <div class="font-bold text-highlighted">{{ item.sender_name || 'Karyawan' }}</div>
                  <div class="text-[11px] font-mono text-muted">{{ item.karyawan_nik || item.sender_phone }}</div>
                </td>
                <td class="px-4 py-3.5 max-w-sm">
                  <div class="font-semibold text-highlighted text-xs">{{ item.question }}</div>
                  <div v-if="item.bot_response" class="mt-1 text-[11px] text-muted line-clamp-2">
                    Respon bot: "{{ item.bot_response }}"
                  </div>
                </td>
                <td class="px-4 py-3.5 whitespace-nowrap">
                  <UBadge
                    :color="item.status === 'resolved' ? 'success' : item.status === 'ignored' ? 'neutral' : 'error'"
                    variant="subtle"
                    size="sm"
                    class="font-semibold"
                  >
                    {{ item.status === 'resolved' ? 'Selesai' : item.status === 'ignored' ? 'Diabaikan' : 'Pending' }}
                  </UBadge>
                </td>
                <td class="px-4 py-3.5 text-xs text-muted max-w-xs">
                  {{ item.admin_notes || '-' }}
                </td>
                <td class="px-4 py-3.5 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-1.5">
                    <UButton
                      v-if="item.status !== 'resolved'"
                      size="xs"
                      color="primary"
                      variant="subtle"
                      class="cursor-pointer"
                      title="Jadikan FAQ"
                      @click="openToFaq(item)"
                    >
                      <UIcon name="i-lucide-plus" class="size-3.5" />
                      Jadikan FAQ
                    </UButton>

                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      class="cursor-pointer"
                      title="Edit Catatan & Status"
                      @click="openEditUnresolved(item)"
                    >
                      <UIcon name="i-lucide-pencil" class="size-3.5" />
                    </UButton>

                    <UButton
                      size="xs"
                      color="error"
                      variant="ghost"
                      class="cursor-pointer text-red-500 hover:text-red-600"
                      title="Hapus Log"
                      @click="handleDeleteUnresolved(item)"
                    >
                      <UIcon name="i-lucide-trash-2" class="size-3.5" />
                    </UButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="unresolvedMeta.total > unresolvedMeta.per_page" class="flex items-center justify-between border-t border-default p-4">
          <p class="text-xs text-muted">
            Menampilkan {{ unresolvedList.length }} dari total {{ unresolvedMeta.total }} pertanyaan
          </p>
          <UPagination
            v-model="unresolvedPage"
            :page-count="unresolvedMeta.per_page"
            :total="unresolvedMeta.total"
          />
        </div>
      </UCard>
    </div>

    <!-- ============================================================= -->
    <!-- TAB 4: PANDUAN & KEMAMPUAN NEO (KNOWLEDGE DINAMIS)             -->
    <!-- ============================================================= -->
    <div v-if="activeTab === 'guide'" class="space-y-6">
      <!-- Persona Card -->
      <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
        <div class="flex items-start gap-4">
          <div class="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UIcon name="i-lucide-bot" class="size-8" />
          </div>
          <div>
            <h2 class="text-xl font-bold text-highlighted">Identitas & Arsitektur Neo</h2>
            <p class="mt-1 text-sm text-muted">
              <strong>Nama:</strong> Neo • <strong>Peran:</strong> Agent HRIS (asisten AI) di bawah Tim IT HomPim Play • <strong>WhatsApp Target:</strong> Nomor resmi IT Support.
            </p>
            <p class="mt-2 text-xs text-muted leading-relaxed">
              Neo memproses pesan dengan urutan prioritas:
              (1) Tindakan Langsung (Reset Session, Reset Password, QR Turnstile Gate),
              (2) FAQ Cepat Database (<code class="font-mono text-primary">t_whatsapp_bot_faq</code>),
              (3) Autonomous Text-to-SQL untuk Data Real-time (presensi, cuti, kontrak, lembur),
              (4) General AI Knowledge menggunakan Basic Knowledge Hub ini.
            </p>
          </div>
        </div>
      </UCard>

      <!-- 7 Executable Actions Table -->
      <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
        <template #header>
          <h3 class="font-bold text-highlighted flex items-center gap-2">
            <UIcon name="i-lucide-zap" class="size-5 text-amber-500" />
            Daftar Perintah & Aksi yang Dieksekusi Nyata oleh Neo
          </h3>
          <p class="text-xs text-muted mt-1">
            Aksi ini langsung memanipulasi database portal / mengirimkan respon otomatis tanpa menunggu keputusan manusia.
          </p>
        </template>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-default bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th class="px-4 py-3">Nama Aksi</th>
                <th class="px-4 py-3">Kata Pemicu (Trigger)</th>
                <th class="px-4 py-3">Hak Akses</th>
                <th class="px-4 py-3">Hasil Eksekusi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default text-xs">
              <tr>
                <td class="px-4 py-3 font-bold text-highlighted">Eskalasi Tim IT</td>
                <td class="px-4 py-3 font-mono text-primary">"butuh bantuan IT", "bicara dengan admin/manusia", "error 500", "sistem down"</td>
                <td class="px-4 py-3"><UBadge color="neutral" size="xs">Semua Karyawan</UBadge></td>
                <td class="px-4 py-3 text-muted">Membuat tiket rincian kendala dan meneruskannya ke Grup WhatsApp IT Support.</td>
              </tr>
              <tr>
                <td class="px-4 py-3 font-bold text-highlighted">Reset Session Login</td>
                <td class="px-4 py-3 font-mono text-primary">"reset session", "kick session", "nyangkut", "hapus sesi"</td>
                <td class="px-4 py-3"><UBadge color="primary" size="xs">Karyawan Terdaftar</UBadge></td>
                <td class="px-4 py-3 text-muted">Menghapus token login aktif akun <code class="font-mono">hris-fe</code> milik NIK tersebut.</td>
              </tr>
              <tr>
                <td class="px-4 py-3 font-bold text-highlighted">Deteksi Gagal Login</td>
                <td class="px-4 py-3 font-mono text-primary">"tidak bisa login", "gagal login", "login error"</td>
                <td class="px-4 py-3"><UBadge color="primary" size="xs">Karyawan Terdaftar</UBadge></td>
                <td class="px-4 py-3 text-muted">Bertanya apakah sesi nyangkut di browser lain; jika user membalas "Iya/Reset" dalam 5 menit, sesi otomatis di-reset.</td>
              </tr>
              <tr>
                <td class="px-4 py-3 font-bold text-highlighted">Reset Password Portal</td>
                <td class="px-4 py-3 font-mono text-primary">"lupa password", "reset password", "lupa sandi"</td>
                <td class="px-4 py-3"><UBadge color="primary" size="xs">Karyawan Terdaftar</UBadge></td>
                <td class="px-4 py-3 text-muted">Me-reset password akun menjadi default: <code class="font-mono font-bold text-primary">12345678</code> dan mewajibkan ganti sandi saat login.</td>
              </tr>
              <tr>
                <td class="px-4 py-3 font-bold text-highlighted">Generate QR Gate Turnstile</td>
                <td class="px-4 py-3 font-mono text-primary">"minta QR gate", "kartu tertinggal", "kartu rusak", "akses masuk"</td>
                <td class="px-4 py-3"><UBadge color="success" size="xs">Karyawan & Holding</UBadge></td>
                <td class="px-4 py-3 text-muted">Meminta alasan, men-generate barcode QR Turnstile unik resolusi tinggi berlaku hari ini, dan mencatat log HRD.</td>
              </tr>
              <tr>
                <td class="px-4 py-3 font-bold text-highlighted">Kirim Ulang QR Hari Ini</td>
                <td class="px-4 py-3 font-mono text-primary">"kirim ulang QR", "QR hari ini", "mana barcode"</td>
                <td class="px-4 py-3"><UBadge color="success" size="xs">Karyawan & Holding</UBadge></td>
                <td class="px-4 py-3 text-muted">Mengirimkan kembali gambar QR code yang sudah pernah di-generate pada tanggal hari ini.</td>
              </tr>
              <tr>
                <td class="px-4 py-3 font-bold text-highlighted">Daftar Pertanyaan Unresolved</td>
                <td class="px-4 py-3 font-mono text-primary">"pertanyaan belum terjawab", "unresolved", "daftar pertanyaan baru"</td>
                <td class="px-4 py-3"><UBadge color="error" size="xs">Level 0-2 (IT/HR)</UBadge></td>
                <td class="px-4 py-3 text-muted">Menampilkan daftar pertanyaan terbaru yang belum ditemukan jawabannya langsung ke WhatsApp admin.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <!-- Dynamic Data Query Agent -->
      <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
        <template #header>
          <h3 class="font-bold text-highlighted flex items-center gap-2">
            <UIcon name="i-lucide-database" class="size-5 text-blue-500" />
            Knowledge Dinamis (Autonomous Text-to-SQL Agent)
          </h3>
          <p class="text-xs text-muted mt-1">
            Data real-time yang langsung diambil dari database HRIS melalui query SELECT read-only dengan kontrol hak akses (RBAC).
          </p>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div class="space-y-2 rounded-lg border border-default p-3 bg-muted/10">
            <div class="font-bold text-highlighted flex items-center gap-1.5">
              <UIcon name="i-lucide-fingerprint" class="size-4 text-primary" />
              Presensi & Fingerspot
            </div>
            <p class="text-muted leading-relaxed">
              Tabel: <code class="font-mono text-primary">fingerspot_attendance_logs</code> • Mencakup scan pertama (jam masuk), scan terakhir (jam pulang), status hadir, dan total hari hadir pada periode aktif (tgl 25 s/d 24).
            </p>
          </div>

          <div class="space-y-2 rounded-lg border border-default p-3 bg-muted/10">
            <div class="font-bold text-highlighted flex items-center gap-1.5">
              <UIcon name="i-lucide-calendar" class="size-4 text-primary" />
              Saldo Cuti & Riwayat Cuti
            </div>
            <p class="text-muted leading-relaxed">
              Tabel: <code class="font-mono text-primary">leave_accruals</code> & <code class="font-mono text-primary">leave_requests</code> • Menghitung sisa cuti aktif belum expired, tanggal kadaluwarsa terdekat, dan riwayat pengajuan cuti.
            </p>
          </div>

          <div class="space-y-2 rounded-lg border border-default p-3 bg-muted/10">
            <div class="font-bold text-highlighted flex items-center gap-1.5">
              <UIcon name="i-lucide-clock" class="size-4 text-primary" />
              Public Holiday (PH) & Extra Off (EO)
            </div>
            <p class="text-muted leading-relaxed">
              Tabel: <code class="font-mono text-primary">public_holiday_requests</code> & <code class="font-mono text-primary">employee_extra_offs</code> • Saldo kompensasi kerja di tanggal merah dan kelebihan jam kerja (berlaku 90 hari).
            </p>
          </div>

          <div class="space-y-2 rounded-lg border border-default p-3 bg-muted/10">
            <div class="font-bold text-highlighted flex items-center gap-1.5">
              <UIcon name="i-lucide-briefcase" class="size-4 text-primary" />
              Lembur (SPL) & Kontrak Kerja
            </div>
            <p class="text-muted leading-relaxed">
              Tabel: <code class="font-mono text-primary">overtime_requests</code> & <code class="font-mono text-primary">t_kontrak_karyawan</code> • Total jam lembur periode berjalan, daftar bawahan yang ditugaskan lembur, dan sisa hari masa kontrak.
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL: KNOWLEDGE CREATE / EDIT                                -->
    <!-- ============================================================= -->
    <div
      v-if="knowledgeModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
        aria-label="Tutup modal"
        @click="knowledgeModalOpen = false"
      ></button>

      <UCard class="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto shadow-2xl">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-highlighted">
              {{ knowledgeModalMode === 'create' ? 'Tambah Seksi Knowledge Baru' : 'Edit Seksi Knowledge' }}
            </h3>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="knowledgeModalOpen = false"
            />
          </div>
        </template>

        <form @submit.prevent="handleSaveKnowledge" class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Judul Seksi SOP <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="knowledgeForm.title"
              type="text"
              required
              placeholder="Contoh: 1. Presensi & Kehadiran"
              class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm font-semibold text-highlighted focus:border-primary focus:outline-none"
            />
            <p v-if="knowledgeFormErrors.title" class="mt-1 text-xs text-rose-500">{{ knowledgeFormErrors.title[0] }}</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                Urutan (Sort Order)
              </label>
              <input
                v-model="knowledgeForm.sort_order"
                type="number"
                min="0"
                step="10"
                class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm font-mono text-highlighted focus:border-primary focus:outline-none"
              />
            </div>

            <div class="flex items-center gap-3 pt-6">
              <input
                id="kbStatus"
                v-model="knowledgeForm.is_active"
                type="checkbox"
                class="size-4 rounded border-default text-primary focus:ring-primary"
              />
              <label for="kbStatus" class="text-xs font-semibold text-highlighted cursor-pointer">
                Seksi Aktif (Dimasukkan ke Prompt AI)
              </label>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-bold uppercase tracking-wider text-muted">
                Isi Dokumen / SOP (Format Markdown) <span class="text-rose-500">*</span>
              </label>
              <span class="text-[11px] text-muted font-mono">
                {{ (knowledgeForm.content || '').length.toLocaleString('id-ID') }} karakter
              </span>
            </div>
            <textarea
              v-model="knowledgeForm.content"
              rows="12"
              required
              placeholder="Tuliskan aturan SOP, ketentuan poin demi poin dalam format Markdown..."
              class="w-full rounded-md border border-default bg-default p-3 text-xs font-mono text-highlighted focus:border-primary focus:outline-none leading-relaxed"
            ></textarea>
            <p v-if="knowledgeFormErrors.content" class="mt-1 text-xs text-rose-500">{{ knowledgeFormErrors.content[0] }}</p>
            <p class="mt-1 text-[11px] text-muted">
              Tip: Perubahan pada seksi ini akan otomatis membuat snapshot revisi baru sehingga aman untuk dipulihkan jika terjadi kesalahan.
            </p>
          </div>

          <!-- Actions -->
          <div class="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-default">
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              class="cursor-pointer font-medium"
              @click="knowledgeModalOpen = false"
            >
              Batal
            </UButton>

            <UButton
              type="submit"
              color="primary"
              variant="solid"
              size="sm"
              :loading="knowledgeSaving"
              class="cursor-pointer font-semibold"
            >
              {{ knowledgeModalMode === 'create' ? 'Tambah Seksi' : 'Simpan & Perbarui' }}
            </UButton>
          </div>
        </form>
      </UCard>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL: KNOWLEDGE REVISIONS                                    -->
    <!-- ============================================================= -->
    <div
      v-if="revisionsModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
        aria-label="Tutup modal"
        @click="revisionsModalOpen = false"
      ></button>

      <UCard class="relative max-h-[90vh] w-full max-w-xl overflow-y-auto shadow-2xl">
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-bold text-highlighted">Riwayat Revisi Seksi</h3>
              <p class="text-xs text-muted">{{ currentRevisionSection?.title }}</p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="revisionsModalOpen = false"
            />
          </div>
        </template>

        <div v-if="revisionsLoading" class="py-12 text-center text-muted">
          <UIcon name="i-lucide-loader-2" class="size-6 animate-spin mx-auto text-primary" />
          <p class="mt-2 text-xs">Memuat riwayat revisi...</p>
        </div>

        <div v-else-if="currentSectionRevisions.length === 0" class="py-10 text-center text-muted text-xs">
          Belum ada riwayat revisi tersimpan untuk seksi ini.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="rev in currentSectionRevisions"
            :key="rev.id"
            class="rounded-lg border border-default p-3 bg-muted/10 space-y-2"
          >
            <div class="flex items-center justify-between">
              <div>
                <span class="font-bold text-xs text-highlighted">{{ formatDateTime(rev.created_at) }}</span>
                <span class="ml-2 text-[11px] text-muted font-mono">oleh @{{ rev.changed_by || 'admin' }}</span>
              </div>
              <UButton
                size="xs"
                color="primary"
                variant="subtle"
                class="cursor-pointer"
                @click="handleRestoreRevision(rev)"
              >
                Pulihkan Versi Ini
              </UButton>
            </div>
            <div class="max-h-20 overflow-hidden text-[11px] font-mono text-muted bg-default p-2 rounded border border-default/50 whitespace-pre-wrap">
              {{ rev.content.slice(0, 200) }}...
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL: FAQ CREATE / EDIT                                      -->
    <!-- ============================================================= -->
    <div
      v-if="faqModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
        aria-label="Tutup modal"
        @click="faqModalOpen = false"
      ></button>

      <UCard class="relative max-h-[92vh] w-full max-w-xl overflow-y-auto shadow-2xl">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-highlighted">
              {{ faqModalMode === 'create' ? 'Tambah FAQ Bot Baru' : 'Edit FAQ Bot' }}
            </h3>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="faqModalOpen = false"
            />
          </div>
        </template>

        <form @submit.prevent="handleSaveFaq" class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Topik / Judul Pertanyaan (Opsional)
            </label>
            <input
              v-model="faqForm.topic"
              type="text"
              placeholder="Contoh: Jam Buka Kantor / Info Seragam"
              class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm font-semibold text-highlighted focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Kata Kunci Pencocokan <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="faqForm.keywords"
              type="text"
              required
              placeholder="Pisahkan dengan koma, contoh: seragam kantor, baju dinas, dresscode"
              class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm font-medium text-highlighted focus:border-primary focus:outline-none"
            />
            <p v-if="faqFormErrors.keywords" class="mt-1 text-xs text-rose-500">{{ faqFormErrors.keywords[0] }}</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                Prioritas
              </label>
              <input
                v-model="faqForm.priority"
                type="number"
                min="0"
                max="1000"
                class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm font-mono text-highlighted focus:border-primary focus:outline-none"
              />
              <p class="mt-1 text-[10px] text-muted">Makin tinggi makin diutamakan</p>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                Tipe Pencocokan
              </label>
              <select
                v-model="faqForm.match_type"
                class="w-full rounded-md border border-default bg-default px-3 py-2 text-xs font-medium text-highlighted focus:border-primary focus:outline-none"
              >
                <option value="contains">Mengandung Kata</option>
                <option value="exact">Sama Persis</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                Batas Hak Akses
              </label>
              <select
                v-model="faqForm.max_user_level"
                class="w-full rounded-md border border-default bg-default px-3 py-2 text-xs font-medium text-highlighted focus:border-primary focus:outline-none"
              >
                <option :value="3">Semua Karyawan (Level 3)</option>
                <option :value="2">Khusus HRD & IT (Level 2)</option>
                <option :value="0">Khusus IT Superadmin (0)</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Jawaban Bot <span class="text-rose-500">*</span>
            </label>
            <textarea
              v-model="faqForm.answer"
              rows="6"
              required
              placeholder="Tuliskan teks jawaban yang akan langsung dikirim bot jika pertanyaan karyawan cocok..."
              class="w-full rounded-md border border-default bg-default p-3 text-sm text-highlighted focus:border-primary focus:outline-none leading-relaxed"
            ></textarea>
            <p v-if="faqFormErrors.answer" class="mt-1 text-xs text-rose-500">{{ faqFormErrors.answer[0] }}</p>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <input
              id="faqStatus"
              v-model="faqForm.is_active"
              type="checkbox"
              class="size-4 rounded border-default text-primary focus:ring-primary"
            />
            <label for="faqStatus" class="text-xs font-semibold text-highlighted cursor-pointer">
              Status FAQ Aktif
            </label>
          </div>

          <!-- Actions -->
          <div class="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-default">
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              class="cursor-pointer font-medium"
              @click="faqModalOpen = false"
            >
              Batal
            </UButton>

            <UButton
              type="submit"
              color="primary"
              variant="solid"
              size="sm"
              :loading="faqSaving"
              class="cursor-pointer font-semibold"
            >
              {{ faqModalMode === 'create' ? 'Tambah FAQ' : 'Simpan FAQ' }}
            </UButton>
          </div>
        </form>
      </UCard>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL: FAQ SIMULATOR / TEST                                   -->
    <!-- ============================================================= -->
    <div
      v-if="testModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
        aria-label="Tutup modal"
        @click="testModalOpen = false"
      ></button>

      <UCard class="relative max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-2xl">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-highlighted flex items-center gap-2">
              <UIcon name="i-lucide-play" class="size-4 text-primary" />
              Uji Simulator Pencocokan FAQ
            </h3>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="testModalOpen = false"
            />
          </div>
        </template>

        <form @submit.prevent="runSimulator" class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Ketik Contoh Pertanyaan Karyawan
            </label>
            <input
              v-model="testQuestion"
              type="text"
              required
              placeholder="Contoh: apakah hari ini ada seragam khusus?"
              class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Simulasi Sebagai Level User
            </label>
            <select
              v-model="testLevel"
              class="w-full rounded-md border border-default bg-default px-3 py-2 text-xs font-medium text-highlighted focus:border-primary focus:outline-none"
            >
              <option :value="3">Level 3 (Staff / Karyawan Biasa)</option>
              <option :value="2">Level 2 (HRD / Management)</option>
              <option :value="1">Level 1 (Direksi)</option>
              <option :value="0">Level 0 (IT Administrator)</option>
            </select>
          </div>

          <div class="flex justify-end">
            <UButton
              type="submit"
              color="primary"
              size="sm"
              :loading="testingFaq"
              class="cursor-pointer font-semibold"
            >
              Uji Pencocokan Sekarang
            </UButton>
          </div>
        </form>

        <!-- Result Box -->
        <div v-if="testResult" class="mt-4 pt-4 border-t border-default space-y-2">
          <div class="flex items-center gap-2">
            <UIcon
              :name="testResult.matched ? 'i-lucide-check-circle-2' : 'i-lucide-alert-circle'"
              class="size-5"
              :class="testResult.matched ? 'text-emerald-500' : 'text-amber-500'"
            />
            <span class="font-bold text-sm text-highlighted">
              {{ testResult.matched ? 'Cocok dengan FAQ!' : 'Tidak Ada FAQ yang Cocok' }}
            </span>
          </div>

          <div v-if="testResult.matched" class="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2 text-xs">
            <div>
              <span class="font-bold text-highlighted">Topik:</span> {{ testResult.data?.topic || '-' }}
            </div>
            <div>
              <span class="font-bold text-highlighted">Kata Kunci:</span> <code class="font-mono text-primary">{{ testResult.data?.keywords }}</code>
            </div>
            <div>
              <span class="font-bold text-highlighted">Prioritas:</span> {{ testResult.data?.priority }}
            </div>
            <div class="pt-1 border-t border-emerald-500/20 text-muted whitespace-pre-wrap">
              <strong>Balasan Bot:</strong> "{{ testResult.data?.answer }}"
            </div>
          </div>

          <div v-else class="text-xs text-muted">
            Pertanyaan ini akan diteruskan ke Autonomous Text-to-SQL / Basic Knowledge LLM Neo.
          </div>
        </div>
      </UCard>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL: CONVERT UNRESOLVED TO FAQ                              -->
    <!-- ============================================================= -->
    <div
      v-if="toFaqModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
        aria-label="Tutup modal"
        @click="toFaqModalOpen = false"
      ></button>

      <UCard class="relative max-h-[92vh] w-full max-w-xl overflow-y-auto shadow-2xl">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-highlighted">
              Jadikan Pertanyaan Sebagai FAQ Baru
            </h3>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="toFaqModalOpen = false"
            />
          </div>
        </template>

        <form @submit.prevent="handleConvertToFaq" class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Topik
            </label>
            <input
              v-model="toFaqForm.topic"
              type="text"
              class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm font-semibold text-highlighted focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Kata Kunci (Koma) <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="toFaqForm.keywords"
              type="text"
              required
              class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted focus:border-primary focus:outline-none"
            />
            <p v-if="toFaqErrors.keywords" class="mt-1 text-xs text-rose-500">{{ toFaqErrors.keywords[0] }}</p>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Jawaban Resmi dari HRD / IT <span class="text-rose-500">*</span>
            </label>
            <textarea
              v-model="toFaqForm.answer"
              rows="6"
              required
              placeholder="Tuliskan jawaban yang tepat untuk pertanyaan ini..."
              class="w-full rounded-md border border-default bg-default p-3 text-sm text-highlighted focus:border-primary focus:outline-none"
            ></textarea>
            <p v-if="toFaqErrors.answer" class="mt-1 text-xs text-rose-500">{{ toFaqErrors.answer[0] }}</p>
          </div>

          <div class="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-default">
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              class="cursor-pointer font-medium"
              @click="toFaqModalOpen = false"
            >
              Batal
            </UButton>

            <UButton
              type="submit"
              color="primary"
              variant="solid"
              size="sm"
              :loading="toFaqSaving"
              class="cursor-pointer font-semibold"
            >
              Simpan FAQ & Selesaikan Evaluasi
            </UButton>
          </div>
        </form>
      </UCard>
    </div>

    <!-- ============================================================= -->
    <!-- MODAL: EDIT UNRESOLVED NOTES & STATUS                         -->
    <!-- ============================================================= -->
    <div
      v-if="unresolvedModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
        aria-label="Tutup modal"
        @click="unresolvedModalOpen = false"
      ></button>

      <UCard class="relative max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-2xl">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-highlighted">Perbarui Status Pertanyaan</h3>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="unresolvedModalOpen = false"
            />
          </div>
        </template>

        <form @submit.prevent="handleSaveUnresolved" class="space-y-4">
          <div class="rounded-lg bg-muted/10 p-3 text-xs text-muted border border-default">
            <div class="font-semibold text-highlighted">Pertanyaan Karyawan:</div>
            <div class="mt-1 font-mono text-primary">"{{ unresolvedForm.question }}"</div>
            <div class="mt-2 text-[11px]">Dari: {{ unresolvedForm.sender_name }} ({{ unresolvedForm.sender_phone }})</div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Status Evaluasi
            </label>
            <select
              v-model="unresolvedForm.status"
              class="w-full rounded-md border border-default bg-default px-3 py-2 text-xs font-medium text-highlighted focus:border-primary focus:outline-none"
            >
              <option value="pending">Pending (Menunggu Jawaban/SOP)</option>
              <option value="resolved">Resolved (Sudah Dituntaskan)</option>
              <option value="ignored">Ignored (Diabaikan / Pertanyaan Main-main)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Catatan Admin (HRD / IT)
            </label>
            <textarea
              v-model="unresolvedForm.admin_notes"
              rows="4"
              placeholder="Contoh: Sudah ditambahkan ke seksi SOP cuti atau dijelaskan via chat manual..."
              class="w-full rounded-md border border-default bg-default p-3 text-xs text-highlighted focus:border-primary focus:outline-none"
            ></textarea>
          </div>

          <div class="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-default">
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              class="cursor-pointer font-medium"
              @click="unresolvedModalOpen = false"
            >
              Batal
            </UButton>

            <UButton
              type="submit"
              color="primary"
              variant="solid"
              size="sm"
              :loading="unresolvedSaving"
              class="cursor-pointer font-semibold"
            >
              Simpan Perubahan
            </UButton>
          </div>
        </form>
      </UCard>
    </div>
  </div>
</template>

