<script setup>
import { onMounted, reactive, ref } from 'vue'
import {
  createHrPerformanceReview,
  getHrPerformancePeriods,
  getHrPerformanceReviews,
  getHrTalentOptions,
  updateHrPerformanceReviewStatus,
} from '../services/hrService'
import { apiError } from '../utils/formatters'

const options = ref({ employees: [], reviewers: [] })
const periods = ref([])
const records = ref([])
const message = ref('')
const errorMessage = ref('')
const form = reactive({ performance_period_id: '', employee_nik: '', reviewer_id: '' })

async function load() {
  options.value = (await getHrTalentOptions()).data
  periods.value = (await getHrPerformancePeriods()).data
  records.value = (await getHrPerformanceReviews()).data
}
async function generate() {
  try {
    message.value = (
      await createHrPerformanceReview({ ...form, reviewer_id: form.reviewer_id || null })
    ).data.message
    Object.assign(form, { employee_nik: '', reviewer_id: '' })
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  }
}
async function decide(item, status) {
  try {
    message.value = (await updateHrPerformanceReviewStatus(item.id, { status })).data.message
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
      <h2 class="text-2xl font-semibold text-highlighted">Performance Review</h2>
      <p class="mt-1 text-sm text-muted">
        Generate review karyawan dari KPI aktif dan pantau proses penilaian.
      </p>
    </div>
    <AlertToastBridge :message="message" :error="errorMessage" />
    <UCard title="Generate Review"
      ><form class="grid gap-4 md:grid-cols-3" @submit.prevent="generate">
        <select
          v-model="form.performance_period_id"
          required
          class="rounded-lg border border-default bg-default p-2.5"
        >
          <option value="">Pilih periode aktif</option>
          <option
            v-for="item in periods.filter((row) => row.status === 'active')"
            :key="item.id"
            :value="item.id"
          >
            {{ item.nama_periode }}
          </option>
        </select>
        <select
          v-model="form.employee_nik"
          required
          class="rounded-lg border border-default bg-default p-2.5"
        >
          <option value="">Pilih karyawan</option>
          <option v-for="item in options.employees" :key="item.nik" :value="item.nik">
            {{ item.nama_karyawan }} - {{ item.jabatan }}
          </option>
        </select>
        <select
          v-model="form.reviewer_id"
          class="rounded-lg border border-default bg-default p-2.5"
        >
          <option value="">Reviewer otomatis dari atasan</option>
          <option v-for="item in options.reviewers" :key="item.id" :value="item.id">
            {{ item.name }} - {{ item.username }}
          </option>
        </select>
        <UButton type="submit" label="Generate Review" /></form
    ></UCard>
    <UCard title="Daftar Review"
      ><div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-muted">
              <th class="p-3">Karyawan</th>
              <th class="p-3">Periode</th>
              <th class="p-3">Reviewer</th>
              <th class="p-3">Skor</th>
              <th class="p-3">Status</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in records" :key="item.id" class="border-t border-default">
              <td class="p-3">
                {{ item.employee?.nama_karyawan }}<br /><span class="text-xs text-muted">{{
                  item.jabatan_snapshot
                }}</span>
              </td>
              <td class="p-3">{{ item.period?.nama_periode }}</td>
              <td class="p-3">{{ item.reviewer?.name || 'Belum ditentukan' }}</td>
              <td class="p-3">{{ item.total_score }}</td>
              <td class="p-3">{{ item.status }}</td>
              <td class="space-x-2 p-3">
                <template v-if="item.status === 'submitted'"
                  ><UButton size="xs" label="Setujui" @click="decide(item, 'approved')" /><UButton
                    size="xs"
                    label="Tolak"
                    color="error"
                    variant="soft"
                    @click="decide(item, 'rejected')"
                /></template>
              </td>
            </tr>
          </tbody>
        </table></div
    ></UCard>
  </section>
</template>
