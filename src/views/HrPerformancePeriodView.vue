<script setup>
import { onMounted, reactive, ref } from 'vue'
import {
  createHrPerformancePeriod,
  getHrPerformancePeriods,
  updateHrPerformancePeriod,
} from '../services/hrService'
import { apiError, formatDate } from '../utils/formatters'

const records = ref([])
const editingId = ref(null)
const message = ref('')
const errorMessage = ref('')
const form = reactive({ nama_periode: '', start_date: '', end_date: '', status: 'draft' })

async function load() {
  records.value = (await getHrPerformancePeriods()).data
}
function reset() {
  editingId.value = null
  Object.assign(form, { nama_periode: '', start_date: '', end_date: '', status: 'draft' })
}
function edit(item) {
  editingId.value = item.id
  Object.assign(form, {
    nama_periode: item.nama_periode,
    start_date: item.start_date.slice(0, 10),
    end_date: item.end_date.slice(0, 10),
    status: item.status,
  })
}
async function save() {
  try {
    const response = editingId.value
      ? await updateHrPerformancePeriod(editingId.value, form)
      : await createHrPerformancePeriod(form)
    message.value = response.data.message
    reset()
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
      <h2 class="text-2xl font-semibold text-highlighted">Periode Performance Review</h2>
      <p class="mt-1 text-sm text-muted">Buat periode lalu aktifkan sebelum generate review.</p>
    </div>
    <AlertToastBridge :message="message" :error="errorMessage" />
    <UCard :title="editingId ? 'Ubah Periode' : 'Tambah Periode'"
      ><form class="grid gap-4 md:grid-cols-2" @submit.prevent="save">
        <input
          v-model="form.nama_periode"
          required
          placeholder="Nama periode"
          class="rounded-lg border border-default bg-default p-2.5"
        /><select v-model="form.status" class="rounded-lg border border-default bg-default p-2.5">
          <option v-for="status in ['draft', 'active', 'closed']" :key="status">
            {{ status }}
          </option>
        </select>
        <input
          v-model="form.start_date"
          required
          type="date"
          class="rounded-lg border border-default bg-default p-2.5"
        /><input
          v-model="form.end_date"
          required
          type="date"
          class="rounded-lg border border-default bg-default p-2.5"
        />
        <div class="flex gap-2">
          <UButton type="submit" label="Simpan Periode" /><UButton
            v-if="editingId"
            label="Batal"
            color="neutral"
            variant="soft"
            @click="reset"
          />
        </div></form
    ></UCard>
    <UCard title="Daftar Periode"
      ><table class="w-full text-sm">
        <thead>
          <tr class="text-left text-muted">
            <th class="p-3">Periode</th>
            <th class="p-3">Tanggal</th>
            <th class="p-3">Status</th>
            <th class="p-3">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in records" :key="item.id" class="border-t border-default">
            <td class="p-3">{{ item.nama_periode }}</td>
            <td class="p-3">{{ formatDate(item.start_date) }} - {{ formatDate(item.end_date) }}</td>
            <td class="p-3">{{ item.status }}</td>
            <td class="p-3">
              <UButton size="xs" label="Ubah" variant="soft" @click="edit(item)" />
            </td>
          </tr>
        </tbody></table
    ></UCard>
  </section>
</template>
