export function formatDate(value) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(value))
}

export function statusLabel(status) {
  return (
    {
      waiting_hr: 'Menunggu HRD',
      pending: 'Menunggu',
      approved: 'Disetujui',
      rejected: 'Ditolak',
      cancelled: 'Dibatalkan',
    }[status] || status
  )
}

export function statusColor(status) {
  return (
    {
      waiting_hr: 'warning',
      pending: 'warning',
      approved: 'success',
      rejected: 'error',
      cancelled: 'neutral',
    }[status] || 'neutral'
  )
}

export function apiError(error, fallback = 'Permintaan tidak dapat diproses.') {
  const errors = error.response?.data?.errors

  if (errors) {
    return Object.values(errors).flat()[0] || fallback
  }

  return error.response?.data?.message || fallback
}
