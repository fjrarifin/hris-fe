<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  createHrContract,
  getHrContracts,
  getHrContractPdfPreview,
  getHrEmployeeContracts,
  updateHrContract,
} from '../services/hrService'
import { apiError, formatDate } from '../utils/formatters'

const route = useRoute()
const allowedStatuses = [
  'all',
  'active',
  'expiring_60_days',
  'expiring_45_days',
  'expiring_30_days',
  'expiring_two_months',
  'expiring_this_month',
  'expiring_next_month',
  'expired',
  'no_contract',
]

function normalizeStatus(status) {
  if (status === 'expiring_two_months') return 'expiring_60_days'

  return allowedStatuses.includes(status) ? status : 'all'
}

const filters = reactive({
  q: '',
  status: normalizeStatus(route.query.status),
})
const data = ref(null)
const detail = ref(null)
const page = ref(1)
const loading = ref(false)
const loadingDetail = ref(false)
const saving = ref(false)
const detailCardRef = ref(null)
const formOpen = ref(false)
const editingId = ref(null)
const currentContractHasDocument = ref(false)
const replaceDocumentActive = ref(false)
const deleteDocumentPending = ref(false)
const form = reactive({
  jenis_kontrak: 'PKWT',
  status_kontrak: 'AKTIF',
  start_date: '',
  end_date: '',
  keterangan: '',
  document: null,
})
const message = ref('')
const errorMessage = ref('')
const documentPreview = reactive({ open: false, title: '', url: '', contractId: null })
const loadingDocument = ref(false)
let searchTimer = null
const hasActiveContract = computed(() =>
  (detail.value?.contracts ?? []).some((contract) => contract.status === 'AKTIF'),
)
const flattenedAuditLogs = computed(() =>
  (detail.value?.audit_logs || []).flatMap((log) =>
    (log.changes?.length
      ? log.changes
      : [{ field: 'action', label: 'Aktivitas', old: '-', new: actionLabel(log.action) }]
    ).map((change, index) => ({
      id: `${log.id}-${change.field}-${index}`,
      date: formatDate(log.created_at),
      time: new Date(log.created_at).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      changed_by_name: log.changed_by_name,
      source_label: log.source_label,
      subject_label: log.subject_label,
      label: change.label,
      old: change.old,
      new: change.new,
    })),
  ),
)

const stateLabels = {
  active: 'Aktif',
  expiring_this_month: 'Berakhir Bulan Ini',
  expiring_next_month: 'Berakhir Bulan Depan',
  expired: 'Berakhir',
  no_contract: 'Belum Ada Kontrak',
}

function stateLabel(state) {
  return stateLabels[state] || state
}

function stateColor(state) {
  return (
    {
      active: 'success',
      expiring_this_month: 'error',
      expiring_next_month: 'warning',
      expired: 'neutral',
      no_contract: 'info',
    }[state] || 'neutral'
  )
}

function auditValue(value) {
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : '-'
  }

  return value === null || value === undefined || value === '' ? '-' : value
}

function actionLabel(action) {
  return action === 'created' ? 'Dibuat' : action === 'deleted' ? 'Dihapus' : 'Diubah'
}

function clearForm() {
  editingId.value = null
  form.jenis_kontrak = 'PKWT'
  form.status_kontrak = 'AKTIF'
  form.start_date = ''
  form.end_date = ''
  form.keterangan = ''
  form.document = null
  currentContractHasDocument.value = false
  replaceDocumentActive.value = false
  deleteDocumentPending.value = false
}

async function load(requestedPage = 1) {
  loading.value = true
  errorMessage.value = ''
  try {
    data.value = (await getHrContracts({ ...filters, page: requestedPage })).data
    page.value = data.value.pagination.current_page
  } catch (error) {
    errorMessage.value = apiError(error, 'Data kontrak tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function openDetail(nik, scrollToDetail = true) {
  loadingDetail.value = true
  formOpen.value = false
  clearForm()
  errorMessage.value = ''
  if (scrollToDetail) {
    await nextTick()
    detailCardRef.value?.$el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  try {
    detail.value = (await getHrEmployeeContracts(nik)).data
  } catch (error) {
    errorMessage.value = apiError(error, 'Riwayat kontrak tidak dapat dimuat.')
  } finally {
    loadingDetail.value = false
  }
}

function createContract() {
  clearForm()
  formOpen.value = true
}

function editContract(contract) {
  editingId.value = contract.id
  form.jenis_kontrak = contract.contract_type || 'PKWT'
  form.status_kontrak = contract.status
  form.start_date = contract.start_date || ''
  form.end_date = contract.end_date || ''
  form.keterangan = contract.description || ''
  form.document = null
  currentContractHasDocument.value = contract.has_document
  replaceDocumentActive.value = false
  deleteDocumentPending.value = false
  formOpen.value = true
}

function selectDocument(event) {
  form.document = event.target.files[0] || null
}

function activateReplaceDocument() {
  replaceDocumentActive.value = true
  deleteDocumentPending.value = false
  form.document = null
}

function cancelReplaceDocument() {
  replaceDocumentActive.value = false
  deleteDocumentPending.value = false
  form.document = null
}

function deleteDocumentAction() {
  deleteDocumentPending.value = true
  replaceDocumentActive.value = false
  form.document = null
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
  saving.value = true
  message.value = ''
  errorMessage.value = ''
  const values = {
    jenis_kontrak: form.jenis_kontrak,
    status_kontrak: form.status_kontrak,
    start_date: form.start_date,
    end_date: form.end_date,
    keterangan: form.keterangan || null,
  }
  const payload = new FormData()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== null) payload.append(key, value)
  })
  if (editingId.value) {
    payload.append('_method', 'PUT')
    if (deleteDocumentPending.value) {
      payload.append('document', 'null')
    } else if (form.document) {
      payload.append('document', form.document)
    }
  } else {
    if (form.document) payload.append('document', form.document)
  }

  try {
    const response = editingId.value
      ? await updateHrContract(editingId.value, payload)
      : await createHrContract(detail.value.employee.nik, payload)
    message.value = response.data.message
    formOpen.value = false
    await Promise.all([openDetail(detail.value.employee.nik, false), load(page.value)])
  } catch (error) {
    errorMessage.value = apiError(error, 'Kontrak tidak dapat disimpan.')
  } finally {
    saving.value = false
  }
}

watch(
  () => filters.q,
  () => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => load(1), 300)
  },
)

watch(
  () => filters.status,
  () => {
    load(1)
  },
)

watch(
  () => route.query.status,
  (status) => {
    filters.status = normalizeStatus(status)
  },
)

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  closeDocumentPreview()
})
onMounted(() => load())
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Kontrak Karyawan</h2>
      <p class="mt-1 text-sm text-muted">
        Pantau kontrak berjalan dan kelola riwayat kontrak karyawan dari satu halaman.
      </p>
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <div v-if="data" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <UCard>
        <p class="text-sm text-muted">Kontrak Berjalan</p>
        <p class="mt-2 text-3xl font-semibold text-highlighted">{{ data.summary.active }}</p>
      </UCard>
      <UCard>
        <p class="text-sm text-muted">Berakhir 46-60 Hari</p>
        <p class="mt-2 text-3xl font-semibold text-highlighted">
          {{ data.summary.expiring_60_days }}
        </p>
      </UCard>
      <UCard>
        <p class="text-sm text-muted">Berakhir 31-45 Hari</p>
        <p class="mt-2 text-3xl font-semibold text-highlighted">
          {{ data.summary.expiring_45_days }}
        </p>
      </UCard>
      <UCard>
        <p class="text-sm text-muted">Berakhir 0-30 Hari</p>
        <p class="mt-2 text-3xl font-semibold text-highlighted">
          {{ data.summary.expiring_30_days }}
        </p>
      </UCard>
      <UCard>
        <p class="text-sm text-muted">Sudah Berakhir</p>
        <p class="mt-2 text-3xl font-semibold text-highlighted">{{ data.summary.expired }}</p>
      </UCard>
      <UCard>
        <p class="text-sm text-muted">Belum Ada Kontrak</p>
        <p class="mt-2 text-3xl font-semibold text-highlighted">{{ data.summary.no_contract }}</p>
      </UCard>
    </div>

    <UCard title="Daftar Kontrak Karyawan">
      <form class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="load()">
        <label class="flex-1 text-sm text-muted">
          Cari Karyawan
          <input
            v-model="filters.q"
            type="search"
            placeholder="Nama, NIK, jabatan, atau departemen"
            class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
          />
        </label>
        <label class="text-sm text-muted">
          Kondisi Kontrak
          <select
            v-model="filters.status"
            class="mt-2 block rounded-lg border border-default bg-default p-2.5 text-highlighted"
          >
            <option value="all">Semua kondisi</option>
            <option value="active">Kontrak berjalan</option>
            <option value="expiring_60_days">Berakhir 46-60 hari</option>
            <option value="expiring_45_days">Berakhir 31-45 hari</option>
            <option value="expiring_30_days">Berakhir 0-30 hari</option>
            <option value="expired">Sudah berakhir</option>
            <option value="no_contract">Belum ada kontrak</option>
          </select>
        </label>
        <UButton type="submit" label="Terapkan Filter" icon="i-lucide-search" :loading="loading" />
      </form>

      <div v-if="loading && !data" class="py-10 text-center text-sm text-muted">
        Memuat kontrak karyawan...
      </div>
      <div v-else-if="data" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">Karyawan</th>
              <th class="p-3">Departemen</th>
              <th class="p-3">Kontrak</th>
              <th class="p-3">Periode</th>
              <th class="p-3">Kondisi</th>
              <th class="p-3">Riwayat</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in data.records" :key="record.nik" class="border-t border-default">
              <td class="p-3">
                <p class="font-medium text-highlighted">{{ record.name }}</p>
                <p class="text-xs text-muted">{{ record.nik }} - {{ record.position }}</p>
              </td>
              <td class="p-3">{{ record.department }}</td>
              <td class="p-3">
                <template v-if="record.contract">
                  {{ record.contract.contract_type }} / Kontrak ke-{{
                    record.contract.contract_number
                  }}
                </template>
                <span v-else>-</span>
              </td>
              <td class="p-3">
                <template v-if="record.contract">
                  {{ formatDate(record.contract.start_date) }} -
                  {{ formatDate(record.contract.end_date) }}
                </template>
                <span v-else>-</span>
              </td>
              <td class="p-3">
                <UBadge
                  :label="stateLabel(record.contract_state)"
                  :color="stateColor(record.contract_state)"
                  variant="subtle"
                />
                <p class="mt-2 text-xs text-muted">Karyawan: {{ record.employee_status }}</p>
              </td>
              <td class="p-3">{{ record.contracts_count }} kontrak</td>
              <td class="p-3">
                <UButton size="xs" variant="soft" label="Kelola" @click="openDetail(record.nik)" />
              </td>
            </tr>
            <tr v-if="!data.records.length">
              <td colspan="7" class="p-8 text-center text-muted">
                Tidak ada karyawan pada filter kontrak ini.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="data?.pagination.total"
        class="mt-4 flex flex-col items-center justify-between gap-3 border-t border-default pt-4 sm:flex-row"
      >
        <p class="text-sm text-muted">
          Menampilkan {{ data.pagination.from }}-{{ data.pagination.to }} dari
          {{ data.pagination.total }} karyawan
        </p>
        <UPagination
          :page="page"
          :total="data.pagination.total"
          :items-per-page="data.pagination.per_page"
          show-controls
          @update:page="load"
        />
      </div>
    </UCard>

    <UCard ref="detailCardRef" v-if="detail || loadingDetail" title="Kelola Riwayat Kontrak">
      <div v-if="loadingDetail" class="py-8 text-center text-sm text-muted">
        Memuat riwayat kontrak...
      </div>
      <template v-else-if="detail">
        <div class="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p class="font-semibold text-highlighted">{{ detail.employee.name }}</p>
            <p class="text-sm text-muted">
              {{ detail.employee.nik }} - {{ detail.employee.department }}
            </p>
          </div>
          <div class="text-right">
            <UButton
              label="Tambah Kontrak Baru"
              icon="i-lucide-plus"
              :disabled="hasActiveContract"
              @click="createContract"
            />
            <p v-if="hasActiveContract" class="mt-2 text-xs text-warning">
              Nonaktifkan kontrak aktif terlebih dahulu.
            </p>
          </div>
        </div>

        <form
          v-if="formOpen"
          class="mb-5 rounded-xl border border-default bg-elevated/30 p-4"
          @submit.prevent="saveContract"
        >
          <p class="mb-4 font-medium text-highlighted">
            {{ editingId ? 'Edit Kontrak' : 'Kontrak Baru' }}
          </p>
          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <label class="text-sm text-muted">
              Jenis Kontrak
              <select
                v-model="form.jenis_kontrak"
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
                v-model="form.status_kontrak"
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
                v-model="form.start_date"
                type="date"
                required
                class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
              />
            </label>
            <label class="text-sm text-muted">
              Tanggal Selesai
              <input
                v-model="form.end_date"
                type="date"
                required
                class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
              />
            </label>
            <label class="text-sm text-muted">
              Keterangan
              <input
                v-model="form.keterangan"
                type="text"
                placeholder="Catatan kontrak"
                class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
              />
            </label>
            <div class="text-sm text-muted sm:col-span-2 xl:col-span-5">
              <span class="block">Dokumen Kontrak (opsional, PDF, maksimal 10 MB)</span>

              <div
                v-if="editingId && currentContractHasDocument && !deleteDocumentPending"
                class="mt-2 flex items-center gap-2"
              >
                <span
                  class="inline-flex items-center gap-1.5 rounded bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  Sudah ada dokumen
                </span>

                <UButton
                  v-if="!replaceDocumentActive"
                  type="button"
                  size="xs"
                  color="warning"
                  variant="soft"
                  label="Ganti Dokumen"
                  @click="activateReplaceDocument"
                />

                <UButton
                  v-if="!replaceDocumentActive"
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

              <div
                v-else-if="editingId && deleteDocumentPending"
                class="mt-2 flex items-center gap-2"
              >
                <span
                  class="inline-flex items-center gap-1.5 rounded bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-500"
                >
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
                v-if="!editingId || !currentContractHasDocument || replaceDocumentActive"
                type="file"
                accept=".pdf,application/pdf"
                class="mt-2 block w-full rounded-lg border border-default bg-default p-2.5 text-highlighted"
                @change="selectDocument"
              />
            </div>
          </div>
          <p class="mt-3 text-xs text-muted">
            Durasi kontrak dihitung otomatis dari tanggal mulai sampai tanggal selesai.
          </p>
          <div class="mt-4 flex gap-2">
            <UButton type="submit" label="Simpan Kontrak" :loading="saving" />
            <UButton
              type="button"
              label="Batal"
              color="neutral"
              variant="outline"
              @click="formOpen = false"
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
                <th class="p-3">Kondisi</th>
                <th class="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="contract in detail.contracts"
                :key="contract.id"
                class="border-t border-default"
              >
                <td class="p-3 font-medium text-highlighted">
                  Kontrak ke-{{ contract.contract_number }}
                </td>
                <td class="p-3">{{ contract.contract_type }}</td>
                <td class="p-3">
                  {{ formatDate(contract.start_date) }} - {{ formatDate(contract.end_date) }}
                </td>
                <td class="p-3">{{ contract.duration_label }}</td>
                <td class="p-3">{{ contract.status }}</td>
                <td class="p-3">{{ contract.description || '-' }}</td>
                <td class="p-3">
                  <UButton
                    v-if="contract.has_document"
                    size="xs"
                    variant="soft"
                    label="Lihat PDF"
                    :loading="loadingDocument && documentPreview.contractId === contract.id"
                    @click="previewDocument(contract)"
                  />
                  <span v-else>-</span>
                </td>
                <td class="p-3">
                  <UBadge
                    :label="stateLabel(contract.state)"
                    :color="stateColor(contract.state)"
                    variant="subtle"
                  />
                </td>
                <td class="p-3">
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="outline"
                    label="Edit"
                    @click="editContract(contract)"
                  />
                </td>
              </tr>
              <tr v-if="!detail.contracts.length">
                <td colspan="9" class="p-8 text-center text-muted">
                  Karyawan ini belum memiliki kontrak. Tambahkan kontrak pertamanya.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </UCard>

    <UCard v-if="detail && !loadingDetail" title="Riwayat Perubahan Kontrak">
      <template #header>
        <div>
          <h3 class="font-semibold text-highlighted">Riwayat Perubahan Kontrak</h3>
          <p class="mt-1 text-sm text-muted">
            Catatan perubahan kontrak {{ detail.employee.name }}, termasuk siapa yang mengubah dan
            kapan dilakukan.
          </p>
        </div>
      </template>

      <div v-if="flattenedAuditLogs.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-3">Tanggal</th>
              <th class="p-3">Jam</th>
              <th class="p-3">Diubah Oleh</th>
              <th class="p-3">Kontrak</th>
              <th class="p-3">Field</th>
              <th class="p-3">Sebelumnya</th>
              <th class="p-3">Menjadi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in flattenedAuditLogs" :key="log.id" class="border-t border-default">
              <td class="p-3 whitespace-nowrap">{{ log.date }}</td>
              <td class="p-3 whitespace-nowrap">{{ log.time }}</td>
              <td class="p-3 font-medium text-highlighted">{{ log.changed_by_name }}</td>
              <td class="p-3">{{ log.subject_label }}</td>
              <td class="p-3 font-medium text-highlighted">{{ log.label }}</td>
              <td class="p-3 text-muted">{{ auditValue(log.old) }}</td>
              <td class="p-3">{{ auditValue(log.new) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="py-8 text-center text-sm text-muted">
        Belum ada riwayat perubahan kontrak untuk karyawan ini.
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
