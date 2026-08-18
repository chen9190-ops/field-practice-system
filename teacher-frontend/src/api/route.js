import request from './request.js'

export async function getTeacherRoutes(teacherId) {
  const response = await request.get(`/teachers/${teacherId}/routes`)
  const routes = Array.isArray(response.data) ? response.data : []
  const routeDetails = await Promise.all(routes.map((route) => (
    request.get(`/routes/${route.id}`)
      .then((detailResponse) => detailResponse.data)
      .catch(() => null)
  )))
  return routes.map((route, index) => ({ ...route, ...(routeDetails[index]?.id ? routeDetails[index] : {}) }))
}

export async function getRouteDetail(routeId) {
  const response = await request.get(`/routes/${routeId}`)
  return response.data
}

export async function getRoutePoints(routeId) {
  const response = await request.get(`/routes/${routeId}/points`)
  return response.data
}

export function normalizeRoutePath(routePoints) {
  return (Array.isArray(routePoints) ? routePoints : [])
    .map((point, index) => ({
      latitude: Number(point?.latitude),
      longitude: Number(point?.longitude),
      order_index: Number(point?.order_index ?? index),
    }))
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
    .sort((first, second) => first.order_index - second.order_index)
    .map((point, index) => ({ ...point, order_index: index }))
}

export async function getRouteMap(routeId, studentId) {
  const params = {
    ...(studentId ? { student_id: studentId } : {}),
    _ts: Date.now(),
  }
  const response = await request.get(`/routes/${routeId}/map`, { params })
  return {
    ...response.data,
    route_points: normalizeRoutePath(response.data?.route_points),
  }
}

export function getRouteMediaUrl(path) {
  if (!path) return ''
  if (/^(https?:|data:|blob:)/.test(path)) return path
  return `${request.defaults.baseURL}/${String(path).replace(/^\/+/, '')}`
}

export async function publishRoute(routeId) {
  const response = await request.post(`/teachers/routes/${routeId}/publish`)
  return response.data
}

export async function deleteRoute(routeId) {
  const response = await request.delete(`/teachers/routes/${routeId}`)
  return response.data
}

export async function updateRoute(routeId, data) {
  const freeObservationEnabled = Boolean(data.free_observation_enabled)
  const response = await request.patch(`/teachers/routes/${routeId}`, {
    free_observation_enabled: freeObservationEnabled,
    required_free_observation_count: freeObservationEnabled
      ? Math.max(1, Number(data.required_free_observation_count) || 1)
      : 0,
  })
  return response.data
}

export async function addRoutePoint(routeId, data) {
  const response = await request.post(`/teachers/routes/${routeId}/points`, {
    ...data,
    observation_type: 'fixed',
  })
  return response.data
}

export async function updateRoutePoint(pointId, data) {
  const response = await request.put(`/teachers/points/${pointId}`, null, { params: data })
  return response.data
}

export async function deleteRoutePoint(pointId) {
  const response = await request.delete(`/teachers/points/${pointId}`)
  return response.data
}

export async function getPointMaterials(pointId) {
  return (await request.get(`/teachers/points/${pointId}/materials`)).data
}

export async function createPointMaterial(pointId, data) {
  return (await request.post(`/teachers/points/${pointId}/materials`, data)).data
}

export async function uploadPointMaterial(pointId, { title, description, file }) {
  const formData = new FormData()
  formData.append('title', title)
  formData.append('description', description || '')
  formData.append('file', file)
  return (await request.post(`/teachers/points/${pointId}/materials/upload`, formData)).data
}

export async function updatePointMaterial(materialId, data) {
  return (await request.put(`/teachers/materials/${materialId}`, data)).data
}

export async function deletePointMaterial(materialId) {
  return (await request.delete(`/teachers/materials/${materialId}`)).data
}

// 路线创建仍复用统一后端中已有的公共接口。
export async function createRoute(data) {
  const freeObservationEnabled = Boolean(data.free_observation_enabled)
  const response = await request.post('/routes', {
    ...data,
    free_observation_enabled: freeObservationEnabled,
    required_free_observation_count: freeObservationEnabled
      ? Math.max(1, Number(data.required_free_observation_count) || 1)
      : 0,
  })
  return response.data
}

export async function createTeacherRoute(data) {
  const freeObservationEnabled = Boolean(data.free_observation_enabled)
  const response = await request.post('/routes', {
    name: data.route_name,
    description: data.route_description,
    course_id: Number(data.course_id),
    start_date: `${data.start_date}T00:00:00`,
    free_observation_enabled: freeObservationEnabled,
    required_free_observation_count: freeObservationEnabled
      ? Math.max(1, Number(data.required_free_observation_count) || 1)
      : 0,
  })
  return response.data
}

export async function saveRoutePath(routeId, paths) {
  const response = await request.post(`/routes/${routeId}/paths`, normalizeRoutePath(paths))
  return response.data
}
