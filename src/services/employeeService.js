import api from './api'

export function getEmployees() {
  return api.get('/employees')
}

export function getEmployee(nik) {
  return api.get(`/employee/${encodeURIComponent(nik)}`)
}
