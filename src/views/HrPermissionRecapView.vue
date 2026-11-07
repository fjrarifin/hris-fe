<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { exportHrPermissionRecap, getHrPermissionRecap, getHrPermissionDocument } from '../services/hrService'
import { apiError, formatDate, statusColor } from '../utils/formatters'
const filters = reactive({ search: '', department: '', start_date: '', end_date: '', type: 'all', status: 'all' })
const records = ref([])
const departments = ref([])
const summary = ref({})
const loading = ref(false)
const exporting = ref(false)
const errorMessage = ref('')
const page = ref(1)
const visibleRecords = computed(() => records.value.slice((page.value - 1) * 20, page.value * 20))
const statuses = { all: 'Semua', waiting_manager: 'Menunggu Atasan', waiting_hr: 'Menunggu HRD', approved: 'Disetujui', rejected: 'Ditolak', cancelled: 'Dibatalkan' }
async function loadData() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await getHrPermissionRecap({ ...filters })
    records.value = data.records
    departments.value = data.department_options
    summary.value = data.summary
    page.value = 1
  } catch (error) {
    errorMessage.value = apiError(error, 'Rekap izin dan sakit tidak dapat dimuat.')
  } finally { loading.value = false }
}
function resetFilters() {
  Object.assign(filters, { search: '', department: '', start_date: '', end_date: '', type: 'all', status: 'all' })
  loadData()
}
async function exportData() {
  exporting.value = true
  errorMessage.value = ''
  try {
    const { data } = await exportHrPermissionRecap({ ...filters })
    const url = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = 'Rekap_Izin_Sakit.xlsx'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) {
    errorMessage.value = apiError(error, 'Rekap tidak dapat diekspor.')
  } finally { exporting.value = false }
}
const documentLoading = ref(null)
async function openDocument(item) {
  documentLoading.value = item.id
  errorMessage.value = ''
  const preview = window.open('about:blank', '_blank')
  if (preview) preview.opener = null
  try {
    const { data } = await getHrPermissionDocument(item.id)
    const url = URL.createObjectURL(data)
    if (preview) {
      preview.location.replace(url)
    } else {
      const link = document.createElement('a')
      link.href = url
      link.download = `Surat_${item.type}_${item.employee_nik}_${item.id}`
      document.body.appendChild(link)
      link.click()
      link.remove()
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  } catch (error) {
    preview?.close()
    errorMessage.value = apiError(error, 'Surat tidak ditemukan atau tidak dapat dibuka.')
  } finally { documentLoading.value = null }
}
onMounted(loadData)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-2xl font-semibold text-highlighted">Rekap Izin / Sakit Karyawan</h2>
      <UButton label="Ekspor Excel" :loading="exporting" @click="exportData" />
    </div>
    <p v-if="errorMessage" role="alert" class="text-sm text-error">{{ errorMessage }}</p>
    <UCard title="Filter Laporan">
      <form class="grid gap-4 md:grid-cols-3" @submit.prevent="loadData">
        <label>Nama / NIK<input v-model="filters.search" maxlength="100" class="mt-1 w-full rounded border border-default bg-default p-2" /></label>
        <label>Departemen<select v-model="filters.department" class="mt-1 w-full rounded border border-default bg-default p-2"><option value="">Semua</option><option v-for="d in departments" :key="d">{{ d }}</option></select></label>
        <label>Jenis<select v-model="filters.type" class="mt-1 w-full rounded border border-default bg-default p-2"><option value="all">Semua</option><option value="izin">Izin</option><option value="sakit">Sakit</option></select></label>
        <label>Tanggal Mulai<input v-model="filters.start_date" type="date" class="mt-1 w-full rounded border border-default bg-default p-2" /></label>
        <label>Tanggal Selesai<input v-model="filters.end_date" type="date" :min="filters.start_date || undefined" class="mt-1 w-full rounded border border-default bg-default p-2" /></label>
        <label>Status<select v-model="filters.status" class="mt-1 w-full rounded border border-default bg-default p-2"><option v-for="(label, key) in statuses" :key="key" :value="key">{{ label }}</option></select></label>
        <div class="flex gap-2"><UButton type="submit" label="Tampilkan" :loading="loading" /><UButton label="Reset" variant="outline" @click="resetFilters" /></div>
      </form>
    </UCard>
    <div class="grid gap-4 md:grid-cols-4">
      <UCard v-for="(label, key) in { total_records: 'Total Pengajuan', total_employees: 'Total Karyawan', permission_days: 'Hari Izin', sick_days: 'Hari Sakit' }" :key="key">{{ label }}<strong class="block text-2xl">{{ summary[key] || 0 }}</strong></UCard>
    </div>
    <p class="text-sm text-muted">Jumlah hari adalah hari kalender dalam periode filter sesuai status pilihan, bukan perhitungan potongan gaji.</p>
    <UCard>
      <p v-if="loading" class="py-6 text-center">Memuat laporan...</p>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead><tr><th v-for="h in ['Karyawan', 'Departemen', 'Jenis', 'Periode', 'Hari', 'Alasan', 'Dokumen', 'Status']" :key="h" class="p-3">{{ h }}</th></tr></thead>
          <tbody>
            <tr v-for="item in visibleRecords" :key="item.id" class="border-t border-default">
              <td class="p-3">{{ item.employee_name }}<span class="block text-muted">{{ item.employee_nik }}</span></td>
              <td class="p-3">{{ item.department }}</td><td class="p-3">{{ item.type === 'sakit' ? 'Sakit' : 'Izin' }}</td>
              <td class="p-3 whitespace-nowrap">{{ formatDate(item.start_date) }} – {{ formatDate(item.end_date) }}</td>
              <td class="p-3">{{ item.days }}</td><td class="p-3">{{ item.reason || '-' }}</td><td class="p-3"><UButton v-if="item.has_document" label="Lihat Surat" size="xs" variant="outline" :loading="documentLoading === item.id" :disabled="documentLoading !== null" @click="openDocument(item)" /><span v-else>Tidak ada</span></td>
              <td class="p-3"><UBadge :color="statusColor(item.status)" :label="item.status_label" variant="subtle" /><p v-if="item.reject_reason" class="text-xs text-error">{{ item.reject_reason }}</p></td>
            </tr>
            <tr v-if="!records.length"><td colspan="8" class="p-6 text-center">Tidak ada pengajuan sesuai filter.</td></tr>
          </tbody>
        </table>
      </div>
      <UPagination v-model:page="page" :total="records.length" :items-per-page="20" class="mt-4" />
    </UCard>
  </div>
</template>
