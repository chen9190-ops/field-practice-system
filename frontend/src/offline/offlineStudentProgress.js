import { getCheckin } from "../api/checkin";
import { getObservationRecords } from "../api/observation";
import {
  getOfflineStudentProgress,
  saveOfflineStudentProgress,
} from "./offlineDb";

const updateLocks = new Map();

export function getOfflineStudentProgressKey(studentId, routeId) {
  return `${Number(studentId)}:${Number(routeId)}`;
}

function updateProgress(studentId, routeId, change) {
  const normalizedStudentId = Number(studentId);
  const normalizedRouteId = Number(routeId);
  const key = getOfflineStudentProgressKey(normalizedStudentId, normalizedRouteId);
  const previousUpdate = updateLocks.get(key) || Promise.resolve();
  const nextUpdate = previousUpdate.catch(() => {}).then(async () => {
    const existing = await getOfflineStudentProgress(normalizedStudentId, normalizedRouteId);
    const next = {
      key,
      student_id: normalizedStudentId,
      route_id: normalizedRouteId,
      checkins: Array.isArray(existing?.checkins) ? existing.checkins : [],
      observations: Array.isArray(existing?.observations) ? existing.observations : [],
      ...change,
      updated_at: new Date().toISOString(),
    };
    await saveOfflineStudentProgress(next);
    return next;
  });
  updateLocks.set(key, nextUpdate);
  const clearLock = () => {
    if (updateLocks.get(key) === nextUpdate) updateLocks.delete(key);
  };
  nextUpdate.then(clearLock, clearLock);
  return nextUpdate;
}

export function updateOfflineStudentCheckins(studentId, routeId, checkins) {
  return updateProgress(studentId, routeId, {
    checkins: Array.isArray(checkins) ? checkins : [],
  });
}

export function updateOfflineStudentObservations(studentId, routeId, observations) {
  const normalizedRouteId = Number(routeId);
  return updateProgress(studentId, normalizedRouteId, {
    observations: (Array.isArray(observations) ? observations : [])
      .filter((item) => Number(item.route_id) === normalizedRouteId),
  });
}

export async function refreshOfflineStudentProgress(studentId, routeId) {
  const normalizedRouteId = Number(routeId);
  const [checkinsResult, observationsResult] = await Promise.allSettled([
    getCheckin(studentId, normalizedRouteId),
    getObservationRecords(studentId),
  ]);
  if (checkinsResult.status === "rejected" && observationsResult.status === "rejected") {
    throw new Error("STUDENT_PROGRESS_REFRESH_FAILED");
  }
  const change = {};
  if (checkinsResult.status === "fulfilled") {
    change.checkins = Array.isArray(checkinsResult.value.data) ? checkinsResult.value.data : [];
  }
  if (observationsResult.status === "fulfilled") {
    change.observations = (Array.isArray(observationsResult.value.data)
      ? observationsResult.value.data
      : []).filter((item) => Number(item.route_id) === normalizedRouteId);
  }
  const progress = await updateProgress(studentId, normalizedRouteId, change);
  if (checkinsResult.status === "rejected" || observationsResult.status === "rejected") {
    throw new Error("STUDENT_PROGRESS_REFRESH_PARTIAL");
  }
  return progress;
}
