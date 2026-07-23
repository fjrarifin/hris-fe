<template>
  <div class="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-highlighted">
          Sisa Jatah Cuti, PH & Extra Off
        </h1>
        <p class="text-sm text-muted mt-1">
          Monitoring sisa jatah cuti tahunan, public holiday, dan extra off seluruh karyawan.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :loading="loading"
          @click="fetchData"
        >
          Refresh Data
        </UButton>
        <UButton
          size="sm"
          color="primary"
          icon="i-lucide-download"
          :loading="exporting"
          @click="exportCsv"
        >
          Export CSV / Excel
        </UButton>
      </div>
    </div>

    <!-- Filters Section -->
    <UCard class="shadow-xs">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Search Input -->
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">Cari Karyawan / NIK</label>
          <UInput
            v-model="filters.search"
            placeholder="Ketik nama, NIK, atau jabatan..."
            icon="i-lucide-search"
            size="sm"
            clearable
            @update:model-value="debounceFetch"
          />
        </div>

        <!-- Filter Departemen -->
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">Departemen</label>
          <select
            v-model="filters.departement"
            class="w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-bg)] px-3 py-1.5 text-xs text-[var(--ui-text-highlighted)] outline-none focus:ring-1 focus:ring-primary"
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
          <label class="block text-xs font-semibold text-muted mb-1">Divisi</label>
          <select
            v-model="filters.divisi"
            class="w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-bg)] px-3 py-1.5 text-xs text-[var(--ui-text-highlighted)] outline-none focus:ring-1 focus:ring-primary"
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
          <label class="block text-xs font-semibold text-muted mb-1">Filter Jatah</label>
          <select
            v-model="filters.balance_filter"
            class="w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-bg)] px-3 py-1.5 text-xs text-[var(--ui-text-highlighted)] outline-none focus:ring-1 focus:ring-primary"
            @change="fetchData"
          >
            <option value="">Semua Karyawan</option>
            <option value="has_leave">Punya Sisa Cuti Tahunan</option>
            <option value="has_ph">Punya Sisa Public Holiday</option>
            <option value="has_eo">Punya Sisa Extra Off</option>
            <option value="leave_empty">Cuti Tahunan Habis (0)</option>
          </select>
        </div>
      </div>
    </UCard>

    <!-- Table Section -->
    <UCard class="shadow-xs overflow-hidden">
      <!-- Loading State -->
      <div v-if="loading" class="py-16 text-center space-y-3">
        <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-primary mx-auto" />
        <p class="text-sm text-muted">Memuat data sisa jatah karyawan...</p>
      </div>

      <!-- Data Table -->
      <div v-else-if="employees.length" class="space-y-4">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-default bg-muted/10 text-muted uppercase tracking-wider text-[11px]">
                <th class="py-3 px-4 font-semibold">Karyawan</th>
                <th class="py-3 px-4 font-semibold">Departemen & Divisi</th>
                <th class="py-3 px-4 font-semibold">Tgl Bergabung</th>
                <th class="py-3 px-4 font-semibold text-center">Sisa Cuti Tahunan</th>
                <th class="py-3 px-4 font-semibold text-center">Sisa Public Holiday (PH)</th>
                <th class="py-3 px-4 font-semibold text-center">Sisa Extra Off (EO)</th>
                <th class="py-3 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default/60">
              <tr
                v-for="emp in paginatedEmployees"
                :key="emp.nik"
                class="hover:bg-muted/10 transition-colors"
              >
                <!-- Karyawan Info -->
                <td class="py-3 px-4">
                  <div class="flex items-center gap-3">
                    <div
                      class="size-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white"
                      :class="getAvatarBg(emp.nama_karyawan)"
                    >
                      {{ getInitials(emp.nama_karyawan) }}
                    </div>
                    <div class="min-w-0">
                      <span class="font-bold text-highlighted block truncate text-sm">
                        {{ emp.nama_karyawan }}
                      </span>
                      <div class="flex items-center gap-1.5 text-muted text-[11px] mt-0.5">
                        <span>NIK: {{ emp.nik }}</span>
                        <span>&bull;</span>
                        <span class="capitalize">{{ emp.jabatan }}</span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Departemen & Divisi -->
                <td class="py-3 px-4">
                  <span class="font-semibold text-highlighted block">{{ emp.departement }}</span>
                  <span class="text-muted text-[11px]">{{ emp.divisi }}</span>
                </td>

                <!-- Tanggal Bergabung -->
                <td class="py-3 px-4">
                  <span class="font-medium text-highlighted block">{{ formatDate(emp.join_date) }}</span>
                  <span class="text-muted text-[11px]">{{ getTenure(emp.join_date) }}</span>
                </td>

                <!-- Cuti Tahunan -->
                <td class="py-3 px-4 text-center">
                  <div class="inline-flex flex-col items-center">
                    <UBadge
                      :color="emp.leave.remaining > 0 ? 'success' : 'neutral'"
                      variant="soft"
                      size="sm"
                      class="font-bold px-2.5"
                    >
                      {{ emp.leave.remaining }} Hari
                    </UBadge>
                    <span class="text-[10px] text-muted mt-1">
                      Accrued {{ emp.leave.accrued }} &bull; Pakai {{ emp.leave.used }}
                    </span>
                  </div>
                </td>

                <!-- Public Holiday (PH) -->
                <td class="py-3 px-4 text-center">
                  <div class="inline-flex flex-col items-center">
                    <UBadge
                      :color="emp.public_holiday.remaining > 0 ? 'info' : 'neutral'"
                      variant="soft"
                      size="sm"
                      class="font-bold px-2.5"
                    >
                      {{ emp.public_holiday.remaining }} Hari
                    </UBadge>
                    <span class="text-[10px] text-muted mt-1">
                      Eligible {{ emp.public_holiday.eligible }} &bull; Pakai {{ emp.public_holiday.used }}
                    </span>
                  </div>
                </td>

                <!-- Extra Off (EO) -->
                <td class="py-3 px-4 text-center">
                  <div class="inline-flex flex-col items-center">
                    <UBadge
                      :color="emp.extra_off.remaining > 0 ? 'warning' : 'neutral'"
                      variant="soft"
                      size="sm"
                      class="font-bold px-2.5"
                    >
                      {{ emp.extra_off.remaining }} Hari
                    </UBadge>
                    <span class="text-[10px] text-muted mt-1">
                      Jatah {{ emp.extra_off.granted }} &bull; Pakai {{ emp.extra_off.used }}
                    </span>
                  </div>
                </td>

                <!-- Action Button -->
                <td class="py-3 px-4 text-right">
                  <UButton
                    size="xs"
                    color="primary"
                    variant="soft"
                    icon="i-lucide-eye"
                    label="Rincian"
                    @click="openDetailModal(emp.nik)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls (10 Baris per Halaman) -->
        <div class="px-4 py-3 border-t border-default flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div class="text-muted">
            Menampilkan <span class="font-bold text-highlighted">{{ startRecord }}</span> - <span class="font-bold text-highlighted">{{ endRecord }}</span> dari <span class="font-bold text-highlighted">{{ employees.length }}</span> karyawan
          </div>

          <div class="flex items-center gap-1.5">
            <UButton
              size="xs"
              color="neutral"
              variant="outline"
              icon="i-lucide-chevron-left"
              :disabled="currentPage === 1"
              @click="currentPage--"
            >
              Sebelumnya
            </UButton>

            <span class="px-3 font-semibold text-highlighted">
              Halaman {{ currentPage }} dari {{ totalPages }}
            </span>

            <UButton
              size="xs"
              color="neutral"
              variant="outline"
              trailing-icon="i-lucide-chevron-right"
              :disabled="currentPage >= totalPages"
              @click="currentPage++"
            >
              Selanjutnya
            </UButton>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="py-16 text-center space-y-2">
        <UIcon name="i-lucide-users-round" class="size-10 text-muted mx-auto" />
        <p class="text-sm font-bold text-highlighted">Tidak Ada Data Karyawan Ditemukan</p>
        <p class="text-xs text-muted">Coba ubah kata kunci pencarian atau reset filter di atas.</p>
      </div>
    </UCard>

    <!-- Modal Detail Rincian Jatah Karyawan (Clean Standard Overlay) -->
    <Teleport to="body">
      <div
        v-if="detailModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
      >
        <!-- Backdrop Overlay -->
        <div
          class="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
          @click="detailModalOpen = false"
        ></div>

        <!-- Modal Box Container -->
        <div class="relative w-full sm:max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-default shadow-2xl z-10 overflow-hidden">
          <!-- Header -->
          <div class="p-4 sm:p-5 border-b border-default flex items-center justify-between bg-muted/10">
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="size-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0"
                :class="getAvatarBg(selectedEmployeeDetails?.employee?.nama_karyawan || '')"
              >
                {{ getInitials(selectedEmployeeDetails?.employee?.nama_karyawan || '') }}
              </div>
              <div class="min-w-0">
                <h3 class="text-base font-bold text-highlighted truncate">
                  {{ selectedEmployeeDetails?.employee?.nama_karyawan || 'Rincian Karyawan' }}
                </h3>
                <p class="text-xs text-muted truncate">
                  NIK: {{ selectedEmployeeDetails?.employee?.nik || '-' }} &bull;
                  {{ selectedEmployeeDetails?.employee?.departement || '-' }} &bull;
                  {{ selectedEmployeeDetails?.employee?.jabatan || '-' }}
                </p>
              </div>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              size="xs"
              @click="detailModalOpen = false"
            />
          </div>

          <!-- Body (Scrollable) -->
          <div class="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
            <!-- Loading State for Modal -->
            <div v-if="loadingDetailModal" class="py-16 text-center space-y-3">
              <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-primary mx-auto" />
              <p class="text-xs text-muted">Memuat rincian jatah karyawan...</p>
            </div>

            <div v-else-if="selectedEmployeeDetails" class="space-y-4">
              <!-- Navigation Tabs inside Modal -->
              <div class="flex border-b border-default gap-6 text-xs font-semibold overflow-x-auto">
                <button
                  class="pb-2.5 transition-colors border-b-2 font-bold whitespace-nowrap"
                  :class="activeDetailTab === 'leave' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-highlighted'"
                  @click="activeDetailTab = 'leave'"
                >
                  Cuti Tahunan (Sisa: {{ selectedEmployeeDetails.summary?.leave?.remaining ?? 0 }} Hari)
                </button>
                <button
                  class="pb-2.5 transition-colors border-b-2 font-bold whitespace-nowrap"
                  :class="activeDetailTab === 'ph' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-highlighted'"
                  @click="activeDetailTab = 'ph'"
                >
                  Public Holiday (Sisa: {{ selectedEmployeeDetails.summary?.public_holiday?.remaining ?? 0 }} Hari)
                </button>
                <button
                  class="pb-2.5 transition-colors border-b-2 font-bold whitespace-nowrap"
                  :class="activeDetailTab === 'eo' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-highlighted'"
                  @click="activeDetailTab = 'eo'"
                >
                  Extra Off (Sisa: {{ selectedEmployeeDetails.summary?.extra_off?.remaining ?? 0 }} Hari)
                </button>
              </div>

              <!-- TAB 1: CUTI TAHUNAN DETAILS -->
              <div v-if="activeDetailTab === 'leave'" class="space-y-5">
                <!-- Accrual History -->
                <div>
                  <h4 class="text-xs font-bold text-highlighted mb-2 flex items-center gap-2">
                    <UIcon name="i-lucide-history" class="size-4 text-primary" />
                    Riwayat Akumulasi Hak Cuti (Accruals)
                  </h4>
                  <div v-if="selectedEmployeeDetails.details?.leave_accruals?.length" class="overflow-x-auto border border-default rounded-xl">
                    <table class="w-full text-left text-xs">
                      <thead class="bg-muted/10 text-muted uppercase text-[10px] border-b border-default">
                        <tr>
                          <th class="py-2.5 px-3">Tahun/Bulan</th>
                          <th class="py-2.5 px-3">Hak Hari</th>
                          <th class="py-2.5 px-3">Tgl Accrual</th>
                          <th class="py-2.5 px-3">Tgl Kadaluarsa</th>
                          <th class="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-default/50">
                        <tr v-for="acc in selectedEmployeeDetails.details.leave_accruals" :key="acc.id" class="hover:bg-muted/5">
                          <td class="py-2 px-3 font-semibold text-highlighted">{{ acc.year }} / {{ acc.month }}</td>
                          <td class="py-2 px-3 font-bold text-emerald-600 dark:text-emerald-400">+{{ acc.days }} Hari</td>
                          <td class="py-2 px-3 text-muted">{{ formatDate(acc.accrued_at) }}</td>
                          <td class="py-2 px-3 text-muted">{{ formatDate(acc.expired_at) }}</td>
                          <td class="py-2 px-3">
                            <UBadge :color="acc.is_expired ? 'danger' : 'success'" variant="soft" size="xs">
                              {{ acc.is_expired ? 'Kadaluarsa' : 'Aktif' }}
                            </UBadge>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p v-else class="text-xs text-muted italic p-3 border border-dashed border-default rounded-xl text-center">Belum ada riwayat akumulasi cuti tahunan.</p>
                </div>

                <!-- Leave Requests Taken -->
                <div>
                  <h4 class="text-xs font-bold text-highlighted mb-2 flex items-center gap-2">
                    <UIcon name="i-lucide-calendar-check" class="size-4 text-primary" />
                    Riwayat Pengajuan Cuti Tahunan
                  </h4>
                  <div v-if="selectedEmployeeDetails.details?.leave_requests?.length" class="overflow-x-auto border border-default rounded-xl">
                    <table class="w-full text-left text-xs">
                      <thead class="bg-muted/10 text-muted uppercase text-[10px] border-b border-default">
                        <tr>
                          <th class="py-2.5 px-3">Periode Cuti</th>
                          <th class="py-2.5 px-3">Jumlah Hari</th>
                          <th class="py-2.5 px-3">Alasan</th>
                          <th class="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-default/50">
                        <tr v-for="req in selectedEmployeeDetails.details.leave_requests" :key="req.id" class="hover:bg-muted/5">
                          <td class="py-2 px-3 font-medium text-highlighted">
                            {{ formatDate(req.start_date) }} - {{ formatDate(req.end_date) }}
                          </td>
                          <td class="py-2 px-3 font-bold text-highlighted">{{ req.days }} Hari</td>
                          <td class="py-2 px-3 text-muted italic max-w-xs truncate">{{ req.reason || '-' }}</td>
                          <td class="py-2 px-3">
                            <UBadge :color="getApprovalStatusColor(req.status)" variant="soft" size="xs">
                              {{ req.status }}
                            </UBadge>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p v-else class="text-xs text-muted italic p-3 border border-dashed border-default rounded-xl text-center">Belum ada riwayat pengajuan cuti.</p>
                </div>
              </div>

              <!-- TAB 2: PUBLIC HOLIDAY DETAILS -->
              <div v-if="activeDetailTab === 'ph'" class="space-y-5">
                <!-- Eligible Public Holidays -->
                <div>
                  <h4 class="text-xs font-bold text-highlighted mb-2 flex items-center gap-2">
                    <UIcon name="i-lucide-sparkles" class="size-4 text-indigo-500" />
                    Daftar Hari Libur Nasional Eligible (90 Hari Terakhir)
                  </h4>
                  <div v-if="selectedEmployeeDetails.details?.ph_eligible_list?.length" class="overflow-x-auto border border-default rounded-xl">
                    <table class="w-full text-left text-xs">
                      <thead class="bg-muted/10 text-muted uppercase text-[10px] border-b border-default">
                        <tr>
                          <th class="py-2.5 px-3">Tanggal Libur</th>
                          <th class="py-2.5 px-3">Nama Hari Libur</th>
                          <th class="py-2.5 px-3">Status Claim</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-default/50">
                        <tr v-for="ph in selectedEmployeeDetails.details.ph_eligible_list" :key="ph.id" class="hover:bg-muted/5">
                          <td class="py-2 px-3 font-semibold text-highlighted">{{ formatDate(ph.holiday_date) }}</td>
                          <td class="py-2 px-3 font-medium text-highlighted">{{ ph.name }}</td>
                          <td class="py-2 px-3">
                            <UBadge :color="ph.claimed ? 'success' : 'info'" variant="soft" size="xs">
                              {{ ph.claimed ? 'Sudah Diklaim' : 'Belum Diklaim' }}
                            </UBadge>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p v-else class="text-xs text-muted italic p-3 border border-dashed border-default rounded-xl text-center">Tidak ada hari libur nasional eligible yang belum diklaim.</p>
                </div>

                <!-- PH Claim Requests -->
                <div>
                  <h4 class="text-xs font-bold text-highlighted mb-2 flex items-center gap-2">
                    <UIcon name="i-lucide-clipboard-list" class="size-4 text-indigo-500" />
                    Riwayat Klaim Public Holiday (PH)
                  </h4>
                  <div v-if="selectedEmployeeDetails.details?.ph_requests?.length" class="overflow-x-auto border border-default rounded-xl">
                    <table class="w-full text-left text-xs">
                      <thead class="bg-muted/10 text-muted uppercase text-[10px] border-b border-default">
                        <tr>
                          <th class="py-2.5 px-3">Hari Libur Acuan</th>
                          <th class="py-2.5 px-3">Tgl Klaim Libur</th>
                          <th class="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-default/50">
                        <tr v-for="req in selectedEmployeeDetails.details.ph_requests" :key="req.id" class="hover:bg-muted/5">
                          <td class="py-2 px-3 font-medium text-highlighted">{{ req.holiday_name }} ({{ formatDate(req.holiday_date) }})</td>
                          <td class="py-2 px-3 font-bold text-highlighted">{{ formatDate(req.claim_date) }}</td>
                          <td class="py-2 px-3">
                            <UBadge :color="getApprovalStatusColor(req.status)" variant="soft" size="xs">
                              {{ req.status }}
                            </UBadge>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p v-else class="text-xs text-muted italic p-3 border border-dashed border-default rounded-xl text-center">Belum ada klaim Public Holiday.</p>
                </div>
              </div>

              <!-- TAB 3: EXTRA OFF DETAILS -->
              <div v-if="activeDetailTab === 'eo'" class="space-y-5">
                <!-- Extra Off Sources -->
                <div>
                  <h4 class="text-xs font-bold text-highlighted mb-2 flex items-center gap-2">
                    <UIcon name="i-lucide-clock-3" class="size-4 text-amber-500" />
                    Daftar Sumber Jatah Extra Off (EO)
                  </h4>
                  <div v-if="selectedEmployeeDetails.details?.extra_off_sources?.length" class="overflow-x-auto border border-default rounded-xl">
                    <table class="w-full text-left text-xs">
                      <thead class="bg-muted/10 text-muted uppercase text-[10px] border-b border-default">
                        <tr>
                          <th class="py-2.5 px-3">Periode Sumber</th>
                          <th class="py-2.5 px-3">Hak Hari</th>
                          <th class="py-2.5 px-3">Terpakai</th>
                          <th class="py-2.5 px-3">Sisa</th>
                          <th class="py-2.5 px-3">Catatan</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-default/50">
                        <tr v-for="src in selectedEmployeeDetails.details.extra_off_sources" :key="src.id" class="hover:bg-muted/5">
                          <td class="py-2 px-3 font-semibold text-highlighted">{{ src.label }}</td>
                          <td class="py-2 px-3 font-bold text-highlighted">{{ src.days }} Hari</td>
                          <td class="py-2 px-3 text-muted">{{ src.used_days }} Hari</td>
                          <td class="py-2 px-3 font-bold text-amber-600 dark:text-amber-400">{{ src.remaining_days }} Hari</td>
                          <td class="py-2 px-3 text-muted italic text-[11px]">{{ src.notes || src.source || '-' }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p v-else class="text-xs text-muted italic p-3 border border-dashed border-default rounded-xl text-center">Belum ada jatah Extra Off yang ditetapkan.</p>
                </div>

                <!-- Extra Off Claim Requests -->
                <div>
                  <h4 class="text-xs font-bold text-highlighted mb-2 flex items-center gap-2">
                    <UIcon name="i-lucide-file-text" class="size-4 text-amber-500" />
                    Riwayat Pengajuan Extra Off (EO)
                  </h4>
                  <div v-if="selectedEmployeeDetails.details?.extra_off_requests?.length" class="overflow-x-auto border border-default rounded-xl">
                    <table class="w-full text-left text-xs">
                      <thead class="bg-muted/10 text-muted uppercase text-[10px] border-b border-default">
                        <tr>
                          <th class="py-2.5 px-3">Tgl Klaim Off</th>
                          <th class="py-2.5 px-3">Periode Sumber EO</th>
                          <th class="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-default/50">
                        <tr v-for="req in selectedEmployeeDetails.details.extra_off_requests" :key="req.id" class="hover:bg-muted/5">
                          <td class="py-2 px-3 font-bold text-highlighted">{{ formatDate(req.claim_date) }}</td>
                          <td class="py-2 px-3 text-muted">{{ req.source_period }}</td>
                          <td class="py-2 px-3">
                            <UBadge :color="getApprovalStatusColor(req.status)" variant="soft" size="xs">
                              {{ req.status }}
                            </UBadge>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p v-else class="text-xs text-muted italic p-3 border border-dashed border-default rounded-xl text-center">Belum ada riwayat pengajuan Extra Off.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="p-4 border-t border-default bg-muted/10 flex justify-end">
            <UButton color="neutral" variant="soft" size="xs" @click="detailModalOpen = false">
              Tutup
            </UButton>
          </div>
        </div>
      </div>
    </Teleport>
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

// Pagination State (10 baris per halaman)
const currentPage = ref(1)
const pageSize = 10

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

    // Trigger download using hidden anchor tag
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

function getApprovalStatusColor(status) {
  const statusLower = (status || '').toLowerCase()
  if (statusLower.includes('approved') || statusLower.includes('setuju')) return 'success'
  if (statusLower.includes('reject') || statusLower.includes('tolak')) return 'danger'
  if (statusLower.includes('cancel') || statusLower.includes('batal')) return 'neutral'
  return 'warning'
}

onMounted(() => {
  fetchData()
})
</script>
