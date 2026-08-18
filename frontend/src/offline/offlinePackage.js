import { getRouteMap, getRouteMediaUrl } from "../api/route";
import {
  cacheUrl,
  deleteUnreferencedCacheUrls,
  MAP_CACHE_NAME,
  MATERIAL_CACHE_NAME,
} from "./offlineCache";
import {
  getAllOfflineRoutePackages,
  getOfflineRoutePackage,
  removeOfflineStudentProgress,
  removeOfflineRoutePackageRecord,
  saveOfflineRoutePackage,
} from "./offlineDb";
import { refreshOfflineStudentProgress } from "./offlineStudentProgress";
import {
  getOfflineTileUrls,
  getRouteBoundingBox,
  MAX_OFFLINE_TILES,
  OFFLINE_MAP_MAX_ZOOM,
  OFFLINE_MAP_MIN_ZOOM,
} from "./offlineMap";

const DOWNLOAD_CONCURRENCY = 6;

async function runPool(items, worker, onProgress) {
  let cursor = 0;
  let completed = 0;
  let failed = 0;
  const failedItems = [];
  async function runner() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      let succeeded = false;
      for (let attempt = 0; attempt < 2 && !succeeded; attempt += 1) {
        try {
          await worker(items[index]);
          succeeded = true;
        } catch {
          if (attempt === 1) {
            failed += 1;
            failedItems.push(items[index]);
          }
        }
      }
      completed += 1;
      onProgress?.(completed, items.length, failed);
    }
  }
  await Promise.all(Array.from({ length: Math.min(DOWNLOAD_CONCURRENCY, items.length) }, runner));
  return { failed, failedItems };
}

function progress(phase, current, total, base, weight) {
  const ratio = total ? current / total : 1;
  return { phase, current, total, percent: Math.round(base + ratio * weight) };
}

export async function downloadOfflinePackage(routeId, studentId, onProgress) {
  if (!navigator.onLine) throw new Error("OFFLINE");
  if (typeof indexedDB === "undefined" || typeof caches === "undefined") throw new Error("UNSUPPORTED");
  onProgress?.(progress("route", 0, 1, 0, 10));

  const { data } = await getRouteMap(routeId, studentId);
  if (!data?.route) throw new Error("ROUTE_NOT_FOUND");
  const points = Array.isArray(data.points) ? data.points : [];
  const routePoints = Array.isArray(data.route_points) ? data.route_points : [];
  onProgress?.(progress("route", 1, 1, 0, 10));

  const fileMaterials = points.flatMap((point) => point.learning_materials || [])
    .filter((material) => material.material_type === "file" && material.file_url);
  const materialUrls = [...new Set(fileMaterials.map((material) => getRouteMediaUrl(material.file_url)))];
  let materialFailed = 0;
  const materialResult = await runPool(materialUrls, (url) => cacheUrl(MATERIAL_CACHE_NAME, url),
    (current, total, failed) => {
      materialFailed = failed;
      onProgress?.(progress("materials", current, total, 10, 25));
    });
  materialFailed = materialResult.failed;

  const bbox = getRouteBoundingBox(routePoints, points);
  const tileUrls = getOfflineTileUrls(bbox);
  if (tileUrls.length > MAX_OFFLINE_TILES) throw new Error("TOO_MANY_TILES");

  let mapFailed = 0;
  const mapResult = await runPool(tileUrls, (url) => cacheUrl(MAP_CACHE_NAME, url),
    (current, total, failed) => {
      mapFailed = failed;
      onProgress?.(progress("map", current, total, 35, 64));
    });
  mapFailed = mapResult.failed;
  if (tileUrls.length && mapFailed / tileUrls.length > .1) throw new Error("MAP_DOWNLOAD_FAILED");

  const previous = await getOfflineRoutePackage(routeId);
  const now = new Date().toISOString();
  const offlinePackage = {
    route_id: Number(routeId),
    course_id: data.route.course_id ?? null,
    route: data.route,
    points,
    route_points: routePoints,
    downloaded_at: previous?.downloaded_at || now,
    updated_at: now,
    package_version: 1,
    map: {
      min_zoom: OFFLINE_MAP_MIN_ZOOM,
      max_zoom: OFFLINE_MAP_MAX_ZOOM,
      tile_count: tileUrls.length,
      failed_tiles: mapFailed,
      bbox,
    },
    learning_material_count: fileMaterials.length,
    material_failed_count: materialFailed,
    cached_material_ids: fileMaterials
      .filter((material) => material.id != null && !materialResult.failedItems.includes(getRouteMediaUrl(material.file_url)))
      .map((material) => material.id),
    tile_urls: tileUrls,
    material_urls: materialUrls,
    status: "ready",
  };
  await saveOfflineRoutePackage(offlinePackage);
  if (previous) {
    const remaining = await getAllOfflineRoutePackages();
    await Promise.all([
      deleteUnreferencedCacheUrls(
        MAP_CACHE_NAME,
        (previous.tile_urls || []).filter((url) => !tileUrls.includes(url)),
        remaining,
        "tile_urls",
      ),
      deleteUnreferencedCacheUrls(
        MATERIAL_CACHE_NAME,
        (previous.material_urls || []).filter((url) => !materialUrls.includes(url)),
        remaining,
        "material_urls",
      ),
    ]);
  }
  let progressCacheFailed = false;
  try {
    await refreshOfflineStudentProgress(studentId, routeId);
  } catch {
    progressCacheFailed = true;
  }
  onProgress?.(progress("done", 1, 1, 99, 1));
  return progressCacheFailed
    ? { ...offlinePackage, progress_cache_failed: true }
    : offlinePackage;
}

export async function deleteOfflinePackage(routeId, studentId) {
  const target = await getOfflineRoutePackage(routeId);
  if (target) await removeOfflineRoutePackageRecord(routeId);
  if (studentId != null) await removeOfflineStudentProgress(studentId, routeId);
  if (!target) return;
  const remaining = await getAllOfflineRoutePackages();
  await Promise.all([
    deleteUnreferencedCacheUrls(MAP_CACHE_NAME, target.tile_urls, remaining, "tile_urls"),
    deleteUnreferencedCacheUrls(MATERIAL_CACHE_NAME, target.material_urls, remaining, "material_urls"),
  ]);
}
