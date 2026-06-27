<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import EmployeeFormFields from '../components/EmployeeFormFields.vue'
import {
  getEmployee,
  getEmployeeFingerspotClouds,
  getEmployees,
  sendEmployeeFingerspotUserinfo,
  updateEmployee,
} from '../services/employeeService'
import { createHrContract, getHrContractPdfPreview, updateHrContract } from '../services/hrService'
import { apiError, formatDate } from '../utils/formatters'

const route = useRoute()
const form = reactive({})
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const message = ref(route.query.created ? 'Karyawan berhasil ditambahkan.' : '')
const supervisorOptions = ref([])
const contracts = ref([])
const changeLogs = ref([])
const loadingOptions = ref(false)
const fingerspotClouds = ref([])
const selectedFingerspotCloudId = ref('')
const sendingFingerspotUserinfo = ref(false)
const nik = computed(() => String(route.params.nik || ''))
const contractFormOpen = ref(false)
const editingContractId = ref(null)
const currentContractHasDocument = ref(false)
const replaceDocumentActive = ref(false)
const deleteDocumentPending = ref(false)
const savingContract = ref(false)
const photoLoadFailed = ref(false)
const documentPreview = reactive({ open: false, title: '', url: '', contractId: null })
const loadingDocument = ref(false)
const contractForm = reactive({
  jenis_kontrak: 'PKWT',
  status_kontrak: 'AKTIF',
  start_date: '',
  end_date: '',
  keterangan: '',
  document: null,
})
const hasActiveContract = computed(() =>
  contracts.value.some((contract) => contract.status === 'AKTIF'),
)
const flattenedChangeLogs = computed(() =>
  changeLogs.value.flatMap((log) =>
    (log.changes || []).map((change, index) => ({
      id: `${log.id}-${change.field}-${index}`,
      date: formatDate(log.created_at),
      time: new Date(log.created_at).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      changed_by_name: log.changed_by_name,
      source_label: log.source_label,
      label: change.label,
      old: change.old,
      new: change.new,
    })),
  ),
)

function assignForm(data) {
  Object.assign(form, data)
  form.children = Array.isArray(data.children)
    ? [...data.children]
    : [data.nama_anak_1, data.nama_anak_2, data.nama_anak_3].filter((name) =>
        String(name || '').trim(),
      )
  if (!form.children.length) form.children = ['']
  photoLoadFailed.value = false
  contracts.value = data.contracts ?? []
  changeLogs.value = data.change_logs ?? []
  for (const key of ['join_date', 'start_date', 'end_date', 'tanggal_lahir']) {
    form[key] = form[key] ? String(form[key]).slice(0, 10) : ''
  }
}

async function loadEmployee() {
  loading.value = true
  loadingOptions.value = true
  errorMessage.value = ''
  try {
    const [response, employeesResponse, fingerspotCloudsResponse] = await Promise.all([
      getEmployee(nik.value),
      getEmployees(),
      getEmployeeFingerspotClouds(),
    ])
    assignForm(response.data.data ?? response.data)
    supervisorOptions.value = (employeesResponse.data.data ?? []).filter(
      (employee) => employee.nik !== nik.value,
    )
    fingerspotClouds.value = fingerspotCloudsResponse.data.data ?? []
    selectedFingerspotCloudId.value =
      fingerspotClouds.value.length > 1 ? 'all' : fingerspotClouds.value[0]?.id || ''
  } catch (error) {
    errorMessage.value = apiError(error, 'Detail karyawan tidak dapat dimuat.')
  } finally {
    loading.value = false
    loadingOptions.value = false
  }
}

async function sendToFingerspot() {
  if (!selectedFingerspotCloudId.value) return

  sendingFingerspotUserinfo.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const response = await sendEmployeeFingerspotUserinfo(nik.value, {
      cloud_id: selectedFingerspotCloudId.value,
    })

    if (response.data.ok) {
      message.value = response.data.message
    } else {
      errorMessage.value = response.data.message
    }
  } catch (error) {
    errorMessage.value = apiError(error, 'Data karyawan tidak dapat dikirim ke mesin absensi.')
  } finally {
    sendingFingerspotUserinfo.value = false
  }
}

async function save() {
  saving.value = true
  message.value = ''
  errorMessage.value = ''
  const payload = { ...form }
  for (const key of [
    'nik',
    'pin',
    'jenis_kontrak',
    'status_kontrak',
    'start_date',
    'end_date',
    'keterangan_kontrak',
    'active_contract_id',
    'contracts',
    'change_logs',
    'photo_url',
  ]) {
    delete payload[key]
  }
  if (!payload.posisi_level && !payload.posisi_title && payload.posisi) {
    delete payload.posisi_level
    delete payload.posisi_title
  }

  try {
    const { data } = await updateEmployee(nik.value, payload)
    assignForm(data.data)
    message.value = data.message
  } catch (error) {
    errorMessage.value = apiError(error, 'Perubahan karyawan tidak dapat disimpan.')
  } finally {
    saving.value = false
  }
}

function auditValue(value) {
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : '-'
  }

  return value === null || value === undefined || value === '' ? '-' : value
}

function clearContractForm() {
  editingContractId.value = null
  contractForm.jenis_kontrak = 'PKWT'
  contractForm.status_kontrak = 'AKTIF'
  contractForm.start_date = ''
  contractForm.end_date = ''
  contractForm.keterangan = ''
  contractForm.document = null
  currentContractHasDocument.value = false
  replaceDocumentActive.value = false
  deleteDocumentPending.value = false
}

function addContract() {
  clearContractForm()
  contractFormOpen.value = true
}

function editContract(contract) {
  editingContractId.value = contract.id
  contractForm.jenis_kontrak = contract.contract_type || 'PKWT'
  contractForm.status_kontrak = contract.status
  contractForm.start_date = contract.start_date || ''
  contractForm.end_date = contract.end_date || ''
  contractForm.keterangan = contract.description || ''
  contractForm.document = null
  currentContractHasDocument.value = contract.has_document
  replaceDocumentActive.value = false
  deleteDocumentPending.value = false
  contractFormOpen.value = true
}

function selectContractDocument(event) {
  contractForm.document = event.target.files[0] || null
}

function activateReplaceDocument() {
  replaceDocumentActive.value = true
  deleteDocumentPending.value = false
  contractForm.document = null
}

function cancelReplaceDocument() {
  replaceDocumentActive.value = false
  deleteDocumentPending.value = false
  contractForm.document = null
}

function deleteDocumentAction() {
  deleteDocumentPending.value = true
  replaceDocumentActive.value = false
  contractForm.document = null
}

function closeDocumentPreview() {
  if (documentPreview.url) URL.revokeObjectURL(documentPreview.url)
  documentPreview.open = false
  documentPreview.title = ''
  documentPreview.url = ''
  documentPreview.contractId = null
}

function pdfBlobUrl(contentBase64, mimeType) {
  const bytes = Uint8Array.from(atob(contentBase64), (character) => character.charCodeAt(0))
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }))
}

async function previewDocument(contract) {
  closeDocumentPreview()
  documentPreview.open = true
  documentPreview.title = `Kontrak ke-${contract.contract_number}`
  documentPreview.contractId = contract.id
  loadingDocument.value = true
  errorMessage.value = ''

  try {
    const response = await getHrContractPdfPreview(contract.id)
    documentPreview.url = pdfBlobUrl(response.data.content_base64, response.data.mime_type)
  } catch (error) {
    closeDocumentPreview()
    errorMessage.value = apiError(error, 'Dokumen kontrak tidak dapat ditampilkan.')
  } finally {
    loadingDocument.value = false
  }
}

async function saveContract() {
  savingContract.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const values = {
      jenis_kontrak: contractForm.jenis_kontrak,
      status_kontrak: contractForm.status_kontrak,
      start_date: contractForm.start_date,
      end_date: contractForm.end_date,
      keterangan: contractForm.keterangan || null,
    }
    const payload = new FormData()
    Object.entries(values).forEach(([key, value]) => {
      if (value !== null) payload.append(key, value)
    })
    if (editingContractId.value) {
      payload.append('_method', 'PUT')
      if (deleteDocumentPending.value) {
        payload.append('document', 'null')
      } else if (contractForm.document) {
        payload.append('document', contractForm.document)
      }
    } else {
      if (contractForm.document) payload.append('document', contractForm.document)
    }
    const response = editingContractId.value
      ? await updateHrContract(editingContractId.value, payload)
      : await createHrContract(nik.value, payload)

    message.value = response.data.message
    contractFormOpen.value = false
    clearContractForm()
    await loadEmployee()
  } catch (error) {
    errorMessage.value = apiError(error, 'Kontrak tidak dapat disimpan.')
  } finally {
    savingContract.value = false
  }
}

onMounted(loadEmployee)
onBeforeUnmount(closeDocumentPreview)
</script>

<template>
  <section class="space-y-6">
    <form class="space-y-6" @submit.prevent="save">
      <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p class="text-sm text-muted">Data Karyawan / {{ nik }}</p>
          <h2 class="mt-1 text-2xl font-semibold text-highlighted">
            {{ form.nama_karyawan || 'Detail Karyawan' }}
          </h2>
          <p class="mt-1 text-sm text-muted">
            HRD dapat mengedit data profil kecuali NIK dan PIN. Kontrak dikelola terpisah di bawah.
          </p>
        </div>
        <div class="flex gap-2">
          <UButton to="/employees" label="Kembali" color="neutral" variant="outline" />
          <UButton v-if="!loading" type="submit" label="Simpan Profil" :loading="saving" />
        </div>
      </div>

      <AlertToastBridge :message="message" :error="errorMessage" />

      <div v-if="loading" class="py-16 text-center text-sm text-muted">
        Memuat detail karyawan...
      </div>
      <template v-else-if="form.nik">
        <UCard>
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
            <img
              v-if="form.photo_url && !photoLoadFailed"
              :src="form.photo_url"
              :alt="`Foto ${form.nama_karyawan}`"
              class="size-16 shrink-0 rounded-full object-cover"
              @error="photoLoadFailed = true"
            />
            <UAvatar
              v-else
              :text="form.nama_karyawan?.slice(0, 2).toUpperCase()"
              color="primary"
              size="xl"
            />
            <div>
              <h3 class="text-lg font-semibold text-highlighted">{{ form.nama_karyawan }}</h3>
              <p class="text-sm text-muted">{{ form.posisi || form.jabatan || '-' }}</p>
            </div>
            <UBadge
              class="sm:ml-auto"
              :color="form.status_karyawan === 'AKTIF' ? 'success' : 'neutral'"
              variant="subtle"
              :label="form.status_karyawan === 'AKTIF' ? 'Karyawan Aktif' : 'Karyawan Tidak Aktif'"
            />
          </div>
        </UCard>
        <EmployeeFormFields
          :form="form"
          :supervisor-options="supervisorOptions"
          :loading-options="loadingOptions"
        />
      </template>
    </form>

    <UCard v-if="!loading && form.nik" title="Mesin Absensi">
      <template #header>
        <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h3 class="font-semibold text-highlighted">Kirim ke Mesin Absensi</h3>
            <p class="mt-1 text-sm text-muted">
              Kirim nama dan PIN ke Fingerspot supaya karyawan bisa dicari di mesin untuk enroll
              sidik jari.
            </p>
          </div>
          <UButton
            type="button"
            icon="i-lucide-fingerprint"
            label="Kirim Userinfo"
            :loading="sendingFingerspotUserinfo"
            :disabled="!form.pin || !selectedFingerspotCloudId || !fingerspotClouds.length"
            @click="sendToFingerspot"
          />
        </div>
      </template>

      <div class="grid gap-4 md:grid-cols-3">
        <label class="text-sm text-muted md:col-span-2">
          Mesin Tujuan
          <select
            v-model="selectedFingerspotCloudId"
            class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="sendingFingerspotUserinfo || !fingerspotClouds.length"
          >
            <option value="" disabled>Pilih mesin</option>
            <option v-if="fingerspotClouds.length > 1" value="all">Semua mesin</option>
            <option v-for="cloud in fingerspotClouds" :key="cloud.id" :value="cloud.id">
              {{ cloud.name }}
            </option>
          </select>
        </label>
        <div class="rounded-lg border border-default bg-elevated p-4 text-sm">
          <p class="text-muted">PIN Absensi</p>
          <p class="mt-1 text-lg font-semibold text-highlighted">{{ form.pin || '-' }}</p>
          <p v-if="!form.pin" class="mt-2 text-xs text-warning">
            Isi PIN saat membuat karyawan agar bisa dikirim ke mesin.
          </p>
        </div>
      </div>
      <p class="mt-3 text-xs text-muted">
        Template sidik jari/wajah tidak dikirim dari HRIS. Setelah userinfo masuk ke mesin,
        daftarkan verifikasi langsung dari mesin absensi.
      </p>
    </UCard>

    <UCard v-if="!loading && form.nik" title="Kelola Kontrak Karyawan">
      <template #header>
        <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h3 class="font-semibold text-highlighted">Kelola Kontrak Karyawan</h3>
            <p class="mt-1 text-sm text-muted">
              Tambah atau edit riwayat kontrak. Kontrak aktif harus dinonaktifkan sebelum membuat
              kontrak baru.
            </p>
          </div>
          <div class="text-right">
            <UButton
              type="button"
              label="Tambah Kontrak Baru"
              icon="i-lucide-plus"
              :disabled="hasActiveContract"
              @click="addContract"
            />
            <p v-if="hasActiveContract" class="mt-2 text-xs text-warning">
              Nonaktifkan kontrak aktif terlebih dahulu.
            </p>
          </div>
        </div>
      </template>

      <form
        v-if="contractFormOpen"
        class="mb-5 rounded-xl border border-default bg-elevated/30 p-4"
        @submit.prevent="saveContract"
      >
        <p class="mb-4 font-medium text-highlighted">
          {{ editingContractId ? 'Edit Kontrak' : 'Kontrak Baru' }}
        </p>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <label class="text-sm text-muted">
            Jenis Kontrak
            <select
              v-model="contractForm.jenis_kontrak"
              required
              class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            >
              <option value="PKWT">PKWT</option>
              <option value="PKWTT">PKWTT</option>
            </select>
          </label>
          <label class="text-sm text-muted">
            Status Kontrak
            <select
              v-model="contractForm.status_kontrak"
              required
              class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            >
              <option value="AKTIF">AKTIF</option>
              <option value="NONAKTIF">TIDAK AKTIF</option>
            </select>
          </label>
          <label class="text-sm text-muted">
            Tanggal Mulai
            <input
              v-model="contractForm.start_date"
              type="date"
              required
              class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            />
          </label>
          <label class="text-sm text-muted">
            Tanggal Selesai
            <input
              v-model="contractForm.end_date"
              type="date"
              required
              class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            />
          </label>
          <label class="text-sm text-muted">
            Keterangan
            <input
              v-model="contractForm.keterangan"
              type="text"
              class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
            />
          </label>
          <div class="text-sm text-muted sm:col-span-2 xl:col-span-5">
            <span class="block">Dokumen Kontrak (opsional, PDF, maksimal 10 MB)</span>
            
            <div v-if="editingContractId && currentContractHasDocument && !deleteDocumentPending" class="mt-2 flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                Sudah ada dokumen
              </span>
              
              <UButton
                type="button"
                size="xs"
                color="warning"
                variant="soft"
                label="Ganti Dokumen"
                @click="activateReplaceDocument"
              />
              
              <UButton
                type="button"
                size="xs"
                color="error"
                variant="soft"
                label="Hapus Dokumen"
                @click="deleteDocumentAction"
              />

              <UButton
                v-if="replaceDocumentActive"
                type="button"
                size="xs"
                color="neutral"
                variant="soft"
                label="Batal Ganti"
                @click="cancelReplaceDocument"
              />
            </div>

            <div v-else-if="editingContractId && deleteDocumentPending" class="mt-2 flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-500">
                Dokumen akan dihapus saat disimpan
              </span>
              <UButton
                type="button"
                size="xs"
                color="neutral"
                variant="soft"
                label="Batal Hapus"
                @click="cancelReplaceDocument"
              />
            </div>
            
            <input
              v-if="!editingContractId || !currentContractHasDocument || replaceDocumentActive"
              type="file"
              accept=".pdf,application/pdf"
              class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
              @change="selectContractDocument"
            />
          </div>
        </div>
        <p class="mt-3 text-xs text-muted">
          Durasi kontrak dihitung otomatis dari tanggal mulai sampai tanggal selesai.
        </p>
        <div class="mt-4 flex gap-2">
          <UButton type="submit" label="Simpan Kontrak" :loading="savingContract" />
          <UButton
            type="button"
            label="Batal"
            color="neutral"
            variant="outline"
            @click="contractFormOpen = false"
          />
        </div>
      </form>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">Kontrak</th>
              <th class="p-3">Jenis</th>
              <th class="p-3">Periode</th>
              <th class="p-3">Durasi</th>
              <th class="p-3">Status</th>
              <th class="p-3">Keterangan</th>
              <th class="p-3">Dokumen</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="contract in contracts" :key="contract.id" class="border-t border-default">
              <td class="p-3 font-medium text-highlighted">
                Kontrak ke-{{ contract.contract_number }}
              </td>
              <td class="p-3">{{ contract.contract_type }}</td>
              <td class="p-3">
                {{ formatDate(contract.start_date) }} - {{ formatDate(contract.end_date) }}
              </td>
              <td class="p-3">{{ contract.duration_label }}</td>
              <td class="p-3">
                <UBadge
                  :color="contract.status === 'AKTIF' ? 'success' : 'neutral'"
                  variant="subtle"
                  :label="contract.status === 'AKTIF' ? 'AKTIF' : 'TIDAK AKTIF'"
                />
              </td>
              <td class="p-3">{{ contract.description || '-' }}</td>
              <td class="p-3">
                <UButton
                  v-if="contract.has_document"
                  type="button"
                  size="xs"
                  variant="soft"
                  label="Lihat PDF"
                  :loading="loadingDocument && documentPreview.contractId === contract.id"
                  @click="previewDocument(contract)"
                />
                <span v-else>-</span>
              </td>
              <td class="p-3">
                <UButton
                  type="button"
                  size="xs"
                  color="neutral"
                  variant="outline"
                  label="Edit"
                  @click="editContract(contract)"
                />
              </td>
            </tr>
            <tr v-if="!contracts.length">
              <td colspan="8" class="p-8 text-center text-muted">
                Karyawan ini belum memiliki kontrak. Tambahkan kontrak pertamanya.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <UCard v-if="!loading && form.nik" title="Riwayat Perubahan Data">
      <template #header>
        <div>
          <h3 class="font-semibold text-highlighted">Riwayat Perubahan Data</h3>
          <p class="mt-1 text-sm text-muted">
            Catatan perubahan profil karyawan, termasuk siapa yang mengubah dan kapan dilakukan.
          </p>
        </div>
      </template>

      <div v-if="flattenedChangeLogs.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">Tanggal</th>
              <th class="p-3">Jam</th>
              <th class="p-3">Diubah Oleh</th>
              <th class="p-3">Sebagai</th>
              <th class="p-3">Data Diubah</th>
              <th class="p-3">Sebelumnya</th>
              <th class="p-3">Menjadi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in flattenedChangeLogs" :key="log.id" class="border-t border-default">
              <td class="p-3 whitespace-nowrap">{{ log.date }}</td>
              <td class="p-3 whitespace-nowrap">{{ log.time }}</td>
              <td class="p-3 font-medium text-highlighted">{{ log.changed_by_name }}</td>
              <td class="p-3">
                <UBadge
                  :color="log.source_label === 'HRD' ? 'primary' : 'neutral'"
                  variant="subtle"
                  :label="log.source_label"
                />
              </td>
              <td class="p-3 font-medium text-highlighted">{{ log.label }}</td>
              <td class="p-3 text-muted">{{ auditValue(log.old) }}</td>
              <td class="p-3">{{ auditValue(log.new) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="py-8 text-center text-sm text-muted">
        Belum ada riwayat perubahan data karyawan.
      </p>
    </UCard>

    <div
      v-if="documentPreview.open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      :aria-label="documentPreview.title"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/60"
        aria-label="Tutup dokumen kontrak"
        @click="closeDocumentPreview"
      ></button>
      <UCard class="relative h-[85vh] w-full overflow-hidden lg:w-2/3">
        <div class="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold text-highlighted">{{ documentPreview.title }}</h3>
            <p class="mt-1 text-sm text-muted">Pratinjau dokumen PDF kontrak karyawan.</p>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            aria-label="Tutup"
            @click="closeDocumentPreview"
          />
        </div>
        <div v-if="loadingDocument" class="py-16 text-center text-sm text-muted">
          Memuat dokumen kontrak...
        </div>
        <iframe
          v-else-if="documentPreview.url"
          :src="documentPreview.url"
          :title="documentPreview.title"
          class="h-[calc(85vh-6rem)] w-full rounded-lg border border-default bg-white"
        ></iframe>
      </UCard>
    </div>
  </section>
</template>
