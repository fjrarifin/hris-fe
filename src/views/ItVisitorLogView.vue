<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  deleteVisitorLog,
  exportVisitorLogs,
  getVisitorLogs,
} from '../services/visitorService'
import { notifier } from '../utils/notifications'
import { askConfirmation } from '../utils/confirmDialog'
import { apiError, formatDateTime } from '../utils/formatters'

const logs = ref([])
const kpi = ref({
  today_count: 0,
  this_week_count: 0,
  total_count: 0,
})
const loading = ref(false)
const exporting = ref(false)

const search = ref('')
const dateFilter = ref('')
const page = ref(1)
const perPage = ref(20)
const meta = ref({ current_page: 1, last_page: 1, total: 0 })

const publicVisitorUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/visitor`
  }
  return '/visitor'
})

async function fetchLogs() {
  loading.value = true
  try {
    const { data } = await getVisitorLogs({
      search: search.value,
      date: dateFilter.value,
      page: page.value,
      per_page: perPage.value,
    })
    logs.value = data.data || []
    meta.value = data.meta || { current_page: 1, last_page: 1, total: 0 }
    if (data.kpi) {
      kpi.value = data.kpi
    }
  } catch (err) {
    notifier.error(apiError(err, 'Gagal memuat log data visitor.'))
  } finally {
    loading.value = false
  }
}

async function handleDelete(item) {
  const confirmed = await askConfirmation({
    title: 'Hapus Log Visitor',
    message: `Apakah Anda yakin ingin menghapus data kunjungan visitor "${item.nama_visitor}" (${item.nomor_kunjungan})?`,
    color: 'error',
    confirmLabel: 'Ya, Hapus',
    cancelLabel: 'Batal',
  })

  if (!confirmed) return

  try {
    await deleteVisitorLog(item.id)
    notifier.success('Data kunjungan visitor berhasil dihapus.')
    await fetchLogs()
  } catch (err) {
    notifier.error(apiError(err, 'Gagal menghapus log visitor.'))
  }
}

async function handleExport() {
  exporting.value = true
  try {
    const response = await exportVisitorLogs({
      search: search.value,
      date: dateFilter.value,
    })
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `buku-tamu-visitor-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    notifier.success('Rekap log visitor berhasil diunduh.')
  } catch (err) {
    notifier.error(apiError(err, 'Gagal mengunduh rekap visitor.'))
  } finally {
    exporting.value = false
  }
}

function copyPublicLink() {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(publicVisitorUrl.value)
    notifier.success('Link public buku tamu visitor berhasil disalin ke clipboard.')
  }
}

function resetFilter() {
  search.value = ''
  dateFilter.value = ''
  page.value = 1
  fetchLogs()
}

let searchTimer = null
watch([search, dateFilter], () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchLogs()
  }, 300)
})

watch(page, () => {
  fetchLogs()
})

onMounted(() => {
  fetchLogs()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header Section -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-highlighted">
          Buku Tamu / Visitor Log
        </h1>
        <p class="mt-1 text-sm text-muted">
          Pantau seluruh registrasi tamu dan pengunjung gedung secara realtime.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <UButton
          color="neutral"
          variant="outline"
          class="cursor-pointer font-medium"
          @click="copyPublicLink"
        >
          <template #leading>
            <UIcon name="i-lucide-copy" class="size-4 text-primary" />
          </template>
          Salin Link Form Visitor
        </UButton>

        <UButton
          color="primary"
          variant="solid"
          class="cursor-pointer font-semibold"
          :loading="exporting"
          @click="handleExport"
        >
          <template #leading>
            <UIcon name="i-lucide-download" class="size-4" />
          </template>
          Export CSV
        </UButton>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-muted">Tamu Hari Ini</p>
            <h3 class="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {{ kpi.today_count }}
            </h3>
          </div>
          <div class="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <UIcon name="i-lucide-user-check" class="size-6" />
          </div>
        </div>
      </UCard>

      <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-muted">Tamu Minggu Ini</p>
            <h3 class="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
              {{ kpi.this_week_count }}
            </h3>
          </div>
          <div class="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <UIcon name="i-lucide-calendar-days" class="size-6" />
          </div>
        </div>
      </UCard>

      <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-muted">Total Keseluruhan</p>
            <h3 class="mt-2 text-2xl font-bold text-highlighted">
              {{ kpi.total_count }}
            </h3>
          </div>
          <div class="flex size-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <UIcon name="i-lucide-id-card" class="size-6" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Filter & Search Toolbar -->
    <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] p-2">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-1 flex-wrap items-center gap-2.5">
          <UInput
            v-model="search"
            placeholder="Cari no. kunjungan, identitas, nama, keperluan..."
            class="w-full max-w-sm"
          >
            <template #leading>
              <UIcon name="i-lucide-search" class="size-4 text-muted" />
            </template>
          </UInput>

          <input
            v-model="dateFilter"
            type="date"
            class="rounded-xl border border-default bg-[var(--ui-bg,#ffffff)] px-3 py-2 text-xs font-medium text-highlighted focus:outline-none focus:ring-2 focus:ring-primary/20"
          />

          <UButton
            v-if="search || dateFilter"
            color="neutral"
            variant="ghost"
            size="xs"
            class="cursor-pointer"
            @click="resetFilter"
          >
            Reset Filter
          </UButton>
        </div>

        <div class="text-xs text-muted">
          Total: <span class="font-bold text-highlighted">{{ meta.total }}</span> kunjungan
        </div>
      </div>
    </UCard>

    <!-- Table Card -->
    <UCard class="overflow-hidden border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-default bg-slate-50 text-xs font-semibold uppercase text-muted dark:bg-slate-900/50">
            <tr>
              <th class="px-4 py-3.5">No. Tiket & Waktu</th>
              <th class="px-4 py-3.5">Identitas & Nama Tamu</th>
              <th class="px-4 py-3.5">Instansi & Kontak</th>
              <th class="px-4 py-3.5">Tujuan & Keperluan</th>
              <th class="px-4 py-3.5">IP & Perangkat</th>
              <th class="px-4 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-if="loading">
              <td colspan="6" class="py-12 text-center text-muted">
                <UIcon name="i-lucide-loader-2" class="size-6 animate-spin mx-auto text-primary" />
                <p class="mt-2 text-xs">Memuat log buku tamu visitor...</p>
              </td>
            </tr>

            <tr v-else-if="logs.length === 0">
              <td colspan="6" class="py-12 text-center text-muted">
                <UIcon name="i-lucide-user-search" class="size-8 mx-auto text-muted/50" />
                <p class="mt-2 text-sm font-medium">Belum ada data kunjungan tamu ditemukan</p>
              </td>
            </tr>

            <tr
              v-for="item in logs"
              v-else
              :key="item.id"
              class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
            >
              <!-- No Tiket & Waktu -->
              <td class="px-4 py-3.5 whitespace-nowrap">
                <UBadge color="primary" variant="subtle" size="sm" class="font-mono font-bold">
                  {{ item.nomor_kunjungan }}
                </UBadge>
                <div class="mt-1 text-xs text-muted">
                  {{ formatDateTime(item.waktu_masuk || item.created_at) }}
                </div>
              </td>

              <!-- Identitas & Nama -->
              <td class="px-4 py-3.5">
                <div class="font-bold text-highlighted">{{ item.nama_visitor }}</div>
                <div class="font-mono text-xs text-primary font-medium">{{ item.nomor_identitas }}</div>
              </td>

              <!-- Instansi & Kontak -->
              <td class="px-4 py-3.5">
                <div class="text-xs font-medium text-highlighted">{{ item.instansi || '-' }}</div>
                <div class="text-[11px] font-mono text-muted">{{ item.no_hp || '-' }}</div>
              </td>

              <!-- Tujuan & Keperluan -->
              <td class="px-4 py-3.5 max-w-xs">
                <div v-if="item.tujuan_bertemu" class="text-xs font-semibold text-highlighted mb-0.5">
                  Bertemu: {{ item.tujuan_bertemu }}
                </div>
                <div class="text-xs text-muted line-clamp-2" :title="item.keperluan">
                  {{ item.keperluan }}
                </div>
              </td>

              <!-- IP & User Agent -->
              <td class="px-4 py-3.5 max-w-[180px]">
                <div class="font-mono text-xs text-muted">{{ item.ip_address || '-' }}</div>
                <div class="text-[10px] text-muted truncate" :title="item.user_agent">
                  {{ item.user_agent || '-' }}
                </div>
              </td>

              <!-- Aksi -->
              <td class="px-4 py-3.5 text-right">
                <UButton
                  size="xs"
                  color="error"
                  variant="ghost"
                  class="cursor-pointer text-red-500 hover:text-red-600"
                  title="Hapus Log"
                  @click="handleDelete(item)"
                >
                  <UIcon name="i-lucide-trash-2" class="size-3.5" />
                </UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="meta.total > meta.per_page" class="flex items-center justify-between border-t border-default p-4">
        <p class="text-xs text-muted">
          Menampilkan {{ logs.length }} dari total {{ meta.total }} kunjungan
        </p>
        <UPagination
          v-model="page"
          :page-count="meta.per_page"
          :total="meta.total"
        />
      </div>
    </UCard>
  </div>
</template>
