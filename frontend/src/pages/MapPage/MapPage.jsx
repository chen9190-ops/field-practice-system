import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { MobilePageShell } from "../../components/layout/MobilePageShell";
import { BottomNav } from "../../components/BottomNav";
import { AMapContainer } from "../../components/map/AMapContainer";
import { LayerSwitcher } from "../../components/map/LayerSwitcher";
import { LocateButton } from "../../components/map/LocateButton";
import { MapHeader } from "../../components/map/MapHeader";
import { ObservationMarkers } from "../../components/map/ObservationMarkers";
import { RoutePolyline } from "../../components/map/RoutePolyline";
import { StudentTrackPolyline } from "../../components/map/StudentTrackPolyline";
import { UserLocationMarker } from "../../components/map/UserLocationMarker";
import {
  autoCheckIn,
  CHECK_IN_RADIUS_METERS,
  FALLBACK_MAP_CENTER,
  loadMapPageData,
} from "../../services/mapService";
import { convertCoordinatesForAmap } from "../../utils/amapPathConversion";
import { useStudentAuth } from "../../context/StudentAuthContext";
import "./MapPage.css";

const initialCheckinState = {
  pending: false,
  message: "",
  error: false,
};

export function MapPage() {
  const navigate = useNavigate();
  const { student } = useStudentAuth();
  const studentId = student?.id;
  const params = new URLSearchParams(window.location.search);
  const routeId = params.get("route_id") || 1;
  const mapContainerRef = useRef(null);
  const [dataState, setDataState] = useState({
    loading: true,
    error: "",
    route: { id: routeId, name: "华山地质实习路线" },
    observations: [],
    routePath: [],
    studentTrackPath: [],
    routeCoordinateSystem: null,
    studentTrackCoordinateSystem: null,
    routeHasPresetPath: false,
    studentTrackScope: "unavailable",
  });
  const [runtime, setRuntime] = useState(null);
  const [mapObservations, setMapObservations] = useState([]);
  const [mapError, setMapError] = useState("");
  const [layerMode, setLayerMode] = useState("terrain");
  const [routeVisible, setRouteVisible] = useState(true);
  const [studentTrackVisible, setStudentTrackVisible] = useState(true);
  const [routeOverlay, setRouteOverlay] = useState(null);
  const [studentTrackOverlay, setStudentTrackOverlay] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [userPosition, setUserPosition] = useState(null);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [userHeading, setUserHeading] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [checkinState, setCheckinState] = useState(initialCheckinState);

  useEffect(() => {
    let active = true;
    if (!studentId) return () => { active = false; };

    loadMapPageData(routeId, studentId).then((result) => {
      if (!active) {
        return;
      }
      console.log("map state observations:", result.observations);
      setDataState({
        loading: false,
        error: "",
        ...result,
      });
      setSelectedId(result.observations[0]?.id ?? null);
    }).catch((error) => {
      if (!active) {
        return;
      }
      setDataState((current) => ({
        ...current,
        loading: false,
        error: error.message || "观察点数据加载失败",
      }));
    });

    return () => {
      active = false;
    };
  }, [routeId, studentId]);

  useEffect(() => {
    let active = true;
    const coordinates = dataState.observations.map((observation) => [
      observation.longitude,
      observation.latitude,
    ]);

    convertCoordinatesForAmap(
      runtime?.AMap,
      coordinates,
      dataState.routeCoordinateSystem,
    ).then((convertedCoordinates) => {
      if (!active) {
        return;
      }
      setMapObservations(
        convertedCoordinates.map((coordinate, index) => ({
          ...dataState.observations[index],
          longitude: coordinate[0],
          latitude: coordinate[1],
        })),
      );
    });

    return () => {
      active = false;
    };
  }, [dataState.observations, dataState.routeCoordinateSystem, runtime]);

  const fallbackCenter = useMemo(() => {
    const firstObservation = mapObservations[0] || dataState.observations[0];
    return firstObservation
      ? [firstObservation.longitude, firstObservation.latitude]
      : FALLBACK_MAP_CENTER;
  }, [dataState.observations, mapObservations]);

  const distanceTo = useCallback((observation, position = userPosition) => {
    if (!runtime?.AMap || !position || !observation) {
      return null;
    }

    return runtime.AMap.GeometryUtil.distance(
      position,
      [observation.longitude, observation.latitude],
    );
  }, [runtime, userPosition]);

  const nearestObservationId = useMemo(() => {
    if (!runtime?.AMap || !userPosition || mapObservations.length === 0) {
      return null;
    }

    return mapObservations.reduce((nearest, observation) => {
      if (observation.status === "completed") {
        return nearest;
      }
      const distance = distanceTo(observation, userPosition);
      if (!nearest || distance < nearest.distance) {
        return { id: observation.id, distance };
      }
      return nearest;
    }, null)?.id ?? null;
  }, [distanceTo, mapObservations, runtime, userPosition]);

  const observations = useMemo(() => (
    mapObservations.map((observation) => {
      if (observation.status === "completed") {
        return observation;
      }
      return {
        ...observation,
        status: observation.id === nearestObservationId ? "available" : "locked",
      };
    })
  ), [mapObservations, nearestObservationId]);

  useEffect(() => {
    if (nearestObservationId != null && !selectedPoint) {
      setSelectedId(nearestObservationId);
    }
  }, [nearestObservationId, selectedPoint]);

  const selectedObservation = observations.find(
    (observation) => observation.id === selectedId,
  ) || observations[0] || null;
  const nearestObservation = observations.find(
    (observation) => observation.id === nearestObservationId,
  ) || observations[0] || null;
  const detailPoint = selectedPoint
    ? observations.find((observation) => observation.id === selectedPoint.id)
      || selectedPoint
    : null;
  const selectedDistance = distanceTo(selectedObservation);
  const nearestDistance = distanceTo(nearestObservation);
  const detailDistance = distanceTo(detailPoint);
  const formatDistance = (distance) => {
    if (distance == null) {
      return "等待定位";
    }
    return distance < 1000
      ? `${Math.round(distance)} m`
      : `${(distance / 1000).toFixed(1)} km`;
  };
  const accuracyText = Number.isFinite(locationAccuracy)
    ? locationAccuracy > 50
      ? `定位精度较低：±${Math.round(locationAccuracy)} m`
      : `精度 ±${Math.round(locationAccuracy)} m`
    : "定位精度未知";

  const handleReady = useCallback((nextRuntime) => {
    setRuntime(nextRuntime);
    setMapError("");
  }, []);

  const handleBack = useCallback(() => {
    navigate("/", { replace: true });
  }, [navigate]);

  const handleRoutePolylineChange = useCallback((polyline, pointCount) => {
    setRouteOverlay(polyline ? { polyline, pointCount } : null);
  }, []);

  const handleStudentTrackPolylineChange = useCallback((polyline, pointCount) => {
    setStudentTrackOverlay(polyline ? { polyline, pointCount } : null);
  }, []);

  useEffect(() => {
    const overlays = [routeOverlay, studentTrackOverlay]
      .filter((entry) => entry?.pointCount >= 2)
      .map((entry) => entry.polyline);
    if (!runtime?.map || overlays.length === 0) {
      return undefined;
    }
    const frameId = requestAnimationFrame(() => {
      runtime.map.setFitView(overlays, false, [90, 45, 230, 45]);
    });
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [routeOverlay, runtime, studentTrackOverlay]);

  const handleLocationSuccess = useCallback((location) => {
    setUserPosition(location.position);
    setLocationAccuracy(location.accuracy);
    setUserHeading(location.heading);
    setIsLocating(false);
    setLocationMessage("");
  }, []);

  const handleLocationError = useCallback((message) => {
    setIsLocating(false);
    setLocationMessage(message);
  }, []);

  const handleSelectObservation = useCallback((observation) => {
    setSelectedId(observation.id);
    setSelectedPoint(observation);
    runtime?.map.panTo(
      [observation.longitude, observation.latitude],
      500,
    );
  }, [runtime]);

  const handleOpenNearestObservation = useCallback(() => {
    if (!nearestObservation) {
      return;
    }
    setSelectedId(nearestObservation.id);
    setSelectedPoint(nearestObservation);
  }, [nearestObservation]);

  const handleAutoCheckIn = async () => {
    if (!studentId || !userPosition || !selectedObservation) {
      return;
    }

    setCheckinState({ pending: true, message: "", error: false });

    try {
      const response = await autoCheckIn({
        routeId: dataState.route.id,
        studentId,
        longitude: userPosition[0],
        latitude: userPosition[1],
      });
      const success = response.checkin_id || response.message?.includes("已签到");

      if (success) {
        setDataState((current) => ({
          ...current,
          observations: current.observations.map((observation) => (
            Number(observation.id) === Number(response.point_id || selectedObservation.id)
              ? { ...observation, status: "completed" }
              : observation
          )),
        }));
      }

      setCheckinState({
        pending: false,
        message: response.message || "签到请求已完成",
        error: !success,
      });

      if (success) {
        navigate(
          `/observe/new?route_id=${dataState.route.id}&mode=fixed&point_id=${selectedObservation.id}&point_name=${encodeURIComponent(selectedObservation.name)}&latitude=${selectedObservation.latitude}&longitude=${selectedObservation.longitude}`,
        );
      }
    } catch {
      setCheckinState({
        pending: false,
        message: "签到失败，请确认后端服务与定位权限",
        error: true,
      });
    }
  };

  const handleRandomObservation = useCallback(() => {
    navigate(`/observe/new?route_id=${routeId}&mode=random`);
  }, [navigate, routeId]);

  const canCheckIn = Boolean(
    userPosition
    && selectedObservation
    && selectedObservation.status === "available"
    && selectedDistance != null
    && selectedDistance <= CHECK_IN_RADIUS_METERS,
  );

  if (!student) {
    return <Navigate to="/student/login" replace />;
  }

  return (
    <MobilePageShell className="map-page">
      {!dataState.loading && (
        <AMapContainer
          ref={mapContainerRef}
          fallbackCenter={fallbackCenter}
          layerMode={layerMode}
          onReady={handleReady}
          onLocationStart={() => {
            setIsLocating(true);
            setLocationMessage("");
          }}
          onLocationSuccess={handleLocationSuccess}
          onLocationError={handleLocationError}
          onMapError={setMapError}
        />
      )}

      <UserLocationMarker
        AMap={runtime?.AMap}
        map={runtime?.map}
        position={userPosition}
        accuracy={locationAccuracy}
        heading={userHeading}
      />
      <ObservationMarkers
        AMap={runtime?.AMap}
        map={runtime?.map}
        observations={observations}
        selectedId={selectedId}
        onSelect={handleSelectObservation}
      />
      <RoutePolyline
        AMap={runtime?.AMap}
        map={runtime?.map}
        path={dataState.routePath}
        coordinateSystem={dataState.routeCoordinateSystem}
        visible={routeVisible}
        onPolylineChange={handleRoutePolylineChange}
      />
      <StudentTrackPolyline
        AMap={runtime?.AMap}
        map={runtime?.map}
        path={dataState.studentTrackPath}
        coordinateSystem={dataState.studentTrackCoordinateSystem}
        visible={studentTrackVisible}
        onPolylineChange={handleStudentTrackPolylineChange}
      />

      <MapHeader
        title={dataState.route.name}
        onBack={handleBack}
      />
      <LayerSwitcher
        mode={layerMode}
        onChange={setLayerMode}
        routeVisible={routeVisible}
        onRouteVisibleChange={setRouteVisible}
        studentTrackVisible={studentTrackVisible}
        onStudentTrackVisibleChange={setStudentTrackVisible}
      />
      <LocateButton
        isLocating={isLocating}
        accuracyText={accuracyText}
        onLocate={() => mapContainerRef.current?.locate()}
      />

      {(dataState.loading || mapError) && (
        <div className="map-state-panel" role="status">
          {dataState.loading ? "地图数据加载中…" : mapError}
        </div>
      )}
      {dataState.error && (
        <div className="map-data-message" role="status">{dataState.error}</div>
      )}
      {locationMessage && (
        <div className="map-location-message" role="status">
          {locationMessage}
        </div>
      )}

      {!dataState.loading && !detailPoint && (
        <button
          type="button"
          className="nearest-point-card"
          onClick={handleOpenNearestObservation}
          disabled={!nearestObservation}
          aria-label={nearestObservation
            ? `查看${nearestObservation.name}详情`
            : "当前路线暂无观察点"}
        >
          <span className="nearest-point-card__label">当前最近观察点</span>
          <strong>{nearestObservation?.name || "当前路线暂无观察点"}</strong>
          {nearestObservation && (
            <span className="nearest-point-card__distance">
              距离：{formatDistance(nearestDistance)}
            </span>
          )}
          <span className="nearest-point-card__arrow" aria-hidden="true">›</span>
        </button>
      )}

      {detailPoint && (
        <section
          className="point-detail-panel"
          role="dialog"
          aria-labelledby="point-detail-title"
        >
          <div className="point-detail-panel__handle" aria-hidden="true" />
          <button
            type="button"
            className="point-detail-panel__close"
            onClick={() => setSelectedPoint(null)}
            aria-label="关闭点位详情"
          >
            ×
          </button>

          <header className="point-detail-panel__header">
            <h2 id="point-detail-title">{detailPoint.name}</h2>
            <p>{detailPoint.code}</p>
            <span>距离：{formatDistance(detailDistance)}</span>
          </header>

          <div className="point-detail-panel__section">
            <h3>点位介绍</h3>
            <p>
              {detailPoint.description || (
                <>暂无介绍，<br />等待教师端发布。</>
              )}
            </p>
          </div>

          <div className="point-detail-panel__section">
            <h3>学习资料</h3>
            <p>
              {detailPoint.materials || (
                <>暂无学习资料，<br />等待教师端上传。</>
              )}
            </p>
          </div>

          {checkinState.message && (
            <p className={`point-detail-panel__feedback ${checkinState.error ? "is-error" : ""}`}>
              {checkinState.message}
            </p>
          )}

          <div className="point-detail-panel__actions">
            <button
              type="button"
              className="point-detail-panel__checkin"
              onClick={handleAutoCheckIn}
              disabled={!canCheckIn || checkinState.pending}
            >
              {checkinState.pending
                ? "签到中"
                : selectedObservation?.status === "completed"
                  ? "已完成"
                  : "自动签到"}
            </button>
            {detailDistance != null
              && detailDistance > CHECK_IN_RADIUS_METERS && (
                <button
                  type="button"
                  className="point-detail-panel__random"
                  onClick={handleRandomObservation}
                >
                  自主观察
                </button>
              )}
          </div>
        </section>
      )}
      <BottomNav activeId="map" />
    </MobilePageShell>
  );
}
