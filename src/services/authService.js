import api from './api'

export function login(credentials) {
  return api.post('/auth/login', credentials)
}

export function requestPasswordOtp(payload) {
  return api.post('/auth/forgot-password/request-otp', payload)
}

export function verifyPasswordOtp(payload) {
  return api.post('/auth/forgot-password/verify-otp', payload)
}

export function resetForgottenPassword(payload) {
  return api.post('/auth/forgot-password/reset', payload)
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
