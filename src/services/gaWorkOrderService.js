import api from './api'

export const gaWorkOrderService = {
  async list(params = {}) {
    const { data } = await api.get('/ga/work-orders', { params })
    return data
  },

  async approvers(search = '') {
    const { data } = await api.get('/ga/work-orders/approvers', {
      params: search ? { search } : {},
    })
    return data?.data || []
  },

  async units() {
    const { data } = await api.get('/ga/work-orders/units')
    return data?.data || []
  },

  async show(id) {
    const { data } = await api.get(`/ga/work-orders/${id}`)
    return data
  },

  async create(payload) {
    const { data } = await api.post('/ga/work-orders', payload)
    return data
  },

  async approve(id, payload) {
    const { data } = await api.post(`/ga/work-orders/${id}/approve`, payload)
    return data
  },

  async cancel(id) {
    const { data } = await api.delete(`/ga/work-orders/${id}`)
    return data
  },

  async review(id, payload) {
    const { data } = await api.post(`/ga/work-orders/${id}/review`, payload)
    return data
  },

  async fetchAttachmentBlob(id, type, index = 0) {
    const response = await api.get(`/ga/work-orders/${id}/attachments/${type}`, {
      params: type === 'photo' || type === 'revision' ? { index } : undefined,
      responseType: 'blob',
    })
    return {
      blob: response.data,
      contentType: response.headers?.['content-type'] || response.data?.type || 'application/octet-stream',
    }
  },
}
