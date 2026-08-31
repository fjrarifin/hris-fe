import api from './api'

// Employee Options
export function getAdjustmentEmployees(params) {
  return api.get('/adjustments/employees', { params })
}

// 1. Leave (Cuti) Adjustment
export function getLeaveAdjustments(params) {
  return api.get('/adjustments/leave', { params })
}

export function createLeaveAdjustment(payload) {
  return api.post('/adjustments/leave', payload)
}

export function deleteLeaveAdjustment(id) {
  return api.delete(`/adjustments/leave/${id}`)
}

// 2. Public Holiday (PH) Adjustment
export function getPhAdjustments(params) {
  return api.get('/adjustments/ph', { params })
}

export function getEmployeeHolidays(nik, params = {}) {
  return api.get(`/adjustments/ph/holidays/${nik}`, { params })
}

export function createPhAdjustment(payload) {
  return api.post('/adjustments/ph', payload)
}

export function deletePhAdjustment(id) {
  return api.delete(`/adjustments/ph/${id}`)
}

// 3. Extra Off (EO) Adjustment
export function getExtraOffAdjustments(params) {
  return api.get('/adjustments/extra-off', { params })
}

export function createExtraOffAdjustment(payload) {
  return api.post('/adjustments/extra-off', payload)
}

export function deleteExtraOffAdjustment(id) {
  return api.delete(`/adjustments/extra-off/${id}`)
}
