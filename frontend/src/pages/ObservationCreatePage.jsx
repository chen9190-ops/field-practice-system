import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MobilePageShell } from "../components/layout/MobilePageShell";
import {
  backIcon,
  bottomTerrain,
  cameraIcon,
  closeIcon,
  dropdownIcon,
  locationCard,
  locationIcon,
  observationBackground,
  refreshIcon,
  rockPreview,
  submitButton,
  textareaCard,
  uploadCard,
} from "../assets/observation";
import "./ObservationCreatePage.css";
import {
  createAIAnalysis,
  createObservation,
  uploadPhoto,
} from "../api/observation";
import { getStudentRouteSummary } from "../api/dashboard";
import { getRoute } from "../api/route";
import { resolveCurrentRouteId } from "../utils/currentRoute";
import { useStudentAuth } from "../context/StudentAuthContext";
import { getOfflineRoutePackage } from "../offline/offlineDb";
import {
  isObservationNetworkError,
  savePendingObservation,
} from "../offline/offlineObservationQueue";

const ROCK_TYPES = ["岩浆岩", "沉积岩", "变质岩", "其他"];

function readPhotoAsDataUrl(file) {
  if (!file) {
    return Promise.resolve("");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ObservationCreatePage({
  onRefreshLocation,
}) {
  const navigate = useNavigate();
  const { student } = useStudentAuth();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const pointId = Number(searchParams.get("point_id"));
  const pointName = searchParams.get("point_name");
  const fixedLatitude = searchParams.get("latitude");
  const fixedLongitude = searchParams.get("longitude");
  const routeId = resolveCurrentRouteId(searchParams.get("route_id"));
  const fileInputRef = useRef(null);
  const objectUrlRef = useRef(null);
  const [description, setDescription] = useState("");
  const [rockType, setRockType] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [previewSrc, setPreviewSrc] = useState(rockPreview);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [routeInfo, setRouteInfo] = useState(null);
  const [taskProgress, setTaskProgress] = useState(null);
  const [taskLoading, setTaskLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    if (!routeId) {
      setTaskLoading(false);
      return () => { active = false; };
    }
    async function loadTaskContext() {
      let nextRouteInfo = null;
      let nextTaskProgress = null;
      if (navigator.onLine) {
        try {
          const routeResponse = await getRoute(routeId);
          nextRouteInfo = routeResponse.data?.id ? routeResponse.data : null;
        } catch {
          // A downloaded route package can provide the same route metadata offline.
        }
        try {
          const summaryResponse = await getStudentRouteSummary(student.id, routeId);
          nextTaskProgress = summaryResponse.data?.progress || null;
        } catch {
          // Progress is online-only and is not required to save a pending record.
        }
      }
      if (!nextRouteInfo) {
        try {
          const offlinePackage = await getOfflineRoutePackage(routeId);
          nextRouteInfo = offlinePackage?.route || null;
        } catch {
          nextRouteInfo = null;
        }
      }
      if (!active) return;
      setRouteInfo(nextRouteInfo);
      setTaskProgress(nextTaskProgress);
      setTaskLoading(false);
    }
    loadTaskContext();
    return () => { active = false; };
  }, [routeId, student.id]);

  const requestRandomLocation = () => {
    if (mode !== "random") {
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setLocationLoading(false);
      },
      () => {
        setLatitude(null);
        setLongitude(null);
        setLocationLoading(false);
      },
    );
  };

  useEffect(() => {
    if (mode === "random") {
      requestRandomLocation();
      return;
    }

    setLatitude(fixedLatitude);
    setLongitude(fixedLongitude);
    setLocationLoading(false);
  }, [fixedLatitude, fixedLongitude, mode]);

  useEffect(
    () => () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    },
    [],
  );

  const handleBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
      return;
    }
    navigate("/", { replace: true });
  };

  const handleRefresh = () => {
    requestRandomLocation();
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setPhotoFile(file);
    setPreviewSrc(objectUrl);
    event.target.value = "";
  };

  const handleRemovePhoto = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPhotoFile(null);
    setPreviewSrc("");
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!routeId) {
      navigate("/routes");
      return;
    }

    if (mode === "fixed" && (!Number.isFinite(pointId) || pointId <= 0)) {
      alert("未找到对应的固定观察点。");
      return;
    }
    const payload = {
      student_id: student.id,
      route_id: routeId,
      point_id: mode === "fixed" ? pointId : null,
      observation_type: mode === "fixed" ? "fixed" : "free",
      observation_text: description,
      latitude,
      longitude,
      rock_type: rockType || null,
      photo_url: null,
    };

    const saveOffline = async () => {
      let courseId = Number(routeInfo?.course_id);
      if (!Number.isInteger(courseId) || courseId <= 0) {
        const offlinePackage = await getOfflineRoutePackage(routeId);
        courseId = Number(offlinePackage?.course_id ?? offlinePackage?.route?.course_id);
      }
      if (!Number.isInteger(courseId) || courseId <= 0) {
        throw new Error("OFFLINE_ROUTE_CONTEXT_MISSING");
      }
      await savePendingObservation({ courseId, payload, photoFile });
      alert("已保存到离线记录\n恢复网络后可同步");
      const returnQuery = new URLSearchParams({ route_id: String(routeId) });
      if (payload.point_id != null) returnQuery.set("point_id", String(payload.point_id));
      navigate(`/observe?${returnQuery.toString()}`, { replace: true });
    };

    setIsSubmitting(true);
    let observationCreated = false;
    try {
      if (!navigator.onLine) {
        if (payload.observation_type === "free" && routeInfo?.free_observation_enabled === false) {
          alert("该路线未开启自由观察任务。");
          return;
        }
        await saveOffline();
        return;
      }

      if (payload.observation_type === "free") {
        try {
          const latestRoute = (await getRoute(routeId)).data;
          if (!latestRoute?.free_observation_enabled) {
            alert("该路线未开启自由观察任务。");
            return;
          }
        } catch (error) {
          if (isObservationNetworkError(error)) {
            await saveOffline();
            return;
          }
          throw error;
        }
      }

      const response = await createObservation(payload);
      const observationId = response.data.observation_id;
      observationCreated = true;
      if (photoFile) {
        await uploadPhoto(
          observationId,
          photoFile
        );
      }
      const analysisResponse = await createAIAnalysis(observationId);
      const analysisId = analysisResponse.data.analysis_id;
      const photoUrl = await readPhotoAsDataUrl(photoFile);
      const analysisFlow = {
        analysisId,
        observationId,
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
        try {
          sessionStorage.setItem(
            `field-practice-analysis-flow-${analysisId}`,
            JSON.stringify({
              analysisId,
              observationId,
              routeId: analysisFlow.routeId,
              studentId: student.id,
            }),
          );
        } catch {
          // Route state still carries the flow when browser storage is unavailable.
        }
      }
      navigate(`/analysis/loading/${analysisId}`, { state: analysisFlow });
    } catch (error) {
      if (!observationCreated && isObservationNetworkError(error)) {
        try {
          await saveOffline();
          return;
        } catch (offlineError) {
          console.error("保存离线观察记录失败:", offlineError);
        }
      }
      console.error(
        "提交观察记录失败:",
        error
      );
      alert(error?.message === "OFFLINE_ROUTE_CONTEXT_MISSING"
        ? "缺少路线离线信息，无法保存离线记录"
        : "提交失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MobilePageShell className="observation-page">
      <img
        src={observationBackground}
        className="observation-page__background"
        alt=""
        aria-hidden="true"
      />

      <header className="observation-create-header">
        <button
          type="button"
          className="observation-create-header__back"
          onClick={handleBack}
          aria-label="返回上一页"
        >
          <img src={backIcon} alt="" aria-hidden="true" />
        </button>
        <h1>新建观察记录</h1>
        <button
          type="button"
          className="observation-create-header__submit"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          <img src={submitButton} alt="" aria-hidden="true" />
          <span>{isSubmitting ? "保存中" : "提交"}</span>
        </button>
      </header>

      <main className="observation-create-content">
        {mode !== "fixed" && !taskLoading && (
          <section className={`free-observation-task-state${routeInfo?.free_observation_enabled ? " is-enabled" : " is-disabled"}`} role="status">
            <strong>自由观察任务</strong>
            {routeInfo?.free_observation_enabled ? (
              <>
                <span>已完成 {Number(taskProgress?.free?.completed) || 0}/{Number(taskProgress?.free?.required ?? routeInfo.required_free_observation_count) || 0}</span>
                {Number(taskProgress?.free?.required ?? routeInfo.required_free_observation_count) > 0 && taskProgress?.free?.is_complete && <em>自由观察任务已完成。仍可继续上传观察记录。</em>}
              </>
            ) : <span>该路线未开启自由观察任务。</span>}
          </section>
        )}
        <section className="observation-create-section">
          <h2>当前位置</h2>
          <div
            className="observation-location-card"
            style={{ backgroundImage: `url(${locationCard})` }}
          >
            <img
              src={locationIcon}
              className="observation-location-card__pin"
              alt=""
              aria-hidden="true"
            />
            <div className="observation-location-card__details">
              <strong>{mode === "fixed" ? pointName : "自主观察点"}</strong>
              <span>{mode === "fixed"
                ? `${latitude}, ${longitude}`
                : locationLoading
                  ? "正在获取当前位置..."
                  : latitude != null && longitude != null
                    ? `${latitude}, ${longitude}`
                    : "无法获取当前位置"}</span>
            </div>
            <button
              type="button"
              className="observation-location-card__refresh"
              onClick={handleRefresh}
              aria-label="刷新当前位置"
            >
              <img src={refreshIcon} alt="" aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="observation-create-section">
          <h2>上传照片</h2>
          <div className="observation-photo-grid">
            <button
              type="button"
              className="observation-photo-upload"
              style={{ backgroundImage: `url(${uploadCard})` }}
              onClick={() => fileInputRef.current?.click()}
            >
              <img src={cameraIcon} alt="" aria-hidden="true" />
              <span>点击拍照或选择图片</span>
              <small>这张照片</small>
            </button>
            <input
              ref={fileInputRef}
              className="observation-photo-input"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
            />

            <div
              className={`observation-photo-preview${
                previewSrc ? "" : " is-empty"
              }`}
            >
              {previewSrc ? (
                <>
                  <img
                    src={previewSrc}
                    className="observation-photo-preview__image"
                    alt="观察照片预览"
                  />
                  <button
                    type="button"
                    className="observation-photo-preview__close"
                    onClick={handleRemovePhoto}
                    aria-label="移除照片"
                  >
                    <img src={closeIcon} alt="" aria-hidden="true" />
                  </button>
                </>
              ) : (
                <span>暂无照片</span>
              )}
            </div>
          </div>
        </section>

        <section className="observation-create-section">
          <h2>
            <label htmlFor="observation-description">观察描述</label>
          </h2>
          <div
            className="observation-description-field"
            style={{ backgroundImage: `url(${textareaCard})` }}
          >
            <textarea
              id="observation-description"
              value={description}
              maxLength={200}
              placeholder="请输入对岩石、地貌等的观察描述..."
              onChange={(event) => setDescription(event.target.value)}
            />
            <span>{description.length}/200</span>
          </div>
        </section>

        <section className="observation-create-section">
          <h2>
            <label htmlFor="rock-type">岩石类型（可选）</label>
          </h2>
          <div
            className="observation-rock-select"
            style={{ backgroundImage: `url(${locationCard})` }}
          >
            <select
              id="rock-type"
              value={rockType}
              onChange={(event) => setRockType(event.target.value)}
            >
              <option value="">请选择岩石类型</option>
              {ROCK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <img src={dropdownIcon} alt="" aria-hidden="true" />
          </div>
        </section>

      </main>

      <img
        src={bottomTerrain}
        className="bottom-terrain-decoration"
        alt=""
        aria-hidden="true"
      />
    </MobilePageShell>
  );
}
