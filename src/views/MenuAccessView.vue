<script setup>
import { onMounted, ref } from 'vue'
import {
  getMenuAccess,
  updateMenuAccess,
  updateUserMenuAccess,
} from '../services/navigationService'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const menus = ref([])
const users = ref([])
const levels = ref([])
const selectedUserId = ref('')
const loading = ref(false)
const message = ref('')
const errorMessage = ref('')

async function loadAccess() {
  loading.value = true
  errorMessage.value = ''

  try {
    const { data } = await getMenuAccess()
    menus.value = data.menus
    users.value = data.users
    levels.value = data.levels
  } catch {
    errorMessage.value = 'Data akses menu tidak dapat dimuat.'
  } finally {
    loading.value = false
  }
}

function levelEnabled(menu, level) {
  return menu.allowed_levels.includes(level)
}

function lockedMenu(menu) {
  return ['dashboard', 'menu-access'].includes(menu.key)
}

async function toggleLevel(menu, level, checked) {
  const allowed = checked
    ? [...new Set([...menu.allowed_levels, level])]
    : menu.allowed_levels.filter((value) => value !== level)

  await saveMenu(menu, allowed, menu.is_active)
}

async function toggleActive(menu, checked) {
  await saveMenu(menu, menu.allowed_levels, checked)
}

async function saveMenu(menu, allowedLevels, isActive) {
  message.value = ''
  errorMessage.value = ''

  try {
    await updateMenuAccess(menu.id, {
      allowed_levels: allowedLevels,
      is_active: isActive,
    })
    menu.allowed_levels = menu.key === 'menu-access' ? [0] : allowedLevels
    menu.is_active = menu.key === 'menu-access' ? true : isActive
    await auth.refresh()
    message.value = 'Akses berdasarkan level berhasil disimpan.'
  } catch {
    errorMessage.value = 'Perubahan akses menu gagal disimpan.'
  }
}

function selectedOverride(menu) {
  const access = menu.user_access.find((item) => item.user_id === Number(selectedUserId.value))

  if (!access) {
    return ''
  }

  return access.is_allowed ? 'allow' : 'deny'
}

async function saveUserOverride(menu, value) {
  if (!selectedUserId.value) {
    return
  }

  const isAllowed = value === '' ? null : value === 'allow'

  try {
    await updateUserMenuAccess(menu.id, selectedUserId.value, isAllowed)
    const current = menu.user_access.findIndex(
      (item) => item.user_id === Number(selectedUserId.value),
    )

    if (current >= 0) {
      menu.user_access.splice(current, 1)
    }

    if (isAllowed !== null) {
      menu.user_access.push({
        user_id: Number(selectedUserId.value),
        is_allowed: isAllowed,
      })
    }

    await auth.refresh()
    message.value = 'Akses khusus user berhasil disimpan.'
  } catch {
    errorMessage.value = 'Akses khusus user gagal disimpan.'
  }
}

onMounted(loadAccess)
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-highlighted">Akses Menu Frontend</h2>
      <p class="mt-1 text-sm text-muted">
        Tentukan menu yang tampil berdasarkan level atau buat pengecualian untuk user tertentu.
      </p>
    </div>

    <AlertToastBridge :message="message" :error="errorMessage" />

    <UCard>
      <template #header>
        <h3 class="font-semibold text-highlighted">Akses Berdasarkan Level</h3>
      </template>

      <div v-if="loading" class="py-8 text-center text-sm text-muted">Memuat akses menu...</div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-gray-200 text-muted dark:border-gray-800">
            <tr>
              <th class="p-3 font-medium">Menu</th>
              <th v-for="level in levels" :key="level.value" class="p-3 font-medium">
                {{ level.label }}
              </th>
              <th class="p-3 font-medium">Aktif</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="menu in menus"
              :key="menu.id"
              class="border-b border-gray-100 last:border-0 dark:border-gray-800"
            >
              <td class="p-3">
                <p class="font-medium text-highlighted">{{ menu.label }}</p>
                <p class="text-xs text-muted">{{ menu.path }}</p>
              </td>
              <td v-for="level in levels" :key="level.value" class="p-3">
                <input
                  type="checkbox"
                  :checked="levelEnabled(menu, level.value)"
                  :disabled="lockedMenu(menu)"
                  @change="toggleLevel(menu, level.value, $event.target.checked)"
                />
              </td>
              <td class="p-3">
                <input
                  type="checkbox"
                  :checked="menu.is_active"
                  :disabled="lockedMenu(menu)"
                  @change="toggleActive(menu, $event.target.checked)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 class="font-semibold text-highlighted">Pengecualian Per User</h3>
            <p class="mt-1 text-sm text-muted">Override ini mengalahkan akses berdasarkan level.</p>
          </div>
          <select
            v-model="selectedUserId"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">Pilih user</option>
            <option v-for="user in users" :key="user.id" :value="user.id">
              {{ user.name }} ({{ user.username }})
            </option>
          </select>
        </div>
      </template>

      <div v-if="selectedUserId" class="space-y-3">
        <div
          v-for="menu in menus"
          :key="menu.id"
          class="flex flex-col justify-between gap-3 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center dark:border-gray-800"
        >
          <span class="text-sm font-medium text-highlighted">{{ menu.label }}</span>
          <select
            :value="selectedOverride(menu)"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            :disabled="lockedMenu(menu)"
            @change="saveUserOverride(menu, $event.target.value)"
          >
            <option value="">Ikuti level</option>
            <option value="allow">Izinkan</option>
            <option value="deny">Tolak</option>
          </select>
        </div>
      </div>

      <p v-else class="text-sm text-muted">Pilih user untuk mengatur akses khusus.</p>
    </UCard>
  </section>
</template>
