<script setup>
import { countries } from '../utils/countries'

const props = defineProps({
  form: { type: Object, required: true },
  creating: Boolean,
  supervisorOptions: { type: Array, default: () => [] },
  loadingOptions: Boolean,
})

const positionLevels = ['Sr.', 'Md.', 'Jr.']
const positionTitles = [
  'Operator',
  'Staff',
  'Leader',
  'Supervisor',
  'Asst. Manager',
  'Manager',
  'GM',
]
const divisions = ['Business Partner', 'Commercial Business']
const departments = [
  'GM',
  'Marketing',
  'Sales',
  'Finance',
  'HRBP',
  'Activity',
  'General Affair',
  'Hompim Store',
]
const contractTypes = ['PKWT', 'PKWTT']
const contractStatuses = [
  { value: 'AKTIF', label: 'AKTIF' },
  { value: 'NONAKTIF', label: 'TIDAK AKTIF' },
]
const taxStatuses = [
  'TK/0',
  'TK/1',
  'TK/2',
  'TK/3',
  'K/0',
  'K/1',
  'K/2',
  'K/3',
  'K/I/0',
  'K/I/1',
  'K/I/2',
  'K/I/3',
]
const religions = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha']
const educationLevels = ['SD', 'SMP', 'SMA / SMK', 'D1', 'D2', 'D3', 'D4', 'S1', 'S2', 'S3']

const workFields = [
  { key: 'nama_karyawan', label: 'Nama Karyawan', required: true },
  { key: 'jabatan', label: 'Jabatan', required: true },
  { key: 'unit', label: 'Unit' },
]

const personalFields = [
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'no_hp', label: 'Nomor HP' },
  { key: 'no_ktp', label: 'No. KTP' },
  { key: 'tempat_lahir', label: 'Tempat Lahir' },
  { key: 'tanggal_lahir', label: 'Tanggal Lahir', type: 'date' },
]

const familyFields = [
  { key: 'nama_institusi', label: 'Institusi / Nama Sekolah' },
  { key: 'jurusan', label: 'Jurusan' },
  { key: 'nama_pasangan', label: 'Nama Pasangan' },
  { key: 'jumlah_anak', label: 'Jumlah Anak', type: 'number' },
  { key: 'nama_anak_1', label: 'Nama Anak Ke-1' },
  { key: 'nama_anak_2', label: 'Nama Anak Ke-2' },
  { key: 'nama_anak_3', label: 'Nama Anak Ke-3' },
  { key: 'nama_ayah', label: 'Nama Ayah' },
  { key: 'nama_ibu', label: 'Nama Ibu' },
  { key: 'kontak_darurat_nama', label: 'Nama Kontak Darurat' },
  { key: 'kontak_darurat_hubungan', label: 'Hubungan Kontak' },
  { key: 'kontak_darurat_no_hp', label: 'Nomor Darurat' },
]

const paymentFields = [
  { key: 'bank', label: 'Bank' },
  { key: 'no_rekening', label: 'Nomor Rekening' },
  { key: 'no_npwp', label: 'Nomor NPWP' },
  { key: 'no_bpjs', label: 'Nomor BPJS' },
]

const inputClass =
  'mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted disabled:cursor-not-allowed disabled:bg-elevated disabled:text-muted'

function maritalStatusLabel() {
  if (!props.form.status_pajak) {
    return props.form.status_pernikahan || '-'
  }

  return props.form.status_pajak.startsWith('K/') ? 'Menikah' : 'Tidak Kawin'
}

function employeeStatusLabel() {
  if (props.creating && props.form.status_kontrak === 'AKTIF') {
    return 'AKTIF setelah kontrak disimpan'
  }

  return props.form.status_karyawan === 'AKTIF' ? 'AKTIF' : 'TIDAK AKTIF'
}

function selectContractDocument(event) {
  props.form.document = event.target.files[0] || null
}
</script>

<template>
  <div class="grid gap-5 xl:grid-cols-2">
    <UCard>
      <template #header>
        <h3 class="font-semibold text-highlighted">Informasi Pekerjaan</h3>
      </template>
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="text-sm text-muted">
          NIK
          <input
            v-model="props.form.nik"
            :disabled="!props.creating"
            :class="inputClass"
            required
          />
        </label>
        <label class="text-sm text-muted">
          PIN Absensi
          <input v-model="props.form.pin" :disabled="!props.creating" :class="inputClass" />
        </label>
        <label v-for="field in workFields.slice(0, 2)" :key="field.key" class="text-sm text-muted">
          {{ field.label }}
          <input
            v-model="props.form[field.key]"
            :type="field.type || 'text'"
            :required="field.required"
            :class="inputClass"
          />
        </label>
        <label class="text-sm text-muted">
          Level Posisi
          <select v-model="props.form.posisi_level" :class="inputClass">
            <option value="">Pilih level</option>
            <option v-for="option in positionLevels" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </label>
        <label class="text-sm text-muted">
          Titel Posisi
          <select v-model="props.form.posisi_title" :class="inputClass">
            <option value="">Pilih posisi</option>
            <option v-for="option in positionTitles" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </label>
        <label class="text-sm text-muted">
          Divisi
          <select v-model="props.form.divisi" :class="inputClass">
            <option value="">Pilih divisi</option>
            <option v-for="option in divisions" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
        <label class="text-sm text-muted">
          Departemen
          <select v-model="props.form.departement" :class="inputClass">
            <option value="">Pilih departemen</option>
            <option v-for="department in departments" :key="department" :value="department">
              {{ department }}
            </option>
          </select>
        </label>
        <label v-for="field in workFields.slice(2)" :key="field.key" class="text-sm text-muted">
          {{ field.label }}
          <input v-model="props.form[field.key]" :class="inputClass" />
        </label>
        <label class="text-sm text-muted">
          Atasan Langsung
          <input
            v-model="props.form.nama_atasan_langsung"
            list="supervisor-options-direct"
            :disabled="props.loadingOptions"
            placeholder="Cari nama atau NIK karyawan..."
            :class="inputClass"
          />
        </label>
        <label class="text-sm text-muted">
          Atasan Tidak Langsung
          <input
            v-model="props.form.atasan_tidak_langsung"
            list="supervisor-options-indirect"
            :disabled="props.loadingOptions"
            placeholder="Cari nama atau NIK karyawan..."
            :class="inputClass"
          />
        </label>
        <datalist id="supervisor-options-direct">
          <option
            v-for="employee in props.supervisorOptions"
            :key="employee.nik"
            :value="employee.name"
            :label="`${employee.nik} - ${employee.position || '-'}`"
          />
        </datalist>
        <datalist id="supervisor-options-indirect">
          <option
            v-for="employee in props.supervisorOptions"
            :key="employee.nik"
            :value="employee.name"
            :label="`${employee.nik} - ${employee.position || '-'}`"
          />
        </datalist>
        <label class="text-sm text-muted">
          Status Karyawan
          <input :value="employeeStatusLabel()" disabled :class="inputClass" />
          <span class="mt-1 block text-xs text-muted">Mengikuti kontrak aktif karyawan.</span>
        </label>
        <label class="text-sm text-muted">
          Tanggal Bergabung
          <input v-model="props.form.join_date" type="date" :class="inputClass" />
        </label>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h3 class="font-semibold text-highlighted">Informasi Pribadi dan Kontak</h3>
      </template>
      <div class="grid gap-4 sm:grid-cols-2">
        <label v-for="field in personalFields" :key="field.key" class="text-sm text-muted">
          {{ field.label }}
          <input v-model="props.form[field.key]" :type="field.type || 'text'" :class="inputClass" />
        </label>
        <label class="text-sm text-muted">
          Jenis Kelamin
          <select v-model="props.form.jenis_kelamin" :class="inputClass">
            <option value="">Pilih jenis kelamin</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </label>
        <label class="text-sm text-muted">
          Golongan Darah
          <select v-model="props.form.golongan_darah" :class="inputClass">
            <option value="">Pilih golongan darah</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="AB">AB</option>
            <option value="O">O</option>
          </select>
        </label>
        <label class="text-sm text-muted">
          Status Pajak
          <select v-model="props.form.status_pajak" :class="inputClass">
            <option value="">Pilih status pajak</option>
            <option v-for="status in taxStatuses" :key="status" :value="status">
              {{ status }}
            </option>
          </select>
        </label>
        <label class="text-sm text-muted">
          Status Pernikahan
          <input :value="maritalStatusLabel()" disabled :class="inputClass" />
          <span class="mt-1 block text-xs text-muted">Otomatis dari status pajak.</span>
        </label>
        <label class="text-sm text-muted">
          Agama
          <select v-model="props.form.agama" :class="inputClass">
            <option value="">Pilih agama</option>
            <option v-for="religion in religions" :key="religion" :value="religion">
              {{ religion }}
            </option>
          </select>
        </label>
        <label class="text-sm text-muted">
          Kewarganegaraan
          <input
            v-model="props.form.kewarganegaraan"
            list="country-options"
            placeholder="Cari negara..."
            :class="inputClass"
          />
          <datalist id="country-options">
            <option v-for="country in countries" :key="country" :value="country" />
          </datalist>
        </label>
        <label class="text-sm text-muted sm:col-span-2">
          Alamat
          <textarea v-model="props.form.alamat" rows="3" :class="inputClass"></textarea>
        </label>
      </div>
    </UCard>

    <UCard v-if="props.creating" class="xl:col-span-2">
      <template #header>
        <div>
          <h3 class="font-semibold text-highlighted">Kontrak Pertama</h3>
          <p class="mt-1 text-sm text-muted">
            Isi kontrak awal karyawan. Setelah data tersimpan, riwayat kontrak dikelola dari detail
            karyawan atau menu Kontrak Karyawan.
          </p>
        </div>
      </template>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label class="text-sm text-muted">
          Jenis Kontrak
          <select v-model="props.form.jenis_kontrak" :class="inputClass">
            <option value="">Pilih jenis</option>
            <option v-for="type in contractTypes" :key="type" :value="type">{{ type }}</option>
          </select>
        </label>
        <label class="text-sm text-muted">
          Status Kontrak
          <select v-model="props.form.status_kontrak" :class="inputClass">
            <option value="">Pilih status</option>
            <option v-for="status in contractStatuses" :key="status.value" :value="status.value">
              {{ status.label }}
            </option>
          </select>
        </label>
        <label class="text-sm text-muted">
          Tanggal Mulai Kontrak
          <input v-model="props.form.start_date" type="date" :class="inputClass" />
        </label>
        <label class="text-sm text-muted">
          Tanggal Selesai Kontrak
          <input v-model="props.form.end_date" type="date" :class="inputClass" />
        </label>
        <label class="text-sm text-muted sm:col-span-2 lg:col-span-4">
          Keterangan Kontrak
          <textarea v-model="props.form.keterangan_kontrak" rows="2" :class="inputClass"></textarea>
        </label>
        <label class="text-sm text-muted sm:col-span-2 lg:col-span-4">
          Dokumen Kontrak (PDF, maksimal 2 MB)
          <input
            type="file"
            accept=".pdf,application/pdf"
            required
            :class="inputClass"
            @change="selectContractDocument"
          />
        </label>
        <p class="text-xs text-muted sm:col-span-2 lg:col-span-4">
          Durasi dihitung otomatis dari tanggal mulai dan tanggal selesai.
        </p>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h3 class="font-semibold text-highlighted">Keluarga dan Pendidikan</h3>
      </template>
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="text-sm text-muted">
          Pendidikan Terakhir
          <select v-model="props.form.pendidikan_terakhir" :class="inputClass">
            <option value="">Pilih pendidikan</option>
            <option v-for="level in educationLevels" :key="level" :value="level">
              {{ level }}
            </option>
          </select>
        </label>
        <label v-for="field in familyFields" :key="field.key" class="text-sm text-muted">
          {{ field.label }}
          <input v-model="props.form[field.key]" :type="field.type || 'text'" :class="inputClass" />
        </label>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h3 class="font-semibold text-highlighted">Rekening dan Kepesertaan</h3>
      </template>
      <div class="grid gap-4 sm:grid-cols-2">
        <label v-for="field in paymentFields" :key="field.key" class="text-sm text-muted">
          {{ field.label }}
          <input v-model="props.form[field.key]" :class="inputClass" />
        </label>
        <label class="flex items-center gap-3 text-sm text-highlighted">
          <input v-model="props.form.npwp" type="checkbox" />
          Terdaftar NPWP
        </label>
        <label class="flex items-center gap-3 text-sm text-highlighted">
          <input v-model="props.form.bpjs" type="checkbox" />
          Terdaftar BPJS
        </label>
      </div>
    </UCard>
  </div>
</template>
