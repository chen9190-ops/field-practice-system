import request from "../api/request";
import { getStudentTrack } from "../api/track";
import { getRoutePath } from "../api/route";
import { getCheckin } from "../api/checkin";

export const MAP_ROUTE_ID = 1;
export const CHECK_IN_RADIUS_METERS = 50;
export const FALLBACK_MAP_CENTER = [110.0892, 34.4837];

const ROUTE_PATH_FIELDS = [
  "route_points",
  "track_points",
  "path",
  "coordinates",
  "trajectory",
  "polyline",
];

function normaliseCoordinateSystem(...values) {
  const value = values.find(Boolean);
  if (!value) {
    return null;
  }
  const normalised = String(value).toUpperCase().replace(/[-_]/g, "");
  if (normalised === "GCJ02") {
    return "GCJ02";
  }
  if (normalised === "WGS84" || normalised === "GPS") {
    return "WGS84";
  }
  return null;
}

function rawCoordinate(point) {
  const longitude = Array.isArray(point) ? Number(point[0]) : Number(point?.longitude);
  const latitude = Array.isArray(point) ? Number(point[1]) : Number(point?.latitude);
  return Number.isFinite(longitude) && Number.isFinite(latitude)
    ? [longitude, latitude]
    : null;
}

function extractRoutePath(routePayload) {
  const containers = [routePayload, routePayload?.route].filter(Boolean);
  for (const container of containers) {
    for (const field of ROUTE_PATH_FIELDS) {
      if (Array.isArray(container[field])) {
        return {
          field,
          path: container[field].map(rawCoordinate).filter(Boolean),
        };
      }
    }
  }
  return { field: null, path: [] };
}

function trackTimestamp(track) {
  const value = track.recorded_at
    || track.timestamp
    || track.recorded_time;
  const timestamp = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : null;
}

function routeTimeRange(routePayload) {
  const route = routePayload?.route || {};
  const startValue = route.start_time || route.start_at || route.start_date;
  const endValue = route.end_time || route.end_at || route.end_date;
  const start = startValue ? new Date(startValue).getTime() : Number.NaN;
  const end = endValue ? new Date(endValue).getTime() : Number.NaN;
  return Number.isFinite(start) && Number.isFinite(end)
    ? { start, end }
    : null;
}

function normalisePoint(point, index, completedPointIds) {
  const coordinate = rawCoordinate(point);
  console.log("normalize point:", point, coordinate);

  if (!coordinate) {
    return null;
  }

  const id = point.id ?? index + 1;

  return {
    id,
    code: point.code || point.point_code || `P${index + 1}`,
    name: point.name || point.point_name || `观察点 ${index + 1}`,
    longitude: coordinate[0],
    latitude: coordinate[1],
    status: completedPointIds.has(Number(id)) ? "completed" : "locked",
    task: point.task || "",
    description: point.description || point.point_description || "",
    learning_materials: Array.isArray(point.learning_materials)
      ? point.learning_materials
      : [],
  };
}

function normalizeStudentObservation(observation) {
  const coordinate = rawCoordinate(observation);

  if (!coordinate) {
    return null;
  }

  return {
    id: observation.id,
    type: "random",
    name: "自主观察点",
    longitude: coordinate[0],
    latitude: coordinate[1],
    description: observation.observation_text || "",
    photo_url: observation.photo_url || null,
  };
}

export async function loadMapPageData(
  routeId = MAP_ROUTE_ID,
  studentId,
) {
  if (!studentId) {
    throw new Error("缺少当前登录学生信息");
  }

  const [routeResult, checkinResult, trackResult] = await Promise.allSettled([
    getRoutePath(routeId, studentId),
    getCheckin(studentId, routeId),
    getStudentTrack(studentId, routeId),
  ]);

  if (routeResult.status === "rejected") {
    throw new Error("观察点数据加载失败，请确认后端服务已启动");
  }

  const routePayload = routeResult.value.data || {};
  console.log("route payload:", routePayload);
  const checkins = checkinResult.status === "fulfilled"
    && Array.isArray(checkinResult.value.data)
    ? checkinResult.value.data
    : [];
  const completedPointIds = new Set(
    checkins
      .filter((checkin) => checkin.status === "success")
      .map((checkin) => Number(checkin.point_id)),
  );
  const sourcePoints = Array.isArray(routePayload.points)
    ? routePayload.points
    : [];
  console.log("source points:", sourcePoints);
  const observations = sourcePoints
    .map((point, index) => normalisePoint(point, index, completedPointIds))
    .filter(Boolean);
  console.log("normalized observations:", observations);
  const sourceStudentObservations = Array.isArray(routePayload.student_observations)
    ? routePayload.student_observations
    : [];
  const studentObservations = sourceStudentObservations
    .map(normalizeStudentObservation)
    .filter(Boolean);

  const trackPayload = trackResult.status === "fulfilled"
    ? trackResult.value.data
    : [];
  const sourceTracks = Array.isArray(trackPayload)
    ? trackPayload
    : Array.isArray(trackPayload?.tracks)
      ? trackPayload.tracks
      : [];
  const { field: routePathField, path: routePath } = extractRoutePath(routePayload);
  const routeCoordinateSystem = normaliseCoordinateSystem(
  routePayload.coordinate_system,
  routePayload.route?.coordinate_system,
  import.meta.env.VITE_BACKEND_COORDINATE_SYSTEM,
);
  const studentTrackCoordinateSystem = normaliseCoordinateSystem(
    trackPayload?.coordinate_system,
    sourceTracks[0]?.coordinate_system,
    import.meta.env.VITE_BACKEND_COORDINATE_SYSTEM,
  );
  const hasRouteId = sourceTracks.some((track) => track.route_id != null);
  const hasSessionId = sourceTracks.some((track) => track.session_id != null);
  const currentSessionId = routePayload.route?.session_id
    ?? routePayload.session_id
    ?? null;
  const timeRange = routeTimeRange(routePayload);

  let scopedTracks = [];
  let studentTrackScope = "unavailable";
  if (hasRouteId) {
    scopedTracks = sourceTracks.filter(
      (track) => Number(track.route_id) === Number(routeId),
    );
    studentTrackScope = "route_id";
  } else if (hasSessionId && currentSessionId != null) {
    scopedTracks = sourceTracks.filter(
      (track) => String(track.session_id) === String(currentSessionId),
    );
    studentTrackScope = "session_id";
  } else if (timeRange) {
    scopedTracks = sourceTracks.filter((track) => {
      const timestamp = trackTimestamp(track);
      return timestamp != null
        && timestamp >= timeRange.start
        && timestamp <= timeRange.end;
    });
    studentTrackScope = "route_time_range";
  }

  const studentTrackPath = scopedTracks
    .map((track) => ({
      coordinate: rawCoordinate(track),
      timestamp: trackTimestamp(track),
    }))
    .filter((track) => track.coordinate && track.timestamp != null)
    .sort((left, right) => left.timestamp - right.timestamp)
    .map((track) => track.coordinate);

  const canDrawRoute = routePath.length >= 2 && routeCoordinateSystem != null;
  const canDrawStudentTrack = (
    studentTrackPath.length >= 2
    && studentTrackCoordinateSystem != null
    && studentTrackScope !== "unavailable"
  );

  return {
    route: {
      id: routePayload.route?.id ?? routeId,
      name: routePayload.route?.name || "华山地质实习路线",
      description: routePayload.route?.description || "",
    },
    observations,
    studentObservations,
    routePath: canDrawRoute ? routePath : [],
    studentTrackPath: canDrawStudentTrack ? studentTrackPath : [],
    routeCoordinateSystem,
    studentTrackCoordinateSystem,
    routeHasPresetPath: routePath.length >= 2,
    studentTrackScope,
    diagnostics: {
      routeResponseFields: Object.keys(routePayload),
      routePathField,
      routeCoordinateSample: routePath.slice(0, 2),
      trackResponseFields: sourceTracks[0]
        ? Object.keys(sourceTracks[0])
        : Object.keys(trackPayload || {}),
      trackPointCount: sourceTracks.length,
      hasRouteId,
      hasSessionId,
      trackCoordinateSample: sourceTracks.slice(0, 2).map(rawCoordinate),
    },
  };
}

export async function autoCheckIn({
  routeId = MAP_ROUTE_ID,
  studentId,
  latitude,
  longitude,
}) {
  if (!studentId) {
    throw new Error("缺少当前登录学生信息");
  }

  const response = await request.post(`/routes/${routeId}/auto_checkin`, {
    student_id: studentId,
    latitude,
    longitude,
  });
  return response.data;
}
