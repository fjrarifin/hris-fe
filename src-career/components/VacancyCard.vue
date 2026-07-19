<script setup>
defineProps({ vacancy: { type: Object, required: true } })

const labels = {
  full_time: 'Penuh Waktu',
  part_time: 'Paruh Waktu',
  contract: 'Kontrak',
  internship: 'Magang',
  temporary: 'Sementara',
  onsite: 'On-site',
  hybrid: 'Hybrid',
  remote: 'Remote',
}

function isNew(value) {
  if (!value) return false
  const published = new Date(value)
  const now = new Date()
  const diffTime = Math.abs(now - published)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays <= 3
}

function postedAgo(value) {
  if (!value) return 'Baru saja diposting'
  const posted = new Date(value)
  const now = new Date()
  const diffTime = now - posted
  const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
  if (diffDays === 0) return 'Diposting hari ini'
  if (diffDays === 1) return 'Diposting kemarin'
  return `Diposting ${diffDays} hari lalu`
}

const deptIcon = (dept) => {
  const d = String(dept || '').toLowerCase()
  if (d.includes('sale') || d.includes('market')) return '🎯'
  if (d.includes('it') || d.includes('tech') || d.includes('engine')) return '💻'
  if (d.includes('general') || d.includes('operation') || d.includes('affair')) return '💼'
  if (d.includes('activity') || d.includes('play')) return '🧩'
  return '✨'
}

const deptColorClass = (dept) => {
  const d = String(dept || '').toLowerCase()
  if (d.includes('sale') || d.includes('market')) return 'sales-theme'
  if (d.includes('it') || d.includes('tech') || d.includes('engine')) return 'it-theme'
  if (d.includes('general') || d.includes('operation') || d.includes('affair'))
    return 'general-theme'
  if (d.includes('activity') || d.includes('play')) return 'activity-theme'
  return 'default-theme'
}
</script>

<template>
  <article class="career-job-card glass-panel-premium">
    <div class="card-header-row">
      <div class="icon-box" :class="deptColorClass(vacancy.department)">
        <span class="icon-emoji">{{ deptIcon(vacancy.department) }}</span>
      </div>
      <div class="category-badge" :class="deptColorClass(vacancy.department)">
        {{ vacancy.department || 'GENERAL' }}
      </div>
    </div>

    <h3 class="job-title-text">
      <RouterLink :to="`/jobs/${vacancy.slug}`">{{ vacancy.title }}</RouterLink>
    </h3>

    <p class="job-desc-text">
      {{
        vacancy.description ||
        'Bergabunglah bersama tim kami dan ambil bagian dalam perjalanan pertumbuhan perusahaan.'
      }}
    </p>

    <!-- Tag Area: Fixed Min-height to avoid layout shifting -->
    <div class="job-tags-row">
      <span class="pills-tag">📍 {{ vacancy.location || 'Lokasi belum ditentukan' }}</span>
      <span class="pills-tag"
        >⏰ {{ labels[vacancy.employment_type] || vacancy.employment_type || 'Penuh Waktu' }}</span
      >
      <span v-if="vacancy.workplace_type" class="pills-tag"
        >🏢 {{ labels[vacancy.workplace_type] || vacancy.workplace_type }}</span
      >
      <span v-if="isNew(vacancy.published_at)" class="new-badge-tag">BARU</span>
    </div>

    <div class="card-footer-row">
      <span class="posted-time-text">{{ postedAgo(vacancy.published_at) }}</span>
      <RouterLink :to="`/jobs/${vacancy.slug}`" class="action-link-text">
        Lihat posisi <span class="arrow-symbol">→</span>
      </RouterLink>
    </div>
  </article>
</template>

<style scoped>
.career-job-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  min-height: 290px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 18px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.career-job-card:hover {
  transform: translateY(-4px);
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(37, 99, 235, 0.15);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  font-size: 18px;
}

.category-badge {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 4px 10px;
  border-radius: 6px;
  text-transform: uppercase;
}

/* Colors for themes */
.sales-theme.icon-box {
  background: #eff6ff;
}
.sales-theme.category-badge {
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
}

.it-theme.icon-box {
  background: #eef2ff;
}
.it-theme.category-badge {
  background: rgba(79, 70, 229, 0.08);
  color: #4f46e5;
}

.general-theme.icon-box {
  background: #fffbeb;
}
.general-theme.category-badge {
  background: rgba(217, 119, 6, 0.08);
  color: #d97706;
}

.activity-theme.icon-box {
  background: #fdf2f8;
}
.activity-theme.category-badge {
  background: rgba(219, 39, 119, 0.08);
  color: #db2777;
}

.default-theme.icon-box {
  background: #f8fafc;
}
.default-theme.category-badge {
  background: rgba(71, 85, 105, 0.08);
  color: #475569;
}

.cta-theme.icon-box {
  background: #ecfdf5;
}
.cta-theme.category-badge {
  background: rgba(16, 185, 129, 0.08);
  color: #059669;
}

.job-title-text {
  font-size: 17px;
  font-weight: 800;
  color: #0f172a;
  margin: 18px 0 8px;
  letter-spacing: -0.01em;
  line-height: 1.35;
}

.job-title-text a {
  color: inherit;
  text-decoration: none;
}

.job-title-text a:hover {
  color: #2563eb;
}

.job-desc-text {
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
  margin-bottom: 18px;
  flex-grow: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.job-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 32px;
  align-items: center;
  margin-bottom: 18px;
}

.pills-tag {
  background: rgba(15, 23, 42, 0.04);
  color: #475569;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 8px;
}

.new-badge-tag {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  font-size: 9.5px;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 6px;
  letter-spacing: 0.04em;
}

.card-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px dashed rgba(15, 23, 42, 0.08);
  padding-top: 16px;
}

.posted-time-text {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}

.action-link-text {
  font-size: 12.5px;
  color: #2563eb;
  font-weight: 700;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-link-text:hover {
  color: #1d4ed8;
}

.arrow-symbol {
  transition: transform 0.15s ease;
}

.action-link-text:hover .arrow-symbol {
  transform: translateX(3px);
}

.cta-card {
  border: 1px dashed rgba(16, 185, 129, 0.3);
  background: rgba(240, 253, 250, 0.4);
}
.cta-card:hover {
  background: rgba(240, 253, 250, 0.7);
  border-color: rgba(16, 185, 129, 0.5);
}
</style>
