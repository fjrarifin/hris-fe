<script setup>
const guides = [
  {
    title: 'Data Karyawan',
    icon: 'i-lucide-users-round',
    text: 'Gunakan menu Karyawan untuk menambah, mengekspor, serta memperbarui profil lengkap. NIK dan PIN absensi dikunci setelah karyawan dibuat.',
  },
  {
    title: 'Absensi',
    icon: 'i-lucide-calendar-clock',
    text: 'Pilih rentang tanggal maksimal 60 hari. Satu scan masuk atau keluar tetap terhitung sebagai satu kehadiran dan ditandai sebagai scan belum lengkap.',
  },
  {
    title: 'Jadwal Karyawan',
    icon: 'i-lucide-calendar-range',
    text: 'Pilih periode, buka departemen, kemudian atur shift harian per karyawan atau upload file jadwal untuk departemen tersebut.',
  },
  {
    title: 'Pengajuan',
    icon: 'i-lucide-clipboard-check',
    text: 'Submenu Cuti, Lembur, PH, dan Izin / Sakit memuat antrean final HRD. Setujui atau tolak setelah dokumen dan periode diverifikasi.',
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
