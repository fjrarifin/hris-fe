<script setup>
import { onMounted, ref } from 'vue'
import { decideStaffApproval, getStaffApprovals } from '../services/staffService'
import { apiError, formatDate } from '../utils/formatters'

const requests = ref([])
const loading = ref(true)
const message = ref('')
const errorMessage = ref('')
const actingId = ref(null)

function typeLabel(type) {
  return { leave: 'Cuti', ph: 'PH', permission: 'Izin / Sakit' }[type] || type
}

async function load() {
  loading.value = true
  try {
    requests.value = (await getStaffApprovals()).data.requests
  } catch (error) {
    errorMessage.value = apiError(error, 'Daftar approval tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function decide(item, decision) {
  const reason = decision === 'rejected' ? window.prompt('Alasan penolakan (opsional):') : null
  if (decision === 'rejected' && reason === null) return

  actingId.value = item.id
  message.value = ''
  errorMessage.value = ''
  try {
    message.value = (
      await decideStaffApproval(item.type, item.id, { decision, reason })
    ).data.message
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    actingId.value = null
  }
}

onMounted(load)
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Approval Pengajuan Tim</h2>
      <p class="mt-1 text-sm text-muted">
        Pengajuan bawahan langsung yang menunggu keputusan Anda.
      </p>
    </div>

    <UAlert v-if="message" color="success" variant="subtle" :description="message" />
    <UAlert v-if="errorMessage" color="error" variant="subtle" :description="errorMessage" />

    <UCard>
      <div v-if="loading" class="py-10 text-center text-sm text-muted">Memuat pengajuan...</div>
      <div v-else-if="!requests.length" class="py-10 text-center text-sm text-muted">
        Tidak ada pengajuan yang menunggu approval.
      </div>
      <div v-else class="space-y-4">
        <div
          v-for="item in requests"
          :key="`${item.type}-${item.id}`"
          class="rounded-xl border border-default p-4"
        >
          <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div class="flex items-center gap-2">
                <UBadge color="primary" variant="subtle" :label="typeLabel(item.type)" />
                <p class="font-semibold text-highlighted">{{ item.employee_name }}</p>
              </div>
              <p class="mt-2 text-sm text-muted">{{ item.employee_nik }} - {{ item.label }}</p>
              <p class="mt-1 text-sm text-muted">
                {{ formatDate(item.start_date)
                }}<span v-if="item.end_date"> - {{ formatDate(item.end_date) }}</span>
              </p>
              <p v-if="item.reason" class="mt-2 text-sm text-highlighted">{{ item.reason }}</p>
            </div>
            <div class="flex gap-2">
              <UButton
                color="success"
                variant="soft"
                label="Setujui"
                :loading="actingId === item.id"
                @click="decide(item, 'approved')"
              />
              <UButton
                color="error"
                variant="soft"
                label="Tolak"
                :disabled="actingId === item.id"
                @click="decide(item, 'rejected')"
              />
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </section>
</template>
