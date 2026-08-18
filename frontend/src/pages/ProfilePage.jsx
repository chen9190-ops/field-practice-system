import React from "react";
import { useNavigate } from "react-router-dom";
import {
  profileAboutIcon,
  profileAvatar,
  profileBackIcon,
  profileBottomDecoration,
  profileCardBackground,
  profileChevronIcon,
  profileFavoritesIcon,
  profileHelpIcon,
  profileMenuPanelBackground,
  profileOfflineMapIcon,
  profilePageBackground,
  profileRoutesIcon,
  profileSettingsIcon,
} from "../assets/profile-ui";
import { BottomNav } from "../components/BottomNav";
import { MobilePageShell } from "../components/layout/MobilePageShell";
import { useStudentAuth } from "../context/StudentAuthContext";
import "./ProfilePage.css";

const menuItems = [
  { id: "routes", label: "我的路线", icon: profileRoutesIcon, route: "/routes" },
  { id: "favorites", label: "我的收藏", icon: profileFavoritesIcon, route: "/favorites" },
  { id: "offline-map", label: "离线地图", icon: profileOfflineMapIcon, route: "/map" },
  { id: "courses", label: "我的课程", icon: profileHelpIcon, route: "/my-courses" },
  { id: "about", label: "关于我们", icon: profileAboutIcon },
];

export function ProfilePage() {
  const navigate = useNavigate();
  const { student, logout } = useStudentAuth();
  const studentName = student.name || student.student_name;
  const studentDetails = [
    student.student_number && `学号：${student.student_number}`,
    student.college && `学院：${student.college}`,
  ].filter(Boolean);

  const handleBack = () => {
    if ((window.history.state?.idx || 0) > 0) {
      navigate(-1);
    } else {
      navigate("/", { replace: true });
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/student/login", { replace: true });
  };

  return (
    <MobilePageShell className="profile-page">
      <img
        className="profile-page__background"
        src={profilePageBackground}
        alt=""
        aria-hidden="true"
      />
      <div className="profile-page__content">
        <header className="profile-page__topbar">
          <button type="button" onClick={handleBack} aria-label="返回上一页">
            <img src={profileBackIcon} alt="" aria-hidden="true" />
          </button>
          <h1>我的</h1>
          <button
            type="button"
            aria-label="设置"
            className="profile-page__settings"
            onClick={() => navigate("/settings")}
          >
            <img src={profileSettingsIcon} alt="" aria-hidden="true" />
          </button>
        </header>

        <button
          type="button"
          className="profile-user-card"
          aria-label="个人资料（暂未开放）"
          aria-disabled="true"
        >
          <img
            className="profile-user-card__background"
            src={profileCardBackground}
            alt=""
            aria-hidden="true"
          />
          <img
            className="profile-user-card__avatar"
            src={profileAvatar}
            alt=""
            aria-hidden="true"
          />
          <span className="profile-user-card__copy">
            <strong title={studentName}>{studentName}</strong>
            <small title={studentDetails.join(" · ")}>
              {studentDetails.join(" · ")}
            </small>
          </span>
          <img
            className="profile-user-card__chevron"
            src={profileChevronIcon}
            alt=""
            aria-hidden="true"
          />
        </button>

        <section className="profile-menu" aria-label="个人功能">
          <img
            className="profile-menu__background"
            src={profileMenuPanelBackground}
            alt=""
            aria-hidden="true"
          />
          <div className="profile-menu__items">
            {menuItems.map((item) => {
              const isAvailable = Boolean(item.route);
              return (
                <button
                  type="button"
                  key={item.id}
                  className={!isAvailable ? "is-disabled" : ""}
                  aria-label={isAvailable ? item.label : `${item.label}（暂未开放）`}
                  aria-disabled={!isAvailable || undefined}
                  onClick={isAvailable ? () => navigate(item.route) : undefined}
                >
                  <img className="profile-menu__icon" src={item.icon} alt="" aria-hidden="true" />
                  <span>{item.label}</span>
                  <img
                    className="profile-menu__chevron"
                    src={profileChevronIcon}
                    alt=""
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </section>

        <button type="button" className="profile-logout" onClick={handleLogout}>
          退出登录
        </button>

      </div>

      <img
        className="profile-page__decoration"
        src={profileBottomDecoration}
        alt=""
        aria-hidden="true"
        draggable="false"
      />

      <BottomNav activeId="profile" />
    </MobilePageShell>
  );
}
