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
    text: 'Saat menambah kontrak baru, dokumen kontrak wajib diunggah dalam bentuk PDF maksimal 2 MB. HRD dapat melihat isi dokumen dari detail karyawan atau menu Kontrak Karyawan. Kontrak yang tanggal selesainya sudah lewat akan menjadi tidak aktif, dan status karyawan ikut tidak aktif bila tidak ada kontrak aktif lain.',
  },
  {
    title: 'Absensi',
    icon: 'i-lucide-calendar-clock',
    text: 'Pilih tanggal awal dan tanggal akhir untuk melihat data absensi. Jika karyawan hanya scan masuk atau hanya scan pulang, datanya tetap tampil tetapi ditandai belum lengkap. Pada dashboard karyawan, status hari ini menjadi Sedang Bekerja bila sudah scan masuk tetapi belum scan pulang.',
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
