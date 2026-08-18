import React from "react";

function ProgressRow({ label, progress, emphasize = false }) {
  const completed = Number(progress?.completed) || 0;
  const total = Number(progress?.required ?? progress?.total) || 0;
  return (
    <div className={`task-progress-summary__row${emphasize ? " is-overall" : ""}`}>
      <span>{label}</span>
      <strong>{completed} / {total}</strong>
    </div>
  );
}

export function TaskProgressSummary({ progress }) {
  const hasStructuredProgress = Boolean(
    progress?.fixed && progress?.free && progress?.overall,
  );

  if (!hasStructuredProgress) {
    return (
      <div className="task-progress-summary is-legacy">
        <ProgressRow
          label="已完成观察点"
          progress={{ completed: progress?.completed, total: progress?.total }}
          emphasize
        />
      </div>
    );
  }

  const freeComplete = Boolean(progress.free.is_complete)
    && Number(progress.free.required ?? progress.free.total) > 0;

  return (
    <div className="task-progress-summary">
      <ProgressRow label="固定观察点" progress={progress.fixed} />
      <ProgressRow label="自由观察" progress={progress.free} />
      {freeComplete && <p className="task-progress-summary__complete">自由观察任务已完成。</p>}
      <ProgressRow label="总完成度" progress={progress.overall} emphasize />
    </div>
  );
}
