import { fromLonLat } from 'ol/proj.js'

export function convertLonLatToCoordinate({ longitude, latitude }) {
  return fromLonLat([Number(longitude), Number(latitude)])
}

export function normalizeRoutePoints(routePoints) {
  return (Array.isArray(routePoints) ? routePoints : [])
    .map((point) => ({
      ...point,
      longitude: Number(point?.longitude),
      latitude: Number(point?.latitude),
    }))
    .filter((point) => (
      Number.isFinite(point.longitude) && Number.isFinite(point.latitude)
    ))
}

export function convertRoutePointsToCoordinates(routePoints) {
  return normalizeRoutePoints(routePoints)
    .map((point) => convertLonLatToCoordinate(point))
}

export function fitRouteExtent(map, extent, options = {}) {
  if (!map || !Array.isArray(extent) || extent.length !== 4 || extent.some((value) => !Number.isFinite(value))) return

  map.updateSize()
  map.getView().fit(extent, {
    padding: [50, 50, 50, 50],
    maxZoom: 16,
    duration: 300,
    ...options,
  })
}
