import axios from 'axios'
import api, { backendUrl } from './api'

// Public Visitor Registration (No auth header required)
export function registerPublicVisitor(payload) {
  return axios.post(`${backendUrl}/api/public/visitor/register`, payload)
}

// Admin Visitor Log Management (Requires auth header)
export function getVisitorLogs(params) {
  return api.get('/visitors', { params })
}

export function deleteVisitorLog(id) {
  return api.delete(`/visitors/${id}`)
}

export function exportVisitorLogs(params) {
  return api.get('/visitors/export', { params, responseType: 'blob' })
}
