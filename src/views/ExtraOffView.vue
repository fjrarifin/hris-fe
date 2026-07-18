<script setup>
import { onMounted, reactive, ref } from 'vue'
import { createExtraOff, deleteExtraOff, getExtraOffs } from '../services/staffService'
import { askConfirmation } from '../utils/confirmDialog'
import { apiError, formatDate, statusColor, statusLabel } from '../utils/formatters'

const data = ref({ balance: 0, sources: [], requests: [] })
const form = reactive({ source_period_start: '', source_period_end: '', claim_date: '' })
const loading = ref(true)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')

async function load() {
  loading.value = true
  try {
    data.value = (await getExtraOffs()).data
  } catch (error) {
    errorMessage.value = apiError(error, 'Data Extra Off tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

function chooseSource(value) {
  const [start, end] = value.split('|')
  form.source_period_start = start || ''
  form.source_period_end = end || ''
}

async function submit() {
  saving.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    message.value = (await createExtraOff(form)).data.message
    form.source_period_start = ''
    form.source_period_end = ''
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
      message: 'Batalkan pengajuan Extra Off ini?',
      confirmLabel: 'Batalkan',
      color: 'error',
    }))
  )
    return
  try {
    message.value = (await deleteExtraOff(id)).data.message
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
      <h2 class="text-2xl font-semibold text-highlighted">Extra Off</h2>
      <p class="mt-1 text-sm text-muted">
        Ajukan Extra Off dari kelebihan hari masuk periode payroll. Saldo EO tidak memiliki masa
        expired dan dapat digunakan selama karyawan masih aktif.
      </p>
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <UCard>
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-sm text-muted">Saldo EO Tersedia</p>
          <p class="mt-2 text-3xl font-semibold text-highlighted">{{ data.balance }}</p>
        </div>
        <UBadge color="success" variant="subtle" label="Hari" />
      </div>
    </UCard>

    <UCard title="Ajukan Extra Off">
      <form class="grid gap-4 lg:grid-cols-2" @submit.prevent="submit">
        <label class="text-sm text-muted">
          Sumber Saldo EO
          <select
            class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            required
            :value="
              form.source_period_start && form.source_period_end
                ? `${form.source_period_start}|${form.source_period_end}`
                : ''
            "
            @change="chooseSource($event.target.value)"
          >
            <option disabled value="">Pilih Periode Payroll</option>
            <option
              v-for="source in data.sources"
              :key="`${source.source_period_start}|${source.source_period_end}`"
              :value="`${source.source_period_start}|${source.source_period_end}`"
            >
              {{ source.label }} - sisa {{ source.remaining_days }} hari
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
          label="Kirim Pengajuan EO"
          :loading="saving"
          class="lg:col-span-2 lg:w-fit"
        />
      </form>
    </UCard>

    <UCard title="Riwayat Extra Off">
      <div v-if="loading" class="py-8 text-center text-sm text-muted">Memuat riwayat...</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">Sumber Periode</th>
              <th class="p-3">Tanggal Claim</th>
              <th class="p-3">Status</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in data.requests" :key="item.id" class="border-t border-default">
              <td class="p-3">
                {{ formatDate(item.source_period_start) }} -
                {{ formatDate(item.source_period_end) }}
              </td>
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
              <td colspan="4" class="p-6 text-center text-muted">Belum ada pengajuan EO.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </section>
</template>
