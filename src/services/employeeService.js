import api from './api'

export function getEmployees() {
  return api.get('/employees')
}

export function getEmployee(nik) {
  return api.get(`/employee/${encodeURIComponent(nik)}`)
}

export function getEmployeeFingerspotClouds() {
  return api.get('/employee/fingerspot/clouds')
}

export function sendEmployeeFingerspotUserinfo(nik, payload) {
  return api.post(`/employee/${encodeURIComponent(nik)}/fingerspot-userinfo`, payload)
}

export function createEmployee(payload) {
  return api.post('/employee', payload)
}

export function updateEmployee(nik, payload) {
  return api.patch(`/employee/${encodeURIComponent(nik)}`, payload)
}

export function exportEmployees() {
  return api.get('/employees/export', { responseType: 'blob' })
}
