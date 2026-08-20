import axios from 'axios'
import api, { backendUrl } from './api'

export function getEventAbsenList(params) {
  return api.get('/event-absen', { params })
}

export function createEventAbsen(payload) {
  return api.post('/event-absen', payload)
}

export function getEventAbsenDetail(id) {
  return api.get(`/event-absen/${id}`)
}

export function updateEventAbsen(id, payload) {
  return api.put(`/event-absen/${id}`, payload)
}

export function deleteEventAbsen(id) {
  return api.delete(`/event-absen/${id}`)
}

export function exportEventAbsenParticipants(id) {
  return api.get(`/event-absen/${id}/export`, { responseType: 'blob' })
}

export function downloadEventAbsenPhotos(id) {
  return api.get(`/event-absen/${id}/download-photos`, { responseType: 'blob' })
}

export function getEventAbsenExportUrl(id) {
  const token = localStorage.getItem('hris_token')
  return `${backendUrl}/api/event-absen/${id}/export?token=${encodeURIComponent(token || '')}`
}

// Public Endpoints (No Auth Header required)
export function getPublicEventAbsen(slug) {
  return axios.get(`${backendUrl}/api/public/event-absen/${encodeURIComponent(slug)}`)
}

export function validatePublicEventNik(slug, payload) {
  return axios.post(`${backendUrl}/api/public/event-absen/${encodeURIComponent(slug)}/validasi-nik`, payload)
}

export function submitPublicEventAttendance(slug, payload) {
  return axios.post(`${backendUrl}/api/public/event-absen/${encodeURIComponent(slug)}/absen`, payload)
}
