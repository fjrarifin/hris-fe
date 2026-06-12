<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  getItPushNotificationRecipients,
  getItPushNotifications,
  sendItPushNotification,
} from '../services/navigationService'
import { askConfirmation } from '../utils/confirmDialog'
import { formatDateTime } from '../utils/formatters'

const loading = ref(false)
const loadingRecipients = ref(false)
const sending = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const logs = ref([])
const recipients = ref([])
const selectedUserIds = ref([])
const pagination = ref({})
const recipientPagination = ref({})
const summary = ref({})
const filters = reactive({ page: 1, per_page: 10 })
const recipientFilters = reactive({ q: '', page: 1, per_page: 50 })
const form = reactive({
  audience: 'all_employees',
  title: '',
  message: '',
  mobile_path: '/notifications',
  send_push: true,
})

const selectedRecipients = computed(() =>
  recipients.value.filter((recipient) => selectedUserIds.value.includes(recipient.id)),
)
const targetLabel = computed(() => {
  if (form.audience === 'all_employees') {
    return `${summary.value.active_employee_count || 0} karyawan aktif`
  }

  return `${selectedUserIds.value.length} user terpilih`
})
const tokenLabel = computed(() => {
  if (form.audience === 'all_employees') {
    return `${summary.value.active_employee_token_count || 0} token Android`
  }

  const tokens = selectedRecipients.value.reduce((total, recipient) => total + Number(recipient.mobile_token_count || 0), 0)
  return `${tokens} token Android`
})

function clearMessages() {
  errorMessage.value = ''
  successMessage.value = ''
}

async function loadLogs(page = 1) {
  loading.value = true
  filters.page = page
  clearMessages()

  try {
    const { data } = await getItPushNotifications(filters)
    logs.value = data.records || []
    pagination.value = data.pagination || {}
  } catch {
    errorMessage.value = 'Riwayat push notification tidak dapat dimuat.'
  } finally {
    loading.value = false
  }
}

async function loadRecipients(page = 1) {
  loadingRecipients.value = true
  recipientFilters.page = page

  try {
    const { data } = await getItPushNotificationRecipients(recipientFilters)
    recipients.value = data.records || []
    recipientPagination.value = data.pagination || {}
    summary.value = data.summary || {}
  } catch {
    errorMessage.value = 'Daftar penerima tidak dapat dimuat.'
  } finally {
    loadingRecipients.value = false
  }
}

function toggleRecipient(userId) {
  if (selectedUserIds.value.includes(userId)) {
    selectedUserIds.value = selectedUserIds.value.filter((id) => id !== userId)
    return
  }

  selectedUserIds.value = [...selectedUserIds.value, userId]
}

function resetForm() {
  form.audience = 'all_employees'
  form.title = ''
  form.message = ''
  form.mobile_path = '/notifications'
  form.send_push = true
  selectedUserIds.value = []
}

async function submit() {
  clearMessages()

  if (form.audience === 'selected' && selectedUserIds.value.length < 1) {
    errorMessage.value = 'Pilih minimal satu user penerima.'
    return
  }

  const confirmed = await askConfirmation({
    title: 'Kirim Push Notification',
    message: `Kirim notifikasi "${form.title}" ke ${targetLabel.value}?`,
    confirmLabel: 'Kirim',
    color: 'primary',
  })
  if (!confirmed) return

  sending.value = true
  try {
    const payload = {
      ...form,
      user_ids: form.audience === 'selected' ? selectedUserIds.value : [],
    }
    const { data } = await sendItPushNotification(payload)
    successMessage.value = data.message || 'Notifikasi berhasil dikirim.'
    resetForm()
    await Promise.all([loadLogs(1), loadRecipients(recipientFilters.page)])
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      Object.values(error.response?.data?.errors || {})?.flat()?.[0] ||
      'Push notification tidak dapat dikirim.'
  } finally {
    sending.value = false
  }
}

function statusColor(record) {
  if (!record.token_count) return 'warning'
  if (record.push_sent_count > 0) return 'success'
  return 'error'
}

function searchRecipients() {
  loadRecipients(1)
}

onMounted(async () => {
  await Promise.all([loadLogs(), loadRecipients()])
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <p class="text-sm font-medium text-primary">IT Tools</p>
        <h1 class="text-2xl font-semibold text-highlighted">Push Notification</h1>
        <p class="mt-1 text-sm text-muted">
          Kirim informasi ke aplikasi Android karyawan melalui in-app notification dan push notification.
        </p>
      </div>
      <div class="grid grid-cols-2 gap-3 text-sm sm:min-w-80">
        <div class="rounded-lg border border-default bg-default p-3">
          <p class="text-muted">Karyawan aktif</p>
          <p class="mt-1 text-xl font-semibold text-highlighted">{{ summary.active_employee_count || 0 }}</p>
        </div>
        <div class="rounded-lg border border-default bg-default p-3">
          <p class="text-muted">Token Android</p>
          <p class="mt-1 text-xl font-semibold text-highlighted">{{ summary.active_employee_token_count || 0 }}</p>
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

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
      <UCard title="Kirim Notifikasi">
        <form class="space-y-5" @submit.prevent="submit">
          <div class="grid gap-4 md:grid-cols-2">
            <label class="text-sm text-muted">
              Target penerima
              <select
                v-model="form.audience"
                class="mt-2 w-full rounded-lg border border-default bg-default px-3 py-2 text-highlighted"
              >
                <option value="all_employees">Semua karyawan aktif</option>
                <option value="selected">Pilih user tertentu</option>
              </select>
            </label>

            <label class="text-sm text-muted">
              Halaman saat notifikasi dibuka
              <input
                v-model="form.mobile_path"
                type="text"
                class="mt-2 w-full rounded-lg border border-default bg-default px-3 py-2 text-highlighted"
                placeholder="/notifications"
              />
            </label>
          </div>

          <label class="block text-sm text-muted">
            Judul
            <input
              v-model="form.title"
              required
              maxlength="150"
              type="text"
              class="mt-2 w-full rounded-lg border border-default bg-default px-3 py-2 text-highlighted"
              placeholder="Contoh: Informasi HRIS"
            />
          </label>

          <label class="block text-sm text-muted">
            Isi pesan
            <textarea
              v-model="form.message"
              required
              maxlength="1000"
              rows="5"
              class="mt-2 w-full rounded-lg border border-default bg-default px-3 py-2 text-highlighted"
              placeholder="Tulis informasi yang akan dikirim ke karyawan."
            ></textarea>
          </label>

          <label class="flex items-center gap-2 text-sm text-highlighted">
            <input v-model="form.send_push" type="checkbox" class="size-4 rounded border-default" />
            Kirim push Android juga
          </label>

          <div class="rounded-lg border border-default bg-elevated p-4 text-sm">
            <div class="flex flex-wrap gap-2">
              <UBadge color="primary" variant="subtle" :label="targetLabel" />
              <UBadge color="info" variant="subtle" :label="tokenLabel" />
            </div>
            <p class="mt-3 text-muted">
              In-app notification tetap disimpan untuk semua target. Push Android hanya terkirim ke device yang sudah
              mengizinkan notifikasi dan memiliki token aktif.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <UButton type="submit" label="Kirim Notifikasi" icon="i-lucide-send" :loading="sending" />
            <UButton type="button" label="Reset" variant="soft" color="neutral" @click="resetForm" />
          </div>
        </form>
      </UCard>

      <UCard title="Pilih User">
        <div class="space-y-4">
          <form class="flex gap-2" @submit.prevent="searchRecipients">
            <input
              v-model="recipientFilters.q"
              type="search"
              class="min-w-0 flex-1 rounded-lg border border-default bg-default px-3 py-2 text-sm text-highlighted"
              placeholder="Cari nama, NIK, unit"
            />
            <UButton type="submit" icon="i-lucide-search" :loading="loadingRecipients" />
          </form>

          <div class="max-h-[31rem] space-y-2 overflow-y-auto pr-1">
            <button
              v-for="recipient in recipients"
              :key="recipient.id"
              type="button"
              :class="[
                'w-full rounded-lg border p-3 text-left transition',
                selectedUserIds.includes(recipient.id)
                  ? 'border-primary bg-primary/10'
                  : 'border-default bg-default hover:bg-elevated',
              ]"
              @click="toggleRecipient(recipient.id)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate font-medium text-highlighted">{{ recipient.name }}</p>
                  <p class="truncate text-xs text-muted">
                    {{ recipient.username }} - {{ recipient.level_label }}
                  </p>
                  <p class="truncate text-xs text-muted">
                    {{ recipient.department || '-' }}<span v-if="recipient.unit"> / {{ recipient.unit }}</span>
                  </p>
                </div>
                <UBadge
                  :color="recipient.mobile_token_count > 0 ? 'success' : 'warning'"
                  variant="subtle"
                  :label="`${recipient.mobile_token_count} token`"
                />
              </div>
            </button>
            <p v-if="!loadingRecipients && recipients.length < 1" class="py-6 text-center text-sm text-muted">
              User tidak ditemukan.
            </p>
          </div>

          <div
            v-if="recipientPagination.last_page > 1"
            class="flex items-center justify-between border-t border-default pt-3 text-sm"
          >
            <span class="text-muted">
              Hal. {{ recipientPagination.current_page }} / {{ recipientPagination.last_page }}
            </span>
            <div class="flex gap-2">
              <UButton
                size="xs"
                variant="soft"
                label="Prev"
                :disabled="recipientPagination.current_page <= 1"
                @click="loadRecipients(recipientPagination.current_page - 1)"
              />
              <UButton
                size="xs"
                variant="soft"
                label="Next"
                :disabled="recipientPagination.current_page >= recipientPagination.last_page"
                @click="loadRecipients(recipientPagination.current_page + 1)"
              />
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <UCard title="Riwayat Pengiriman">
      <div v-if="loading" class="py-8 text-center text-sm text-muted">Memuat riwayat...</div>
      <div v-else-if="logs.length" class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="border-b border-default text-xs uppercase text-muted">
            <tr>
              <th class="p-3">Waktu</th>
              <th class="p-3">Judul</th>
              <th class="p-3">Target</th>
              <th class="p-3">Penerima</th>
              <th class="p-3">Push</th>
              <th class="p-3">Pengirim</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in logs" :key="record.id" class="border-b border-default/70">
              <td class="p-3 whitespace-nowrap">{{ formatDateTime(record.created_at) }}</td>
              <td class="p-3">
                <p class="font-medium text-highlighted">{{ record.title }}</p>
                <p class="mt-1 line-clamp-2 text-xs text-muted">{{ record.message }}</p>
              </td>
              <td class="p-3 whitespace-nowrap">{{ record.audience_label }}</td>
              <td class="p-3 whitespace-nowrap">{{ record.database_sent_count }} / {{ record.recipient_count }}</td>
              <td class="p-3 whitespace-nowrap">
                <UBadge
                  :color="statusColor(record)"
                  variant="subtle"
                  :label="`${record.push_sent_count} / ${record.token_count}`"
                />
              </td>
              <td class="p-3 whitespace-nowrap">{{ record.sent_by_name || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="py-8 text-center text-sm text-muted">Belum ada riwayat pengiriman.</p>
    </UCard>
  </div>
</template>
