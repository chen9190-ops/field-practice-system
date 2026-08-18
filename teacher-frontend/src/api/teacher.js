import request from './request.js'

export async function teacherLogin(email, password) {
  const response = await request.post('/teachers/login', { email, password })
  return response.data
}

export async function getTeacherProfile(id) {
  const response = await request.get(`/teachers/profile/${id}`)
  return response.data
}

export async function createTeacher(data) {
  const response = await request.post('/teachers/', data)
  return response.data
}

export async function getTeacherDashboard(id) {
  const response = await request.get(`/teachers/${id}/dashboard`)
  return response.data
}
