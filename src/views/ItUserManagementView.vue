<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  getItUsers,
  resetItUserEmailLimit,
  resetItUserPassword,
  resetItUserPasswordLimit,
  resetItUserPhotoLimit,
  updateItUser,
} from '../services/navigationService'
import { askConfirmation } from '../utils/confirmDialog'
import { formatDateTime } from '../utils/formatters'

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const records = ref([])
const pagination = ref({})
const selectedUser = ref(null)
const filters = reactive({
  q: '',
  level: '',
  status: '',
  page: 1,
  per_page: 15,
})
const form = reactive({
  name: '',
  username: '',
  email: '',
  level: 3,
  is_active: true,
})

const levelOptions = [
  { value: 0, label: 'IT' },
  { value: 1, label: 'Admin' },
  { value: 2, label: 'HRD' },
  { value: 3, label: 'Karyawan' },
]
const formControlClass =
  'w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'
const hasRecords = computed(() => records.value.length > 0)

function clearMessages() {
  errorMessage.value = ''
  successMessage.value = ''
}

async function loadUsers(page = 1) {
  loading.value = true
  clearMessages()
  filters.page = page

  try {
    const { data } = await getItUsers(filters)
    records.value = data.records || []
    pagination.value = data.pagination || {}
    Object.assign(filters, data.filters || {}, { page })
  } catch {
    errorMessage.value = 'Data user tidak dapat dimuat.'
  } finally {
    loading.value = false
  }
}

function editUser(user) {
  selectedUser.value = user
  Object.assign(form, {
    name: user.name || '',
    username: user.username || '',
    email: user.email || '',
    level: user.level,
    is_active: user.is_active,
  })
  clearMessages()
}

function closeEditor() {
  selectedUser.value = null
  clearMessages()
}

async function saveUser() {
  if (!selectedUser.value) return

  saving.value = true
  clearMessages()

  try {
    const { data } = await updateItUser(selectedUser.value.id, form)
    successMessage.value = data.message || 'User berhasil diperbarui.'
    selectedUser.value = data.record
    await loadUsers(filters.page)
  } catch (error) {
    errorMessage.value = error.response?.data?.message || Object.values(error.response?.data?.errors || {})?.flat()?.[0] || 'User tidak dapat diperbarui.'
  } finally {
    saving.value = false
  }
}

async function runAction(user, action, message) {
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
    await loadUsers(filters.page)
  } catch {
    errorMessage.value = 'Aksi tidak dapat dijalankan.'
  } finally {
    saving.value = false
  }
}

async function toggleActive(user) {
  const confirmed = await askConfirmation({
    title: user.is_active ? 'Nonaktifkan User' : 'Aktifkan User',
    message: user.is_active
      ? `Nonaktifkan user ${user.name}? Sesi login aktif user ini akan dicabut.`
      : `Aktifkan kembali user ${user.name}?`,
    confirmLabel: user.is_active ? 'Nonaktifkan' : 'Aktifkan',
    color: user.is_active ? 'error' : 'primary',
  })
  if (!confirmed) return

  selectedUser.value = user
  Object.assign(form, {
    name: user.name || '',
    username: user.username || '',
    email: user.email || '',
    level: user.level,
    is_active: !user.is_active,
  })
  await saveUser()
}

function resetFilters() {
  filters.q = ''
  filters.level = ''
  filters.status = ''
  loadUsers(1)
}

onMounted(() => loadUsers())
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
      <div>
        <h2 class="text-2xl font-semibold text-highlighted">Kelola User</h2>
        <p class="mt-1 text-sm text-muted">Aktifkan, nonaktifkan, edit akun, dan reset batas perubahan user.</p>
      </div>
      <UBadge color="primary" variant="subtle" :label="`${pagination.total || 0} user`" />
    </div>

    <AlertToastBridge :error="errorMessage" :message="successMessage" />

    <UCard>
      <form class="grid gap-3 md:grid-cols-2 xl:grid-cols-5" @submit.prevent="loadUsers(1)">
        <div class="xl:col-span-2">
          <label class="mb-1 block text-sm font-medium text-muted">Cari</label>
          <input v-model="filters.q" type="search" :class="formControlClass" placeholder="Nama, username, email" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-muted">Level</label>
          <select v-model="filters.level" :class="formControlClass">
            <option value="">Semua level</option>
            <option v-for="level in levelOptions" :key="level.value" :value="level.value">{{ level.label }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-muted">Status</label>
          <select v-model="filters.status" :class="formControlClass">
            <option value="">Semua status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
        <div class="flex items-end gap-2">
          <UButton type="submit" icon="i-lucide-search" label="Filter" :loading="loading" />
          <UButton type="button" color="neutral" variant="soft" icon="i-lucide-rotate-ccw" @click="resetFilters" />
        </div>
      </form>
    </UCard>

    <UCard v-if="selectedUser">
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-highlighted">Edit User</p>
            <p class="text-xs text-muted">{{ selectedUser.username }}</p>
          </div>
          <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-x" @click="closeEditor" />
        </div>
      </template>

      <form class="grid gap-3 md:grid-cols-2 xl:grid-cols-5" @submit.prevent="saveUser">
        <div>
          <label class="mb-1 block text-sm font-medium text-muted">Nama</label>
          <input v-model="form.name" :class="formControlClass" required />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-muted">Username</label>
          <input v-model="form.username" :class="formControlClass" required />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-muted">Email</label>
          <input v-model="form.email" type="email" :class="formControlClass" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-muted">Level</label>
          <select v-model.number="form.level" :class="formControlClass">
            <option v-for="level in levelOptions" :key="level.value" :value="level.value">{{ level.label }}</option>
          </select>
        </div>
        <label class="flex items-end gap-2 pb-2 text-sm font-medium text-highlighted">
          <input v-model="form.is_active" type="checkbox" class="size-4 rounded border-default" />
          User aktif
        </label>
        <div class="md:col-span-2 xl:col-span-5">
          <UButton type="submit" icon="i-lucide-save" label="Simpan Perubahan" :loading="saving" />
        </div>
      </form>
    </UCard>

    <div v-if="loading" class="py-10 text-center text-sm text-muted">Memuat user...</div>
    <div v-else-if="!hasRecords" class="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-muted dark:border-gray-700">
      Tidak ada user sesuai filter.
    </div>

    <div v-else class="overflow-hidden rounded-lg border border-default bg-default">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[1180px] text-left text-sm">
          <thead class="border-b border-default bg-elevated text-muted">
            <tr>
              <th class="px-4 py-3 font-medium">User</th>
              <th class="px-4 py-3 font-medium">Level</th>
              <th class="px-4 py-3 font-medium">Status</th>
              <th class="px-4 py-3 font-medium">Last Login / Seen</th>
              <th class="px-4 py-3 font-medium">Batas Perubahan</th>
              <th class="px-4 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in records" :key="user.id" class="border-b border-default last:border-0">
              <td class="px-4 py-3">
                <p class="font-semibold text-highlighted">{{ user.name }}</p>
                <p class="text-xs text-muted">{{ user.username }}<span v-if="user.email"> · {{ user.email }}</span></p>
                <p v-if="user.position || user.department" class="mt-1 text-xs text-muted">{{ user.position || '-' }} · {{ user.department || '-' }}</p>
              </td>
              <td class="px-4 py-3">
                <UBadge color="neutral" variant="subtle" :label="user.level_label" />
              </td>
              <td class="px-4 py-3">
                <UBadge :color="user.is_active ? 'success' : 'error'" variant="subtle" :label="user.is_active ? 'Aktif' : 'Nonaktif'" />
              </td>
              <td class="px-4 py-3 text-muted">{{ formatDateTime(user.last_seen_at) }}</td>
              <td class="px-4 py-3 text-xs text-muted">
                <p>Password: {{ formatDateTime(user.password_changed_at) }}</p>
                <p>Email: {{ formatDateTime(user.email_updated_at) }}</p>
                <p>Foto: {{ formatDateTime(user.photo_changed_at) }}</p>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-2">
                  <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-pencil" label="Edit" @click="editUser(user)" />
                  <UButton
                    size="xs"
                    :color="user.is_active ? 'error' : 'success'"
                    variant="soft"
                    :icon="user.is_active ? 'i-lucide-user-x' : 'i-lucide-user-check'"
                    :label="user.is_active ? 'Nonaktifkan' : 'Aktifkan'"
                    :loading="saving && selectedUser?.id === user.id"
                    @click="toggleActive(user)"
                  />
                  <UButton size="xs" color="warning" variant="soft" icon="i-lucide-key-round" label="Reset Password" @click="runAction(user, resetItUserPassword, 'Reset password user ini ke default 12345678?')" />
                  <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-clock-3" label="Reset Batas Password" @click="runAction(user, resetItUserPasswordLimit, 'Kosongkan password_changed_at user ini?')" />
                  <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-mail" label="Reset Email" @click="runAction(user, resetItUserEmailLimit, 'Kosongkan email_updated_at user ini?')" />
                  <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-image" label="Reset Foto" @click="runAction(user, resetItUserPhotoLimit, 'Kosongkan photo_changed_at user ini?')" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="pagination.last_page > 1" class="flex items-center justify-between">
      <p class="text-sm text-muted">{{ pagination.from }}-{{ pagination.to }} dari {{ pagination.total }}</p>
      <div class="flex gap-2">
        <UButton color="neutral" variant="soft" icon="i-lucide-chevron-left" :disabled="pagination.current_page <= 1 || loading" @click="loadUsers(pagination.current_page - 1)" />
        <UButton color="neutral" variant="soft" icon="i-lucide-chevron-right" :disabled="pagination.current_page >= pagination.last_page || loading" @click="loadUsers(pagination.current_page + 1)" />
      </div>
    </div>
  </section>
</template>
