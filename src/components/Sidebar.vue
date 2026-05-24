<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { backendLogoUrl } from '../services/api'
import { useAuthStore } from '../stores/auth'

const props = defineProps({
  isOpen: Boolean,
})

const emit = defineEmits(['close-sidebar'])
const auth = useAuthStore()
const router = useRouter()
const links = computed(() => auth.menus)
const accountMenuOpen = ref(false)
const accountMenuRef = ref(null)
const hasProfilePage = computed(() => auth.user?.level === 3)

function closeSidebar() {
  emit('close-sidebar')
}

function toggleAccountMenu() {
  accountMenuOpen.value = !accountMenuOpen.value
}

function closeAccountMenu() {
  accountMenuOpen.value = false
}

function selectAccountLink() {
  closeAccountMenu()
  closeSidebar()
}

function handleOutsideClick(event) {
  if (accountMenuRef.value && !accountMenuRef.value.contains(event.target)) {
    closeAccountMenu()
  }
}

async function logout() {
  closeAccountMenu()
  await auth.logout()
  closeSidebar()
  await router.push('/login')
}

onMounted(() => document.addEventListener('click', handleOutsideClick))
onBeforeUnmount(() => document.removeEventListener('click', handleOutsideClick))
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

    <div ref="accountMenuRef" class="relative mt-auto">
      <div
        v-if="accountMenuOpen"
        class="absolute inset-x-0 bottom-full mb-2 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-2xl"
      >
        <RouterLink
          v-if="hasProfilePage"
          to="/staff/profile"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-200 transition hover:bg-slate-800 hover:text-white"
          @click="selectAccountLink"
        >
          <UIcon name="i-lucide-user-round" class="size-4" />
          Profil Saya
        </RouterLink>
        <RouterLink
          to="/change-password"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-200 transition hover:bg-slate-800 hover:text-white"
          @click="selectAccountLink"
        >
          <UIcon name="i-lucide-key-round" class="size-4" />
          Ubah Password
        </RouterLink>
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-300 transition hover:bg-red-950/50 hover:text-red-200"
          @click="logout"
        >
          <UIcon name="i-lucide-log-out" class="size-4" />
          Logout
        </button>
      </div>

      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3 text-left transition hover:border-slate-700 hover:bg-slate-800"
        :aria-expanded="accountMenuOpen"
        aria-label="Buka menu akun"
        @click="toggleAccountMenu"
      >
        <UAvatar :text="auth.initials" color="primary" size="md" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-white">{{ auth.user?.name }}</p>
          <p class="truncate text-xs text-slate-400">{{ auth.user?.level_label }}</p>
        </div>
        <UIcon
          name="i-lucide-chevron-up"
          :class="['size-4 text-slate-400 transition-transform', accountMenuOpen && 'rotate-180']"
        />
      </button>
    </div>
  </aside>
</template>
