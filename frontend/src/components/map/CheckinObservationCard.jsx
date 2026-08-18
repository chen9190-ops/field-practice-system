import React from "react";
import { observationInfoCardBg } from "../../assets/map-page";
import "./CheckinObservationCard.css";

function formatCheckinTime(value) {
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

export function CheckinObservationCard({
  observation,
  checkinTime,
  onClose,
  onViewAIAnalysis,
}) {
  const observationId = observation?.observation_id ?? observation?.id;
  const photoUrl = resolvePhotoUrl(observation?.photo_url);
  const hasAIAnalysis = Boolean(observationId)
    && observation?.analysis_status === "completed";

  return (
    <div className="checkin-observation-card__layer" onClick={onClose}>
      <section
        className="checkin-observation-card"
        style={{ "--checkin-observation-card-bg": `url(${observationInfoCardBg})` }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkin-observation-card-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="checkin-observation-card__close"
          onClick={onClose}
          aria-label="关闭签到记录详情"
        >
          ×
        </button>
        <span className="checkin-observation-card__eyebrow">观察点签到</span>
        <h2 id="checkin-observation-card-title">签到记录</h2>
        <dl>
          <div>
            <dt>签到时间</dt>
            <dd>{formatCheckinTime(checkinTime || observation?.created_at)}</dd>
          </div>
          <div>
            <dt>观察文字</dt>
            <dd>{observation?.observation_text || "暂无观察文字"}</dd>
          </div>
        </dl>

        {photoUrl ? (
          <figure>
            <img src={photoUrl} alt="签到上传的地质照片" />
          </figure>
        ) : (
          <p className="checkin-observation-card__empty-photo">暂无上传照片</p>
        )}

        {hasAIAnalysis ? (
          <button
            type="button"
            className="checkin-observation-card__ai"
            onClick={() => onViewAIAnalysis?.(observation)}
          >
            查看AI分析
          </button>
        ) : (
          <p className="checkin-observation-card__ai-waiting" role="status">
            等待AI分析
          </p>
        )}
      </section>
    </div>
  );
}
