import { syncOfflineCheckIn } from "../api/checkin";
import { createObservation, uploadPhoto } from "../api/observation";
import {
  getOfflineQueueItems,
  removeOfflineObservationQueueItem,
  saveOfflineObservationQueueItem,
} from "./offlineDb";

function restorePhotoFile(item, fallbackName = "offline-photo.jpg") {
  if (item.photo_blob instanceof File) return item.photo_blob;
  return new File(
    [item.photo_blob],
    item.photo_name || fallbackName,
    { type: item.photo_type || item.photo_blob?.type || "image/jpeg" },
  );
}

function backendDetail(error) {
  const detail = error?.response?.data?.detail;
  return typeof detail === "string" && detail.trim() ? detail.trim() : "";
}

export function getSyncErrorMessage(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();
  if (!error?.response) {
    if (code === "ECONNABORTED" || code === "ETIMEDOUT" || message.includes("timeout")) {
      return "请求超时";
    }
    if (error?.isAxiosError || error?.message === "OFFLINE" || !navigator.onLine) {
      return "网络连接失败";
    }
    return "本地同步数据异常";
  }
  const status = Number(error.response.status);
  const detail = backendDetail(error);
  if (status === 400) return detail || "记录数据有误";
  if (status === 403) return "无权同步该记录";
  if (status === 404) return "相关路线或观察点已不存在";
  if (status === 409) return detail || "记录状态冲突";
  if (status === 422) return "记录数据校验失败";
  if ([500, 502, 503].includes(status)) return "服务器暂时不可用";
  return detail || "同步失败，请稍后重试";
}

function dispatchSyncComplete(results, studentId) {
  const successful = results.filter((result) => result.success);
  if (successful.length === 0) return;
  window.dispatchEvent(new CustomEvent("offline-sync-complete", {
    detail: {
      studentId: Number(studentId),
      routeIds: [...new Set(successful.map((result) => Number(result.routeId)))],
      observationSynced: successful.some((result) => result.queueType === "observation"),
      checkinSynced: successful.some((result) => result.queueType === "checkin"),
    },
  }));
}

export async function syncOneOfflineItem(sourceItem) {
  let item = {
    ...sourceItem,
    status: "syncing",
    last_error: null,
    updated_at: new Date().toISOString(),
  };
  await saveOfflineObservationQueueItem(item);

  try {
    if (!navigator.onLine) throw new Error("OFFLINE");

    if (item.queue_type === "observation") {
      if (item.sync_stage === "create_observation") {
        const response = await createObservation(item.payload);
        const observationId = Number(response.data?.observation_id);
        if (!Number.isInteger(observationId) || observationId <= 0) {
          throw new Error("OBSERVATION_ID_MISSING");
        }
        item = {
          ...item,
          server_observation_id: observationId,
          sync_stage: item.photo_blob ? "upload_photo" : "done",
          updated_at: new Date().toISOString(),
        };
        await saveOfflineObservationQueueItem(item);
      }

      if (item.sync_stage === "upload_photo") {
        const observationId = Number(item.server_observation_id);
        if (!Number.isInteger(observationId) || observationId <= 0) {
          throw new Error("OBSERVATION_ID_MISSING");
        }
        const photoResponse = await uploadPhoto(
          observationId,
          restorePhotoFile(item, "observation.jpg"),
        );
        if (Number(photoResponse.data?.observation_id) !== observationId) {
          throw new Error("PHOTO_UPLOAD_NOT_CONFIRMED");
        }
      } else if (item.sync_stage !== "done") {
        throw new Error("UNKNOWN_OBSERVATION_SYNC_STAGE");
      }
    } else if (item.queue_type === "checkin") {
      const response = await syncOfflineCheckIn(item.route_id, {
        route_id: item.route_id,
        student_id: item.student_id,
        point_id: item.point_id,
        latitude: item.latitude,
        longitude: item.longitude,
        checked_at: item.checked_at || "",
        photo: restorePhotoFile(item, "checkin.jpg"),
      });
      item = {
        ...item,
        server_checkin_id: response.data?.checkin_id ?? null,
        server_observation_id: response.data?.observation_id ?? null,
      };
    } else {
      throw new Error("UNKNOWN_QUEUE_TYPE");
    }

    await removeOfflineObservationQueueItem(item.id);
    return {
      success: true,
      itemId: item.id,
      queueType: item.queue_type,
      routeId: item.route_id,
    };
  } catch (error) {
    console.error("离线记录同步失败:", error);
    const failedItem = {
      ...item,
      status: "failed",
      retry_count: Number(item.retry_count || 0) + 1,
      last_error: getSyncErrorMessage(error),
      updated_at: new Date().toISOString(),
    };
    await saveOfflineObservationQueueItem(failedItem);
    return {
      success: false,
      itemId: item.id,
      queueType: item.queue_type,
      routeId: item.route_id,
      error: failedItem.last_error,
    };
  }
}

export async function syncAllOfflineItems(studentId, onProgress) {
  const items = (await getOfflineQueueItems(studentId))
    .filter((item) => ["pending", "failed"].includes(item.status));
  const progress = {
    syncing: true,
    current: 0,
    total: items.length,
    success: 0,
    failed: 0,
    stoppedOffline: false,
  };
  onProgress?.({ ...progress });
  if (!navigator.onLine) {
    return { ...progress, syncing: false, stoppedOffline: true, results: [] };
  }

  const results = [];
  for (const item of items) {
    if (!navigator.onLine) {
      progress.stoppedOffline = true;
      break;
    }
    progress.current += 1;
    progress.activeItemId = item.id;
    onProgress?.({ ...progress });
    let result;
    try {
      result = await syncOneOfflineItem(item);
    } catch (error) {
      console.error("离线队列项无法进入同步流程:", error);
      result = {
        success: false,
        itemId: item.id,
        queueType: item.queue_type,
        routeId: item.route_id,
        error: getSyncErrorMessage(error),
      };
    }
    results.push(result);
    if (result.success) progress.success += 1;
    else progress.failed += 1;
    progress.activeItemId = null;
    onProgress?.({ ...progress });
  }
  dispatchSyncComplete(results, studentId);
  return { ...progress, syncing: false, results };
}

export async function retryOfflineItem(item) {
  if (!navigator.onLine) {
    return { success: false, offline: true, error: "当前处于离线状态，请联网后同步" };
  }
  const result = await syncOneOfflineItem(item);
  dispatchSyncComplete([result], item.student_id);
  return result;
}
