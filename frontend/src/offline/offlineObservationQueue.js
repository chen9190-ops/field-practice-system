import { saveOfflineObservationQueueItem } from "./offlineDb";

export function isObservationNetworkError(error) {
  if (error?.response) return false;
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();
  return error?.isAxiosError === true
    || code === "ERR_NETWORK"
    || code === "ECONNABORTED"
    || code === "ETIMEDOUT"
    || message.includes("network error")
    || message.includes("timeout");
}

export function savePendingObservation({ courseId, payload, photoFile }) {
  const now = new Date().toISOString();
  const queueItem = {
    id: crypto.randomUUID(),
    queue_type: "observation",
    student_id: payload.student_id,
    course_id: courseId,
    route_id: payload.route_id,
    point_id: payload.point_id,
    observation_type: payload.observation_type,
    payload: { ...payload },
    photo_blob: photoFile || null,
    photo_name: photoFile?.name || null,
    photo_type: photoFile?.type || null,
    photo_size: photoFile?.size ?? null,
    sync_stage: "create_observation",
    server_observation_id: null,
    status: "pending",
    retry_count: 0,
    last_error: null,
    created_at: now,
    updated_at: now,
  };
  return saveOfflineObservationQueueItem(queueItem).then(() => queueItem);
}

export function savePendingCheckin({
  studentId,
  courseId,
  routeId,
  pointId,
  position,
  distance,
  photoFile,
}) {
  const now = new Date().toISOString();
  const queueItem = {
    id: crypto.randomUUID(),
    queue_type: "checkin",
    student_id: studentId,
    course_id: courseId,
    route_id: Number(routeId),
    point_id: Number(pointId),
    latitude: position.latitude,
    longitude: position.longitude,
    accuracy: position.accuracy,
    distance,
    checked_at: now,
    photo_blob: photoFile,
    photo_name: photoFile.name,
    photo_type: photoFile.type,
    photo_size: photoFile.size,
    sync_stage: "sync_checkin",
    server_observation_id: null,
    server_checkin_id: null,
    status: "pending",
    retry_count: 0,
    last_error: null,
    created_at: now,
    updated_at: now,
  };
  return saveOfflineObservationQueueItem(queueItem).then(() => queueItem);
}
