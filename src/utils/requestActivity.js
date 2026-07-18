import { computed, reactive } from 'vue'

const state = reactive({
  nextId: 0,
  requests: [],
})

const minimumVisibleDuration = 400

const methodMessages = {
  post: 'Permintaan sedang dikirim dan diproses.',
  put: 'Perubahan data sedang disimpan.',
  patch: 'Perubahan data sedang disimpan.',
  delete: 'Data sedang dihapus.',
}

const routeMessages = [
  ['schedule-hr-interview', 'Jadwal dan undangan wawancara HR sedang diproses.'],
  ['send-wa-interviewer', 'Notifikasi WhatsApp pewawancara sedang dikirim.'],
  ['send-case-study', 'Undangan case study sedang dikirim.'],
  ['schedule-user-interview-round', 'Jadwal wawancara user sedang disimpan dan dikirim.'],
  ['send-eval-wa', 'Notifikasi evaluasi wawancara sedang dikirim.'],
  ['send-reference-check-request', 'Undangan reference check sedang dikirim.'],
  ['send-offering-with-signature', 'Offering letter sedang diunggah dan dikirim.'],
  ['send-pkb-approval-request', 'Permintaan persetujuan PKB sedang dikirim.'],
  ['send-onboarding-link', 'Tautan onboarding kandidat sedang dikirim.'],
  ['import-onboarding', 'Data onboarding sedang diimpor ke data karyawan.'],
  ['upload-', 'Dokumen sedang diunggah dan disimpan.'],
]

function resolveMessage(config, method) {
  if (config.loadingMessage) return config.loadingMessage

  const url = String(config.url || '')
  return (
    routeMessages.find(([routePart]) => url.includes(routePart))?.[1] ||
    methodMessages[method] ||
    'Permintaan sedang diproses.'
  )
}

export const hasPendingMutation = computed(() => state.requests.length > 0)
export const pendingMutationCount = computed(() => state.requests.length)
export const pendingMutationMessage = computed(
  () => state.requests.at(-1)?.message || 'Permintaan sedang diproses.',
)

export function beginMutation(config) {
  const method = String(config.method || 'post').toLowerCase()
  const id = ++state.nextId

  state.requests.push({
    id,
    message: resolveMessage(config, method),
    startedAt: Date.now(),
  })

  return id
}

export async function finishMutation(id) {
  if (!id) return

  const request = state.requests.find((item) => item.id === id)
  if (!request) return

  const remainingDuration = Math.max(0, minimumVisibleDuration - (Date.now() - request.startedAt))
  if (remainingDuration) {
    await new Promise((resolve) => globalThis.setTimeout(resolve, remainingDuration))
  }

  const index = state.requests.findIndex((item) => item.id === id)
  if (index !== -1) state.requests.splice(index, 1)
}

export function isMutationRequest(config) {
  if (config?.showLoading === false) return false

  return ['post', 'put', 'patch', 'delete'].includes(String(config?.method || '').toLowerCase())
}
