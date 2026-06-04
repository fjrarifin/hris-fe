import { reactive } from 'vue'

export const notifications = reactive([])

let nextId = 0

function clearNotificationTimers(notification) {
  if (notification.timerId) {
    window.clearTimeout(notification.timerId)
    notification.timerId = null
  }

  if (notification.intervalId) {
    window.clearInterval(notification.intervalId)
    notification.intervalId = null
  }
}

function updateProgress(notification) {
  const elapsed = Date.now() - notification.startedAt
  const remaining = Math.max(0, notification.remaining - elapsed)
  notification.progress = Math.max(0, Math.min(100, (remaining / notification.duration) * 100))
}

function start(notification) {
  clearNotificationTimers(notification)
  notification.startedAt = Date.now()
  updateProgress(notification)

  notification.timerId = window.setTimeout(() => remove(notification.id), notification.remaining)
  notification.intervalId = window.setInterval(() => updateProgress(notification), 100)
}

function remove(id) {
  const index = notifications.findIndex((notification) => notification.id === id)

  if (index !== -1) {
    clearNotificationTimers(notifications[index])
    notifications.splice(index, 1)
  }
}

function pause(id) {
  const notification = notifications.find((item) => item.id === id)
  if (!notification || notification.paused) return

  const elapsed = Date.now() - notification.startedAt
  notification.remaining = Math.max(0, notification.remaining - elapsed)
  notification.paused = true
  updateProgress(notification)
  clearNotificationTimers(notification)
}

function resume(id) {
  const notification = notifications.find((item) => item.id === id)
  if (!notification || !notification.paused) return

  notification.paused = false
  start(notification)
}

function add(type, description, title, timeout = 5000) {
  if (!description) return

  const notification = {
    id: ++nextId,
    type,
    title,
    description,
    duration: timeout,
    remaining: timeout,
    progress: 100,
    paused: false,
    startedAt: Date.now(),
    timerId: null,
    intervalId: null,
  }

  notifications.unshift(notification)
  start(notification)
}

export const notifier = {
  success(description, title = 'Berhasil') {
    add('success', description, title)
  },
  error(description, title = 'Terjadi Kesalahan') {
    add('error', description, title, 6500)
  },
  warning(description, title = 'Perhatian') {
    add('warning', description, title, 6000)
  },
  info(description, title = 'Informasi') {
    add('info', description, title)
  },
  pause,
  resume,
  remove,
}
