import request from './request.js'

const base = (teacherId, courseId, routeId) => (
  `/teachers/${teacherId}/courses/${courseId}/routes/${routeId}`
)

function compareNewestReport(left, right) {
  const leftTime = new Date(left.create_time || 0).getTime()
  const rightTime = new Date(right.create_time || 0).getTime()
  const normalizedLeftTime = Number.isFinite(leftTime) ? leftTime : 0
  const normalizedRightTime = Number.isFinite(rightTime) ? rightTime : 0
  return normalizedRightTime - normalizedLeftTime
    || Number(right.report_id || 0) - Number(left.report_id || 0)
}

export function keepLatestReportPerStudent(reports, routeId) {
  const seenStudents = new Set()
  return [...reports]
    .sort(compareNewestReport)
    .filter((report) => {
      const studentKey = report.student_id == null
        ? `missing-student:${routeId}:${report.report_id}`
        : `${report.student_id}:${routeId}`
      if (seenStudents.has(studentKey)) return false
      seenStudents.add(studentKey)
      return true
    })
}

export async function getReports(teacherId, courseId, routeId) {
  const response = await request.get(`${base(teacherId, courseId, routeId)}/reports`)
  const reports = Array.isArray(response.data) ? response.data : []
  return keepLatestReportPerStudent(reports, routeId)
}

export async function getReportDetail(teacherId, courseId, routeId, reportId) {
  return (await request.get(`${base(teacherId, courseId, routeId)}/reports/${reportId}`)).data
}

export async function saveReportEvaluation(teacherId, courseId, routeId, reportId, data) {
  return (await request.put(`${base(teacherId, courseId, routeId)}/reports/${reportId}/evaluation`, data)).data
}

export async function getEvaluationSummary(teacherId, courseId, routeId) {
  return (await request.get(`${base(teacherId, courseId, routeId)}/evaluation-summary`)).data
}
