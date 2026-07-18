<script setup>
import { ref, watch } from 'vue'
import { cancelAction, confirmAction, confirmDialog } from '../utils/confirmDialog'

const colorClass = {
  primary: 'bg-primary text-inverted hover:bg-primary/90',
  warning: 'bg-amber-500 text-white hover:bg-amber-600',
  error: 'bg-red-500 text-white hover:bg-red-600',
}

const checkboxChecked = ref(false)

watch(
  () => confirmDialog.open,
  (newVal) => {
    if (newVal) {
      checkboxChecked.value = false
    }
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="confirmDialog.open"
        class="fixed inset-0 z-[110] flex items-center justify-center p-4"
        :class="
          confirmDialog.variant === 'structured'
            ? 'bg-slate-950/45'
            : 'bg-black/45 backdrop-blur-sm'
        "
        role="presentation"
        @click.self="cancelAction"
      >
        <Transition
          appear
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="translate-y-2 scale-95 opacity-0"
          leave-active-class="transition duration-100 ease-in"
          leave-to-class="translate-y-2 scale-95 opacity-0"
        >
          <section
            class="w-full overflow-hidden shadow-2xl"
            :class="
              confirmDialog.variant === 'structured'
                ? 'max-w-[35rem] rounded-xl border border-slate-300 bg-white font-sans text-slate-800'
                : 'max-w-md rounded-xl border border-default bg-default text-default'
            "
            role="dialog"
            aria-modal="true"
            :aria-label="confirmDialog.title"
          >
            <template v-if="confirmDialog.variant === 'structured'">
              <header
                class="flex min-h-[74px] items-center justify-between gap-4 border-b border-slate-200 bg-white px-[30px] py-5"
              >
                <h2
                  class="text-[18px] font-bold uppercase leading-6 tracking-normal text-slate-900"
                >
                  {{ confirmDialog.title }}
                </h2>
                <button
                  type="button"
                  class="flex size-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Tutup"
                  @click="cancelAction"
                >
                  <UIcon name="i-lucide-x" class="size-5" />
                </button>
              </header>
              <div class="space-y-5 bg-white px-[30px] py-[30px]">
                <p class="text-[14px] leading-[20px] text-slate-600">{{ confirmDialog.message }}</p>
                <div
                  v-if="confirmDialog.warningMessage"
                  class="rounded-[10px] border border-[#f5c76e] bg-[#fff8ea] px-[15px] py-[15px] text-[#844019]"
                >
                  <div>
                    <p class="text-[14px] font-bold uppercase leading-5">
                      {{ confirmDialog.warningTitle || 'Penting' }}:
                    </p>
                    <p class="mt-1 text-[14px] font-normal leading-[20px]">
                      {{ confirmDialog.warningMessage }}
                    </p>
                  </div>
                </div>

                <div v-if="confirmDialog.checkboxLabel">
                  <label
                    class="flex items-start gap-2.5 cursor-pointer text-[13px] select-none p-2.5 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <input
                      v-model="checkboxChecked"
                      type="checkbox"
                      class="mt-0.5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-400"
                    />
                    <span class="text-slate-600 leading-relaxed">
                      {{ confirmDialog.checkboxLabel }}
                    </span>
                  </label>
                </div>
              </div>
              <footer
                class="flex min-h-[76px] items-center justify-end gap-3 border-t border-slate-200 bg-white px-[30px] py-4"
              >
                <button
                  type="button"
                  class="rounded-md px-4 py-2 text-[14px] font-medium text-slate-700 transition hover:bg-slate-100"
                  @click="cancelAction"
                >
                  {{ confirmDialog.cancelLabel }}
                </button>
                <button
                  type="button"
                  class="inline-flex min-h-9 items-center gap-2 rounded-md bg-[#3ee59a] px-4 py-2 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#31d58c] disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="confirmDialog.checkboxLabel && !checkboxChecked"
                  @click="confirmAction"
                >
                  <UIcon
                    :name="
                      confirmDialog.color === 'error' ? 'i-lucide-trash-2' : 'i-lucide-lock-keyhole'
                    "
                    class="size-4 text-white"
                  />
                  {{ confirmDialog.confirmLabel }}
                </button>
              </footer>
            </template>
            <div v-else class="flex items-start gap-3 p-5">
              <div
                class="flex size-10 shrink-0 items-center justify-center rounded-full bg-elevated"
              >
                <UIcon
                  :name="
                    confirmDialog.color === 'error'
                      ? 'i-lucide-triangle-alert'
                      : 'i-lucide-circle-help'
                  "
                  class="size-5"
                  :class="
                    confirmDialog.color === 'error'
                      ? 'text-red-500'
                      : confirmDialog.color === 'warning'
                        ? 'text-amber-500'
                        : 'text-primary'
                  "
                />
              </div>
              <div class="min-w-0 flex-1">
                <h2 class="text-base font-semibold text-highlighted">{{ confirmDialog.title }}</h2>
                <p class="mt-1 text-sm leading-6 text-muted">{{ confirmDialog.message }}</p>
              </div>
            </div>

            <div
              v-if="confirmDialog.variant !== 'structured'"
              class="flex justify-end gap-2 px-5 pb-5"
            >
              <button
                type="button"
                class="rounded-md border border-default bg-default px-3 py-2 text-sm font-medium text-highlighted hover:bg-elevated"
                @click="cancelAction"
              >
                {{ confirmDialog.cancelLabel }}
              </button>
              <button
                type="button"
                class="rounded-md px-3 py-2 text-sm font-semibold"
                :class="colorClass[confirmDialog.color] || colorClass.primary"
                @click="confirmAction"
              >
                {{ confirmDialog.confirmLabel }}
              </button>
            </div>
          </section>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
