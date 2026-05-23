<script setup>
const sections = [
  {
    title: 'Pengajuan Cuti',
    note: 'Maksimal 5 hari per pengajuan.',
    steps: [
      'Buka menu Pengajuan Cuti dan isi jenis, periode, serta alasan.',
      'Sistem memeriksa bentrok dengan cuti atau Public Holiday yang sudah diajukan.',
      'Atasan langsung menyetujui atau menolak pengajuan.',
      'Pengajuan yang disetujui atasan diteruskan ke HR untuk finalisasi.',
    ],
  },
  {
    title: 'Public Holiday',
    note: 'Claim berlaku maksimal 90 hari setelah tanggal PH.',
    steps: [
      'Pilih Public Holiday yang masih tersedia dan tentukan tanggal pengambilan.',
      'Tanggal claim tidak boleh lampau, berbenturan dengan cuti, atau melebihi masa berlaku.',
      'Atasan langsung memproses pengajuan PH.',
      'HR memvalidasi pengajuan setelah approval atasan.',
    ],
  },
  {
    title: 'Izin / Sakit',
    note: 'Surat sakit wajib diunggah untuk jenis Sakit.',
    steps: [
      'Pilih Izin atau Sakit dan isi tanggal pengajuan.',
      'Untuk Izin, tuliskan alasan; untuk Sakit, unggah dokumen pendukung.',
      'Atasan memeriksa pengajuan sebelum diteruskan untuk proses HR.',
    ],
  },
]
</script>

<template>
  <section class="space-y-6">
    <UCard>
      <h2 class="text-2xl font-semibold text-highlighted">Panduan Aplikasi Karyawan</h2>
      <p class="mt-2 text-sm text-muted">
        Acuan singkat alur pengajuan, approval atasan, dan pengecekan status akhir.
      </p>
    </UCard>

    <div class="grid gap-5 lg:grid-cols-3">
      <UCard v-for="section in sections" :key="section.title">
        <h3 class="text-lg font-semibold text-highlighted">{{ section.title }}</h3>
        <UBadge class="mt-3" color="primary" variant="subtle" :label="section.note" />
        <ol class="mt-5 space-y-4">
          <li
            v-for="(step, index) in section.steps"
            :key="step"
            class="flex gap-3 text-sm text-muted"
          >
            <span
              class="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary"
              >{{ index + 1 }}</span
            >
            <span>{{ step }}</span>
          </li>
        </ol>
      </UCard>
    </div>

    <UCard title="Untuk Atasan">
      <p class="text-sm text-muted">
        Menu Approval Pengajuan dan Pengajuan Lembur hanya tampil bila Anda memiliki bawahan
        langsung pada data master karyawan. Dari menu approval, Anda dapat memproses cuti, PH, serta
        izin/sakit bawahan.
      </p>
    </UCard>

    <UCard title="Profil Karyawan">
      <p class="text-sm text-muted">
        Profil dapat dibuka dari tombol pada dashboard. Pastikan informasi pribadi, kontak,
        rekening, dan foto yang tercatat sudah sesuai.
      </p>
      <UButton to="/staff/profile" label="Buka Profil Saya" class="mt-4" />
    </UCard>
  </section>
</template>
