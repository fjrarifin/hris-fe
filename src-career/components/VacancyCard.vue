<script setup>
defineProps({ vacancy: { type: Object, required: true } })
const labels = { full_time: 'Penuh Waktu', part_time: 'Paruh Waktu', contract: 'Kontrak', internship: 'Magang', temporary: 'Sementara', onsite: 'On-site', hybrid: 'Hybrid', remote: 'Remote' }

function dateKey(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
}

function isNew(value) {
  return dateKey(value) === dateKey(new Date())
}

function postedAgo(value) {
  if (!value) return 'Waktu posting belum tersedia'
  const posted = new Date(value)
  const now = new Date()
  const days = Math.max(0, Math.floor((new Date(dateKey(now)) - new Date(dateKey(posted))) / 86400000))
  if (days === 0) return 'Diposting hari ini'
  if (days === 1) return 'Diposting kemarin'
  if (days < 7) return `Diposting ${days} hari lalu`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `Diposting ${weeks} minggu lalu`
  const months = Math.floor(days / 30)
  return `Diposting ${months} bulan lalu`
}
</script>

<template>
  <article class="job-card material-card">
    <div class="job-card-top"><span class="job-icon">↗</span><div class="job-card-labels"><span v-if="isNew(vacancy.published_at)" class="new-badge">BARU</span><span class="eyebrow">{{ vacancy.department || 'Career' }}</span></div></div>
    <h3><RouterLink :to="`/jobs/${vacancy.slug}`">{{ vacancy.title }}</RouterLink></h3>
    <p>{{ vacancy.description || 'Bergabunglah bersama tim kami dan ambil bagian dalam perjalanan pertumbuhan perusahaan.' }}</p>
    <div class="chips">
      <span class="location-chip">⌖ {{ vacancy.location || 'Lokasi belum ditentukan' }}</span>
      <span class="employment-chip">◷ {{ labels[vacancy.employment_type] || vacancy.employment_type || 'Tipe belum ditentukan' }}</span>
      <span v-if="vacancy.workplace_type">{{ labels[vacancy.workplace_type] || vacancy.workplace_type }}</span>
    </div>
    <div class="job-card-footer"><span class="posted-at">{{ postedAgo(vacancy.published_at) }}</span><RouterLink :to="`/jobs/${vacancy.slug}`" class="text-link">Lihat posisi <span>→</span></RouterLink></div>
  </article>
</template>
