import React from "react";

const GEOLOGY_OPTIONS = [
  ["lithology", "岩性分布"],
  ["stratigraphy", "地层年代"],
  ["fault", "断层构造"],
];

const BASE_MAP_OPTIONS = [
  { value: "standard",  label: "标准地图" },
  { value: "satellite",  label: "卫星影像" },
];

export function GeologyLayerControl({
  baseMapMode,
  baseMapDisabled,
  terrainVisible,
  terrainOpacity,
  geologyVisibility,
  onBaseMapModeChange,
  onTerrainToggle,
  onTerrainOpacityChange,
  onGeologyToggle,
}) {
  return (
    <div className="student-map-layer-control">
      <section className="student-map-base-control" aria-labelledby="student-map-base-title">
        <span id="student-map-base-title" className="student-map-layer-control__title">底图</span>
        <div className="student-map-base-control__options" role="radiogroup" aria-label="选择地图底图">
          {BASE_MAP_OPTIONS.map(({ value, icon, label }) => {
            const isActive = baseMapMode === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={isActive}
                disabled={baseMapDisabled}
                className={`student-map-base-option ${isActive ? "is-active" : ""}`}
                onClick={() => onBaseMapModeChange(value)}
              >
                <span className="student-map-base-option__icon" aria-hidden="true">{icon}</span>
                <span className="student-map-base-option__label">{label}</span>
                <span className="student-map-base-option__status" aria-hidden="true">
                  {isActive ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="student-map-geology-control" aria-labelledby="student-map-geology-title">
        <span id="student-map-geology-title" className="student-map-layer-control__title">专业地质</span>
        <button
          type="button"
          role="checkbox"
          aria-checked={terrainVisible}
          className={terrainVisible ? "is-active" : ""}
          onClick={onTerrainToggle}
        >
          {terrainVisible ? "☑" : "☐"} 等高线
        </button>
        <label className="student-map-geology-control__opacity">
          <span>等高线透明度 {Math.round(terrainOpacity * 100)}%</span>
          <input
            type="range"
            min="0.2"
            max="0.8"
            step="0.05"
            value={terrainOpacity}
            onChange={(event) => onTerrainOpacityChange(Number(event.target.value))}
            aria-label="等高线透明度"
          />
        </label>
        {GEOLOGY_OPTIONS.map(([layerKey, label]) => {
          const isActive = Boolean(geologyVisibility[layerKey]);
          return (
            <button
              key={layerKey}
              type="button"
              role="checkbox"
              aria-checked={isActive}
              className={isActive ? "is-active" : ""}
              onClick={() => onGeologyToggle(layerKey)}
            >
              {isActive ? "☑" : "☐"} {label}
            </button>
          );
        })}
      </section>
    </div>
  );
}
