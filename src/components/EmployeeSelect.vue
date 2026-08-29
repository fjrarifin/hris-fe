<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  employees: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  placeholder: {
    type: String,
    default: 'Pilih Karyawan...',
  },
  error: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  required: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const searchQuery = ref('')
const searchInputRef = ref(null)
const containerRef = ref(null)
const highlightedIndex = ref(-1)

const selectedEmployee = computed(() => {
  if (!props.modelValue) return null
  return props.employees.find((e) => e.nik === props.modelValue) || null
})

const filteredEmployees = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.employees
  return props.employees.filter((emp) => {
    const name = (emp.nama_karyawan || emp.name || '').toLowerCase()
    const nik = (emp.nik || '').toLowerCase()
    const pos = (emp.jabatan || emp.posisi || '').toLowerCase()
    const dept = (emp.departement || emp.divisi || '').toLowerCase()
    return name.includes(q) || nik.includes(q) || pos.includes(q) || dept.includes(q)
  })
})

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function toggleDropdown() {
  if (props.disabled) return
  if (isOpen.value) {
    closeDropdown()
  } else {
    openDropdown()
  }
}

function openDropdown() {
  if (props.disabled) return
  isOpen.value = true
  highlightedIndex.value = -1
  nextTick(() => {
    if (searchInputRef.value) {
      if (typeof searchInputRef.value.focus === 'function') {
        searchInputRef.value.focus()
      } else if (searchInputRef.value.$el?.querySelector('input')) {
        searchInputRef.value.$el.querySelector('input').focus()
      }
    }
  })
}

function closeDropdown() {
  isOpen.value = false
  searchQuery.value = ''
  highlightedIndex.value = -1
}

function selectEmployee(emp) {
  emit('update:modelValue', emp.nik)
  emit('change', emp.nik, emp)
  closeDropdown()
}

function clearSelection(event) {
  event?.stopPropagation()
  emit('update:modelValue', '')
  emit('change', '', null)
}

function handleKeydown(e) {
  if (!isOpen.value) {
    if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
      e.preventDefault()
      openDropdown()
    }
    return
  }

  if (e.key === 'Escape') {
    e.preventDefault()
    closeDropdown()
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (filteredEmployees.value.length === 0) return
    highlightedIndex.value = (highlightedIndex.value + 1) % filteredEmployees.value.length
    scrollHighlightedIntoView()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (filteredEmployees.value.length === 0) return
    highlightedIndex.value = (highlightedIndex.value - 1 + filteredEmployees.value.length) % filteredEmployees.value.length
    scrollHighlightedIntoView()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (highlightedIndex.value >= 0 && highlightedIndex.value < filteredEmployees.value.length) {
      selectEmployee(filteredEmployees.value[highlightedIndex.value])
    }
  }
}

function scrollHighlightedIntoView() {
  nextTick(() => {
    const el = containerRef.value?.querySelector(`[data-index="${highlightedIndex.value}"]`)
    if (el) {
      el.scrollIntoView({ block: 'nearest' })
    }
  })
}

function handleClickOutside(event) {
  if (containerRef.value && !containerRef.value.contains(event.target)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleClickOutside)
})

watch(isOpen, (val) => {
  if (!val) {
    searchQuery.value = ''
  }
})
</script>

<template>
  <div ref="containerRef" class="relative w-full" @keydown="handleKeydown">
    <!-- Trigger Button -->
    <div
      role="combobox"
      :aria-expanded="isOpen"
      tabindex="0"
      class="group relative flex w-full cursor-pointer items-center justify-between rounded-lg border bg-default px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
      :class="[
        error ? 'border-rose-500 ring-1 ring-rose-500/30' : (isOpen ? 'border-primary ring-2 ring-primary/20' : 'border-default hover:border-default/80'),
        disabled ? 'cursor-not-allowed opacity-60 bg-muted/10' : ''
      ]"
      @click="toggleDropdown"
    >
      <div class="flex items-center gap-2.5 overflow-hidden pr-2">
        <!-- Selected State -->
        <template v-if="selectedEmployee">
          <div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {{ getInitials(selectedEmployee.nama_karyawan || selectedEmployee.name) }}
          </div>
          <div class="flex flex-col overflow-hidden text-left">
            <div class="flex items-center gap-1.5 overflow-hidden">
              <span class="truncate font-semibold text-highlighted">
                {{ selectedEmployee.nama_karyawan || selectedEmployee.name }}
              </span>
              <span class="shrink-0 rounded bg-muted/20 px-1.5 py-0.2 text-[10px] font-mono font-medium text-muted">
                {{ selectedEmployee.nik }}
              </span>
            </div>
            <span class="truncate text-[11px] text-muted">
              {{ selectedEmployee.jabatan || selectedEmployee.posisi || '-' }}
              <template v-if="selectedEmployee.departement || selectedEmployee.divisi">
                • {{ selectedEmployee.departement || selectedEmployee.divisi }}
              </template>
            </span>
          </div>
        </template>

        <!-- Unselected Placeholder State -->
        <template v-else>
          <UIcon name="i-lucide-user" class="size-4 shrink-0 text-muted" />
          <span class="truncate text-muted">
            {{ placeholder }}
          </span>
        </template>
      </div>

      <!-- Action Icons -->
      <div class="flex shrink-0 items-center gap-1">
        <button
          v-if="selectedEmployee && !disabled"
          type="button"
          aria-label="Hapus pilihan"
          class="rounded p-0.5 text-muted hover:bg-muted/20 hover:text-highlighted focus:outline-none"
          @click="clearSelection"
        >
          <UIcon name="i-lucide-x" class="size-3.5" />
        </button>
        <UIcon
          name="i-lucide-chevron-down"
          class="size-4 text-muted transition-transform duration-200"
          :class="{ 'rotate-180 text-primary': isOpen }"
        />
      </div>
    </div>

    <!-- Dropdown Menu / Popover -->
    <div
      v-if="isOpen"
      class="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-default bg-[var(--ui-bg,#ffffff)] shadow-xl ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-100"
    >
      <!-- Search Box Header -->
      <div class="border-b border-default p-2 bg-muted/5">
        <div class="relative flex items-center">
          <UIcon name="i-lucide-search" class="absolute left-3 size-4 text-muted pointer-events-none" />
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            placeholder="Cari nama, NIK, jabatan, atau divisi..."
            class="w-full rounded-lg border border-default bg-default py-2 pl-9 pr-8 text-xs text-highlighted placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            @click.stop
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-2.5 rounded p-0.5 text-muted hover:text-highlighted"
            @click.stop="searchQuery = ''; searchInputRef?.focus()"
          >
            <UIcon name="i-lucide-x" class="size-3.5" />
          </button>
        </div>

        <div class="mt-1.5 flex items-center justify-between px-1 text-[11px] text-muted">
          <span>
            <template v-if="loading">
              <span class="flex items-center gap-1 text-primary">
                <UIcon name="i-lucide-loader-2" class="size-3 animate-spin" /> Memuat data karyawan...
              </span>
            </template>
            <template v-else-if="searchQuery">
              Ditemukan <strong class="text-highlighted">{{ filteredEmployees.length }}</strong> dari {{ employees.length }} karyawan
            </template>
            <template v-else>
              Total <strong class="text-highlighted">{{ employees.length }}</strong> karyawan aktif
            </template>
          </span>
          <span v-if="searchQuery" class="cursor-pointer text-primary hover:underline" @click="searchQuery = ''">
            Reset filter
          </span>
        </div>
      </div>

      <!-- Employee List -->
      <div class="max-h-64 overflow-y-auto p-1 divide-y divide-default/40">
        <div
          v-if="loading && employees.length === 0"
          class="flex flex-col items-center justify-center py-8 text-muted text-xs gap-2"
        >
          <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-primary" />
          <span>Memuat daftar seluruh karyawan...</span>
        </div>

        <div
          v-else-if="filteredEmployees.length === 0"
          class="flex flex-col items-center justify-center py-7 px-4 text-center text-muted"
        >
          <UIcon name="i-lucide-user-x" class="size-8 text-muted/50 mb-1.5" />
          <p class="text-xs font-semibold text-highlighted">Karyawan tidak ditemukan</p>
          <p class="text-[11px] mt-0.5 text-muted">Tidak ada hasil yang cocok dengan "{{ searchQuery }}"</p>
        </div>

        <template v-else>
          <div
            v-for="(emp, idx) in filteredEmployees"
            :key="emp.nik"
            :data-index="idx"
            class="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs transition-colors"
            :class="[
              emp.nik === modelValue
                ? 'bg-primary/10 text-primary font-medium'
                : (idx === highlightedIndex ? 'bg-muted/20 text-highlighted' : 'hover:bg-muted/15 text-highlighted')
            ]"
            @click="selectEmployee(emp)"
          >
            <div class="flex items-center gap-2.5 overflow-hidden">
              <div
                class="flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                :class="emp.nik === modelValue ? 'bg-primary text-white' : 'bg-muted/20 text-muted'"
              >
                {{ getInitials(emp.nama_karyawan || emp.name) }}
              </div>
              <div class="flex flex-col overflow-hidden text-left">
                <div class="flex items-center gap-1.5 overflow-hidden">
                  <span class="truncate font-medium text-highlighted">
                    {{ emp.nama_karyawan || emp.name }}
                  </span>
                  <span class="shrink-0 rounded bg-muted/20 px-1.5 py-0.2 text-[10px] font-mono text-muted">
                    {{ emp.nik }}
                  </span>
                </div>
                <span class="truncate text-[11px] text-muted">
                  {{ emp.jabatan || emp.posisi || '-' }}
                  <template v-if="emp.departement || emp.divisi">
                    • {{ emp.departement || emp.divisi }}
                  </template>
                </span>
              </div>
            </div>

            <!-- Checkmark for selected -->
            <UIcon
              v-if="emp.nik === modelValue"
              name="i-lucide-check"
              class="size-4 shrink-0 text-primary font-bold"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
