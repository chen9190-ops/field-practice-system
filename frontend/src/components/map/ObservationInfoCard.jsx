import React, { useEffect, useState } from "react";
import {
  autoCheckinButtonBg,
  observationInfoCardBg,
} from "../../assets/map-page";
import { cameraIcon, closeIcon, uploadCard } from "../../assets/observation";
import { getRouteMediaUrl } from "../../api/route";
import { getCachedMaterialBlobUrl } from "../../offline/offlineCache";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import "./ObservationInfoCard.css";

const statusLabels = {
  completed: "已签到",
  locked: "未到达",
};

const CHECKIN_RADIUS_METERS = 50;
const materialTypeLabels = { text: "文字资料", file: "文件资料", link: "外部链接" };

function formatFileSize(size) {
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getFileKind(material) {
  const name = String(material?.file_name || material?.file_url || "").toLowerCase();
  if (name.endsWith(".pdf")) return { label: "PDF", iconLabel: "PDF", action: "查看" };
  if (/\.docx?$/.test(name)) return { label: "Word", iconLabel: "DOC", action: "下载" };
  if (/\.pptx?$/.test(name)) return { label: "PPT", iconLabel: "PPT", action: "下载" };
  if (/\.(jpe?g|png|webp)$/.test(name)) return { label: "图片", iconLabel: "IMG", action: "查看" };
  return { label: "文件", iconLabel: "FILE", action: "下载" };
}

function MaterialAction({ material, file }) {
  const [offlineUrl, setOfflineUrl] = useState("");
  const isOnline = useOnlineStatus();
  const onlineUrl = getRouteMediaUrl(material?.file_url);

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setOfflineUrl("");
    if (!isOnline) {
      getCachedMaterialBlobUrl(material).then((url) => {
        objectUrl = url;
        if (active) setOfflineUrl(url);
        else if (url) URL.revokeObjectURL(url);
      }).catch(() => {});
    }
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isOnline, material]);

  const url = isOnline ? onlineUrl : offlineUrl;
  return url
    ? <a href={url} target="_blank" rel="noreferrer">{file.action} <span>›</span></a>
    : <em>{isOnline ? "资料文件暂不可用" : "该文件未缓存"}</em>;
}

function PointMaterials({ materials }) {
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const isOnline = useOnlineStatus();
  const rows = Array.isArray(materials) ? materials : [];
  if (!rows.length) return <p className="point-materials-empty">暂无学习资料</p>;

  function toggleMaterial(id) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return <div className="point-materials-list">{rows.map((material, index) => {
    const id = material?.id ?? `material-${index}`;
    const type = material?.material_type;
    const isText = type === "text";
    const isFile = type === "file";
    const isLink = type === "link";
    const expanded = expandedIds.has(id);
    const file = getFileKind(material);
    const size = formatFileSize(material?.file_size);
    return <article className="point-material" key={id}>
      <div className="point-material__heading">
        <i className="point-material__icon" aria-hidden="true">{isFile ? file.iconLabel : isLink ? "链" : "文"}</i>
        <div><strong>{material?.title || "学习资料"}</strong><small>{isFile ? [file.label, size].filter(Boolean).join(" · ") : materialTypeLabels[type] || "学习资料"}</small></div>
      </div>
      <p className={isText && expanded ? "is-expanded" : ""}>{material?.description || "暂无资料说明"}</p>
      <div className="point-material__footer">
        {isFile && material?.file_name && <span className="point-material__filename" title={material.file_name}>{material.file_name}</span>}
        <div className="point-material__action">{isText ? <button type="button" onClick={() => toggleMaterial(id)}>{expanded ? "收起" : "查看详情"} <span>›</span></button> : isLink ? (!isOnline ? <em>该资料需要联网查看</em> : material?.external_url ? <a href={material.external_url} target="_blank" rel="noreferrer">打开链接 <span>›</span></a> : <em>链接暂不可用</em>) : isFile ? <MaterialAction material={material} file={file} /> : <em>资料暂不可用</em>}</div>
      </div>
    </article>;
  })}</div>;
}

export function ObservationInfoCard({
  observation,
  distance,
  hasObservations,
  routeHasTrack,
  canCheckIn,
  checkinState,
  onCheckIn,
  showCheckinUpload,
  checkinPhotoPreview,
  hasCheckinPhoto,
  onCheckinPhotoChange,
  onRemoveCheckinPhoto,
  onSubmitCheckIn,
  observationRecord,
  hasAIAnalysis,
  aiState,
  onStartAIAnalysis,
  onViewAIAnalysis,
  onOpenObservation,
  onRandomObservation,
  isOutsideCheckInRadius,
  offlineCheckin,
  offlineMode,
}) {
  const [isExpanded, setIsExpanded] = useState(Boolean(observation));
  const normalizedDistance = Number(distance);
  const hasCurrentDistance = distance != null && Number.isFinite(normalizedDistance);
  const isWithinCheckInRadius = hasCurrentDistance
    && normalizedDistance <= CHECKIN_RADIUS_METERS;
  const distanceText = !hasCurrentDistance
    ? "等待定位"
    : normalizedDistance < 1000
      ? `${Math.round(normalizedDistance)} m`
      : `${(normalizedDistance / 1000).toFixed(1)} km`;
  const statusText = observation?.status === "pending-sync"
    ? "已签到 · 待同步"
    : observation?.status === "observation-pending"
      ? "已观察 · 待同步"
    : observation?.status === "completed"
    ? statusLabels.completed
    : !hasCurrentDistance
      ? "等待定位"
      : isWithinCheckInRadius
        ? "可签到"
        : "距离观察点过远，无法签到";
  const hasCompletedObservation = observation?.status === "completed"
    && Boolean(observationRecord?.id);

  return (
    <section
      className={`observation-card ${isExpanded ? "is-expanded" : "is-collapsed"}`}
      style={{ "--observation-card-bg": `url(${observationInfoCardBg})` }}
      aria-live="polite"
    >
      <button
        type="button"
        className="observation-card__toggle"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "收起观察点信息" : "展开观察点信息"}
      >
        <span className="observation-card__summary">
          <strong>{observation?.name || "当前路线暂无观察点"}</strong>
          {observation && <span>距离：{distanceText}</span>}
        </span>
        <span className="observation-card__arrow" aria-hidden="true">⌃</span>
      </button>

      {isExpanded && <div className="observation-card__content">
      {!hasObservations ? (
        <div className="observation-card__empty">
          <span>最近观察点</span>
          <strong>当前路线暂无观察点</strong>
          {!routeHasTrack && (
            <p className="observation-card__track-note">
              当前路线暂无预设轨迹
            </p>
          )}
        </div>
      ) : observation && isOutsideCheckInRadius ? (
        <div className="observation-card__empty observation-card__empty--nearby">
          <span>最近观察点距离：{distanceText}</span>
          <strong>附近暂无固定观察点</strong>
          <button
            type="button"
            className="observation-card__checkin observation-card__random"
            style={{ "--auto-checkin-bg": `url(${autoCheckinButtonBg})` }}
            onClick={onRandomObservation}
          >
            自主观察
          </button>
        </div>
      ) : observation ? (
        <>
          <div className="observation-card__copy">
            <span className="observation-card__eyebrow">最近观察点</span>
            <h2>
              {observation.name}
              <small>（{observation.code}）</small>
            </h2>
            <div className="observation-card__meta">
              <span>距离：{distanceText}</span>
              <span>状态：{statusText}</span>
            </div>
            <dl className="observation-card__details">
              <div><dt>观察任务</dt><dd>{observation.task || "暂无任务说明"}</dd></div>
              <div><dt>点位描述</dt><dd>{observation.description || "暂无点位描述"}</dd></div>
              <div className="observation-card__materials"><dt>学习资料</dt><dd><PointMaterials materials={observation.learning_materials} /></dd></div>
              <div><dt>经纬度</dt><dd>{Number(observation.longitude).toFixed(6)}, {Number(observation.latitude).toFixed(6)}</dd></div>
            </dl>
            {!routeHasTrack && (
              <p className="observation-card__track-note">
                当前路线暂无预设轨迹
              </p>
            )}
            {checkinState.message && (
              <p
                className={[
                  "observation-card__feedback",
                  checkinState.error ? "is-error" : "",
                ].filter(Boolean).join(" ")}
              >
                {checkinState.message}
              </p>
            )}
          </div>
          {showCheckinUpload && (
            <section className="observation-card__upload" aria-label="上传签到照片">
              <h3>上传地质照片</h3>
              <div className="observation-card__upload-grid">
                <label
                  className="observation-card__photo-picker"
                  style={{ backgroundImage: `url(${uploadCard})` }}
                >
                  <img src={cameraIcon} alt="" aria-hidden="true" />
                  <span>拍照或选择图片</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(event) => {
                      onCheckinPhotoChange?.(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
                <div className={`observation-card__photo-preview${checkinPhotoPreview ? "" : " is-empty"}`}>
                  {checkinPhotoPreview ? (
                    <>
                      <img src={checkinPhotoPreview} alt="地质照片预览" />
                      <button
                        type="button"
                        onClick={onRemoveCheckinPhoto}
                        aria-label="移除签到照片"
                      >
                        <img src={closeIcon} alt="" aria-hidden="true" />
                      </button>
                    </>
                  ) : <span>图片预览</span>}
                </div>
              </div>
              <button
                type="button"
                className="observation-card__checkin observation-card__submit-checkin"
                style={{ "--auto-checkin-bg": `url(${autoCheckinButtonBg})` }}
                onClick={onSubmitCheckIn}
                disabled={checkinState.pending || (!offlineMode && !hasCheckinPhoto)}
              >
                {checkinState.pending ? "提交中…" : "提交签到"}
              </button>
            </section>
          )}
          <div className="observation-card__actions">
            {offlineCheckin ? (
              <div className="observation-card__offline-checkin" role="status">
                <strong>已离线签到</strong>
                <span>距离观察点 {Math.round(Number(offlineCheckin.distance) || 0)}m</span>
                <em>待同步</em>
              </div>
            ) : hasCompletedObservation ? (
              <>
                <button
                  type="button"
                  className="observation-card__secondary"
                  onClick={onOpenObservation}
                >
                  观察记录
                </button>
                <button
                  type="button"
                  className="observation-card__secondary observation-card__ai"
                  onClick={hasAIAnalysis ? onViewAIAnalysis : onStartAIAnalysis}
                  disabled={aiState?.pending}
                >
                  {aiState?.pending
                    ? "正在启动AI分析…"
                    : hasAIAnalysis
                      ? "查看 AI 分析"
                      : "AI 分析"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="observation-card__checkin"
                  style={{ "--auto-checkin-bg": `url(${autoCheckinButtonBg})` }}
                  onClick={onCheckIn}
                  disabled={!canCheckIn || !isWithinCheckInRadius || checkinState.pending || showCheckinUpload}
                >
                  {checkinState.pending ? "定位中…" : "到达签到"}
                </button>
                <button
                  type="button"
                  className="observation-card__secondary"
                  onClick={onOpenObservation}
                >
                  观察记录
                </button>
                <button
                  type="button"
                  className="observation-card__secondary"
                  onClick={onRandomObservation}
                >
                  自主观察
                </button>
              </>
            )}
            {aiState?.message && (
              <p className="observation-card__ai-message">{aiState.message}</p>
            )}
          </div>
        </>
      ) : null}
      </div>}
    </section>
  );
}
