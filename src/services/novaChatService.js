import api from './api'

export function getNovaChatHistory() {
  return api.get('/nova/chat', { showLoading: false })
}

export function sendNovaChatMessage(message) {
  return api.post('/nova/chat', { message }, { showLoading: false })
}

export function clearNovaChatHistory() {
  return api.delete('/nova/chat', { showLoading: false })
}

