<script setup>
const payrollSummary = [
  { title: 'Total Payroll', value: 'Rp 842.500.000', status: 'Draft', color: 'warning' },
  { title: 'Karyawan Diproses', value: '125', status: 'Lengkap', color: 'success' },
  { title: 'Jadwal Transfer', value: '28 Mei 2026', status: 'Terjadwal', color: 'primary' },
]
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h2 class="text-2xl font-semibold text-highlighted">Payroll</h2>
        <p class="mt-1 text-sm text-muted">Ringkasan pembayaran gaji periode Mei 2026.</p>
      </div>
      <UButton label="Proses Payroll" />
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <UCard v-for="summary in payrollSummary" :key="summary.title">
        <p class="text-sm text-muted">{{ summary.title }}</p>
        <p class="mt-3 text-2xl font-semibold text-highlighted">{{ summary.value }}</p>
        <UBadge class="mt-4" :color="summary.color" variant="subtle" :label="summary.status" />
      </UCard>
    </div>

    <UAlert
      color="info"
      variant="subtle"
      title="Payroll siap divalidasi"
      description="Periksa komponen tunjangan dan potongan sebelum proses transfer dijalankan."
    />
  </section>
</template>
