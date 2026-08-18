import React, { useEffect, useMemo, useState } from "react";

function getProgressValues(progress, key) {
  const item = progress?.[key];
  return {
    completed: Math.max(0, Number(item?.completed) || 0),
    required: Math.max(0, Number(item?.required ?? item?.total) || 0),
  };
}

function getPercentage(progress) {
  const { completed, required } = getProgressValues(progress, "fixed");
  if (required <= 0) return 0;
  return Math.min(100, (completed / required) * 100);
}

export function CheckinProgressBanner({ progress, previousProgress, onClose }) {
  const [percentage, setPercentage] = useState(() => getPercentage(previousProgress));
  const fixed = useMemo(() => getProgressValues(progress, "fixed"), [progress]);
  const free = useMemo(() => getProgressValues(progress, "free"), [progress]);
  const overall = useMemo(() => getProgressValues(progress, "overall"), [progress]);
  const remainingFixed = Math.max(0, fixed.required - fixed.completed);
  const remainingFree = Math.max(0, free.required - free.completed);
  const fixedComplete = fixed.required > 0 && remainingFixed === 0;
  const overallComplete = overall.required > 0 && overall.completed >= overall.required;

  useEffect(() => {
    setPercentage(getPercentage(previousProgress));
    let secondFrame;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setPercentage(getPercentage(progress)));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
  }, [previousProgress, progress]);

  const title = overallComplete
    ? "恭喜你已完成本路线全部任务"
    : fixedComplete
      ? "恭喜你完成全部固定观察点打卡"
      : "恭喜你完成打卡";

  return (
    <section className="checkin-progress-banner" role="status" aria-live="polite">
      <button
        type="button"
        className="checkin-progress-banner__close"
        onClick={onClose}
        aria-label="关闭打卡进度"
      >
        ×
      </button>
      <div className="checkin-progress-banner__copy">
        <span>固定打卡进度</span>
        <strong>{title}</strong>
        {!fixedComplete && <p>还剩 {remainingFixed} 个点位</p>}
      </div>
      <div className="checkin-progress-banner__progress-row">
        <div
          className="checkin-progress-banner__track"
          role="progressbar"
          aria-label="固定观察点完成进度"
          aria-valuemin="0"
          aria-valuemax={fixed.required}
          aria-valuenow={Math.min(fixed.completed, fixed.required)}
        >
          <i style={{ width: `${percentage}%` }} />
        </div>
        <b>{Math.round(percentage)}%</b>
      </div>
      <div className="checkin-progress-banner__details">
        <span>已完成 {fixed.completed} / {fixed.required} 个固定观察点</span>
        {remainingFree > 0 && <small>自由观察还需完成 {remainingFree} 次</small>}
      </div>
    </section>
  );
}
