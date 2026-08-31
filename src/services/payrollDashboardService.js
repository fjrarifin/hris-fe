import api from './api'

export function getHrPayrollDashboard(params) {
  return api.get('/hr/payroll/dashboard', { params })
}

export function saveMonthlyRevenue(payload) {
  return api.post('/hr/payroll/dashboard/monthly-revenue', payload)
}
