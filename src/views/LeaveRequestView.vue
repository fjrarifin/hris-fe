<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { createLeave, deleteLeave, getLeaves } from '../services/staffService'
import { apiError, formatDate, statusColor, statusLabel } from '../utils/formatters'

const data = ref({ balance: {}, leave_types: {}, requests: [] })
const form = reactive({ leave_type: 'cuti_tahunan', start_date: '', end_date: '', reason: '' })
const loading = ref(true)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')
const balanceCards = computed(() => [
  { label: 'Total Accrual', value: data.value.balance.total || 0 },
  { label: 'Sudah Digunakan', value: data.value.balance.used || 0 },
  { label: 'Saldo Tersedia', value: data.value.balance.available || 0 },
])

const selectedLeaveLabel = computed(() => {
  return data.value.leave_types && data.value.leave_types[form.leave_type]
    ? data.value.leave_types[form.leave_type]
    : form.leave_type
})

const isNormatif = computed(() => {
  return String(selectedLeaveLabel.value || '').toLowerCase().includes('normatif')
})

async function load() {
  loading.value = true
  try {
    data.value = (await getLeaves()).data
  } catch (error) {
    errorMessage.value = apiError(error, 'Data cuti tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function submit() {
  saving.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const response = await createLeave(form)
    message.value = response.data.message
    form.start_date = ''
    form.end_date = ''
    form.reason = ''
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    saving.value = false
  }
}

async function remove(id) {
  if (!window.confirm('Batalkan pengajuan cuti ini?')) return
  try {
    message.value = (await deleteLeave(id)).data.message
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  }
}

onMounted(load)
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Pengajuan Cuti</h2>
      <p class="mt-1 text-sm text-muted">Ajukan cuti maksimal 5 hari untuk satu pengajuan.</p>
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <div class="grid gap-4 sm:grid-cols-3">
      <UCard v-for="card in balanceCards" :key="card.label">
        <p class="text-sm text-muted">{{ card.label }}</p>
        <p class="mt-2 text-3xl font-semibold text-highlighted">{{ card.value }}</p>
      </UCard>
    </div>

    <UCard title="Ajukan Cuti Baru">
      <form class="grid gap-4 lg:grid-cols-2" @submit.prevent="submit">
        <label class="text-sm text-muted">
          Jenis Cuti
          <select
            v-model="form.leave_type"
            class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
          >
            <option v-for="(label, value) in data.leave_types" :key="value" :value="value">
              {{ label }}
            </option>
          </select>
          <div
            v-if="isNormatif"
            class="mt-2 flex items-center gap-2 text-xs text-muted"
            :title="`Cuti normatif: jenis cuti yang tidak dapat dihindari, mis. meninggal keluarga dekat, melahirkan, dan kejadian lain di luar hak cuti tahunan.`"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-9-4a1 1 0 112 0v1a1 1 0 11-2 0V6zm1 3a1 1 0 00-.993.883L9 10v3a1 1 0 001.993.117L11 13v-3a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span>
              Cuti normatif: jenis cuti yang tidak dapat dihindari (mis. meninggal keluarga dekat, cuti melahirkan), bukan bagian dari hak cuti tahunan.
            </span>
          </div>
        </label>
        <label class="text-sm text-muted">
          Alasan
          <input
            v-model="form.reason"
            class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            required
          />
        </label>
        <label class="text-sm text-muted">
          Tanggal Mulai
          <input
            v-model="form.start_date"
            type="date"
            class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            required
          />
        </label>
        <label class="text-sm text-muted">
          Tanggal Selesai
          <input
            v-model="form.end_date"
            type="date"
            class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            required
          />
        </label>
        <UButton
          type="submit"
          label="Kirim Pengajuan"
          :loading="saving"
          class="lg:col-span-2 lg:w-fit"
        />
      </form>
    </UCard>

    <UCard title="Riwayat Cuti">
      <div v-if="loading" class="py-8 text-center text-sm text-muted">Memuat riwayat...</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">Jenis</th>
              <th class="p-3">Periode</th>
              <th class="p-3">Alasan</th>
              <th class="p-3">Status</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in data.requests" :key="item.id" class="border-t border-default">
              <td class="p-3">{{ data.leave_types[item.leave_type] || item.leave_type }}</td>
              <td class="p-3">
                {{ formatDate(item.start_date) }} - {{ formatDate(item.end_date) }}
              </td>
              <td class="p-3">{{ item.reason || '-' }}</td>
              <td class="p-3">
                <UBadge
                  :color="statusColor(item.status)"
                  variant="subtle"
                  :label="statusLabel(item.status)"
                />
              </td>
              <td class="p-3">
                <UButton
                  v-if="item.status === 'pending'"
                  color="error"
                  variant="ghost"
                  size="sm"
                  label="Batalkan"
                  @click="remove(item.id)"
                />
              </td>
            </tr>
            <tr v-if="!data.requests.length">
              <td colspan="5" class="p-6 text-center text-muted">Belum ada pengajuan cuti.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </section>
</template>
