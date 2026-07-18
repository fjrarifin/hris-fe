export function formatDate(value) {
  if (!value) {
    return '-'
  }
  // If string is an ISO datetime (contains 'T' or 'Z'), parse to Date and use local date parts
  let dateObj
  if (typeof value === 'string') {
    const s = value
    if (s.includes('T') || s.toUpperCase().includes('Z')) {
      // ISO datetime — construct Date and use local components so date reflects local calendar day
      const d = new Date(s)
      dateObj = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    } else {
      // date-only string like YYYY-MM-DD
      const datePart = s.slice(0, 10)
      const parts = datePart.split('-')
      if (parts.length === 3) {
        const year = Number(parts[0])
        const month = Number(parts[1]) - 1
        const day = Number(parts[2])
        dateObj = new Date(year, month, day)
      } else {
        dateObj = new Date(s)
      }
    }
  } else if (value instanceof Date) {
    // Use local date parts for Date objects
    dateObj = new Date(value.getFullYear(), value.getMonth(), value.getDate())
  } else {
    dateObj = new Date(value)
  }

  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(dateObj)
}

export function toYMD(value) {
  if (!value) return ''
  // If string — check if ISO datetime (contains 'T' or 'Z')
  if (typeof value === 'string') {
    const s = value
    if (s.includes('T') || s.toUpperCase().includes('Z')) {
      const d = new Date(s)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${dd}`
    }
    return s.slice(0, 10)
  }
  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  try {
    const s = String(value)
    if (s.includes('T') || s.toUpperCase().includes('Z')) {
      const d = new Date(s)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${dd}`
    }
    return s.slice(0, 10)
  } catch (e) {
    return ''
  }
}

export function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value))
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
