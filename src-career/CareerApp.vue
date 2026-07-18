<script setup>
import { companyName } from './utils/seo'
</script>

<template>
  <div class="career-shell">
    <header class="site-header glass-panel">
      <RouterLink to="/" class="brand" aria-label="Halaman utama career">
        <img class="brand-logo" src="/hompimplay_icon.png" :alt="`Logo resmi ${companyName}`" />
        <span class="brand-careers"><small>Karir</small></span>
      </RouterLink>
      <nav aria-label="Navigasi utama">
        <a
          href="https://www.hompimplay.id/about-us"
          target="_blank"
          rel="noopener noreferrer"
        >
          Tentang Kami
        </a>
        <RouterLink to="/jobs">Lowongan</RouterLink>
      </nav>
      <RouterLink to="/jobs" class="button button-small">Lihat Lowongan</RouterLink>
    </header>
    <main><RouterView /></main>
    <footer class="site-footer">
      <div><strong>{{ companyName }} Karir</strong><p>Tumbuh, berkarya, dan membuat dampak bersama.</p></div>
      <p>© {{ new Date().getFullYear() }} {{ companyName }}. Seluruh hak dilindungi.</p>
    </footer>
  </div>
</template>
