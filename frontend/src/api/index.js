import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

export const membersApi = {
  getAll: () => api.get('/members'),
  getById: (id) => api.get(`/members/${id}`),
  create: (data) => api.post('/members', data),
  update: (id, data) => api.put(`/members/${id}`, data),
  delete: (id) => api.delete(`/members/${id}`),
  getCommonTasks: () => api.get('/members/analytics/common-tasks'),
}

export const tasksApi = {
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  addMember: (taskId, memberId) => api.post(`/tasks/${taskId}/members`, { memberId }),
  removeMember: (taskId, memberId) => api.delete(`/tasks/${taskId}/members/${memberId}`),
  getStages: (taskId) => api.get(`/tasks/${taskId}/stages`),
  addStage: (taskId, data) => api.post(`/tasks/${taskId}/stages`, data),
}

export const stagesApi = {
  update: (id, data) => api.put(`/stages/${id}`, data),
  delete: (id) => api.delete(`/stages/${id}`),
  complete: (id) => api.post(`/stages/${id}/complete`),
  start: (id) => api.post(`/stages/${id}/start`),
  requestRevision: (id, data) => api.post(`/stages/${id}/request-revision`, data), // { toStageId, comment, requestedBy }
  getRevisions: (id) => api.get(`/stages/${id}/revisions`),
}

export const attachmentsApi = {
  getByTask: (taskId) => api.get(`/attachments/task/${taskId}`),
  add: (taskId, data) => api.post(`/attachments/task/${taskId}`, data), // { name, url, added_by }
  update: (id, data) => api.put(`/attachments/${id}`, data),
  delete: (id) => api.delete(`/attachments/${id}`),
}

export const statsApi = {
  get: () => api.get('/stats'),
}

export const briefsApi = {
  getByTask: (taskId) => api.get(`/briefs/task/${taskId}`),
  create: (taskId, data) => api.post(`/briefs/task/${taskId}`, data),
  update: (id, data) => api.put(`/briefs/${id}`, data),
  submit: (id, approverIds) => api.post(`/briefs/${id}/submit`, { approverIds }),
  respond: (id, data) => api.post(`/briefs/${id}/respond`, data), // { approverId, decision, comment }
  revise: (id) => api.post(`/briefs/${id}/revise`),
}
