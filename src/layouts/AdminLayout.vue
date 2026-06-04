<script setup>
import { ref } from 'vue'
import { RouterView } from 'vue-router'
import Sidebar from '../components/Sidebar.vue'
import Navbar from '../components/Navbar.vue'

const isSidebarOpen = ref(false)
const isDarkMode = ref(localStorage.getItem('hris_theme') === 'dark')

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
}

function closeSidebar() {
  isSidebarOpen.value = false
}

function toggleTheme() {
  isDarkMode.value = !isDarkMode.value
  localStorage.setItem('hris_theme', isDarkMode.value ? 'dark' : 'light')
}
</script>

<template>
  <div :class="['hris-shell min-h-screen lg:flex', isDarkMode ? 'portal-dark' : 'portal-light']">
    <button
      v-if="isSidebarOpen"
      type="button"
      aria-label="Tutup navigasi"
      class="fixed inset-0 z-40 bg-gray-950/50 lg:hidden"
      @click="closeSidebar"
    ></button>

    <Sidebar :is-open="isSidebarOpen" @close-sidebar="closeSidebar" />

    <main class="hris-content min-w-0 flex-1">
      <Navbar
        :is-dark-mode="isDarkMode"
        @toggle-sidebar="toggleSidebar"
        @toggle-theme="toggleTheme"
      />

      <div class="mx-auto min-h-[calc(100vh-8rem)] max-w-7xl p-4 sm:p-6 lg:p-8">
        <RouterView />
      </div>

      <footer class="border-t border-default px-4 py-4 text-center text-xs text-muted sm:px-6">
        © {{ new Date().getFullYear() }} · CV. 3 Detik · HRIS
      </footer>
    </main>
  </div>
</template>
