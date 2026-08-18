import request from "./request";

export function getStudentReports(student_id) {
  return request.get(`/reports/student/${student_id}`);
}

export function generateReport(student_id, route_id, personalSummary) {
  return request.post("/reports/generate", {
    student_id,
    route_id,
    personal_summary: personalSummary.trim(),
  });
}

export function getReportStatus(report_id) {
  return request.get(`/reports/${report_id}`);
}
