import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import request from "../api/request";
import { getObservationRecords, toggleObservationFavorite } from "../api/observation";
import { getRoute } from "../api/route";
import {
  profileBackIcon,
  profileBottomDecoration,
  profilePageBackground,
} from "../assets/profile-ui";
import { BottomNav } from "../components/BottomNav";
import { MobilePageShell } from "../components/layout/MobilePageShell";
import { StudentObservationInfoCard } from "../components/map/StudentObservationInfoCard";
import { PaperCard } from "../components/PaperCard";
import { useStudentAuth } from "../context/StudentAuthContext";
import "./ProfilePage.css";
import "./FavoritesPage.css";

const FAVORITE_OBSERVATION_TYPES = new Set(["fixed", "free", "self"]);

function formatObservationTime(value) {
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
  if (/^(https?:|blob:|data:)/i.test(photoUrl)) return photoUrl;
  return `${request.defaults.baseURL}/${String(photoUrl).replace(/^\/+/, "")}`;
}

function getTypeLabel(observationType) {
  return observationType === "fixed" ? "指定点观察" : "自由观察";
}

export function FavoritesPage() {
  const navigate = useNavigate();
  const { student } = useStudentAuth();
  const [records, setRecords] = useState([]);
  const [routeNames, setRouteNames] = useState({});
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadFavorites() {
      setLoading(true);
      setError("");
      try {
        const response = await getObservationRecords(student.id);
        const favorites = (Array.isArray(response.data) ? response.data : []).filter((record) => (
          record.is_favorite === true
          && FAVORITE_OBSERVATION_TYPES.has(record.observation_type)
        ));
        if (!active) return;
        setRecords(favorites);

        const routeIds = [...new Set(
          favorites
            .map((record) => Number(record.route_id))
            .filter((routeId) => Number.isInteger(routeId) && routeId > 0),
        )];
        const routeResponses = await Promise.allSettled(
          routeIds.map((routeId) => getRoute(routeId)),
        );
        if (!active) return;
        setRouteNames(Object.fromEntries(
          routeResponses.flatMap((result, index) => {
            if (result.status !== "fulfilled") return [];
            const route = result.value.data || {};
            const routeName = route.route_name || route.name;
            return routeName ? [[routeIds[index], routeName]] : [];
          }),
        ));
      } catch {
        if (active) {
          setRecords([]);
          setError("收藏记录加载失败，请稍后重试");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadFavorites();
    return () => { active = false; };
  }, [student.id]);

  const selectedDetailRecord = useMemo(() => (
    selectedRecord
      ? {
          ...selectedRecord,
          observation_type: selectedRecord.observation_type === "self"
            ? "free"
            : selectedRecord.observation_type,
          created_at: selectedRecord.created_at || selectedRecord.observation_time,
        }
      : null
  ), [selectedRecord]);

  function handleBack() {
    if ((window.history.state?.idx || 0) > 0) {
      navigate(-1);
    } else {
      navigate("/profile", { replace: true });
    }
  }

  async function removeFavorite(record) {
    if (pendingIds.has(record.id)) return;
    setPendingIds((current) => new Set(current).add(record.id));
    setError("");
    try {
      const response = await toggleObservationFavorite(record.id);
      if (response.data?.is_favorite === false) {
        setRecords((current) => current.filter((item) => item.id !== record.id));
        setSelectedRecord((current) => current?.id === record.id ? null : current);
      } else {
        setError("取消收藏未生效，请稍后重试");
      }
    } catch {
      setError("取消收藏失败，请稍后重试");
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(record.id);
        return next;
      });
    }
  }

  return (
    <MobilePageShell className="favorites-page profile-page">
      <img className="profile-page__background" src={profilePageBackground} alt="" aria-hidden="true" />

      <div className="favorites-page__content">
        <header className="profile-page__topbar favorites-page__topbar">
          <button type="button" onClick={handleBack} aria-label="返回上一页">
            <img src={profileBackIcon} alt="" aria-hidden="true" />
          </button>
          <div>
            <h1>我的收藏</h1>
            <p>珍藏每一次野外发现</p>
          </div>
          <span aria-hidden="true" />
        </header>

        <section className="favorites-page__list" aria-label="收藏的观察记录">
          {loading && <p className="favorites-page__message">正在翻阅收藏记录...</p>}
          {!loading && error && records.length === 0 && (
            <PaperCard className="favorites-page__empty is-error" role="alert">
              <strong>暂时无法打开收藏夹</strong>
              <p>{error}</p>
            </PaperCard>
          )}
          {!loading && !error && records.length === 0 && (
            <PaperCard className="favorites-page__empty">
              <span aria-hidden="true">☆</span>
              <span className="favorites-page__empty-copy">
                <strong>还没有收藏的观察记录</strong>
                <p>在观察记录中点亮收藏，就会出现在这里。</p>
              </span>
            </PaperCard>
          )}
          {records.map((record) => {
            const routeName = routeNames[Number(record.route_id)];
            return (
              <PaperCard className="favorite-record" key={record.id}>
                <button
                  type="button"
                  className="favorite-record__main"
                  onClick={() => setSelectedRecord(record)}
                  aria-label={`查看${getTypeLabel(record.observation_type)}详情`}
                >
                  {record.photo_url ? (
                    <img
                      className="favorite-record__photo"
                      src={resolvePhotoUrl(record.photo_url)}
                      alt=""
                      onError={(event) => event.currentTarget.classList.add("is-load-error")}
                    />
                  ) : (
                    <span className="favorite-record__photo is-empty" aria-hidden="true">记录</span>
                  )}
                  <span className="favorite-record__copy">
                    <span className={`favorite-record__type is-${record.observation_type === "fixed" ? "fixed" : "free"}`}>
                      {getTypeLabel(record.observation_type)}
                    </span>
                    <time dateTime={record.observation_time || undefined}>
                      {formatObservationTime(record.observation_time)}
                    </time>
                    <strong>{record.observation_text || "暂无观察文字"}</strong>
                    {routeName && <small>路线 · {routeName}</small>}
                  </span>
                </button>
                <button
                  type="button"
                  className="favorite-record__unfavorite"
                  onClick={() => removeFavorite(record)}
                  disabled={pendingIds.has(record.id)}
                  aria-label={`取消收藏：${record.observation_text || getTypeLabel(record.observation_type)}`}
                >
                  <span aria-hidden="true">★</span>
                  {pendingIds.has(record.id) ? "处理中" : "已收藏"}
                </button>
              </PaperCard>
            );
          })}
          {records.length > 0 && error && <p className="favorites-page__inline-error" role="alert">{error}</p>}
        </section>
      </div>

      <img
        className="profile-page__decoration"
        src={profileBottomDecoration}
        alt=""
        aria-hidden="true"
        draggable="false"
      />

      {selectedDetailRecord && (
        <div className="favorites-page__detail-backdrop" onMouseDown={() => setSelectedRecord(null)}>
          <div className="favorites-page__detail" onMouseDown={(event) => event.stopPropagation()}>
            <StudentObservationInfoCard
              observation={selectedDetailRecord}
              onClose={() => setSelectedRecord(null)}
            />
          </div>
        </div>
      )}

      <BottomNav activeId="profile" />
    </MobilePageShell>
  );
}
