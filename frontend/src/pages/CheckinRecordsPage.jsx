import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCheckin, getRoutePoints } from "../api/checkin";
import { getObservationRecords } from "../api/observation";
import { getRouteMap } from "../api/route";
import { BottomNav } from "../components/BottomNav";
import { CheckinCalendar } from "../components/CheckinCalendar";
import { CheckinObservationCard } from "../components/map/CheckinObservationCard";
import { MobilePageShell } from "../components/layout/MobilePageShell";
import { observationBackground } from "../assets/observation";
import {
  backIcon,
  bottomTerrain,
  calendarIcon,
  completedBadge,
  currentBadge,
  emptyMarker,
  observationPointIcon,
  selectedUnderline,
} from "../assets/checkin-records";
import "./CheckinRecordsPage.css";
import { resolveCurrentRouteId } from "../utils/currentRoute";
import { useStudentAuth } from "../context/StudentAuthContext";

function parseCheckinTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return { date: "日期暂无", time: "时间暂无", dateKey: "" };
  }
  const sourceDateKey = String(value).match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  const dateKey = sourceDateKey || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return {
    date: dateKey,
    time: date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    dateKey,
  };
}

function formatDistance(value) {
  const distance = Number(value);
  if (!Number.isFinite(distance)) return "暂无数据";
  return distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`;
}

function coordinateKey(latitude, longitude) {
  const normalizedLatitude = Number(latitude);
  const normalizedLongitude = Number(longitude);
  if (!Number.isFinite(normalizedLatitude) || !Number.isFinite(normalizedLongitude)) return "";
  return `${normalizedLatitude.toFixed(7)},${normalizedLongitude.toFixed(7)}`;
}

export function CheckinRecordsPage() {
  const navigate = useNavigate();
  const { student } = useStudentAuth();
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCheckin, setSelectedCheckin] = useState(null);
  const studentId = student.id;
  const routeId = resolveCurrentRouteId(searchParams.get("route_id"));

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    if (!routeId) {
      setLoading(false);
      setError("请先选择实习路线");
      return () => { active = false; };
    }

    Promise.all([
      getRoutePoints(routeId),
      getCheckin(studentId, routeId),
      getRouteMap(routeId, studentId).catch(() => ({ data: {} })),
      getObservationRecords(studentId).catch(() => ({ data: [] })),
    ])
      .then(([pointsResponse, checkinsResponse, mapResponse, observationRecordsResponse]) => {
        if (!active) return;

        const points = Array.isArray(pointsResponse.data) ? pointsResponse.data : [];
        const checkins = Array.isArray(checkinsResponse.data) ? checkinsResponse.data : [];
        const observationRecords = Array.isArray(observationRecordsResponse.data)
          ? observationRecordsResponse.data
          : [];
        const analysisStatusByObservationId = new Map(
          observationRecords.map((observation) => [
            Number(observation.id),
            observation.analysis_status,
          ]),
        );
        const checkinObservations = Array.isArray(mapResponse.data?.student_observations)
          ? mapResponse.data.student_observations.filter(
              (observation) => observation.observation_type === "checkin",
            ).map((observation) => ({
              ...observation,
              analysis_status: analysisStatusByObservationId.get(Number(observation.id)) || null,
            }))
          : [];
        const observationsByCoordinate = new Map(
          checkinObservations.map((observation) => [
            coordinateKey(observation.latitude, observation.longitude),
            observation,
          ]),
        );
        const checkinsByPointId = new Map(
          checkins.map((checkin) => [Number(checkin.point_id), checkin]),
        );

        setRecords(points.map((point) => {
          const checkin = checkinsByPointId.get(Number(point.id));
          return {
            id: point.id,
            point_id: point.id,
            point_code: point.point_code,
            point_name: point.point_name,
            latitude: checkin?.latitude ?? point.latitude,
            longitude: checkin?.longitude ?? point.longitude,
            checkin_time: checkin?.checkin_time ?? null,
            status: checkin ? "completed" : "pending",
            distance: checkin?.distance,
            checkinObservation: checkin
              ? observationsByCoordinate.get(coordinateKey(checkin.latitude, checkin.longitude)) || null
              : null,
          };
        }));
      })
      .catch(() => {
        if (active) setError("签到记录加载失败，请稍后重试");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [routeId, studentId]);

  function openCheckinDetail(record) {
    if (record.status !== "completed") return;
    setSelectedCheckin(record);
  }

  function handleViewAIAnalysis(observation) {
    const observationId = observation?.observation_id ?? observation?.id;
    if (!observationId || observation?.analysis_status !== "completed") return;
    navigate(
      `/analysis/result?observation_id=${observationId}&route_id=${routeId}`,
      {
        state: {
          observationId,
          photoUrl: observation.photo_url,
          routeId,
          studentId,
          saveReturnTo: `/checkin-records?student_id=${studentId}&route_id=${routeId}`,
        },
      },
    );
  }

  const filteredRecords = useMemo(() => records.filter((record) => {
    const completed = record.status === "completed";
    const matchesTab = activeTab === "all" || (activeTab === "completed" ? completed : !completed);
    const matchesDate = !selectedDate || parseCheckinTime(record.checkin_time).dateKey === selectedDate;
    return matchesTab && matchesDate;
  }), [activeTab, records, selectedDate]);

  return (
    <MobilePageShell className="checkin-records-page">
      <div
        className="checkin-records-page__background"
        style={{ backgroundImage: `url(${observationBackground})` }}
        aria-hidden="true"
      />
      <div className="checkin-records-page__scroll">
        <header className="checkin-records-header">
          <button type="button" onClick={() => navigate(-1)} aria-label="返回">
            <img src={backIcon} alt="" />
          </button>
          <h1>签到记录</h1>
          <CheckinCalendar
            icon={calendarIcon}
            records={records}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </header>

        <nav className="checkin-records-tabs" aria-label="签到记录筛选" style={{ "--tab-underline": `url(${selectedUnderline})` }}>
          {[["all", "全部"], ["completed", "已完成"], ["ongoing", "未完成"]].map(([value, label]) => (
            <button key={value} type="button" className={activeTab === value ? "is-active" : ""} onClick={() => setActiveTab(value)}>
              {label}
            </button>
          ))}
        </nav>

        {selectedDate && (
          <div className="checkin-records-date-filter" role="status">
            <span>筛选日期：{selectedDate}</span>
            <button type="button" onClick={() => setSelectedDate("")} aria-label="清除日期筛选">清除</button>
          </div>
        )}

        <section className="checkin-records-list" aria-live="polite">
          {loading && <p className="checkin-records-message">正在加载签到记录...</p>}
          {!loading && error && <p className="checkin-records-message checkin-records-message--error">{error}</p>}
          {!loading && !error && filteredRecords.length === 0 && (
            <div className="checkin-records-empty">
              <img src={emptyMarker} alt="" />
              <p>{selectedDate ? "这一天还没有签到记录" : "暂时还没有签到记录"}</p>
            </div>
          )}
          {!loading && !error && filteredRecords.map((record) => {
            const completed = record.status === "completed";
            const checkinTime = parseCheckinTime(record.checkin_time);
            const pointLabel = record.point_code || record.code || (record.point_id != null ? `P${record.point_id}` : "观察点");
            return (
              <article
                className={`checkin-record-row${completed ? " is-clickable" : " is-ongoing"}`}
                key={record.id ?? `${record.point_id}-${record.checkin_time}`}
                role={completed ? "button" : undefined}
                tabIndex={completed ? 0 : undefined}
                onClick={() => openCheckinDetail(record)}
                onKeyDown={(event) => {
                  if (completed && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    openCheckinDetail(record);
                  }
                }}
              >
                <div className="checkin-record-row__marker" aria-hidden="true">
                  <img className="checkin-record-row__rock" src={observationPointIcon} alt="" />
                  <img className="checkin-record-row__badge" src={completed ? completedBadge : currentBadge} alt="" />
                </div>
                <div className="checkin-record-row__content">
                  <h2>{record.point_name || "未命名观察点"} ({pointLabel})</h2>
                  {record.checkin_time ? (
                    <time dateTime={record.checkin_time}>{checkinTime.date} {checkinTime.time}</time>
                  ) : (
                    <span className="checkin-record-row__pending">尚未签到</span>
                  )}
                </div>
                {record.distance != null && (
                  <div className="checkin-record-row__distance">距离：{formatDistance(record.distance)}</div>
                )}
              </article>
            );
          })}
        </section>
      </div>

      <img className="checkin-records-terrain" src={bottomTerrain} alt="" aria-hidden="true" />
      {selectedCheckin && (
        <CheckinObservationCard
          observation={selectedCheckin.checkinObservation}
          checkinTime={selectedCheckin.checkin_time}
          onClose={() => setSelectedCheckin(null)}
          onViewAIAnalysis={handleViewAIAnalysis}
        />
      )}
      <BottomNav activeId="record" />
    </MobilePageShell>
  );
}
