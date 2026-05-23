import api from './api'

export function login(credentials) {
  return api.post('/auth/login', credentials)
}

export function getSession() {
  return api.get('/auth/me')
}

export function changePassword(payload) {
  return api.post('/auth/change-password', payload)
}

export function logout() {
  return api.post('/auth/logout')
}
