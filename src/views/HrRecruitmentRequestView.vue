<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { getHrRecruitmentRequests, decideHrRecruitmentRequest, getHrVacancies } from '../services/hrService'
import { apiError } from '../utils/formatters'

const records = ref([])
const vacancies = ref([])
const search = ref('')
const message = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)
const decideDialogOpen = ref(false)

const decideForm = reactive({
  id: null,
  title: '',
  requester_name: '',
  quantity: 1,
  status: 'approved',
  hrd_notes: '',
  vacancy_link_mode: 'new', // 'none', 'new', 'existing'
  vacancy_id: '',
})

const formControlClass =
  'w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

const filteredRecords = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return records.value.filter((record) => {
    const requesterName = record.requester?.nama_karyawan || ''
    return (
      record.title.toLowerCase().includes(keyword) ||
      (record.department || '').toLowerCase().includes(keyword) ||
      requesterName.toLowerCase().includes(keyword)
    );
  })
})

async function load() {
  try {
    const [reqsRes, vacsRes] = await Promise.all([getHrRecruitmentRequests(), getHrVacancies()])
    records.value = reqsRes.data
    vacancies.value = vacsRes.data.filter((v) => v.status === 'open')
  } catch (error) {
    errorMessage.value = apiError(error)
  }
}

function openDecideDialog(item) {
  Object.assign(decideForm, {
    id: item.id,
    title: item.title,
    requester_name: item.requester?.nama_karyawan || item.requester_nik,
    quantity: item.quantity,
    status: 'approved',
    hrd_notes: '',
    vacancy_link_mode: 'new',
    vacancy_id: '',
  })
  decideDialogOpen.value = true
}

function closeDecideDialog() {
  decideDialogOpen.value = false
}

async function submitDecision() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const payload = {
      status: decideForm.status,
      hrd_notes: decideForm.hrd_notes,
      vacancy_link_mode: decideForm.status === 'approved' ? decideForm.vacancy_link_mode : 'none',
      vacancy_id: decideForm.status === 'approved' && decideForm.vacancy_link_mode === 'existing' ? decideForm.vacancy_id : null,
    }
    const response = await decideHrRecruitmentRequest(decideForm.id, payload)
    message.value = response.data.message || 'Keputusan berhasil disimpan.'
    closeDecideDialog()
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
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Persetujuan Lowongan (Manpower Requests)</h2>
      <p class="mt-1 text-sm text-muted">Tinjau, setujui, atau tolak permohonan penambahan manpower dari para Manager/SPV.</p>
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <UCard>
      <template #header>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="font-semibold text-highlighted">Semua Pengajuan Manpower</h3>
            <p class="mt-1 text-sm text-muted">Klik "Proses" untuk memutuskan dan menghubungkan pengajuan dengan lowongan kerja.</p>
          </div>
          <input
            v-model="search"
            type="search"
            placeholder="Cari pengaju, posisi, divisi..."
            class="w-full rounded-lg border border-default bg-default p-2.5 text-sm sm:max-w-sm"
          />
        </div>
      </template>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-muted border-b border-default">
              <th class="p-3">Pengaju</th>
              <th class="p-3">Posisi Lowongan</th>
              <th class="p-3">Departemen</th>
              <th class="p-3">Qty</th>
              <th class="p-3">Status</th>
              <th class="p-3">Lowongan Terhubung</th>
              <th class="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredRecords" :key="item.id" class="border-t border-default hover:bg-muted/10 transition">
              <td class="p-3">
                <p class="font-semibold text-highlighted">{{ item.requester?.nama_karyawan || item.requester_nik }}</p>
                <p class="mt-0.5 text-xs text-muted">NIK: {{ item.requester_nik }}</p>
              </td>
              <td class="p-3">
                <p class="font-semibold text-highlighted">{{ item.title }}</p>
                <p class="mt-0.5 text-xs text-muted max-w-xs truncate">{{ item.description || 'Tidak ada justifikasi' }}</p>
              </td>
              <td class="p-3 text-highlighted">
                {{ item.department || '-' }}
                <p v-if="item.unit" class="mt-0.5 text-xs text-muted">Unit: {{ item.unit }}</p>
              </td>
              <td class="p-3 text-highlighted">{{ item.quantity }} Orang</td>
              <td class="p-3">
                <UBadge :color="getStatusColor(item.status)" variant="soft">
                  {{ item.status.toUpperCase() }}
                </UBadge>
                <p v-if="item.hrd_notes" class="mt-1 text-xs text-muted max-w-xs truncate">Catatan: {{ item.hrd_notes }}</p>
              </td>
              <td class="p-3">
                <span v-if="item.vacancy" class="text-xs text-primary font-medium">
                  {{ item.vacancy.title }}
                </span>
                <span v-else class="text-xs text-muted italic">-</span>
              </td>
              <td class="p-3 text-right">
                <UButton
                  v-if="item.status === 'pending'"
                  size="xs"
                  label="Proses"
                  variant="soft"
                  icon="i-lucide-gavel"
                  @click="openDecideDialog(item)"
                />
                <span v-else class="text-xs text-muted">Selesai diproses</span>
              </td>
            </tr>
            <tr v-if="!filteredRecords.length">
              <td colspan="7" class="p-6 text-center text-muted">Pengajuan manpower tidak ditemukan.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Decide Dialog -->
    <div
      v-if="decideDialogOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Keputusan Pengajuan Manpower"
    >
      <button type="button" class="absolute inset-0 bg-slate-950/60" @click="closeDecideDialog"></button>
      <UCard class="relative max-h-[88vh] w-full max-w-lg overflow-hidden">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-highlighted">Proses Pengajuan Manpower</p>
              <p class="mt-1 text-xs text-muted">Permintaan: {{ decideForm.title }} ({{ decideForm.quantity }} Orang) oleh {{ decideForm.requester_name }}</p>
            </div>
            <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-x" @click="closeDecideDialog" />
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="submitDecision">
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Keputusan</label>
            <select v-model="decideForm.status" :class="formControlClass">
              <option value="approved">Setujui (Approved)</option>
              <option value="rejected">Tolak (Rejected)</option>
            </select>
          </div>

          <!-- Opsional lowongan jika disetujui -->
          <div v-if="decideForm.status === 'approved'" class="space-y-4 border border-default rounded-lg p-3.5 bg-muted/5">
            <div>
              <label class="mb-1 block text-xs font-semibold text-highlighted">Link Lowongan Kerja</label>
              <select v-model="decideForm.vacancy_link_mode" :class="formControlClass">
                <option value="new">Buat lowongan baru otomatis</option>
                <option value="existing">Hubungkan ke lowongan yang sudah ada</option>
                <option value="none">Setujui saja (belum dibuatkan lowongan)</option>
              </select>
            </div>

            <div v-if="decideForm.vacancy_link_mode === 'existing'">
              <label class="mb-1 block text-xs font-medium text-muted">Pilih Lowongan Aktif</label>
              <select v-model="decideForm.vacancy_id" required :class="formControlClass">
                <option value="">Pilih lowongan...</option>
                <option v-for="v in vacancies" :key="v.id" :value="v.id">{{ v.title }} ({{ v.department || 'Tanpa Divisi' }})</option>
              </select>
            </div>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Catatan Keputusan / HRD Notes</label>
            <textarea v-model="decideForm.hrd_notes" rows="3" placeholder="Tuliskan catatan dari HRD (wajib diisi jika ditolak)" :required="decideForm.status === 'rejected'" :class="formControlClass"></textarea>
          </div>

          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton type="button" label="Batal" color="neutral" variant="ghost" @click="closeDecideDialog" />
            <UButton type="submit" label="Simpan Keputusan" :loading="isSubmitting" />
          </div>
        </form>
      </UCard>
    </div>
  </section>
</template>
