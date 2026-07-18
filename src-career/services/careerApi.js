import axios from 'axios'

export const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://api-hr.hompimplay.id'

const careerApi = axios.create({
  baseURL: `${backendUrl}/api/public/careers`,
  timeout: 15000,
})

export const getVacancies = (params = {}) => careerApi.get('/vacancies', { params })
export const getVacancy = (slug) => careerApi.get(`/vacancies/${encodeURIComponent(slug)}`)
export const submitApplication = (slug, payload) =>
  careerApi.post(`/vacancies/${encodeURIComponent(slug)}/applications`, payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export default careerApi
