<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

defineProps({
  isDarkMode: Boolean,
})

defineEmits(['toggle-sidebar', 'toggle-theme'])

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const title = computed(() => route.meta.title || 'Dashboard')

async function logout() {
  await auth.logout()
  await router.push('/login')
}
</script>

<template>
  <header
    class="hris-navbar sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 text-white backdrop-blur sm:px-6"
  >
    <div class="flex items-center gap-3">
      <UButton
        class="lg:hidden"
        color="neutral"
        variant="ghost"
        label="Menu"
        @click="$emit('toggle-sidebar')"
      />
      <div>
        <p class="text-xs text-slate-400">HRIS Administration</p>
        <h1 class="font-semibold text-white">{{ title }}</h1>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <UBadge class="hidden sm:inline-flex" color="success" variant="subtle" label="Online" />
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        :icon="isDarkMode ? 'i-lucide-sun' : 'i-lucide-moon'"
        :label="isDarkMode ? 'Light' : 'Dark'"
        :aria-label="isDarkMode ? 'Aktifkan light mode' : 'Aktifkan dark mode'"
        @click="$emit('toggle-theme')"
      />
      <div class="hidden text-right sm:block">
        <p class="text-sm font-medium text-white">{{ auth.user?.name }}</p>
        <p class="text-xs text-slate-400">{{ auth.user?.level_label }}</p>
      </div>
      <UAvatar :text="auth.initials" color="primary" size="md" />
      <UButton color="neutral" variant="ghost" label="Keluar" size="sm" @click="logout" />
    </div>
  </header>
</template>
