<script setup>
const guides = [
  {
    title: 'Data Karyawan',
    icon: 'i-lucide-users-round',
    text: 'Gunakan menu Karyawan untuk menambah, mengekspor, dan memperbarui data karyawan. NIK dan PIN absensi tidak bisa diubah setelah data dibuat. HRD dapat mengisi golongan darah dan menambah daftar anak sesuai kebutuhan; jumlah anak akan mengikuti daftar yang diisi.',
  },
  {
    title: 'Kontrak Karyawan',
    icon: 'i-lucide-file-signature',
    text: 'Saat menambah kontrak baru, dokumen kontrak boleh diunggah dalam bentuk PDF maksimal 2 MB, tetapi tidak wajib. HRD dapat melihat isi dokumen dari detail karyawan atau menu Kontrak Karyawan bila dokumen tersedia. Kontrak yang tanggal selesainya sudah lewat akan menjadi tidak aktif, dan status karyawan ikut tidak aktif bila tidak ada kontrak aktif lain.',
  },
  {
    title: 'Absensi',
    icon: 'i-lucide-calendar-clock',
    text: 'Pilih tanggal awal dan tanggal akhir untuk melihat data absensi. Jika karyawan hanya scan masuk atau hanya scan pulang, datanya tetap tampil tetapi ditandai belum lengkap. Pada dashboard karyawan, status hari ini menjadi Sedang Bekerja bila sudah scan masuk tetapi belum scan pulang.',
  },
  {
    title: 'Monitoring Minimum Absensi',
    icon: 'i-lucide-chart-no-axes-combined',
    text: 'Gunakan menu Monitoring Minimum Absensi untuk mengecek karyawan yang belum memenuhi target hari hadir dan durasi kerja pada periode tertentu. HRD dapat memfilter departemen atau karyawan, melihat selisih hari dan durasi, mengekspor rekap, serta mengirim notifikasi individual atau massal kepada karyawan yang masih kurang target.',
  },
  {
    title: 'Jadwal Karyawan',
    icon: 'i-lucide-calendar-range',
    text: 'Gunakan pilihan tanggal, departemen, dan karyawan untuk mencari jadwal. HRD dapat membuka detail karyawan dan mengubah jadwal yang sudah dibuat oleh atasan. Untuk mengisi banyak jadwal sekaligus, gunakan template yang tersedia. Keterangan kode shift juga tersedia di halaman tersebut.',
  },
  {
    title: 'Pengajuan',
    icon: 'i-lucide-clipboard-check',
    text: 'Menu Cuti, Lembur, PH, dan Izin / Sakit berisi pengajuan yang perlu diproses HRD. Pengajuan dari level manager langsung masuk ke HRD. Jika cuti atau PH sudah disetujui tetapi karyawan tetap masuk pada tanggal tersebut, pengajuan dapat dibatalkan dan jatahnya dikembalikan.',
  },
  {
    title: 'Dashboard HRD',
    icon: 'i-lucide-layout-dashboard',
    text: 'Dashboard utama menampilkan ringkasan karyawan aktif, kontrak akan habis, hadir hari ini, PH, cuti, izin, dan sakit. Daftar PH, cuti, izin, sakit, dan hadir per departemen bisa dibuka untuk melihat nama karyawan. Dashboard Internal HRD berisi pemantauan atasan operasional, kebutuhan minimum, dan absensi belum lengkap.',
  },
  {
    title: 'Koreksi Absensi dan Pengingat',
    icon: 'i-lucide-message-circle-warning',
    text: 'HRD dapat memakai menu Koreksi Absensi untuk memperbaiki data yang sudah dikonfirmasi. Aplikasi juga mengirim pengingat absensi belum lengkap ke grup, karyawan, dan atasan sesuai jadwal yang berlaku.',
  },
  {
    title: 'Payroll: Master dan Generate Draft',
    icon: 'i-lucide-calculator',
    text: 'Buka Payroll > Master Payroll untuk melengkapi gaji pokok, tunjangan tetap, dasar BPJS, dasar JP, dan rate JKK. Setelah itu buka Payroll > Proses Payroll, pilih periode, lalu klik Preview Payroll. Periksa master yang belum lengkap dan blocker absensi. Draft boleh dibuat untuk review, tetapi belum dapat disubmit sebelum seluruh blocker absensi selesai.',
  },
  {
    title: 'Payroll: Review, Approval, dan Slip',
    icon: 'i-lucide-wallet-cards',
    text: 'Pada daftar draft payroll, klik Review untuk memeriksa nilai dan mengubah adjustment manual seperti PPh21, kasbon, bonus, atau koreksi gaji. Pendapatan menambah NET, potongan karyawan mengurangi NET, sedangkan kontribusi perusahaan hanya menambah biaya perusahaan dan tidak mengubah NET. Setelah absensi lengkap, klik Submit, lanjutkan Approve, lalu Kirim Slip. Tombol kirim slip hanya tersedia setelah payroll disetujui.',
  },
  {
    title: 'Talent: Mengisi Jobdesk',
    icon: 'i-lucide-list-checks',
    text: 'Buka menu Talent > Jobdesk. Tambahkan jobdesk dengan memilih jabatan, kategori, tipe tugas, status aktif, dan deskripsi yang jelas. Dokumen PDF pendukung boleh diunggah bila tersedia, tetapi tidak wajib. Pada daftar jobdesk, gunakan pencarian lalu buka detail jabatan untuk melihat, memperbarui, menghapus, atau meninjau PDF seluruh jobdesk jabatan tersebut. Jobdesk aktif otomatis dapat dilihat oleh karyawan dengan jabatan yang sesuai.',
  },
  {
    title: 'Talent: Mengisi Template KPI',
    icon: 'i-lucide-target',
    text: 'Buka menu Talent > Template KPI. Tambahkan KPI sebagai draft dengan memilih jabatan, jobdesk terkait bila ada, nama KPI, deskripsi, target, satuan, bobot, dan formula penilaian. Pada daftar KPI per jabatan, klik Kelola KPI, centang KPI yang akan dipakai, lalu klik Aktifkan Pilihan. Total bobot KPI aktif untuk satu jabatan harus tepat 100%. KPI aktif dapat dilihat secara read-only oleh karyawan terkait dan menjadi snapshot saat review dibuat.',
  },
  {
    title: 'Talent: Periode dan Performance Review',
    icon: 'i-lucide-chart-no-axes-combined',
    text: 'Buka Talent > Periode Review untuk membuat periode dan ubah statusnya menjadi active sebelum generate review. Setelah itu buka Talent > Performance Review, pilih periode aktif dan karyawan, lalu tentukan reviewer bila atasan tidak terdeteksi otomatis. Sistem mengambil snapshot jabatan dan KPI aktif. Atasan mengisi realisasi serta skor pada menu Performance Review, mengirim hasil ke HRD, lalu HRD menyetujui atau menolak review.',
  },
  {
    title: 'Pengguna Online dan Notifikasi',
    icon: 'i-lucide-users',
    text: 'Ikon kanan bawah menampilkan pengguna yang sedang aktif membuka aplikasi, lengkap dengan foto, nama, jabatan, dan kota. Pesan berhasil, gagal, peringatan, atau isian wajib akan muncul sebagai notifikasi di pojok kanan atas.',
  },
  {
    title: 'Keamanan Sesi',
    icon: 'i-lucide-shield-check',
    text: 'Jika aplikasi dibiarkan tanpa aktivitas selama 30 menit, pengguna perlu login ulang. Satu akun tetap tidak bisa digunakan bersamaan di beberapa perangkat.',
  },
]
</script>

<template>
  <section class="space-y-6">
    <UCard>
      <h2 class="text-2xl font-semibold text-highlighted">Panduan Aplikasi HRD</h2>
      <p class="mt-2 text-sm text-muted">Ringkasan penggunaan modul operasional pada portal HRD.</p>
    </UCard>
    <div class="grid gap-5 lg:grid-cols-2">
      <UCard v-for="guide in guides" :key="guide.title">
        <div class="flex items-center gap-3">
          <UIcon :name="guide.icon" class="size-5 text-primary" />
          <h3 class="font-semibold text-highlighted">{{ guide.title }}</h3>
        </div>
        <p class="mt-4 text-sm leading-6 text-muted">{{ guide.text }}</p>
      </UCard>
    </div>
  </section>
</template>
