<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import {
  clearNovaChatHistory,
  getNovaChatHistory,
  sendNovaChatMessage,
} from '../services/novaChatService'

const auth = useAuthStore()

const isOpen = ref(false)
const messages = ref([])
const draft = ref('')
const loadingHistory = ref(false)
const historyLoadedForUserId = ref(null)
const sending = ref(false)
const clearing = ref(false)
const errorMessage = ref('')
const scrollContainerRef = ref(null)
const inputRef = ref(null)

const visible = computed(
  () =>
    auth.isAuthenticated &&
    Number(auth.user?.level) === 3 &&
    !auth.user?.must_change_password,
)

const firstName = computed(() => {
  const raw = String(auth.user?.name || auth.user?.username || '').trim()
  const first = raw.split(/\s+/)[0] || ''
  return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : 'Kak'
})

const greetingTitle = computed(() =>
  firstName.value && firstName.value !== 'Kak' ? `Kak ${firstName.value}` : 'Kak',
)

const quickPrompts = computed(() => [
  'Saldo cuti, PH & Extra Off saya',
  'Status absen saya hari ini',
  'Jadwal shift saya minggu ini',
  'Cara pengajuan cuti & izin',
])

const canSend = computed(() => draft.value.trim().length > 0 && !sending.value)

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatRichText(text) {
  const linkPlaceholders = []
  let formatted = escapeHtml(text)

  // Extract URLs first so markdown markers inside URLs stay intact
  formatted = formatted.replace(/(https?:\/\/[^\s<]+)/g, (url) => {
    const token = `__URL_TOKEN_${linkPlaceholders.length}__`
    linkPlaceholders.push(
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline decoration-primary/70 underline-offset-2 font-medium text-primary hover:opacity-80 break-all">${url}</a>`,
    )
    return token
  })

  formatted = formatted
    .replace(/`([^`\n]+)`/g, '<code class="rounded border border-default bg-default px-1 py-0.5 font-mono text-[12px]">$1</code>')
    .replace(/\*\*([^\*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^\*\n]+)\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>')
    .replace(/\n/g, '<br>')

  linkPlaceholders.forEach((anchor, index) => {
    formatted = formatted.replace(`__URL_TOKEN_${index}__`, anchor)
  })

  return formatted
}

function formatMessageTime(iso) {
  if (!iso) return ''

  try {
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

async function scrollToBottom() {
  await nextTick()
  const el = scrollContainerRef.value
  if (el) {
    el.scrollTop = el.scrollHeight
  }
}

function resizeTextarea() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 96)}px`
}

async function loadHistoryIfNeeded() {
  const userId = auth.user?.id
  if (!userId || historyLoadedForUserId.value === userId) return

  loadingHistory.value = true
  errorMessage.value = ''

  try {
    const { data } = await getNovaChatHistory()
    messages.value = Array.isArray(data?.history) ? data.history : []
    historyLoadedForUserId.value = userId
  } catch {
    errorMessage.value = 'Riwayat chat sebelumnya belum dapat dimuat, kamu tetap bisa mulai chat baru.'
  } finally {
    loadingHistory.value = false
    await scrollToBottom()
  }
}

async function toggleChat() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    await loadHistoryIfNeeded()
    await scrollToBottom()
    await nextTick()
    inputRef.value?.focus()
  }
}

async function sendText(customText = null) {
  const text = String(customText ?? draft.value).trim()
  if (!text || sending.value) return

  errorMessage.value = ''
  if (customText === null) {
    draft.value = ''
    await nextTick()
    resizeTextarea()
  }

  const optimisticId = `temp-${Date.now()}`
  messages.value.push({
    id: optimisticId,
    role: 'user',
    text,
    image_url: null,
    created_at: new Date().toISOString(),
  })

  sending.value = true
  await scrollToBottom()

  try {
    const { data } = await sendNovaChatMessage(text)
    if (Array.isArray(data?.history)) {
      messages.value = data.history
    } else {
      messages.value.push({
        id: `nova-${Date.now()}`,
        role: 'nova',
        text: data?.reply || 'Maaf, Nova tidak menerima balasan dari server.',
        image_url: data?.image_url || null,
        created_at: new Date().toISOString(),
      })
    }
    historyLoadedForUserId.value = auth.user?.id ?? historyLoadedForUserId.value
  } catch (error) {
    const serverReply = error?.response?.data?.reply
    errorMessage.value =
      serverReply || 'Gagal terhubung ke Nova. Silakan coba kirim ulang beberapa saat lagi.'
    if (customText === null && !serverReply) {
      messages.value = messages.value.filter((item) => item.id !== optimisticId)
      draft.value = text
      await nextTick()
      resizeTextarea()
    }
  } finally {
    sending.value = false
    await scrollToBottom()
    await nextTick()
    inputRef.value?.focus()
  }
}

async function resetConversation() {
  if (clearing.value || sending.value) return

  clearing.value = true
  errorMessage.value = ''

  try {
    await clearNovaChatHistory()
    messages.value = []
    historyLoadedForUserId.value = auth.user?.id ?? null
  } catch {
    errorMessage.value = 'Gagal mereset riwayat chat. Silakan coba lagi.'
  } finally {
    clearing.value = false
    await nextTick()
    inputRef.value?.focus()
  }
}

function handleComposerKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    void sendText()
  }
}

watch(
  () => [visible.value, auth.user?.id],
  ([isVisible, userId], [, prevUserId]) => {
    if (!isVisible || userId !== prevUserId) {
      isOpen.value = false
      messages.value = []
      draft.value = ''
      errorMessage.value = ''
      historyLoadedForUserId.value = null
    }
  },
)
</script>

<template>
  <div v-if="visible" class="fixed bottom-5 right-5 z-50 flex flex-col items-end">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-3 scale-95 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-y-2 scale-95 opacity-0"
    >
      <section
        v-if="isOpen"
        aria-label="Room Chat Nova HRIS"
        class="mb-3 flex h-[34rem] max-h-[calc(100vh-6.5rem)] w-[23rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-default bg-default shadow-2xl sm:w-[25.5rem]"
      >
        <!-- Header -->
        <header class="flex items-center justify-between gap-3 border-b border-default bg-elevated px-4 py-3">
          <div class="flex min-w-0 items-center gap-3">
            <div class="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm">
              <UIcon name="i-lucide-sparkles" class="size-5" />
              <span
                class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-default bg-emerald-500"
                title="Online"
              />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <p class="truncate text-sm font-semibold text-highlighted">Nova</p>
                <UBadge color="primary" variant="soft" size="xs">AI HRIS</UBadge>
              </div>
              <p class="truncate text-[11px] text-muted">
                Asisten HRIS · Presensi, Cuti, Jadwal & SOP
              </p>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-1">
            <UButton
              v-if="messages.length > 0"
              type="button"
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-rotate-ccw"
              title="Mulai percakapan baru"
              aria-label="Reset percakapan"
              :loading="clearing"
              :disabled="sending"
              @click="resetConversation"
            />
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-x"
              title="Tutup chat"
              aria-label="Tutup chat Nova"
              @click="toggleChat"
            />
          </div>
        </header>

        <!-- Messages -->
        <div
          ref="scrollContainerRef"
          class="flex-1 space-y-3 overflow-y-auto px-3.5 py-3.5"
        >
          <div v-if="loadingHistory" class="flex items-center justify-center py-10 text-xs text-muted">
            <UIcon name="i-lucide-loader-circle" class="mr-2 size-4 animate-spin text-primary" />
            Memuat percakapan...
          </div>

          <template v-else>
            <!-- Welcome / Quick Prompts saat belum ada pesan -->
            <div v-if="messages.length === 0" class="space-y-3">
              <div class="max-w-[90%] rounded-2xl rounded-bl-sm border border-default bg-elevated px-3.5 py-3 text-sm text-highlighted shadow-xs">
                <p class="font-semibold">Halo {{ greetingTitle }}! 👋</p>
                <p class="mt-1 text-xs leading-relaxed text-muted">
                  Saya <strong>Nova</strong>, asisten AI HRIS HomPim Play. Kamu bisa langsung tanya soal
                  saldo cuti, PH, Extra Off, absensi fingerspot, jadwal shift, QR Gate, hingga panduan SOP HRIS.
                </p>
              </div>

              <div class="space-y-1.5">
                <p class="px-0.5 text-[11px] font-medium text-muted">Contoh pertanyaan cepat:</p>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="prompt in quickPrompts"
                    :key="prompt"
                    type="button"
                    class="rounded-full border border-default bg-elevated px-3 py-1.5 text-left text-xs font-medium text-highlighted transition hover:border-primary hover:text-primary"
                    :disabled="sending"
                    @click="sendText(prompt)"
                  >
                    {{ prompt }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Message Bubbles -->
            <div
              v-for="msg in messages"
              :key="msg.id"
              :class="['flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start']"
            >
              <div
                v-if="msg.role === 'user'"
                class="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-white shadow-sm"
              >
                <p class="whitespace-pre-wrap break-words">{{ msg.text }}</p>
              </div>

              <div
                v-else
                class="max-w-[88%] rounded-2xl rounded-bl-sm border border-default bg-elevated px-3.5 py-2.5 text-sm leading-relaxed text-highlighted shadow-xs"
              >
                <div class="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                  <UIcon name="i-lucide-sparkles" class="size-3.5" />
                  <span>Nova</span>
                </div>

                <div
                  class="nova-richtext break-words text-[13px] leading-relaxed"
                  v-html="formatRichText(msg.text)"
                />

                <div v-if="msg.image_url" class="mt-2.5 space-y-1.5">
                  <a
                    :href="msg.image_url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-block overflow-hidden rounded-xl border border-default bg-white p-2 shadow-xs"
                  >
                    <img
                      :src="msg.image_url"
                      alt="QR Code Gate Turnstile"
                      class="size-40 object-contain"
                    />
                  </a>
                  <p>
                    <a
                      :href="msg.image_url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-[11px] font-medium text-primary underline underline-offset-2"
                    >
                      Buka gambar QR ukuran penuh
                    </a>
                  </p>
                </div>
              </div>

              <span v-if="msg.created_at" class="mt-1 px-1 text-[10px] text-muted">
                {{ formatMessageTime(msg.created_at) }} WIB
              </span>
            </div>

            <!-- Typing Indicator -->
            <div v-if="sending" class="flex items-start">
              <div class="rounded-2xl rounded-bl-sm border border-default bg-elevated px-3.5 py-2.5 shadow-xs">
                <div class="flex items-center gap-2 text-xs text-muted">
                  <span class="inline-flex items-center gap-1">
                    <span class="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                    <span class="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                    <span class="size-1.5 animate-bounce rounded-full bg-primary" />
                  </span>
                  <span>Nova sedang memproses...</span>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Inline Error Alert -->
        <div v-if="errorMessage" class="mx-3.5 mb-2">
          <UAlert
            color="error"
            variant="subtle"
            :description="errorMessage"
            :close="{ color: 'neutral', variant: 'ghost', size: 'xs' }"
            close-icon="i-lucide-x"
            @update:open="errorMessage = ''"
          />
        </div>

        <!-- Composer -->
        <footer class="border-t border-default bg-default px-3 py-2.5">
          <div class="flex items-end gap-2">
            <textarea
              ref="inputRef"
              v-model="draft"
              rows="1"
              placeholder="Tulis pertanyaan untuk Nova..."
              class="max-h-24 min-h-[2.35rem] flex-1 resize-none rounded-xl border border-default bg-elevated px-3 py-2 text-sm text-highlighted placeholder:text-muted focus:border-primary focus:outline-none"
              :disabled="sending"
              @input="resizeTextarea"
              @keydown="handleComposerKeydown"
            />
            <UButton
              type="button"
              color="primary"
              size="md"
              icon="i-lucide-send"
              class="shrink-0 rounded-xl"
              aria-label="Kirim pesan ke Nova"
              :disabled="!canSend"
              :loading="sending"
              @click="sendText()"
            />
          </div>
          <p class="mt-1.5 px-0.5 text-[10px] text-muted">
            Enter untuk kirim · Shift+Enter untuk baris baru
          </p>
        </footer>
      </section>
    </Transition>

    <!-- Floating Action Button -->
    <button
      type="button"
      :aria-expanded="isOpen"
      :aria-label="isOpen ? 'Tutup chat Nova' : 'Chat dengan Nova AI HRIS'"
      class="group relative flex items-center gap-2.5 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-xl ring-1 ring-white/15 transition duration-200 hover:-translate-y-0.5 hover:shadow-2xl active:translate-y-0"
      @click="toggleChat"
    >
      <span class="relative flex size-6 items-center justify-center rounded-full bg-white/15">
        <UIcon :name="isOpen ? 'i-lucide-x' : 'i-lucide-sparkles'" class="size-4 transition-transform duration-200 group-hover:scale-110" />
        <span
          v-if="!isOpen"
          class="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-primary bg-emerald-400"
        />
      </span>
      <span class="hidden sm:inline">{{ isOpen ? 'Tutup Nova' : 'Tanya Nova' }}</span>
    </button>
  </div>
</template>
