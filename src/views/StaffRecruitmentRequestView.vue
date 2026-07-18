<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  getStaffRecruitmentRequests,
  createStaffRecruitmentRequest,
} from '../services/staffService'
import { getEmployeeOptions } from '../services/hrService'
import { apiError } from '../utils/formatters'

const records = ref([])
const search = ref('')
const message = ref('')
const errorMessage = ref('')
const createDialogOpen = ref(false)
const isSubmitting = ref(false)

const positionTitles = ref([])
const departments = ref([])
const units = ref([])

const form = reactive({
  title: '',
  department: '',
  unit: '',
  quantity: 1,
  description: '',
})

const formControlClass =
  'w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

const filteredRecords = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return records.value.filter((record) => {
    return (
      record.title.toLowerCase().includes(keyword) ||
      (record.department || '').toLowerCase().includes(keyword) ||
      (record.unit || '').toLowerCase().includes(keyword) ||
      (record.description || '').toLowerCase().includes(keyword)
    )
  })
})

async function load() {
  try {
    const [reqsRes, optsRes] = await Promise.all([
      getStaffRecruitmentRequests(),
      getEmployeeOptions(),
    ])
    records.value = reqsRes.data
    positionTitles.value = optsRes.data.position_titles || []
    departments.value = optsRes.data.departments || []
    units.value = optsRes.data.units || []
  } catch (error) {
    errorMessage.value = apiError(error)
  }
}

function openCreateDialog() {
  Object.assign(form, {
    title: '',
    department: '',
    unit: '',
    quantity: 1,
    description: '',
  })
  createDialogOpen.value = true
}

function closeCreateDialog() {
  createDialogOpen.value = false
}

async function saveRequest() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const response = await createStaffRecruitmentRequest(form)
    message.value = response.data.message || 'Pengajuan rekrutmen berhasil diajukan.'
    closeCreateDialog()
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    isSubmitting.value = false
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'approved':
      return 'success'
    case 'rejected':
      return 'danger'
    default:
      return 'neutral'
  }
}

onMounted(load)
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 class="text-2xl font-semibold text-highlighted">
          Pengajuan Rekrutmen (Manpower Request)
        </h2>
        <p class="mt-1 text-sm text-muted">
          Ajukan kebutuhan penambahan karyawan baru untuk divisi Anda dan pantau prosesnya.
        </p>
      </div>
      <div>
        <UButton size="sm" icon="i-lucide-plus" label="Ajukan Manpower" @click="openCreateDialog" />
      </div>
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <UCard>
      <template #header>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="font-semibold text-highlighted">Histori Pengajuan Manpower</h3>
            <p class="mt-1 text-sm text-muted">
              Pantau status persetujuan dan tahapan pelamar lowongan kerja Anda.
            </p>
          </div>
          <input
            v-model="search"
            type="search"
            placeholder="Cari pengajuan..."
            class="w-full rounded-lg border border-default bg-default p-2.5 text-sm sm:max-w-sm"
          />
        </div>
      </template>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-muted border-b border-default">
              <th class="p-3">Posisi Lowongan</th>
              <th class="p-3">Departemen</th>
              <th class="p-3">Jumlah (Qty)</th>
              <th class="p-3">Status Pengajuan</th>
              <th class="p-3">Progress Pipeline Pelamar</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in filteredRecords"
              :key="item.id"
              class="border-t border-default hover:bg-muted/10 transition"
            >
              <td class="p-3">
                <p class="font-semibold text-highlighted">{{ item.title }}</p>
                <p class="mt-0.5 text-xs text-muted max-w-xs truncate">
                  {{ item.description || 'Tidak ada justifikasi' }}
                </p>
              </td>
              <td class="p-3 text-highlighted">
                {{ item.department || '-' }}
                <p v-if="item.unit" class="mt-0.5 text-xs text-muted">Unit: {{ item.unit }}</p>
              </td>
              <td class="p-3 text-highlighted font-medium">{{ item.quantity }} Orang</td>
              <td class="p-3">
                <UBadge :color="getStatusColor(item.status)" variant="soft">
                  {{ item.status.toUpperCase() }}
                </UBadge>
                <p v-if="item.hrd_notes" class="mt-1 text-xs text-danger italic">
                  Catatan: {{ item.hrd_notes }}
                </p>
              </td>
              <td class="p-3">
                <div
                  v-if="item.status === 'approved' && item.stats"
                  class="flex flex-wrap gap-1.5 items-center"
                >
                  <span class="text-xs text-muted font-medium mr-1"
                    >Total: {{ item.stats.total }}</span
                  >
                  <UBadge v-if="item.stats.applied > 0" color="neutral" variant="soft" size="xs">
                    Applied: {{ item.stats.applied }}
                  </UBadge>
                  <UBadge v-if="item.stats.screening > 0" color="primary" variant="soft" size="xs">
                    Screening: {{ item.stats.screening }}
                  </UBadge>
                  <UBadge v-if="item.stats.interview > 0" color="warning" variant="soft" size="xs">
                    Interview: {{ item.stats.interview }}
                  </UBadge>
                  <UBadge v-if="item.stats.offered > 0" color="info" variant="soft" size="xs">
                    Offered: {{ item.stats.offered }}
                  </UBadge>
                  <UBadge v-if="item.stats.hired > 0" color="success" variant="soft" size="xs">
                    Hired: {{ item.stats.hired }}
                  </UBadge>
                  <UBadge v-if="item.stats.rejected > 0" color="danger" variant="soft" size="xs">
                    Rejected: {{ item.stats.rejected }}
                  </UBadge>
                </div>
                <span v-else-if="item.status === 'approved'" class="text-xs text-muted italic"
                  >Mempersiapkan lowongan...</span
                >
                <span v-else class="text-xs text-muted">-</span>
              </td>
            </tr>
            <tr v-if="!filteredRecords.length">
              <td colspan="5" class="p-6 text-center text-muted">Histori pengajuan kosong.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Create Request Dialog -->
    <div
      v-if="createDialogOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Ajukan Manpower Baru"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60"
        @click="closeCreateDialog"
      ></button>
      <UCard class="relative max-h-[88vh] w-full max-w-lg overflow-hidden">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-highlighted">Buat Pengajuan Manpower</p>
              <p class="mt-1 text-xs text-muted">
                Isi formulir kebutuhan penambahan karyawan baru.
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="closeCreateDialog"
            />
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="saveRequest">
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Nama Lowongan / Posisi</label>
            <select v-model="form.title" required :class="formControlClass">
              <option value="">Pilih posisi...</option>
              <option v-for="t in positionTitles" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Departemen</label>
            <select v-model="form.department" required :class="formControlClass">
              <option value="">Pilih departemen...</option>
              <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Unit</label>
            <select v-model="form.unit" required :class="formControlClass">
              <option value="">Pilih unit...</option>
              <option v-for="u in units" :key="u" :value="u">{{ u }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Jumlah Orang (Qty)</label>
            <input
              v-model.number="form.quantity"
              type="number"
              min="1"
              required
              :class="formControlClass"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-muted"
              >Deskripsi Tugas & Justifikasi Kebutuhan</label
            >
            <textarea
              v-model="form.description"
              rows="4"
              placeholder="Mengapa membutuhkan penambahan staf dan apa saja jobdesk singkatnya?"
              :class="formControlClass"
            ></textarea>
          </div>
          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton
              type="button"
              label="Batal"
              color="neutral"
              variant="ghost"
              @click="closeCreateDialog"
            />
            <UButton type="submit" label="Kirim Pengajuan" :loading="isSubmitting" />
          </div>
        </form>
      </UCard>
    </div>
  </section>
</template>
