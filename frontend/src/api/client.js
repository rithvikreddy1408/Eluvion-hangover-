import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Memory
export const getMemories = () => api.get('/memories')
export const addMemory = (data) => api.post('/memories', data)
export const forgetMemory = (id) => api.delete(`/memories/${id}`)
export const seedDemo = () => api.post('/memories/seed')
export const getTimeline = () => api.get('/memories/timeline')
export const clearAllMemories = () => api.delete('/memories')
export const pinMemory = (id) => api.post(`/memories/${id}/pin`)
export const unpinMemory = (id) => api.post(`/memories/${id}/unpin`)
export const restoreMemory = (id) => api.post(`/memories/${id}/restore`)

// Memory versions
export const getMemoryVersions = (id) => api.get(`/memories/${id}/versions`)
export const rollbackMemory = (nodeId, versionId) =>
  api.post(`/memories/${nodeId}/rollback/${versionId}`)

// Chat — passes session_id for short-term context continuity + knowledge mode
export const sendChat = (message, sessionId = 'default', mode = 'auto') =>
  api.post('/chat', { message, session_id: sessionId, mode })

// Graph
export const getGraph = () => api.get('/graph')

// MRI
export const getHealth = () => api.get('/health')
export const getDiagnosis = () => api.get('/diagnosis')

// Surgery
export const planSurgery = (diseaseId) => api.post('/surgery/plan', { disease_id: diseaseId })
export const simulateSurgery = (planId) => api.post('/surgery/simulate', { plan_id: planId })
export const executeSurgery = (planId) => api.post('/surgery/execute', { plan_id: planId })
export const rollbackSurgery = (snapshotId) => api.post('/surgery/rollback', { snapshot_id: snapshotId })
export const getSurgeryPlans = () => api.get('/surgery/plans')

// Legacy repair
export const repairMemory = (diseaseId, action) =>
  api.post('/repair', { disease_id: diseaseId, action })

// Evolution
export const getEvolutionStatus = () => api.get('/evolution/status')
export const triggerEvolution = (job) => api.post('/evolution/trigger', { job })

// Feedback / Improve pipeline
export const submitFeedback = (memoryIds, feedbackType, messageContext, sessionId, correction = null) =>
  api.post('/feedback', {
    memory_ids: memoryIds,
    feedback_type: feedbackType,
    message_context: messageContext,
    session_id: sessionId,
    correction,
  })

// Preferences
export const getPreferences = (category) => api.get('/preferences', { params: { category } })
export const addPreference = (data) => api.post('/preferences', data)
export const deletePreference = (id) => api.delete(`/preferences/${id}`)

// Contradictions
export const getContradictions = (resolved) => api.get('/contradictions', { params: { resolved } })
export const resolveContradiction = (id, resolution) =>
  api.post(`/contradictions/${id}/resolve`, { resolution })

// Explorer
export const getExplorer = (category) => api.get('/explorer', { params: { category } })

// Audit
export const getAuditLog = (limit, operation) =>
  api.get('/audit', { params: { limit, operation } })
export const getAuditStats = () => api.get('/audit/stats')

export default api
