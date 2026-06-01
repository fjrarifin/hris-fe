import axios from 'axios'

export const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://10.20.10.70:8000'
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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const hasSession = localStorage.getItem('hris_token')
    const isLoginPage = window.location.pathname.startsWith('/login')

    if (error.response?.status === 401 && hasSession) {
      localStorage.removeItem('hris_token')

      if (!isLoginPage) {
        window.location.assign('/login?session_expired=1')
      }
    }

    return Promise.reject(error)
  },
)

export default api
