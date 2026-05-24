import api from './api'

export function getHrDashboard() {
  return api.get('/hr/dashboard')
}

export function getHrAttendance(params) {
  return api.get('/hr/attendance', { params })
}

export function getHrAttendanceOptions() {
  return api.get('/hr/attendance/options')
}

export function exportHrAttendance(params) {
  return api.get('/hr/attendance/export', { params, responseType: 'blob' })
}

export function getHrApprovals(type, params) {
  return api.get(`/hr/approvals/${type}`, { params })
}

export function decideHrApproval(type, id, payload) {
  return api.post(`/hr/approvals/${type}/${id}`, payload)
}

export function cancelHrApproval(type, id, payload) {
  return api.post(`/hr/approvals/${type}/${id}/cancel`, payload)
}

export function getHrScheduleDepartments(params) {
  return api.get('/hr/schedules', { params })
}

export function getHrDepartmentEmployees(params) {
  return api.get('/hr/schedules/department', { params })
}

export function getHrEmployeeSchedule(nik, params) {
  return api.get(`/hr/schedules/employees/${encodeURIComponent(nik)}`, { params })
}

export function saveHrEmployeeSchedule(nik, payload) {
  return api.put(`/hr/schedules/employees/${encodeURIComponent(nik)}`, payload)
}

export function uploadHrSchedule(payload) {
  return api.post('/hr/schedules/upload', payload)
}
