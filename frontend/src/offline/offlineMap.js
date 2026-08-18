import { MAP_CACHE_NAME } from "./offlineCache";

export const OFFLINE_MAP_MIN_ZOOM = 13;
export const OFFLINE_MAP_MAX_ZOOM = 17;
export const MAX_OFFLINE_TILES = 1500;
export const OFFLINE_TILE_TEMPLATE = "https://a.tile.opentopomap.org/{z}/{x}/{y}.png";

function clampLatitude(latitude) {
  return Math.max(-85.05112878, Math.min(85.05112878, latitude));
}

export function lonLatToTile(longitude, latitude, zoom) {
  const scale = 2 ** zoom;
  const latitudeRadians = clampLatitude(latitude) * Math.PI / 180;
  return {
    x: Math.floor((longitude + 180) / 360 * scale),
    y: Math.floor((1 - Math.asinh(Math.tan(latitudeRadians)) / Math.PI) / 2 * scale),
  };
}

export function expandBoundingBoxByMeters(bbox, meters = 1500) {
  const centerLatitude = (bbox.minLat + bbox.maxLat) / 2;
  const latDelta = meters / 111320;
  const longitudeScale = Math.max(.01, Math.cos(centerLatitude * Math.PI / 180));
  const lonDelta = meters / (111320 * longitudeScale);
  return {
    minLon: bbox.minLon - lonDelta,
    maxLon: bbox.maxLon + lonDelta,
    minLat: bbox.minLat - latDelta,
    maxLat: bbox.maxLat + latDelta,
  };
}

export function getRouteBoundingBox(routePoints, points) {
  const coordinates = [...(routePoints || []), ...(points || [])]
    .map((item) => ({ lon: Number(item.longitude), lat: Number(item.latitude) }))
    .filter((item) => Number.isFinite(item.lon) && Number.isFinite(item.lat));
  if (!coordinates.length) return null;
  return expandBoundingBoxByMeters({
    minLon: Math.min(...coordinates.map((item) => item.lon)),
    maxLon: Math.max(...coordinates.map((item) => item.lon)),
    minLat: Math.min(...coordinates.map((item) => item.lat)),
    maxLat: Math.max(...coordinates.map((item) => item.lat)),
  });
}

export function getOfflineTileUrls(bbox, minZoom = OFFLINE_MAP_MIN_ZOOM, maxZoom = OFFLINE_MAP_MAX_ZOOM) {
  if (!bbox) return [];
  const urls = [];
  for (let zoom = minZoom; zoom <= maxZoom; zoom += 1) {
    const northwest = lonLatToTile(bbox.minLon, bbox.maxLat, zoom);
    const southeast = lonLatToTile(bbox.maxLon, bbox.minLat, zoom);
    for (let x = northwest.x; x <= southeast.x; x += 1) {
      for (let y = northwest.y; y <= southeast.y; y += 1) {
        urls.push(`https://a.tile.opentopomap.org/${zoom}/${x}/${y}.png`);
      }
    }
  }
  return urls;
}

export function offlineTileLoadFunction(imageTile, src) {
  const image = imageTile.getImage();
  if (navigator.onLine || typeof caches === "undefined") {
    image.src = src;
    return;
  }
  caches.match(src, { cacheName: MAP_CACHE_NAME }).then(async (response) => {
    if (!response) {
      image.src = "";
      return;
    }
    const objectUrl = URL.createObjectURL(await response.blob());
    image.onload = () => URL.revokeObjectURL(objectUrl);
    image.onerror = () => URL.revokeObjectURL(objectUrl);
    image.src = objectUrl;
  }).catch(() => { image.src = ""; });
}
