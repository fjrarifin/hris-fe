<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { getStaffContractPdfPreview, getStaffContracts } from '../services/staffService'
import { apiError } from '../utils/formatters'
import StaffContractCard from '../components/StaffContractCard.vue'

const data = ref(null)
const loading = ref(true)
const errorMessage = ref('')
const tab = ref('mine')
const preview = reactive({ open: false, url: '', filename: '', contractId: null })

const activeContracts = computed(() => data.value?.own_contracts.filter((item) => item.state === 'active') || [])
const historyContracts = computed(() => data.value?.own_contracts.filter((item) => item.state !== 'active') || [])

function employeeInitials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
}

function closePreview() {
  if (preview.url) URL.revokeObjectURL(preview.url)
  Object.assign(preview, { open: false, url: '', filename: '', contractId: null })
}

async function openPreview(contract) {
  closePreview()
  preview.contractId = contract.id
  try {
    const { data: response } = await getStaffContractPdfPreview(contract.id)
    const bytes = Uint8Array.from(atob(response.content_base64), (character) => character.charCodeAt(0))
    preview.url = URL.createObjectURL(new Blob([bytes], { type: response.mime_type || 'application/pdf' }))
    preview.filename = response.filename
    preview.open = true
  } catch (error) {
    errorMessage.value = apiError(error, 'Dokumen kontrak tidak dapat ditampilkan.')
  } finally {
    preview.contractId = null
  }
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    data.value = (await getStaffContracts()).data
  } catch (error) {
    errorMessage.value = apiError(error, 'Data kontrak tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

onMounted(load)
onBeforeUnmount(closePreview)
</script>

<template>
  <section class="space-y-5">
    <AlertToastBridge :error="errorMessage" />

    <UCard>
      <h2 class="text-2xl font-semibold text-highlighted">Kontrak Kerja</h2>
      <p class="mt-2 text-sm text-muted">
        Lihat kontrak aktif, riwayat kontrak Anda, dan kontrak aktif bawahan langsung.
      </p>
    </UCard>

    <div v-if="loading" class="rounded-2xl border border-default bg-default py-20 text-center shadow-sm">
      <UIcon name="i-lucide-loader-circle" class="mx-auto size-7 animate-spin text-primary" />
      <p class="mt-3 text-sm text-muted">Memuat data kontrak...</p>
    </div>

    <div v-else-if="data" class="overflow-hidden rounded-2xl border border-default bg-default shadow-sm">
      <div class="flex flex-col gap-4 border-b border-default px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div class="inline-flex w-fit rounded-xl bg-elevated p-1">
          <button
            type="button"
            class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition"
            :class="tab === 'mine' ? 'bg-default text-primary shadow-sm' : 'text-muted hover:text-highlighted'"
            @click="tab = 'mine'"
          >
            <UIcon name="i-lucide-user-round" class="size-4" />
            Kontrak Saya
          </button>
          <button
            type="button"
            class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition"
            :class="tab === 'team' ? 'bg-default text-primary shadow-sm' : 'text-muted hover:text-highlighted'"
            @click="tab = 'team'"
          >
            <UIcon name="i-lucide-users-round" class="size-4" />
            Kontrak Tim
            <span class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{{ data.team_contracts.length }}</span>
          </button>
        </div>
        <UButton icon="i-lucide-refresh-cw" label="Perbarui Data" color="neutral" variant="ghost" :loading="loading" @click="load" />
      </div>

      <div v-if="tab === 'mine'" class="space-y-8 p-5 sm:p-6 lg:p-8">
        <section>
          <div class="mb-4 flex items-center gap-3">
            <span class="flex size-9 items-center justify-center rounded-xl bg-success/10 text-success">
              <UIcon name="i-lucide-badge-check" class="size-5" />
            </span>
            <div>
              <h2 class="font-semibold text-highlighted">Kontrak yang Sedang Aktif</h2>
              <p class="text-xs text-muted">Status masa kerja Anda saat ini</p>
            </div>
          </div>

          <div class="space-y-3">
            <StaffContractCard
              v-for="contract in activeContracts"
              :key="contract.id"
              :contract="contract"
              :loading="preview.contractId === contract.id"
              featured
              @preview="openPreview"
            />
            <div v-if="!activeContracts.length" class="rounded-2xl border border-dashed border-default py-10 text-center">
              <UIcon name="i-lucide-file-x" class="mx-auto size-7 text-dimmed" />
              <p class="mt-2 text-sm text-muted">Tidak ada kontrak aktif saat ini.</p>
            </div>
          </div>
        </section>

        <section>
          <div class="mb-4 flex items-center gap-3">
            <span class="flex size-9 items-center justify-center rounded-xl bg-elevated text-muted">
              <UIcon name="i-lucide-history" class="size-5" />
            </span>
            <div>
              <h2 class="font-semibold text-highlighted">Riwayat Kontrak</h2>
              <p class="text-xs text-muted">Urutan kontrak dan perpanjangan sebelumnya</p>
            </div>
          </div>

          <div v-if="historyContracts.length" class="relative space-y-4 pl-6 before:absolute before:bottom-6 before:left-[7px] before:top-6 before:w-px before:bg-default">
            <div v-for="contract in historyContracts" :key="contract.id" class="relative">
              <span class="absolute -left-6 top-6 size-[15px] rounded-full border-4 border-default bg-muted"></span>
              <StaffContractCard
                :contract="contract"
                :loading="preview.contractId === contract.id"
                @preview="openPreview"
              />
            </div>
          </div>
          <div v-else class="rounded-2xl border border-dashed border-default py-10 text-center text-sm text-muted">
            Belum ada riwayat kontrak.
          </div>
        </section>
      </div>

      <div v-else class="p-5 sm:p-6 lg:p-8">
        <div class="mb-5">
          <h2 class="font-semibold text-highlighted">Kontrak Aktif Bawahan Langsung</h2>
          <p class="mt-1 text-sm text-muted">Data ditampilkan hanya untuk bawahan dengan kontrak yang masih aktif.</p>
        </div>

        <div class="grid gap-4 xl:grid-cols-2">
          <article v-for="item in data.team_contracts" :key="item.employee.nik" class="overflow-hidden rounded-2xl border border-default bg-elevated/30">
            <div class="flex items-center gap-3 border-b border-default px-5 py-4">
              <span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-bold text-primary">
                {{ employeeInitials(item.employee.name) }}
              </span>
              <div class="min-w-0 flex-1">
                <h3 class="truncate font-semibold text-highlighted">{{ item.employee.name }}</h3>
                <p class="mt-0.5 truncate text-xs text-muted">{{ item.employee.nik }} · {{ item.employee.position || '-' }}</p>
              </div>
              <UBadge label="Aktif" color="success" variant="subtle" />
            </div>
            <div class="p-4">
              <StaffContractCard
                :contract="item.contract"
                :loading="preview.contractId === item.contract.id"
                featured
                @preview="openPreview"
              />
            </div>
          </article>

          <div v-if="!data.team_contracts.length" class="col-span-full rounded-2xl border border-dashed border-default py-14 text-center">
            <UIcon name="i-lucide-users" class="mx-auto size-8 text-dimmed" />
            <p class="mt-3 text-sm font-medium text-highlighted">Belum ada kontrak aktif tim</p>
            <p class="mt-1 text-xs text-muted">Kontrak aktif bawahan langsung akan tampil di sini.</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="preview.open" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      <button type="button" class="absolute inset-0 bg-inverted/70 backdrop-blur-sm" aria-label="Tutup dokumen" @click="closePreview"></button>
      <UCard class="relative h-[88vh] w-full overflow-hidden lg:w-3/4">
        <div class="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 class="font-semibold text-highlighted">Dokumen Kontrak</h3>
            <p class="text-sm text-muted">{{ preview.filename }}</p>
          </div>
          <UButton icon="i-lucide-x" color="neutral" variant="ghost" aria-label="Tutup" @click="closePreview" />
        </div>
        <iframe :src="preview.url" title="Pratinjau dokumen kontrak" class="h-[calc(88vh-6rem)] w-full rounded-lg border border-default bg-white"></iframe>
      </UCard>
    </div>
  </section>
</template>
