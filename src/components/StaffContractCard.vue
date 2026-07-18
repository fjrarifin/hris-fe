<script setup>
import { formatDate } from '../utils/formatters'

defineProps({
  contract: { type: Object, required: true },
  loading: Boolean,
  featured: Boolean,
})

defineEmits(['preview'])

function stateLabel(state) {
  if (state === 'active') return 'Aktif'
  if (state === 'upcoming') return 'Akan Datang'
  return 'Riwayat'
}

function stateColor(state) {
  if (state === 'active') return 'success'
  if (state === 'upcoming') return 'info'
  return 'neutral'
}
</script>

<template>
  <article
    class="relative overflow-hidden rounded-2xl p-5 sm:p-6"
    :class="[
      featured
        ? 'border border-primary/25 bg-gradient-to-r from-primary/10 via-default to-default shadow-sm'
        : 'border border-default bg-default',
    ]"
  >
    <div
      v-if="featured"
      class="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-primary/10 blur-3xl"
    ></div>

    <div class="relative flex items-start justify-between gap-4">
      <div class="flex items-center gap-3">
        <span
          class="flex size-11 shrink-0 items-center justify-center rounded-2xl"
          :class="
            contract.state === 'active' ? 'bg-success/10 text-success' : 'bg-elevated text-muted'
          "
        >
          <UIcon name="i-lucide-file-check-2" class="size-5" />
        </span>
        <div>
          <p class="text-xs font-medium text-muted">Kontrak ke-{{ contract.contract_number }}</p>
          <h3 class="mt-0.5 text-lg font-bold text-highlighted">{{ contract.contract_type }}</h3>
        </div>
      </div>
      <UBadge
        :label="stateLabel(contract.state)"
        :color="stateColor(contract.state)"
        variant="subtle"
      />
    </div>

    <div
      class="relative mt-5 grid gap-4 rounded-xl border border-default/70 bg-elevated/60 p-4 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center"
    >
      <div class="flex items-center gap-3">
        <span
          class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-default text-primary"
        >
          <UIcon name="i-lucide-calendar-plus" class="size-4" />
        </span>
        <div>
          <p class="text-[11px] font-medium text-muted">Mulai Kontrak</p>
          <p class="mt-0.5 text-sm font-semibold text-highlighted">
            {{ formatDate(contract.start_date) }}
          </p>
        </div>
      </div>

      <UIcon name="i-lucide-arrow-right" class="hidden size-4 text-dimmed sm:block" />

      <div class="flex items-center gap-3 sm:justify-center">
        <span
          class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-default text-primary"
        >
          <UIcon name="i-lucide-calendar-x" class="size-4" />
        </span>
        <div>
          <p class="text-[11px] font-medium text-muted">Berakhir</p>
          <p class="mt-0.5 text-sm font-semibold text-highlighted">
            {{ formatDate(contract.end_date) }}
          </p>
        </div>
      </div>

      <div class="hidden h-9 w-px bg-default sm:block"></div>

      <div>
        <p class="text-[11px] font-medium text-muted">Sisa Masa Kontrak</p>
        <p
          v-if="contract.state === 'active' && contract.remaining_days !== null"
          class="mt-0.5 text-sm font-bold text-success"
        >
          {{ contract.remaining_days }} hari
        </p>
        <p v-else class="mt-0.5 text-sm font-semibold text-highlighted">Selesai</p>
      </div>
    </div>

    <div class="relative mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div v-if="contract.description" class="flex items-start gap-2 text-sm text-muted">
        <UIcon name="i-lucide-message-square-text" class="mt-0.5 size-4 shrink-0" />
        <span>{{ contract.description }}</span>
      </div>
      <span v-else class="text-xs text-dimmed">Tidak ada catatan tambahan</span>

      <UButton
        v-if="contract.has_document"
        class="shrink-0"
        size="sm"
        icon="i-lucide-file-text"
        label="Lihat Dokumen"
        variant="soft"
        :loading="loading"
        @click="$emit('preview', contract)"
      />
      <span v-else class="flex shrink-0 items-center gap-1.5 text-xs text-dimmed">
        <UIcon name="i-lucide-file-x-2" class="size-4" />
        Dokumen belum tersedia
      </span>
    </div>
  </article>
</template>
