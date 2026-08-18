import request from "./request";

export async function getStudentNotifications(studentId, params = {}) {
  const response = await request.get(
    `/students/${studentId}/notifications`,
    { params },
  );
  return response.data;
}

export async function getNotificationUnreadCount(studentId) {
  const response = await request.get(
    `/students/${studentId}/notifications/unread-count`,
  );
  return response.data;
}

export async function markNotificationRead(studentId, notificationId) {
  const response = await request.put(
    `/students/${studentId}/notifications/${notificationId}/read`,
  );
  return response.data;
}

export async function markAllNotificationsRead(studentId) {
  const response = await request.put(
    `/students/${studentId}/notifications/read-all`,
  );
  return response.data;
}
