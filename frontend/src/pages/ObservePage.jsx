import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  deleteObservation,
  getObservationRecords,
  toggleObservationFavorite,
  toggleObservationPin,
} from "../api/observation";
import { getStudentRouteSummary } from "../api/dashboard";
import { getPoints } from "../api/route";
import { BottomNav } from "../components/BottomNav";
import { MobilePageShell } from "../components/layout/MobilePageShell";
import {
  backIcon,
  cameraIcon,
} from "../assets/observation";
import { reportBackground } from "../assets/report";
import "./ObservePage.css";
import { resolveCurrentRouteId } from "../utils/currentRoute";
import { useStudentAuth } from "../context/StudentAuthContext";
import {
  getAllOfflineRoutePackages,
  getOfflineQueueItems,
} from "../offline/offlineDb";
import {
  retryOfflineItem,
  syncAllOfflineItems,
} from "../offline/offlineSync";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import {
  refreshOfflineStudentProgress,
  updateOfflineStudentObservations,
} from "../offline/offlineStudentProgress";

const TABS = [
  ["all", "全部"],
  ["rock", "岩石"],
  ["landform", "地貌"],
  ["fossil", "化石"],
];

function matchesCategory(record, category) {
  if (category === "all") return true;
  const recordType = String(record.rock_type || "").trim();
  if (category === "landform") return recordType === "地貌";
  if (category === "fossil") return recordType === "化石";
  return Boolean(recordType) && recordType !== "地貌" && recordType !== "化石";
}

function formatObservationTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolvePhotoUrl(photoUrl) {
  if (!photoUrl) return "";
  if (/^https?:\/\//i.test(photoUrl)) return photoUrl;
  return `http://localhost:8000/${String(photoUrl).replace(/^\/+/, "")}`;
}

function getAnalysisStatus(status) {
  if (status === "completed") return { label: "✓ AI分析完成", className: "is-completed" };
  if (status === "processing") return { label: "AI分析中", className: "is-processing" };
  if (status === "failed") return { label: "分析失败", className: "is-failed" };
  return null;
}

export function ObservePage() {
  const navigate = useNavigate();
  const { student } = useStudentAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("all");
  const [records, setRecords] = useState([]);
  const [pendingRecords, setPendingRecords] = useState([]);
  const [pendingPointNames, setPendingPointNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openActionId, setOpenActionId] = useState(null);
  const [pendingActionId, setPendingActionId] = useState(null);
  const [taskProgress, setTaskProgress] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [syncProgress, setSyncProgress] = useState({
    syncing: false,
    current: 0,
    total: 0,
    success: 0,
    failed: 0,
  });
  const [syncMessage, setSyncMessage] = useState("");
  const [retryingId, setRetryingId] = useState(null);
  const [showNetworkRecovery, setShowNetworkRecovery] = useState(false);
  const [pendingLoaded, setPendingLoaded] = useState(false);
  const touchStartRef = useRef(null);
  const suppressClickRef = useRef(false);
  const syncActiveRef = useRef(false);
  const isOnline = useOnlineStatus();
  const previousOnlineRef = useRef(isOnline);
  const recoveryTransitionRef = useRef(false);
  const studentId = student.id;
  const routeId = resolveCurrentRouteId(searchParams.get("route_id"));
  const pointId = Number(searchParams.get("point_id")) || null;

  const loadPendingRecords = useCallback(async () => {
    try {
      const [items, offlinePackages] = await Promise.all([
        getOfflineQueueItems(studentId),
        getAllOfflineRoutePackages().catch(() => []),
      ]);
      setPendingRecords(items);
      setPendingPointNames(Object.fromEntries(
        offlinePackages.flatMap((offlinePackage) => (
          (offlinePackage.points || []).map((point) => [
            `${Number(offlinePackage.route_id)}:${Number(point.id)}`,
            point.point_name || point.name || `观察点 ${point.id}`,
          ])
        )),
      ));
      setPendingLoaded(true);
    } catch {
      setPendingRecords([]);
      setPendingPointNames({});
      setPendingLoaded(true);
    }
  }, [studentId]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");
    if (!routeId) {
      setRecords([]);
      setError("请先选择实习路线");
      setLoading(false);
      return;
    }
    try {
      const [recordsResponse, pointsResponse, summaryResponse] = await Promise.all([
        getObservationRecords(studentId),
        getPoints(routeId).catch(() => ({ data: [] })),
        getStudentRouteSummary(studentId, routeId).catch(() => ({ data: null })),
      ]);
      const pointNames = new Map(
        (Array.isArray(pointsResponse.data) ? pointsResponse.data : [])
          .map((point) => [Number(point.id), point.point_name || point.name]),
      );
      const points = Array.isArray(pointsResponse.data) ? pointsResponse.data : [];
      setSelectedPoint(pointId
        ? points.find((point) => Number(point.id) === pointId) || null
        : null);
      const routeRecords = (Array.isArray(recordsResponse.data) ? recordsResponse.data : [])
        .filter((record) => Number(record.route_id) === routeId);
      setRecords(routeRecords.map((record) => ({
        ...record,
        point_name: pointNames.get(Number(record.point_id)) || null,
      })));
      updateOfflineStudentObservations(studentId, routeId, routeRecords).catch(() => {});
      setTaskProgress(summaryResponse.data?.progress || null);
    } catch {
      setError("观察记录加载失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [pointId, routeId, studentId]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    loadPendingRecords();
  }, [loadPendingRecords]);

  useEffect(() => {
    const wasOnline = previousOnlineRef.current;
    previousOnlineRef.current = isOnline;
    if (!wasOnline && isOnline) {
      recoveryTransitionRef.current = true;
    }
    if (isOnline && recoveryTransitionRef.current && pendingLoaded) {
      setShowNetworkRecovery(pendingRecords.length > 0);
      recoveryTransitionRef.current = false;
    }
    if (!isOnline) {
      setShowNetworkRecovery(false);
    }
  }, [isOnline, pendingLoaded, pendingRecords.length]);

  const filteredRecords = useMemo(
    () => records
      .filter((record) => (
        pointId
          ? Number(record.point_id) === pointId
          : true
      ))
      .filter((record) => matchesCategory(record, activeTab))
      .sort(
        (first, second) =>
          Number(Boolean(second.is_pinned)) -
          Number(Boolean(first.is_pinned))
      ),
    [activeTab, pointId, records],
  );

  const filteredPendingRecords = useMemo(
    () => pendingRecords,
    [pendingRecords],
  );

  const handleSyncAll = useCallback(async () => {
    if (syncActiveRef.current) return;
    if (!isOnline) {
      setSyncMessage("当前处于离线状态，请联网后同步");
      return;
    }
    syncActiveRef.current = true;
    setShowNetworkRecovery(false);
    setSyncMessage("");
    try {
      const result = await syncAllOfflineItems(studentId, setSyncProgress);
      await loadPendingRecords();
      const successfulRouteIds = [...new Set(result.results
        .filter((item) => item.success)
        .map((item) => Number(item.routeId))
        .filter(Number.isFinite))];
      await Promise.all(successfulRouteIds.map((syncedRouteId) => (
        refreshOfflineStudentProgress(studentId, syncedRouteId).catch(() => null)
      )));
      const observationSucceeded = result.results.some((item) => (
        item.success && item.queueType === "observation"
      ));
      if (observationSucceeded) await loadRecords();
      if (result.stoppedOffline) {
        setSyncMessage("网络已断开，剩余记录将在下次同步");
      } else if (result.failed === 0) {
        setSyncMessage(`同步完成，共上传 ${result.success} 条记录`);
      } else {
        setSyncMessage(`同步完成：成功 ${result.success} 条，失败 ${result.failed} 条`);
      }
      setSyncProgress({ ...result, syncing: false });
    } catch (syncError) {
      console.error("一键同步失败:", syncError);
      setSyncMessage("同步初始化失败，请稍后重试");
      setSyncProgress((current) => ({ ...current, syncing: false }));
    } finally {
      syncActiveRef.current = false;
    }
  }, [isOnline, loadPendingRecords, loadRecords, studentId]);

  const handleRetry = useCallback(async (item) => {
    if (syncActiveRef.current) return;
    if (!isOnline) {
      setSyncMessage("当前处于离线状态，请联网后同步");
      return;
    }
    syncActiveRef.current = true;
    setRetryingId(item.id);
    setSyncMessage("");
    setSyncProgress({
      syncing: true,
      current: 1,
      total: 1,
      success: 0,
      failed: 0,
      activeItemId: item.id,
    });
    try {
      const result = await retryOfflineItem(item);
      await loadPendingRecords();
      if (result.success) {
        await refreshOfflineStudentProgress(studentId, item.route_id).catch(() => null);
      }
      if (result.success && result.queueType === "observation") await loadRecords();
      setSyncMessage(result.success ? "该记录同步成功" : result.error);
      setSyncProgress({
        syncing: false,
        current: 1,
        total: 1,
        success: result.success ? 1 : 0,
        failed: result.success ? 0 : 1,
      });
    } catch (retryError) {
      console.error("单条同步失败:", retryError);
      setSyncMessage("重试失败，请稍后再试");
      setSyncProgress((current) => ({ ...current, syncing: false, failed: 1 }));
      await loadPendingRecords();
    } finally {
      setRetryingId(null);
      syncActiveRef.current = false;
    }
  }, [isOnline, loadPendingRecords, loadRecords, studentId]);

  const runRecordAction = async (record, action) => {
    if (pendingActionId != null) return;
    if (action === "delete" && !window.confirm("确定删除这条观察记录吗？")) return;
    setPendingActionId(record.id);
    try {
      if (action === "favorite") await toggleObservationFavorite(record.id);
      if (action === "pin") await toggleObservationPin(record.id);
      if (action === "delete") await deleteObservation(record.id);
      setOpenActionId(null);
      await loadRecords();
    } catch {
      setError("记录操作失败，请稍后重试");
    } finally {
      setPendingActionId(null);
    }
  };

  const handleTouchStart = (event) => {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    suppressClickRef.current = false;
  };

  const handleTouchEnd = (event, recordId) => {
    if (!touchStartRef.current) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(deltaX) <= Math.abs(deltaY) || Math.abs(deltaX) < 36) return;
    suppressClickRef.current = true;
    setOpenActionId(deltaX < 0 ? recordId : null);
  };

  const openCreatePage = () => {
    if (!routeId) {
      navigate("/routes");
      return;
    }
    if (pointId) {
      const pointName = selectedPoint?.point_name || selectedPoint?.name || `观察点 ${pointId}`;
      const coordinates = selectedPoint
        ? `&latitude=${selectedPoint.latitude}&longitude=${selectedPoint.longitude}`
        : "";
      navigate(`/observe/new?route_id=${routeId}&mode=fixed&point_id=${pointId}&point_name=${encodeURIComponent(pointName)}${coordinates}`);
      return;
    }
    if (taskProgress?.free?.enabled === false) {
      window.alert("该路线未开启自由观察任务。");
      return;
    }
    navigate(`/observe/new?route_id=${routeId}&mode=random`);
  };

  return (
    <MobilePageShell className="observe-records-page">
      <img
        className="observe-records-page__background"
        src={reportBackground}
        alt=""
        aria-hidden="true"
      />

      <div className="observe-records-page__content">
        <header className="observe-records-header">
          <button type="button" onClick={() => navigate(-1)} aria-label="返回">
            <img src={backIcon} alt="" />
          </button>
          <h1>{pointId ? "我的观察记录" : "观察记录"}</h1>
          <button type="button" onClick={openCreatePage} aria-label="拍照新建观察记录">
            <img src={cameraIcon} alt="" />
          </button>
        </header>

        {pointId && (
          <section className="observe-records-point-heading" aria-label="当前观察点">
            <span aria-hidden="true">📍</span>
            <div>
              <small>观察点</small>
              <strong>{selectedPoint?.point_name || selectedPoint?.name || `观察点 ${pointId}`}</strong>
            </div>
          </section>
        )}

        <nav className={`observe-records-tabs${pointId ? " is-point-view" : ""}`} aria-label="观察记录分类">
          {TABS.map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={activeTab === value ? "is-active" : ""}
              onClick={() => setActiveTab(value)}
              aria-current={activeTab === value ? "page" : undefined}
            >
              {label}
            </button>
          ))}
        </nav>

        <section className="observe-records-list" aria-live="polite">
          {showNetworkRecovery && pendingRecords.length > 0 && (
            <div className="observe-sync-recovery" role="status">
              <span>网络已恢复，有 {pendingRecords.length} 条记录待同步</span>
              <button type="button" onClick={handleSyncAll} disabled={syncProgress.syncing}>立即同步</button>
            </div>
          )}
          {syncMessage && <p className="observe-sync-message" role="status">{syncMessage}</p>}
          {filteredPendingRecords.length > 0 && (
            <section className="observe-record-group observe-record-group--pending">
              <header>
                <div><strong>待同步记录</strong><span>{filteredPendingRecords.length} 条记录</span></div>
                <button
                  type="button"
                  className="observe-sync-all"
                  onClick={handleSyncAll}
                  disabled={syncProgress.syncing}
                >
                  {syncProgress.syncing
                    ? `同步中 ${syncProgress.current} / ${syncProgress.total}`
                    : "一键同步"}
                </button>
              </header>
              {filteredPendingRecords.map((item) => {
                const payload = item.payload || {};
                const isCheckin = item.queue_type === "checkin";
                const isFixed = item.observation_type === "fixed";
                const isSelectedPoint = Number(item.route_id) === Number(routeId)
                  && Number(item.point_id) === Number(pointId);
                const locationLabel = isCheckin || isFixed
                  ? (isSelectedPoint
                    ? selectedPoint?.point_name || selectedPoint?.name
                    : null)
                    || pendingPointNames[`${Number(item.route_id)}:${Number(item.point_id)}`]
                    || `固定观察点 ${item.point_id}`
                  : "自主发现点";
                const typeLabel = isCheckin ? "签到" : isFixed ? "指定点观察" : "自由观察";
                const recordTime = item.checked_at || item.created_at;
                const itemStatus = syncProgress.syncing && syncProgress.activeItemId === item.id
                  ? "syncing"
                  : item.status;
                return (
                  <article className="observe-record-card observe-record-card--pending" key={item.id}>
                    <div className="observe-record-card__thumbnail observe-record-card__thumbnail--pending">
                      {item.photo_blob ? (isCheckin ? "已附照片" : "照片待上传") : "暂无图片"}
                    </div>
                    <div className="observe-record-card__content">
                      <h2>📍 {locationLabel}</h2>
                      <span className={`observe-record-card__type is-${isCheckin || isFixed ? "fixed" : "free"}`}>
                        {typeLabel}
                      </span>
                      <time dateTime={recordTime}>{formatObservationTime(recordTime)}</time>
                      {isCheckin
                        ? <p>距离观察点 {Math.round(Number(item.distance) || 0)}m</p>
                        : payload.observation_text && <p>{payload.observation_text}</p>}
                      <span className={`observe-record-card__status is-offline-${itemStatus}`}>
                        {itemStatus === "syncing"
                          ? "同步中"
                          : itemStatus === "failed" ? "同步失败" : "待同步"}
                      </span>
                      {itemStatus === "failed" && item.last_error && (
                        <small className="observe-record-card__sync-error">{item.last_error}</small>
                      )}
                      {itemStatus === "failed" && (
                        <button
                          type="button"
                          className="observe-record-card__retry"
                          onClick={() => handleRetry(item)}
                          disabled={syncProgress.syncing || retryingId === item.id}
                        >
                          {retryingId === item.id ? "重试中…" : "重试"}
                        </button>
                      )}
                      {item.queue_type === "observation"
                        && item.server_observation_id != null
                        && item.sync_stage === "upload_photo" && (
                          <small className="observe-record-card__partial-sync">
                            该记录已部分同步，请继续上传照片
                          </small>
                        )}
                    </div>
                  </article>
                );
              })}
            </section>
          )}
          {loading && <p className="observe-records-message">正在加载观察记录...</p>}
          {!loading && error && <p className="observe-records-message is-error">{error}</p>}
          {!loading && !error && (pointId ? ["point"] : ["fixed", "free"]).map((groupType) => {
            const groupRecords = groupType === "point"
              ? filteredRecords
              : filteredRecords.filter((record) => (
                  groupType === "fixed"
                    ? ["fixed", "checkin"].includes(record.observation_type)
                    : ["free", "self"].includes(record.observation_type)
                ));
            const groupLabel = groupType === "point"
              ? "全部记录"
              : groupType === "fixed" ? "固定观察" : "自由观察";
            return <section className={`observe-record-group is-${groupType}`} key={groupType}>
              <header><div><strong>{groupLabel}</strong><span>{groupRecords.length} 条记录</span></div>{groupType === "free" && taskProgress?.free && <p>已完成 {taskProgress.free.completed}/{taskProgress.free.required ?? taskProgress.free.total}{taskProgress.free.enabled && Number(taskProgress.free.required ?? taskProgress.free.total) > 0 && taskProgress.free.is_complete ? " · 自由观察任务已完成" : ""}</p>}</header>
              {groupRecords.length === 0 && (groupType === "point" ? (
                <div className="observe-record-group__point-empty">
                  <strong>暂无观察记录</strong>
                  <p>完成观察后，照片、描述和 AI 分析会显示在这里。</p>
                  <button type="button" onClick={openCreatePage}>去完成观察</button>
                </div>
              ) : <p className="observe-record-group__empty">暂无{groupLabel}记录</p>)}
              {groupRecords.map((record) => {
            const effectiveGroupType = ["free", "self"].includes(record.observation_type)
              ? "free"
              : "fixed";
            const analysisStatus = getAnalysisStatus(record.analysis_status);
            const locationLabel = effectiveGroupType === "fixed"
              ? record.point_name || `固定观察点 ${record.point_id || ""}`.trim()
              : "自主发现点";
            const returnQuery = `student_id=${studentId}&route_id=${routeId}${pointId ? `&point_id=${pointId}` : ""}`;
            const openAnalysisResult = () => navigate(
              `/analysis/result?observation_id=${record.id}`,
              {
                state: {
                  observationId: record.id,
                  photoUrl: record.photo_url,
                  routeId: record.route_id,
                  studentId,
                  saveReturnTo: `/observe?${returnQuery}`,
                },
              },
            );
            return (
              <div
                className={`observe-record-card-shell${openActionId === record.id ? " is-open" : ""}`}
                key={record.id}
                onTouchStart={handleTouchStart}
                onTouchEnd={(event) => handleTouchEnd(event, record.id)}
              >
                <div className="observe-record-card__actions" aria-hidden={openActionId !== record.id}>
                  <button type="button" onClick={() => runRecordAction(record, "favorite")} disabled={pendingActionId === record.id}>
                    <span>{record.is_favorite ? "★" : "☆"}</span>{record.is_favorite ? "取消收藏" : "收藏"}
                  </button>
                  <button type="button" onClick={() => runRecordAction(record, "pin")} disabled={pendingActionId === record.id}>
                    <span>⌃</span>{record.is_pinned ? "取消置顶" : "置顶"}
                  </button>
                  <button className="is-delete" type="button" onClick={() => runRecordAction(record, "delete")} disabled={pendingActionId === record.id}>
                    <span>×</span>删除
                  </button>
                </div>
                <article
                  className="observe-record-card"
                  role="link"
                  tabIndex={0}
                  onClick={() => {
                    if (suppressClickRef.current) {
                      suppressClickRef.current = false;
                      return;
                    }
                    if (openActionId === record.id) {
                      setOpenActionId(null);
                      return;
                    }
                    openAnalysisResult();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openAnalysisResult();
                    }
                  }}
                  aria-label={`查看${locationLabel}的观察记录`}
                >
                  {record.photo_url ? (
                    <img
                      className="observe-record-card__thumbnail"
                      src={resolvePhotoUrl(record.photo_url)}
                      alt=""
                      onError={(event) => event.currentTarget.classList.add("is-load-error")}
                    />
                  ) : (
                    <div className="observe-record-card__thumbnail observe-record-card__thumbnail--empty">暂无图片</div>
                  )}
                  <div className="observe-record-card__content">
                    <h2>
                      📍 {locationLabel}
                      {record.is_favorite && <span className="observe-record-card__favorite" aria-label="已收藏">★</span>}
                    </h2>
                    <span className={`observe-record-card__type is-${effectiveGroupType}`}>
                      {record.observation_type === "checkin" ? "签到观察" : effectiveGroupType === "fixed" ? "固定观察" : "自由观察"}
                    </span>
                    {record.observation_time && (
                      <time dateTime={record.observation_time}>{formatObservationTime(record.observation_time)}</time>
                    )}
                    {record.observation_text && <p>{record.observation_text}</p>}
                    {pointId && (
                      <div className="observe-record-card__analysis-summary">
                        <b>AI分析：</b>
                        <span>{record.rock_name || analysisStatus?.label || "暂无分析结果"}</span>
                        {record.confidence && <small>置信度 {record.confidence}</small>}
                      </div>
                    )}
                    {analysisStatus && (
                      <span className={`observe-record-card__status ${analysisStatus.className}`}>
                        {analysisStatus.label}
                      </span>
                    )}
                  </div>
                </article>
              </div>
            );
              })}
            </section>;
          })}
        </section>
      </div>

      <button
        className="observe-records-fab"
        type="button"
        onClick={openCreatePage}
        aria-label="新增观察记录"
      >
        <span aria-hidden="true">+</span>
      </button>

      <BottomNav activeId="observe" />
    </MobilePageShell>
  );
}
