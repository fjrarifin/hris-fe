<script setup>
import { onMounted, reactive, ref } from 'vue'
import { createPermission, deletePermission, getPermissions } from '../services/staffService'
import { apiError, formatDate, statusColor, statusLabel } from '../utils/formatters'

const requests = ref([])
const form = reactive({ type: 'izin', date: '', reason: '', document: null })
const loading = ref(true)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')

async function load() {
  loading.value = true
  try {
    requests.value = (await getPermissions()).data.requests
  } catch (error) {
    errorMessage.value = apiError(error, 'Data izin tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

function selectDocument(event) {
  form.document = event.target.files[0] || null
}

async function submit() {
  const payload = new FormData()
  payload.append('type', form.type)
  payload.append('date', form.date)
  payload.append('reason', form.reason)
  if (form.document) payload.append('document', form.document)

  saving.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    message.value = (await createPermission(payload)).data.message
    form.date = ''
    form.reason = ''
    form.document = null
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    saving.value = false
  }
}

async function remove(id) {
  if (!window.confirm('Batalkan pengajuan izin/sakit ini?')) return
  try {
    message.value = (await deletePermission(id)).data.message
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
      <h2 class="text-2xl font-semibold text-highlighted">Izin / Sakit</h2>
      <p class="mt-1 text-sm text-muted">Ajukan izin atau sakit kepada atasan langsung Anda.</p>
    </div>

    <UAlert v-if="message" color="success" variant="subtle" :description="message" />
    <UAlert v-if="errorMessage" color="error" variant="subtle" :description="errorMessage" />

    <UCard title="Pengajuan Baru">
      <form class="grid gap-4 lg:grid-cols-2" @submit.prevent="submit">
        <label class="text-sm text-muted">
          Jenis
          <select
            v-model="form.type"
            class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
          >
            <option value="izin">Izin</option>
            <option value="sakit">Sakit</option>
          </select>
        </label>
        <label class="text-sm text-muted">
          Tanggal
          <input
            v-model="form.date"
            type="date"
            class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            required
          />
        </label>
        <label v-if="form.type === 'izin'" class="text-sm text-muted lg:col-span-2">
          Alasan
          <textarea
            v-model="form.reason"
            class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            rows="3"
            required
          ></textarea>
        </label>
        <label v-else class="text-sm text-muted lg:col-span-2">
          Surat Sakit
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            required
            @change="selectDocument"
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

    <UCard title="Riwayat Izin / Sakit">
      <div v-if="loading" class="py-8 text-center text-sm text-muted">Memuat riwayat...</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">Tanggal</th>
              <th class="p-3">Jenis</th>
              <th class="p-3">Alasan / Dokumen</th>
              <th class="p-3">Status</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in requests" :key="item.id" class="border-t border-default">
              <td class="p-3">{{ formatDate(item.date) }}</td>
              <td class="p-3">{{ item.type === 'sakit' ? 'Sakit' : 'Izin' }}</td>
              <td class="p-3">
                <a
                  v-if="item.document_url"
                  :href="item.document_url"
                  target="_blank"
                  rel="noopener"
                  class="text-primary"
                  >Lihat dokumen</a
                >
                <span v-else>{{ item.reason || '-' }}</span>
              </td>
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
            <tr v-if="!requests.length">
              <td colspan="5" class="p-6 text-center text-muted">Belum ada pengajuan izin.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </section>
</template>
