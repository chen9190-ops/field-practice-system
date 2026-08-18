import { getRouteMediaUrl } from "../api/route";

export const MAP_CACHE_NAME = "field-practice-map-v1";
export const MATERIAL_CACHE_NAME = "field-practice-materials-v1";

export async function cacheUrl(cacheName, url) {
  const cache = await caches.open(cacheName);
  const response = await fetch(url, { mode: "cors", credentials: "omit" });
  if (!response.ok) throw new Error(`RESOURCE_${response.status}`);
  await cache.put(url, response.clone());
}

export async function getCachedMaterialBlobUrl(material) {
  if (!material?.file_url || typeof caches === "undefined") return "";
  const url = getRouteMediaUrl(material.file_url);
  const response = await caches.match(url, { cacheName: MATERIAL_CACHE_NAME });
  if (!response) return "";
  return URL.createObjectURL(await response.blob());
}

export async function deleteUnreferencedCacheUrls(cacheName, urls, remainingPackages, key) {
  if (!urls?.length || typeof caches === "undefined") return;
  const referenced = new Set(remainingPackages.flatMap((item) => item[key] || []));
  const cache = await caches.open(cacheName);
  await Promise.all(urls.filter((url) => !referenced.has(url)).map((url) => cache.delete(url)));
}
