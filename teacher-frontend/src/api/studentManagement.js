import request from './request.js'

const base = (teacherId, courseId, routeId) => (
  `/teachers/${teacherId}/courses/${courseId}/routes/${routeId}`
)

export async function getCourseStudents(teacherId, courseId) {
  const response = await request.get(`/teachers/${teacherId}/courses/${courseId}/students`)
  return Array.isArray(response.data) ? response.data : []
}

export async function getRouteProgress(teacherId, courseId, routeId) {
  return (await request.get(`${base(teacherId, courseId, routeId)}/progress`)).data
}

export async function getRouteCheckins(teacherId, courseId, routeId) {
  return (await request.get(`${base(teacherId, courseId, routeId)}/checkins`)).data
}

export async function getRouteObservations(teacherId, courseId, routeId, params = {}) {
  return (await request.get(`${base(teacherId, courseId, routeId)}/observations`, { params })).data
}

export async function getRouteAIAnalysis(teacherId, courseId, routeId, params = {}) {
  return (await request.get(`${base(teacherId, courseId, routeId)}/ai-analysis`, { params })).data
}

export async function getStudentRouteAIAnalysis(teacherId, courseId, routeId, studentId) {
  return (await request.get(`${base(teacherId, courseId, routeId)}/students/${studentId}/ai-analysis`)).data
}

export async function getRouteAISummary(teacherId, courseId, routeId) {
  return (await request.get(`${base(teacherId, courseId, routeId)}/ai-summary`)).data
}
