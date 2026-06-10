import api from './api'

export function getMenuAccess() {
  return api.get('/navigation/access')
}

export function updateMenuAccess(menuId, payload) {
  return api.put(`/navigation/access/${menuId}`, payload)
}

export function updateUserMenuAccess(menuId, userId, isAllowed) {
  return api.put(`/navigation/access/${menuId}/users/${userId}`, {
    is_allowed: isAllowed,
  })
}

export function getAuditLogs(params) {
  return api.get('/audit-logs', { params })
}

export function getItUsers(params) {
  return api.get('/it/users', { params })
}

export function createItUser(payload) {
  return api.post('/it/users', payload)
}

export function updateItUser(userId, payload) {
  return api.put(`/it/users/${userId}`, payload)
}

export function resetItUserPassword(userId) {
  return api.post(`/it/users/${userId}/reset-password`)
}

export function resetItUserPhotoLimit(userId) {
  return api.post(`/it/users/${userId}/reset-photo-limit`)
}

export function resetItUserEmailLimit(userId) {
  return api.post(`/it/users/${userId}/reset-email-limit`)
}

export function resetItUserPasswordLimit(userId) {
  return api.post(`/it/users/${userId}/reset-password-limit`)
}
