import { reactive } from 'vue'

export const notifications = reactive([])

let nextId = 0

function remove(id) {
  const index = notifications.findIndex((notification) => notification.id === id)

  if (index !== -1) {
    notifications.splice(index, 1)
  }
}

function add(type, description, title, timeout = 5000) {
  if (!description) return

  const notification = {
    id: ++nextId,
    type,
    title,
    description,
  }

  notifications.unshift(notification)
  window.setTimeout(() => remove(notification.id), timeout)
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
  remove,
}
