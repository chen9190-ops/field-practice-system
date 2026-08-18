import request from "./request";

export function getAvailableCourses(studentId) {
  return request.get(`/students/${studentId}/available-courses`);
}

export function getTeachers() {
  return request.get("/teachers/");
}

export function getTeacherCourses(teacherId) {
  return request.get(`/teachers/${teacherId}/courses`);
}

export function joinCourse(studentId, courseId) {
  return request.post(`/students/${studentId}/courses/${courseId}`);
}

export function getMyCourses(studentId) {
  return request.get(`/students/${studentId}/courses`);
}

export const getStudentCourses = getMyCourses;

export function getCurrentCourse(studentId) {
  return request.get(`/students/${studentId}/current-course`);
}

export function switchCurrentCourse(studentId, courseId) {
  return request.put(`/students/${studentId}/current-course/${courseId}`);
}
