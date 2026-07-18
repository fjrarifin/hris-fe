<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import {
  createHrKpi,
  deleteHrKpi,
  getHrJobdesks,
  getHrKpis,
  getHrTalentOptions,
  syncActiveHrKpis,
  updateHrKpi,
} from '../services/hrService'
import { askConfirmation } from '../utils/confirmDialog'
import { apiError } from '../utils/formatters'

const options = ref({ jabatans: [] })
const records = ref([])
const jobdesks = ref([])
const selectedJabatan = ref('')
const search = ref('')
const detailCard = ref(null)
const activeIds = ref([])
const editingId = ref(null)
const message = ref('')
const errorMessage = ref('')
const form = reactive({
  master_jabatan_id: '',
  jobdesk_id: '',
  nama_kpi: '',
  deskripsi: '',
  target: '',
  satuan: 'persen',
  bobot: '',
  formula_penilaian: '',
})
const shown = computed(() =>
  records.value.filter(
    (item) => !selectedJabatan.value || item.master_jabatan_id === Number(selectedJabatan.value),
  ),
)
const total = computed(() =>
  shown.value
    .filter((item) => activeIds.value.includes(item.id))
    .reduce((sum, item) => sum + Number(item.bobot), 0),
)
const groupedRecords = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  const groups = new Map()

  for (const item of records.value) {
    const jabatan = item.jabatan

    if (!jabatan) continue

    if (!groups.has(jabatan.id)) {
      groups.set(jabatan.id, {
        id: jabatan.id,
        nama_jabatan: jabatan.nama_jabatan,
        departemen: jabatan.departemen,
        total: 0,
        active: 0,
        active_weight: 0,
      })
    }

    const group = groups.get(jabatan.id)
    group.total += 1

    if (item.is_active) {
      group.active += 1
      group.active_weight += Number(item.bobot)
    }
  }

  return Array.from(groups.values())
    .filter((group) =>
      [group.nama_jabatan, group.departemen].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(keyword),
      ),
    )
    .sort((a, b) => a.nama_jabatan.localeCompare(b.nama_jabatan))
})
const selectedJabatanName = computed(
  () =>
    options.value.jabatans.find((item) => item.id === Number(selectedJabatan.value))?.nama_jabatan,
)

async function load() {
  options.value = (await getHrTalentOptions()).data
  records.value = (await getHrKpis()).data
  jobdesks.value = (await getHrJobdesks()).data
  activeIds.value = records.value.filter((item) => item.is_active).map((item) => item.id)
}
function reset() {
  editingId.value = null
  Object.assign(form, {
    master_jabatan_id: selectedJabatan.value,
    jobdesk_id: '',
    nama_kpi: '',
    deskripsi: '',
    target: '',
    satuan: 'persen',
    bobot: '',
    formula_penilaian: '',
  })
}
function edit(item) {
  editingId.value = item.id
  Object.assign(form, { ...item, jobdesk_id: item.jobdesk_id || '' })
}
async function save() {
  try {
    const response = editingId.value
      ? await updateHrKpi(editingId.value, form)
      : await createHrKpi(form)
    message.value = response.data.message
    reset()
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  }
}
async function remove(item) {
  if (
    !(await askConfirmation({
      title: 'Hapus KPI',
      message: 'Hapus KPI ini?',
      confirmLabel: 'Hapus',
      color: 'error',
    }))
  )
    return
  try {
    message.value = (await deleteHrKpi(item.id)).data.message
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  }
}
async function syncActive() {
  try {
    message.value = (
      await syncActiveHrKpis(
        selectedJabatan.value,
        shown.value.filter((item) => activeIds.value.includes(item.id)).map((item) => item.id),
      )
    ).data.message
    await load()
  } catch (error) {
    errorMessage.value = apiError(error)
  }
}
async function manage(group) {
  selectedJabatan.value = group.id
  reset()
  await nextTick()
  detailCard.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
onMounted(load)
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Template KPI</h2>
      <p class="mt-1 text-sm text-muted">
        KPI baru tersimpan sebagai draft. Aktifkan satu set KPI saat total bobot tepat 100%.
      </p>
    </div>
    <AlertToastBridge :message="message" :error="errorMessage" />
    <UCard :title="editingId ? 'Ubah KPI Draft' : 'Tambah KPI Draft'"
      ><form class="grid gap-4 md:grid-cols-2" @submit.prevent="save">
        <select
          v-model="form.master_jabatan_id"
          required
          class="rounded-lg border border-default bg-default p-2.5"
        >
          <option value="">Pilih jabatan</option>
          <option v-for="item in options.jabatans" :key="item.id" :value="item.id">
            {{ item.nama_jabatan }}
          </option>
        </select>
        <select v-model="form.jobdesk_id" class="rounded-lg border border-default bg-default p-2.5">
          <option value="">Tanpa jobdesk</option>
          <option
            v-for="item in jobdesks.filter(
              (row) => row.master_jabatan_id === Number(form.master_jabatan_id),
            )"
            :key="item.id"
            :value="item.id"
          >
            {{ item.kategori }} - {{ item.deskripsi }}
          </option>
        </select>
        <input
          v-model="form.nama_kpi"
          required
          placeholder="Nama KPI"
          class="rounded-lg border border-default bg-default p-2.5"
        /><input
          v-model="form.target"
          required
          placeholder="Target"
          class="rounded-lg border border-default bg-default p-2.5"
        />
        <select v-model="form.satuan" class="rounded-lg border border-default bg-default p-2.5">
          <option
            v-for="unit in ['persen', 'jumlah', 'hari', 'rupiah', 'skor', 'dokumen']"
            :key="unit"
          >
            {{ unit }}
          </option></select
        ><input
          v-model="form.bobot"
          required
          type="number"
          min="0.01"
          max="100"
          step="0.01"
          placeholder="Bobot %"
          class="rounded-lg border border-default bg-default p-2.5"
        />
        <textarea
          v-model="form.deskripsi"
          placeholder="Deskripsi"
          class="rounded-lg border border-default bg-default p-2.5"
        ></textarea
        ><textarea
          v-model="form.formula_penilaian"
          placeholder="Formula penilaian opsional"
          class="rounded-lg border border-default bg-default p-2.5"
        ></textarea>
        <div class="flex gap-2">
          <UButton type="submit" label="Simpan KPI Draft" /><UButton
            v-if="editingId"
            label="Batal"
            color="neutral"
            variant="soft"
            @click="reset"
          />
        </div></form
    ></UCard>
    <UCard>
      <template #header>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="font-semibold text-highlighted">Daftar KPI per Jabatan</h3>
            <p class="mt-1 text-sm text-muted">
              Pilih jabatan untuk mengelola KPI dan aktivasi bobot.
            </p>
          </div>
          <input
            v-model="search"
            type="search"
            placeholder="Cari jabatan atau departemen"
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
              <th class="p-3">Jumlah KPI</th>
              <th class="p-3">KPI Aktif</th>
              <th class="p-3">Bobot Aktif</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="group in groupedRecords" :key="group.id" class="border-t border-default">
              <td class="p-3 font-medium text-highlighted">{{ group.nama_jabatan }}</td>
              <td class="p-3">{{ group.departemen || '-' }}</td>
              <td class="p-3">{{ group.total }}</td>
              <td class="p-3">{{ group.active }}</td>
              <td class="p-3">{{ group.active_weight }}%</td>
              <td class="p-3">
                <UButton
                  size="xs"
                  label="Kelola KPI"
                  variant="soft"
                  icon="i-lucide-settings-2"
                  @click="manage(group)"
                />
              </td>
            </tr>
            <tr v-if="!groupedRecords.length">
              <td colspan="6" class="p-6 text-center text-muted">Data KPI tidak ditemukan.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
    <div v-if="selectedJabatan" ref="detailCard" class="scroll-mt-6">
      <UCard :title="`Kelola KPI - ${selectedJabatanName}`">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-muted">
            Centang KPI yang akan digunakan. Total bobot pilihan harus tepat <b>100%</b>.
          </p>
          <div class="flex items-center gap-3">
            <span class="text-sm"
              >Bobot pilihan: <b>{{ total }}%</b></span
            >
            <UButton label="Aktifkan Pilihan" @click="syncActive" />
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-muted">
                <th class="p-3">Aktif</th>
                <th class="p-3">KPI</th>
                <th class="p-3">Target</th>
                <th class="p-3">Bobot</th>
                <th class="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in shown" :key="item.id" class="border-t border-default">
                <td class="p-3"><input v-model="activeIds" type="checkbox" :value="item.id" /></td>
                <td class="p-3">{{ item.nama_kpi }}</td>
                <td class="p-3">{{ item.target }} {{ item.satuan }}</td>
                <td class="p-3">{{ item.bobot }}%</td>
                <td class="space-x-2 p-3">
                  <UButton
                    size="xs"
                    label="Ubah"
                    variant="soft"
                    :disabled="item.is_active"
                    @click="edit(item)"
                  />
                  <UButton
                    size="xs"
                    label="Hapus"
                    color="error"
                    variant="soft"
                    :disabled="item.is_active"
                    @click="remove(item)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </div>
  </section>
</template>
