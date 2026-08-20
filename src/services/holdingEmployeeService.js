import api from './api'

export function getHoldingEmployees(params) {
  return api.get('/holding-employees', { params })
}

export function createHoldingEmployee(payload) {
  return api.post('/holding-employees', payload)
}

export function getHoldingEmployee(id) {
  return api.get(`/holding-employees/${id}`)
}

export function updateHoldingEmployee(id, payload) {
  return api.put(`/holding-employees/${id}`, payload)
}

export function deleteHoldingEmployee(id) {
  return api.delete(`/holding-employees/${id}`)
}

export function getHoldingQrLogs(params) {
  return api.get('/holding-employees/qr-logs', { params })
}
