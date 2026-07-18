<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getHrRecruitmentInterviewAgenda } from '../services/hrService'
import { apiError } from '../utils/formatters'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const errorMessage = ref('')
const agenda = ref({ items: [], summary: {} })
const selectedItem = ref(null)
const layout = ref(route.query.layout === 'list' ? 'list' : 'calendar')

const currentMonth = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, 7)
const filters = reactive({
  month: String(route.query.month || currentMonth),
  type: String(route.query.type || ''),
  status: String(route.query.status || ''),
  search: String(route.query.search || ''),
})

const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const statusMeta = {
  upcoming: { label: 'Akan Datang', icon: 'i-lucide-clock-3' },
  overdue: { label: 'Belum Ditandai Selesai', icon: 'i-lucide-circle-alert' },
  completed: { label: 'Selesai', icon: 'i-lucide-circle-check-big' },
}

function localDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function agendaDateKey(value) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

const selectedMonthDate = computed(() => new Date(`${filters.month}-01T00:00:00`))
const monthLabel = computed(() =>
  new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
    selectedMonthDate.value,
  ),
)

const calendarRange = computed(() => {
  const first = selectedMonthDate.value
  const start = new Date(first)
  start.setDate(1 - ((first.getDay() + 6) % 7))
  const end = new Date(start)
  end.setDate(start.getDate() + 41)
  return { start, end }
})

const calendarDays = computed(() => {
  const itemsByDate = new Map()
  for (const item of agenda.value.items || []) {
    const key = agendaDateKey(item.scheduled_at)
    if (!itemsByDate.has(key)) itemsByDate.set(key, [])
    itemsByDate.get(key).push(item)
  }

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarRange.value.start)
    date.setDate(date.getDate() + index)
    const key = localDateKey(date)
    return {
      key,
      date,
      day: date.getDate(),
      currentMonth: date.getMonth() === selectedMonthDate.value.getMonth(),
      today: key === localDateKey(new Date()),
      items: itemsByDate.get(key) || [],
    }
  })
})

const groupedList = computed(() => {
  const groups = new Map()
  for (const item of agenda.value.items || []) {
    const key = agendaDateKey(item.scheduled_at)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }
  return [...groups.entries()].map(([date, items]) => ({ date, items }))
})

const summary = computed(() => agenda.value.summary || {})

function monthRange() {
  const start = new Date(
    selectedMonthDate.value.getFullYear(),
    selectedMonthDate.value.getMonth(),
    1,
  )
  const end = new Date(
    selectedMonthDate.value.getFullYear(),
    selectedMonthDate.value.getMonth() + 1,
    0,
  )
  return { from: localDateKey(start), to: localDateKey(end) }
}

async function loadAgenda() {
  loading.value = true
  errorMessage.value = ''
  try {
    const range =
      layout.value === 'calendar'
        ? {
            from: localDateKey(calendarRange.value.start),
            to: localDateKey(calendarRange.value.end),
          }
        : monthRange()
    const response = await getHrRecruitmentInterviewAgenda({
      ...range,
      ...(filters.type && { type: filters.type }),
      ...(filters.status && { status: filters.status }),
      ...(filters.search.trim() && { search: filters.search.trim() }),
    })
    agenda.value = response.data
    const currentKey = selectedItem.value?.key
    selectedItem.value =
      response.data.items.find((item) => item.key === currentKey) ||
      response.data.items.find((item) => item.status === 'upcoming') ||
      response.data.items[0] ||
      null
    router.replace({
      query: {
        month: filters.month,
        layout: layout.value,
        ...(filters.type && { type: filters.type }),
        ...(filters.status && { status: filters.status }),
        ...(filters.search.trim() && { search: filters.search.trim() }),
      },
    })
  } catch (error) {
    errorMessage.value = apiError(error, 'Agenda interview gagal dimuat.')
  } finally {
    loading.value = false
  }
}

function changeMonth(offset) {
  const date = new Date(selectedMonthDate.value)
  date.setMonth(date.getMonth() + offset)
  filters.month = localDateKey(date).slice(0, 7)
}

function setLayout(value) {
  if (layout.value === value) return
  layout.value = value
  loadAgenda()
}

function resetFilters() {
  filters.type = ''
  filters.status = ''
  filters.search = ''
  loadAgenda()
}

function openCandidate(item = selectedItem.value) {
  if (!item) return
  router.push({
    name: 'hr-recruitment-candidates',
    query: { candidate: item.candidate_id, status: item.candidate_stage },
  })
}

function backToDashboard() {
  router.push({ name: 'hr-recruitment-dashboard', query: { month: filters.month } })
}

function formatDateTime(value) {
  if (!value) return '-'
  return (
    new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    })
      .format(new Date(value))
      .replace(/ pukul /, ', ') + ' WIB'
  )
}

function formatTime(value) {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  })
    .format(new Date(value))
    .replace('.', ':')
}

function formatGroupDate(value) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function locationText(item) {
  return item.interview_mode === 'online'
    ? item.meet_link || 'Link meeting belum tersedia'
    : item.location || 'Lokasi belum ditentukan'
}

watch(
  () => filters.month,
  (value, oldValue) => {
    if (value && value !== oldValue) loadAgenda()
  },
)
onMounted(loadAgenda)
</script>

<template>
  <section class="agenda-page">
    <header class="agenda-hero">
      <div>
        <button type="button" class="back-link" @click="backToDashboard">
          <UIcon name="i-lucide-arrow-left" class="size-4" /> Dashboard Recruitment
        </button>
        <span class="eyebrow">Recruitment Interview</span>
        <h1>Agenda Interview</h1>
        <p>Seluruh jadwal wawancara HR dan wawancara user dalam satu kalender operasional.</p>
      </div>
      <UButton icon="i-lucide-refresh-cw" label="Perbarui" :loading="loading" @click="loadAgenda" />
    </header>

    <div v-if="errorMessage" class="error-banner">
      <UIcon name="i-lucide-circle-alert" class="size-5" /><span>{{ errorMessage }}</span
      ><UButton size="xs" variant="ghost" label="Coba Lagi" @click="loadAgenda" />
    </div>

    <div class="summary-grid">
      <article>
        <span class="summary-icon is-blue"><UIcon name="i-lucide-calendar-days" /></span>
        <p>
          Total Agenda<strong>{{ summary.total || 0 }}</strong>
        </p>
      </article>
      <article>
        <span class="summary-icon is-indigo"><UIcon name="i-lucide-messages-square" /></span>
        <p>
          Interview HR<strong>{{ summary.hr || 0 }}</strong>
        </p>
      </article>
      <article>
        <span class="summary-icon is-violet"><UIcon name="i-lucide-users-round" /></span>
        <p>
          Interview User<strong>{{ summary.user || 0 }}</strong>
        </p>
      </article>
      <article>
        <span class="summary-icon is-amber"><UIcon name="i-lucide-clock-3" /></span>
        <p>
          Akan Datang<strong>{{ summary.upcoming || 0 }}</strong>
        </p>
      </article>
      <article>
        <span class="summary-icon is-emerald"><UIcon name="i-lucide-circle-check-big" /></span>
        <p>
          Sudah Selesai<strong>{{ summary.completed || 0 }}</strong>
        </p>
      </article>
    </div>

    <article class="agenda-shell">
      <div class="agenda-toolbar">
        <div class="month-navigation">
          <UButton
            size="sm"
            variant="soft"
            color="neutral"
            icon="i-lucide-chevron-left"
            aria-label="Bulan sebelumnya"
            @click="changeMonth(-1)"
          />
          <label><span>Periode Agenda</span><input v-model="filters.month" type="month" /></label>
          <UButton
            size="sm"
            variant="soft"
            color="neutral"
            icon="i-lucide-chevron-right"
            aria-label="Bulan berikutnya"
            @click="changeMonth(1)"
          />
        </div>
        <label class="search-box"
          ><UIcon name="i-lucide-search" class="size-4" /><input
            v-model="filters.search"
            type="search"
            placeholder="Cari kandidat, lowongan, PIC, lokasi..."
            @keyup.enter="loadAgenda"
        /></label>
        <select v-model="filters.type" aria-label="Jenis interview" @change="loadAgenda">
          <option value="">Semua interview</option>
          <option value="hr">Wawancara HR</option>
          <option value="user">Wawancara User</option>
        </select>
        <select v-model="filters.status" aria-label="Status agenda" @change="loadAgenda">
          <option value="">Semua status</option>
          <option value="upcoming">Akan datang</option>
          <option value="overdue">Belum ditandai selesai</option>
          <option value="completed">Selesai</option>
        </select>
        <UButton
          size="sm"
          variant="ghost"
          color="neutral"
          icon="i-lucide-rotate-ccw"
          label="Reset"
          @click="resetFilters"
        />
      </div>

      <div class="view-heading">
        <div>
          <strong>{{ monthLabel }}</strong
          ><small>{{ summary.total || 0 }} agenda sesuai filter</small>
        </div>
        <div class="layout-switcher" aria-label="Pilihan layout">
          <button
            type="button"
            :class="{ active: layout === 'calendar' }"
            @click="setLayout('calendar')"
          >
            <UIcon name="i-lucide-calendar-days" class="size-4" /> Kalender
          </button>
          <button type="button" :class="{ active: layout === 'list' }" @click="setLayout('list')">
            <UIcon name="i-lucide-list" class="size-4" /> Daftar
          </button>
        </div>
      </div>

      <div class="agenda-content">
        <div class="agenda-main">
          <div v-if="loading && !agenda.items.length" class="loading-state">
            <UIcon name="i-lucide-loader-circle" class="size-7 animate-spin" /><span
              >Memuat agenda...</span
            >
          </div>

          <template v-else-if="layout === 'calendar'">
            <div class="calendar-weekdays">
              <span v-for="day in weekdays" :key="day">{{ day }}</span>
            </div>
            <div class="calendar-grid">
              <div
                v-for="day in calendarDays"
                :key="day.key"
                class="calendar-day"
                :class="{ muted: !day.currentMonth, today: day.today }"
              >
                <span class="day-number">{{ day.day }}</span>
                <div class="day-events">
                  <button
                    v-for="item in day.items.slice(0, 3)"
                    :key="item.key"
                    type="button"
                    class="calendar-event"
                    :class="[
                      `is-${item.kind}`,
                      `is-${item.status}`,
                      { selected: selectedItem?.key === item.key },
                    ]"
                    @click="selectedItem = item"
                  >
                    <span>{{ formatTime(item.scheduled_at) }}</span
                    ><strong>{{ item.candidate_name }}</strong
                    ><small>{{ item.kind === 'hr' ? 'HR' : `User T${item.round}` }}</small>
                  </button>
                  <button
                    v-if="day.items.length > 3"
                    type="button"
                    class="more-events"
                    @click="selectedItem = day.items[3]"
                  >
                    +{{ day.items.length - 3 }} agenda lainnya
                  </button>
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <div v-if="groupedList.length" class="agenda-list">
              <section v-for="group in groupedList" :key="group.date" class="agenda-list-group">
                <header>
                  <span>{{ new Date(`${group.date}T00:00:00`).getDate() }}</span>
                  <div>
                    <strong>{{ formatGroupDate(group.date) }}</strong
                    ><small>{{ group.items.length }} agenda</small>
                  </div>
                </header>
                <button
                  v-for="item in group.items"
                  :key="item.key"
                  type="button"
                  class="agenda-list-row"
                  :class="{ selected: selectedItem?.key === item.key }"
                  @click="selectedItem = item"
                >
                  <time>{{ formatTime(item.scheduled_at) }}<small>WIB</small></time>
                  <span class="kind-icon" :class="`is-${item.kind}`"
                    ><UIcon
                      :name="
                        item.kind === 'hr' ? 'i-lucide-messages-square' : 'i-lucide-users-round'
                      "
                      class="size-4"
                  /></span>
                  <span class="list-candidate"
                    ><strong>{{ item.candidate_name }}</strong
                    ><small>{{ item.vacancy }} · {{ item.label }}</small></span
                  >
                  <span class="list-location"
                    ><strong>{{ item.interview_mode }}</strong
                    ><small>{{ locationText(item) }}</small></span
                  >
                  <span class="list-interviewers"
                    ><strong>Pewawancara</strong
                    ><small>{{ item.interviewers.join(', ') || item.pic || '-' }}</small></span
                  >
                  <span class="status-badge" :class="`is-${item.status}`"
                    ><UIcon :name="statusMeta[item.status].icon" class="size-3.5" />{{
                      statusMeta[item.status].label
                    }}</span
                  >
                  <UIcon name="i-lucide-chevron-right" class="size-4" />
                </button>
              </section>
            </div>
            <div v-else class="empty-state">
              <UIcon name="i-lucide-calendar-x-2" class="size-9" /><strong>Tidak ada agenda</strong>
              <p>Tidak ditemukan jadwal interview pada periode dan filter ini.</p>
            </div>
          </template>
        </div>

        <aside class="agenda-detail">
          <template v-if="selectedItem">
            <div class="detail-heading">
              <span class="kind-icon" :class="`is-${selectedItem.kind}`"
                ><UIcon
                  :name="
                    selectedItem.kind === 'hr' ? 'i-lucide-messages-square' : 'i-lucide-users-round'
                  "
                  class="size-5"
              /></span>
              <div>
                <small>Detail Agenda</small>
                <h2>{{ selectedItem.label }}</h2>
              </div>
              <span class="status-badge" :class="`is-${selectedItem.status}`">{{
                statusMeta[selectedItem.status].label
              }}</span>
            </div>
            <div class="candidate-block">
              <span>{{
                selectedItem.candidate_name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)
              }}</span>
              <div>
                <strong>{{ selectedItem.candidate_name }}</strong
                ><small>{{ selectedItem.vacancy }}</small>
              </div>
            </div>
            <dl class="detail-list">
              <div>
                <dt><UIcon name="i-lucide-calendar-clock" /> Jadwal</dt>
                <dd>{{ formatDateTime(selectedItem.scheduled_at) }}</dd>
              </div>
              <div>
                <dt>
                  <UIcon
                    :name="
                      selectedItem.interview_mode === 'online'
                        ? 'i-lucide-video'
                        : 'i-lucide-map-pin'
                    "
                  />
                  Tipe & Lokasi
                </dt>
                <dd>
                  <strong class="capitalize">{{ selectedItem.interview_mode }}</strong
                  ><a
                    v-if="selectedItem.interview_mode === 'online' && selectedItem.meet_link"
                    :href="selectedItem.meet_link"
                    target="_blank"
                    >{{ selectedItem.meet_link }}</a
                  ><span v-else>{{ selectedItem.location || '-' }}</span>
                </dd>
              </div>
              <div>
                <dt><UIcon name="i-lucide-users-round" /> Pewawancara</dt>
                <dd>{{ selectedItem.interviewers.join(', ') || selectedItem.pic || '-' }}</dd>
              </div>
              <div>
                <dt><UIcon name="i-lucide-user-round-cog" /> PIC Recruitment</dt>
                <dd>{{ selectedItem.pic || '-' }}</dd>
              </div>
              <div>
                <dt><UIcon name="i-lucide-building-2" /> Organisasi</dt>
                <dd>
                  {{
                    [selectedItem.department, selectedItem.unit].filter(Boolean).join(' · ') || '-'
                  }}
                </dd>
              </div>
              <div>
                <dt><UIcon name="i-lucide-mail" /> Kontak Kandidat</dt>
                <dd>
                  <span>{{ selectedItem.candidate_email || '-' }}</span
                  ><span>{{ selectedItem.candidate_phone || '-' }}</span>
                </dd>
              </div>
              <div>
                <dt><UIcon name="i-lucide-send" /> Notifikasi</dt>
                <dd>
                  <span>Email: {{ selectedItem.email_sent_at ? 'Terkirim' : 'Belum dikirim' }}</span
                  ><span
                    >WhatsApp: {{ selectedItem.wa_sent_at ? 'Terkirim' : 'Belum dikirim' }}</span
                  >
                </dd>
              </div>
              <div v-if="selectedItem.completed_at">
                <dt><UIcon name="i-lucide-circle-check-big" /> Selesai</dt>
                <dd>{{ formatDateTime(selectedItem.completed_at) }}</dd>
              </div>
            </dl>
            <UButton
              block
              icon="i-lucide-arrow-up-right"
              label="Buka Detail Kandidat"
              @click="openCandidate()"
            />
          </template>
          <div v-else class="detail-empty">
            <UIcon name="i-lucide-calendar-search" class="size-8" /><strong
              >Pilih salah satu agenda</strong
            >
            <p>Detail jadwal akan ditampilkan di sini.</p>
          </div>
        </aside>
      </div>
    </article>
  </section>
</template>

<style scoped>
.agenda-page {
  display: grid;
  gap: 18px;
  color: var(--ui-text-highlighted);
}
.agenda-hero,
.agenda-shell,
.summary-grid article {
  border: 1px solid var(--ui-border);
  background: var(--ui-bg);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}
.agenda-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 24px;
  border-radius: 18px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ui-primary) 9%, var(--ui-bg)),
    var(--ui-bg) 58%
  );
}
.back-link {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 14px;
  color: var(--ui-primary);
  font-size: 12px;
  font-weight: 700;
}
.back-link:hover {
  text-decoration: underline;
}
.eyebrow {
  color: var(--ui-primary);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.agenda-hero h1 {
  margin-top: 5px;
  font-size: 25px;
  font-weight: 850;
  letter-spacing: -0.025em;
}
.agenda-hero p {
  margin-top: 5px;
  color: var(--ui-text-muted);
  font-size: 13px;
}
.error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, #ef4444 30%, var(--ui-border));
  border-radius: 12px;
  background: color-mix(in srgb, #ef4444 8%, var(--ui-bg));
  color: #dc2626;
}
.error-banner span {
  flex: 1;
  font-size: 12px;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}
.summary-grid article {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px;
  border-radius: 14px;
}
.summary-grid p {
  display: flex;
  flex-direction: column;
  color: var(--ui-text-muted);
  font-size: 11px;
}
.summary-grid strong {
  margin-top: 3px;
  color: var(--ui-text-highlighted);
  font-size: 22px;
  line-height: 1;
}
.summary-icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  place-items: center;
  border-radius: 11px;
  font-size: 19px;
}
.is-blue {
  background: color-mix(in srgb, #2563eb 14%, var(--ui-bg));
  color: #2563eb;
}
.is-indigo {
  background: color-mix(in srgb, #4f46e5 14%, var(--ui-bg));
  color: #4f46e5;
}
.is-violet {
  background: color-mix(in srgb, #9333ea 14%, var(--ui-bg));
  color: #9333ea;
}
.is-amber {
  background: color-mix(in srgb, #d97706 14%, var(--ui-bg));
  color: #d97706;
}
.is-emerald {
  background: color-mix(in srgb, #059669 14%, var(--ui-bg));
  color: #059669;
}
.agenda-shell {
  overflow: hidden;
  border-radius: 17px;
}
.agenda-toolbar {
  display: grid;
  grid-template-columns: auto minmax(230px, 1fr) 170px 190px auto;
  align-items: end;
  gap: 9px;
  padding: 15px;
  border-bottom: 1px solid var(--ui-border);
}
.month-navigation {
  display: flex;
  align-items: flex-end;
  gap: 6px;
}
.month-navigation label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.month-navigation label span {
  color: var(--ui-text-muted);
  font-size: 9px;
  font-weight: 750;
}
.agenda-toolbar input,
.agenda-toolbar select {
  height: 36px;
  border: 1px solid var(--ui-border);
  border-radius: 9px;
  background: var(--ui-bg);
  padding: 0 10px;
  color: var(--ui-text-highlighted);
  font-size: 11px;
  outline: none;
}
.agenda-toolbar input:focus,
.agenda-toolbar select:focus {
  border-color: var(--ui-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ui-primary) 12%, transparent);
}
.search-box {
  position: relative;
}
.search-box svg {
  position: absolute;
  top: 10px;
  left: 11px;
  color: var(--ui-text-dimmed);
}
.search-box input {
  width: 100%;
  padding-left: 34px;
}
.view-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 12px 15px;
  border-bottom: 1px solid var(--ui-border);
  background: color-mix(in srgb, var(--ui-bg-muted) 40%, var(--ui-bg));
}
.view-heading > div:first-child {
  display: flex;
  flex-direction: column;
}
.view-heading strong {
  font-size: 14px;
  text-transform: capitalize;
}
.view-heading small {
  margin-top: 2px;
  color: var(--ui-text-muted);
  font-size: 10px;
}
.layout-switcher {
  display: flex;
  padding: 3px;
  border: 1px solid var(--ui-border);
  border-radius: 9px;
  background: var(--ui-bg);
}
.layout-switcher button {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 6px;
  color: var(--ui-text-muted);
  font-size: 10px;
  font-weight: 700;
}
.layout-switcher button.active {
  background: color-mix(in srgb, var(--ui-primary) 12%, var(--ui-bg));
  color: var(--ui-primary);
}
.agenda-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  min-height: 620px;
}
.agenda-main {
  min-width: 0;
  border-right: 1px solid var(--ui-border);
}
.loading-state,
.empty-state,
.detail-empty {
  display: grid;
  min-height: 380px;
  place-items: center;
  align-content: center;
  gap: 7px;
  color: var(--ui-primary);
}
.loading-state span,
.empty-state p,
.detail-empty p {
  color: var(--ui-text-muted);
  font-size: 11px;
}
.empty-state strong,
.detail-empty strong {
  color: var(--ui-text-highlighted);
  font-size: 13px;
}
.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid var(--ui-border);
  background: color-mix(in srgb, var(--ui-bg-muted) 36%, var(--ui-bg));
}
.calendar-weekdays span {
  padding: 8px;
  color: var(--ui-text-muted);
  font-size: 9px;
  font-weight: 800;
  text-align: center;
  text-transform: uppercase;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}
.calendar-day {
  position: relative;
  min-width: 0;
  min-height: 112px;
  padding: 7px;
  border-right: 1px solid var(--ui-border);
  border-bottom: 1px solid var(--ui-border);
  background: var(--ui-bg);
}
.calendar-day:nth-child(7n) {
  border-right: 0;
}
.calendar-day.muted {
  background: color-mix(in srgb, var(--ui-bg-muted) 35%, var(--ui-bg));
}
.calendar-day.muted > * {
  opacity: 0.55;
}
.day-number {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 50%;
  color: var(--ui-text-muted);
  font-size: 10px;
  font-weight: 750;
}
.calendar-day.today .day-number {
  background: var(--ui-primary);
  color: white;
}
.day-events {
  display: grid;
  gap: 4px;
  margin-top: 4px;
}
.calendar-event {
  display: grid;
  grid-template-columns: 31px minmax(0, 1fr) auto;
  align-items: center;
  gap: 4px;
  width: 100%;
  min-width: 0;
  padding: 4px 5px;
  border-left: 3px solid;
  border-radius: 5px;
  background: color-mix(in srgb, var(--event-color) 9%, var(--ui-bg));
  color: var(--ui-text-highlighted);
  text-align: left;
}
.calendar-event.is-hr {
  --event-color: #9333ea;
  border-color: #9333ea;
}
.calendar-event.is-user {
  --event-color: #4f46e5;
  border-color: #4f46e5;
}
.calendar-event.is-completed {
  opacity: 0.62;
}
.calendar-event.selected,
.calendar-event:hover {
  background: color-mix(in srgb, var(--event-color) 17%, var(--ui-bg));
}
.calendar-event span {
  color: var(--event-color);
  font-size: 8px;
  font-weight: 800;
}
.calendar-event strong {
  overflow: hidden;
  font-size: 8.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.calendar-event small {
  color: var(--ui-text-muted);
  font-size: 7px;
}
.more-events {
  padding: 2px 4px;
  color: var(--ui-primary);
  font-size: 8px;
  font-weight: 700;
  text-align: left;
}
.agenda-detail {
  padding: 15px;
  background: color-mix(in srgb, var(--ui-bg-muted) 25%, var(--ui-bg));
}
.detail-heading {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  padding-bottom: 13px;
  border-bottom: 1px solid var(--ui-border);
}
.detail-heading > div {
  min-width: 0;
}
.detail-heading small {
  color: var(--ui-text-muted);
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
}
.detail-heading h2 {
  margin-top: 2px;
  font-size: 13px;
  font-weight: 800;
}
.detail-heading > .status-badge {
  grid-column: 1/-1;
  justify-self: start;
}
.kind-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  place-items: center;
  border-radius: 9px;
}
.kind-icon.is-hr {
  background: #f3e8ff;
  color: #9333ea;
}
.kind-icon.is-user {
  background: #e0e7ff;
  color: #4f46e5;
}
.candidate-block {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 0;
}
.candidate-block > span {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--ui-primary) 12%, var(--ui-bg));
  color: var(--ui-primary);
  font-size: 11px;
  font-weight: 800;
}
.candidate-block div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.candidate-block strong {
  font-size: 12px;
}
.candidate-block small {
  margin-top: 2px;
  color: var(--ui-text-muted);
  font-size: 9px;
}
.detail-list {
  display: grid;
  margin-bottom: 14px;
}
.detail-list > div {
  padding: 9px 0;
  border-top: 1px solid var(--ui-border);
}
.detail-list dt {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ui-text-muted);
  font-size: 9px;
  font-weight: 750;
  text-transform: uppercase;
}
.detail-list dt svg {
  width: 13px;
  height: 13px;
}
.detail-list dd {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 5px;
  color: var(--ui-text-highlighted);
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.detail-list dd a {
  color: var(--ui-primary);
}
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 7px;
  border-radius: 999px;
  font-size: 8.5px;
  font-weight: 750;
  white-space: nowrap;
}
.status-badge.is-upcoming {
  background: color-mix(in srgb, #2563eb 14%, var(--ui-bg));
  color: #2563eb;
}
.status-badge.is-overdue {
  background: color-mix(in srgb, #d97706 14%, var(--ui-bg));
  color: #d97706;
}
.status-badge.is-completed {
  background: color-mix(in srgb, #059669 14%, var(--ui-bg));
  color: #059669;
}
.agenda-list {
  padding: 0 14px 14px;
}
.agenda-list-group header {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 14px 2px 8px;
}
.agenda-list-group header > span {
  display: grid;
  width: 31px;
  height: 31px;
  place-items: center;
  border-radius: 8px;
  background: color-mix(in srgb, var(--ui-primary) 11%, var(--ui-bg));
  color: var(--ui-primary);
  font-size: 12px;
  font-weight: 800;
}
.agenda-list-group header div {
  display: flex;
  flex-direction: column;
}
.agenda-list-group header strong {
  font-size: 11px;
  text-transform: capitalize;
}
.agenda-list-group header small {
  color: var(--ui-text-muted);
  font-size: 8.5px;
}
.agenda-list-row {
  display: grid;
  grid-template-columns: 44px 34px minmax(130px, 1.2fr) minmax(120px, 1fr) minmax(
      110px,
      0.9fr
    ) auto 16px;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 9px;
  border: 1px solid var(--ui-border);
  border-radius: 10px;
  background: var(--ui-bg);
  text-align: left;
}
.agenda-list-row + .agenda-list-row {
  margin-top: 6px;
}
.agenda-list-row:hover,
.agenda-list-row.selected {
  border-color: color-mix(in srgb, var(--ui-primary) 45%, var(--ui-border));
  background: color-mix(in srgb, var(--ui-primary) 5%, var(--ui-bg));
}
.agenda-list-row time {
  display: flex;
  flex-direction: column;
  color: var(--ui-text-highlighted);
  font-size: 11px;
  font-weight: 800;
}
.agenda-list-row time small {
  color: var(--ui-text-muted);
  font-size: 7px;
}
.list-candidate,
.list-location,
.list-interviewers {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.list-candidate strong,
.list-location strong,
.list-interviewers strong {
  overflow: hidden;
  font-size: 9.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.list-location strong {
  text-transform: capitalize;
}
.list-candidate small,
.list-location small,
.list-interviewers small {
  overflow: hidden;
  margin-top: 2px;
  color: var(--ui-text-muted);
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 1280px) {
  .summary-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .agenda-toolbar {
    grid-template-columns: 1fr 1fr 150px 170px;
  }
  .agenda-toolbar > :last-child {
    grid-column: 4;
  }
  .agenda-content {
    grid-template-columns: minmax(0, 1fr) 270px;
  }
  .calendar-event {
    grid-template-columns: 28px minmax(0, 1fr);
  }
  .calendar-event small {
    display: none;
  }
  .agenda-list-row {
    grid-template-columns: 42px 32px minmax(130px, 1fr) minmax(110px, 1fr) auto 15px;
  }
  .list-interviewers {
    display: none;
  }
}
@media (max-width: 980px) {
  .agenda-toolbar {
    grid-template-columns: 1fr 1fr;
  }
  .agenda-content {
    grid-template-columns: 1fr;
  }
  .agenda-main {
    border-right: 0;
  }
  .agenda-detail {
    border-top: 1px solid var(--ui-border);
  }
  .calendar-grid,
  .calendar-weekdays {
    min-width: 850px;
  }
  .agenda-main {
    overflow-x: auto;
  }
  .agenda-list {
    min-width: 760px;
  }
}
.kind-icon.is-hr {
  background: color-mix(in srgb, #9333ea 14%, var(--ui-bg));
}
.kind-icon.is-user {
  background: color-mix(in srgb, #4f46e5 14%, var(--ui-bg));
}
</style>
