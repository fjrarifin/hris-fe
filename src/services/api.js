import axios from 'axios'

export const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'
export const backendLogoUrl = `${backendUrl}/hompimplay_icon.png`

const api = axios.create({
  baseURL: `${backendUrl}/api`,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hris_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default api
