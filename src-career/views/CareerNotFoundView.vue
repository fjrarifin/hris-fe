<script setup>
import { onMounted } from 'vue'
import { setSeo } from '../utils/seo'
onMounted(() =>
  setSeo({
    title: 'Halaman Tidak Ditemukan',
    description: 'Halaman yang dicari tidak ditemukan.',
    path: location.pathname,
    robots: 'noindex,follow',
  }),
)
</script>
<template>
  <section class="state-page section-wrap">
    <span class="eyebrow">404</span>
    <h1>Halaman tidak ditemukan</h1>
    <p>Alamat mungkin berubah atau halaman sudah tidak tersedia.</p>
    <RouterLink to="/" class="button">Kembali ke career</RouterLink>
  </section>
</template>
