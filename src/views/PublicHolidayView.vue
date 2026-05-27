<script setup>
import { onMounted, reactive, ref } from 'vue'
import {
  createPublicHoliday,
  deletePublicHoliday,
  getPublicHolidays,
} from '../services/staffService'
import { apiError, formatDate, statusColor, statusLabel } from '../utils/formatters'

const data = ref({ balance: 0, holidays: [], requests: [] })
const form = reactive({ public_holiday_id: '', claim_date: '' })
const loading = ref(true)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')

async function load() {
  loading.value = true
  try {
    data.value = (await getPublicHolidays()).data
  } catch (error) {
    errorMessage.value = apiError(error, 'Data Public Holiday tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function submit() {
  saving.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    message.value = (await createPublicHoliday(form)).data.message
    form.public_holiday_id = ''
    form.claim_date = ''
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    saving.value = false
  }
}

async function remove(id) {
  if (!window.confirm('Batalkan pengajuan Public Holiday ini?')) return
  try {
    message.value = (await deletePublicHoliday(id)).data.message
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
      <h2 class="text-2xl font-semibold text-highlighted">Public Holiday</h2>
      <p class="mt-1 text-sm text-muted">
        Ajukan hari pengganti untuk PH dalam masa berlaku 90 hari. PH sebelum 27 Mei 2026 tetap
        tersedia sebagai jatah historis; mulai 27 Mei 2026 saldo diperoleh jika Anda memiliki scan
        pada hari libur nasional tersebut.
      </p>
    </div>

    <UAlert v-if="message" color="success" variant="subtle" :description="message" />
    <UAlert v-if="errorMessage" color="error" variant="subtle" :description="errorMessage" />

    <UCard>
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-sm text-muted">Saldo PH Tersedia</p>
          <p class="mt-2 text-3xl font-semibold text-highlighted">{{ data.balance }}</p>
        </div>
        <UBadge color="info" variant="subtle" label="Hari" />
      </div>
    </UCard>

    <UCard title="Ajukan Public Holiday">
      <form class="grid gap-4 lg:grid-cols-2" @submit.prevent="submit">
        <label class="text-sm text-muted">
          Hari Libur
          <select
            v-model="form.public_holiday_id"
            class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            required
          >
            <option disabled value="">Pilih Public Holiday</option>
            <option v-for="holiday in data.holidays" :key="holiday.id" :value="holiday.id">
              {{ holiday.name }} - {{ formatDate(holiday.holiday_date) }}
            </option>
          </select>
        </label>
        <label class="text-sm text-muted">
          Tanggal Pengambilan
          <input
            v-model="form.claim_date"
            type="date"
            class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            required
          />
        </label>
        <UButton
          type="submit"
          label="Kirim Pengajuan PH"
          :loading="saving"
          class="lg:col-span-2 lg:w-fit"
        />
      </form>
    </UCard>

    <UCard title="Riwayat Public Holiday">
      <div v-if="loading" class="py-8 text-center text-sm text-muted">Memuat riwayat...</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">Public Holiday</th>
              <th class="p-3">Tanggal Claim</th>
              <th class="p-3">Status</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in data.requests" :key="item.id" class="border-t border-default">
              <td class="p-3">{{ item.holiday?.name || '-' }}</td>
              <td class="p-3">{{ formatDate(item.claim_date) }}</td>
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
              <td colspan="4" class="p-6 text-center text-muted">Belum ada pengajuan PH.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </section>
</template>
