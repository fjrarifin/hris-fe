<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { createHrJobdesk, getHrJobdesks, getHrTalentOptions } from '../services/hrService'
import { apiError } from '../utils/formatters'

const options = ref({ jabatans: [] })
const records = ref([])
const search = ref('')
const message = ref('')
const errorMessage = ref('')
const form = reactive({
  master_jabatan_id: '',
  kategori: '',
  deskripsi: '',
  tipe_tugas: 'harian',
  is_active: true,
  document: null,
})
const groupedRecords = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  const groups = new Map()

  for (const record of records.value) {
    const jabatan = record.jabatan

    if (!jabatan) continue

    if (!groups.has(jabatan.id)) {
      groups.set(jabatan.id, {
        id: jabatan.id,
        nama_jabatan: jabatan.nama_jabatan,
        departemen: jabatan.departemen,
        total: 0,
        active: 0,
        categories: new Set(),
      })
    }

    const group = groups.get(jabatan.id)
    group.total += 1
    group.active += record.is_active ? 1 : 0
    group.categories.add(record.kategori)
  }

  return Array.from(groups.values())
    .map((group) => ({ ...group, categories: Array.from(group.categories).join(', ') }))
    .filter((group) =>
      [group.nama_jabatan, group.departemen, group.categories].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(keyword),
      ),
    )
    .sort((a, b) => a.nama_jabatan.localeCompare(b.nama_jabatan))
})

async function load() {
  options.value = (await getHrTalentOptions()).data
  records.value = (await getHrJobdesks()).data
}

function reset() {
  Object.assign(form, {
    master_jabatan_id: '',
    kategori: '',
    deskripsi: '',
    tipe_tugas: 'harian',
    is_active: true,
    document: null,
  })
}

function selectDocument(event) {
  form.document = event.target.files[0] || null
}

async function save() {
  try {
    const payload = new FormData()
    Object.entries(form).forEach(([key, value]) => {
      if (value !== null) payload.append(key, key === 'is_active' ? (value ? '1' : '0') : value)
    })
    const response = await createHrJobdesk(payload)
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
      <h2 class="text-2xl font-semibold text-highlighted">Jobdesk Jabatan</h2>
      <p class="mt-1 text-sm text-muted">Kelola daftar tugas berdasarkan master jabatan.</p>
    </div>
    <AlertToastBridge :message="message" :error="errorMessage" />
    <UCard title="Tambah Jobdesk">
      <form class="grid gap-4 md:grid-cols-2" @submit.prevent="save">
        <select
          v-model="form.master_jabatan_id"
          required
          class="rounded-lg border border-default bg-default p-2.5"
        >
          <option value="">Pilih jabatan</option>
          <option v-for="item in options.jabatans" :key="item.id" :value="item.id">
            {{ item.nama_jabatan }} - {{ item.departemen || 'Tanpa departemen' }}
          </option>
        </select>
        <input
          v-model="form.kategori"
          required
          placeholder="Kategori"
          class="rounded-lg border border-default bg-default p-2.5"
        />
        <select v-model="form.tipe_tugas" class="rounded-lg border border-default bg-default p-2.5">
          <option
            v-for="type in ['harian', 'mingguan', 'bulanan', 'tahunan', 'insidental']"
            :key="type"
          >
            {{ type }}
          </option>
        </select>
        <label class="flex items-center gap-2 text-sm"
          ><input v-model="form.is_active" type="checkbox" /> Aktif</label
        >
        <textarea
          v-model="form.deskripsi"
          required
          placeholder="Deskripsi tugas"
          class="rounded-lg border border-default bg-default p-2.5 md:col-span-2"
        ></textarea>
        <label class="text-sm text-muted md:col-span-2">
          Dokumen Jobdesk (opsional, PDF maksimal 2 MB)
          <input
            type="file"
            accept=".pdf,application/pdf"
            class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            @change="selectDocument"
          />
        </label>
        <div class="flex gap-2">
          <UButton type="submit" label="Tambah Jobdesk" />
        </div>
      </form>
    </UCard>
    <UCard>
      <template #header>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="font-semibold text-highlighted">Daftar Jobdesk per Jabatan</h3>
            <p class="mt-1 text-sm text-muted">
              Buka detail jabatan untuk melihat seluruh jobdesk.
            </p>
          </div>
          <input
            v-model="search"
            type="search"
            placeholder="Cari jabatan, departemen, atau kategori"
            class="w-full rounded-lg border border-default bg-default p-2.5 text-sm sm:max-w-sm"
          />
        </div>
      </template>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-muted">
              <th class="p-3">Jabatan</th>
              <th class="p-3">Departemen</th>
              <th class="p-3">Kategori</th>
              <th class="p-3">Jumlah Jobdesk</th>
              <th class="p-3">Aktif</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="group in groupedRecords" :key="group.id" class="border-t border-default">
              <td class="p-3 font-medium text-highlighted">{{ group.nama_jabatan }}</td>
              <td class="p-3">{{ group.departemen || '-' }}</td>
              <td class="max-w-md p-3 text-muted">{{ group.categories }}</td>
              <td class="p-3">{{ group.total }}</td>
              <td class="p-3">{{ group.active }}</td>
              <td class="p-3">
                <UButton
                  :to="`/hr/talent/jobdesks/${group.id}`"
                  size="xs"
                  label="Lihat Jobdesk"
                  variant="soft"
                  icon="i-lucide-eye"
                />
              </td>
            </tr>
            <tr v-if="!groupedRecords.length">
              <td colspan="6" class="p-6 text-center text-muted">Data jobdesk tidak ditemukan.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </section>
</template>
