<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  createPublicHoliday,
  deletePublicHoliday,
  getPublicHolidays,
} from '../services/staffService'
import { askConfirmation } from '../utils/confirmDialog'
import { apiError, formatDate, statusColor, statusLabel } from '../utils/formatters'

const data = ref({ balance: 0, holidays: [], expired_holidays: [], requests: [] })
const form = reactive({ public_holiday_id: '', claim_date: '' })
const selectedHoliday = computed(() =>
  data.value.holidays.find((holiday) => String(holiday.id) === String(form.public_holiday_id)) || null
)
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
  if (
    !(await askConfirmation({
      title: 'Batalkan Pengajuan',
      message: 'Batalkan pengajuan Public Holiday ini?',
      confirmLabel: 'Batalkan',
      color: 'error',
    }))
  )
    return
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
  <section class="recruitment-page space-y-6 p-4 sm:p-6 lg:p-8">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Public Holiday</h2>
      <p class="mt-1 text-sm text-muted">
        PH berlaku 3 bulan kalender dan wajib digunakan paling lambat pada tanggal kedaluwarsa. PH hangus mulai hari berikutnya. PH sebelum 27 Mei 2026 tetap
        tersedia sebagai jatah historis; mulai 27 Mei 2026 saldo diperoleh jika Anda memiliki scan
        pada hari libur nasional tersebut.
      </p>
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

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
              {{ holiday.name }} - {{ formatDate(holiday.holiday_date) }}{{ holiday.expired_at ? ` (Berlaku s/d ${formatDate(holiday.expired_at)})` : '' }}
            </option>
          </select>
        </label>
        <label class="text-sm text-muted">
          Tanggal Pengambilan
          <input
            v-model="form.claim_date"
            type="date"
            :max="selectedHoliday?.expired_at || undefined"
            class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            required
          />
          <span v-if="selectedHoliday?.expired_at" class="mt-1 block text-xs text-amber-600 dark:text-amber-400">
            Wajib digunakan paling lambat {{ formatDate(selectedHoliday.expired_at) }} (hangus mulai hari berikutnya).
          </span>
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
                <div class="flex flex-col items-start gap-1">
                  <UBadge
                    :color="statusColor(item.status)"
                    variant="subtle"
                    :label="item.status === 'pending' && item.pending_with ? `Menunggu ${item.pending_with}` : statusLabel(item.status)"
                  />
                  <div v-if="item.status === 'rejected'" class="text-xs text-rose-600 dark:text-rose-400 font-medium space-y-0.5">
                    <p v-if="item.rejected_by_name">Ditolak oleh: <span class="font-semibold">{{ item.rejected_by_name }}</span></p>
                    <p v-if="item.reject_reason" class="italic">Alasan: {{ item.reject_reason }}</p>
                  </div>
                  <div v-else-if="item.status === 'pending' && item.pending_with" class="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    Menunggu persetujuan: {{ item.pending_with }}
                  </div>
                </div>
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

    <UCard v-if="data.expired_holidays?.length" title="PH Kedaluwarsa / Hangus">
      <p class="mb-3 text-xs text-muted">
        Daftar hak Public Holiday yang telah melewati tanggal kedaluwarsa dan tidak digunakan sehingga hangus otomatis.
      </p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">Public Holiday</th>
              <th class="p-3">Tanggal Libur</th>
              <th class="p-3">Berlaku Sampai</th>
              <th class="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="holiday in data.expired_holidays"
              :key="holiday.id"
              class="border-t border-default"
            >
              <td class="p-3 font-medium text-highlighted">{{ holiday.name }}</td>
              <td class="p-3">{{ formatDate(holiday.holiday_date) }}</td>
              <td class="p-3">{{ formatDate(holiday.expired_at) }}</td>
              <td class="p-3">
                <div class="flex flex-col items-start gap-1">
                  <UBadge color="error" variant="subtle" label="Kedaluwarsa / Hangus" />
                  <span class="text-xs text-muted">
                    Tidak digunakan hingga {{ formatDate(holiday.expired_at) }}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </section>
</template>
