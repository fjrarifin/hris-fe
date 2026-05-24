import api from './api'

export function getStaffDashboard() {
  return api.get('/staff/dashboard')
}

export function getStaffProfile() {
  return api.get('/staff/profile')
}

export function getStaffAttendance(params) {
  return api.get('/staff/attendance', { params })
}

export function getLeaves() {
  return api.get('/staff/leave')
}

export function createLeave(payload) {
  return api.post('/staff/leave', payload)
}

export function deleteLeave(id) {
  return api.delete(`/staff/leave/${id}`)
}

export function getPublicHolidays() {
  return api.get('/staff/public-holiday')
}

export function createPublicHoliday(payload) {
  return api.post('/staff/public-holiday', payload)
}

export function deletePublicHoliday(id) {
  return api.delete(`/staff/public-holiday/${id}`)
}

export function getPermissions() {
  return api.get('/staff/permission')
}

export function createPermission(payload) {
  return api.post('/staff/permission', payload)
}

export function deletePermission(id) {
  return api.delete(`/staff/permission/${id}`)
}

export function getStaffApprovals() {
  return api.get('/staff/approvals')
}

export function decideStaffApproval(type, id, payload) {
  return api.post(`/staff/approvals/${type}/${id}`, payload)
}

export function getOvertime() {
  return api.get('/staff/overtime')
}

export function createOvertime(payload) {
  return api.post('/staff/overtime', payload)
}

export function deleteOvertime(id) {
  return api.delete(`/staff/overtime/${id}`)
}
