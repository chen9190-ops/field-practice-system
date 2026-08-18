import React, { useState } from "react";
import { mapIconLayers, squareParchmentButtonBg } from "../../assets/map-page";

export function LayerSwitcher({
  mode,
  onChange,
  routeVisible,
  onRouteVisibleChange,
  studentTrackVisible,
  onStudentTrackVisibleChange,
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="layer-switcher">
      {isOpen && (
        <div className="layer-switcher__menu" role="group" aria-label="地图图层">
          <button
            type="button"
            className={mode === "terrain" ? "is-active" : ""}
            onClick={() => {
              onChange("terrain");
              setIsOpen(false);
            }}
          >
            3D 地形图
          </button>
          <button
            type="button"
            className={mode === "satellite" ? "is-active" : ""}
            onClick={() => {
              onChange("satellite");
              setIsOpen(false);
            }}
          >
            卫星图 + 路网
          </button>
          <div className="layer-switcher__divider" aria-hidden="true" />
          <button
            type="button"
            className={routeVisible ? "is-active" : ""}
            aria-pressed={routeVisible}
            onClick={() => onRouteVisibleChange(!routeVisible)}
          >
            实习路线
          </button>
          <button
            type="button"
            className={studentTrackVisible ? "is-active" : ""}
            aria-pressed={studentTrackVisible}
            onClick={() => onStudentTrackVisibleChange(!studentTrackVisible)}
          >
            我的轨迹
          </button>
        </div>
      )}
      <button
        type="button"
        className="map-square-button layer-switcher__toggle"
        style={{ "--map-square-bg": `url(${squareParchmentButtonBg})` }}
        onClick={() => setIsOpen((open) => !open)}
        aria-label="切换地图图层"
        aria-expanded={isOpen}
      >
        <img src={mapIconLayers} alt="" aria-hidden="true" />
      </button>
    </div>
  );
}
