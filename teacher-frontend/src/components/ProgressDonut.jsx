export default function ProgressDonut({ value, label, segments, colors }) {
  let start = 0
  const safeSegments = Array.isArray(segments) ? segments.map((segment) => Number(segment) || 0) : []
  const hasData = safeSegments.some((segment) => segment > 0)
  const gradient = (hasData ? safeSegments : [100]).map((segment, index) => {
    const end = Math.min(100, start + segment)
    const stop = `${hasData ? colors[index] : '#e3e5df'} ${start}% ${end}%`
    start = end
    return stop
  }).join(', ')
  return (
    <div className="donut" style={{ '--donut-gradient': `conic-gradient(${gradient})` }}>
      <div><strong>{value}</strong><span>{label}</span></div>
    </div>
  )
}
