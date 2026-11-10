import api from './api'

// --- Basic Knowledge (t_neo_knowledge) ---
export function getNeoKnowledge() {
  return api.get('/neo/knowledge')
}

export function createNeoKnowledge(payload) {
  return api.post('/neo/knowledge', payload)
}

export function updateNeoKnowledge(id, payload) {
  return api.put(`/neo/knowledge/${id}`, payload)
}

export function deleteNeoKnowledge(id) {
  return api.delete(`/neo/knowledge/${id}`)
}

export function getNeoKnowledgeRevisions(id) {
  return api.get(`/neo/knowledge/${id}/revisions`)
}

export function restoreNeoKnowledgeRevision(id, revisionId) {
  return api.post(`/neo/knowledge/${id}/revisions/${revisionId}/restore`)
}

// --- Dynamic FAQ (t_whatsapp_bot_faq) ---
export function getNeoFaqs(params) {
  return api.get('/neo/faqs', { params })
}

export function createNeoFaq(payload) {
  return api.post('/neo/faqs', payload)
}

export function updateNeoFaq(id, payload) {
  return api.put(`/neo/faqs/${id}`, payload)
}

export function deleteNeoFaq(id) {
  return api.delete(`/neo/faqs/${id}`)
}

export function testNeoFaqMatch(payload) {
  return api.post('/neo/faqs/test', payload)
}

// --- Unresolved Queries Memory (t_wa_agent_unresolved_queries) ---
export function getNeoUnresolved(params) {
  return api.get('/neo/unresolved', { params })
}

export function updateNeoUnresolved(id, payload) {
  return api.put(`/neo/unresolved/${id}`, payload)
}

export function deleteNeoUnresolved(id) {
  return api.delete(`/neo/unresolved/${id}`)
}

export function convertNeoUnresolvedToFaq(id, payload) {
  return api.post(`/neo/unresolved/${id}/to-faq`, payload)
}

