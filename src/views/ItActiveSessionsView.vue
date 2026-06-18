<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  forceLogoutItSession,
  forceLogoutItUserSessions,
  getItActiveSessions,
} from '../services/navigationService'
import { askConfirmation } from '../utils/confirmDialog'
import { apiError, formatDateTime } from '../utils/formatters'

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const records = ref([])
const pagination = ref({})
const summary = ref({})
const filters = reactive({
  q: '',
  platform: '',
  page: 1,
  per_page: 15,
})

const hasRecords = computed(() => records.value.length > 0)
const formControlClass =
  'w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

function clearMessages() {
  errorMessage.value = ''
  successMessage.value = ''
}

async function loadSessions(page = 1) {
  loading.value = true
  filters.page = page
  clearMessages()

  try {
    const { data } = await getItActiveSessions(filters)
    records.value = data.records || []
    pagination.value = data.pagination || {}
    summary.value = data.summary || {}
    Object.assign(filters, data.filters || {}, { page })
  } catch (error) {
    errorMessage.value = apiError(error, 'Sesi login aktif tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.q = ''
  filters.platform = ''
  loadSessions(1)
}

function platformColor(platform) {
  return platform === 'mobile' ? 'info' : 'primary'
}

async function forceLogoutSession(session) {
  const confirmed = await askConfirmation({
    title: 'Logout Paksa Sesi',
    message: `Logout sesi ${session.user_name} dari ${session.platform_label}?`,
    confirmLabel: 'Logout',
    color: 'error',
  })
  if (!confirmed) return

  saving.value = true
  clearMessages()

  try {
    const { data } = await forceLogoutItSession(session.id)
    successMessage.value = data.message || 'Sesi login berhasil di-logout.'
    await loadSessions(pagination.value.current_page || 1)
  } catch (error) {
    errorMessage.value = apiError(error, 'Sesi login tidak dapat di-logout.')
  } finally {
    saving.value = false
  }
}

async function forceLogoutUser(session) {
  const confirmed = await askConfirmation({
    title: 'Logout Semua Sesi User',
    message: `Logout semua sesi aktif milik ${session.user_name}?`,
    confirmLabel: 'Logout Semua',
    color: 'error',
  })
  if (!confirmed) return

  saving.value = true
  clearMessages()

  try {
    const { data } = await forceLogoutItUserSessions(session.user_id)
    successMessage.value = data.message || 'Sesi login user berhasil di-logout.'
    await loadSessions(pagination.value.current_page || 1)
  } catch (error) {
    errorMessage.value = apiError(error, 'Sesi login user tidak dapat di-logout.')
  } finally {
    saving.value = false
  }
}

onMounted(() => loadSessions())
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <p class="text-sm font-medium text-primary">IT Tools</p>
        <h1 class="text-2xl font-semibold text-highlighted">Sesi Login Aktif</h1>
        <p class="mt-1 text-sm text-muted">
          Pantau user yang masih memiliki sesi aktif di HRIS Web dan aplikasi mobile.
        </p>
      </div>
      <div class="grid grid-cols-3 gap-3 text-sm sm:min-w-[28rem]">
        <div class="rounded-lg border border-default bg-default p-3">
          <p class="text-muted">Total</p>
          <p class="mt-1 text-xl font-semibold text-highlighted">{{ summary.total || 0 }}</p>
        </div>
        <div class="rounded-lg border border-default bg-default p-3">
          <p class="text-muted">HRIS Web</p>
          <p class="mt-1 text-xl font-semibold text-highlighted">{{ summary.web || 0 }}</p>
        </div>
        <div class="rounded-lg border border-default bg-default p-3">
          <p class="text-muted">Mobile</p>
          <p class="mt-1 text-xl font-semibold text-highlighted">{{ summary.mobile || 0 }}</p>
        </div>
      </div>
    </div>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Terjadi Kesalahan"
      :description="errorMessage"
    />
    <UAlert
      v-if="successMessage"
      color="success"
      variant="soft"
      title="Berhasil"
      :description="successMessage"
    />

    <UCard>
      <form class="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem_auto]" @submit.prevent="loadSessions(1)">
        <div>
          <label class="mb-1 block text-sm font-medium text-muted">Cari user</label>
          <input
            v-model="filters.q"
            type="search"
            :class="formControlClass"
            placeholder="Nama, NIK, email, jabatan"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-muted">Platform</label>
          <select v-model="filters.platform" :class="formControlClass">
            <option value="">Semua platform</option>
            <option value="web">HRIS Web</option>
            <option value="mobile">Mobile</option>
          </select>
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
          <UButton
            type="button"
            color="neutral"
            variant="soft"
            icon="i-lucide-refresh-cw"
            :loading="loading"
            @click="loadSessions(pagination.current_page || 1)"
          />
        </div>
      </form>
    </UCard>

    <UCard>
      <div v-if="loading" class="py-10 text-center text-sm text-muted">Memuat sesi login aktif...</div>

      <div v-else-if="hasRecords" class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="border-b border-default text-xs uppercase text-muted">
            <tr>
              <th class="p-3">User</th>
              <th class="p-3">Platform</th>
              <th class="p-3">Perangkat</th>
              <th class="p-3">Login</th>
              <th class="p-3">Aktif Terakhir</th>
              <th class="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="session in records" :key="session.id" class="border-b border-default/70">
              <td class="p-3 align-top">
                <div class="min-w-56">
                  <p class="font-medium text-highlighted">{{ session.user_name }}</p>
                  <p class="mt-1 text-xs text-muted">
                    {{ session.username || '-' }} - {{ session.level_label }}
                  </p>
                  <p class="mt-1 text-xs text-muted">
                    {{ session.position || '-' }}<span v-if="session.department"> / {{ session.department }}</span>
                  </p>
                </div>
              </td>
              <td class="p-3 align-top">
                <UBadge
                  :color="platformColor(session.platform)"
                  variant="subtle"
                  :label="session.platform_label"
                />
                <UBadge
                  v-if="session.is_current_session"
                  class="mt-2"
                  color="warning"
                  variant="subtle"
                  label="Sesi Anda"
                />
              </td>
              <td class="p-3 align-top">
                <p class="max-w-72 text-highlighted">{{ session.device_name }}</p>
                <p class="mt-1 text-xs text-muted">{{ session.network_address || 'IP tidak tersedia' }}</p>
              </td>
              <td class="whitespace-nowrap p-3 align-top">{{ formatDateTime(session.signed_in_at) }}</td>
              <td class="whitespace-nowrap p-3 align-top">{{ formatDateTime(session.last_active_at) }}</td>
              <td class="p-3 align-top">
                <div class="flex justify-end gap-2">
                  <UButton
                    size="xs"
                    color="error"
                    variant="soft"
                    icon="i-lucide-log-out"
                    label="Logout"
                    :loading="saving"
                    :disabled="session.is_current_session"
                    @click="forceLogoutSession(session)"
                  />
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="soft"
                    icon="i-lucide-user-x"
                    label="Semua"
                    :loading="saving"
                    @click="forceLogoutUser(session)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-muted dark:border-gray-700">
        Tidak ada sesi login aktif pada filter ini.
      </div>
    </UCard>

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
          @click="loadSessions(pagination.current_page - 1)"
        />
        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-chevron-right"
          :disabled="pagination.current_page >= pagination.last_page || loading"
          @click="loadSessions(pagination.current_page + 1)"
        />
      </div>
    </div>
  </section>
</template>
