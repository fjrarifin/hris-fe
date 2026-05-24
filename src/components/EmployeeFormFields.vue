<script setup>
const props = defineProps({
  form: { type: Object, required: true },
  creating: Boolean,
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

const workFields = [
  { key: 'nama_karyawan', label: 'Nama Karyawan', required: true },
  { key: 'jabatan', label: 'Jabatan' },
  { key: 'departement', label: 'Departemen' },
  { key: 'unit', label: 'Unit' },
  { key: 'nama_atasan_langsung', label: 'Atasan Langsung' },
  { key: 'atasan_tidak_langsung', label: 'Atasan Tidak Langsung' },
  { key: 'status_kontrak', label: 'Status Kontrak' },
  { key: 'join_date', label: 'Tanggal Bergabung', type: 'date' },
  { key: 'start_date', label: 'Tanggal Mulai Kontrak', type: 'date' },
  { key: 'durasi_kontrak', label: 'Durasi Kontrak', type: 'number' },
  { key: 'end_date', label: 'Tanggal Selesai Kontrak', type: 'date' },
  { key: 'total_masa_kerja', label: 'Total Masa Kerja' },
]

const personalFields = [
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'no_hp', label: 'Nomor HP' },
  { key: 'no_ktp', label: 'No. KTP' },
  { key: 'tempat_lahir', label: 'Tempat Lahir' },
  { key: 'tanggal_lahir', label: 'Tanggal Lahir', type: 'date' },
  { key: 'status_pernikahan', label: 'Status Pernikahan' },
  { key: 'agama', label: 'Agama' },
  { key: 'kewarganegaraan', label: 'Kewarganegaraan' },
]

const familyFields = [
  { key: 'pendidikan_terakhir', label: 'Pendidikan Terakhir' },
  { key: 'nama_institusi', label: 'Institusi' },
  { key: 'jurusan', label: 'Jurusan' },
  { key: 'nama_pasangan', label: 'Nama Pasangan' },
  { key: 'jumlah_anak', label: 'Jumlah Anak', type: 'number' },
  { key: 'nama_ayah', label: 'Nama Ayah' },
  { key: 'nama_ibu', label: 'Nama Ibu' },
  { key: 'kontak_darurat_nama', label: 'Kontak Darurat' },
  { key: 'kontak_darurat_hubungan', label: 'Hubungan Kontak' },
  { key: 'kontak_darurat_no_hp', label: 'Nomor Darurat' },
]

const paymentFields = [
  { key: 'account_name', label: 'Nama Rekening' },
  { key: 'bank', label: 'Bank' },
  { key: 'no_rekening', label: 'Nomor Rekening' },
  { key: 'no_npwp', label: 'Nomor NPWP' },
  { key: 'no_bpjs', label: 'Nomor BPJS' },
]

const inputClass =
  'mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-sm text-highlighted disabled:cursor-not-allowed disabled:bg-elevated disabled:text-muted'
</script>

<template>
  <div class="grid gap-5 xl:grid-cols-2">
    <UCard>
      <template #header
        ><h3 class="font-semibold text-highlighted">Informasi Pekerjaan</h3></template
      >
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
        <label v-for="field in workFields.slice(2)" :key="field.key" class="text-sm text-muted">
          {{ field.label }}
          <input v-model="props.form[field.key]" :type="field.type || 'text'" :class="inputClass" />
        </label>
      </div>
    </UCard>

    <UCard>
      <template #header
        ><h3 class="font-semibold text-highlighted">Informasi Pribadi dan Kontak</h3></template
      >
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
        <label class="text-sm text-muted sm:col-span-2">
          Alamat
          <textarea v-model="props.form.alamat" rows="3" :class="inputClass"></textarea>
        </label>
      </div>
    </UCard>

    <UCard>
      <template #header
        ><h3 class="font-semibold text-highlighted">Keluarga dan Pendidikan</h3></template
      >
      <div class="grid gap-4 sm:grid-cols-2">
        <label v-for="field in familyFields" :key="field.key" class="text-sm text-muted">
          {{ field.label }}
          <input v-model="props.form[field.key]" :type="field.type || 'text'" :class="inputClass" />
        </label>
      </div>
    </UCard>

    <UCard>
      <template #header
        ><h3 class="font-semibold text-highlighted">Rekening dan Kepesertaan</h3></template
      >
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
