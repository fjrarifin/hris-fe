<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  forceLogoutItDashboardSession,
  forceLogoutItDashboardUserSessions,
  getItDashboard,
  resetItDashboardUserPassword,
  resetItDashboardUserPasswordLimit,
  resetItDashboardUserPhotoLimit,
} from '../services/navigationService'
import { askConfirmation } from '../utils/confirmDialog'
import { apiError, formatDate, formatDateTime } from '../utils/formatters'

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const dashboard = ref(null)
const filters = reactive({
  user_q: '',
})

const summary = computed(() => dashboard.value?.summary || {})
const activeSessions = computed(() => dashboard.value?.active_sessions || [])
const latestEmployees = computed(() => dashboard.value?.latest_employees || [])
const users = computed(() => dashboard.value?.users || [])
const formControlClass =
  'w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

function clearMessages() {
  errorMessage.value = ''
  successMessage.value = ''
}

function platformColor(platform) {
  return platform === 'mobile' ? 'info' : 'primary'
}

async function loadDashboard() {
  loading.value = true
  clearMessages()

  try {
    const { data } = await getItDashboard({
      user_q: filters.user_q,
    })
    dashboard.value = data
    filters.user_q = data.filters?.user_q || filters.user_q
  } catch (error) {
    errorMessage.value = apiError(error, 'Dashboard IT tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.user_q = ''
  loadDashboard()
}

async function runUserAction(user, action, message) {
  const confirmed = await askConfirmation({
    title: 'Konfirmasi Aksi User',
    message,
    confirmLabel: 'Lanjutkan',
    color: 'warning',
  })
  if (!confirmed) return

  saving.value = true
  clearMessages()

  try {
    const { data } = await action(user.id)
    successMessage.value = data.message || 'Aksi berhasil dijalankan.'
    await loadDashboard()
  } catch (error) {
    errorMessage.value = apiError(error, 'Aksi user tidak dapat dijalankan.')
  } finally {
    saving.value = false
  }
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
    const { data } = await forceLogoutItDashboardSession(session.id)
    successMessage.value = data.message || 'Sesi login berhasil di-logout.'
    await loadDashboard()
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
    const { data } = await forceLogoutItDashboardUserSessions(session.user_id)
    successMessage.value = data.message || 'Sesi login user berhasil di-logout.'
    await loadDashboard()
  } catch (error) {
    errorMessage.value = apiError(error, 'Sesi login user tidak dapat di-logout.')
  } finally {
    saving.value = false
  }
}

onMounted(() => loadDashboard())
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <p class="text-sm font-medium text-primary">IT Tools</p>
        <h1 class="text-2xl font-semibold text-highlighted">Dashboard IT</h1>
        <p class="mt-1 text-sm text-muted">
          Pantau sesi login, user aktif, dan lakukan reset cepat dari satu halaman.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-refresh-cw"
          label="Refresh"
          :loading="loading"
          @click="loadDashboard"
        />
        <UButton
          :to="{ name: 'it-active-sessions' }"
          icon="i-lucide-monitor-check"
          label="Sesi Aktif"
          variant="soft"
        />
        <UButton
          :to="{ name: 'it-users' }"
          icon="i-lucide-users-round"
          label="Kelola User"
          variant="soft"
        />
      </div>
    </div>

    <AlertToastBridge :error="errorMessage" :message="successMessage" />

    <div v-if="loading && !dashboard" class="py-10 text-center text-sm text-muted">
      Memuat dashboard IT...
    </div>

    <div v-else class="space-y-6">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <UCard>
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm text-muted">Online Saat Ini</p>
              <p class="mt-2 text-3xl font-semibold text-highlighted">
                {{ summary.online_now || 0 }}
              </p>
            </div>
            <UBadge color="success" variant="subtle" label="2 menit" />
          </div>
          <p class="mt-5 text-sm text-muted">User dengan heartbeat terbaru.</p>
        </UCard>
        <UCard>
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm text-muted">Sesi Login Aktif</p>
              <p class="mt-2 text-3xl font-semibold text-highlighted">
                {{ summary.active_sessions?.total || 0 }}
              </p>
            </div>
            <UBadge color="primary" variant="subtle" label="Total" />
          </div>
          <p class="mt-5 text-sm text-muted">Semua token Web dan Mobile yang belum idle.</p>
        </UCard>
        <UCard>
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm text-muted">HRIS Web</p>
              <p class="mt-2 text-3xl font-semibold text-highlighted">
                {{ summary.active_sessions?.web || 0 }}
              </p>
            </div>
            <UBadge color="primary" variant="subtle" label="Web" />
          </div>
          <p class="mt-5 text-sm text-muted">Sesi aktif dari aplikasi web.</p>
        </UCard>
        <UCard>
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm text-muted">Mobile</p>
              <p class="mt-2 text-3xl font-semibold text-highlighted">
                {{ summary.active_sessions?.mobile || 0 }}
              </p>
            </div>
            <UBadge color="info" variant="subtle" label="App" />
          </div>
          <p class="mt-5 text-sm text-muted">Sesi aktif dari aplikasi mobile.</p>
        </UCard>
      </div>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
        <UCard>
          <template #header>
            <div class="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <p class="text-sm font-semibold text-highlighted">User yang Sedang Login</p>
                <p class="text-xs text-muted">
                  Logout satu sesi atau semua sesi user langsung dari sini.
                </p>
              </div>
              <RouterLink
                class="text-sm font-medium text-primary hover:underline"
                :to="{ name: 'it-active-sessions' }"
              >
                Lihat semua
              </RouterLink>
            </div>
          </template>

          <div v-if="activeSessions.length" class="overflow-x-auto">
            <table class="min-w-full text-left text-sm">
              <thead class="border-b border-default text-xs uppercase text-muted">
                <tr>
                  <th class="p-3">User</th>
                  <th class="p-3">Platform</th>
                  <th class="p-3">Perangkat</th>
                  <th class="p-3">Aktif Terakhir</th>
                  <th class="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="session in activeSessions"
                  :key="session.id"
                  class="border-b border-default/70 last:border-0"
                >
                  <td class="p-3 align-top">
                    <p class="font-medium text-highlighted">{{ session.user_name }}</p>
                    <p class="mt-1 text-xs text-muted">
                      {{ session.username || '-' }} - {{ session.level_label }}
                    </p>
                    <p class="mt-1 text-xs text-muted">
                      {{ session.position || '-'
                      }}<span v-if="session.department"> / {{ session.department }}</span>
                    </p>
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
                    <p class="max-w-64 text-highlighted">{{ session.device_name }}</p>
                    <p class="mt-1 text-xs text-muted">
                      {{ session.network_address || 'IP tidak tersedia' }}
                    </p>
                  </td>
                  <td class="whitespace-nowrap p-3 align-top">
                    {{ formatDateTime(session.last_active_at) }}
                  </td>
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

          <div
            v-else
            class="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-muted dark:border-gray-700"
          >
            Tidak ada sesi login aktif.
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div>
              <p class="text-sm font-semibold text-highlighted">Karyawan Terbaru</p>
              <p class="text-xs text-muted">Urutan berdasarkan data yang paling akhir dibuat.</p>
            </div>
          </template>

          <div v-if="latestEmployees.length" class="space-y-3">
            <RouterLink
              v-for="employee in latestEmployees"
              :key="employee.nik"
              class="block rounded-lg border border-default p-3 transition hover:border-primary/50"
              :to="{ name: 'employee-detail', params: { nik: employee.nik } }"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate font-medium text-highlighted">{{ employee.name }}</p>
                  <p class="mt-1 text-xs text-muted">
                    {{ employee.nik }} - {{ employee.position || '-' }}
                  </p>
                  <p class="mt-1 text-xs text-muted">{{ employee.department || '-' }}</p>
                </div>
                <UBadge color="neutral" variant="subtle" :label="formatDate(employee.join_date)" />
              </div>
            </RouterLink>
          </div>

          <div
            v-else
            class="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-muted dark:border-gray-700"
          >
            Belum ada data karyawan.
          </div>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <div class="flex flex-col justify-between gap-3 xl:flex-row xl:items-end">
            <div>
              <p class="text-sm font-semibold text-highlighted">Quick Action User</p>
              <p class="text-xs text-muted">
                Cari user lalu reset password, batas password, atau batas foto tanpa membuka halaman
                kelola user.
              </p>
            </div>
            <form
              class="flex w-full flex-col gap-2 sm:flex-row xl:max-w-xl"
              @submit.prevent="loadDashboard"
            >
              <input
                v-model="filters.user_q"
                type="search"
                :class="formControlClass"
                placeholder="Cari nama, NIK, username, email"
              />
              <div class="flex gap-2">
                <UButton type="submit" icon="i-lucide-search" label="Cari" :loading="loading" />
                <UButton
                  type="button"
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-rotate-ccw"
                  @click="resetFilters"
                />
              </div>
            </form>
          </div>
        </template>

        <div v-if="users.length" class="overflow-x-auto">
          <table class="w-full min-w-[960px] text-left text-sm">
            <thead class="border-b border-default text-xs uppercase text-muted">
              <tr>
                <th class="p-3">User</th>
                <th class="p-3">Role</th>
                <th class="p-3">Status</th>
                <th class="p-3">Last Seen</th>
                <th class="p-3">Batas Perubahan</th>
                <th class="p-3 text-right">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="user in users"
                :key="user.id"
                class="border-b border-default/70 last:border-0"
              >
                <td class="p-3 align-top">
                  <p class="font-medium text-highlighted">{{ user.name }}</p>
                  <p class="mt-1 text-xs text-muted">
                    {{ user.username }}<span v-if="user.email"> - {{ user.email }}</span>
                  </p>
                  <p class="mt-1 text-xs text-muted">
                    {{ user.position || '-'
                    }}<span v-if="user.department"> / {{ user.department }}</span>
                  </p>
                </td>
                <td class="p-3 align-top">
                  <UBadge color="neutral" variant="subtle" :label="user.level_label" />
                </td>
                <td class="p-3 align-top">
                  <UBadge
                    :color="user.is_active ? 'success' : 'error'"
                    variant="subtle"
                    :label="user.is_active ? 'Aktif' : 'Nonaktif'"
                  />
                  <UBadge
                    v-if="user.must_change_password"
                    class="mt-2"
                    color="warning"
                    variant="subtle"
                    label="Wajib ganti password"
                  />
                </td>
                <td class="whitespace-nowrap p-3 align-top">
                  {{ formatDateTime(user.last_seen_at) }}
                </td>
                <td class="p-3 align-top text-xs text-muted">
                  <p>Password: {{ formatDateTime(user.password_changed_at) }}</p>
                  <p>Foto: {{ formatDateTime(user.photo_changed_at) }}</p>
                </td>
                <td class="p-3 align-top">
                  <div class="flex flex-wrap justify-end gap-2">
                    <UButton
                      size="xs"
                      color="warning"
                      variant="soft"
                      icon="i-lucide-key-round"
                      label="Password"
                      :loading="saving"
                      @click="
                        runUserAction(
                          user,
                          resetItDashboardUserPassword,
                          `Reset password ${user.name} ke default 12345678?`,
                        )
                      "
                    />
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="soft"
                      icon="i-lucide-clock-3"
                      label="Limit Pass"
                      :loading="saving"
                      @click="
                        runUserAction(
                          user,
                          resetItDashboardUserPasswordLimit,
                          `Kosongkan batas ganti password ${user.name}?`,
                        )
                      "
                    />
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="soft"
                      icon="i-lucide-image"
                      label="Limit Foto"
                      :loading="saving"
                      @click="
                        runUserAction(
                          user,
                          resetItDashboardUserPhotoLimit,
                          `Kosongkan batas ganti foto ${user.name}?`,
                        )
                      "
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-else
          class="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-muted dark:border-gray-700"
        >
          Tidak ada user sesuai pencarian.
        </div>
      </UCard>
    </div>
  </section>
</template>
