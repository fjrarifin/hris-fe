<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getHrPayrollDashboard, saveMonthlyRevenue } from '../services/payrollDashboardService'
import { apiError } from '../utils/formatters'
import { notifier } from '../utils/notifications'

const router = useRouter()

const loading = ref(false)
const savingRevenue = ref(false)
const showRevenueModal = ref(false)
const errorMessage = ref('')
const dashboardData = ref(null)

const currentMonthValue = (() => {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 7)
})()

const selectedMonth = ref(currentMonthValue)

const revenueForm = reactive({
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  omset: 0,
  branch_or_unit: 'Holding',
  notes: '',
})

const formatRp = (val) => {
  if (val === null || val === undefined || isNaN(val)) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val)
}

const formatNumber = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '0'
  return new Intl.NumberFormat('id-ID').format(val)
}

const loadDashboard = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await getHrPayrollDashboard({ month: selectedMonth.value })
    dashboardData.value = res.data
  } catch (err) {
    errorMessage.value = apiError(err, 'Gagal memuat data dashboard payroll.')
  } finally {
    loading.value = false
  }
}

const openRevenueModal = () => {
  if (selectedMonth.value) {
    const [y, m] = selectedMonth.value.split('-')
    revenueForm.year = parseInt(y, 10)
    revenueForm.month = parseInt(m, 10)
  }
  const currentOmset = dashboardData.value?.score_cards?.omset || 0
  revenueForm.omset = currentOmset
  revenueForm.branch_or_unit = 'Holding'
  revenueForm.notes = ''
  showRevenueModal.value = true
}

const handleSaveRevenue = async () => {
  if (revenueForm.omset < 0) {
    notifier.error('Nilai omset tidak boleh kurang dari 0.')
    return
  }
  savingRevenue.value = true
  try {
    await saveMonthlyRevenue({
      year: revenueForm.year,
      month: revenueForm.month,
      omset: revenueForm.omset,
      branch_or_unit: revenueForm.branch_or_unit,
      notes: revenueForm.notes,
    })
    notifier.success('Data omset bulanan berhasil disimpan.')
    showRevenueModal.value = false
    await loadDashboard()
  } catch (err) {
    notifier.error(apiError(err, 'Gagal menyimpan data omset.'))
  } finally {
    savingRevenue.value = false
  }
}

// Computed Scorecards
const scoreCards = computed(() => dashboardData.value?.score_cards || {})
const monthlyTrends = computed(() => dashboardData.value?.bar_cards?.monthly_trends || [])
const pieCards = computed(() => dashboardData.value?.pie_cards || {})

// Max value helpers for bar charts
const maxBrutoNetto = computed(() => {
  if (!monthlyTrends.value.length) return 1
  return Math.max(...monthlyTrends.value.map((m) => Math.max(m.gaji_bruto, m.gaji_netto)), 1)
})

const maxBiayaCasual = computed(() => {
  if (!monthlyTrends.value.length) return 1
  return Math.max(...monthlyTrends.value.map((m) => m.biaya_casual), 1)
})

const maxResign = computed(() => {
  if (!monthlyTrends.value.length) return 1
  return Math.max(...monthlyTrends.value.map((m) => m.karyawan_resign), 1)
})

const maxOmsetPercent = computed(() => {
  if (!monthlyTrends.value.length) return 100
  return Math.max(...monthlyTrends.value.map((m) => m.persentase_manpower_omset), 50)
})

// SVG Pie / Donut Path Generator Helper
const getDonutSlices = (items) => {
  if (!items || !items.length) return []
  const total = items.reduce((sum, item) => sum + (item.value || 0), 0)
  if (total === 0) return []

  let accumulatedPercent = 0
  return items.map((item) => {
    const percent = item.value / total
    const startAngle = accumulatedPercent * 2 * Math.PI - Math.PI / 2
    accumulatedPercent += percent
    const endAngle = accumulatedPercent * 2 * Math.PI - Math.PI / 2

    const r = 40
    const cx = 50
    const cy = 50
    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)

    const largeArcFlag = percent > 0.5 ? 1 : 0
    const pathData = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`

    return {
      ...item,
      percent: Math.round(percent * 100),
      pathData,
      color: item.color || '#3b82f6',
    }
  })
}

onMounted(() => {
  loadDashboard()
})
</script>

<template>
  <div class="space-y-6 pb-12">
    <!-- Header Section -->
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-layout-dashboard" class="size-7 text-primary" />
          <h1 class="text-2xl font-bold tracking-tight text-highlighted">Dashboard Payroll & Kompensasi</h1>
        </div>
        <p class="mt-1 text-sm text-muted">
          Analisis komprehensif biaya manpower, kompensasi karyawan, dan metrik ketenagakerjaan.
        </p>
      </div>

      <!-- Action & Period Filters -->
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex items-center gap-2 rounded-lg border border-default bg-card px-3 py-1.5 shadow-sm">
          <UIcon name="i-lucide-calendar" class="size-4 text-muted" />
          <label class="text-xs font-medium text-muted">Periode:</label>
          <input
            v-model="selectedMonth"
            type="month"
            class="bg-transparent text-sm font-semibold text-highlighted focus:outline-none"
            @change="loadDashboard"
          />
        </div>

        <UButton
          icon="i-lucide-banknote"
          color="neutral"
          variant="outline"
          label="Input Omset"
          @click="openRevenueModal"
        />

        <UButton
          icon="i-lucide-wallet-cards"
          color="neutral"
          variant="outline"
          label="Master Payroll"
          to="/payroll/master"
        />

        <UButton
          icon="i-lucide-calculator"
          color="primary"
          label="Proses Payroll"
          to="/payroll/process"
        />

        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="loading"
          @click="loadDashboard"
        />
      </div>
    </div>

    <!-- Error Alert -->
    <UAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-triangle"
      :title="errorMessage"
    />

    <!-- Skeleton Loading -->
    <div v-if="loading && !dashboardData" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="i in 8" :key="i" class="h-28 animate-pulse rounded-xl bg-muted/20"></div>
    </div>

    <div v-else-if="dashboardData" class="space-y-8">
      <!-- ========================================== -->
      <!-- 1. SCORE CARDS (KPI METRICS)               -->
      <!-- ========================================== -->
      <div>
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-muted">
            1. Metrik Utama (Score Cards) - {{ dashboardData.period?.label }}
          </h2>
          <span class="text-xs text-muted">Total Karyawan Aktif: {{ scoreCards.total_karyawan }} Orang</span>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <!-- Total Gaji Bruto -->
          <div class="relative overflow-hidden rounded-xl border border-blue-500/20 bg-card p-4 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase text-blue-500">Total Gaji Bruto</span>
              <div class="rounded-lg bg-blue-500/10 p-2 text-blue-500">
                <UIcon name="i-lucide-coins" class="size-5" />
              </div>
            </div>
            <div class="mt-2 text-xl font-bold tracking-tight text-highlighted">
              {{ formatRp(scoreCards.total_gaji_bruto) }}
            </div>
            <p class="mt-1 text-xs text-muted">Akumulasi pendapatan kotor karyawan</p>
          </div>

          <!-- Total Gaji Netto -->
          <div class="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-card p-4 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase text-emerald-500">Total Gaji Netto</span>
              <div class="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
                <UIcon name="i-lucide-wallet" class="size-5" />
              </div>
            </div>
            <div class="mt-2 text-xl font-bold tracking-tight text-highlighted">
              {{ formatRp(scoreCards.total_gaji_netto) }}
            </div>
            <p class="mt-1 text-xs text-muted">Take Home Pay yang ditransfer</p>
          </div>

          <!-- Jumlah Karyawan Regular -->
          <div class="relative overflow-hidden rounded-xl border border-indigo-500/20 bg-card p-4 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase text-indigo-500">Karyawan Regular</span>
              <div class="rounded-lg bg-indigo-500/10 p-2 text-indigo-500">
                <UIcon name="i-lucide-users" class="size-5" />
              </div>
            </div>
            <div class="mt-2 text-xl font-bold tracking-tight text-highlighted">
              {{ formatNumber(scoreCards.jumlah_karyawan_regular) }} <span class="text-sm font-normal text-muted">Orang</span>
            </div>
            <p class="mt-1 text-xs text-muted">Status Tetap (PKWTT) & Kontrak (PKWT)</p>
          </div>

          <!-- Jumlah Karyawan Casual -->
          <div class="relative overflow-hidden rounded-xl border border-amber-500/20 bg-card p-4 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase text-amber-500">Karyawan Casual</span>
              <div class="rounded-lg bg-amber-500/10 p-2 text-amber-500">
                <UIcon name="i-lucide-user-check" class="size-5" />
              </div>
            </div>
            <div class="mt-2 text-xl font-bold tracking-tight text-highlighted">
              {{ formatNumber(scoreCards.jumlah_karyawan_casual) }} <span class="text-sm font-normal text-muted">Orang</span>
            </div>
            <p class="mt-1 text-xs text-muted">Pekerja Harian / Freelance / Daily Worker</p>
          </div>

          <!-- Biaya Lembur -->
          <div class="relative overflow-hidden rounded-xl border border-orange-500/20 bg-card p-4 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase text-orange-500">Biaya Lembur</span>
              <div class="rounded-lg bg-orange-500/10 p-2 text-orange-500">
                <UIcon name="i-lucide-clock" class="size-5" />
              </div>
            </div>
            <div class="mt-2 text-xl font-bold tracking-tight text-highlighted">
              {{ formatRp(scoreCards.biaya_lembur) }}
            </div>
            <p class="mt-1 text-xs text-muted">Kompensasi over-time periode berjalan</p>
          </div>

          <!-- Biaya BPJS -->
          <div class="relative overflow-hidden rounded-xl border border-teal-500/20 bg-card p-4 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase text-teal-500">Biaya BPJS</span>
              <div class="rounded-lg bg-teal-500/10 p-2 text-teal-500">
                <UIcon name="i-lucide-shield-check" class="size-5" />
              </div>
            </div>
            <div class="mt-2 text-xl font-bold tracking-tight text-highlighted">
              {{ formatRp(scoreCards.biaya_bpjs) }}
            </div>
            <p class="mt-1 text-xs text-muted">Iuran BPJS Kesehatan & Ketenagakerjaan</p>
          </div>

          <!-- Biaya Potongan Karyawan -->
          <div class="relative overflow-hidden rounded-xl border border-rose-500/20 bg-card p-4 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase text-rose-500">Biaya Potongan</span>
              <div class="rounded-lg bg-rose-500/10 p-2 text-rose-500">
                <UIcon name="i-lucide-receipt" class="size-5" />
              </div>
            </div>
            <div class="mt-2 text-xl font-bold tracking-tight text-highlighted">
              {{ formatRp(scoreCards.biaya_potongan) }}
            </div>
            <p class="mt-1 text-xs text-muted">Potongan PPH, Kasbon, Terlambat, Absen</p>
          </div>

          <!-- Rasio Manpower vs Omset -->
          <div class="relative overflow-hidden rounded-xl border border-purple-500/20 bg-card p-4 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase text-purple-500">% Manpower / Omset</span>
              <div class="rounded-lg bg-purple-500/10 p-2 text-purple-500">
                <UIcon name="i-lucide-percent" class="size-5" />
              </div>
            </div>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="text-xl font-bold tracking-tight text-highlighted">
                {{ scoreCards.persentase_manpower_omset }}%
              </span>
              <span
                class="rounded px-1.5 py-0.5 text-xs font-medium"
                :class="scoreCards.persentase_manpower_omset <= 25 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'"
              >
                {{ scoreCards.persentase_manpower_omset <= 25 ? 'Aman' : 'Tinggi' }}
              </span>
            </div>
            <p class="mt-1 text-xs text-muted">Omset: {{ formatRp(scoreCards.omset) }}</p>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- 2. BAR CARDS (TREN 12 BULAN TERAKHIR)      -->
      <!-- ========================================== -->
      <div>
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-muted">
            2. Analisis Tren Bulanan (Bar Cards - 12 Bulan Terakhir)
          </h2>
        </div>

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <!-- Bar Card 1: Tren Total Gaji Bruto & Netto -->
          <div class="rounded-xl border border-default bg-card p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-highlighted">Total Gaji Bruto & Netto per Bulan</h3>
                <p class="text-xs text-muted">Perbandingan pengeluaran bruto vs netto 12 bulan terakhir</p>
              </div>
              <div class="flex items-center gap-3 text-xs">
                <div class="flex items-center gap-1.5">
                  <span class="size-3 rounded-sm bg-blue-500"></span>
                  <span class="text-muted">Bruto</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="size-3 rounded-sm bg-emerald-500"></span>
                  <span class="text-muted">Netto</span>
                </div>
              </div>
            </div>

            <!-- Barchart Graphic -->
            <div class="mt-6 flex h-48 items-end gap-2 border-b border-default pb-2">
              <div
                v-for="item in monthlyTrends"
                :key="item.month_key"
                class="group relative flex flex-1 flex-col items-center gap-1"
              >
                <!-- Bars Container -->
                <div class="flex w-full items-end justify-center gap-1">
                  <div
                    class="w-2.5 rounded-t bg-blue-500 transition-all duration-300 group-hover:bg-blue-400 sm:w-3.5"
                    :style="{ height: `${Math.max(4, (item.gaji_bruto / maxBrutoNetto) * 160)}px` }"
                  ></div>
                  <div
                    class="w-2.5 rounded-t bg-emerald-500 transition-all duration-300 group-hover:bg-emerald-400 sm:w-3.5"
                    :style="{ height: `${Math.max(4, (item.gaji_netto / maxBrutoNetto) * 160)}px` }"
                  ></div>
                </div>
                <!-- Label -->
                <span class="mt-1 rotate-45 text-[10px] text-muted sm:rotate-0 sm:text-xs">
                  {{ item.month_label.split(' ')[0] }}
                </span>

                <!-- Tooltip -->
                <div class="pointer-events-none absolute bottom-full mb-2 hidden w-44 rounded-lg bg-slate-900 p-2 text-xs text-white shadow-xl group-hover:block z-20">
                  <div class="font-bold">{{ item.month_label }}</div>
                  <div class="text-blue-300">Bruto: {{ formatRp(item.gaji_bruto) }}</div>
                  <div class="text-emerald-300">Netto: {{ formatRp(item.gaji_netto) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bar Card 2: Tren Biaya Karyawan Casual per Bulan -->
          <div class="rounded-xl border border-default bg-card p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-highlighted">Total Biaya Casual setiap Bulan</h3>
                <p class="text-xs text-muted">Pengeluaran upah tenaga harian lepas / freelance</p>
              </div>
              <div class="rounded-lg bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-500">
                Pekerja Casual
              </div>
            </div>

            <!-- Barchart Graphic -->
            <div class="mt-6 flex h-48 items-end gap-2 border-b border-default pb-2">
              <div
                v-for="item in monthlyTrends"
                :key="item.month_key"
                class="group relative flex flex-1 flex-col items-center gap-1"
              >
                <div
                  class="w-5 rounded-t bg-amber-500 transition-all duration-300 group-hover:bg-amber-400 sm:w-7"
                  :style="{ height: `${Math.max(4, (item.biaya_casual / maxBiayaCasual) * 160)}px` }"
                ></div>
                <span class="mt-1 rotate-45 text-[10px] text-muted sm:rotate-0 sm:text-xs">
                  {{ item.month_label.split(' ')[0] }}
                </span>

                <!-- Tooltip -->
                <div class="pointer-events-none absolute bottom-full mb-2 hidden w-40 rounded-lg bg-slate-900 p-2 text-xs text-white shadow-xl group-hover:block z-20">
                  <div class="font-bold">{{ item.month_label }}</div>
                  <div class="text-amber-300">Biaya Casual: {{ formatRp(item.biaya_casual) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bar Card 3: Jumlah Karyawan Resign setiap Bulan -->
          <div class="rounded-xl border border-default bg-card p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-highlighted">Jumlah Karyawan Resign per Bulan</h3>
                <p class="text-xs text-muted">Tren turnover dan terminasi karyawan 12 bulan terakhir</p>
              </div>
              <div class="rounded-lg bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-500">
                Turnover Rate
              </div>
            </div>

            <!-- Barchart Graphic -->
            <div class="mt-6 flex h-48 items-end gap-2 border-b border-default pb-2">
              <div
                v-for="item in monthlyTrends"
                :key="item.month_key"
                class="group relative flex flex-1 flex-col items-center gap-1"
              >
                <div
                  class="w-5 rounded-t bg-rose-500 transition-all duration-300 group-hover:bg-rose-400 sm:w-7"
                  :style="{ height: `${Math.max(4, (item.karyawan_resign / maxResign) * 160)}px` }"
                ></div>
                <span class="mt-1 rotate-45 text-[10px] text-muted sm:rotate-0 sm:text-xs">
                  {{ item.month_label.split(' ')[0] }}
                </span>

                <!-- Tooltip -->
                <div class="pointer-events-none absolute bottom-full mb-2 hidden w-36 rounded-lg bg-slate-900 p-2 text-xs text-white shadow-xl group-hover:block z-20">
                  <div class="font-bold">{{ item.month_label }}</div>
                  <div class="text-rose-300">Resign: {{ item.karyawan_resign }} Orang</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bar Card 4: Persentase Biaya Man Power dengan Omset per Bulan -->
          <div class="rounded-xl border border-default bg-card p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-highlighted">Persentase Biaya Man Power vs Omset</h3>
                <p class="text-xs text-muted">Rasio efisiensi biaya SDM terhadap pendapatan bisnis</p>
              </div>
              <div class="text-xs text-muted">
                Standar Ideal: <span class="font-bold text-emerald-500">≤ 25%</span>
              </div>
            </div>

            <!-- Barchart Graphic -->
            <div class="mt-6 flex h-48 items-end gap-2 border-b border-default pb-2">
              <div
                v-for="item in monthlyTrends"
                :key="item.month_key"
                class="group relative flex flex-1 flex-col items-center gap-1"
              >
                <div
                  class="w-5 rounded-t transition-all duration-300 sm:w-7"
                  :class="item.persentase_manpower_omset <= 25 ? 'bg-purple-500 group-hover:bg-purple-400' : 'bg-rose-500 group-hover:bg-rose-400'"
                  :style="{ height: `${Math.max(4, (item.persentase_manpower_omset / maxOmsetPercent) * 160)}px` }"
                ></div>
                <span class="mt-1 rotate-45 text-[10px] text-muted sm:rotate-0 sm:text-xs">
                  {{ item.month_label.split(' ')[0] }}
                </span>

                <!-- Tooltip -->
                <div class="pointer-events-none absolute bottom-full mb-2 hidden w-44 rounded-lg bg-slate-900 p-2 text-xs text-white shadow-xl group-hover:block z-20">
                  <div class="font-bold">{{ item.month_label }}</div>
                  <div class="text-purple-300">Rasio: {{ item.persentase_manpower_omset }}%</div>
                  <div class="text-slate-300">Omset: {{ formatRp(item.omset) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- 3. PIE CARDS (DISTRIBUSI & KOMPOSISI)      -->
      <!-- ========================================== -->
      <div>
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-muted">
            3. Distribusi & Komposisi Karyawan (Pie / Donut Cards)
          </h2>
        </div>

        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <!-- Pie 1: Salary Cash vs Transfer -->
          <div class="flex flex-col justify-between rounded-xl border border-default bg-card p-4 shadow-sm">
            <h3 class="text-xs font-semibold uppercase text-muted">Salary Cash & Transfer</h3>
            
            <div class="my-4 flex items-center justify-center">
              <svg viewBox="0 0 100 100" class="size-28">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" stroke-width="14" class="dark:stroke-slate-800" />
                <path
                  v-for="(slice, idx) in getDonutSlices(pieCards.payment_method)"
                  :key="idx"
                  :d="slice.pathData"
                  fill="transparent"
                  :stroke="slice.color"
                  stroke-width="14"
                />
              </svg>
            </div>

            <div class="space-y-1.5 border-t border-default pt-3 text-xs">
              <div
                v-for="item in pieCards.payment_method"
                :key="item.label"
                class="flex items-center justify-between"
              >
                <div class="flex items-center gap-1.5">
                  <span class="size-2 rounded-full" :style="{ backgroundColor: item.color }"></span>
                  <span class="text-muted">{{ item.label }}</span>
                </div>
                <span class="font-bold text-highlighted">{{ item.value }}</span>
              </div>
            </div>
          </div>

          <!-- Pie 2: Perbandingan Gender -->
          <div class="flex flex-col justify-between rounded-xl border border-default bg-card p-4 shadow-sm">
            <h3 class="text-xs font-semibold uppercase text-muted">Perbandingan Gender</h3>
            
            <div class="my-4 flex items-center justify-center">
              <svg viewBox="0 0 100 100" class="size-28">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" stroke-width="14" class="dark:stroke-slate-800" />
                <path
                  v-for="(slice, idx) in getDonutSlices(pieCards.gender)"
                  :key="idx"
                  :d="slice.pathData"
                  fill="transparent"
                  :stroke="slice.color"
                  stroke-width="14"
                />
              </svg>
            </div>

            <div class="space-y-1.5 border-t border-default pt-3 text-xs">
              <div
                v-for="item in pieCards.gender"
                :key="item.label"
                class="flex items-center justify-between"
              >
                <div class="flex items-center gap-1.5">
                  <span class="size-2 rounded-full" :style="{ backgroundColor: item.color }"></span>
                  <span class="text-muted">{{ item.label }}</span>
                </div>
                <span class="font-bold text-highlighted">{{ item.value }}</span>
              </div>
            </div>
          </div>

          <!-- Pie 3: Tingkat Pendidikan -->
          <div class="flex flex-col justify-between rounded-xl border border-default bg-card p-4 shadow-sm">
            <h3 class="text-xs font-semibold uppercase text-muted">Tingkat Pendidikan</h3>
            
            <div class="my-4 flex items-center justify-center">
              <svg viewBox="0 0 100 100" class="size-28">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" stroke-width="14" class="dark:stroke-slate-800" />
                <path
                  v-for="(slice, idx) in getDonutSlices(pieCards.education)"
                  :key="idx"
                  :d="slice.pathData"
                  fill="transparent"
                  :stroke="slice.color"
                  stroke-width="14"
                />
              </svg>
            </div>

            <div class="space-y-1.5 border-t border-default pt-3 text-xs">
              <div
                v-for="item in pieCards.education"
                :key="item.label"
                class="flex items-center justify-between"
              >
                <div class="flex items-center gap-1.5">
                  <span class="size-2 rounded-full" :style="{ backgroundColor: item.color }"></span>
                  <span class="truncate text-muted" :title="item.label">{{ item.label }}</span>
                </div>
                <span class="font-bold text-highlighted">{{ item.value }}</span>
              </div>
            </div>
          </div>

          <!-- Pie 4: Status Karyawan (Kontrak & Casual) -->
          <div class="flex flex-col justify-between rounded-xl border border-default bg-card p-4 shadow-sm">
            <h3 class="text-xs font-semibold uppercase text-muted">Status Karyawan</h3>
            
            <div class="my-4 flex items-center justify-center">
              <svg viewBox="0 0 100 100" class="size-28">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" stroke-width="14" class="dark:stroke-slate-800" />
                <path
                  v-for="(slice, idx) in getDonutSlices(pieCards.employment_status)"
                  :key="idx"
                  :d="slice.pathData"
                  fill="transparent"
                  :stroke="slice.color"
                  stroke-width="14"
                />
              </svg>
            </div>

            <div class="space-y-1.5 border-t border-default pt-3 text-xs">
              <div
                v-for="item in pieCards.employment_status"
                :key="item.label"
                class="flex items-center justify-between"
              >
                <div class="flex items-center gap-1.5">
                  <span class="size-2 rounded-full" :style="{ backgroundColor: item.color }"></span>
                  <span class="truncate text-muted" :title="item.label">{{ item.label }}</span>
                </div>
                <span class="font-bold text-highlighted">{{ item.value }}</span>
              </div>
            </div>
          </div>

          <!-- Pie 5: BPJS dan Non BPJS -->
          <div class="flex flex-col justify-between rounded-xl border border-default bg-card p-4 shadow-sm">
            <h3 class="text-xs font-semibold uppercase text-muted">BPJS vs Non BPJS</h3>
            
            <div class="my-4 flex items-center justify-center">
              <svg viewBox="0 0 100 100" class="size-28">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" stroke-width="14" class="dark:stroke-slate-800" />
                <path
                  v-for="(slice, idx) in getDonutSlices(pieCards.bpjs_coverage)"
                  :key="idx"
                  :d="slice.pathData"
                  fill="transparent"
                  :stroke="slice.color"
                  stroke-width="14"
                />
              </svg>
            </div>

            <div class="space-y-1.5 border-t border-default pt-3 text-xs">
              <div
                v-for="item in pieCards.bpjs_coverage"
                :key="item.label"
                class="flex items-center justify-between"
              >
                <div class="flex items-center gap-1.5">
                  <span class="size-2 rounded-full" :style="{ backgroundColor: item.color }"></span>
                  <span class="text-muted">{{ item.label }}</span>
                </div>
                <span class="font-bold text-highlighted">{{ item.value }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Input Omset Bulanan -->
    <UModal v-model:open="showRevenueModal">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-badge-dollar-sign" class="size-6 text-primary" />
              <h3 class="text-lg font-bold text-highlighted">Input Omset Bulanan</h3>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" @click="showRevenueModal = false" />
          </div>

          <p class="text-xs text-muted">
            Data omset digunakan untuk menghitung persentase rasio efisiensi biaya Man Power terhadap pendapatan perusahaan.
          </p>

          <div class="space-y-3 pt-2">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-semibold text-muted">Tahun</label>
                <UInput v-model.number="revenueForm.year" type="number" class="mt-1 w-full" />
              </div>
              <div>
                <label class="text-xs font-semibold text-muted">Bulan (1-12)</label>
                <UInput v-model.number="revenueForm.month" type="number" min="1" max="12" class="mt-1 w-full" />
              </div>
            </div>

            <div>
              <label class="text-xs font-semibold text-muted">Unit / Cabang</label>
              <UInput v-model="revenueForm.branch_or_unit" placeholder="Holding / All" class="mt-1 w-full" />
            </div>

            <div>
              <label class="text-xs font-semibold text-muted">Nilai Omset (Rp)</label>
              <UInput
                v-model.number="revenueForm.omset"
                type="number"
                min="0"
                step="100000"
                placeholder="Contoh: 500000000"
                class="mt-1 w-full text-lg font-bold"
              />
              <p class="mt-1 text-xs text-primary font-semibold">{{ formatRp(revenueForm.omset) }}</p>
            </div>

            <div>
              <label class="text-xs font-semibold text-muted">Catatan (Opsional)</label>
              <UTextarea v-model="revenueForm.notes" placeholder="Catatan omset..." rows="2" class="mt-1 w-full" />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4 border-t border-default">
            <UButton label="Batal" color="neutral" variant="ghost" @click="showRevenueModal = false" />
            <UButton
              label="Simpan Omset"
              color="primary"
              :loading="savingRevenue"
              icon="i-lucide-check"
              @click="handleSaveRevenue"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
