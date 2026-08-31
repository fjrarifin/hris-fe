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

    const r = 38
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
  <div class="payroll-dashboard space-y-6 pb-12">
    <!-- Hero Section (Clean Gradient Hero matching Recruitment Dashboard) -->
    <div class="dashboard-hero rounded-2xl p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
          <UIcon name="i-lucide-badge-percent" class="size-3.5" />
          <span>Compensation &amp; Payroll Analytics</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-highlighted mt-1">Dashboard Payroll</h1>
        <p class="mt-1 text-sm text-muted">
          Pantau kompensasi karyawan, tren biaya manpower bulanan, dan efisiensi pengeluaran gaji.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
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
          variant="outline"
          :loading="loading"
          label="Perbarui"
          @click="loadDashboard"
        />
      </div>
    </div>

    <!-- Filter Card -->
    <div class="dashboard-panel rounded-2xl p-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3">
          <div class="flex flex-col">
            <label class="text-xs font-medium text-muted">Periode Bulan</label>
            <div class="mt-1 flex items-center gap-2 rounded-lg border border-default bg-elevated/40 px-3 py-1.5">
              <UIcon name="i-lucide-calendar" class="size-4 text-muted" />
              <input
                v-model="selectedMonth"
                type="month"
                class="bg-transparent text-sm font-semibold text-highlighted focus:outline-none"
                @change="loadDashboard"
              />
            </div>
          </div>
          
          <div class="hidden sm:block h-9 w-px bg-default mt-4"></div>

          <div class="mt-4 flex items-center gap-2">
            <UButton
              icon="i-lucide-banknote"
              color="neutral"
              variant="soft"
              label="Input Omset Bulanan"
              @click="openRevenueModal"
            />
          </div>
        </div>

        <div class="flex items-center gap-2 self-end sm:self-center mt-2 sm:mt-0">
          <span class="text-xs text-muted">Total Karyawan Aktif: <strong class="text-highlighted">{{ scoreCards.total_karyawan || 0 }} Orang</strong></span>
        </div>
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
    <div v-if="loading && !dashboardData" class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="i in 8" :key="i" class="h-28 animate-pulse rounded-2xl bg-muted/20"></div>
    </div>

    <div v-else-if="dashboardData" class="space-y-6">
      <!-- ========================================== -->
      <!-- 1. SCORE CARDS (BRIGHT TINTED CARDS)       -->
      <!-- ========================================== -->
      <div>
        <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <!-- Total Gaji Bruto (Blue Tint) -->
          <div class="kpi-card kpi-card--blue group relative flex flex-col justify-between overflow-hidden rounded-2xl p-4 transition-all">
            <div class="flex items-start justify-between">
              <div>
                <span class="text-xs font-semibold kpi-label">Total Gaji Bruto</span>
                <div class="mt-1.5 text-2xl font-extrabold tracking-tight text-highlighted">
                  {{ formatRp(scoreCards.total_gaji_bruto) }}
                </div>
              </div>
              <div class="kpi-icon flex size-10 items-center justify-center rounded-xl">
                <UIcon name="i-lucide-coins" class="size-5" />
              </div>
            </div>
            <div class="mt-3 flex items-center justify-between text-xs text-muted">
              <span>Akumulasi gaji kotor periode ini</span>
              <UIcon name="i-lucide-arrow-up-right" class="size-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <!-- Total Gaji Netto (Emerald Tint) -->
          <div class="kpi-card kpi-card--emerald group relative flex flex-col justify-between overflow-hidden rounded-2xl p-4 transition-all">
            <div class="flex items-start justify-between">
              <div>
                <span class="text-xs font-semibold kpi-label">Total Gaji Netto</span>
                <div class="mt-1.5 text-2xl font-extrabold tracking-tight text-highlighted">
                  {{ formatRp(scoreCards.total_gaji_netto) }}
                </div>
              </div>
              <div class="kpi-icon flex size-10 items-center justify-center rounded-xl">
                <UIcon name="i-lucide-wallet" class="size-5" />
              </div>
            </div>
            <div class="mt-3 flex items-center justify-between text-xs text-muted">
              <span>Take Home Pay yang ditransfer</span>
              <UIcon name="i-lucide-arrow-up-right" class="size-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <!-- Jumlah Karyawan Regular (Indigo Tint) -->
          <div class="kpi-card kpi-card--indigo group relative flex flex-col justify-between overflow-hidden rounded-2xl p-4 transition-all">
            <div class="flex items-start justify-between">
              <div>
                <span class="text-xs font-semibold kpi-label">Karyawan Regular</span>
                <div class="mt-1.5 text-2xl font-extrabold tracking-tight text-highlighted">
                  {{ formatNumber(scoreCards.jumlah_karyawan_regular) }} <span class="text-xs font-normal text-muted">Orang</span>
                </div>
              </div>
              <div class="kpi-icon flex size-10 items-center justify-center rounded-xl">
                <UIcon name="i-lucide-users" class="size-5" />
              </div>
            </div>
            <div class="mt-3 flex items-center justify-between text-xs text-muted">
              <span>Tetap (PKWTT) &amp; Kontrak (PKWT)</span>
              <UIcon name="i-lucide-arrow-up-right" class="size-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <!-- Jumlah Karyawan Casual (Amber Tint) -->
          <div class="kpi-card kpi-card--amber group relative flex flex-col justify-between overflow-hidden rounded-2xl p-4 transition-all">
            <div class="flex items-start justify-between">
              <div>
                <span class="text-xs font-semibold kpi-label">Karyawan Casual</span>
                <div class="mt-1.5 text-2xl font-extrabold tracking-tight text-highlighted">
                  {{ formatNumber(scoreCards.jumlah_karyawan_casual) }} <span class="text-xs font-normal text-muted">Orang</span>
                </div>
              </div>
              <div class="kpi-icon flex size-10 items-center justify-center rounded-xl">
                <UIcon name="i-lucide-user-check" class="size-5" />
              </div>
            </div>
            <div class="mt-3 flex items-center justify-between text-xs text-muted">
              <span>Harian Lepas / Daily Worker / Freelance</span>
              <UIcon name="i-lucide-arrow-up-right" class="size-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <!-- Biaya Lembur (Orange Tint) -->
          <div class="kpi-card kpi-card--orange group relative flex flex-col justify-between overflow-hidden rounded-2xl p-4 transition-all">
            <div class="flex items-start justify-between">
              <div>
                <span class="text-xs font-semibold kpi-label">Biaya Lembur</span>
                <div class="mt-1.5 text-2xl font-extrabold tracking-tight text-highlighted">
                  {{ formatRp(scoreCards.biaya_lembur) }}
                </div>
              </div>
              <div class="kpi-icon flex size-10 items-center justify-center rounded-xl">
                <UIcon name="i-lucide-clock" class="size-5" />
              </div>
            </div>
            <div class="mt-3 flex items-center justify-between text-xs text-muted">
              <span>Upah over-time periode berjalan</span>
              <UIcon name="i-lucide-arrow-up-right" class="size-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <!-- Biaya BPJS (Teal Tint) -->
          <div class="kpi-card kpi-card--teal group relative flex flex-col justify-between overflow-hidden rounded-2xl p-4 transition-all">
            <div class="flex items-start justify-between">
              <div>
                <span class="text-xs font-semibold kpi-label">Biaya BPJS</span>
                <div class="mt-1.5 text-2xl font-extrabold tracking-tight text-highlighted">
                  {{ formatRp(scoreCards.biaya_bpjs) }}
                </div>
              </div>
              <div class="kpi-icon flex size-10 items-center justify-center rounded-xl">
                <UIcon name="i-lucide-shield-check" class="size-5" />
              </div>
            </div>
            <div class="mt-3 flex items-center justify-between text-xs text-muted">
              <span>BPJS Kesehatan &amp; Ketenagakerjaan</span>
              <UIcon name="i-lucide-arrow-up-right" class="size-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <!-- Biaya Potongan (Rose Tint) -->
          <div class="kpi-card kpi-card--rose group relative flex flex-col justify-between overflow-hidden rounded-2xl p-4 transition-all">
            <div class="flex items-start justify-between">
              <div>
                <span class="text-xs font-semibold kpi-label">Biaya Potongan</span>
                <div class="mt-1.5 text-2xl font-extrabold tracking-tight text-highlighted">
                  {{ formatRp(scoreCards.biaya_potongan) }}
                </div>
              </div>
              <div class="kpi-icon flex size-10 items-center justify-center rounded-xl">
                <UIcon name="i-lucide-receipt" class="size-5" />
              </div>
            </div>
            <div class="mt-3 flex items-center justify-between text-xs text-muted">
              <span>PPH21, Kasbon, Keterlambatan, Absensi</span>
              <UIcon name="i-lucide-arrow-up-right" class="size-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <!-- % Biaya Manpower / Omset (Purple Tint) -->
          <div class="kpi-card kpi-card--purple group relative flex flex-col justify-between overflow-hidden rounded-2xl p-4 transition-all">
            <div class="flex items-start justify-between">
              <div>
                <span class="text-xs font-semibold kpi-label">% Manpower / Omset</span>
                <div class="mt-1.5 flex items-baseline gap-2">
                  <span class="text-2xl font-extrabold tracking-tight text-highlighted">
                    {{ scoreCards.persentase_manpower_omset }}%
                  </span>
                  <span
                    class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    :class="scoreCards.persentase_manpower_omset <= 25 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'"
                  >
                    {{ scoreCards.persentase_manpower_omset <= 25 ? 'Aman' : 'Tinggi' }}
                  </span>
                </div>
              </div>
              <div class="kpi-icon flex size-10 items-center justify-center rounded-xl">
                <UIcon name="i-lucide-percent" class="size-5" />
              </div>
            </div>
            <div class="mt-3 flex items-center justify-between text-xs text-muted">
              <span>Omset: {{ formatRp(scoreCards.omset) }}</span>
              <UIcon name="i-lucide-arrow-up-right" class="size-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- 2. BAR CARDS (TREN 12 BULAN TERAKHIR)      -->
      <!-- ========================================== -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- Bar Card 1: Tren Total Gaji Bruto & Netto -->
        <div class="dashboard-panel rounded-2xl p-5">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-primary">Tren Penggajian</span>
              <h2 class="text-base font-bold text-highlighted mt-0.5">Total Gaji Bruto &amp; Netto per Bulan</h2>
              <p class="text-xs text-muted">Perbandingan pengeluaran bruto vs netto 12 bulan terakhir</p>
            </div>
            <div class="flex items-center gap-3 text-xs">
              <div class="flex items-center gap-1.5">
                <span class="size-2.5 rounded-full bg-blue-500"></span>
                <span class="text-muted">Bruto</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="size-2.5 rounded-full bg-emerald-500"></span>
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
              <div class="flex w-full items-end justify-center gap-1">
                <div
                  class="w-2.5 rounded-t bg-blue-500 transition-all duration-300 group-hover:bg-blue-400 sm:w-3.5"
                  :style="{ height: `${Math.max(4, (item.gaji_bruto / maxBrutoNetto) * 150)}px` }"
                ></div>
                <div
                  class="w-2.5 rounded-t bg-emerald-500 transition-all duration-300 group-hover:bg-emerald-400 sm:w-3.5"
                  :style="{ height: `${Math.max(4, (item.gaji_netto / maxBrutoNetto) * 150)}px` }"
                ></div>
              </div>
              <span class="mt-1 rotate-45 text-[10px] text-muted sm:rotate-0 sm:text-xs">
                {{ item.month_label.split(' ')[0] }}
              </span>

              <div class="pointer-events-none absolute bottom-full mb-2 hidden w-44 rounded-xl bg-slate-900 p-2.5 text-xs text-white shadow-xl group-hover:block z-20">
                <div class="font-bold text-slate-100">{{ item.month_label }}</div>
                <div class="text-blue-300 mt-1">Bruto: {{ formatRp(item.gaji_bruto) }}</div>
                <div class="text-emerald-300">Netto: {{ formatRp(item.gaji_netto) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bar Card 2: Tren Biaya Karyawan Casual per Bulan -->
        <div class="dashboard-panel rounded-2xl p-5">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-primary">Tenaga Casual</span>
              <h2 class="text-base font-bold text-highlighted mt-0.5">Total Biaya Casual setiap Bulan</h2>
              <p class="text-xs text-muted">Pengeluaran upah tenaga harian lepas / freelance</p>
            </div>
            <span class="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              12 Bulan Terakhir
            </span>
          </div>

          <div class="mt-6 flex h-48 items-end gap-2 border-b border-default pb-2">
            <div
              v-for="item in monthlyTrends"
              :key="item.month_key"
              class="group relative flex flex-1 flex-col items-center gap-1"
            >
              <div
                class="w-5 rounded-t bg-amber-500 transition-all duration-300 group-hover:bg-amber-400 sm:w-7"
                :style="{ height: `${Math.max(4, (item.biaya_casual / maxBiayaCasual) * 150)}px` }"
              ></div>
              <span class="mt-1 rotate-45 text-[10px] text-muted sm:rotate-0 sm:text-xs">
                {{ item.month_label.split(' ')[0] }}
              </span>

              <div class="pointer-events-none absolute bottom-full mb-2 hidden w-40 rounded-xl bg-slate-900 p-2.5 text-xs text-white shadow-xl group-hover:block z-20">
                <div class="font-bold text-slate-100">{{ item.month_label }}</div>
                <div class="text-amber-300 mt-1">Biaya: {{ formatRp(item.biaya_casual) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bar Card 3: Jumlah Karyawan Resign setiap Bulan -->
        <div class="dashboard-panel rounded-2xl p-5">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-primary">Turnover Rate</span>
              <h2 class="text-base font-bold text-highlighted mt-0.5">Jumlah Karyawan Resign per Bulan</h2>
              <p class="text-xs text-muted">Tren turnover dan terminasi karyawan 12 bulan terakhir</p>
            </div>
            <span class="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
              Karyawan Keluar
            </span>
          </div>

          <div class="mt-6 flex h-48 items-end gap-2 border-b border-default pb-2">
            <div
              v-for="item in monthlyTrends"
              :key="item.month_key"
              class="group relative flex flex-1 flex-col items-center gap-1"
            >
              <div
                class="w-5 rounded-t bg-rose-500 transition-all duration-300 group-hover:bg-rose-400 sm:w-7"
                :style="{ height: `${Math.max(4, (item.karyawan_resign / maxResign) * 150)}px` }"
              ></div>
              <span class="mt-1 rotate-45 text-[10px] text-muted sm:rotate-0 sm:text-xs">
                {{ item.month_label.split(' ')[0] }}
              </span>

              <div class="pointer-events-none absolute bottom-full mb-2 hidden w-36 rounded-xl bg-slate-900 p-2.5 text-xs text-white shadow-xl group-hover:block z-20">
                <div class="font-bold text-slate-100">{{ item.month_label }}</div>
                <div class="text-rose-300 mt-1">Resign: {{ item.karyawan_resign }} Orang</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bar Card 4: Persentase Biaya Man Power dengan Omset per Bulan -->
        <div class="dashboard-panel rounded-2xl p-5">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-primary">Rasio Finansial</span>
              <h2 class="text-base font-bold text-highlighted mt-0.5">Persentase Biaya Man Power vs Omset</h2>
              <p class="text-xs text-muted">Rasio efisiensi biaya SDM terhadap pendapatan bisnis</p>
            </div>
            <div class="text-xs text-muted">
              Standar Ideal: <strong class="text-emerald-500">≤ 25%</strong>
            </div>
          </div>

          <div class="mt-6 flex h-48 items-end gap-2 border-b border-default pb-2">
            <div
              v-for="item in monthlyTrends"
              :key="item.month_key"
              class="group relative flex flex-1 flex-col items-center gap-1"
            >
              <div
                class="w-5 rounded-t transition-all duration-300 sm:w-7"
                :class="item.persentase_manpower_omset <= 25 ? 'bg-purple-500 group-hover:bg-purple-400' : 'bg-rose-500 group-hover:bg-rose-400'"
                :style="{ height: `${Math.max(4, (item.persentase_manpower_omset / maxOmsetPercent) * 150)}px` }"
              ></div>
              <span class="mt-1 rotate-45 text-[10px] text-muted sm:rotate-0 sm:text-xs">
                {{ item.month_label.split(' ')[0] }}
              </span>

              <div class="pointer-events-none absolute bottom-full mb-2 hidden w-44 rounded-xl bg-slate-900 p-2.5 text-xs text-white shadow-xl group-hover:block z-20">
                <div class="font-bold text-slate-100">{{ item.month_label }}</div>
                <div class="text-purple-300 mt-1">Rasio: {{ item.persentase_manpower_omset }}%</div>
                <div class="text-slate-300">Omset: {{ formatRp(item.omset) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- 3. PIE CARDS (DISTRIBUSI & KOMPOSISI)      -->
      <!-- ========================================== -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <!-- Pie 1: Salary Cash vs Transfer -->
        <div class="dashboard-panel flex flex-col justify-between rounded-2xl p-4">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-primary">Metode Bayar</span>
            <h3 class="text-sm font-bold text-highlighted mt-0.5">Cash vs Transfer</h3>
          </div>
          
          <div class="my-3 flex items-center justify-center">
            <svg viewBox="0 0 100 100" class="size-24">
              <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" stroke-width="12" class="dark:stroke-slate-800" />
              <path
                v-for="(slice, idx) in getDonutSlices(pieCards.payment_method)"
                :key="idx"
                :d="slice.pathData"
                fill="transparent"
                :stroke="slice.color"
                stroke-width="12"
              />
            </svg>
          </div>

          <div class="space-y-1 border-t border-default pt-2.5 text-xs">
            <div
              v-for="item in pieCards.payment_method"
              :key="item.label"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-1.5">
                <span class="size-2 rounded-full" :style="{ backgroundColor: item.color }"></span>
                <span class="text-muted text-[11px]">{{ item.label }}</span>
              </div>
              <span class="font-bold text-highlighted text-[11px]">{{ item.value }}</span>
            </div>
          </div>
        </div>

        <!-- Pie 2: Perbandingan Gender -->
        <div class="dashboard-panel flex flex-col justify-between rounded-2xl p-4">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-primary">Demografi</span>
            <h3 class="text-sm font-bold text-highlighted mt-0.5">Gender Karyawan</h3>
          </div>
          
          <div class="my-3 flex items-center justify-center">
            <svg viewBox="0 0 100 100" class="size-24">
              <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" stroke-width="12" class="dark:stroke-slate-800" />
              <path
                v-for="(slice, idx) in getDonutSlices(pieCards.gender)"
                :key="idx"
                :d="slice.pathData"
                fill="transparent"
                :stroke="slice.color"
                stroke-width="12"
              />
            </svg>
          </div>

          <div class="space-y-1 border-t border-default pt-2.5 text-xs">
            <div
              v-for="item in pieCards.gender"
              :key="item.label"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-1.5">
                <span class="size-2 rounded-full" :style="{ backgroundColor: item.color }"></span>
                <span class="text-muted text-[11px]">{{ item.label }}</span>
              </div>
              <span class="font-bold text-highlighted text-[11px]">{{ item.value }}</span>
            </div>
          </div>
        </div>

        <!-- Pie 3: Tingkat Pendidikan -->
        <div class="dashboard-panel flex flex-col justify-between rounded-2xl p-4">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-primary">Kualifikasi</span>
            <h3 class="text-sm font-bold text-highlighted mt-0.5">Tingkat Pendidikan</h3>
          </div>
          
          <div class="my-3 flex items-center justify-center">
            <svg viewBox="0 0 100 100" class="size-24">
              <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" stroke-width="12" class="dark:stroke-slate-800" />
              <path
                v-for="(slice, idx) in getDonutSlices(pieCards.education)"
                :key="idx"
                :d="slice.pathData"
                fill="transparent"
                :stroke="slice.color"
                stroke-width="12"
              />
            </svg>
          </div>

          <div class="space-y-1 border-t border-default pt-2.5 text-xs">
            <div
              v-for="item in pieCards.education"
              :key="item.label"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-1.5 truncate">
                <span class="size-2 rounded-full flex-shrink-0" :style="{ backgroundColor: item.color }"></span>
                <span class="truncate text-muted text-[11px]" :title="item.label">{{ item.label }}</span>
              </div>
              <span class="font-bold text-highlighted text-[11px] ml-1.5">{{ item.value }}</span>
            </div>
          </div>
        </div>

        <!-- Pie 4: Status Karyawan -->
        <div class="dashboard-panel flex flex-col justify-between rounded-2xl p-4">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-primary">Ketenagakerjaan</span>
            <h3 class="text-sm font-bold text-highlighted mt-0.5">Status Karyawan</h3>
          </div>
          
          <div class="my-3 flex items-center justify-center">
            <svg viewBox="0 0 100 100" class="size-24">
              <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" stroke-width="12" class="dark:stroke-slate-800" />
              <path
                v-for="(slice, idx) in getDonutSlices(pieCards.employment_status)"
                :key="idx"
                :d="slice.pathData"
                fill="transparent"
                :stroke="slice.color"
                stroke-width="12"
              />
            </svg>
          </div>

          <div class="space-y-1 border-t border-default pt-2.5 text-xs">
            <div
              v-for="item in pieCards.employment_status"
              :key="item.label"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-1.5 truncate">
                <span class="size-2 rounded-full flex-shrink-0" :style="{ backgroundColor: item.color }"></span>
                <span class="truncate text-muted text-[11px]" :title="item.label">{{ item.label }}</span>
              </div>
              <span class="font-bold text-highlighted text-[11px] ml-1.5">{{ item.value }}</span>
            </div>
          </div>
        </div>

        <!-- Pie 5: BPJS dan Non BPJS -->
        <div class="dashboard-panel flex flex-col justify-between rounded-2xl p-4">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-primary">Kepatuhan</span>
            <h3 class="text-sm font-bold text-highlighted mt-0.5">BPJS Coverage</h3>
          </div>
          
          <div class="my-3 flex items-center justify-center">
            <svg viewBox="0 0 100 100" class="size-24">
              <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" stroke-width="12" class="dark:stroke-slate-800" />
              <path
                v-for="(slice, idx) in getDonutSlices(pieCards.bpjs_coverage)"
                :key="idx"
                :d="slice.pathData"
                fill="transparent"
                :stroke="slice.color"
                stroke-width="12"
              />
            </svg>
          </div>

          <div class="space-y-1 border-t border-default pt-2.5 text-xs">
            <div
              v-for="item in pieCards.bpjs_coverage"
              :key="item.label"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-1.5">
                <span class="size-2 rounded-full" :style="{ backgroundColor: item.color }"></span>
                <span class="text-muted text-[11px]">{{ item.label }}</span>
              </div>
              <span class="font-bold text-highlighted text-[11px]">{{ item.value }}</span>
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
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-primary">Pencatatan Keuangan</span>
              <h3 class="text-lg font-bold text-highlighted mt-0.5">Input Omset Bulanan</h3>
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
                class="mt-1 w-full text-base font-bold"
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

<style scoped>
/* Scoped Theme Styles: Bright in Light Mode, Dark in Dark Mode */
.dashboard-hero {
  border: 1px solid #bfdbfe;
  background:
    radial-gradient(circle at 90% 0%, rgba(59, 130, 246, 0.12), transparent 40%),
    linear-gradient(135deg, rgba(239, 246, 255, 0.95), #ffffff 60%, #f8fafc);
  box-shadow: 0 4px 20px -2px rgba(37, 99, 235, 0.06);
}

.dashboard-panel {
  border: 1px solid #e2e8f0;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
}

/* Light Theme KPI Tinted Cards */
.kpi-card {
  border: 1px solid var(--kpi-border, #e2e8f0);
  background: var(--kpi-bg, #ffffff);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
}

.kpi-card:hover {
  box-shadow: 0 8px 20px -4px rgba(37, 99, 235, 0.1);
}

.kpi-card--blue {
  --kpi-bg: linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%);
  --kpi-border: #bfdbfe;
}
.kpi-card--blue .kpi-icon {
  background: #dbeafe;
  color: #1d4ed8;
}
.kpi-card--blue .kpi-label {
  color: #1d4ed8;
}

.kpi-card--emerald {
  --kpi-bg: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
  --kpi-border: #a7f3d0;
}
.kpi-card--emerald .kpi-icon {
  background: #d1fae5;
  color: #047857;
}
.kpi-card--emerald .kpi-label {
  color: #047857;
}

.kpi-card--indigo {
  --kpi-bg: linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%);
  --kpi-border: #c7d2fe;
}
.kpi-card--indigo .kpi-icon {
  background: #e0e7ff;
  color: #4338ca;
}
.kpi-card--indigo .kpi-label {
  color: #4338ca;
}

.kpi-card--amber {
  --kpi-bg: linear-gradient(135deg, #fffbeb 0%, #ffffff 100%);
  --kpi-border: #fde68a;
}
.kpi-card--amber .kpi-icon {
  background: #fef3c7;
  color: #b45309;
}
.kpi-card--amber .kpi-label {
  color: #b45309;
}

.kpi-card--orange {
  --kpi-bg: linear-gradient(135deg, #fff7ed 0%, #ffffff 100%);
  --kpi-border: #fed7aa;
}
.kpi-card--orange .kpi-icon {
  background: #ffedd5;
  color: #c2410c;
}
.kpi-card--orange .kpi-label {
  color: #c2410c;
}

.kpi-card--teal {
  --kpi-bg: linear-gradient(135deg, #f0fdfa 0%, #ffffff 100%);
  --kpi-border: #99f6e4;
}
.kpi-card--teal .kpi-icon {
  background: #ccfbf1;
  color: #0f766e;
}
.kpi-card--teal .kpi-label {
  color: #0f766e;
}

.kpi-card--rose {
  --kpi-bg: linear-gradient(135deg, #fff1f2 0%, #ffffff 100%);
  --kpi-border: #fecdd3;
}
.kpi-card--rose .kpi-icon {
  background: #ffe4e6;
  color: #be123c;
}
.kpi-card--rose .kpi-label {
  color: #be123c;
}

.kpi-card--purple {
  --kpi-bg: linear-gradient(135deg, #faf5ff 0%, #ffffff 100%);
  --kpi-border: #e9d5ff;
}
.kpi-card--purple .kpi-icon {
  background: #f3e8ff;
  color: #7e22ce;
}
.kpi-card--purple .kpi-label {
  color: #7e22ce;
}

/* Dark Mode Overrides (Only Active When .portal-dark is on) */
:global(.portal-dark) .payroll-dashboard .dashboard-hero {
  border-color: rgba(96, 165, 250, 0.3);
  background:
    radial-gradient(circle at 90% 0%, rgba(59, 130, 246, 0.15), transparent 40%),
    linear-gradient(135deg, rgba(30, 41, 59, 0.9), #111827 70%);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
}

:global(.portal-dark) .payroll-dashboard .dashboard-panel {
  border-color: #334155;
  background: #182235;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.25);
}

:global(.portal-dark) .payroll-dashboard .kpi-card {
  border-color: #334155;
  background: #182235;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
}

:global(.portal-dark) .payroll-dashboard .kpi-card:hover {
  border-color: rgba(96, 165, 250, 0.4);
}

:global(.portal-dark) .payroll-dashboard .kpi-card--blue {
  --kpi-bg: linear-gradient(135deg, rgba(30, 58, 138, 0.3) 0%, #182235 100%);
  --kpi-border: rgba(96, 165, 250, 0.35);
}
:global(.portal-dark) .payroll-dashboard .kpi-card--blue .kpi-icon {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
}
:global(.portal-dark) .payroll-dashboard .kpi-card--blue .kpi-label {
  color: #93c5fd;
}

:global(.portal-dark) .payroll-dashboard .kpi-card--emerald {
  --kpi-bg: linear-gradient(135deg, rgba(6, 78, 59, 0.3) 0%, #182235 100%);
  --kpi-border: rgba(52, 211, 153, 0.35);
}
:global(.portal-dark) .payroll-dashboard .kpi-card--emerald .kpi-icon {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
}
:global(.portal-dark) .payroll-dashboard .kpi-card--emerald .kpi-label {
  color: #6ee7b7;
}

:global(.portal-dark) .payroll-dashboard .kpi-card--indigo {
  --kpi-bg: linear-gradient(135deg, rgba(49, 46, 129, 0.3) 0%, #182235 100%);
  --kpi-border: rgba(129, 140, 248, 0.35);
}
:global(.portal-dark) .payroll-dashboard .kpi-card--indigo .kpi-icon {
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
}
:global(.portal-dark) .payroll-dashboard .kpi-card--indigo .kpi-label {
  color: #a5b4fc;
}

:global(.portal-dark) .payroll-dashboard .kpi-card--amber {
  --kpi-bg: linear-gradient(135deg, rgba(120, 53, 15, 0.3) 0%, #182235 100%);
  --kpi-border: rgba(251, 191, 36, 0.35);
}
:global(.portal-dark) .payroll-dashboard .kpi-card--amber .kpi-icon {
  background: rgba(245, 158, 11, 0.2);
  color: #fde68a;
}
:global(.portal-dark) .payroll-dashboard .kpi-card--amber .kpi-label {
  color: #fde68a;
}

:global(.portal-dark) .payroll-dashboard .kpi-card--orange {
  --kpi-bg: linear-gradient(135deg, rgba(124, 45, 18, 0.3) 0%, #182235 100%);
  --kpi-border: rgba(251, 146, 60, 0.35);
}
:global(.portal-dark) .payroll-dashboard .kpi-card--orange .kpi-icon {
  background: rgba(234, 88, 12, 0.2);
  color: #fdba74;
}
:global(.portal-dark) .payroll-dashboard .kpi-card--orange .kpi-label {
  color: #fdba74;
}

:global(.portal-dark) .payroll-dashboard .kpi-card--teal {
  --kpi-bg: linear-gradient(135deg, rgba(19, 78, 74, 0.3) 0%, #182235 100%);
  --kpi-border: rgba(45, 212, 191, 0.35);
}
:global(.portal-dark) .payroll-dashboard .kpi-card--teal .kpi-icon {
  background: rgba(20, 184, 166, 0.2);
  color: #5eead4;
}
:global(.portal-dark) .payroll-dashboard .kpi-card--teal .kpi-label {
  color: #5eead4;
}

:global(.portal-dark) .payroll-dashboard .kpi-card--rose {
  --kpi-bg: linear-gradient(135deg, rgba(136, 19, 55, 0.3) 0%, #182235 100%);
  --kpi-border: rgba(251, 113, 133, 0.35);
}
:global(.portal-dark) .payroll-dashboard .kpi-card--rose .kpi-icon {
  background: rgba(244, 63, 94, 0.2);
  color: #fda4af;
}
:global(.portal-dark) .payroll-dashboard .kpi-card--rose .kpi-label {
  color: #fda4af;
}

:global(.portal-dark) .payroll-dashboard .kpi-card--purple {
  --kpi-bg: linear-gradient(135deg, rgba(88, 28, 135, 0.3) 0%, #182235 100%);
  --kpi-border: rgba(192, 132, 252, 0.35);
}
:global(.portal-dark) .payroll-dashboard .kpi-card--purple .kpi-icon {
  background: rgba(168, 85, 247, 0.2);
  color: #d8b4fe;
}
:global(.portal-dark) .payroll-dashboard .kpi-card--purple .kpi-label {
  color: #d8b4fe;
}
</style>
