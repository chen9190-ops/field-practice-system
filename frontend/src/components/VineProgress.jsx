import React from "react";
import { progressVine } from "../assets";

export function VineProgress({ current, total, status = "success" }) {
  const completed = status === "success" ? Math.max(Number(current) || 0, 0) : 0;
  const safeTotal = status === "success" ? Math.max(Number(total) || 0, 0) : 0;
  const percentage = safeTotal > 0
    ? Math.min(100, Math.max(0, (completed / safeTotal) * 100))
    : 0;
  const endpoint = Math.min(97, Math.max(3, percentage));
  const vineWidth = percentage > 0 ? 10000 / percentage : 100;
  const countLabel = status === "loading"
    ? "--/--"
    : status === "error"
      ? "加载失败"
      : `${current}/${total}`;

  return (
    <div className="vine-progress" aria-label={`今日进度 ${countLabel}`}>
      <div className="vine-progress__track">
        <img
          src={progressVine}
          className="vine-progress__ghost"
          alt=""
          aria-hidden="true"
        />

        <div
          className="vine-progress__fill"
          style={{
            width: `${percentage}%`,
            "--vine-width": `${vineWidth}%`,
          }}
        >
          <img
            src={progressVine}
            className="vine-progress__vine"
            alt=""
            aria-hidden="true"
          />
        </div>

        {percentage > 0 && percentage < 100 && (
          <span
            className="vine-progress__endpoint"
            style={{ left: `${endpoint}%` }}
            aria-hidden="true"
          >
            <img src={progressVine} alt="" />
          </span>
        )}
      </div>
      <span className="vine-progress__count">{countLabel}</span>
    </div>
  );
}
