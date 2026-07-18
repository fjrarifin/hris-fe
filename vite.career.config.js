import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  root: 'career',
  publicDir: '../public',
  plugins: [vue()],
  resolve: {
    alias: {
      '@career': fileURLToPath(new URL('./src-career', import.meta.url)),
    },
  },
  build: {
    outDir: '../dist-career',
    emptyOutDir: true,
  },
})
