import React from "react";
import { mapHeaderBg, mapIconBack } from "../../assets/map-page";

export function MapHeader({ title, onBack }) {
  return (
    <header
      className="map-header"
      style={{ "--map-header-bg": `url(${mapHeaderBg})` }}
    >
      <button
        type="button"
        className="map-header__back"
        onClick={onBack}
        aria-label="返回首页"
      >
        <img src={mapIconBack} alt="" aria-hidden="true" />
      </button>
      <h1>{title}</h1>
    </header>
  );
}
