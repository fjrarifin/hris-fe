<script setup>
import { computed, onMounted, ref } from 'vue'
import ProfileSection from '../components/ProfileSection.vue'
import { getStaffProfile } from '../services/staffService'
import { apiError, formatDate } from '../utils/formatters'

const data = ref(null)
const loading = ref(true)
const errorMessage = ref('')
const photoLoadFailed = ref(false)
const profileInitials = computed(() => {
  const name = data.value?.employee?.nama_karyawan || data.value?.user?.name || 'User'

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
})

const workFields = computed(() => [
  { label: 'NIK', value: data.value?.employee?.nik },
  { label: 'Nama', value: data.value?.employee?.nama_karyawan },
  { label: 'Jabatan', value: data.value?.employee?.jabatan || data.value?.employee?.posisi },
  { label: 'Departemen', value: data.value?.employee?.departement || data.value?.employee?.divisi },
  { label: 'Unit', value: data.value?.employee?.unit },
  { label: 'Atasan Langsung', value: data.value?.employee?.nama_atasan_langsung },
  { label: 'Atasan Tidak Langsung', value: data.value?.employee?.atasan_tidak_langsung },
  { label: 'Status Kontrak', value: data.value?.employee?.status_kontrak },
  { label: 'Tanggal Bergabung', value: formatDate(data.value?.employee?.join_date) },
  { label: 'Tanggal Mulai Kontrak', value: formatDate(data.value?.employee?.start_date) },
  { label: 'Tanggal Selesai Kontrak', value: formatDate(data.value?.employee?.end_date) },
])

const personalFields = computed(() => [
  { label: 'Email', value: data.value?.user?.email || data.value?.employee?.email },
  { label: 'Nomor HP', value: data.value?.employee?.no_hp },
  { label: 'Tempat Lahir', value: data.value?.employee?.tempat_lahir },
  { label: 'Tanggal Lahir', value: formatDate(data.value?.employee?.tanggal_lahir) },
  { label: 'Jenis Kelamin', value: data.value?.employee?.jenis_kelamin },
  { label: 'Alamat', value: data.value?.employee?.alamat },
  { label: 'Status Pernikahan', value: data.value?.employee?.status_pernikahan },
  { label: 'Agama', value: data.value?.employee?.agama },
  { label: 'Kewarganegaraan', value: data.value?.employee?.kewarganegaraan },
])

const familyAndEducationFields = computed(() => [
  { label: 'Pendidikan Terakhir', value: data.value?.employee?.pendidikan_terakhir },
  { label: 'Institusi', value: data.value?.employee?.nama_institusi },
  { label: 'Jurusan', value: data.value?.employee?.jurusan },
  { label: 'Nama Pasangan', value: data.value?.employee?.nama_pasangan },
  { label: 'Jumlah Anak', value: data.value?.employee?.jumlah_anak },
  { label: 'Nama Ayah', value: data.value?.employee?.nama_ayah },
  { label: 'Nama Ibu', value: data.value?.employee?.nama_ibu },
  { label: 'Kontak Darurat', value: data.value?.employee?.kontak_darurat_nama },
  { label: 'Hubungan Kontak', value: data.value?.employee?.kontak_darurat_hubungan },
  { label: 'Nomor Darurat', value: data.value?.employee?.kontak_darurat_no_hp },
])

const payrollFields = computed(() => [
  { label: 'Nama Rekening', value: data.value?.employee?.account_name },
  { label: 'Bank', value: data.value?.employee?.bank },
  { label: 'Nomor Rekening', value: data.value?.employee?.no_rekening },
  {
    label: 'NPWP',
    value: data.value?.employee?.no_npwp || (data.value?.employee?.npwp ? 'Terdaftar' : '-'),
  },
  {
    label: 'BPJS',
    value: data.value?.employee?.no_bpjs || (data.value?.employee?.bpjs ? 'Terdaftar' : '-'),
  },
])

async function loadProfile() {
  try {
    const response = await getStaffProfile()
    data.value = response.data
    photoLoadFailed.value = false
  } catch (error) {
    errorMessage.value = apiError(error, 'Profil tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

function shown(value) {
  return value === null || value === undefined || value === '' ? '-' : value
}

onMounted(loadProfile)
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Profil Karyawan</h2>
      <p class="mt-1 text-sm text-muted">Informasi personal yang tercatat pada HRIS.</p>
    </div>

    <UAlert v-if="errorMessage" color="error" variant="subtle" :description="errorMessage" />
    <div v-else-if="loading" class="py-12 text-center text-sm text-muted">Memuat profil...</div>

    <template v-else-if="data">
      <UCard>
        <div class="flex flex-col items-center gap-5 sm:flex-row">
          <img
            v-if="data.user.photo_url && !photoLoadFailed"
            :src="data.user.photo_url"
            :alt="data.employee.nama_karyawan"
            class="size-28 rounded-full object-cover"
            @error="photoLoadFailed = true"
          />
          <UAvatar v-else :text="profileInitials" size="3xl" color="primary" />
          <div class="text-center sm:text-left">
            <h3 class="text-xl font-semibold text-highlighted">
              {{ data.employee.nama_karyawan }}
            </h3>
            <p class="mt-1 text-sm text-muted">
              {{ shown(data.employee.jabatan || data.employee.posisi) }} -
              {{ shown(data.employee.departement || data.employee.divisi) }}
            </p>
            <UBadge class="mt-3" color="primary" variant="subtle" :label="data.employee.nik" />
          </div>
        </div>
      </UCard>

      <div class="grid gap-5 xl:grid-cols-2">
        <ProfileSection title="Informasi Pekerjaan" :fields="workFields" />
        <ProfileSection title="Informasi Pribadi dan Kontak" :fields="personalFields" />
        <ProfileSection title="Keluarga dan Pendidikan" :fields="familyAndEducationFields" />
        <ProfileSection title="Rekening dan Kepesertaan" :fields="payrollFields" />
      </div>
    </template>
  </section>
</template>
