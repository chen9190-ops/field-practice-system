export function getStoredTeacher() {
  try {
    const teacher = JSON.parse(localStorage.getItem('teacher'))

    if (teacher?.id) return teacher
  } catch {
    // 继续尝试读取独立登录字段。
  }

  const id = localStorage.getItem('teacher_id')

  if (!id) return null

  return {
    id: Number(id),
    name: localStorage.getItem('teacher_name') || '教师',
  }
}

export function storeTeacher(teacher) {
  const teacherInfo = {
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    department: teacher.department,
    title: teacher.title,
  }

  localStorage.setItem(
    'teacher',
    JSON.stringify(teacherInfo)
  )

  localStorage.setItem(
    'teacher_id',
    String(teacher.id)
  )

  localStorage.setItem(
    'teacher_name',
    teacher.name || ''
  )
}

export function clearStoredTeacher() {
  localStorage.removeItem('teacher')
  localStorage.removeItem('teacher_id')
  localStorage.removeItem('teacher_name')
  localStorage.removeItem('access_token')
}