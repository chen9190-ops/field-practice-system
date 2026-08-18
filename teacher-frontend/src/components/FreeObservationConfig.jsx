export default function FreeObservationConfig({
  enabled,
  count,
  onEnabledChange,
  onCountChange,
  readOnly = false,
}) {
  function toggleEnabled() {
    if (!readOnly) onEnabledChange?.(!enabled)
  }

  function changeCount(step) {
    if (!readOnly && enabled) onCountChange?.(Math.max(1, Number(count) + step))
  }

  return (
    <section className={`free-observation-config${readOnly ? ' is-read-only' : ''}`}>
      <div className="free-observation-heading">
        <div><small>观察任务设置</small><h2>自由观察任务</h2></div>
        <span className={`free-observation-status ${enabled ? 'is-enabled' : ''}`}>{enabled ? '已开启' : '未开启'}</span>
      </div>
      <div className="free-observation-row">
        <div><strong>是否允许自由观察</strong><p>学生可在固定观察点之外提交自主观察记录。</p></div>
        <button className="admin-switch" type="button" role="switch" aria-checked={enabled} aria-label="是否允许自由观察" disabled={readOnly} onClick={toggleEnabled}><span /></button>
      </div>
      <div className="free-observation-row">
        <div><strong>要求完成数量</strong><p>{enabled ? '自由观察记录达到该数量后计为完成。' : '开启自由观察后可设置，最少为 1 个。'}</p></div>
        <div className="number-stepper" aria-label="自由观察要求完成数量">
          <button type="button" aria-label="减少数量" disabled={readOnly || !enabled || count <= 1} onClick={() => changeCount(-1)}>−</button>
          <strong>{enabled ? count : 0}</strong>
          <button type="button" aria-label="增加数量" disabled={readOnly || !enabled} onClick={() => changeCount(1)}>＋</button>
        </div>
      </div>
    </section>
  )
}
