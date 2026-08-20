<script setup>
import { reactive, ref } from 'vue'
import { registerPublicVisitor } from '../services/visitorService'
import { backendLogoUrl } from '../services/api'
import { apiError } from '../utils/formatters'

const submitting = ref(false)
const errorMessage = ref('')
const isSuccess = ref(false)
const successData = ref(null)

const form = reactive({
  nomor_identitas: '',
  nama_visitor: '',
  no_hp: '',
  instansi: '',
  tujuan_bertemu: '',
  keperluan: '',
})

async function handleSubmit() {
  errorMessage.value = ''
  submitting.value = true

  const payload = {
    nomor_identitas: form.nomor_identitas.trim().toUpperCase(),
    nama_visitor: form.nama_visitor.trim(),
    no_hp: form.no_hp.trim() || null,
    instansi: form.instansi.trim() || null,
    tujuan_bertemu: form.tujuan_bertemu.trim() || null,
    keperluan: form.keperluan.trim(),
  }

  try {
    const { data } = await registerPublicVisitor(payload)
    successData.value = data.data
    isSuccess.value = true
  } catch (err) {
    errorMessage.value = apiError(err, 'Gagal menyimpan data registrasi pengunjung. Silakan periksa isian Anda.')
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  form.nomor_identitas = ''
  form.nama_visitor = ''
  form.no_hp = ''
  form.instansi = ''
  form.tujuan_bertemu = ''
  form.keperluan = ''
  errorMessage.value = ''
  successData.value = null
  isSuccess.value = false
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-800 font-sans antialiased selection:bg-blue-600 selection:text-white flex flex-col items-center justify-center p-4 sm:p-6">
    <div class="w-full max-w-lg space-y-4 my-auto">
      <!-- Header Section -->
      <header class="flex flex-col items-center text-center">
        <img
          :src="backendLogoUrl"
          alt="Hompimplay Logo"
          class="h-12 w-auto object-contain mb-3"
        />
        <h1 class="text-xl font-bold text-slate-900 tracking-tight">
          Buku Tamu Digital (Visitor Pass)
        </h1>
        <p class="text-xs text-slate-500 mt-1 max-w-xs">
          Silakan isi data kunjungan Anda sebelum memasuki area gedung
        </p>
      </header>

      <!-- Main Content -->
      <main class="w-full">
        <!-- SUCCESS CONFIRMATION SCREEN -->
        <div
          v-if="isSuccess && successData"
        class="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/70 border border-slate-200/80 text-center animate-fade-in"
      >
        <!-- Success Badge -->
        <div class="inline-flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 mb-4">
          <svg class="size-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 class="text-lg font-bold text-slate-900 leading-snug">
          Registrasi Tamu Berhasil!
        </h2>

        <!-- Visit Ticket Card -->
        <div class="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-5 text-left space-y-3">
          <div class="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nomor Kunjungan</span>
            <span class="font-mono text-sm font-bold text-blue-600">{{ successData.nomor_kunjungan }}</span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p class="text-[11px] text-slate-400">Nama Tamu</p>
              <p class="font-semibold text-slate-800 truncate">{{ successData.nama_visitor }}</p>
            </div>
            <div>
              <p class="text-[11px] text-slate-400">No. Identitas</p>
              <p class="font-mono font-medium text-slate-800">{{ successData.nomor_identitas }}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs pt-1">
            <div>
              <p class="text-[11px] text-slate-400">Asal Instansi / PT</p>
              <p class="font-medium text-slate-700 truncate">{{ successData.instansi }}</p>
            </div>
            <div>
              <p class="text-[11px] text-slate-400">Bertemu Dengan</p>
              <p class="font-medium text-slate-700 truncate">{{ successData.tujuan_bertemu }}</p>
            </div>
          </div>

          <div class="text-xs pt-1 border-t border-slate-200/60">
            <p class="text-[11px] text-slate-400">Keperluan</p>
            <p class="font-medium text-slate-700 mt-0.5 leading-relaxed">{{ successData.keperluan }}</p>
          </div>

          <div class="text-right text-[10px] text-slate-400 pt-1">
            Waktu: {{ successData.waktu_masuk }}
          </div>
        </div>

        <!-- POS JAGA OFFICIAL INSTRUCTION ALERT -->
        <div class="mt-5 rounded-2xl bg-blue-50 border border-blue-200 p-4 text-left">
          <div class="flex items-start gap-3">
            <div class="mt-0.5 shrink-0 text-blue-600">
              <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p class="text-xs leading-relaxed text-blue-900 font-medium">
              Harap tunjukkan halaman ini ke <strong>pos jaga / security</strong> untuk mendapatkan kartu akses visitor dan menukarnya dengan kartu identitas Anda. Terima kasih.
            </p>
          </div>
        </div>

        <!-- Action Button -->
        <div class="mt-6">
          <button
            type="button"
            class="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            @click="resetForm"
          >
            Daftar Tamu Baru
          </button>
        </div>
      </div>

      <!-- VISITOR REGISTRATION FORM -->
      <div
        v-else
        class="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/70 border border-slate-200/80"
      >
        <!-- Error Alert -->
        <div
          v-if="errorMessage"
          class="mb-5 rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-medium text-red-700 leading-relaxed"
        >
          {{ errorMessage }}
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Nomor Identitas -->
          <div>
            <label for="nomorIdentitas" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nomor Identitas (KTP / SIM / Paspor) <span class="text-red-500">*</span>
            </label>
            <input
              id="nomorIdentitas"
              v-model="form.nomor_identitas"
              type="text"
              required
              autocomplete="off"
              placeholder="Contoh: 3201234567890001"
              class="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 tracking-wider placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition-all uppercase"
              @input="form.nomor_identitas = form.nomor_identitas.toUpperCase()"
            />
          </div>

          <!-- Nama Lengkap -->
          <div>
            <label for="namaVisitor" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Lengkap Pengunjung <span class="text-red-500">*</span>
            </label>
            <input
              id="namaVisitor"
              v-model="form.nama_visitor"
              type="text"
              required
              autocomplete="name"
              placeholder="Nama lengkap sesuai identitas"
              class="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
            />
          </div>

          <!-- No HP & Asal Instansi -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label for="noHp" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                No. HP / WhatsApp
              </label>
              <input
                id="noHp"
                v-model="form.no_hp"
                type="tel"
                placeholder="Contoh: 081234567890"
                class="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
              />
            </div>

            <div>
              <label for="instansi" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Asal Instansi / PT
              </label>
              <input
                id="instansi"
                v-model="form.instansi"
                type="text"
                placeholder="Contoh: PT Mitra Solusi"
                class="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
              />
            </div>
          </div>

          <!-- Bertemu dengan siapa -->
          <div>
            <label for="tujuanBertemu" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Bertemu dengan Siapa / Divisi
            </label>
            <input
              id="tujuanBertemu"
              v-model="form.tujuan_bertemu"
              type="text"
              placeholder="Contoh: Bpk. Fajar (IT Dept) / HRD"
              class="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
            />
          </div>

          <!-- Keperluan -->
          <div>
            <label for="keperluan" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Keperluan Kunjungan <span class="text-red-500">*</span>
            </label>
            <textarea
              id="keperluan"
              v-model="form.keperluan"
              rows="3"
              required
              placeholder="Jelaskan maksud dan keperluan kunjungan Anda..."
              class="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition-all resize-none"
            ></textarea>
          </div>

          <!-- Submit Button -->
          <div class="pt-2">
            <button
              type="submit"
              :disabled="submitting || !form.nomor_identitas.trim() || !form.nama_visitor.trim() || !form.keperluan.trim()"
              class="w-full rounded-2xl bg-blue-600 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-98 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
            >
              <span v-if="submitting">Menyimpan Registrasi...</span>
              <span v-else>Daftar Kunjungan</span>
            </button>
          </div>
        </form>
      </div>
    </main>

    <!-- Footer -->
    <footer class="pt-2 text-center text-xs text-slate-400">
      <p class="font-medium">HRIS Buku Tamu Digital • Build by IT DEPT</p>
      <p class="text-[11px] text-slate-400 mt-0.5">Hompim Play © 2026</p>
    </footer>
    </div>
  </div>
</template>
