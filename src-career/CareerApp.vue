<script setup>
import { companyName } from './utils/seo'

function alertCekStatus() {
  alert(
    'Cek Status: Silakan periksa kotak masuk email atau pesan WhatsApp Anda untuk informasi status terbaru mengenai lamaran Anda secara berkala.',
  )
}
</script>

<template>
  <div class="career-shell">
    <!-- Global Aurora gradient background effects -->
    <div class="aurora-gradient-bg">
      <div class="aurora-orb blue-orb"></div>
      <div class="aurora-orb pink-orb"></div>
      <div class="aurora-orb green-orb"></div>
    </div>

    <header class="site-header glass-panel">
      <RouterLink to="/" class="brand" aria-label="Halaman utama career">
        <!-- Pink/purple gradient circle with HP logo -->
        <div class="brand-logo-custom">
          <img src="/hompimplay_icon.png" alt="Logo Hompim Play" />
        </div>
        <span class="brand-title-custom">Hompim Play Karir</span>
      </RouterLink>
      <nav aria-label="Navigasi utama">
        <a href="https://www.hompimplay.id/about-us" target="_blank" rel="noopener noreferrer">
          Tentang Kami
        </a>
        <RouterLink to="/jobs">Lowongan</RouterLink>
      </nav>
      <RouterLink to="/jobs" class="button button-small glass-button-header"
        >Lihat Lowongan</RouterLink
      >
    </header>
    <main>
      <RouterView />
    </main>
    <footer class="site-footer">
      <div>
        <strong>{{ companyName }} Karir</strong>
        <p>Tumbuh, berkarya, dan membuat dampak bersama.</p>
      </div>
      <p>© {{ new Date().getFullYear() }} {{ companyName }}. Seluruh hak dilindungi.</p>
    </footer>
  </div>
</template>

<style>
/* Scoped overrides for the app container logo & glass header */
.brand-logo-custom {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  width: auto;
  flex-shrink: 0;
}

.brand-logo-custom img {
  display: block;
  height: 38px;
  width: auto;
  object-fit: contain;
}

.brand-title-custom {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
  margin-left: 8px;
}

.cek-status-link-dummy {
  cursor: pointer;
}

.glass-button-header {
  background: rgba(255, 255, 255, 0.8) !important;
  color: #0f172a !important;
  border: 1px solid rgba(15, 23, 42, 0.08) !important;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05) !important;
  font-weight: 700;
  transition: all 0.2s ease !important;
}

.glass-button-header:hover {
  background: #ffffff !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08) !important;
}

/* Custom global overrides for frosted glass look on main layout headers */
.site-header.glass-panel {
  background: rgba(255, 255, 255, 0.65) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(15, 23, 42, 0.08) !important;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04) !important;
}

.site-footer {
  background: #090d16 !important;
  border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
  padding: 40px max(24px, calc((100% - 1200px) / 2)) !important;
  position: relative;
  z-index: 1;
}

.career-shell {
  position: relative;
  min-height: 100vh;
  width: 100%;
  background-color: #eef2f7;
  overflow-x: hidden;
}

main {
  position: relative;
  z-index: 1;
}

/* Global Background Mesh Gradient Orbs */
.aurora-gradient-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.aurora-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.6;
}

.blue-orb {
  width: 600px;
  height: 600px;
  top: -100px;
  left: -150px;
  background: rgba(96, 165, 250, 0.35);
}

.pink-orb {
  width: 500px;
  height: 500px;
  top: 150px;
  right: -100px;
  background: rgba(244, 114, 182, 0.28);
}

.green-orb {
  width: 700px;
  height: 700px;
  bottom: 10%;
  left: 20%;
  background: rgba(52, 211, 153, 0.28);
}
</style>
