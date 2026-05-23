<script setup>
const attendance = [
  { title: 'Hadir', value: '98', color: 'success' },
  { title: 'Terlambat', value: '6', color: 'warning' },
  { title: 'Cuti', value: '7', color: 'primary' },
  { title: 'Belum Check-in', value: '14', color: 'neutral' },
]
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Absensi</h2>
      <p class="mt-1 text-sm text-muted">Status kehadiran karyawan hari ini.</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <UCard v-for="item in attendance" :key="item.title">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm text-muted">{{ item.title }}</p>
            <p class="mt-2 text-3xl font-semibold text-highlighted">{{ item.value }}</p>
          </div>
          <UBadge :color="item.color" variant="subtle" label="Hari ini" />
        </div>
      </UCard>
    </div>

    <UCard title="Rekap Absensi" description="Sinkronisasi terakhir pada 08.15 WIB.">
      <UAlert
        color="success"
        variant="subtle"
        title="Data sudah tersinkronisasi"
        description="Rekap absensi siap digunakan untuk proses payroll."
      />
    </UCard>
  </section>
</template>
