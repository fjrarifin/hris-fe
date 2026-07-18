<script setup>
import { onMounted, ref } from 'vue'
import {
  getStaffPerformanceReview,
  getStaffPerformanceReviews,
  saveStaffPerformanceReview,
  submitStaffPerformanceReview,
} from '../services/staffService'
import { askConfirmation } from '../utils/confirmDialog'
import { apiError } from '../utils/formatters'

const records = ref([])
const selected = ref(null)
const message = ref('')
const errorMessage = ref('')

async function load() {
  records.value = (await getStaffPerformanceReviews()).data
}
async function select(item) {
  try {
    selected.value = (await getStaffPerformanceReview(item.id)).data
  } catch (error) {
    errorMessage.value = apiError(error)
  }
}
async function save() {
  try {
    const response = await saveStaffPerformanceReview(selected.value.id, {
      notes: selected.value.notes,
      items: selected.value.items.map((item) => ({
        id: item.id,
        realisasi: item.realisasi,
        score: item.score,
        notes: item.notes,
      })),
    })
    message.value = response.data.message
    selected.value = response.data.data
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  }
}
async function submit() {
  if (
    !(await askConfirmation({
      title: 'Kirim Review',
      message: 'Kirim review ini ke HRD?',
      confirmLabel: 'Kirim',
      color: 'primary',
    }))
  )
    return
  try {
    message.value = (await submitStaffPerformanceReview(selected.value.id)).data.message
    selected.value = null
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
      <h2 class="text-2xl font-semibold text-highlighted">Performance Review Tim</h2>
      <p class="mt-1 text-sm text-muted">
        Isi realisasi dan skor KPI untuk anggota tim yang ditugaskan kepada Anda.
      </p>
    </div>
    <AlertToastBridge :message="message" :error="errorMessage" />
    <UCard title="Daftar Review"
      ><div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-muted">
              <th class="p-3">Karyawan</th>
              <th class="p-3">Periode</th>
              <th class="p-3">Skor</th>
              <th class="p-3">Status</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in records" :key="item.id" class="border-t border-default">
              <td class="p-3">{{ item.employee?.nama_karyawan }}</td>
              <td class="p-3">{{ item.period?.nama_periode }}</td>
              <td class="p-3">{{ item.total_score }}</td>
              <td class="p-3">{{ item.status }}</td>
              <td class="p-3">
                <UButton size="xs" label="Buka" variant="soft" @click="select(item)" />
              </td>
            </tr>
          </tbody>
        </table></div
    ></UCard>
    <UCard v-if="selected" :title="`Input Nilai - ${selected.employee?.nama_karyawan}`">
      <div class="space-y-4">
        <div
          v-for="item in selected.items"
          :key="item.id"
          class="grid gap-3 rounded-lg border border-default p-4 md:grid-cols-4"
        >
          <div>
            <p class="font-medium">{{ item.nama_kpi_snapshot }}</p>
            <p class="text-xs text-muted">
              Target: {{ item.target_snapshot }} {{ item.satuan_snapshot }} | Bobot:
              {{ item.bobot_snapshot }}%
            </p>
          </div>
          <input
            v-model="item.realisasi"
            type="number"
            step="0.01"
            placeholder="Realisasi"
            class="rounded-lg border border-default bg-default p-2.5"
          /><input
            v-model="item.score"
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="Skor 0-100"
            class="rounded-lg border border-default bg-default p-2.5"
          /><input
            v-model="item.notes"
            placeholder="Catatan KPI"
            class="rounded-lg border border-default bg-default p-2.5"
          />
        </div>
        <textarea
          v-model="selected.notes"
          placeholder="Catatan review"
          class="w-full rounded-lg border border-default bg-default p-2.5"
        ></textarea>
        <div class="flex gap-2">
          <UButton
            label="Simpan Draft"
            :disabled="!['draft', 'rejected'].includes(selected.status)"
            @click="save"
          /><UButton
            label="Kirim ke HRD"
            color="success"
            :disabled="!['draft', 'rejected'].includes(selected.status)"
            @click="submit"
          />
        </div>
      </div>
    </UCard>
  </section>
</template>
