import api from './api'

export function heartbeatOnlineUser() {
  return api.post('/online-users/heartbeat')
}

export function getOnlineUsers() {
  return api.get('/online-users')
}
