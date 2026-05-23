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
