<script setup>
import { onMounted, ref } from 'vue'
import { apiError } from '../utils/formatters'
import { getItServiceToggles, updateItServiceToggle } from '../services/navigationService'

const loading = ref(false)
const savingId = ref(null)
const records = ref([])
const errorMessage = ref('')
const successMessage = ref('')

function clearMessages() {
  errorMessage.value = ''
  successMessage.value = ''
}

async function loadServiceToggles() {
  loading.value = true
  clearMessages()

  try {
    const { data } = await getItServiceToggles()
    records.value = data.data || []
  } catch (error) {
    errorMessage.value = apiError(error, 'Daftar layanan tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function toggleService(toggle, value) {
  clearMessages()
  savingId.value = toggle.id

  try {
    const { data } = await updateItServiceToggle(toggle.id, {
      is_enabled: value,
    })
    toggle.is_enabled = data.data.is_enabled
    successMessage.value = data.message || 'Perubahan status layanan tersimpan.'
  } catch (error) {
    errorMessage.value = apiError(error, 'Perubahan status layanan gagal disimpan.')
  } finally {
    savingId.value = null
  }
}

onMounted(loadServiceToggles)
</script>

<template>
  <section class="space-y-6">
    <div>
      <p class="text-sm font-medium text-primary">IT Tools</p>
      <h1 class="text-2xl font-semibold text-highlighted">Layanan Terjadwal</h1>
      <p class="mt-1 text-sm text-muted">
        Matikan atau hidupkan layanan scheduler yang menjalankan pengiriman notifikasi absensi
        terjadwal.
      </p>
    </div>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Terjadi Kesalahan"
      :description="errorMessage"
    />
    <UAlert
      v-if="successMessage"
      color="success"
      variant="soft"
      title="Berhasil"
      :description="successMessage"
    />

    <UCard>
      <template #header>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="font-semibold text-highlighted">Daftar Layanan Scheduler</h3>
            <p class="text-sm text-muted">
              Kelola toggle untuk perintah yang berjalan secara otomatis.
            </p>
          </div>
        </div>
      </template>

      <div v-if="loading" class="py-10 text-center text-sm text-muted">Memuat layanan...</div>

      <div v-else>
        <div v-if="!records.length" class="py-10 text-center text-sm text-muted">
          Tidak ada layanan terjadwal yang tersedia.
        </div>

        <div v-else class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table class="w-full text-left text-sm">
            <thead
              class="border-b border-gray-200 bg-gray-50 text-muted dark:border-gray-800 dark:bg-gray-900/60"
            >
              <tr>
                <th class="p-3 font-medium">Layanan</th>
                <th class="p-3 font-medium">Deskripsi</th>
                <th class="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="toggle in records"
                :key="toggle.id"
                class="border-b border-gray-100 last:border-0 dark:border-gray-800"
              >
                <td class="p-3">
                  <p class="font-medium text-highlighted">{{ toggle.label }}</p>
                  <p class="text-xs text-muted">{{ toggle.key }}</p>
                </td>
                <td class="p-3 text-sm text-muted">{{ toggle.description || '-' }}</td>
                <td class="p-3">
                  <label class="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      :checked="toggle.is_enabled"
                      :disabled="savingId === toggle.id"
                      @change="toggleService(toggle, $event.target.checked)"
                      class="size-4 rounded border-default text-primary"
                    />
                    <span class="text-sm text-muted">
                      {{ toggle.is_enabled ? 'Aktif' : 'Nonaktif' }}
                    </span>
                  </label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </UCard>
  </section>
</template>
