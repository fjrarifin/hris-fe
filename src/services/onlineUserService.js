import api from './api'

export function heartbeatOnlineUser(payload = {}) {
  return api.post('/online-users/heartbeat', payload, { showLoading: false })
}

export function getOnlineUsers() {
  return api.get('/online-users')
}
