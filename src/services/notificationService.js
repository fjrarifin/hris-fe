import api from './api'

export function getNotifications() {
  return api.get('/notifications')
}

export function markNotificationsRead() {
  return api.post('/notifications/read-all')
}

export function markNotificationRead(notificationId) {
  return api.post(`/notifications/${notificationId}/read`)
}
