<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { cancelHrApproval, decideHrApproval, getHrApprovals } from '../services/hrService'
import { apiError, formatDate, statusColor, statusLabel } from '../utils/formatters'

const route = useRoute()
const type = computed(() => route.meta.approvalType)
const title = computed(
  () =>
    ({
      leave: 'Cuti',
      overtime: 'Lembur',
      ph: 'Public Holiday',
      permission: 'Izin / Sakit',
    })[type.value],
)
const requests = ref([])
const status = ref('waiting_hr')
const loading = ref(false)
const actingId = ref(null)
const message = ref('')
const errorMessage = ref('')

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    requests.value = (await getHrApprovals(type.value, { status: status.value })).data.requests
  } catch (error) {
    errorMessage.value = apiError(error, 'Data approval tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function decide(item, decision) {
  const reason = decision === 'rejected' ? window.prompt('Alasan penolakan:') : null
  if (decision === 'rejected' && !reason) return

  actingId.value = item.id
  errorMessage.value = ''
  message.value = ''
  try {
    message.value = (await decideHrApproval(type.value, item.id, { decision, reason })).data.message
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    actingId.value = null
  }
}

async function cancel(item) {
  const reason = window.prompt('Alasan pembatalan approval HRD:')
  if (!reason) return

  actingId.value = item.id
  errorMessage.value = ''
  message.value = ''
  try {
    message.value = (await cancelHrApproval(type.value, item.id, { reason })).data.message
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    actingId.value = null
  }
}

watch(
  type,
  () => {
    status.value = 'waiting_hr'
    load()
  },
  { immediate: true },
)
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Approval {{ title }}</h2>
      <p class="mt-1 text-sm text-muted">
        Verifikasi akhir HRD untuk pengajuan yang telah masuk ke antrean persetujuan.
      </p>
    </div>
    <UAlert v-if="message" color="success" variant="subtle" :description="message" />
    <UAlert v-if="errorMessage" color="error" variant="subtle" :description="errorMessage" />

    <UCard title="Filter Status">
      <form class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="load">
        <label class="text-sm text-muted">
          Status Pengajuan
          <select
            v-model="status"
            class="mt-2 block rounded-lg border border-default bg-default p-2.5 text-highlighted"
          >
            <option value="waiting_hr">Menunggu HRD</option>
            <option value="all">Semua Status</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </label>
        <UButton type="submit" label="Tampilkan" :loading="loading" />
      </form>
    </UCard>

    <UCard :title="`Daftar Pengajuan ${title}`">
      <div v-if="loading" class="py-10 text-center text-sm text-muted">Memuat pengajuan...</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">Karyawan</th>
              <th class="p-3">Jenis</th>
              <th class="p-3">Tanggal / Waktu</th>
              <th class="p-3">Keterangan</th>
              <th class="p-3">Status</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in requests" :key="item.id" class="border-t border-default">
              <td class="p-3">
                <p class="font-medium text-highlighted">{{ item.employee_name }}</p>
                <p class="text-xs text-muted">{{ item.employee_nik }} - {{ item.department }}</p>
              </td>
              <td class="p-3">{{ item.label }}</td>
              <td class="p-3">
                {{ formatDate(item.date)
                }}<span v-if="item.end_date"> - {{ formatDate(item.end_date) }}</span>
                <p v-if="item.time" class="text-xs text-muted">{{ item.time }}</p>
              </td>
              <td class="max-w-60 p-3">
                <a
                  v-if="item.document_url"
                  :href="item.document_url"
                  target="_blank"
                  rel="noopener"
                  class="text-primary"
                  >Lihat surat sakit</a
                >
                <span v-else>{{ item.reason || item.reject_reason || '-' }}</span>
              </td>
              <td class="p-3">
                <UBadge
                  :color="statusColor(item.status)"
                  variant="subtle"
                  :label="statusLabel(item.status)"
                />
              </td>
              <td class="p-3">
                <div v-if="item.can_decide" class="flex gap-2">
                  <UButton
                    size="xs"
                    color="success"
                    variant="soft"
                    label="Setujui"
                    :loading="actingId === item.id"
                    @click="decide(item, 'approved')"
                  />
                  <UButton
                    size="xs"
                    color="error"
                    variant="soft"
                    label="Tolak"
                    :disabled="actingId === item.id"
                    @click="decide(item, 'rejected')"
                  />
                </div>
                <UButton
                  v-else-if="item.can_cancel"
                  size="xs"
                  color="error"
                  variant="soft"
                  label="Batalkan"
                  :loading="actingId === item.id"
                  @click="cancel(item)"
                />
                <span v-else class="text-xs text-muted">Selesai</span>
              </td>
            </tr>
            <tr v-if="!requests.length">
              <td colspan="6" class="p-8 text-center text-muted">
                Tidak ada pengajuan pada filter ini.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </section>
</template>
