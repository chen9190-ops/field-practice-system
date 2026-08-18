import React from "react";
import { mapIconLocate, squareParchmentButtonBg } from "../../assets/map-page";

export function LocateButton({ isLocating, accuracyText, onLocate }) {
  return (
    <button
      type="button"
      className="map-square-button locate-button"
      style={{ "--map-square-bg": `url(${squareParchmentButtonBg})` }}
      onClick={onLocate}
      aria-label={isLocating ? "正在定位" : "重新定位"}
      disabled={isLocating}
    >
      <img src={mapIconLocate} alt="" aria-hidden="true" />
      <span>{isLocating ? "定位中" : accuracyText || "定位"}</span>
    </button>
  );
}
