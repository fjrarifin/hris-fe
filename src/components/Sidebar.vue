<script setup>
import { computed } from 'vue'
import { backendLogoUrl } from '../services/api'
import { useAuthStore } from '../stores/auth'

const props = defineProps({
  isOpen: Boolean,
})

const emit = defineEmits(['close-sidebar'])
const auth = useAuthStore()
const links = computed(() => auth.menus)

function closeSidebar() {
  emit('close-sidebar')
}
</script>

<template>
  <aside
    :class="[
      'hris-sidebar fixed inset-y-0 left-0 z-50 flex w-72 -translate-x-full flex-col border-r border-slate-800 bg-slate-950 p-4 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0',
      props.isOpen && 'translate-x-0',
    ]"
  >
    <div class="flex items-center justify-between border-b border-slate-800 pb-4">
      <div class="flex items-center gap-3">
        <img :src="backendLogoUrl" alt="HRIS Logo" class="size-10 rounded-xl object-contain" />
        <div>
          <p class="font-semibold text-white">HRIS</p>
          <p class="text-xs text-slate-400">{{ auth.user?.level_label || 'Portal' }}</p>
        </div>
      </div>

      <UButton
        class="lg:hidden"
        color="neutral"
        variant="ghost"
        label="Tutup"
        size="sm"
        @click="closeSidebar"
      />
    </div>

    <UNavigationMenu
      class="mt-6 w-full"
      :items="links"
      orientation="vertical"
      color="primary"
      variant="pill"
      highlight
      @update:model-value="closeSidebar"
    />

    <UCard class="mt-auto border-slate-800 bg-slate-900">
      <p class="text-sm font-medium text-white">{{ auth.user?.name }}</p>
      <p class="mt-1 text-xs text-slate-400">{{ auth.user?.username }}</p>
      <UBadge class="mt-4" color="primary" variant="subtle" :label="auth.user?.level_label" />
    </UCard>
  </aside>
</template>
