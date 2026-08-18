import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { autoCheckIn, getCheckin } from "../api/checkin";
import { createAIAnalysis, getObservationRecords } from "../api/observation";
import { getRoute, getRouteMap } from "../api/route";
import { getStudentRouteSummary } from "../api/dashboard";
import { backIcon } from "../assets/observation";
import { BottomNav } from "../components/BottomNav";
import { MobilePageShell } from "../components/layout/MobilePageShell";
import { ElevationProfileChart } from "../components/map/ElevationProfileChart";
import { GeologyInfoCard } from "../components/map/GeologyInfoCard";
import { CheckinProgressBanner } from "../components/map/CheckinProgressBanner";
import { ObservationInfoCard } from "../components/map/ObservationInfoCard";
import { StudentObservationInfoCard } from "../components/map/StudentObservationInfoCard";
import { StudentRouteMap } from "../components/map/StudentRouteMap";
import { getElevation, getElevations } from "../services/elevationService";
import { setCurrentRouteId } from "../utils/currentRoute";
import { useStudentAuth } from "../context/StudentAuthContext";
import {
  getOfflineQueueItems,
  getOfflineRoutePackage,
  getOfflineStudentProgress,
  getPendingOfflineCheckins,
} from "../offline/offlineDb";
import { savePendingCheckin } from "../offline/offlineObservationQueue";
import {
  updateOfflineStudentCheckins,
  updateOfflineStudentObservations,
} from "../offline/offlineStudentProgress";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import "./StudentRouteMapPage.css";

const EARTH_RADIUS_METERS = 6371008.8;
const CHECKIN_RADIUS_METERS = 50;
const MAX_ROUTE_ELEVATION_SAMPLES = 60;

function getCachedRouteCourseId(routeId) {
  try {
    const courseId = Number(localStorage.getItem(`field-practice-route-course-${routeId}`));
    return Number.isInteger(courseId) && courseId > 0 ? courseId : null;
  } catch {
    return null;
  }
}

function cacheRouteCourseId(routeId, courseId) {
  const normalizedCourseId = Number(courseId);
  if (!Number.isInteger(normalizedCourseId) || normalizedCourseId <= 0) return;
  try {
    localStorage.setItem(`field-practice-route-course-${routeId}`, String(normalizedCourseId));
  } catch {
    // Current route state remains usable when localStorage is unavailable.
  }
}

function calculateDistance(firstPosition, secondPosition) {
  if (!firstPosition || !secondPosition) return null;

  const firstLongitude = Number(firstPosition.longitude);
  const firstLatitude = Number(firstPosition.latitude);
  const secondLongitude = Number(secondPosition.longitude);
  const secondLatitude = Number(secondPosition.latitude);
  if (![firstLongitude, firstLatitude, secondLongitude, secondLatitude].every(Number.isFinite)) {
    return null;
  }

  const toRadians = (degrees) => degrees * (Math.PI / 180);
  const latitudeDelta = toRadians(secondLatitude - firstLatitude);
  const longitudeDelta = toRadians(secondLongitude - firstLongitude);
  const firstLatitudeRadians = toRadians(firstLatitude);
  const secondLatitudeRadians = toRadians(secondLatitude);
  const haversine = (
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitudeRadians)
      * Math.cos(secondLatitudeRadians)
      * Math.sin(longitudeDelta / 2) ** 2
  );

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

function formatDistance(distance) {
  return distance < 1000
    ? `${Math.round(distance)}m`
    : `${(distance / 1000).toFixed(1)}km`;
}

function getCurrentGpsPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GEOLOCATION_UNAVAILABLE"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        longitude: position.coords.longitude,
        latitude: position.coords.latitude,
        accuracy: position.coords.accuracy,
        recordedAt: position.timestamp,
      }),
      reject,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

export function StudentRouteMapPage() {
  const { routeId } = useParams();
  const navigate = useNavigate();
  const { student } = useStudentAuth();
  const isOnline = useOnlineStatus();
  const [mapData, setMapData] = useState({
    route: null,
    points: [],
    route_points: [],
    student_observations: [],
  });
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [selectedStudentObservation, setSelectedStudentObservation] = useState(null);
  const [selectedGeologyFeature, setSelectedGeologyFeature] = useState(null);
  const [isObservationDetailsOpen, setIsObservationDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offlinePackage, setOfflinePackage] = useState(null);
  const [checkedPointIds, setCheckedPointIds] = useState(() => new Set());
  const [pendingCheckins, setPendingCheckins] = useState(() => new Map());
  const [pendingObservations, setPendingObservations] = useState([]);
  const [checkinsLoading, setCheckinsLoading] = useState(true);
  const [checkinState, setCheckinState] = useState({ pending: false, message: "", error: false });
  const [checkinDistance, setCheckinDistance] = useState(null);
  const [arrivalPosition, setArrivalPosition] = useState(null);
  const [showCheckinUpload, setShowCheckinUpload] = useState(false);
  const [checkinPhoto, setCheckinPhoto] = useState(null);
  const [checkinPhotoPreview, setCheckinPhotoPreview] = useState("");
  const [createdObservationId, setCreatedObservationId] = useState(null);
  const [createdPhotoUrl, setCreatedPhotoUrl] = useState("");
  const [observationRecords, setObservationRecords] = useState([]);
  const [aiState, setAiState] = useState({ pending: false, message: "" });
  const [currentPosition, setCurrentPosition] = useState(null);
  const [studentTrack, setStudentTrack] = useState([]);
  const [locationError, setLocationError] = useState("");
  const [elevationInfo, setElevationInfo] = useState(null);
  const elevationRequestRef = useRef(0);
  const [isElevationProfileOpen, setIsElevationProfileOpen] = useState(false);
  const [elevationProfile, setElevationProfile] = useState({ status: "idle", data: [] });
  const [taskProgress, setTaskProgress] = useState(null);
  const [checkinProgressBanner, setCheckinProgressBanner] = useState(null);

  useEffect(() => {
    setCurrentRouteId(routeId);
  }, [routeId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    async function loadRoute() {
      let data = null;
      let storedPackage = null;
      const storedProgress = await getOfflineStudentProgress(student.id, routeId).catch(() => null);
      if (navigator.onLine) {
        try {
          data = (await getRouteMap(routeId, student.id)).data;
          const routeResponse = await getRoute(routeId).catch(() => ({ data: null }));
          const courseId = Number(routeResponse.data?.course_id);
          if (data?.route && Number.isInteger(courseId) && courseId > 0) {
            data = { ...data, route: { ...data.route, course_id: courseId } };
            cacheRouteCourseId(routeId, courseId);
          }
        } catch {
          data = null;
        }
      }
      if (!data?.route) {
        storedPackage = await getOfflineRoutePackage(routeId);
        if (storedPackage) {
          const courseId = storedPackage.course_id
            ?? storedPackage.route?.course_id
            ?? getCachedRouteCourseId(routeId);
          data = {
            route: { ...storedPackage.route, course_id: courseId },
            points: storedPackage.points,
            route_points: storedPackage.route_points,
            student_observations: (storedProgress?.observations || [])
              .filter((item) => ["free", "self"].includes(item.observation_type)),
          };
        }
      }
      if (!data?.route) throw new Error("ROUTE_NOT_AVAILABLE");

      const [summaryResponse, recordsResponse] = await Promise.all([
        navigator.onLine
          ? getStudentRouteSummary(student.id, routeId).catch(() => ({ data: null }))
          : Promise.resolve({ data: null }),
        navigator.onLine
          ? getObservationRecords(student.id).catch(() => ({
              data: storedProgress?.observations || [],
              cacheFallback: true,
            }))
          : Promise.resolve({ data: storedProgress?.observations || [] }),
      ]);
      if (!active) return;
      const routeRecords = (Array.isArray(recordsResponse.data) ? recordsResponse.data : [])
        .filter((record) => Number(record.route_id) === Number(routeId));
      if (navigator.onLine && !recordsResponse.cacheFallback) {
        updateOfflineStudentObservations(student.id, routeId, routeRecords).catch(() => {});
      }
      setMapData({
          route: data.route,
          points: Array.isArray(data.points) ? data.points : [],
          route_points: Array.isArray(data.route_points) ? data.route_points : [],
          student_observations: Array.isArray(data.student_observations)
            ? data.student_observations.filter(
                (item) => ["free", "self"].includes(item.observation_type)
              )
            : [],
        });
      setTaskProgress(summaryResponse.data?.progress || null);
      setObservationRecords(routeRecords);
      setOfflinePackage(storedPackage);
    }

    loadRoute()
      .catch(() => active && setError("当前路线不可用，请联网下载离线包后再试"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [routeId, student.id, isOnline]);

  useEffect(() => {
    setCurrentPosition(null);
    setStudentTrack([]);
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("当前设备不支持实时定位");
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const nextPosition = {
          longitude: position.coords.longitude,
          latitude: position.coords.latitude,
          accuracy: position.coords.accuracy,
          recordedAt: position.timestamp,
        };
        setCurrentPosition(nextPosition);
        setStudentTrack((current) => {
          const previous = current[current.length - 1];
          if (previous
            && previous.longitude === nextPosition.longitude
            && previous.latitude === nextPosition.latitude) {
            return current;
          }
          return [...current, nextPosition];
        });
        setLocationError("");
      },
      (positionError) => {
        setLocationError(positionError.code === positionError.PERMISSION_DENIED
          ? "定位权限被拒绝，无法显示当前位置"
          : "暂时无法获取当前位置");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 3000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [routeId]);

  useEffect(() => {
    let active = true;
    setCheckinsLoading(true);
    if (!navigator.onLine) {
      getOfflineStudentProgress(student.id, routeId)
        .then((progress) => {
          if (!active) return;
          const completedIds = (progress?.checkins || [])
            .filter((record) => record.status === "success")
            .map((record) => Number(record.point_id));
          setCheckedPointIds(new Set(completedIds));
        })
        .catch(() => {
          if (active) setCheckedPointIds(new Set());
        })
        .finally(() => {
          if (active) setCheckinsLoading(false);
        });
      return () => { active = false; };
    }
    getCheckin(student.id, routeId)
      .then(({ data }) => {
        if (!active) return;
        const completedIds = (Array.isArray(data) ? data : [])
          .filter((record) => record.status === "success")
          .map((record) => Number(record.point_id));
        setCheckedPointIds(new Set(completedIds));
        updateOfflineStudentCheckins(student.id, routeId, data).catch(() => {});
      })
      .catch(async () => {
        const progress = await getOfflineStudentProgress(student.id, routeId).catch(() => null);
        if (!active) return;
        const completedIds = (progress?.checkins || [])
          .filter((record) => record.status === "success")
          .map((record) => Number(record.point_id));
        setCheckedPointIds(new Set(completedIds));
      })
      .finally(() => {
        if (active) setCheckinsLoading(false);
      });
    return () => { active = false; };
  }, [routeId, student.id, isOnline]);

  useEffect(() => {
    let active = true;
    Promise.all([
      getPendingOfflineCheckins(student.id, routeId),
      getOfflineQueueItems(student.id),
    ])
      .then(([checkins, queueItems]) => {
        if (!active) return;
        setPendingCheckins(new Map(checkins.map((item) => [Number(item.point_id), item])));
        setPendingObservations(queueItems.filter((item) => (
          item.queue_type === "observation"
          && Number(item.route_id) === Number(routeId)
          && ["pending", "syncing", "failed"].includes(item.status)
        )));
      })
      .catch(() => {
        if (active) {
          setPendingCheckins(new Map());
          setPendingObservations([]);
        }
      });
    return () => { active = false; };
  }, [routeId, student.id]);

  useEffect(() => {
    let active = true;
    const handleOfflineSyncComplete = async (event) => {
      const detail = event.detail || {};
      if (
        Number(detail.studentId) !== Number(student.id)
        || !(detail.routeIds || []).map(Number).includes(Number(routeId))
      ) return;

      const [checkinsResult, observationsResult, pendingResult, queueResult] = await Promise.allSettled([
        detail.checkinSynced ? getCheckin(student.id, routeId) : Promise.resolve(null),
        detail.observationSynced ? getObservationRecords(student.id) : Promise.resolve(null),
        getPendingOfflineCheckins(student.id, routeId),
        getOfflineQueueItems(student.id),
      ]);
      if (!active) return;
      if (checkinsResult.status === "fulfilled" && detail.checkinSynced) {
        const checkins = (Array.isArray(checkinsResult.value?.data)
          ? checkinsResult.value.data
          : []);
        const completedIds = checkins
          .filter((record) => record.status === "success")
          .map((record) => Number(record.point_id));
        setCheckedPointIds(new Set(completedIds));
        if (detail.checkinSynced) {
          updateOfflineStudentCheckins(student.id, routeId, checkins).catch(() => {});
        }
      }
      if (observationsResult.status === "fulfilled" && detail.observationSynced) {
        const routeRecords = (Array.isArray(observationsResult.value?.data)
          ? observationsResult.value.data
          : []).filter((record) => Number(record.route_id) === Number(routeId));
        setObservationRecords(routeRecords);
        updateOfflineStudentObservations(student.id, routeId, routeRecords).catch(() => {});
      }
      if (pendingResult.status === "fulfilled") {
        setPendingCheckins(new Map(
          pendingResult.value.map((item) => [Number(item.point_id), item]),
        ));
      }
      if (queueResult.status === "fulfilled") {
        setPendingObservations(queueResult.value.filter((item) => (
          item.queue_type === "observation"
          && Number(item.route_id) === Number(routeId)
          && ["pending", "syncing", "failed"].includes(item.status)
        )));
      }
    };
    window.addEventListener("offline-sync-complete", handleOfflineSyncComplete);
    return () => {
      active = false;
      window.removeEventListener("offline-sync-complete", handleOfflineSyncComplete);
    };
  }, [routeId, student.id]);

  function handlePointClick(point) {
    elevationRequestRef.current += 1;
    setElevationInfo(null);
    setSelectedGeologyFeature(null);
    setSelectedStudentObservation(null);
    setSelectedPoint(point);
    setIsObservationDetailsOpen(true);
    setIsElevationProfileOpen(false);
    setCheckinDistance(null);
    setArrivalPosition(null);
    setShowCheckinUpload(false);
    setCheckinPhoto(null);
    setCheckinPhotoPreview("");
    setCreatedObservationId(null);
    setCreatedPhotoUrl("");
    setAiState({ pending: false, message: "" });
    setCheckinState({ pending: false, message: "", error: false });
    if (navigator.onLine) {
      getObservationRecords(student.id)
        .then(({ data }) => {
          const routeRecords = (Array.isArray(data) ? data : [])
            .filter((record) => Number(record.route_id) === Number(routeId));
          setObservationRecords(routeRecords);
          updateOfflineStudentObservations(student.id, routeId, routeRecords).catch(() => {});
        })
        .catch(() => {
          // Existing records remain usable when a background refresh fails.
        });
    }
  }

  function handleStudentObservationClick(observation) {
    elevationRequestRef.current += 1;
    setElevationInfo(null);
    setSelectedGeologyFeature(null);
    setSelectedPoint(null);
    setSelectedStudentObservation(observation);
    setIsObservationDetailsOpen(false);
    setIsElevationProfileOpen(false);
    setCheckinDistance(null);
    setArrivalPosition(null);
    setShowCheckinUpload(false);
    setCheckinPhoto(null);
    setCheckinPhotoPreview("");
    setCreatedObservationId(null);
    setCreatedPhotoUrl("");
    setAiState({ pending: false, message: "" });
    setCheckinState({ pending: false, message: "", error: false });
  }

  function handleGeologyFeatureClick(geologyFeature) {
    elevationRequestRef.current += 1;
    setElevationInfo(null);
    setSelectedPoint(null);
    setSelectedStudentObservation(null);
    setIsObservationDetailsOpen(false);
    setIsElevationProfileOpen(false);
    setSelectedGeologyFeature(geologyFeature);
  }

  async function handleCurrentPositionElevation({ longitude, latitude }) {
    const normalizedLongitude = Number(longitude);
    const normalizedLatitude = Number(latitude);
    if (!Number.isFinite(normalizedLongitude) || !Number.isFinite(normalizedLatitude)) return;

    const requestId = elevationRequestRef.current + 1;
    elevationRequestRef.current = requestId;
    setSelectedPoint(null);
    setSelectedStudentObservation(null);
    setSelectedGeologyFeature(null);
    setIsObservationDetailsOpen(false);
    setIsElevationProfileOpen(false);
    setElevationInfo({
      longitude: normalizedLongitude,
      latitude: normalizedLatitude,
      status: "loading",
      elevation: null,
    });

    try {
      const result = await getElevation(normalizedLatitude, normalizedLongitude);
      if (elevationRequestRef.current !== requestId) return;
      setElevationInfo((current) => ({
        ...current,
        status: "success",
        elevation: result.elevation,
      }));
    } catch {
      if (elevationRequestRef.current !== requestId) return;
      setElevationInfo((current) => ({ ...current, status: "error" }));
    }
  }

  async function handleArrivalCheck() {
    const selectedPointId = Number(selectedObservation?.id);
    if (checkinState.pending || checkedPointIds.has(selectedPointId)) return;
    if (!navigator.onLine) {
      const storedPackage = await getOfflineRoutePackage(routeId).catch(() => null);
      if (!storedPackage) {
        setCheckinState({ pending: false, message: "当前路线未下载离线包，无法离线签到", error: true });
        return;
      }
      const packagedPoint = (storedPackage.points || [])
        .find((point) => Number(point.id) === selectedPointId);
      if (!packagedPoint) {
        setCheckinState({ pending: false, message: "离线包中缺少该观察点数据", error: true });
        return;
      }
      const storedPending = pendingCheckins.get(selectedPointId)
        || (await getPendingOfflineCheckins(student.id, routeId))
          .find((item) => Number(item.point_id) === selectedPointId);
      if (storedPending) {
        setCheckinState({ pending: false, message: "该观察点已有待同步签到记录", error: false });
        return;
      }
    }
    if (!currentPosition || !selectedObservation) {
      setShowCheckinUpload(false);
      setArrivalPosition(null);
      setCheckinState({ pending: false, message: "正在获取当前位置，请稍后", error: true });
      return;
    }

    const distance = calculateDistance(currentPosition, selectedObservation);
    if (distance == null) {
      setShowCheckinUpload(false);
      setArrivalPosition(null);
      setCheckinState({ pending: false, message: "正在获取当前位置，请稍后", error: true });
      return;
    }
    if (distance > CHECKIN_RADIUS_METERS) {
      setShowCheckinUpload(false);
      setArrivalPosition(null);
      setCheckinPhoto(null);
      setCheckinPhotoPreview("");
      setCheckinState({
        pending: false,
        message: navigator.onLine
          ? "距离观察点过远，无法签到"
          : `距离观察点约 ${Math.round(distance)} 米，需进入 50 米范围内签到`,
        error: true,
      });
      return;
    }

    setArrivalPosition(currentPosition);
    setShowCheckinUpload(true);
    setCheckinState({ pending: false, message: "", error: false });
  }

  function handleCheckinPhotoChange(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setCheckinState({ pending: false, message: "请上传有效的图片文件", error: true });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCheckinPhoto(file);
      setCheckinPhotoPreview(String(reader.result || ""));
      setCheckinState({ pending: false, message: "", error: false });
    };
    reader.onerror = () => {
      setCheckinState({ pending: false, message: "图片预览加载失败，请重新选择", error: true });
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveCheckinPhoto() {
    setCheckinPhoto(null);
    setCheckinPhotoPreview("");
  }

  async function handleSubmitCheckIn() {
    if (!selectedObservation) {
      setCheckinState({ pending: false, message: "正在获取当前位置，请稍后", error: true });
      return;
    }
    if (checkinState.pending) return;

    if (!navigator.onLine) {
      const selectedPointId = Number(selectedObservation.id);
      const storedPackage = await getOfflineRoutePackage(routeId).catch(() => null);
      if (!storedPackage) {
        setCheckinState({ pending: false, message: "当前路线未下载离线包，无法离线签到", error: true });
        return;
      }
      const packagedPoint = (storedPackage.points || [])
        .find((point) => Number(point.id) === selectedPointId);
      if (!packagedPoint) {
        setCheckinState({ pending: false, message: "离线包中缺少该观察点数据", error: true });
        return;
      }
      if (checkedPointIds.has(selectedPointId)) {
        setCheckinState({ pending: false, message: "已签到", error: false });
        return;
      }
      const existingPending = pendingCheckins.get(selectedPointId)
        || (await getPendingOfflineCheckins(student.id, routeId))
          .find((item) => Number(item.point_id) === selectedPointId);
      if (existingPending) {
        setCheckinState({ pending: false, message: "该观察点已有待同步签到记录", error: false });
        return;
      }
      if (!checkinPhoto) {
        setCheckinState({ pending: false, message: "请先拍摄签到照片", error: true });
        return;
      }

      setCheckinState({ pending: true, message: "正在保存离线签到…", error: false });
      try {
        const freshPosition = await getCurrentGpsPosition();
        const distance = calculateDistance(freshPosition, packagedPoint);
        if (distance == null) throw new Error("INVALID_DISTANCE");
        if (distance > CHECKIN_RADIUS_METERS) {
          setCheckinState({
            pending: false,
            message: `距离观察点约 ${Math.round(distance)} 米，需进入 50 米范围内签到`,
            error: true,
          });
          return;
        }
        const courseId = Number(
          mapData.route?.course_id
          ?? storedPackage.course_id
          ?? storedPackage.route?.course_id
          ?? getCachedRouteCourseId(routeId),
        );
        if (!Number.isInteger(courseId) || courseId <= 0) {
          throw new Error("COURSE_CONTEXT_MISSING");
        }
        const queueItem = await savePendingCheckin({
          studentId: student.id,
          courseId,
          routeId,
          pointId: selectedPointId,
          position: freshPosition,
          distance,
          photoFile: checkinPhoto,
        });
        setCurrentPosition(freshPosition);
        setCheckinDistance(distance);
        setPendingCheckins((current) => new Map(current).set(selectedPointId, queueItem));
        setShowCheckinUpload(false);
        setArrivalPosition(null);
        setCheckinState({
          pending: false,
          message: freshPosition.accuracy > 100
            ? "已离线签到 · 待同步\n当前定位精度较低，联网同步时将再次校验签到位置"
            : "已离线签到 · 待同步",
          error: false,
        });
      } catch (positionError) {
        const message = positionError?.message === "COURSE_CONTEXT_MISSING"
          ? "缺少路线课程信息，无法离线签到"
          : positionError?.code === positionError?.PERMISSION_DENIED
            ? "定位权限被拒绝，请允许定位后重试"
            : "暂时无法获取当前位置，请稍后重试";
        setCheckinState({ pending: false, message, error: true });
      }
      return;
    }

    if (!currentPosition) {
      setCheckinState({ pending: false, message: "正在获取当前位置，请稍后", error: true });
      return;
    }
    if (!arrivalPosition || !checkinPhoto) return;

    const submissionDistance = calculateDistance(currentPosition, selectedObservation);
    if (submissionDistance == null) {
      setCheckinState({ pending: false, message: "正在获取当前位置，请稍后", error: true });
      return;
    }
    if (submissionDistance > CHECKIN_RADIUS_METERS) {
      setArrivalPosition(null);
      setShowCheckinUpload(false);
      setCheckinPhoto(null);
      setCheckinPhotoPreview("");
      setCheckinState({ pending: false, message: "距离观察点过远，无法签到", error: true });
      return;
    }

    setCheckinState({ pending: true, message: "正在提交签到…", error: false });
    try {
      const { data } = await autoCheckIn(routeId, {
        student_id: student.id,
        point_id: selectedObservation.id,
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        photo: checkinPhoto,
      });

      if (!data?.checkin_id) {
        setCheckinDistance(Number.isFinite(Number(data?.distance)) ? Number(data.distance) : null);
        setCheckinState({ pending: false, message: data?.message || "签到失败", error: true });
        return;
      }

      const checkedPointId = Number(data.point_id ?? selectedObservation.id);
      setCheckinDistance(Number.isFinite(Number(data.distance)) ? Number(data.distance) : null);
      setCreatedObservationId(data.observation_id ?? null);
      setCreatedPhotoUrl(data.photo_url || "");
      if (data.observation_id) {
        setObservationRecords((current) => [{
          id: data.observation_id,
          student_id: student.id,
          route_id: Number(routeId),
          point_id: checkedPointId,
          observation_type: "checkin",
          photo_url: data.photo_url || "",
          analysis_status: null,
        }, ...current.filter((record) => Number(record.id) !== Number(data.observation_id))]);
      }
      setShowCheckinUpload(false);
      setCheckedPointIds((current) => new Set([...current, checkedPointId]));
      setCheckinState({ pending: false, message: "已签到", error: false });
      setIsObservationDetailsOpen(false);

      try {
        const summaryResponse = await getStudentRouteSummary(student.id, routeId);
        const latestProgress = summaryResponse.data?.progress || null;
        if (latestProgress) {
          setCheckinProgressBanner({
            id: `${checkedPointId}-${Date.now()}`,
            previousProgress: taskProgress,
            progress: latestProgress,
          });
          setTaskProgress(latestProgress);
        }
      } catch {
        // The check-in has succeeded; keep its success state if progress refresh fails.
      }
    } catch (requestError) {
      const message = requestError.response?.data?.detail
        || (requestError.code === requestError.PERMISSION_DENIED
          ? "定位权限被拒绝，请允许定位后重试"
          : "签到提交失败，请检查定位和网络连接后重试");
      setCheckinState({ pending: false, message, error: true });
    }
  }

  async function handleStartAIAnalysis() {
    if (!activeObservationId || aiState.pending) return;

    setAiState({ pending: true, message: "" });
    try {
      const response = await createAIAnalysis(activeObservationId);
      const analysisId = response.data?.analysis_id;
      if (!analysisId) throw new Error("ANALYSIS_NOT_CREATED");

      const photoUrl = createdPhotoUrl
        ? `http://localhost:8000/${createdPhotoUrl.replace(/^\/+/, "")}`
        : activeObservationRecord?.photo_url
          ? `http://localhost:8000/${String(activeObservationRecord.photo_url).replace(/^\/+/, "")}`
          : checkinPhotoPreview;
      const analysisFlow = {
        analysisId,
        observationId: activeObservationId,
        photoUrl,
        routeId,
        studentId: student.id,
      };
      try {
        sessionStorage.setItem(
          `field-practice-analysis-flow-${analysisId}`,
          JSON.stringify(analysisFlow),
        );
      } catch {
        // Route state carries the analysis flow when browser storage is unavailable.
      }
      navigate(`/analysis/loading/${analysisId}`, { state: analysisFlow });
    } catch {
      setAiState({ pending: false, message: "AI分析启动失败，请稍后重试" });
    }
  }

  const selectedPointChecked = selectedPoint
    ? checkedPointIds.has(Number(selectedPoint.id))
    : false;
  const selectedPointPendingCheckin = selectedPoint
    ? (!selectedPointChecked && pendingCheckins.get(Number(selectedPoint.id))) || null
    : null;
  const selectedPointRecord = useMemo(() => {
    if (!selectedPoint) return null;
    return observationRecords.find((record) => (
      Number(record.point_id) === Number(selectedPoint.id)
      && ["fixed", "checkin"].includes(record.observation_type)
    )) || null;
  }, [observationRecords, selectedPoint]);
  const effectivePendingCheckin = selectedPointRecord ? null : selectedPointPendingCheckin;
  const selectedPointPendingObservation = useMemo(() => {
    if (!selectedPoint || selectedPointRecord) return null;
    return pendingObservations.find((item) => (
      item.observation_type === "fixed"
      && Number(item.point_id) === Number(selectedPoint.id)
    )) || null;
  }, [pendingObservations, selectedPoint, selectedPointRecord]);
  const activeObservationRecord = selectedPointRecord || (createdObservationId ? {
    id: createdObservationId,
    point_id: selectedPoint?.id,
    route_id: Number(routeId),
    photo_url: createdPhotoUrl,
    analysis_status: null,
  } : null);
  const activeObservationId = activeObservationRecord?.id ?? null;
  const hasAIAnalysis = Boolean(
    activeObservationRecord?.analysis_status
    || activeObservationRecord?.ai_analysis
    || activeObservationRecord?.analysis_id,
  );
  const selectedObservation = useMemo(() => (selectedPoint ? {
    ...selectedPoint,
    name: selectedPoint.name || selectedPoint.point_name || "未命名观察点",
    code: selectedPoint.code || selectedPoint.point_code || `P${selectedPoint.id}`,
    description: selectedPoint.description || selectedPoint.point_description || "",
    status: selectedPointChecked || selectedPointRecord
      ? "completed"
      : effectivePendingCheckin
        ? "pending-sync"
        : selectedPointPendingObservation
          ? "observation-pending"
          : "available",
  } : null), [
    selectedPoint,
    selectedPointChecked,
    effectivePendingCheckin,
    selectedPointPendingObservation,
    selectedPointRecord,
  ]);
  const selectedDistance = useMemo(
    () => calculateDistance(currentPosition, selectedObservation),
    [currentPosition, selectedObservation],
  );
  const canCheckInSelectedPoint = (
    !checkinsLoading
    && !selectedPointChecked
    && !effectivePendingCheckin
    && selectedDistance != null
    && selectedDistance <= CHECKIN_RADIUS_METERS
  );
  const nearestPoint = useMemo(() => {
    if (checkinsLoading) return null;

    const incompletePoints = mapData.points.filter((point) => (
      !checkedPointIds.has(Number(point.id))
      && !pendingCheckins.has(Number(point.id))
      && Number.isFinite(Number(point.longitude))
      && Number.isFinite(Number(point.latitude))
    ));
    if (incompletePoints.length === 0) return null;
    if (!currentPosition) return { point: null, distance: null };

    return incompletePoints.reduce((nearest, point) => {
      const distance = calculateDistance(currentPosition, point);
      if (distance == null || (nearest && nearest.distance <= distance)) return nearest;
      return { point, distance };
    }, null);
  }, [checkedPointIds, checkinsLoading, currentPosition, mapData.points, pendingCheckins]);

  const formallyObservedPointIds = useMemo(() => new Set(
    observationRecords
      .filter((record) => ["fixed", "checkin"].includes(record.observation_type))
      .map((record) => Number(record.point_id)),
  ), [observationRecords]);
  const mapPoints = useMemo(() => mapData.points.map((point) => ({
    ...point,
    offline_checkin_pending: (
      !checkedPointIds.has(Number(point.id))
      && !formallyObservedPointIds.has(Number(point.id))
      && pendingCheckins.has(Number(point.id))
    ),
  })), [checkedPointIds, formallyObservedPointIds, mapData.points, pendingCheckins]);
  const mapStudentObservations = useMemo(() => {
    const recordsById = new Map(observationRecords.map((record) => [Number(record.id), record]));
    const queueByServerId = new Map(pendingObservations
      .filter((item) => item.server_observation_id != null)
      .map((item) => [Number(item.server_observation_id), item]));
    const formalObservations = mapData.student_observations.map((observation) => {
      const queueItem = queueByServerId.get(Number(observation.id));
      return {
        ...observation,
        ...(recordsById.get(Number(observation.id)) || {}),
        ...(queueItem ? {
          local_queue_id: queueItem.id,
          is_offline: true,
          queue_status: queueItem.status,
          sync_stage: queueItem.sync_stage,
          server_observation_id: queueItem.server_observation_id,
          photo_blob: queueItem.photo_blob,
        } : {}),
      };
    });
    const formalIds = new Set(formalObservations.map((item) => Number(item.id)));
    const localFreeObservations = pendingObservations
      .filter((item) => ["free", "self"].includes(item.observation_type))
      .filter((item) => (
        item.server_observation_id == null
        || !formalIds.has(Number(item.server_observation_id))
      ))
      .map((item) => ({
        ...item.payload,
        id: item.server_observation_id ?? item.id,
        local_queue_id: item.id,
        is_offline: true,
        queue_status: item.status,
        sync_stage: item.sync_stage,
        server_observation_id: item.server_observation_id,
        photo_blob: item.photo_blob,
        created_at: item.created_at,
      }));
    return [...formalObservations, ...localFreeObservations];
  }, [mapData.student_observations, observationRecords, pendingObservations]);
  const sampledRoutePoints = useMemo(() => {
    const routePoints = mapData.route_points
      .filter((point) => (
        Number.isFinite(Number(point.longitude))
        && Number.isFinite(Number(point.latitude))
      ))
      .sort((first, second) => Number(first.order_index ?? 0) - Number(second.order_index ?? 0));
    if (routePoints.length <= MAX_ROUTE_ELEVATION_SAMPLES) return routePoints;

    const lastIndex = routePoints.length - 1;
    return Array.from({ length: MAX_ROUTE_ELEVATION_SAMPLES }, (_, index) => (
      routePoints[Math.round((index * lastIndex) / (MAX_ROUTE_ELEVATION_SAMPLES - 1))]
    ));
  }, [mapData.route_points]);

  useEffect(() => {
    let active = true;
    if (sampledRoutePoints.length === 0) {
      setElevationProfile({ status: "empty", data: [] });
      return () => { active = false; };
    }

    setElevationProfile({ status: "loading", data: [] });
    getElevations(sampledRoutePoints)
      .then((elevatedPoints) => {
        if (!active) return;
        let cumulativeDistance = 0;
        const profileData = elevatedPoints.map((point, index) => {
          if (index > 0) {
            cumulativeDistance += calculateDistance(elevatedPoints[index - 1], point) ?? 0;
          }
          return {
            distance: cumulativeDistance,
            elevation: point.elevation,
          };
        });
        setElevationProfile({ status: "success", data: profileData });
      })
      .catch(() => {
        if (active) setElevationProfile({ status: "error", data: [] });
      });

    return () => { active = false; };
  }, [sampledRoutePoints]);

  const elevationProfileStats = useMemo(() => {
    if (elevationProfile.status !== "success" || elevationProfile.data.length === 0) return null;

    const elevations = elevationProfile.data.map((point) => point.elevation);
    const cumulativeAscent = elevationProfile.data.reduce((total, point, index, items) => (
      index === 0 ? total : total + Math.max(0, point.elevation - items[index - 1].elevation)
    ), 0);
    return {
      maximum: Math.max(...elevations),
      minimum: Math.min(...elevations),
      ascent: cumulativeAscent,
    };
  }, [elevationProfile]);
  const summaryPoint = selectedObservation || nearestPoint?.point || null;
  const summaryDistance = selectedObservation ? selectedDistance : nearestPoint?.distance;

  function handleObservationSummaryOpen() {
    if (selectedObservation) {
      setIsObservationDetailsOpen(true);
    } else if (nearestPoint?.point) {
      handlePointClick(nearestPoint.point);
    }
  }

  function handleElevationProfileOpen() {
    elevationRequestRef.current += 1;
    setElevationInfo(null);
    setSelectedStudentObservation(null);
    setIsObservationDetailsOpen(false);
    setIsElevationProfileOpen(true);
  }

  function handleOpenObservation() {
    if (!selectedObservation) return;
    navigate(`/observe?student_id=${student.id}&route_id=${routeId}&point_id=${selectedObservation.id}`);
  }

  function handleViewAIAnalysis() {
    if (!activeObservationId) return;
    navigate(
      `/analysis/result?observation_id=${activeObservationId}&route_id=${routeId}`,
      {
        state: {
          observationId: activeObservationId,
          photoUrl: activeObservationRecord?.photo_url,
          routeId,
          studentId: student.id,
          saveReturnTo: `/routes/${routeId}/map`,
        },
      },
    );
  }

  function handleRandomObservation() {
    if (!mapData.route?.free_observation_enabled) {
      setCheckinState({ pending: false, message: "该路线未开启自由观察任务。", error: true });
      return;
    }
    navigate(`/observe/new?route_id=${routeId}&mode=random`);
  }

  return (
    <MobilePageShell className="student-route-map-page">
      <header className="student-route-map__header">
        <button type="button" onClick={() => navigate(-1)} aria-label="返回路线列表">
          <img src={backIcon} alt="" aria-hidden="true" />
        </button>
        <div><span>野外实习路线</span><h1>{mapData.route?.name || "路线地图"}</h1></div>
        <i aria-hidden="true" />
      </header>

      <StudentRouteMap
        routePath={mapData.route_points}
        points={mapPoints}
        studentObservations={mapStudentObservations}
        currentPosition={currentPosition}
        studentTrack={studentTrack}
        onPointClick={handlePointClick}
        onStudentObservationClick={handleStudentObservationClick}
        onGeologyFeatureClick={handleGeologyFeatureClick}
        onCurrentPositionSelect={handleCurrentPositionElevation}
        onElevationProfileOpen={handleElevationProfileOpen}
        offlineMode={Boolean(offlinePackage)}
      />

      {offlinePackage && (
        <div className="student-route-map__offline-badge" role="status">
          离线数据 · 更新于 {new Date(offlinePackage.updated_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </div>
      )}

      <div className="student-route-map__legend" aria-label="地图图例">
        <span><i className="is-point" />固定观察点</span>
        <span><i className="is-pending-checkin" />签到待同步</span>
        <span><i className="is-student-observation" />自由观察</span>
        <span><i className="is-route" />路线</span>
        <span><i className="is-track" />轨迹</span>
        <span><i className="is-student" />当前位置</span>
      </div>

      {checkinProgressBanner && (
        <CheckinProgressBanner
          key={checkinProgressBanner.id}
          progress={checkinProgressBanner.progress}
          previousProgress={checkinProgressBanner.previousProgress}
          onClose={() => setCheckinProgressBanner(null)}
        />
      )}

      {loading && <div className="student-route-map__state">正在加载路线地图...</div>}
      {!loading && error && <div className="student-route-map__state is-error">{error}</div>}
      {locationError && <div className="student-route-map__location-state" role="status">{locationError}</div>}

      {elevationInfo && (
        <section className="student-route-map__elevation-card" aria-live="polite">
          <button
            type="button"
            onClick={() => {
              elevationRequestRef.current += 1;
              setElevationInfo(null);
            }}
            aria-label="关闭当前位置信息"
          >
            ×
          </button>
          <strong>当前位置</strong>
          <span>经度：{elevationInfo.longitude.toFixed(6)}</span>
          <span>纬度：{elevationInfo.latitude.toFixed(6)}</span>
          <span>
            海拔：{elevationInfo.status === "loading"
              ? "正在获取海拔..."
              : elevationInfo.status === "error"
                ? "海拔数据获取失败"
                : `${Math.round(elevationInfo.elevation)}m`}
          </span>
          <small>高程数据：Copernicus DEM / Open-Meteo</small>
        </section>
      )}

      {selectedGeologyFeature && (
        <GeologyInfoCard
          geologyFeature={selectedGeologyFeature}
          onClose={() => setSelectedGeologyFeature(null)}
        />
      )}

      {isElevationProfileOpen && (
        <section className="student-route-map__profile-panel" aria-live="polite">
          <button
            type="button"
            className="student-route-map__profile-close"
            onClick={() => setIsElevationProfileOpen(false)}
            aria-label="关闭地形剖面"
          >
            ×
          </button>
          <span className="student-route-map__profile-eyebrow">路线地形剖面</span>
          <h2>{mapData.route?.name || "当前路线"}</h2>
          {elevationProfile.status === "loading" && (
            <p className="student-route-map__profile-state">正在获取路线地形数据...</p>
          )}
          {["idle", "empty", "error"].includes(elevationProfile.status) && (
            <p className="student-route-map__profile-state">暂无地形数据</p>
          )}
          {elevationProfile.status === "success" && elevationProfileStats && (
            <>
              <dl className="student-route-map__profile-stats">
                <div><dt>最高海拔</dt><dd>{Math.round(elevationProfileStats.maximum)}m</dd></div>
                <div><dt>最低海拔</dt><dd>{Math.round(elevationProfileStats.minimum)}m</dd></div>
                <div><dt>累计爬升</dt><dd>{Math.round(elevationProfileStats.ascent)}m</dd></div>
              </dl>
              <ElevationProfileChart data={elevationProfile.data} />
            </>
          )}
        </section>
      )}

      {(summaryPoint || nearestPoint)
        && !isObservationDetailsOpen
        && !isElevationProfileOpen
        && !selectedStudentObservation
        && !elevationInfo
        && !selectedGeologyFeature && (
        <button
          type="button"
          className="student-route-map__nearest-summary"
          onClick={handleObservationSummaryOpen}
          disabled={!summaryPoint}
          aria-label={summaryPoint ? "展开观察点详情" : "正在获取当前位置"}
        >
          {summaryPoint ? (
            <>
              <strong>📍 {summaryPoint.point_name || summaryPoint.name || "未命名观察点"}</strong>
              <span>{summaryDistance == null ? "定位中" : formatDistance(summaryDistance)}</span>
            </>
          ) : (
            <strong>📍 正在获取当前位置</strong>
          )}
        </button>
      )}

      {selectedObservation && (
        <div
          className={`student-route-map__observation-overlay ${isObservationDetailsOpen ? "is-expanded" : "is-collapsed"}`}
          aria-hidden={!isObservationDetailsOpen}
          inert={!isObservationDetailsOpen}
        >
          <button
            type="button"
            className="student-route-map__observation-close"
            onClick={() => setIsObservationDetailsOpen(false)}
            aria-label="收起观察点详情"
          >
            ×
          </button>
          <ObservationInfoCard
            key={selectedObservation.id}
            observation={selectedObservation}
            distance={selectedDistance}
            hasObservations={mapData.points.length > 0}
            routeHasTrack={mapData.route_points.length >= 2}
            canCheckIn={canCheckInSelectedPoint}
            checkinState={checkinState}
            onCheckIn={handleArrivalCheck}
            showCheckinUpload={showCheckinUpload}
            checkinPhotoPreview={checkinPhotoPreview}
            hasCheckinPhoto={Boolean(checkinPhoto)}
            onCheckinPhotoChange={handleCheckinPhotoChange}
            onRemoveCheckinPhoto={handleRemoveCheckinPhoto}
            onSubmitCheckIn={handleSubmitCheckIn}
            observationRecord={activeObservationRecord}
            hasAIAnalysis={hasAIAnalysis}
            aiState={aiState}
            onStartAIAnalysis={handleStartAIAnalysis}
            onViewAIAnalysis={handleViewAIAnalysis}
            onOpenObservation={handleOpenObservation}
            onRandomObservation={handleRandomObservation}
            isOutsideCheckInRadius={false}
            offlineCheckin={effectivePendingCheckin}
            offlineMode={!isOnline}
          />
        </div>
      )}

      {selectedStudentObservation && (
        <StudentObservationInfoCard
          key={selectedStudentObservation.id}
          observation={selectedStudentObservation}
          onClose={() => setSelectedStudentObservation(null)}
        />
      )}

      <BottomNav activeId="map" />
    </MobilePageShell>
  );
}
