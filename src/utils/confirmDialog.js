import { reactive } from 'vue'

export const confirmDialog = reactive({
  open: false,
  title: 'Konfirmasi Aksi',
  message: '',
  confirmLabel: 'Lanjutkan',
  cancelLabel: 'Batal',
  color: 'primary',
  variant: 'default',
  warningTitle: '',
  warningMessage: '',
  checkboxLabel: '',
  loading: false,
  resolve: null,
})

export function askConfirmation(options = {}) {
  confirmDialog.open = true
  confirmDialog.title = options.title || 'Konfirmasi Aksi'
  confirmDialog.message = options.message || 'Lanjutkan aksi ini?'
  confirmDialog.confirmLabel = options.confirmLabel || 'Lanjutkan'
  confirmDialog.cancelLabel = options.cancelLabel || 'Batal'
  confirmDialog.color = options.color || 'primary'
  confirmDialog.variant = options.variant || 'default'
  confirmDialog.warningTitle = options.warningTitle || ''
  confirmDialog.warningMessage = options.warningMessage || ''
  confirmDialog.checkboxLabel = options.checkboxLabel || ''
  confirmDialog.loading = false

  return new Promise((resolve) => {
    confirmDialog.resolve = resolve
  })
}

export function confirmAction() {
  confirmDialog.open = false
  confirmDialog.resolve?.(true)
  confirmDialog.resolve = null
}

export function cancelAction() {
  confirmDialog.open = false
  confirmDialog.resolve?.(false)
  confirmDialog.resolve = null
}
