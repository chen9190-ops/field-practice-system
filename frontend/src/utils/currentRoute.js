const CURRENT_ROUTE_STORAGE_KEY = "field-practice-current-route-id";

export function getCurrentRouteId() {
  try {
    const routeId = Number(window.localStorage.getItem(CURRENT_ROUTE_STORAGE_KEY));
    return Number.isInteger(routeId) && routeId > 0 ? routeId : null;
  } catch {
    return null;
  }
}

export function setCurrentRouteId(routeId) {
  const normalizedRouteId = Number(routeId);
  if (!Number.isInteger(normalizedRouteId) || normalizedRouteId <= 0) return;
  try {
    window.localStorage.setItem(CURRENT_ROUTE_STORAGE_KEY, String(normalizedRouteId));
  } catch {
    // Route params still keep the current navigation usable when storage is unavailable.
  }
}

export function clearCurrentRouteId() {
  try {
    window.localStorage.removeItem(CURRENT_ROUTE_STORAGE_KEY);
  } catch {
    // Ignore storage access failures.
  }
}

export function resolveCurrentRouteId(routeId) {
  const requestedRouteId = Number(routeId);
  return Number.isInteger(requestedRouteId) && requestedRouteId > 0
    ? requestedRouteId
    : getCurrentRouteId();
}
