<template>
  <div class="space-y-6 pb-12">
    <!-- Header Page -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-highlighted">
          Sisa Jatah Cuti, PH & Extra Off
        </h1>
        <p class="text-sm text-muted mt-1">
          Monitoring dan rekapitulasi sisa saldo cuti tahunan, public holiday, dan extra off seluruh karyawan
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="outline"
          class="cursor-pointer font-semibold"
          :loading="loading"
          @click="fetchData"
        >
          <template #leading>
            <UIcon name="i-lucide-refresh-cw" class="size-4" />
          </template>
          Refresh Data
        </UButton>
        <UButton
          color="primary"
          class="cursor-pointer font-semibold"
          :loading="exporting"
          @click="exportCsv"
        >
          <template #leading>
            <UIcon name="i-lucide-download" class="size-4" />
          </template>
          Export CSV / Excel
        </UButton>
      </div>
    </div>

    <!-- KPI Summary Cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-muted">Total Karyawan</p>
            <h3 class="mt-2 text-2xl font-bold text-highlighted">{{ totalEmployeesCount }}</h3>
          </div>
          <div class="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <UIcon name="i-lucide-users" class="size-6" />
          </div>
        </div>
      </UCard>

      <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-muted">Sisa Cuti Tahunan</p>
            <h3 class="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{{ totalLeaveRemaining }} Hari</h3>
          </div>
          <div class="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <UIcon name="i-lucide-calendar-check" class="size-6" />
          </div>
        </div>
      </UCard>

      <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-muted">Sisa Public Holiday</p>
            <h3 class="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">{{ totalPhRemaining }} Hari</h3>
          </div>
          <div class="flex size-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <UIcon name="i-lucide-sparkles" class="size-6" />
          </div>
        </div>
      </UCard>

      <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-muted">Sisa Extra Off</p>
            <h3 class="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{{ totalEoRemaining }} Hari</h3>
          </div>
          <div class="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <UIcon name="i-lucide-clock-3" class="size-6" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Filters Section Card -->
    <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Search Input -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
            Cari Karyawan / NIK
          </label>
          <UInput
            v-model="filters.search"
            placeholder="Ketik nama, NIK, atau jabatan..."
            icon="i-lucide-search"
            class="w-full"
            @update:model-value="debounceFetch"
          />
        </div>

        <!-- Filter Departemen -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
            Departemen
          </label>
          <select
            v-model="filters.departement"
            class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            @change="fetchData"
          >
            <option value="">Semua Departemen</option>
            <option v-for="dept in departments" :key="dept" :value="dept">
              {{ dept }}
            </option>
          </select>
        </div>

        <!-- Filter Divisi -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
            Divisi
          </label>
          <select
            v-model="filters.divisi"
            class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            @change="fetchData"
          >
            <option value="">Semua Divisi</option>
            <option v-for="div in divisions" :key="div" :value="div">
              {{ div }}
            </option>
          </select>
        </div>

        <!-- Filter Sisa Jatah -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
            Filter Status Saldo
          </label>
          <select
            v-model="filters.balance_filter"
            class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            @change="fetchData"
          >
            <option value="">Semua Karyawan</option>
            <option value="has_leave">Punya Sisa Cuti Tahunan (>0)</option>
            <option value="has_ph">Punya Sisa Public Holiday (>0)</option>
            <option value="has_eo">Punya Sisa Extra Off (>0)</option>
            <option value="leave_empty">Cuti Tahunan Habis (0)</option>
          </select>
        </div>
      </div>
    </UCard>

    <!-- Table Section Card -->
    <UCard class="border border-default bg-[var(--ui-bg,#ffffff)] shadow-xs overflow-hidden">
      <!-- Search Filter Summary Bar -->
      <div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-default">
        <div class="text-sm font-semibold text-highlighted flex items-center gap-2">
          <UIcon name="i-lucide-list" class="size-4 text-primary" />
          Daftar Rekap Saldo Karyawan
        </div>

        <div class="text-xs text-muted">
          Total: <span class="font-semibold text-highlighted">{{ employees.length }} karyawan</span>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="py-16 text-center text-muted">
        <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-primary mx-auto mb-2" />
        Memuat data saldo cuti & libur karyawan...
      </div>

      <!-- Data Table -->
      <div v-else-if="employees.length" class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-default bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted">
            <tr>
              <th class="px-4 py-3.5">Karyawan</th>
              <th class="px-4 py-3.5">Departemen & Divisi</th>
              <th class="px-4 py-3.5">Tgl Bergabung</th>
              <th class="px-4 py-3.5 text-center">Sisa Cuti Tahunan</th>
              <th class="px-4 py-3.5 text-center">Sisa Public Holiday (PH)</th>
              <th class="px-4 py-3.5 text-center">Sisa Extra Off (EO)</th>
              <th class="px-4 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="emp in paginatedEmployees"
              :key="emp.nik"
              class="hover:bg-muted/30 transition-colors"
            >
              <!-- Karyawan Info -->
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-3">
                  <div
                    class="size-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white shadow-xs"
                    :class="getAvatarBg(emp.nama_karyawan)"
                  >
                    {{ getInitials(emp.nama_karyawan) }}
                  </div>
                  <div class="min-w-0">
                    <span class="font-semibold text-highlighted block truncate">
                      {{ emp.nama_karyawan }}
                    </span>
                    <div class="flex items-center gap-1.5 text-xs text-muted mt-0.5">
                      <span class="font-mono">{{ emp.nik }}</span>
                      <span>•</span>
                      <span class="capitalize">{{ emp.jabatan }}</span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Departemen & Divisi -->
              <td class="px-4 py-3.5">
                <span class="font-medium text-highlighted block">{{ emp.departement || '-' }}</span>
                <span class="text-xs text-muted">{{ emp.divisi || '-' }}</span>
              </td>

              <!-- Tanggal Bergabung -->
              <td class="px-4 py-3.5">
                <span class="font-medium text-highlighted block">{{ formatDate(emp.join_date) }}</span>
                <span class="text-xs text-muted">{{ getTenure(emp.join_date) }}</span>
              </td>

              <!-- Cuti Tahunan -->
              <td class="px-4 py-3.5 text-center">
                <div class="inline-flex flex-col items-center">
                  <span
                    class="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold border"
                    :class="emp.leave.remaining > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-muted/20 text-muted border-default'"
                  >
                    {{ emp.leave.remaining }} Hari
                  </span>
                  <span class="text-[11px] text-muted mt-1">
                    Accrued {{ emp.leave.accrued }} • Pakai {{ emp.leave.used }}
                  </span>
                </div>
              </td>

              <!-- Public Holiday (PH) -->
              <td class="px-4 py-3.5 text-center">
                <div class="inline-flex flex-col items-center">
                  <span
                    class="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold border"
                    :class="emp.public_holiday.remaining > 0 ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' : 'bg-muted/20 text-muted border-default'"
                  >
                    {{ emp.public_holiday.remaining }} Hari
                  </span>
                  <span class="text-[11px] text-muted mt-1">
                    Eligible {{ emp.public_holiday.eligible }} • Pakai {{ emp.public_holiday.used }}
                  </span>
                </div>
              </td>

              <!-- Extra Off (EO) -->
              <td class="px-4 py-3.5 text-center">
                <div class="inline-flex flex-col items-center">
                  <span
                    class="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold border"
                    :class="emp.extra_off.remaining > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' : 'bg-muted/20 text-muted border-default'"
                  >
                    {{ emp.extra_off.remaining }} Hari
                  </span>
                  <span class="text-[11px] text-muted mt-1">
                    Jatah {{ emp.extra_off.granted }} • Pakai {{ emp.extra_off.used }}
                  </span>
                </div>
              </td>

              <!-- Action Button -->
              <td class="px-4 py-3.5 text-right">
                <UButton
                  size="xs"
                  color="primary"
                  variant="outline"
                  class="cursor-pointer font-semibold"
                  @click="openDetailModal(emp.nik)"
                >
                  <template #leading>
                    <UIcon name="i-lucide-eye" class="size-3.5" />
                  </template>
                  Rincian
                </UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-else class="py-16 text-center space-y-2">
        <UIcon name="i-lucide-users" class="size-10 text-muted mx-auto" />
        <p class="text-sm font-bold text-highlighted">Tidak Ada Data Karyawan Ditemukan</p>
        <p class="text-xs text-muted">Coba ubah kata kunci pencarian atau reset filter di atas.</p>
      </div>

      <!-- Pagination -->
      <div
        v-if="employees.length > pageSize"
        class="flex items-center justify-between border-t border-default p-4"
      >
        <p class="text-xs text-muted">
          Menampilkan <span class="font-bold text-highlighted">{{ startRecord }}</span> - <span class="font-bold text-highlighted">{{ endRecord }}</span> dari <span class="font-bold text-highlighted">{{ employees.length }}</span> karyawan
        </p>
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            :disabled="currentPage <= 1"
            class="cursor-pointer"
            @click="currentPage--"
          >
            Sebelumnya
          </UButton>
          <span class="text-xs font-semibold text-highlighted px-2">
            Halaman {{ currentPage }} dari {{ totalPages }}
          </span>
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            :disabled="currentPage >= totalPages"
            class="cursor-pointer"
            @click="currentPage++"
          >
            Selanjutnya
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Modal Detail Rincian Jatah Karyawan -->
    <div
      v-if="detailModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto"
      @click.self="detailModalOpen = false"
    >
      <UCard class="w-full max-w-3xl border border-default bg-[var(--ui-bg,#ffffff)] shadow-2xl relative my-8">
        <!-- Header Modal -->
        <div class="flex items-center justify-between border-b border-default pb-4">
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="size-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-xs"
              :class="getAvatarBg(selectedEmployeeDetails?.employee?.nama_karyawan || '')"
            >
              {{ getInitials(selectedEmployeeDetails?.employee?.nama_karyawan || '') }}
            </div>
            <div class="min-w-0">
              <h3 class="text-lg font-bold text-highlighted truncate">
                {{ selectedEmployeeDetails?.employee?.nama_karyawan || 'Rincian Karyawan' }}
              </h3>
              <p class="text-xs text-muted truncate">
                NIK: {{ selectedEmployeeDetails?.employee?.nik || '-' }} •
                {{ selectedEmployeeDetails?.employee?.departement || '-' }} •
                {{ selectedEmployeeDetails?.employee?.jabatan || '-' }}
              </p>
            </div>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            class="cursor-pointer"
            @click="detailModalOpen = false"
          >
            <UIcon name="i-lucide-x" class="size-5" />
          </UButton>
        </div>

        <!-- Body Modal -->
        <div class="space-y-4 pt-4">
          <!-- Loading State for Modal -->
          <div v-if="loadingDetailModal" class="py-16 text-center text-muted">
            <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-primary mx-auto mb-2" />
            <p class="text-xs text-muted">Memuat rincian jatah karyawan...</p>
          </div>

          <div v-else-if="selectedEmployeeDetails" class="space-y-4">
            <!-- Navigation Tabs inside Modal -->
            <div class="flex border-b border-default gap-6 text-xs font-semibold overflow-x-auto">
              <button
                class="pb-2.5 transition-colors border-b-2 font-bold whitespace-nowrap cursor-pointer"
                :class="activeDetailTab === 'leave' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-highlighted'"
                @click="activeDetailTab = 'leave'"
              >
                Cuti Tahunan (Sisa: {{ selectedEmployeeDetails.summary?.leave?.remaining ?? 0 }} Hari)
              </button>
              <button
                class="pb-2.5 transition-colors border-b-2 font-bold whitespace-nowrap cursor-pointer"
                :class="activeDetailTab === 'ph' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-highlighted'"
                @click="activeDetailTab = 'ph'"
              >
                Public Holiday (Sisa: {{ selectedEmployeeDetails.summary?.public_holiday?.remaining ?? 0 }} Hari)
              </button>
              <button
                class="pb-2.5 transition-colors border-b-2 font-bold whitespace-nowrap cursor-pointer"
                :class="activeDetailTab === 'eo' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-highlighted'"
                @click="activeDetailTab = 'eo'"
              >
                Extra Off (Sisa: {{ selectedEmployeeDetails.summary?.extra_off?.remaining ?? 0 }} Hari)
              </button>
            </div>

            <!-- Tab 1: Cuti Tahunan -->
            <div v-if="activeDetailTab === 'leave'" class="space-y-4">
              <!-- Leave Accruals -->
              <div>
                <h4 class="text-xs font-bold text-highlighted uppercase tracking-wider mb-2 flex items-center gap-2">
                  <UIcon name="i-lucide-plus-circle" class="size-4 text-emerald-500" />
                  Daftar Hak Accrual Cuti Tahunan
                </h4>
                <div v-if="selectedEmployeeDetails.details?.leave_accruals?.length" class="overflow-x-auto border border-default rounded-lg">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-muted/20 text-muted uppercase tracking-wider text-[11px] border-b border-default font-semibold">
                      <tr>
                        <th class="py-2.5 px-3">Periode</th>
                        <th class="py-2.5 px-3">Tgl Accrual</th>
                        <th class="py-2.5 px-3">Jumlah Hari</th>
                        <th class="py-2.5 px-3">Kedaluwarsa</th>
                        <th class="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-default">
                      <tr v-for="acc in selectedEmployeeDetails.details.leave_accruals" :key="acc.id" class="hover:bg-muted/20">
                        <td class="py-2 px-3 font-semibold text-highlighted">{{ acc.month }}/{{ acc.year }}</td>
                        <td class="py-2 px-3 text-muted">{{ formatDate(acc.accrued_at) }}</td>
                        <td class="py-2 px-3 font-bold" :class="acc.days < 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'">
                          {{ acc.days > 0 ? '+' : '' }}{{ acc.days }} Hari
                        </td>
                        <td class="py-2 px-3 text-muted">{{ formatDate(acc.expired_at) }}</td>
                        <td class="py-2 px-3">
                          <span
                            class="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border"
                            :class="acc.is_used ? 'bg-muted/20 text-muted border-default' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'"
                          >
                            {{ acc.is_used ? 'Terpakai' : 'Aktif' }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-else class="text-xs text-muted italic p-3 border border-dashed border-default rounded-lg text-center">
                  Belum ada catatan accrual cuti tahunan.
                </p>
              </div>

              <!-- Leave Requests -->
              <div>
                <h4 class="text-xs font-bold text-highlighted uppercase tracking-wider mb-2 flex items-center gap-2">
                  <UIcon name="i-lucide-history" class="size-4 text-blue-500" />
                  Riwayat Pengambilan Cuti Tahunan
                </h4>
                <div v-if="selectedEmployeeDetails.details?.leave_requests?.length" class="overflow-x-auto border border-default rounded-lg">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-muted/20 text-muted uppercase tracking-wider text-[11px] border-b border-default font-semibold">
                      <tr>
                        <th class="py-2.5 px-3">Rentang Tanggal</th>
                        <th class="py-2.5 px-3">Hari</th>
                        <th class="py-2.5 px-3">Status</th>
                        <th class="py-2.5 px-3">Alasan</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-default">
                      <tr v-for="req in selectedEmployeeDetails.details.leave_requests" :key="req.id" class="hover:bg-muted/20">
                        <td class="py-2 px-3 font-semibold text-highlighted">
                          {{ formatDate(req.start_date) }} - {{ formatDate(req.end_date) }}
                        </td>
                        <td class="py-2 px-3 font-bold text-highlighted">{{ req.days }} Hari</td>
                        <td class="py-2 px-3">
                          <span
                            class="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border"
                            :class="req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'"
                          >
                            {{ req.status }}
                          </span>
                        </td>
                        <td class="py-2 px-3 text-muted max-w-xs truncate">{{ req.reason || '-' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-else class="text-xs text-muted italic p-3 border border-dashed border-default rounded-lg text-center">
                  Belum ada riwayat pengambilan cuti tahunan.
                </p>
              </div>
            </div>

            <!-- Tab 2: Public Holiday (PH) -->
            <div v-else-if="activeDetailTab === 'ph'" class="space-y-4">
              <!-- Eligible Public Holidays -->
              <div>
                <h4 class="text-xs font-bold text-highlighted uppercase tracking-wider mb-2 flex items-center gap-2">
                  <UIcon name="i-lucide-sparkles" class="size-4 text-indigo-500" />
                  Daftar Hari Libur Nasional Eligible (90 Hari Terakhir)
                </h4>
                <div v-if="selectedEmployeeDetails.details?.ph_eligible_list?.length" class="overflow-x-auto border border-default rounded-lg">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-muted/20 text-muted uppercase tracking-wider text-[11px] border-b border-default font-semibold">
                      <tr>
                        <th class="py-2.5 px-3">Tanggal Libur</th>
                        <th class="py-2.5 px-3">Nama Hari Libur</th>
                        <th class="py-2.5 px-3">Status Claim</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-default">
                      <tr v-for="ph in selectedEmployeeDetails.details.ph_eligible_list" :key="ph.id" class="hover:bg-muted/20">
                        <td class="py-2 px-3 font-semibold text-highlighted">{{ formatDate(ph.holiday_date) }}</td>
                        <td class="py-2 px-3 text-highlighted">{{ ph.name }}</td>
                        <td class="py-2 px-3">
                          <span
                            class="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border"
                            :class="ph.claimed ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'"
                          >
                            {{ ph.claimed ? 'Sudah Diklaim' : 'Belum Diklaim' }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-else class="text-xs text-muted italic p-3 border border-dashed border-default rounded-lg text-center">
                  Tidak ada hari libur nasional eligible yang memenuhi syarat.
                </p>
              </div>

              <!-- PH Claim Requests -->
              <div>
                <h4 class="text-xs font-bold text-highlighted uppercase tracking-wider mb-2 flex items-center gap-2">
                  <UIcon name="i-lucide-history" class="size-4 text-indigo-500" />
                  Riwayat Pengajuan Libur Pengganti PH
                </h4>
                <div v-if="selectedEmployeeDetails.details?.ph_requests?.length" class="overflow-x-auto border border-default rounded-lg">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-muted/20 text-muted uppercase tracking-wider text-[11px] border-b border-default font-semibold">
                      <tr>
                        <th class="py-2.5 px-3">Tgl Klaim Libur</th>
                        <th class="py-2.5 px-3">Hari Libur Terkait</th>
                        <th class="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-default">
                      <tr v-for="req in selectedEmployeeDetails.details.ph_requests" :key="req.id" class="hover:bg-muted/20">
                        <td class="py-2 px-3 font-semibold text-highlighted">{{ formatDate(req.claim_date) }}</td>
                        <td class="py-2 px-3 text-highlighted">{{ req.holiday_name }} ({{ formatDate(req.holiday_date) }})</td>
                        <td class="py-2 px-3">
                          <span
                            class="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border"
                            :class="req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'"
                          >
                            {{ req.status }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-else class="text-xs text-muted italic p-3 border border-dashed border-default rounded-lg text-center">
                  Belum ada riwayat pengajuan Public Holiday.
                </p>
              </div>
            </div>

            <!-- Tab 3: Extra Off (EO) -->
            <div v-else-if="activeDetailTab === 'eo'" class="space-y-4">
              <!-- Extra Off Sources -->
              <div>
                <h4 class="text-xs font-bold text-highlighted uppercase tracking-wider mb-2 flex items-center gap-2">
                  <UIcon name="i-lucide-clock-3" class="size-4 text-amber-500" />
                  Daftar Hak Extra Off (EO)
                </h4>
                <div v-if="selectedEmployeeDetails.details?.extra_off_sources?.length" class="overflow-x-auto border border-default rounded-lg">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-muted/20 text-muted uppercase tracking-wider text-[11px] border-b border-default font-semibold">
                      <tr>
                        <th class="py-2.5 px-3">Periode Sumber</th>
                        <th class="py-2.5 px-3">Hak Hari</th>
                        <th class="py-2.5 px-3">Terpakai</th>
                        <th class="py-2.5 px-3">Sisa</th>
                        <th class="py-2.5 px-3">Catatan</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-default">
                      <tr v-for="src in selectedEmployeeDetails.details.extra_off_sources" :key="src.id" class="hover:bg-muted/20">
                        <td class="py-2 px-3 font-semibold text-highlighted">{{ src.label }}</td>
                        <td class="py-2 px-3 font-bold text-highlighted">{{ src.days }} Hari</td>
                        <td class="py-2 px-3 text-muted">{{ src.used_days }} Hari</td>
                        <td class="py-2 px-3 font-bold text-amber-600 dark:text-amber-400">{{ src.remaining_days }} Hari</td>
                        <td class="py-2 px-3 text-muted italic text-[11px]">{{ src.notes || src.source || '-' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-else class="text-xs text-muted italic p-3 border border-dashed border-default rounded-lg text-center">
                  Belum ada jatah Extra Off yang ditetapkan.
                </p>
              </div>

              <!-- Extra Off Claim Requests -->
              <div>
                <h4 class="text-xs font-bold text-highlighted uppercase tracking-wider mb-2 flex items-center gap-2">
                  <UIcon name="i-lucide-history" class="size-4 text-amber-500" />
                  Riwayat Pengajuan Extra Off (EO)
                </h4>
                <div v-if="selectedEmployeeDetails.details?.extra_off_requests?.length" class="overflow-x-auto border border-default rounded-lg">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-muted/20 text-muted uppercase tracking-wider text-[11px] border-b border-default font-semibold">
                      <tr>
                        <th class="py-2.5 px-3">Tgl Klaim Off</th>
                        <th class="py-2.5 px-3">Periode Sumber EO</th>
                        <th class="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-default">
                      <tr v-for="req in selectedEmployeeDetails.details.extra_off_requests" :key="req.id" class="hover:bg-muted/20">
                        <td class="py-2 px-3 font-semibold text-highlighted">{{ formatDate(req.claim_date) }}</td>
                        <td class="py-2 px-3 text-muted">{{ req.source_period }}</td>
                        <td class="py-2 px-3">
                          <span
                            class="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border"
                            :class="req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'"
                          >
                            {{ req.status }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-else class="text-xs text-muted italic p-3 border border-dashed border-default rounded-lg text-center">
                  Belum ada riwayat pengajuan Extra Off.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Modal -->
        <div class="flex items-center justify-end border-t border-default pt-4 mt-4">
          <UButton
            color="neutral"
            variant="outline"
            class="cursor-pointer font-semibold"
            @click="detailModalOpen = false"
          >
            Tutup
          </UButton>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api, { backendUrl } from '../services/api'
import { notifier } from '../utils/notifications'

const loading = ref(false)
const exporting = ref(false)
const employees = ref([])
const departments = ref([])
const divisions = ref([])

const filters = reactive({
  search: '',
  departement: '',
  divisi: '',
  balance_filter: '',
})

// KPI Aggregates
const totalEmployeesCount = computed(() => employees.value.length)
const totalLeaveRemaining = computed(() => employees.value.reduce((acc, e) => acc + (e.leave?.remaining || 0), 0))
const totalPhRemaining = computed(() => employees.value.reduce((acc, e) => acc + (e.public_holiday?.remaining || 0), 0))
const totalEoRemaining = computed(() => employees.value.reduce((acc, e) => acc + (e.extra_off?.remaining || 0), 0))

// Pagination State (15 baris per halaman standar)
const currentPage = ref(1)
const pageSize = 15

const totalPages = computed(() => {
  return Math.ceil(employees.value.length / pageSize) || 1
})

const paginatedEmployees = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return employees.value.slice(start, start + pageSize)
})

const startRecord = computed(() => {
  if (!employees.value.length) return 0
  return (currentPage.value - 1) * pageSize + 1
})

const endRecord = computed(() => {
  return Math.min(currentPage.value * pageSize, employees.value.length)
})

let debounceTimer = null
function debounceFetch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    fetchData()
  }, 350)
}

async function fetchData() {
  loading.value = true
  currentPage.value = 1
  try {
    const params = {
      search: filters.search || undefined,
      departement: filters.departement || undefined,
      divisi: filters.divisi || undefined,
      balance_filter: filters.balance_filter || undefined,
    }

    const res = await api.get('/hr/leave-balances', { params })
    employees.value = res.data?.data || []
    departments.value = res.data?.departments || []
    divisions.value = res.data?.divisions || []
  } catch (error) {
    notifier.error(error?.response?.data?.message || 'Gagal memuat data sisa jatah karyawan.')
  } finally {
    loading.value = false
  }
}

async function exportCsv() {
  exporting.value = true
  try {
    const params = new URLSearchParams()
    if (filters.search) params.append('search', filters.search)
    if (filters.departement) params.append('departement', filters.departement)
    if (filters.divisi) params.append('divisi', filters.divisi)

    const downloadUrl = `${backendUrl}/api/hr/leave-balances/export?${params.toString()}`

    const link = document.createElement('a')
    link.href = downloadUrl
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    notifier.success('File CSV sisa jatah karyawan berhasil diunduh.')
  } catch (error) {
    notifier.error('Gagal mengunduh file export.')
  } finally {
    exporting.value = false
  }
}

// Modal Detail State
const detailModalOpen = ref(false)
const loadingDetailModal = ref(false)
const selectedEmployeeDetails = ref(null)
const activeDetailTab = ref('leave')

async function openDetailModal(nik) {
  detailModalOpen.value = true
  loadingDetailModal.value = true
  activeDetailTab.value = 'leave'
  selectedEmployeeDetails.value = null

  try {
    const res = await api.get(`/hr/leave-balances/${nik}`)
    selectedEmployeeDetails.value = res.data
  } catch (error) {
    notifier.error(error?.response?.data?.message || 'Gagal memuat rincian karyawan.')
    detailModalOpen.value = false
  } finally {
    loadingDetailModal.value = false
  }
}

// Helpers
function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
}

function getAvatarBg(name) {
  const colors = [
    'bg-slate-700',
    'bg-blue-600',
    'bg-emerald-600',
    'bg-indigo-600',
    'bg-violet-600',
    'bg-amber-600',
    'bg-teal-600',
  ]
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function formatDate(dateStr) {
  if (!dateStr || dateStr === '-') return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch (e) {
    return dateStr
  }
}

function getTenure(joinDateStr) {
  if (!joinDateStr || joinDateStr === '-') return ''
  try {
    const start = new Date(joinDateStr)
    if (isNaN(start.getTime())) return ''
    const now = new Date()
    let years = now.getFullYear() - start.getFullYear()
    let months = now.getMonth() - start.getMonth()

    if (months < 0) {
      years--
      months += 12
    }

    if (years > 0) {
      return `${years} thn ${months} bln`
    }
    return `${months} bln`
  } catch (e) {
    return ''
  }
}

onMounted(() => {
  fetchData()
})
</script>
