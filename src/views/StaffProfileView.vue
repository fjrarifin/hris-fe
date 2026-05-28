<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import ProfileSection from '../components/ProfileSection.vue'
import {
  getStaffProfile,
  updateStaffProfileContact,
  updateStaffProfilePhoto,
} from '../services/staffService'
import { useAuthStore } from '../stores/auth'
import { apiError, formatDate } from '../utils/formatters'

const auth = useAuthStore()
const data = ref(null)
const loading = ref(true)
const errorMessage = ref('')
const message = ref('')
const photoLoadFailed = ref(false)
const selectedPhoto = ref(null)
const photoPreviewUrl = ref('')
const photoInput = ref(null)
const uploadingPhoto = ref(false)
const savingContact = ref(false)
const contactForm = reactive({
  email: '',
  no_hp: '',
})
const photoLocked = computed(() => data.value?.user?.can_change_photo === false)
const emailLocked = computed(() => data.value?.user?.can_change_email === false)
const phoneLocked = computed(() => data.value?.user?.can_change_phone === false)
const contactLocked = computed(() => emailLocked.value && phoneLocked.value)
const contactDirty = computed(
  () =>
    contactForm.email !== (data.value?.user?.email || data.value?.employee?.email || '') ||
    contactForm.no_hp !== (data.value?.employee?.no_hp || ''),
)
const tenureDays = computed(() => {
  const joinDate = data.value?.employee?.join_date

  if (!joinDate) return null

  const start = new Date(joinDate)
  const today = new Date()
  start.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)

  if (Number.isNaN(start.getTime()) || start > today) return null

  return Math.floor((today - start) / 86400000) + 1
})
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
  {
    label: 'Jabatan',
    value: data.value?.employee?.jabatan || data.value?.employee?.posisi,
  },
  {
    label: 'Departemen',
    value: data.value?.employee?.departement || data.value?.employee?.divisi,
  },
  { label: 'Unit', value: data.value?.employee?.unit },
  {
    label: 'Atasan Langsung',
    value: data.value?.employee?.nama_atasan_langsung,
  },
  {
    label: 'Atasan Tidak Langsung',
    value: data.value?.employee?.atasan_tidak_langsung,
  },
  {
    label: 'Tanggal Bergabung',
    value: formatDate(data.value?.employee?.join_date),
  },
])

const personalFields = computed(() => [
  {
    label: 'Email',
    value: data.value?.user?.email || data.value?.employee?.email,
    tooltip: emailLocked.value
      ? 'Email tidak bisa diganti kembali. Harap hubungi HRD.'
      : null,
  },
  {
    label: 'Nomor HP',
    value: data.value?.employee?.no_hp,
    tooltip: phoneLocked.value
      ? 'Nomor handphone tidak bisa diganti kembali. Harap hubungi HRD.'
      : null,
  },
  { label: 'Tempat Lahir', value: data.value?.employee?.tempat_lahir },
  {
    label: 'Tanggal Lahir',
    value: formatDate(data.value?.employee?.tanggal_lahir),
  },
  { label: 'Jenis Kelamin', value: genderLabel(data.value?.employee?.jenis_kelamin) },
  { label: 'Golongan Darah', value: data.value?.employee?.golongan_darah },
  { label: 'Alamat', value: data.value?.employee?.alamat },
  {
    label: 'Status Pernikahan',
    value: data.value?.employee?.status_pernikahan,
  },
  { label: 'Status Pajak', value: data.value?.employee?.status_pajak },
  { label: 'Agama', value: data.value?.employee?.agama },
  { label: 'Kewarganegaraan', value: data.value?.employee?.kewarganegaraan },
])

const employeeChildren = computed(() => {
  const employee = data.value?.employee
  const children = Array.isArray(employee?.children)
    ? employee.children
    : [employee?.nama_anak_1, employee?.nama_anak_2, employee?.nama_anak_3]

  return children.map((name) => String(name || '').trim()).filter(Boolean)
})

const familyAndEducationFields = computed(() => [
  {
    label: 'Pendidikan Terakhir',
    value: data.value?.employee?.pendidikan_terakhir,
  },
  {
    label: 'Institusi / Nama Sekolah',
    value: data.value?.employee?.nama_institusi,
  },
  { label: 'Jurusan', value: data.value?.employee?.jurusan },
  { label: 'Nama Pasangan', value: data.value?.employee?.nama_pasangan },
  { label: 'Jumlah Anak', value: employeeChildren.value.length || data.value?.employee?.jumlah_anak },
  ...employeeChildren.value.map((name, index) => ({
    label: `Nama Anak Ke-${index + 1}`,
    value: name,
  })),
  { label: 'Nama Ayah', value: data.value?.employee?.nama_ayah },
  { label: 'Nama Ibu', value: data.value?.employee?.nama_ibu },
  { label: 'Kontak Darurat', value: data.value?.employee?.kontak_darurat_nama },
  {
    label: 'Hubungan Kontak',
    value: data.value?.employee?.kontak_darurat_hubungan,
  },
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
    assignContactForm()
    photoLoadFailed.value = false
  } catch (error) {
    errorMessage.value = apiError(error, 'Profil tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

function assignContactForm() {
  contactForm.email = data.value?.user?.email || data.value?.employee?.email || ''
  contactForm.no_hp = data.value?.employee?.no_hp || ''
}

function clearPhotoSelection() {
  if (photoPreviewUrl.value) {
    URL.revokeObjectURL(photoPreviewUrl.value)
  }
  selectedPhoto.value = null
  photoPreviewUrl.value = ''
  if (photoInput.value) {
    photoInput.value.value = ''
  }
}

function choosePhoto(event) {
  if (photoLocked.value) return

  const file = event.target.files?.[0]
  errorMessage.value = ''
  message.value = ''
  clearPhotoSelection()

  if (!file) return

  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    errorMessage.value = 'Foto profil harus berformat PNG, JPG, atau JPEG.'
    return
  }

  if (file.size > 1024 * 1024) {
    errorMessage.value = 'Ukuran foto profil maksimal 1 MB.'
    return
  }

  selectedPhoto.value = file
  photoPreviewUrl.value = URL.createObjectURL(file)
}

async function submitPhoto() {
  if (!selectedPhoto.value) return

  uploadingPhoto.value = true
  errorMessage.value = ''
  message.value = ''
  const payload = new FormData()
  payload.append('photo', selectedPhoto.value)

  try {
    const response = await updateStaffProfilePhoto(payload)
    Object.assign(data.value.user, {
      photo_url: response.data.photo_url,
      photo_changed_at: response.data.photo_changed_at,
      photo_change_available_at: response.data.photo_change_available_at,
      can_change_photo: response.data.can_change_photo,
    })
    auth.updatePhoto(response.data.photo_url)
    photoLoadFailed.value = false
    message.value = response.data.message
    clearPhotoSelection()
  } catch (error) {
    errorMessage.value = apiError(error, 'Foto profil tidak dapat diperbarui.')
  } finally {
    uploadingPhoto.value = false
  }
}

async function submitContact() {
  if (!contactDirty.value || contactLocked.value) return

  savingContact.value = true
  errorMessage.value = ''
  message.value = ''

  try {
    const payload = {}

    if (!emailLocked.value && contactForm.email !== (data.value?.user?.email || '')) {
      payload.email = contactForm.email
    }

    if (!phoneLocked.value && contactForm.no_hp !== (data.value?.employee?.no_hp || '')) {
      payload.no_hp = contactForm.no_hp
    }

    const response = await updateStaffProfileContact(payload)
    Object.assign(data.value.user, response.data.user)
    Object.assign(data.value.employee, response.data.employee)

    if (auth.user && response.data.user?.email) {
      auth.user = { ...auth.user, email: response.data.user.email }
    }

    assignContactForm()
    message.value = response.data.message
  } catch (error) {
    errorMessage.value = apiError(error, 'Kontak tidak dapat diperbarui.')
  } finally {
    savingContact.value = false
  }
}

function handlePhotoError() {
  photoLoadFailed.value = true

  if (!photoPreviewUrl.value) {
    errorMessage.value =
      'Data foto sudah tercatat, tetapi file foto tidak dapat ditampilkan. Silakan hubungi HR atau IT.'
  }
}

function shown(value) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  return String(value).toUpperCase()
}

function genderLabel(value) {
  return (
    {
      L: 'Laki-laki',
      P: 'Perempuan',
    }[value] || value
  )
}

onMounted(loadProfile)
onBeforeUnmount(clearPhotoSelection)
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Profil Karyawan</h2>
      <p class="mt-1 text-sm text-muted">Informasi personal yang tercatat pada HRIS.</p>
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />
    <div v-if="loading" class="py-12 text-center text-sm text-muted">Memuat profil...</div>

    <template v-if="!loading && data">
      <UCard>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:items-center">
          <!-- Kiri: info profil -->
          <div class="flex items-center gap-4">
            <img
              v-if="photoPreviewUrl || (data.user.photo_url && !photoLoadFailed)"
              :src="photoPreviewUrl || data.user.photo_url"
              :alt="data.employee.nama_karyawan"
              class="size-20 rounded-full object-cover shrink-0"
              @error="handlePhotoError"
            />
            <UAvatar v-else :text="profileInitials" size="2xl" color="primary" class="shrink-0" />
            <div>
              <h3 class="text-xl font-semibold text-highlighted">
                {{ shown(data.employee.nama_karyawan) }}
              </h3>
              <p class="mt-1 text-sm text-muted">
                {{ shown(data.employee.jabatan || data.employee.posisi) }} -
                {{ shown(data.employee.departement || data.employee.divisi) }}
              </p>
              <UBadge class="mt-3" color="primary" variant="subtle" :label="data.employee.nik" />
            </div>
          </div>

          <form
            v-if="!photoLocked"
            class="rounded-xl border border-default bg-elevated p-4 text-sm h-full"
            @submit.prevent="submitPhoto"
          >
            <p class="font-medium text-highlighted">Perbarui Foto Profil</p>
            <p class="mt-2 text-muted">Foto formal, wajah jelas, menghadap depan. Maks 1 MB.</p>
            <p class="mt-2 text-xs text-muted">
              Foto profil hanya dapat diganti 1 kali dalam jangka waktu 30 hari.
            </p>
            <input
              ref="photoInput"
              type="file"
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              class="mt-4 block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-white"
              :disabled="photoLocked || uploadingPhoto"
              @change="choosePhoto"
            />
            <p v-if="selectedPhoto" class="mt-2 truncate text-xs text-muted">
              Preview: {{ selectedPhoto.name }}
            </p>
            <div class="mt-4 flex gap-2">
              <UButton
                type="submit"
                label="Simpan Foto"
                icon="i-lucide-upload"
                :disabled="photoLocked || !selectedPhoto"
                :loading="uploadingPhoto"
              />
              <UButton
                v-if="selectedPhoto"
                type="button"
                label="Batal"
                color="neutral"
                variant="outline"
                @click="clearPhotoSelection"
              />
            </div>
          </form>
          <div
            v-else
            class="rounded-xl border border-default bg-elevated p-4 text-sm h-full"
          >
            <p class="font-medium text-highlighted">Masa Bakti</p>
            <p class="mt-2 text-2xl font-semibold text-highlighted">
              {{ tenureDays === null ? '-' : tenureDays.toLocaleString('id-ID') }}
              <span class="text-sm font-medium text-muted">hari</span>
            </p>
            <p class="mt-2 text-sm text-muted">
              Bergabung sejak {{ formatDate(data.employee.join_date) }}.
            </p>
          </div>
        </div>
      </UCard>

      <UCard v-if="!contactLocked" title="Ubah Kontak Pribadi">
        <form class="space-y-4" @submit.prevent="submitContact">
          <div>
            <p class="text-sm text-muted">
              Email dan nomor telepon dapat diubah sendiri maksimal 1 kali. Perubahan berikutnya
              dibantu oleh HRD.
            </p>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="text-sm text-muted">
              Email
              <input
                v-model="contactForm.email"
                type="email"
                class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="emailLocked || savingContact"
              />
              <span v-if="emailLocked" class="mt-1 block text-xs text-warning">
                Email sudah pernah diubah. Hubungi HRD untuk perubahan berikutnya.
              </span>
            </label>
            <label class="text-sm text-muted">
              Nomor Telepon
              <input
                v-model="contactForm.no_hp"
                type="text"
                class="mt-2 w-full rounded-lg border border-default bg-default p-2.5 text-highlighted disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="phoneLocked || savingContact"
              />
              <span v-if="phoneLocked" class="mt-1 block text-xs text-warning">
                Nomor telepon sudah pernah diubah. Hubungi HRD untuk perubahan berikutnya.
              </span>
            </label>
          </div>

          <div class="flex gap-2">
            <UButton
              type="submit"
              label="Simpan Kontak"
              icon="i-lucide-save"
              :loading="savingContact"
              :disabled="contactLocked || !contactDirty"
            />
            <UButton
              type="button"
              label="Batal"
              color="neutral"
              variant="outline"
              :disabled="savingContact || !contactDirty"
              @click="assignContactForm"
            />
          </div>
        </form>
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
