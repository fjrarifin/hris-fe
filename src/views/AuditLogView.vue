<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { getAuditLogs } from '../services/navigationService'
import { formatDateTime } from '../utils/formatters'

const loading = ref(false)
const errorMessage = ref('')
const records = ref([])
const modules = ref([])
const pagination = ref({})
const hasSearched = ref(false)
const filters = reactive({
  start_date: '',
  end_date: '',
  module: '',
  action: '',
  q: '',
  page: 1,
  per_page: 15,
})

const actionColors = {
  created: 'success',
  updated: 'warning',
  deleted: 'error',
}
const hiddenChangeFields = ['created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at']

const hasRecords = computed(() => records.value.length > 0)
const formControlClass =
  'w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgo(days) {
  const date = new Date()
  date.setDate(date.getDate() - days)

  return date.toISOString().slice(0, 10)
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : '-'
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

function visibleChanges(record) {
  return (record.changes || []).filter((change) => !hiddenChangeFields.includes(change.field))
}

async function loadLogs(page = 1) {
  if (!filters.start_date || !filters.end_date) {
    errorMessage.value = 'Isi tanggal dari dan sampai dulu.'
    return
  }

  loading.value = true
  errorMessage.value = ''
  filters.page = page
  hasSearched.value = true

  try {
    const { data } = await getAuditLogs(filters)
    records.value = data.records || []
    modules.value = data.modules || []
    pagination.value = data.pagination || {}
    Object.assign(filters, data.filters || {}, { page })
  } catch {
    errorMessage.value = 'Log perubahan tidak dapat dimuat.'
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.start_date = daysAgo(30)
  filters.end_date = today()
  filters.module = ''
  filters.action = ''
  filters.q = ''
  filters.page = 1
  records.value = []
  pagination.value = {}
  hasSearched.value = false
  errorMessage.value = ''
}

onMounted(() => {
  filters.start_date = daysAgo(30)
  filters.end_date = today()
})
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
      <div>
        <h2 class="text-2xl font-semibold text-highlighted">Log Perubahan</h2>
        <p class="mt-1 text-sm text-muted">Daftar perubahan data HRD yang tersimpan di database.</p>
      </div>
      <UBadge color="primary" variant="subtle" :label="`${pagination.total || 0} perubahan`" />
    </div>

    <AlertToastBridge :error="errorMessage" />

    <UCard>
      <form class="grid gap-3 md:grid-cols-2 xl:grid-cols-6" @submit.prevent="loadLogs(1)">
        <div>
          <label class="mb-1 block text-sm font-medium text-muted">Dari</label>
          <input v-model="filters.start_date" type="date" :class="formControlClass" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-muted">Sampai</label>
          <input v-model="filters.end_date" type="date" :class="formControlClass" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-muted">Modul</label>
          <select v-model="filters.module" :class="formControlClass">
            <option value="">Semua modul</option>
            <option v-for="module in modules" :key="module" :value="module">{{ module }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-muted">Aksi</label>
          <select v-model="filters.action" :class="formControlClass">
            <option value="">Semua aksi</option>
            <option value="created">Dibuat</option>
            <option value="updated">Diubah</option>
            <option value="deleted">Dihapus</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-muted">Cari</label>
          <input
            v-model="filters.q"
            type="search"
            :class="formControlClass"
            placeholder="Data, user, modul"
          />
        </div>
        <div class="flex items-end gap-2">
          <UButton type="submit" icon="i-lucide-search" label="Filter" :loading="loading" />
          <UButton
            type="button"
            color="neutral"
            variant="soft"
            icon="i-lucide-rotate-ccw"
            @click="resetFilters"
          />
        </div>
      </form>
    </UCard>

    <div
      v-if="!hasSearched && !loading"
      class="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-muted dark:border-gray-700"
    >
      Pilih filter lalu tekan Filter untuk menampilkan log perubahan.
    </div>

    <div v-else-if="loading" class="py-10 text-center text-sm text-muted">
      Memuat log perubahan...
    </div>

    <div
      v-else-if="!hasRecords"
      class="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-muted dark:border-gray-700"
    >
      Tidak ada perubahan pada rentang filter ini.
    </div>

    <div v-else class="space-y-4">
      <UCard v-for="record in records" :key="record.id">
        <div class="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <UBadge
                :color="actionColors[record.action] || 'neutral'"
                variant="subtle"
                :label="record.action_label"
              />
              <span class="text-sm font-semibold text-highlighted">{{ record.module }}</span>
            </div>
            <h3 class="mt-2 text-base font-semibold text-highlighted">
              {{ record.subject_label }}
            </h3>
            <p class="mt-1 text-sm text-muted">
              {{ record.actor_name }}
              <span v-if="record.actor_username">({{ record.actor_username }})</span> pada
              {{ formatDateTime(record.occurred_at) }}
            </p>
          </div>
        </div>

        <div class="mt-4 overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-gray-200 text-muted dark:border-gray-800">
              <tr>
                <th class="py-2 pr-3 font-medium">Field</th>
                <th class="px-3 py-2 font-medium">Sebelumnya</th>
                <th class="py-2 pl-3 font-medium">Setelahnya</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="change in visibleChanges(record)"
                :key="change.field"
                class="border-b border-gray-100 last:border-0 dark:border-gray-800"
              >
                <td class="py-2 pr-3 font-medium text-highlighted">{{ change.label }}</td>
                <td class="px-3 py-2 text-muted">{{ displayValue(change.old) }}</td>
                <td class="py-2 pl-3 text-highlighted">{{ displayValue(change.new) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </div>

    <div v-if="pagination.last_page > 1" class="flex items-center justify-between">
      <p class="text-sm text-muted">
        {{ pagination.from }}-{{ pagination.to }} dari {{ pagination.total }}
      </p>
      <div class="flex gap-2">
        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-chevron-left"
          :disabled="pagination.current_page <= 1 || loading"
          @click="loadLogs(pagination.current_page - 1)"
        />
        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-chevron-right"
          :disabled="pagination.current_page >= pagination.last_page || loading"
          @click="loadLogs(pagination.current_page + 1)"
        />
      </div>
    </div>
  </section>
</template>
