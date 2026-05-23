import { defineStore } from 'pinia'
import {
  changePassword as requestChangePassword,
  getSession,
  login as requestLogin,
  logout as requestLogout,
} from '../services/authService'

const TOKEN_KEY = 'hris_token'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY),
    user: null,
    menus: [],
    dashboardPath: '/staff/dashboard',
    initialized: false,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.token && state.user),
    initials: (state) => {
      const words = (state.user?.name || state.user?.username || 'User').split(' ')

      return words
        .slice(0, 2)
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase()
    },
  },

  actions: {
    applySession(payload) {
      this.user = payload.user
      this.menus = payload.menus || []
      this.dashboardPath = payload.dashboard_path || '/staff/dashboard'
    },

    async login(credentials) {
      const { data } = await requestLogin(credentials)

      this.token = data.token
      localStorage.setItem(TOKEN_KEY, data.token)
      this.applySession(data)
      this.initialized = true
    },

    async restore() {
      if (this.initialized) {
        return
      }

      if (!this.token) {
        this.initialized = true
        return
      }

      try {
        const { data } = await getSession()
        this.applySession(data)
      } catch {
        this.clear()
      } finally {
        this.initialized = true
      }
    },

    async refresh() {
      if (!this.token) {
        return
      }

      const { data } = await getSession()
      this.applySession(data)
    },

    async changePassword(payload) {
      const { data } = await requestChangePassword(payload)
      this.applySession(data)
    },

    canAccess(key) {
      return this.menus.some((menu) => menu.key === key)
    },

    async logout() {
      try {
        if (this.token) {
          await requestLogout()
        }
      } finally {
        this.clear()
      }
    },

    clear() {
      this.token = null
      this.user = null
      this.menus = []
      localStorage.removeItem(TOKEN_KEY)
    },
  },
})
