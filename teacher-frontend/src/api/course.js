import request from './request.js'

export async function getTeacherCourses(teacherId) {
  const response = await request.get(`/teachers/${teacherId}/courses`)
  return response.data
}

export async function updateCourse(courseId, data) {
  const response = await request.put(`/teachers/courses/${courseId}`, data)
  return response.data
}

export async function deleteCourse(courseId) {
  const response = await request.delete(`/teachers/courses/${courseId}`)
  return response.data
}

// 课程创建仍复用统一后端中已有的公共接口。
export async function createCourse({ name, description, teacher_id }) {
  const response = await request.post('/courses', {
    name,
    description,
    teacher_id: Number(teacher_id),
  })
  return response.data
}
