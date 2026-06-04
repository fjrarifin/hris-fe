<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Payroll</h2>
      <p class="mt-1 text-sm text-muted">
        Modul payroll sedang dimigrasikan ke HRIS secara bertahap.
      </p>
    </div>

    <UAlert
      color="info"
      variant="subtle"
      title="Tahap master data aktif"
      description="Lengkapi gaji pokok dan dasar BPJS karyawan, lalu gunakan proses payroll untuk memeriksa absensi dan membuat draft."
    />

    <div class="grid gap-4 lg:grid-cols-2">
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-wallet-cards" class="size-5 text-primary" />
            <h3 class="font-semibold text-highlighted">Master Payroll Karyawan</h3>
          </div>
        </template>
        <p class="text-sm text-muted">
          Kelola gaji pokok, tunjangan tetap, dasar BPJS, dasar JP, dan rate JKK.
        </p>
        <UButton
          class="mt-5"
          to="/payroll/master"
          label="Buka Master Payroll"
          icon="i-lucide-arrow-right"
        />
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-calculator" class="size-5 text-muted" />
            <h3 class="font-semibold text-highlighted">Proses Payroll</h3>
          </div>
        </template>
        <p class="text-sm text-muted">
          Periksa kesiapan absensi, generate draft payroll, review komponen, approval, lock, dan kirim slip.
        </p>
        <UButton
          class="mt-5"
          to="/payroll/process"
          label="Generate / Proses Payroll"
          icon="i-lucide-calculator"
        />
      </UCard>
    </div>
  </section>
</template>
