import request from "./request";

export function getDashboardActivities(studentId) {
  return request.get(`/dashboard/${studentId}/activities`);
}

export function getStudentRouteSummary(studentId, routeId) {
  return request.get(`/students/${studentId}/routes/${routeId}/summary`);
}
