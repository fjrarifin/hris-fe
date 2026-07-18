<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  getHrMasterOrgs,
  createHrMasterOrg,
  updateHrMasterOrg,
  deleteHrMasterOrg,
} from '../services/hrService'
import { apiError } from '../utils/formatters'

const route = useRoute()
const records = ref([])
const search = ref('')
const message = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

const form = reactive({
  name: '',
  is_active: true,
})

const editDialog = ref({
  open: false,
  id: null,
  name: '',
  is_active: true,
})

const type = computed(() => route.meta.type || 'positions')

const typeLabels = {
  positions: {
    title: 'Master Posisi (Titel)',
    singular: 'Posisi',
    placeholder: 'Contoh: Supervisor, Manager',
  },
  divisions: {
    title: 'Master Divisi',
    singular: 'Divisi',
    placeholder: 'Contoh: Commercial Business',
  },
  departments: {
    title: 'Master Departemen',
    singular: 'Departemen',
    placeholder: 'Contoh: Marketing, Finance',
  },
  units: { title: 'Master Unit', singular: 'Unit', placeholder: 'Contoh: Zona 1, HSSE' },
}

const labels = computed(() => typeLabels[type.value] || typeLabels.positions)

const formControlClass =
  'w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

const filteredRecords = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return records.value.filter((record) => record.name.toLowerCase().includes(keyword))
})

async function load() {
  message.value = ''
  errorMessage.value = ''
  try {
    const response = await getHrMasterOrgs(type.value)
    records.value = response.data
  } catch (error) {
    errorMessage.value = apiError(error)
  }
}

function resetForm() {
  form.name = ''
  form.is_active = true
}

async function save() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const response = await createHrMasterOrg(type.value, form)
    message.value = response.data.message || 'Data berhasil disimpan.'
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
    name: record.name,
    is_active: record.is_active,
  })
}

function closeEdit() {
  editDialog.value.open = false
}

async function updateRecord() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const response = await updateHrMasterOrg(type.value, editDialog.value.id, {
      name: editDialog.value.name,
      is_active: editDialog.value.is_active,
    })
    message.value = response.data.message || 'Data berhasil diperbarui.'
    closeEdit()
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    isSubmitting.value = false
  }
}

async function deleteRecord(record) {
  if (!confirm(`Apakah Anda yakin ingin menghapus data ini?`)) return
  message.value = ''
  errorMessage.value = ''

  try {
    const response = await deleteHrMasterOrg(type.value, record.id)
    message.value = response.data.message || 'Data berhasil dihapus.'
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  }
}

watch(type, () => {
  resetForm()
  load()
})

onMounted(load)
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">{{ labels.title }}</h2>
      <p class="mt-1 text-sm text-muted">
        Kelola data master {{ labels.singular.toLowerCase() }} untuk struktur organisasi.
      </p>
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Form Tambah -->
      <div class="lg:col-span-1">
        <UCard :title="`Tambah ${labels.singular}`">
          <form class="space-y-4" @submit.prevent="save">
            <div>
              <label class="mb-1 block text-sm font-medium text-muted"
                >Nama {{ labels.singular }}</label
              >
              <input
                v-model="form.name"
                required
                :placeholder="labels.placeholder"
                :class="formControlClass"
              />
            </div>
            <div class="flex items-center gap-2">
              <input v-model="form.is_active" type="checkbox" id="is_active_check" class="size-4" />
              <label for="is_active_check" class="text-sm font-medium text-highlighted"
                >Status Aktif</label
              >
            </div>
            <div>
              <UButton
                type="submit"
                :label="`Buat ${labels.singular}`"
                :loading="isSubmitting"
                class="w-full justify-center"
              />
            </div>
          </form>
        </UCard>
      </div>

      <!-- Tabel List -->
      <div class="lg:col-span-2">
        <UCard>
          <template #header>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 class="font-semibold text-highlighted">Daftar {{ labels.singular }}</h3>
                <p class="mt-1 text-sm text-muted">
                  Seluruh data master {{ labels.singular.toLowerCase() }} aktif & tidak aktif.
                </p>
              </div>
              <input
                v-model="search"
                type="search"
                placeholder="Cari..."
                class="w-full rounded-lg border border-default bg-default p-2.5 text-sm sm:max-w-sm"
              />
            </div>
          </template>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-muted border-b border-default">
                  <th class="p-3">Nama {{ labels.singular }}</th>
                  <th class="p-3">Status</th>
                  <th class="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="record in filteredRecords"
                  :key="record.id"
                  class="border-t border-default hover:bg-muted/10 transition"
                >
                  <td class="p-3 font-medium text-highlighted">{{ record.name }}</td>
                  <td class="p-3">
                    <UBadge :color="record.is_active ? 'success' : 'neutral'" variant="soft">
                      {{ record.is_active ? 'AKTIF' : 'NONAKTIF' }}
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
                      @click="deleteRecord(record)"
                    />
                  </td>
                </tr>
                <tr v-if="!filteredRecords.length">
                  <td colspan="3" class="p-6 text-center text-muted">Data kosong.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Edit Dialog -->
    <div
      v-if="editDialog.open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      :aria-label="`Edit ${labels.singular}`"
    >
      <button type="button" class="absolute inset-0 bg-slate-950/60" @click="closeEdit"></button>
      <UCard class="relative max-h-[88vh] w-full max-w-md overflow-hidden">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-highlighted">Edit {{ labels.singular }}</p>
              <p class="mt-1 text-xs text-muted">Ubah informasi master data.</p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              @click="closeEdit"
            />
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="updateRecord">
          <div>
            <label class="mb-1 block text-sm font-medium text-muted"
              >Nama {{ labels.singular }}</label
            >
            <input v-model="editDialog.name" required :class="formControlClass" />
          </div>
          <div class="flex items-center gap-2">
            <input
              v-model="editDialog.is_active"
              type="checkbox"
              id="edit_is_active_check"
              class="size-4"
            />
            <label for="edit_is_active_check" class="text-sm font-medium text-highlighted"
              >Status Aktif</label
            >
          </div>
          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton
              type="button"
              label="Batal"
              color="neutral"
              variant="ghost"
              @click="closeEdit"
            />
            <UButton type="submit" label="Simpan Perubahan" :loading="isSubmitting" />
          </div>
        </form>
      </UCard>
    </div>
  </section>
</template>
