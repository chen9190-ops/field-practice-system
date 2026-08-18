import React from "react";
import { primaryButton } from "../assets";

export function WoodenButton({ children = "开始实习", onClick }) {
  return (
    <button
      className="wooden-button"
      type="button"
      onClick={onClick}
      aria-label={String(children)}
    >
      <img src={primaryButton} alt="" draggable="false" />
      <span className="button-copy">{children}</span>
    </button>
  );
}
