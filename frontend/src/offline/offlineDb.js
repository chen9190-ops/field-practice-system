const DB_NAME = "field-practice-offline";
const DB_VERSION = 2;
const PACKAGE_STORE = "offline_packages";
const OBSERVATION_QUEUE_STORE = "offline_observation_queue";
const STUDENT_PROGRESS_STORE = "offline_student_progress";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PACKAGE_STORE)) {
        database.createObjectStore(PACKAGE_STORE, { keyPath: "route_id" });
      }
      if (!database.objectStoreNames.contains(OBSERVATION_QUEUE_STORE)) {
        database.createObjectStore(OBSERVATION_QUEUE_STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
      if (!database.objectStoreNames.contains(STUDENT_PROGRESS_STORE)) {
        database.createObjectStore(STUDENT_PROGRESS_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runStoreRequest(storeName, mode, operation) {
  return openDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);
    let result;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error);
    };
  }));
}

export function getOfflineRoutePackage(routeId) {
  return runStoreRequest(PACKAGE_STORE, "readonly", (store) => store.get(Number(routeId)))
    .then((item) => item?.status === "ready" ? item : null);
}

export function getAllOfflineRoutePackages() {
  return runStoreRequest(PACKAGE_STORE, "readonly", (store) => store.getAll())
    .then((items) => (Array.isArray(items) ? items.filter((item) => item.status === "ready") : []));
}

export function saveOfflineRoutePackage(offlinePackage) {
  return runStoreRequest(PACKAGE_STORE, "readwrite", (store) => store.put(offlinePackage));
}

export function removeOfflineRoutePackageRecord(routeId) {
  return runStoreRequest(PACKAGE_STORE, "readwrite", (store) => store.delete(Number(routeId)));
}

export function getOfflineStudentProgress(studentId, routeId) {
  return runStoreRequest(
    STUDENT_PROGRESS_STORE,
    "readonly",
    (store) => store.get(`${Number(studentId)}:${Number(routeId)}`),
  ).then((item) => item || null);
}

export function saveOfflineStudentProgress(progressItem) {
  return runStoreRequest(STUDENT_PROGRESS_STORE, "readwrite", (store) => store.put(progressItem));
}

export function removeOfflineStudentProgress(studentId, routeId) {
  return runStoreRequest(
    STUDENT_PROGRESS_STORE,
    "readwrite",
    (store) => store.delete(`${Number(studentId)}:${Number(routeId)}`),
  );
}

export function saveOfflineObservationQueueItem(queueItem) {
  return runStoreRequest(OBSERVATION_QUEUE_STORE, "readwrite", (store) => store.put(queueItem));
}

export function removeOfflineObservationQueueItem(itemId) {
  return runStoreRequest(OBSERVATION_QUEUE_STORE, "readwrite", (store) => store.delete(itemId));
}

export function getOfflineObservationQueueItem(itemId) {
  return runStoreRequest(OBSERVATION_QUEUE_STORE, "readonly", (store) => store.get(itemId));
}

export function getOfflineQueueItems(studentId, { recoverSyncing = true } = {}) {
  const normalizedStudentId = Number(studentId);
  return runStoreRequest(OBSERVATION_QUEUE_STORE, "readonly", (store) => store.getAll())
    .then(async (items) => {
      const studentItems = (Array.isArray(items) ? items : [])
        .filter((item) => (
          ["observation", "checkin"].includes(item?.queue_type)
          && Number(item.student_id) === normalizedStudentId
        ));
      if (!recoverSyncing) return studentItems;
      const recoveredItems = studentItems.map((item) => (
        item.status === "syncing"
          ? { ...item, status: "pending", updated_at: new Date().toISOString() }
          : item
      ));
      await Promise.all(recoveredItems
        .filter((item, index) => item !== studentItems[index])
        .map(saveOfflineObservationQueueItem));
      return recoveredItems;
    })
    .then((items) => items.sort((first, second) => (
      String(first.created_at).localeCompare(String(second.created_at))
    )));
}

export function getPendingOfflineObservations(studentId, routeId) {
  const normalizedStudentId = Number(studentId);
  const normalizedRouteId = Number(routeId);
  return runStoreRequest(OBSERVATION_QUEUE_STORE, "readonly", (store) => store.getAll())
    .then((items) => (Array.isArray(items) ? items : [])
      .filter((item) => (
        item?.queue_type === "observation"
        && item.status === "pending"
        && Number(item.student_id) === normalizedStudentId
        && Number(item.route_id) === normalizedRouteId
      ))
      .sort((first, second) => String(second.created_at).localeCompare(String(first.created_at))));
}

export function getPendingOfflineCheckins(studentId, routeId) {
  const normalizedStudentId = Number(studentId);
  const normalizedRouteId = Number(routeId);
  const visibleStatuses = new Set(["pending", "syncing", "failed"]);
  return runStoreRequest(OBSERVATION_QUEUE_STORE, "readonly", (store) => store.getAll())
    .then(async (items) => {
      const matchedItems = (Array.isArray(items) ? items : [])
      .filter((item) => (
        item?.queue_type === "checkin"
        && visibleStatuses.has(item.status)
        && Number(item.student_id) === normalizedStudentId
        && Number(item.route_id) === normalizedRouteId
      ));
      const recoveredItems = matchedItems.map((item) => (
        item.status === "syncing"
          ? { ...item, status: "pending", updated_at: new Date().toISOString() }
          : item
      ));
      await Promise.all(recoveredItems
        .filter((item, index) => item !== matchedItems[index])
        .map(saveOfflineObservationQueueItem));
      return recoveredItems
        .sort((first, second) => String(second.checked_at).localeCompare(String(first.checked_at)));
    });
}

export {
  DB_NAME,
  DB_VERSION,
  PACKAGE_STORE,
  OBSERVATION_QUEUE_STORE,
  STUDENT_PROGRESS_STORE,
};
