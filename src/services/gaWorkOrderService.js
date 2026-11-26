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

  async show(id, division = 'MEP') {
    const { data } = await api.get(`/ga/work-orders/${id}`, { params: { division } })
    return data
  },

  async create(payload) {
    const { data } = await api.post('/ga/work-orders', payload)
    return data
  },

  async approve(id, payload, division = 'MEP') {
    const { data } = await api.post(`/ga/work-orders/${id}/approve`, payload, { params: { division } })
    return data
  },

  async cancel(id, division = 'MEP') {
    const { data } = await api.delete(`/ga/work-orders/${id}`, { params: { division } })
    return data
  },

  async review(id, payload, division = 'MEP') {
    const { data } = await api.post(`/ga/work-orders/${id}/review`, payload, { params: { division } })
    return data
  },

  async fetchAttachmentBlob(id, type, index = 0, division = 'MEP') {
    const response = await api.get(`/ga/work-orders/${id}/attachments/${type}`, {
      params: { ...(type === 'photo' || type === 'revision' ? { index } : {}), division },
      responseType: 'blob',
    })
    return {
      blob: response.data,
      contentType: response.headers?.['content-type'] || response.data?.type || 'application/octet-stream',
    }
  },
}
