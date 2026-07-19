<script setup>
import { computed, onMounted, ref } from 'vue'
import { getSubordinateCandidates } from '../services/staffService'
import { apiError, formatDate } from '../utils/formatters'

const candidates = ref([])
const loading = ref(true)
const errorMessage = ref('')

const search = ref('')
const selectedStage = ref('')

const filteredCandidates = computed(() => {
  return candidates.value.filter((c) => {
    const nameMatch = c.name.toLowerCase().includes(search.value.toLowerCase())
    const vacancyMatch = (c.vacancy?.title || '').toLowerCase().includes(search.value.toLowerCase())
    const stageMatch = !selectedStage.value || c.status === selectedStage.value
    return (nameMatch || vacancyMatch) && stageMatch
  })
})

const stagesList = [
  { key: 'applied', label: 'Applied' },
  { key: 'screening', label: 'Screening' },
  { key: 'interview_hr', label: 'Interview HR' },
  { key: 'case_study', label: 'Case Study' },
  { key: 'interview_user', label: 'Interview User' },
  { key: 'reference_check', label: 'Reference Check' },
  { key: 'offering', label: 'Offering Letter' },
  { key: 'pkb', label: 'Internal PKB' },
]

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await getSubordinateCandidates()
    candidates.value = res.data.records || []
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal memuat kandidat bawahan.')
  } finally {
    loading.value = false
  }
}

const activeCandidate = ref(null)
const showDetailModal = ref(false)

function viewDetail(candidate) {
  activeCandidate.value = candidate
  showDetailModal.value = true
}

function stageLabel(stage) {
  switch (stage) {
    case 'applied':
      return 'Applied'
    case 'screening':
      return 'Screening'
    case 'interview_hr':
      return 'Interview HR'
    case 'case_study':
      return 'Case Study'
    case 'interview_user':
      return 'Interview User'
    case 'reference_check':
      return 'Reference Check'
    case 'offering':
      return 'Offering Letter'
    case 'pkb':
      return 'Internal PKB'
    case 'hired':
      return 'Hired'
    case 'rejected':
      return 'Rejected'
    default:
      return stage
  }
}

function stageColor(stage) {
  switch (stage) {
    case 'applied':
      return 'neutral'
    case 'screening':
      return 'warning'
    case 'interview_hr':
      return 'primary'
    case 'case_study':
      return 'info'
    case 'interview_user':
      return 'info'
    case 'reference_check':
      return 'purple'
    case 'offering':
      return 'warning'
    case 'pkb':
      return 'success'
    case 'hired':
      return 'success'
    case 'rejected':
      return 'danger'
    default:
      return 'neutral'
  }
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

onMounted(load)
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Kandidat Calon Bawahan</h2>
      <p class="mt-1 text-sm text-muted">
        Pantau proses seleksi kandidat yang akan menjadi bawahan langsung Anda.
      </p>
    </div>

    <AlertToastBridge :error="errorMessage" />

    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-default border border-default p-4 rounded-xl"
    >
      <div class="flex-1 flex flex-col gap-4 sm:flex-row">
        <!-- Search -->
        <div class="relative flex-1">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3">
            <UIcon name="i-lucide-search" class="size-4 text-muted" />
          </span>
          <input
            v-model="search"
            placeholder="Cari nama kandidat atau posisi..."
            class="w-full pl-9 pr-4 py-2 rounded-lg border border-default bg-default text-sm text-highlighted placeholder-muted outline-none focus:border-primary"
          />
        </div>

        <!-- Filter Stage -->
        <select
          v-model="selectedStage"
          class="rounded-lg border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none focus:border-primary"
        >
          <option value="">Semua Tahapan</option>
          <option v-for="stage in stagesList" :key="stage.key" :value="stage.key">
            {{ stage.label }}
          </option>
        </select>
      </div>

      <UButton
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="outline"
        label="Segarkan"
        :loading="loading"
        @click="load"
      />
    </div>

    <!-- Candidate List Card -->
    <UCard title="Daftar Kandidat Berjalan">
      <div v-if="loading" class="py-8 text-center text-sm text-muted">Memuat data kandidat...</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-muted uppercase tracking-wider">
            <tr>
              <th class="p-4">Nama / Kontak</th>
              <th class="p-4">Posisi Lowongan</th>
              <th class="p-4">Tahapan Sekarang</th>
              <th class="p-4">Tanggal Melamar</th>
              <th class="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in filteredCandidates"
              :key="item.id"
              class="border-t border-default hover:bg-muted/5 transition"
            >
              <td class="p-4">
                <div class="flex flex-col">
                  <span class="font-semibold text-highlighted">{{ item.name }}</span>
                  <span class="text-xs text-muted">{{ item.email }} • {{ item.phone }}</span>
                </div>
              </td>
              <td class="p-4">
                <div class="flex flex-col">
                  <span class="font-medium text-highlighted">{{
                    item.vacancy?.title || 'Umum'
                  }}</span>
                  <span class="text-xs text-muted"
                    >{{ item.vacancy?.division }} • {{ item.vacancy?.department }}</span
                  >
                </div>
              </td>
              <td class="p-4">
                <UBadge
                  :color="stageColor(item.status)"
                  variant="subtle"
                  :label="stageLabel(item.status)"
                />
              </td>
              <td class="p-4 text-muted text-xs">
                {{ formatDate(item.created_at) }}
              </td>
              <td class="p-4 text-right">
                <UButton
                  color="primary"
                  variant="ghost"
                  size="sm"
                  icon="i-lucide-eye"
                  label="Detail Proses"
                  @click="viewDetail(item)"
                />
              </td>
            </tr>
            <tr v-if="!filteredCandidates.length">
              <td colspan="5" class="p-6 text-center text-muted">
                Tidak ada kandidat bawahan yang ditemukan.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Detail Process Modal -->
    <div
      v-if="showDetailModal && activeCandidate"
      class="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60"
        @click="showDetailModal = false"
      ></button>
      <UCard class="relative w-full max-w-lg overflow-hidden">
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <p class="text-sm font-bold text-highlighted uppercase tracking-wide">
              Riwayat Proses: {{ activeCandidate.name }}
            </p>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="showDetailModal = false"
            />
          </div>
        </template>

        <div class="space-y-6 text-xs text-default">
          <div class="flex flex-col gap-1 pb-4 border-b border-default">
            <p class="text-[10px] font-bold text-muted uppercase tracking-wider">
              Lowongan Pekerjaan
            </p>
            <p class="text-sm font-semibold text-highlighted">
              {{ activeCandidate.vacancy?.title || 'Umum' }}
            </p>
            <p class="text-xs text-muted">
              {{ activeCandidate.vacancy?.division }} • {{ activeCandidate.vacancy?.department }}
            </p>
          </div>

          <div class="space-y-4">
            <p class="text-[10px] font-bold text-muted uppercase tracking-wider">
              Timeline Tahapan Seleksi
            </p>
            <div
              class="relative pl-6 space-y-6 before:absolute before:inset-y-1 before:left-[11px] before:w-[2px] before:bg-slate-200 dark:before:bg-slate-700"
            >
              <div
                v-for="(history, index) in activeCandidate.stage_histories"
                :key="history.id"
                class="relative"
              >
                <!-- Timeline Dot -->
                <span
                  class="absolute -left-[21px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-default border-2"
                  :class="
                    index === activeCandidate.stage_histories.length - 1
                      ? 'border-primary bg-primary'
                      : 'border-slate-300 bg-default'
                  "
                ></span>

                <div class="flex flex-col">
                  <div class="flex items-center gap-2">
                    <span
                      class="text-sm font-semibold"
                      :class="
                        index === activeCandidate.stage_histories.length - 1
                          ? 'text-primary'
                          : 'text-highlighted'
                      "
                    >
                      {{ stageLabel(history.stage) }}
                    </span>
                    <span
                      v-if="index === activeCandidate.stage_histories.length - 1"
                      class="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary"
                    >
                      Aktif
                    </span>
                  </div>
                  <span class="text-[10px] text-muted mt-0.5">
                    Masuk: {{ formatDateTime(history.entered_at) }}
                    <span v-if="history.exited_at">
                      • Keluar: {{ formatDateTime(history.exited_at) }}
                    </span>
                  </span>
                  <p
                    v-if="history.reason"
                    class="mt-1 text-xs text-muted italic bg-muted/10 p-2 rounded-lg border border-default"
                  >
                    Catatan: {{ history.reason }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              label="Tutup"
              @click="showDetailModal = false"
            />
          </div>
        </template>
      </UCard>
    </div>
  </section>
</template>
