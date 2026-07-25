<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import AlertToastBridge from '../components/AlertToastBridge.vue'
import { askConfirmation } from '../utils/confirmDialog'
import {
  getItFingerspot,
  pullAllItFingerspot,
  pullAttlogItFingerspot,
  pullEmployeeItFingerspot,
  sendAllItFingerspot,
  sendEmployeeItFingerspot,
} from '../services/navigationService'
import { apiError } from '../utils/formatters'

const loading = ref(true)
const actionLoading = ref(false)
const message = ref('')
const errorMessage = ref('')

const summary = reactive({
  total_machines: 0,
  total_employees: 0,
  total_templates_saved: 0,
  total_cards_saved: 0,
})

const clouds = ref([])
const employees = ref([])
const webhookLogs = ref([])

const page = ref(1)
const itemsPerPage = 10

const paginatedEmployees = computed(() => {
  const start = (page.value - 1) * itemsPerPage
  return employees.value.slice(start, start + itemsPerPage)
})

const visibleRange = computed(() => {
  if (!employees.value.length) {
    return '0 data'
  }

  const start = (page.value - 1) * itemsPerPage + 1
  const end = Math.min(page.value * itemsPerPage, employees.value.length)

  return `${start}-${end} dari ${employees.value.length} data`
})

const filters = reactive({
  search: '',
  department: '',
  has_template: 'all',
})

const attlogForm = reactive({
  cloud_id: '',
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date().toISOString().slice(0, 10),
})
const attlogLoading = ref(false)

async function loadData() {
  loading.value = true
  errorMessage.value = ''
  page.value = 1
  try {
    const { data } = await getItFingerspot({
      search: filters.search,
      department: filters.department,
      has_template: filters.has_template,
    })

    clouds.value = data.clouds ?? []
    employees.value = data.employees ?? []
    webhookLogs.value = data.webhook_logs ?? []

    if (data.summary) {
      Object.assign(summary, data.summary)
    }
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal memuat data manajemen Fingerspot.')
  } finally {
    loading.value = false
  }
}

async function handlePullAll(cloudId = null) {
  const machineLabel = cloudId ? `mesin ${cloudId}` : 'SEMUA MESIN'
  const confirmed = await askConfirmation({
    title: 'Konfirmasi Tarik Massal Biometrik',
    message: `Apakah Anda yakin ingin mengirim perintah Tarik Biometrik untuk seluruh karyawan dari ${machineLabel}?`,
    confirmLabel: 'Ya, Tarik Biometrik',
    cancelLabel: 'Batal',
    color: 'primary',
  })
  if (!confirmed) return

  actionLoading.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const { data } = await pullAllItFingerspot({ cloud_id: cloudId })
    message.value = data.message || 'Perintah tarik massal berhasil dikirim.'
    await loadData()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal melakukan tarik massal biometrik.')
  } finally {
    actionLoading.value = false
  }
}

async function handleSendAll(cloudId = null) {
  const machineLabel = cloudId ? `mesin ${cloudId}` : 'SEMUA MESIN'
  const confirmed = await askConfirmation({
    title: 'Konfirmasi Kirim Massal Biometrik',
    message: `Apakah Anda yakin ingin MENGIRIM seluruh profile & template biometrik karyawan ke ${machineLabel}?`,
    confirmLabel: 'Ya, Kirim Data',
    cancelLabel: 'Batal',
    color: 'emerald',
  })
  if (!confirmed) return

  actionLoading.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const { data } = await sendAllItFingerspot({ cloud_id: cloudId })
    message.value = data.message || 'Perintah kirim massal berhasil dikirim.'
    await loadData()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal melakukan kirim massal data & biometrik.')
  } finally {
    actionLoading.value = false
  }
}

async function handlePullEmployee(emp, cloudId = null) {
  actionLoading.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const { data } = await pullEmployeeItFingerspot(emp.nik, { cloud_id: cloudId })
    message.value = data.message || `Tarik data biometrik ${emp.name} berhasil.`
    await loadData()
  } catch (error) {
    errorMessage.value = apiError(error, `Gagal narik data ${emp.name}.`)
  } finally {
    actionLoading.value = false
  }
}

const sendModal = reactive({
  open: false,
  employee: null,
  selectedClouds: [],
  sending: false,
})

function openSendModal(emp) {
  sendModal.employee = emp
  sendModal.selectedClouds = clouds.value.map((c) => c.id)
  sendModal.open = true
}

async function submitSendModal() {
  if (!sendModal.employee || !sendModal.selectedClouds.length) return
  sendModal.sending = true
  actionLoading.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    let successCount = 0
    for (const cloudId of sendModal.selectedClouds) {
      await sendEmployeeItFingerspot(sendModal.employee.nik, { cloud_id: cloudId })
      successCount++
    }
    message.value = `Profile & biometrik ${sendModal.employee.name} berhasil dikirim ke ${successCount} target mesin!`
    sendModal.open = false
    await loadData()
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal mengalirkan data ke mesin.')
  } finally {
    sendModal.sending = false
    actionLoading.value = false
  }
}

async function handleSendEmployee(emp, cloudId = null) {
  openSendModal(emp)
}

async function handlePullAttlog() {
  attlogLoading.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const { data } = await pullAttlogItFingerspot(attlogForm)
    message.value = data.message || 'Perintah tarik log absensi berhasil dikirim.'
  } catch (error) {
    errorMessage.value = apiError(error, 'Gagal narik log absensi.')
  } finally {
    attlogLoading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <section class="space-y-6">
    <!-- Header Title -->
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h2 class="text-2xl font-semibold text-highlighted">Manajemen Mesin & Biometrik Fingerspot</h2>
        <p class="mt-1 text-sm text-muted">
          Pusat kendali integrasi biometrik & mesin absensi Fingerspot untuk IT Administrator.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          type="button"
          icon="i-lucide-arrow-down-left"
          label="Tarik Semua Biometrik"
          color="primary"
          variant="solid"
          :loading="actionLoading"
          @click="handlePullAll()"
        />
        <UButton
          type="button"
          icon="i-lucide-arrow-up-right"
          label="Kirim Semua Data & Biometrik"
          color="emerald"
          variant="solid"
          :loading="actionLoading"
          @click="handleSendAll()"
        />
      </div>
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <!-- Metrics Cards -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl border border-default bg-card p-5 shadow-xs">
        <div class="flex items-center gap-3">
          <div class="metric-icon metric-icon-blue flex size-10 items-center justify-center rounded-lg">
            <UIcon name="i-lucide-cpu" class="size-5" />
          </div>
          <div>
            <p class="text-xs font-medium text-muted">Total Mesin Absensi</p>
            <p class="mt-0.5 text-xl font-bold text-highlighted">{{ summary.total_machines }} Mesin</p>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-default bg-card p-5 shadow-xs">
        <div class="flex items-center gap-3">
          <div class="metric-icon metric-icon-indigo flex size-10 items-center justify-center rounded-lg">
            <UIcon name="i-lucide-users" class="size-5" />
          </div>
          <div>
            <p class="text-xs font-medium text-muted">Karyawan Ber-PIN</p>
            <p class="mt-0.5 text-xl font-bold text-highlighted">{{ summary.total_employees }} Karyawan</p>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-default bg-card p-5 shadow-xs">
        <div class="flex items-center gap-3">
          <div class="metric-icon metric-icon-emerald flex size-10 items-center justify-center rounded-lg">
            <UIcon name="i-lucide-fingerprint" class="size-5" />
          </div>
          <div>
            <p class="text-xs font-medium text-muted">Biometrik Tersimpan</p>
            <p class="mt-0.5 text-xl font-bold text-highlighted">{{ summary.total_templates_saved }} Template</p>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-default bg-card p-5 shadow-xs">
        <div class="flex items-center gap-3">
          <div class="metric-icon metric-icon-teal flex size-10 items-center justify-center rounded-lg">
            <UIcon name="i-lucide-id-card" class="size-5" />
          </div>
          <div>
            <p class="text-xs font-medium text-muted">Kartu RFID Tersimpan</p>
            <p class="mt-0.5 text-xl font-bold text-highlighted">{{ summary.total_cards_saved }} Kartu</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Machine List Cards -->
    <UCard title="Daftar Mesin Fingerspot Terkoneksi">
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="m in clouds"
          :key="m.id"
          class="flex flex-col justify-between rounded-xl border border-default bg-default p-4 shadow-xs"
        >
          <div>
            <div class="flex items-center justify-between">
              <span class="inline-flex items-center gap-1.5 font-semibold text-highlighted">
                <UIcon name="i-lucide-hard-drive" class="size-4 text-primary" />
                {{ m.name }}
              </span>
              <UBadge color="success" variant="subtle" label="Online Cloud" />
            </div>
            <p class="mt-2 font-mono text-xs text-muted">Cloud ID: {{ m.id }}</p>
          </div>
          <div class="mt-4 flex flex-wrap items-center gap-2 border-t border-default pt-3">
            <UButton
              size="xs"
              color="primary"
              variant="soft"
              icon="i-lucide-arrow-down"
              label="Tarik Mesin Ini"
              :disabled="actionLoading"
              @click="handlePullAll(m.id)"
            />
            <UButton
              size="xs"
              color="emerald"
              variant="soft"
              icon="i-lucide-arrow-up"
              label="Kirim ke Mesin Ini"
              :disabled="actionLoading"
              @click="handleSendAll(m.id)"
            />
          </div>
        </div>
      </div>
    </UCard>

    <!-- Manual Attendance Pull Section -->
    <UCard title="Tarik Log Absensi Manual (attlog)">
      <form class="flex flex-col gap-4 sm:flex-row sm:items-end" @submit.prevent="handlePullAttlog">
        <label class="text-sm text-muted">
          Pilih Mesin
          <select
            v-model="attlogForm.cloud_id"
            class="mt-1.5 w-full rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted focus:border-primary focus:outline-none"
          >
            <option value="">Semua Mesin</option>
            <option v-for="m in clouds" :key="m.id" :value="m.id">
              {{ m.name }} ({{ m.id }})
            </option>
          </select>
        </label>

        <label class="text-sm text-muted">
          Tanggal Mulai
          <input
            v-model="attlogForm.start_date"
            type="date"
            class="mt-1.5 w-full rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted focus:border-primary focus:outline-none"
          />
        </label>

        <label class="text-sm text-muted">
          Tanggal Selesai
          <input
            v-model="attlogForm.end_date"
            type="date"
            class="mt-1.5 w-full rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted focus:border-primary focus:outline-none"
          />
        </label>

        <UButton
          type="submit"
          icon="i-lucide-download-cloud"
          label="Tarik Log Absensi"
          color="primary"
          variant="solid"
          :loading="attlogLoading"
        />
      </form>
    </UCard>

    <!-- Employee Biometrics Inventory Table -->
    <UCard title="Inventory Biometrik & Data Karyawan">
      <!-- Filter Bar -->
      <form class="mb-4 grid gap-4 sm:grid-cols-3" @submit.prevent="loadData">
        <input
          v-model="filters.search"
          type="text"
          placeholder="Cari Nama, NIK, atau PIN..."
          class="rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted focus:border-primary focus:outline-none"
          @input="loadData"
        />

        <select
          v-model="filters.has_template"
          class="rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted focus:border-primary focus:outline-none"
          @change="loadData"
        >
          <option value="all">Semua Status Biometrik</option>
          <option value="yes">✓ Biometrik Tersimpan</option>
          <option value="no">✕ Belum Ada Biometrik</option>
        </select>

        <UButton type="submit" icon="i-lucide-refresh-cw" label="Refresh" variant="outline" :loading="loading" />
      </form>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-highlighted">
          <thead class="border-b border-default bg-muted/20 text-xs uppercase text-muted">
            <tr>
              <th class="p-3">PIN / NIK</th>
              <th class="p-3">Nama Karyawan</th>
              <th class="p-3">Departemen</th>
              <th class="p-3">Status Biometrik</th>
              <th class="p-3">Status Sync Mesin</th>
              <th class="p-3">RFID Card</th>
              <th class="p-3">Terakhir Ditarik</th>
              <th class="p-3 text-right">Aksi Sync</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="p-8 text-center text-muted">
                Memuat inventory biometrik...
              </td>
            </tr>

            <tr v-else-if="!employees.length">
              <td colspan="8" class="p-8 text-center text-muted">
                Tidak ada data karyawan sesuai filter.
              </td>
            </tr>

            <tr v-for="emp in paginatedEmployees" :key="emp.nik" class="border-t border-default hover:bg-muted/10">
              <td class="whitespace-nowrap p-3 font-mono">
                <div class="font-bold text-highlighted">PIN: {{ emp.pin }}</div>
                <div class="text-xs text-muted">NIK: {{ emp.nik }}</div>
              </td>
              <td class="p-3 font-medium">
                {{ emp.name }}
              </td>
              <td class="whitespace-nowrap p-3 text-muted">
                {{ emp.department }}
              </td>
              <td class="whitespace-nowrap p-3">
                <UBadge
                  v-if="emp.has_template"
                  color="success"
                  variant="subtle"
                  label="✓ Tersimpan"
                />
                <UBadge
                  v-else
                  color="warning"
                  variant="subtle"
                  label="Belum Ada"
                />
              </td>
              <td class="whitespace-nowrap p-3">
                <div class="flex flex-wrap gap-1">
                  <UBadge
                    v-for="m in clouds"
                    :key="m.id"
                    :color="(emp.synced_clouds || []).includes(m.id) ? 'success' : 'neutral'"
                    variant="subtle"
                    size="xs"
                    :label="((emp.synced_clouds || []).includes(m.id) ? '✓ ' : '✕ ') + m.name"
                  />
                </div>
              </td>
              <td class="whitespace-nowrap p-3">
                <span v-if="emp.card" class="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Card: {{ emp.card }}
                </span>
                <span v-else class="text-xs text-muted">-</span>
              </td>
              <td class="whitespace-nowrap p-3 text-xs text-muted">
                {{ emp.last_pulled_at }}
              </td>
              <td class="whitespace-nowrap p-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <UButton
                    size="xs"
                    color="primary"
                    variant="soft"
                    icon="i-lucide-download"
                    label="Tarik"
                    :disabled="actionLoading"
                    @click="handlePullEmployee(emp)"
                  />
                  <UButton
                    size="xs"
                    color="emerald"
                    variant="soft"
                    icon="i-lucide-send"
                    label="Kirim Ke Mesin"
                    :disabled="actionLoading"
                    @click="handleSendEmployee(emp)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div
        v-if="!loading && employees.length"
        class="mt-4 flex flex-col items-center justify-between gap-3 border-t border-default pt-4 sm:flex-row"
      >
        <p class="text-sm text-muted">Menampilkan {{ visibleRange }}</p>

        <UPagination
          v-model:page="page"
          :total="employees.length"
          :items-per-page="itemsPerPage"
          :sibling-count="1"
          show-controls
        />
      </div>
    </UCard>

    <!-- Webhook Callback Activity Log -->
    <UCard title="Log Aktivitas Callback Webhook Fingerspot">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-highlighted">
          <thead class="border-b border-default bg-muted/20 text-xs uppercase text-muted">
            <tr>
              <th class="p-3">Waktu</th>
              <th class="p-3">Type</th>
              <th class="p-3">Cloud ID</th>
              <th class="p-3">IP Address</th>
              <th class="p-3">Ringkasan Callback</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!webhookLogs.length">
              <td colspan="5" class="p-8 text-center text-muted">Belum ada log webhook.</td>
            </tr>
            <tr v-for="w in webhookLogs" :key="w.id" class="border-t border-default hover:bg-muted/10">
              <td class="whitespace-nowrap p-3 font-mono text-xs text-muted">{{ w.received_at }}</td>
              <td class="whitespace-nowrap p-3">
                <UBadge color="neutral" variant="subtle" :label="w.type" />
              </td>
              <td class="whitespace-nowrap p-3 font-mono text-xs">{{ w.cloud_id }}</td>
              <td class="whitespace-nowrap p-3 font-mono text-xs text-muted">{{ w.ip_address }}</td>
              <td class="p-3 text-xs text-highlighted">{{ w.summary }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Send to Specific Machine Modal -->
    <div
      v-if="sendModal.open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
        aria-label="Tutup modal"
        @click="sendModal.open = false"
      ></button>
      <UCard class="relative max-h-[88vh] w-full max-w-md overflow-hidden">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold text-highlighted">Kirim Data Karyawan Ke Mesin</h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              @click="sendModal.open = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-sm font-semibold text-highlighted">
            {{ sendModal.employee?.name }} (PIN: {{ sendModal.employee?.pin }})
          </p>
          <p class="text-xs text-muted">
            Pilih mesin mana saja yang ingin dikirimkan data profil & biometrik karyawan ini:
          </p>

          <div class="space-y-2">
            <label
              v-for="c in clouds"
              :key="c.id"
              class="flex cursor-pointer items-center gap-3 rounded-lg border border-default bg-muted/10 p-3 hover:bg-muted/20"
            >
              <input
                v-model="sendModal.selectedClouds"
                type="checkbox"
                :value="c.id"
                class="size-4 rounded border-default text-primary focus:ring-primary"
              />
              <div class="flex flex-1 items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-highlighted">{{ c.name }}</p>
                  <p class="font-mono text-xs text-muted">{{ c.id }}</p>
                </div>
                <UBadge
                  :color="(sendModal.employee?.synced_clouds || []).includes(c.id) ? 'success' : 'neutral'"
                  variant="subtle"
                  size="xs"
                  :label="(sendModal.employee?.synced_clouds || []).includes(c.id) ? '✓ Sudah Sync' : '✕ Belum'"
                />
              </div>
            </label>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              label="Batal"
              @click="sendModal.open = false"
            />
            <UButton
              type="button"
              color="emerald"
              variant="solid"
              icon="i-lucide-send"
              label="Kirim ke Mesin Terpilih"
              :loading="sendModal.sending"
              :disabled="!sendModal.selectedClouds.length"
              @click="submitSendModal"
            />
          </div>
        </template>
      </UCard>
    </div>
  </section>
</template>

<style scoped>
.metric-icon-blue {
  background-color: #dbeafe !important;
  color: #1d4ed8 !important;
}
.metric-icon-indigo {
  background-color: #e0e7ff !important;
  color: #4338ca !important;
}
.metric-icon-emerald {
  background-color: #d1fae5 !important;
  color: #047857 !important;
}
.metric-icon-teal {
  background-color: #ccfbf1 !important;
  color: #0f766e !important;
}

:deep(.dark) .metric-icon-blue,
.dark .metric-icon-blue {
  background-color: rgba(30, 58, 138, 0.7) !important;
  color: #60a5fa !important;
}
:deep(.dark) .metric-icon-indigo,
.dark .metric-icon-indigo {
  background-color: rgba(49, 46, 129, 0.7) !important;
  color: #818cf8 !important;
}
:deep(.dark) .metric-icon-emerald,
.dark .metric-icon-emerald {
  background-color: rgba(6, 78, 59, 0.7) !important;
  color: #34d399 !important;
}
:deep(.dark) .metric-icon-teal,
.dark .metric-icon-teal {
  background-color: rgba(19, 78, 74, 0.7) !important;
  color: #2dd4bf !important;
}
</style>
