import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Background } from "../components/Background";
import { BottomNav } from "../components/BottomNav";
import { MobilePageShell } from "../components/layout/MobilePageShell";
import { PaperCard } from "../components/PaperCard";
import { VineProgress } from "../components/VineProgress";
import { WoodenButton } from "../components/WoodenButton";
import {
  cardLarge,
  cardWithMap,
  frogDefault1,
  frogHead,
  headerSignBg,
  iconClover,
  iconClipboard,
  iconMail,
} from "../assets";
import { getStudent } from "../api/student";
import { getStudentRouteSummary } from "../api/dashboard";
import { getCurrentCourse } from "../api/course";
import { getCurrentCourseRoutes } from "../api/route";
import { getNotificationUnreadCount } from "../api/notification";
import { clearCurrentRouteId, getCurrentRouteId, setCurrentRouteId as storeCurrentRouteId } from "../utils/currentRoute";
import { useStudentAuth } from "../context/StudentAuthContext";

const initialHomeData = {
  user: { name: "同学", major: "", grade: "" },
  course: null,
  route: { id: null, name: "请选择实习路线", start_date: "--" },
  progress: { label: "路线进度", current: 0, total: 0, status: "success" },
  stats: [
    { label: "已签到", value: 0, unit: "个点", icon: "clover" },
    { label: "观察记录", value: 0, unit: "条", icon: "notebook" },
  ],
  recent: null,
};

export function HomePage() {
  const navigate = useNavigate();
  const { student } = useStudentAuth();
  const [data, setData] = useState(initialHomeData);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadUnreadCount() {
      if (!student?.id) return;
      try {
        const result = await getNotificationUnreadCount(student.id);
        if (active) setUnreadCount(Math.max(0, Number(result?.unread_count) || 0));
      } catch {
        if (active) setUnreadCount(0);
      }
    }

    loadUnreadCount();
    window.addEventListener("focus", loadUnreadCount);
    return () => {
      active = false;
      window.removeEventListener("focus", loadUnreadCount);
    };
  }, [student?.id]);

  useEffect(() => {
    let active = true;

    async function loadHome() {
      try {
        const [studentResponse, courseResponse, routesResponse] = await Promise.all([
          getStudent(student.id),
          getCurrentCourse(student.id),
          getCurrentCourseRoutes(student.id),
        ]);
        if (!active) return;

        const currentCourse = courseResponse.data || null;
        const routes = Array.isArray(routesResponse.data) ? routesResponse.data : [];
        const storedRouteId = getCurrentRouteId();
        const selectedRoute = routes.find((route) => route.id === storedRouteId) || routes[0] || null;

        if (selectedRoute) storeCurrentRouteId(selectedRoute.id);
        else clearCurrentRouteId();

        let summary = null;
        if (selectedRoute) {
          try {
            const summaryResponse = await getStudentRouteSummary(student.id, selectedRoute.id);
            summary = summaryResponse.data;
          } catch {
            summary = null;
          }
        }
        if (!active) return;

        const studentDetails = studentResponse.data;
        const recentActivity = summary?.recent_activity;
        setData({
          ...initialHomeData,
          user: {
            name: studentDetails?.student_name || student.name || initialHomeData.user.name,
            major: studentDetails?.major || student.major || "",
            grade: studentDetails?.grade || student.grade || "",
          },
          course: currentCourse,
          route: selectedRoute ? {
            id: selectedRoute.id,
            name: selectedRoute.route_name,
            start_date: selectedRoute.start_date || "--",
          } : {
            id: null,
            name: currentCourse ? "该课程暂无已发布路线" : "暂未选择当前课程",
            start_date: "--",
          },
          progress: {
            ...initialHomeData.progress,
            current: Number(summary?.progress?.completed) || 0,
            total: Number(summary?.progress?.total) || 0,
          },
          stats: [
            { ...initialHomeData.stats[0], value: Number(summary?.stats?.checkins) || 0 },
            { ...initialHomeData.stats[1], value: Number(summary?.stats?.observations) || 0 },
          ],
          recent: recentActivity?.activity_time ? {
            label: "最近活动",
            time: new Date(recentActivity.activity_time).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            action: recentActivity.type === "analysis" ? "AI分析完成" : "签到成功",
            location: recentActivity.location,
            type: recentActivity.type,
            observation_id: recentActivity.observation_id,
          } : null,
        });
      } catch {
        if (!active) return;
        clearCurrentRouteId();
        setData({
          ...initialHomeData,
          user: {
            name: student.name || initialHomeData.user.name,
            major: student.major || "",
            grade: student.grade || "",
          },
          route: { id: null, name: "课程信息加载失败", start_date: "--" },
          stats: initialHomeData.stats.map((stat) => ({ ...stat })),
        });
      }
    }

    loadHome();
    return () => { active = false; };
  }, [student.id, student.grade, student.major, student.name]);

  return (
    <MobilePageShell className="app-container home-page">
      <Background />
      <div className="page-wash" aria-hidden="true" />

      <div className="home-content">
        <header className="home-header">
          <div className="home-header__sign">
            <img
              src={headerSignBg}
              className="home-header__sign-bg"
              alt=""
              aria-hidden="true"
              draggable="false"
            />
            <h1 className="home-header__title">野外实习助手</h1>
          </div>
          <button
            type="button"
            className="home-header__message-button"
            onClick={() => navigate("/notifications")}
            aria-label={unreadCount > 0 ? `查看消息，${unreadCount}条未读` : "查看消息"}
          >
            <img src={iconMail} alt="" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="home-header__message-badge" aria-hidden="true">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </header>

        <section className="profile-card profile-section home-section">
          <img
            src={cardLarge}
            className="profile-card__background"
            alt=""
            aria-hidden="true"
          />
          <div className="profile-card__content">
            <h2>Hi, {data.user.name}</h2>
            <p>
              {data.user.major}
              {data.user.grade && ` · ${data.user.grade}`}
            </p>
          </div>
          <img
            src={frogDefault1}
            className="profile-card__frog"
            alt=""
            aria-hidden="true"
            draggable="false"
          />
        </section>

        <PaperCard
          background={cardWithMap}
          className="route-card home-section home-clickable-card"
          role="link"
          tabIndex={0}
          onClick={() => navigate(data.course ? "/routes" : "/my-courses")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              navigate(data.course ? "/routes" : "/my-courses");
            }
          }}
        >
          <div className="route-card__content">
            <span className="route-card__label">
              {data.course ? `当前课程 · ${data.course.name}` : "当前课程"}
            </span>
            <h2>{data.route.name}</h2>
            <p>开始时间：{data.route.start_date}</p>
          </div>
        </PaperCard>

        <PaperCard className="progress-card home-section">
          <div className="progress-card__content">
            <h3 className="progress-card__title">{data.progress.label}</h3>
            <p className="progress-card__subtitle">已完成观察点</p>
            <VineProgress
              current={data.progress.current}
              total={data.progress.total}
              status={data.progress.status}
            />
          </div>
        </PaperCard>

        <div className="stats-grid home-section">
          <PaperCard
            className="stat-card signin-card home-clickable-card"
            role="link"
            tabIndex={0}
            onClick={() => navigate(data.route.id
              ? `/checkin-records?student_id=${student.id}&route_id=${data.route.id}`
              : "/routes")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                navigate(data.route.id
                  ? `/checkin-records?student_id=${student.id}&route_id=${data.route.id}`
                  : "/routes");
              }
            }}
          >
            <div className="stat-card__content">
              <div className="stat-card__text">
                <span className="stat-card__label">{data.stats[0].label}</span>
                <div className="stat-card__value-row">
                  <strong>{data.stats[0].value}</strong>
                  <span>{data.stats[0].unit}</span>
                </div>
              </div>
              <img
                src={iconClover}
                className="signin-card__icon"
                alt=""
                aria-hidden="true"
              />
            </div>
          </PaperCard>
          <PaperCard
            className="stat-card records-card home-clickable-card"
            role="link"
            tabIndex={0}
            onClick={() => navigate(data.route.id
              ? `/observe?student_id=${student.id}&route_id=${data.route.id}`
              : "/routes")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                navigate(data.route.id
                  ? `/observe?student_id=${student.id}&route_id=${data.route.id}`
                  : "/routes");
              }
            }}
          >
            <div className="stat-card__content">
              <div className="stat-card__text">
                <span className="stat-card__label">{data.stats[1].label}</span>
                <div className="stat-card__value-row">
                  <strong>{data.stats[1].value}</strong>
                  <span>{data.stats[1].unit}</span>
                </div>
              </div>
              <img
                src={iconClipboard}
                className="records-card__icon"
                alt=""
                aria-hidden="true"
              />
            </div>
          </PaperCard>
        </div>

        <PaperCard
          className="recent-card home-section home-clickable-card"
          role="link"
          tabIndex={0}
          onClick={() => {
            if (data.recent?.type === "analysis") {
              navigate(
                `/analysis/result?observation_id=${data.recent.observation_id}&route_id=${data.route.id}`,
                { state: { studentId: student.id } },
              );
            } else if (data.recent?.type === "checkin") {
              navigate(`/checkin-records?student_id=${student.id}&route_id=${data.route.id}`);
            }
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            if (data.recent?.type === "analysis") {
              navigate(
                `/analysis/result?observation_id=${data.recent.observation_id}&route_id=${data.route.id}`,
                { state: { studentId: student.id } },
              );
            } else if (data.recent?.type === "checkin") {
              navigate(`/checkin-records?student_id=${student.id}&route_id=${data.route.id}`);
            }
          }}
        >
          {data.recent ? (
            <div className="recent-card__content">
              <div className="recent-card__heading">
                <h3>{data.recent.label}</h3>
                <time>{data.recent.time}</time>
              </div>
              <p>
                <strong>{data.recent.action}</strong>
                <span>{data.recent.location}</span>
              </p>
            </div>
          ) : (
            <p className="recent-card__empty">暂无最近活动</p>
          )}
          <img
            src={frogHead}
            className="activity-card__frog"
            alt=""
            aria-hidden="true"
          />
        </PaperCard>

        <WoodenButton
          onClick={() => navigate("/routes")}
        />
      </div>

      <BottomNav />
    </MobilePageShell>
  );
}
