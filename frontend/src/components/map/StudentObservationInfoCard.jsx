import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { observationInfoCardBg } from "../../assets/map-page";
import { createAIAnalysis, getAIAnalysis } from "../../api/observation";
import { useStudentAuth } from "../../context/StudentAuthContext";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

function formatCreatedAt(value) {
  if (!value) return "时间暂无";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
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

export function StudentObservationInfoCard({ observation, onClose }) {
  const navigate = useNavigate();
  const { student } = useStudentAuth();
  const isOnline = useOnlineStatus();
  const [requestPending, setRequestPending] = useState(false);
  const [error, setError] = useState("");
  const [blobPhotoUrl, setBlobPhotoUrl] = useState("");
  const [latestAnalysisStatus, setLatestAnalysisStatus] = useState(null);
  const requestActiveRef = useRef(false);

  useEffect(() => {
    let objectUrl = "";
    setBlobPhotoUrl("");
    if (observation?.photo_blob instanceof Blob) {
      objectUrl = URL.createObjectURL(observation.photo_blob);
      setBlobPhotoUrl(objectUrl);
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [observation]);

  useEffect(() => {
    setRequestPending(false);
    setError("");
    setLatestAnalysisStatus(null);
    requestActiveRef.current = false;
  }, [observation?.id, observation?.local_queue_id]);

  useEffect(() => {
    const observationId = Number(observation?.id);
    const isQueueRecord = Boolean(
      observation?.is_offline
      || observation?.local_queue_id
      || ["pending", "syncing", "failed"].includes(observation?.queue_status),
    );
    if (!isOnline || isQueueRecord || !Number.isInteger(observationId) || observationId <= 0) {
      return undefined;
    }
    let active = true;
    getAIAnalysis(observationId)
      .then((response) => {
        const status = response.data?.status;
        if (active && typeof status === "string" && status.trim()) {
          setLatestAnalysisStatus(status);
        }
      })
      .catch(() => {
        // Keep the records response status when this lightweight refresh fails.
      });
    return () => { active = false; };
  }, [isOnline, observation]);

  if (!observation) return null;
  const photoUrl = blobPhotoUrl || resolvePhotoUrl(observation.photo_url);
  const observationType = observation.observation_type === "self"
    ? "free"
    : observation.observation_type;
  const supportsAI = ["fixed", "free"].includes(observationType);
  const isQueueRecord = Boolean(
    observation.is_offline
    || observation.local_queue_id
    || ["pending", "syncing", "failed"].includes(observation.queue_status),
  );
  const isPartiallySynced = isQueueRecord
    && observation.server_observation_id != null
    && observation.sync_stage === "upload_photo";
  const observationId = Number(observation.id);
  const hasServerObservationId = Number.isInteger(observationId)
    && observationId > 0
    && !isQueueRecord;
  const rawAnalysisStatus = String(
    latestAnalysisStatus
    || observation.analysis_status
    || observation.ai_status
    || observation.ai_analysis?.status
    || observation.analysis?.status
    || "",
  ).toLowerCase();
  const analysisState = (() => {
    if (isPartiallySynced) return { key: "partial", label: "完成同步后可分析" };
    if (isQueueRecord) return { key: "offline", label: "同步后可分析" };
    if (["completed", "success"].includes(rawAnalysisStatus)) {
      return { key: "completed", label: "分析完成" };
    }
    if (["processing", "pending"].includes(rawAnalysisStatus)) {
      return { key: "processing", label: "分析中" };
    }
    if (["failed", "error"].includes(rawAnalysisStatus)) {
      return { key: "failed", label: "分析失败" };
    }
    return { key: "none", label: "未分析" };
  })();

  const syncStatus = isPartiallySynced
    ? "部分同步"
    : observation.queue_status === "syncing"
      ? "同步中"
      : observation.queue_status === "failed"
        ? "同步失败"
        : isQueueRecord ? "待同步" : "";

  let buttonLabel = analysisState.key === "completed"
    ? "查看AI分析"
    : analysisState.key === "failed"
      ? "重新分析"
      : analysisState.key === "processing"
        ? "分析中…"
        : "AI分析";
  let buttonDisabled = requestPending || analysisState.key === "processing";
  if (isPartiallySynced) {
    buttonLabel = "AI分析（待同步完成）";
    buttonDisabled = true;
  } else if (isQueueRecord || (!isOnline && analysisState.key !== "processing")) {
    buttonLabel = analysisState.key === "completed"
      ? "查看AI分析（需联网）"
      : "AI分析（需联网）";
    buttonDisabled = true;
  } else if (!hasServerObservationId) {
    buttonLabel = "AI分析暂不可用";
    buttonDisabled = true;
  }
  if (requestPending) {
    buttonLabel = analysisState.key === "failed" ? "正在重新分析…" : "分析中…";
  }

  function buildNavigationState() {
    return {
      observationId,
      photoUrl,
      routeId: observation.route_id,
      studentId: student.id,
      saveReturnTo: `/routes/${observation.route_id}/map`,
    };
  }

  async function handleAIAction() {
    if (buttonDisabled || requestActiveRef.current || !hasServerObservationId || !isOnline) return;
    setError("");
    if (analysisState.key === "completed") {
      navigate(`/analysis/result?observation_id=${observationId}&route_id=${observation.route_id}`, {
        state: buildNavigationState(),
      });
      return;
    }

    requestActiveRef.current = true;
    setRequestPending(true);
    try {
      const response = await createAIAnalysis(observationId);
      const analysisId = Number(response.data?.analysis_id);
      if (!Number.isInteger(analysisId) || analysisId <= 0) {
        throw new Error("ANALYSIS_ID_MISSING");
      }
      const analysisFlow = { ...buildNavigationState(), analysisId };
      try {
        sessionStorage.setItem(
          `field-practice-analysis-flow-${analysisId}`,
          JSON.stringify(analysisFlow),
        );
      } catch {
        // Route state is sufficient for the immediate loading flow.
      }
      navigate(`/analysis/loading/${analysisId}`, { state: analysisFlow });
    } catch {
      requestActiveRef.current = false;
      setRequestPending(false);
      setError("AI分析启动失败，请稍后重试");
    }
  }

  return (
    <section
      className="student-observation-detail"
      style={{ "--student-observation-card-bg": `url(${observationInfoCardBg})` }}
      aria-live="polite"
    >
      <button
        type="button"
        className="student-observation-detail__close"
        onClick={onClose}
        aria-label="关闭观察记录详情"
      >
        ×
      </button>
      <span className="student-observation-detail__eyebrow">
        {observationType === "fixed" ? "固定观察" : "自由观察"}
      </span>
      <h2>我的观察记录</h2>
      <dl>
        <div>
          <dt>创建时间</dt>
          <dd>{formatCreatedAt(observation.created_at)}</dd>
        </div>
        <div>
          <dt>观察文字</dt>
          <dd>{observation.observation_text || "暂无观察文字"}</dd>
        </div>
      </dl>
      {photoUrl && (
        <figure>
          <img src={photoUrl} alt="观察记录地质照片" />
        </figure>
      )}
      {supportsAI && (
        <section className="student-observation-detail__ai" aria-live="polite">
          {syncStatus && (
            <div>
              <span>同步状态</span>
              <strong className={`is-sync-${isPartiallySynced ? "partial" : "pending"}`}>
                {syncStatus}
              </strong>
            </div>
          )}
          <div>
            <span>AI状态</span>
            <strong className={`is-ai-${analysisState.key}`}>{analysisState.label}</strong>
          </div>
          <button
            type="button"
            onClick={handleAIAction}
            disabled={buttonDisabled}
          >
            {buttonLabel}
          </button>
          {error && <p role="alert">{error}</p>}
        </section>
      )}
    </section>
  );
}
