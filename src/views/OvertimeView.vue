<script setup>
import { onMounted, reactive, ref } from 'vue'
import { createOvertime, deleteOvertime, getOvertime } from '../services/staffService'
import { askConfirmation } from '../utils/confirmDialog'
import { apiError, formatDate, statusColor, statusLabel } from '../utils/formatters'

const data = ref({ subordinates: [], requests: [] })
const form = reactive({ employee_niks: [], date: '', start_time: '', end_time: '', reason: '' })
const loading = ref(true)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')

async function load() {
  loading.value = true
  try {
    data.value = (await getOvertime()).data
  } catch (error) {
    errorMessage.value = apiError(error, 'Data lembur tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function submit() {
  saving.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    message.value = (await createOvertime(form)).data.message
    form.employee_niks = []
    form.date = ''
    form.start_time = ''
    form.end_time = ''
    form.reason = ''
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
      message: 'Batalkan pengajuan lembur ini?',
      confirmLabel: 'Batalkan',
      color: 'error',
    }))
  )
    return
  try {
    message.value = (await deleteOvertime(id)).data.message
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
      <h2 class="text-2xl font-semibold text-highlighted">Pengajuan Lembur</h2>
      <p class="mt-1 text-sm text-muted">
        Ajukan lembur untuk bawahan langsung dengan durasi 1 sampai 4 jam.
      </p>
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <UCard title="Pengajuan Baru">
      <UAlert
        v-if="!data.subordinates.length && !loading"
        color="info"
        variant="subtle"
        description="Anda belum memiliki bawahan langsung."
        class="mb-5"
      />
      <form class="grid gap-4 lg:grid-cols-2" @submit.prevent="submit">
        <fieldset class="rounded-xl border border-default p-4 lg:col-span-2">
          <legend class="px-2 text-sm text-muted">Pilih Karyawan</legend>
          <div class="grid gap-3 sm:grid-cols-2">
            <label
              v-for="employee in data.subordinates"
              :key="employee.nik"
              class="flex items-center gap-3 text-sm text-highlighted"
            >
              <input v-model="form.employee_niks" type="checkbox" :value="employee.nik" />
              {{ employee.nama_karyawan }} ({{ employee.nik }})
            </label>
          </div>
        </fieldset>
        <label class="text-sm text-muted"
          >Tanggal<input
            v-model="form.date"
            type="date"
            class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            required
        /></label>
        <label class="text-sm text-muted"
          >Alasan<input
            v-model="form.reason"
            class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            required
        /></label>
        <label class="text-sm text-muted"
          >Jam Mulai<input
            v-model="form.start_time"
            type="time"
            class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            required
        /></label>
        <label class="text-sm text-muted"
          >Jam Selesai<input
            v-model="form.end_time"
            type="time"
            class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            required
        /></label>
        <UButton
          type="submit"
          label="Kirim ke HR"
          :loading="saving"
          :disabled="!data.subordinates.length"
          class="lg:col-span-2 lg:w-fit"
        />
      </form>
    </UCard>

    <UCard title="Riwayat Pengajuan Lembur">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">Karyawan</th>
              <th class="p-3">Tanggal</th>
              <th class="p-3">Jam</th>
              <th class="p-3">Status</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in data.requests" :key="item.id" class="border-t border-default">
              <td class="p-3">{{ item.user?.karyawan?.nama_karyawan || item.user?.name }}</td>
              <td class="p-3">{{ formatDate(item.date) }}</td>
              <td class="p-3">{{ item.start_time }} - {{ item.end_time }}</td>
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
                    Mandek di: {{ item.pending_with }}
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
              <td colspan="5" class="p-6 text-center text-muted">Belum ada pengajuan lembur.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </section>
</template>
