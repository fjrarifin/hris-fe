<script setup>
const sections = [
  {
    title: 'Pengajuan Cuti',
    icon: 'i-lucide-calendar-minus-2',
    note: 'Maksimal 5 hari per pengajuan.',
    steps: [
      'Buka menu Pengajuan Cuti dan isi jenis, periode, serta alasan.',
      'Pastikan tanggal yang dipilih tidak bentrok dengan cuti atau PH yang sudah diajukan.',
      'Atasan langsung menyetujui atau menolak pengajuan.',
      'Pengajuan yang disetujui atasan akan dilanjutkan ke HRD.',
      'Jika Anda tetap masuk kerja pada tanggal cuti yang sudah disetujui, cuti tersebut dapat dibatalkan dan jatah cuti kembali tersedia.',
    ],
  },
  {
    title: 'Public Holiday',
    icon: 'i-lucide-calendar-check-2',
    note: 'PH dapat digunakan maksimal 90 hari setelah tanggal libur.',
    steps: [
      'Pilih Public Holiday (PH) yang masih tersedia, lalu tentukan tanggal pengambilan yang diinginkan.',
      'Pengajuan PH tidak dapat diajukan untuk tanggal yang sudah terlewat, bentrok dengan jadwal cuti, maupun melewati masa berlaku PH.',
      'Pengajuan PH akan diproses terlebih dahulu oleh atasan langsung.',
      'Setelah mendapatkan persetujuan atasan, pengajuan akan diverifikasi oleh HRD.',
      'Apabila Anda tetap masuk kerja pada tanggal PH yang telah disetujui, maka pengajuan PH dapat dibatalkan dan hak PH akan dikembalikan untuk digunakan kembali.',
    ],
  },
  {
    title: 'Izin / Sakit',
    icon: 'i-lucide-file-heart',
    note: 'Surat sakit wajib diunggah untuk jenis Sakit.',
    steps: [
      'Pilih Izin atau Sakit dan isi tanggal pengajuan.',
      'Untuk Izin, tuliskan alasan; untuk Sakit, unggah dokumen pendukung.',
      'Atasan memeriksa pengajuan sebelum diteruskan ke HRD.',
    ],
  },
  {
    title: 'Absensi Saya',
    icon: 'i-lucide-fingerprint',
    note: 'Periksa scan masuk dan pulang secara berkala.',
    steps: [
      'Buka menu Absensi Saya, lalu tentukan tanggal mulai dan tanggal selesai bila ingin melihat periode tertentu.',
      'Jam masuk berasal dari scan pertama dan jam pulang berasal dari scan terakhir pada tanggal tersebut.',
      'Periksa kartu Hari Tercatat, Scan Lengkap, dan Belum Lengkap serta tabel riwayat harian.',
      'Pada dashboard, status hari ini menjadi Sedang Bekerja bila Anda sudah scan masuk tetapi belum scan pulang.',
      'Untuk hari sebelumnya, scan yang tidak lengkap tampil sebagai Hadir tanpa scan masuk atau Hadir tanpa scan pulang.',
      'Jika ada data absensi yang belum lengkap, segera laporkan kepada HRD untuk pengecekan.',
    ],
  },
  {
    title: 'Pengajuan Lembur',
    icon: 'i-lucide-clock-arrow-up',
    note: 'Khusus atasan yang memiliki bawahan langsung.',
    steps: [
      'Menu Pengajuan Lembur muncul apabila Anda terdaftar sebagai atasan langsung.',
      'Pilih satu atau beberapa bawahan, lalu isi tanggal, jam mulai, jam selesai, dan alasan lembur.',
      'Durasi lembur yang dapat diajukan adalah 1 sampai 4 jam dan tidak boleh bertabrakan dengan pengajuan yang sudah ada.',
      'Kirim pengajuan ke HRD dan pantau statusnya pada riwayat; pengajuan yang belum diproses dapat dibatalkan.',
    ],
  },
  {
    title: 'Jadwal Tim',
    icon: 'i-lucide-calendar-range',
    note: 'Khusus karyawan pada level Supervisor.',
    steps: [
      'Menu Jadwal Tim hanya tampil bagi Supervisor dan menampilkan bawahan yang menjadi tanggung jawabnya.',
      'Pilih periode jadwal terlebih dahulu dengan rentang maksimal 46 hari, lalu pilih Atur Jadwal untuk mengedit jadwal satu karyawan.',
      'Pilih kode shift untuk tiap tanggal dan simpan perubahan; jadwal karyawan di luar tim Anda tidak dapat diubah.',
      'Untuk pengisian banyak jadwal sekaligus, gunakan template yang tersedia di halaman tersebut.',
      'Baca keterangan kode shift di halaman jadwal agar pilihan pagi, siang, libur, cuti, dan PH tidak tertukar.',
    ],
  },
  {
    title: 'Dashboard Karyawan',
    icon: 'i-lucide-layout-dashboard',
    note: 'Ringkasan status pribadi dan tim.',
    steps: [
      'Kartu Kehadiran Minggu Ini menampilkan status harian, jam masuk, jam keluar, dan durasi kerja.',
      'Jika Anda memiliki bawahan, dashboard menampilkan Bawahan Langsung dan Persetujuan Bawahan.',
      'Gunakan tombol Lihat Profil Saya untuk melihat data pekerjaan, keluarga, rekening, dan kontak darurat.',
      'Ikon di kanan bawah menampilkan rekan kerja yang sedang aktif membuka aplikasi.',
    ],
  },
  {
    title: 'Data Keluarga Dinamis',
    icon: 'i-lucide-baby',
    note: 'Jumlah anak mengikuti data HRD.',
    steps: [
      'Data anak pada profil dapat berisi lebih dari 3 nama bila datanya sudah diisi oleh HRD.',
      'Jumlah anak dihitung dari daftar nama anak yang diisi pada data karyawan.',
      'Jika ada perubahan data keluarga, hubungi HRD untuk memperbarui profil.',
    ],
  },
  {
    title: 'Sesi Login',
    icon: 'i-lucide-timer-reset',
    note: 'Berakhir otomatis bila terlalu lama tidak digunakan.',
    steps: [
      'Jika aplikasi dibiarkan tanpa aktivitas selama 30 menit, Anda perlu login ulang.',
      'Satu akun tetap tidak bisa digunakan bersamaan di beberapa perangkat.',
      'Gunakan logout dari tombol akun di sidebar saat selesai memakai aplikasi.',
    ],
  },
  {
    title: 'Mengganti Foto Profil',
    icon: 'i-lucide-image-up',
    note: 'Maksimal 1 kali dalam 30 hari.',
    steps: [
      'Buka menu akun di kiri bawah, pilih Profil Saya, kemudian gunakan bagian Perbarui Foto Profil.',
      'Pilih foto formal seorang diri, wajah terlihat jelas menghadap depan, dalam format PNG, JPG, atau JPEG.',
      'Ukuran file maksimal 1 MB. Periksa preview foto sebelum menekan Simpan Foto.',
      'Setelah berhasil disimpan, foto baru tampil pada profil dan tombol akun sidebar.',
    ],
  },
  {
    title: 'Mengganti Password',
    icon: 'i-lucide-key-round',
    note: 'Maksimal 1 kali dalam 30 hari.',
    steps: [
      'Buka menu akun di kiri bawah lalu pilih Ubah Password.',
      'Masukkan password saat ini, password baru minimal 8 karakter, dan konfirmasi password baru.',
      'Simpan password; bila masa pembatasan masih berlaku, halaman menampilkan tanggal perubahan berikutnya.',
      'Jika Anda diwajibkan mengganti password awal, buat password baru sebelum memakai menu HRIS lainnya.',
    ],
  },
  {
    title: 'Lupa Password',
    icon: 'i-lucide-shield-question-mark',
    note: 'OTP WhatsApp berlaku 2 menit.',
    steps: [
      'Pada halaman login, pilih Lupa password? dan masukkan NIK Anda.',
      'Kode OTP 6 digit dikirim ke nomor telepon yang terdaftar di HRIS; masukkan kode sebelum waktu habis.',
      'Buat password baru minimal 8 karakter yang memiliki huruf dan angka, lalu login kembali.',
      'Setelah password berhasil diganti, gunakan password baru untuk login kembali.',
    ],
  },
]
</script>

<template>
  <section class="space-y-6">
    <UCard>
      <h2 class="text-2xl font-semibold text-highlighted">Panduan Aplikasi Karyawan</h2>
      <p class="mt-2 text-sm text-muted">
        Acuan penggunaan pengajuan, absensi, profil, dan keamanan akun pada portal karyawan.
      </p>
    </UCard>

    <div class="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
      <UCard v-for="section in sections" :key="section.title">
        <div class="flex items-center gap-3">
          <UIcon :name="section.icon" class="size-5 shrink-0 text-primary" />
          <h3 class="text-lg font-semibold text-highlighted">{{ section.title }}</h3>
        </div>
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
        Menu Persetujuan Pengajuan dan Pengajuan Lembur hanya tampil bila Anda memiliki bawahan.
        Dari menu persetujuan, Anda dapat memproses cuti, PH, izin, dan sakit bawahan. Pengajuan
        lembur dibuat oleh atasan untuk bawahan dan dilanjutkan ke HRD. Menu Jadwal Tim hanya
        tampil untuk Supervisor.
      </p>
    </UCard>

    <UCard title="Profil Karyawan">
      <p class="text-sm text-muted">
        Profil dapat dibuka dari tombol pada dashboard. Pastikan informasi pribadi, kontak,
        rekening, dan foto yang tercatat sudah sesuai. Data selain foto diperbarui melalui HRD.
      </p>
      <UButton to="/staff/profile" label="Buka Profil Saya" class="mt-4" />
    </UCard>
  </section>
</template>
