<script setup>
import { countries } from '../utils/countries'

const props = defineProps({
  form: { type: Object, required: true },
  creating: Boolean,
  supervisorOptions: { type: Array, default: () => [] },
  contracts: { type: Array, default: () => [] },
  activeContractId: { type: [Number, String], default: null },
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
const employeeStatuses = [
  { value: 'AKTIF', label: 'Aktif' },
  { value: 'RESIGN', label: 'Resign' },
]
const contractStatuses = ['AKTIF', 'SELESAI', 'DIPERPANJANG']
const maritalStatuses = ['Single', 'Menikah', 'Cerai']
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

function dateLabel(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
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
          <select v-model="props.form.status_karyawan" :class="inputClass">
            <option value="">Pilih status</option>
            <option v-for="status in employeeStatuses" :key="status.value" :value="status.value">
              {{ status.label }}
            </option>
          </select>
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
          Status Pernikahan
          <select v-model="props.form.status_pernikahan" :class="inputClass">
            <option value="">Pilih status</option>
            <option v-for="status in maritalStatuses" :key="status" :value="status">
              {{ status }}
            </option>
          </select>
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

    <UCard class="xl:col-span-2">
      <template #header>
        <div>
          <h3 class="font-semibold text-highlighted">Kontrak Karyawan</h3>
          <p class="mt-1 text-sm text-muted">
            Data kontrak disimpan terpisah dari profil karyawan dan membentuk riwayat kontrak.
          </p>
        </div>
      </template>
      <div class="grid gap-5 lg:grid-cols-2">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="text-sm text-muted">
            Tanggal Bergabung
            <input v-model="props.form.join_date" type="date" :class="inputClass" />
          </label>
          <label class="text-sm text-muted">
            Status Kontrak
            <select v-model="props.form.status_kontrak" :class="inputClass">
              <option value="">Pilih status</option>
              <option v-for="status in contractStatuses" :key="status" :value="status">
                {{ status }}
              </option>
            </select>
          </label>
          <label class="text-sm text-muted">
            Tanggal Mulai Kontrak
            <input v-model="props.form.start_date" type="date" :class="inputClass" />
          </label>
          <label class="text-sm text-muted">
            Durasi Kontrak (bulan)
            <input v-model="props.form.durasi_kontrak" type="number" min="0" :class="inputClass" />
          </label>
          <label class="text-sm text-muted sm:col-span-2">
            Tanggal Selesai Kontrak
            <input v-model="props.form.end_date" type="date" :class="inputClass" />
          </label>
        </div>
        <div v-if="!props.creating">
          <p class="mb-3 text-sm font-medium text-highlighted">Riwayat Kontrak</p>
          <div class="max-h-72 space-y-3 overflow-y-auto">
            <div
              v-for="contract in props.contracts"
              :key="contract.id"
              class="rounded-lg border border-default p-3 text-sm"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="font-medium text-highlighted">
                  Kontrak ke-{{ contract.contract_number }}
                </p>
                <UBadge
                  :color="
                    String(contract.id) === String(props.activeContractId) ? 'success' : 'neutral'
                  "
                  variant="subtle"
                  :label="
                    String(contract.id) === String(props.activeContractId)
                      ? 'Aktif'
                      : contract.status
                  "
                />
              </div>
              <p class="mt-2 text-muted">
                {{ dateLabel(contract.start_date) }} - {{ dateLabel(contract.end_date) }}
              </p>
              <p class="mt-1 text-muted">{{ contract.duration_months || '-' }} bulan</p>
            </div>
            <p v-if="!props.contracts.length" class="py-3 text-sm text-muted">
              Belum ada riwayat kontrak.
            </p>
          </div>
        </div>
        <p v-else class="rounded-lg bg-elevated p-4 text-sm text-muted">
          Kontrak pertama akan menjadi awal riwayat setelah data karyawan disimpan.
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
