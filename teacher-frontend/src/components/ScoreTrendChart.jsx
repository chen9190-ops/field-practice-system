export default function ScoreTrendChart({ values }) {
  const data = (Array.isArray(values) ? values : []).map((item, index) => ({
    date: typeof item === 'object' ? item.date : String(index + 1),
    score: Number(typeof item === 'object' ? item.average_score : item),
  })).filter((item) => Number.isFinite(item.score))
  const pointX = (index) => data.length === 1 ? 50 : 6 + index * (88 / (data.length - 1))
  const pointY = (score) => 52 - Math.max(0, Math.min(100, score)) * .44
  const points = data.map((item, index) => `${pointX(index)},${pointY(item.score)}`).join(' ')
  const formatLabel = (date) => String(date || '').slice(5) || '—'
  return (
    <div className="trend-chart">
      <div className="chart-heading"><strong>学生平均分趋势</strong><span>平均分</span></div>
      {!data.length ? <div className="chart-empty">暂无评分趋势数据</div> : <><svg viewBox="0 0 100 55" preserveAspectRatio="none" role="img" aria-label="学生平均分趋势折线图">
        <path className="grid-line" d="M4 10H98M4 28H98M4 46H98" />
        <polyline points={points} />
        {data.map((item, index) => <circle key={`${item.date}-${index}`} cx={pointX(index)} cy={pointY(item.score)} r="1.8" />)}
      </svg>
      <div className="chart-labels">{data.map((item, index) => <span key={`${item.date}-${index}`}>{formatLabel(item.date)}</span>)}</div></>}
    </div>
  )
}
