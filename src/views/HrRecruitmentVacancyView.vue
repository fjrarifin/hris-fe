<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { getHrVacancies, createHrVacancy, updateHrVacancy, deleteHrVacancy } from '../services/hrService'
import { apiError } from '../utils/formatters'

const records = ref([])
const search = ref('')
const message = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

const form = reactive({
  title: '',
  department: '',
  description: '',
  status: 'draft',
})

const editDialog = ref({
  open: false,
  id: null,
  title: '',
  department: '',
  description: '',
  status: 'draft',
})

const formControlClass =
  'w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

const filteredRecords = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return records.value
    .filter((record) => {
      return (
        record.title.toLowerCase().includes(keyword) ||
        (record.department || '').toLowerCase().includes(keyword) ||
        (record.description || '').toLowerCase().includes(keyword)
      )
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
})

async function load() {
  try {
    const response = await getHrVacancies()
    records.value = response.data
  } catch (error) {
    errorMessage.value = apiError(error)
  }
}

function resetForm() {
  Object.assign(form, {
    title: '',
    department: '',
    description: '',
    status: 'draft',
  })
}

async function save() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const response = await createHrVacancy(form)
    message.value = response.data.message || 'Lowongan berhasil dibuat.'
    resetForm()
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    isSubmitting.value = false
  }
}

function openEdit(record) {
  Object.assign(editDialog.value, {
    open: true,
    id: record.id,
    title: record.title,
    department: record.department || '',
    description: record.description || '',
    status: record.status,
  })
}

function closeEdit() {
  editDialog.value.open = false
}

async function updateVacancy() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const response = await updateHrVacancy(editDialog.value.id, {
      title: editDialog.value.title,
      department: editDialog.value.department,
      description: editDialog.value.description,
      status: editDialog.value.status,
    })
    message.value = response.data.message || 'Lowongan berhasil diperbarui.'
    closeEdit()
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    isSubmitting.value = false
  }
}

async function deleteVacancy(record) {
  if (!confirm(`Apakah Anda yakin ingin menghapus lowongan "${record.title}"?`)) return
  message.value = ''
  errorMessage.value = ''

  try {
    const response = await deleteHrVacancy(record.id)
    message.value = response.data.message || 'Lowongan berhasil dihapus.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'open':
      return 'success'
    case 'closed':
      return 'danger'
    default:
      return 'neutral'
  }
}

onMounted(load)
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Manajemen Lowongan Kerja</h2>
      <p class="mt-1 text-sm text-muted">Buat dan kelola informasi lowongan pekerjaan internal.</p>
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Form Tambah Lowongan -->
      <div class="lg:col-span-1">
        <UCard title="Tambah Lowongan Baru">
          <form class="space-y-4" @submit.prevent="save">
            <div>
              <label class="mb-1 block text-sm font-medium text-muted">Nama Lowongan / Posisi</label>
              <input
                v-model="form.title"
                required
                placeholder="Contoh: Senior Laravel Developer"
                :class="formControlClass"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-muted">Departemen</label>
              <input
                v-model="form.department"
                placeholder="Contoh: IT / Engineering"
                :class="formControlClass"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-muted">Status</label>
              <select v-model="form.status" :class="formControlClass">
                <option value="draft">Draft</option>
                <option value="open">Open (Aktif)</option>
                <option value="closed">Closed (Ditutup)</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-muted">Deskripsi Lowongan</label>
              <textarea
                v-model="form.description"
                rows="4"
                placeholder="Tuliskan detail pekerjaan, kualifikasi, dll."
                :class="formControlClass"
              ></textarea>
            </div>
            <div>
              <UButton type="submit" label="Buat Lowongan" :loading="isSubmitting" class="w-full justify-center" />
            </div>
          </form>
        </UCard>
      </div>

      <!-- Daftar Lowongan -->
      <div class="lg:col-span-2">
        <UCard>
          <template #header>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 class="font-semibold text-highlighted">Daftar Lowongan</h3>
                <p class="mt-1 text-sm text-muted">Daftar seluruh lowongan pekerjaan yang terdaftar di sistem.</p>
              </div>
              <input
                v-model="search"
                type="search"
                placeholder="Cari lowongan atau departemen..."
                class="w-full rounded-lg border border-default bg-default p-2.5 text-sm sm:max-w-sm"
              />
            </div>
          </template>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-muted border-b border-default">
                  <th class="p-3">Posisi / Lowongan</th>
                  <th class="p-3">Departemen</th>
                  <th class="p-3">Status</th>
                  <th class="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in filteredRecords" :key="record.id" class="border-t border-default hover:bg-muted/10 transition">
                  <td class="p-3">
                    <p class="font-semibold text-highlighted">{{ record.title }}</p>
                    <p class="mt-0.5 text-xs text-muted max-w-xs truncate">{{ record.description || 'Tidak ada deskripsi' }}</p>
                  </td>
                  <td class="p-3 text-highlighted">{{ record.department || '-' }}</td>
                  <td class="p-3">
                    <UBadge :color="getStatusColor(record.status)" variant="soft">
                      {{ record.status.toUpperCase() }}
                    </UBadge>
                  </td>
                  <td class="p-3 text-right space-x-2">
                    <UButton
                      size="xs"
                      label="Edit"
                      variant="soft"
                      icon="i-lucide-pencil"
                      @click="openEdit(record)"
                    />
                    <UButton
                      size="xs"
                      label="Hapus"
                      color="danger"
                      variant="soft"
                      icon="i-lucide-trash-2"
                      @click="deleteVacancy(record)"
                    />
                  </td>
                </tr>
                <tr v-if="!filteredRecords.length">
                  <td colspan="4" class="p-6 text-center text-muted">Tidak ada lowongan ditemukan.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Edit Vacancy Dialog -->
    <div
      v-if="editDialog.open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Edit lowongan"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60"
        aria-label="Tutup edit lowongan"
        @click="closeEdit"
      ></button>
      <UCard class="relative max-h-[88vh] w-full max-w-lg overflow-hidden">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-highlighted">Edit Lowongan Kerja</p>
              <p class="mt-1 text-xs text-muted">Perbarui informasi posisi lowongan kerja.</p>
            </div>
            <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-x" @click="closeEdit" />
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="updateVacancy">
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Nama Lowongan / Posisi</label>
            <input
              v-model="editDialog.title"
              required
              :class="formControlClass"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Departemen</label>
            <input
              v-model="editDialog.department"
              :class="formControlClass"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Status</label>
            <select v-model="editDialog.status" :class="formControlClass">
              <option value="draft">Draft</option>
              <option value="open">Open (Aktif)</option>
              <option value="closed">Closed (Ditutup)</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Deskripsi Lowongan</label>
            <textarea
              v-model="editDialog.description"
              rows="4"
              :class="formControlClass"
            ></textarea>
          </div>
          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton type="button" label="Batal" color="neutral" variant="ghost" @click="closeEdit" />
            <UButton type="submit" label="Simpan Perubahan" :loading="isSubmitting" />
          </div>
        </form>
      </UCard>
    </div>
  </section>
</template>
