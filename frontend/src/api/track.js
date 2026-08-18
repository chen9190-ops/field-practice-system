import request from "../api/request";

export function getStudentTrack(studentId, routeId) {
  return request.get(
    `/tracks/student/${studentId}/routes/${routeId}`
  );
}