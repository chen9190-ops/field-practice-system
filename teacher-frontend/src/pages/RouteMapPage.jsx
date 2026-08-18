import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getRouteMap, getRouteMediaUrl } from '../api/route.js'
import RouteMap from '../components/map/RouteMap.jsx'

export default function RouteMapPage() {
  const { routeId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const studentId = searchParams.get('studentId') || ''
  const [studentInput, setStudentInput] = useState(studentId)
  const [data, setData] = useState(null)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setSelected(null)
    getRouteMap(routeId, studentId)
      .then((result) => {
        if (!active) return
        if (!result?.route) throw new Error(result?.message || 'Route not found')
        setData(result)
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.response?.data?.detail || requestError.message || '路线地图加载失败')
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [routeId, studentId])

  const routePath = useMemo(() => (
    [...(data?.route_points || [])].sort((a, b) => a.order_index - b.order_index)
  ), [data?.route_points])
  const center = routePath[0]
    ? [Number(routePath[0].longitude), Number(routePath[0].latitude)]
    : data?.points?.[0]
      ? [Number(data.points[0].longitude), Number(data.points[0].latitude)]
      : undefined

  function handleStudentFilter(event) {
    event.preventDefault()
    const next = studentInput.trim()
    setSearchParams(next ? { studentId: next } : {})
  }

  return (
    <div className="inner-page route-map-page">
      <div className="page-title-row">
        <div><p>路线地图</p><h1>{data?.route?.name || '教师路线地图'}</h1><span>{data?.route?.description || '查看路线、观察点与学生观察记录'}</span></div>
        <Link className="secondary-button" to={`/routes/${routeId}`}>返回路线详情</Link>
      </div>

      <form className="map-filter-bar" onSubmit={handleStudentFilter}>
        <div><strong>学生观察记录</strong><span>后端仅在指定学生 ID 时返回该学生的观察记录</span></div>
        <label><span>学生 ID</span><input type="number" min="1" value={studentInput} onChange={(event) => setStudentInput(event.target.value)} placeholder="可选" /></label>
        <button className="primary-button" type="submit">加载记录</button>
      </form>

      {loading && <div className="content-status">正在加载路线地图…</div>}
      {error && <div className="content-status error-message" role="alert">{error}</div>}
      {!loading && data && (
        <div className="route-map-layout">
          <section className="route-map-panel">
            <div className="map-legend"><span><i className="legend-route" />实习路线</span><span><i className="legend-point" />观察点</span><span><i className="legend-observation" />学生观察记录</span></div>
            <RouteMap
              center={center}
              routePath={routePath}
              points={data.points || []}
              studentObservations={data.student_observations || []}
              onPointClick={(item) => setSelected({ type: 'point', item })}
              onObservationClick={(item) => setSelected({ type: 'observation', item })}
            />
          </section>
          <aside className="map-detail-panel">
            {!selected && <div className="map-detail-empty"><strong>地图详情</strong><p>点击绿色观察点或橙色学生记录 Marker 查看详细信息。</p></div>}
            {selected?.type === 'point' && <div className="map-detail-content"><small>教学观察点</small><h2>{selected.item.name || '未命名观察点'}</h2><dl><div><dt>任务</dt><dd>{selected.item.task || '暂无任务'}</dd></div><div><dt>描述</dt><dd>{selected.item.description || '暂无描述'}</dd></div><div><dt>坐标</dt><dd>{selected.item.longitude}, {selected.item.latitude}</dd></div></dl></div>}
            {selected?.type === 'observation' && <div className="map-detail-content"><small>学生观察记录</small><h2>观察记录 #{selected.item.id}</h2><p className="observation-text">{selected.item.observation_text || '暂无观察文字'}</p>{selected.item.photo_url ? <img className="observation-photo" src={getRouteMediaUrl(selected.item.photo_url)} alt="学生观察记录" /> : <div className="photo-empty">暂无图片</div>}<dl><div><dt>坐标</dt><dd>{selected.item.longitude}, {selected.item.latitude}</dd></div>{selected.item.created_at && <div><dt>记录时间</dt><dd>{new Date(selected.item.created_at).toLocaleString('zh-CN')}</dd></div>}</dl></div>}
          </aside>
        </div>
      )}
    </div>
  )
}
