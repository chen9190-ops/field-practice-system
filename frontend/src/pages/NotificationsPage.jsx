import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getNotificationUnreadCount,
  getStudentNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notification";
import { iconMail } from "../assets";
import { backIcon } from "../assets/observation";
import { Background } from "../components/Background";
import { MobilePageShell } from "../components/layout/MobilePageShell";
import { useStudentAuth } from "../context/StudentAuthContext";
import { setCurrentRouteId } from "../utils/currentRoute";
import { getStudentReports } from "../api/report";
import "./NotificationsPage.css";

const PAGE_SIZE = 20;
const typeLabels = {
  route: "路线通知",
  evaluation: "报告评价",
  system: "系统通知",
};

function formatNotificationTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const difference = now.getTime() - date.getTime();
  const minute = 60 * 1000;
  const pad = (number) => String(number).padStart(2, "0");
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  if (difference >= 0 && difference < minute) return "刚刚";
  if (difference >= 0 && difference < 60 * minute) return `${Math.floor(difference / minute)}分钟前`;
  if (dateStart === todayStart) return time;
  if (dateStart === todayStart - 24 * 60 * minute) return `昨天 ${time}`;
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${time}`;
}

function appendUnique(current, incoming) {
  const existingIds = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !existingIds.has(item.id))];
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const { student } = useStudentAuth();
  const studentId = student?.id;
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const loadPage = useCallback(async (page, append = false) => {
    if (!studentId) return;
    if (append) setLoadingMore(true); else setLoading(true);
    setError("");

    try {
      const result = await getStudentNotifications(studentId, {
        page,
        page_size: PAGE_SIZE,
      });
      const nextItems = Array.isArray(result?.items) ? result.items : [];
      setItems((current) => append ? appendUnique(current, nextItems) : nextItems);
      setPagination(result?.pagination || { page, total_pages: page });
    } catch {
      if (!append) setItems([]);
      setError(append ? "更多消息加载失败，请稍后重试" : "消息加载失败，请稍后重试");
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;
    loadPage(1);
    getNotificationUnreadCount(studentId)
      .then((result) => setUnreadCount(Math.max(0, Number(result?.unread_count) || 0)))
      .catch(() => setUnreadCount(0));
  }, [loadPage, studentId]);

  const openNotification = async (notification) => {
    if (!notification.is_read) {
      try {
        await markNotificationRead(studentId, notification.id);
        setItems((current) => current.map((item) => (
          item.id === notification.id ? { ...item, is_read: true } : item
        )));
        setUnreadCount((current) => Math.max(0, current - 1));
      } catch {
        // Reading a business notification must still take the student to its destination.
      }
    }

    const routeId = Number(notification.route_id);
    if (notification.type === "route" && Number.isInteger(routeId) && routeId > 0) {
      setCurrentRouteId(routeId);
      navigate(`/routes/${routeId}/map`);
    } else if (notification.type === "evaluation") {
      if (Number.isInteger(routeId) && routeId > 0) setCurrentRouteId(routeId);
      const notificationReportId = Number(notification.report_id);
      if (Number.isInteger(notificationReportId) && notificationReportId > 0) {
        navigate(`/report/detail?id=${notificationReportId}`);
        return;
      }

      if (Number.isInteger(routeId) && routeId > 0) {
        try {
          const response = await getStudentReports(studentId);
          const reports = Array.isArray(response.data) ? response.data : [];
          const latestReport = reports
            .filter((report) => (
              Number(report.route_id) === routeId
              && report.status === "completed"
            ))
            .sort((left, right) => {
              const timeDifference = new Date(right.create_time || 0).getTime()
                - new Date(left.create_time || 0).getTime();
              return timeDifference || Number(right.id || 0) - Number(left.id || 0);
            })[0];
          if (latestReport?.id != null) {
            navigate(`/report/detail?id=${latestReport.id}`);
            return;
          }
        } catch {
          // Fall through to the report overview when the report list is unavailable.
        }
      }

      navigate(Number.isInteger(routeId) && routeId > 0
        ? `/report?student_id=${studentId}&route_id=${routeId}`
        : "/report");
    }
  };

  const markAllRead = async () => {
    if (!studentId || unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    setActionError("");
    try {
      await markAllNotificationsRead(studentId);
      setItems((current) => current.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch {
      setActionError("全部已读操作失败，请稍后重试");
    } finally {
      setMarkingAll(false);
    }
  };

  const hasMore = Number(pagination.page) < Number(pagination.total_pages);

  return (
    <MobilePageShell className="notifications-page">
      <Background />
      <div className="notifications-page__wash" aria-hidden="true" />
      <div className="notifications-page__content">
        <header className="notifications-header">
          <button type="button" className="notifications-header__back" onClick={() => navigate(-1)} aria-label="返回">
            <img src={backIcon} alt="" aria-hidden="true" />
          </button>
          <h1>消息</h1>
          <button
            type="button"
            className="notifications-header__read-all"
            disabled={unreadCount === 0 || markingAll}
            onClick={markAllRead}
          >
            {markingAll ? "处理中…" : "全部已读"}
          </button>
        </header>

        {actionError && <p className="notifications-action-error" role="alert">{actionError}</p>}

        <section className="notifications-list" aria-live="polite">
          {loading && <p className="notifications-state">消息加载中…</p>}

          {!loading && error && items.length === 0 && (
            <div className="notifications-state is-error">
              <p>{error}</p>
              <button type="button" onClick={() => loadPage(1)}>重试</button>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="notifications-empty">
              <img src={iconMail} alt="" aria-hidden="true" />
              <h2>暂无消息</h2>
              <p>新的路线和报告评价会显示在这里</p>
            </div>
          )}

          {items.map((notification) => (
            <article
              key={notification.id}
              className={`notification-card${notification.is_read ? " is-read" : " is-unread"}`}
              onClick={() => openNotification(notification)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") openNotification(notification);
              }}
              role="button"
              tabIndex={0}
            >
              <div className="notification-card__heading">
                {!notification.is_read && <i aria-label="未读" />}
                <h2>{notification.title || "消息通知"}</h2>
              </div>
              <p className="notification-card__content">{notification.content || "暂无消息内容"}</p>
              <footer>
                <span>{typeLabels[notification.type] || "消息通知"}</span>
                <time dateTime={notification.created_at || undefined}>{formatNotificationTime(notification.created_at)}</time>
              </footer>
            </article>
          ))}

          {!loading && items.length > 0 && error && (
            <p className="notifications-more-error" role="alert">{error}</p>
          )}

          {!loading && hasMore && (
            <button
              type="button"
              className="notifications-load-more"
              disabled={loadingMore}
              onClick={() => loadPage(Number(pagination.page) + 1, true)}
            >
              {loadingMore ? "正在加载…" : "加载更多"}
            </button>
          )}
        </section>
      </div>
    </MobilePageShell>
  );
}
