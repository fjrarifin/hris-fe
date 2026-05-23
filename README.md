# HRIS Frontend

Aplikasi administrasi HRIS berbasis Vue 3, Vite, Vue Router, Pinia, dan Nuxt UI.

## UI Stack

- `@nuxt/ui` menyediakan komponen antarmuka dashboard.
- `tailwindcss` digunakan oleh Nuxt UI dan utility layout aplikasi.
- Integrasi Vue memakai plugin `@nuxt/ui/vite` dan `@nuxt/ui/vue-plugin`.

## Project Setup

```bash
npm install
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

API karyawan menggunakan base URL `http://127.0.0.1:8000/api` pada `src/services/api.js`.
