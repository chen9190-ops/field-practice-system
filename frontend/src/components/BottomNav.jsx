import React from "react";
import { useNavigate } from "react-router-dom";
import {
  cardLarge,
  navHome,
  navMap,
  navObserve,
  navProfile,
  navRecord,
  navReport,
} from "../assets";
import { getCurrentRouteId } from "../utils/currentRoute";
import { useStudentAuth } from "../context/StudentAuthContext";

const items = [
  ["home", "首页", navHome],
  ["map", "地图", navMap],
  ["observe", "观察", navObserve],
  ["record", "记录", navRecord],
  ["report", "报告", navReport],
  ["profile", "我的", navProfile],
];

export function BottomNav({ activeId = "home" }) {
  const navigate = useNavigate();
  const { student } = useStudentAuth();
  const currentRouteId = getCurrentRouteId();
  const routeQuery = currentRouteId && student?.id
    ? `?student_id=${student.id}&route_id=${currentRouteId}`
    : "";
  const routes = {
    home: "/",
    map: "/routes",
    observe: currentRouteId ? `/observe${routeQuery}` : "/routes",
    record: currentRouteId ? `/checkin-records${routeQuery}` : "/routes",
    report: currentRouteId ? `/report${routeQuery}` : "/routes",
    profile: "/profile",
  };

  return (
    <nav
      className="bottom-nav home-bottom-nav"
      aria-label="主导航"
      style={{ borderImageSource: `url(${cardLarge})` }}
    >
      {items.map(([id, label, image]) => (
        <button
          type="button"
          key={id}
          className={[
            "nav-item",
            id === activeId ? "nav-item--active active" : "",
          ].filter(Boolean).join(" ")}
          aria-label={label}
          aria-current={id === activeId ? "page" : undefined}
          onClick={() => navigate(routes[id])}
        >
          <img src={image} alt="" draggable="false" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
