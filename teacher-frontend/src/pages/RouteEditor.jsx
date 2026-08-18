import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { addRoutePoint, getRouteDetail, getRouteMap, saveRoutePath, updateRoute } from '../api/route.js'
import FreeObservationConfig from '../components/FreeObservationConfig.jsx'
import RouteEditorMap from '../components/map/RouteEditorMap.jsx'
import PointMaterials from '../components/PointMaterials.jsx'

const emptyPointForm = { point_name: '', point_description: '', task: '' }

function formatDate(value) {
  return value ? String(value).slice(0, 10) : '待定'
}

export default function RouteEditor() {
  const { routeId } = useParams()
  const [route, setRoute] = useState(null)
  const [path, setPath] = useState([])
  const [points, setPoints] = useState([])
  const [freeObservationEnabled, setFreeObservationEnabled] = useState(false)
  const [requiredFreeObservationCount, setRequiredFreeObservationCount] = useState(0)
  const [pendingPoint, setPendingPoint] = useState(null)
  const [savedPointId, setSavedPointId] = useState(null)
  const [pointForm, setPointForm] = useState(emptyPointForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPoint, setSavingPoint] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([getRouteDetail(routeId), getRouteMap(routeId)])
      .then(([routeData, mapData]) => {
        if (!active) return
        if (!routeData?.id) throw new Error('ROUTE_NOT_FOUND')
        setRoute(routeData)
        setFreeObservationEnabled(Boolean(routeData.free_observation_enabled))
        setRequiredFreeObservationCount(
          routeData.free_observation_enabled
            ? Math.max(1, Number(routeData.required_free_observation_count) || 1)
            : 0,
        )
        setPath(mapData.route_points)
        setPoints(Array.isArray(mapData?.points) ? mapData.points : [])
      })
      .catch(() => active && setError('路线信息加载失败，请检查后端服务后重试。'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [routeId])

  async function handleSave() {
    setSaving(true)
    setError('')
    setMessage('')
    let routePathSaved = false
    try {
      await saveRoutePath(routeId, path)
      routePathSaved = true
      const updatedRoute = await updateRoute(routeId, {
        free_observation_enabled: freeObservationEnabled,
        required_free_observation_count: requiredFreeObservationCount,
      })
      setRoute((current) => ({ ...current, ...updatedRoute }))
      try {
        const latestMap = await getRouteMap(routeId)
        setPath(latestMap.route_points)
      } catch {
        // The save succeeded; retain the submitted path if the verification fetch fails.
      }
      setMessage('路线配置已更新')
    } catch (requestError) {
      const fallback = routePathSaved
        ? '路线轨迹已保存，但自由观察配置更新失败，请稍后重试。'
        : '路线轨迹保存失败，请稍后重试。'
      setError(requestError.response?.data?.detail || fallback)
    } finally {
      setSaving(false)
    }
  }

  function changeFreeObservationEnabled(enabled) {
    setFreeObservationEnabled(enabled)
    setRequiredFreeObservationCount((current) => (
      enabled ? Math.max(1, Number(current) || 1) : 0
    ))
  }

  function changeFreeObservationCount(count) {
    setRequiredFreeObservationCount(Math.max(1, Number(count) || 1))
  }

  function handlePointFormChange(event) {
    const { name, value } = event.target
    setPointForm((current) => ({ ...current, [name]: value }))
  }

  function selectPointLocation(coordinate) {
    setPendingPoint(coordinate)
    setSavedPointId(null)
    setPointForm(emptyPointForm)
    setError('')
    setMessage('')
  }

  function addLocatedRoutePoint(coordinate) {
    const longitude = Number(coordinate?.longitude)
    const latitude = Number(coordinate?.latitude)
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return

    setPath((current) => [
      ...current,
      { longitude, latitude, order_index: current.length },
    ])
    setError('')
    setMessage(`坐标点 ${latitude.toFixed(6)}, ${longitude.toFixed(6)} 已加入路线。`)
  }

  async function handlePointSave(event) {
    event.preventDefault()
    if (!pendingPoint) return
    setSavingPoint(true)
    setError('')
    setMessage('')
    const payload = {
      ...pointForm,
      latitude: pendingPoint.latitude,
      longitude: pendingPoint.longitude,
    }
    try {
      const result = await addRoutePoint(routeId, payload)
      setPoints((current) => [...current, { ...payload, id: result.point_id, name: payload.point_name, description: payload.point_description }])
      setSavedPointId(result.point_id || null)
      setMessage(`观察点“${payload.point_name}”添加成功。`)
    } catch (requestError) {
      setError(requestError.response?.data?.detail || '观察点保存失败，请稍后重试。')
    } finally {
      setSavingPoint(false)
    }
  }

  if (loading) return <div className="content-status">正在加载路线编辑器…</div>

  return (
    <div className="inner-page">
      <div className="page-title-row">
        <div><p>发布管理</p><h1>编辑路线地图</h1><span>绘制路线轨迹并生成 WGS84 坐标</span></div>
        <Link className="secondary-button" to={`/routes/${routeId}`}>返回路线详情</Link>
      </div>
      {error && <div className="content-status error-message" role="alert">{error}</div>}
      {message && <div className="content-status success-message" role="status">{message}</div>}
      <div className="route-editor-layout">
        <aside className="route-editor-info">
          <h2>{route?.route_name || '路线信息'}</h2>
          <dl>
            <div><dt>路线说明</dt><dd>{route?.route_description || '暂无说明'}</dd></div>
            <div><dt>所属课程</dt><dd>{route?.course_id ? `课程 ID ${route.course_id}` : '接口未返回'}</dd></div>
            <div><dt>开始日期</dt><dd>{formatDate(route?.start_date)}</dd></div>
            <div><dt>坐标系统</dt><dd>WGS84</dd></div>
          </dl>
          <div className="coordinate-count">当前轨迹共 {path.length} 个坐标点</div>
          <button className="primary-button" type="button" disabled={saving || path.length < 2} onClick={handleSave}>{saving ? '正在保存…' : '保存路线'}</button>
          <p className="route-editor-save-note">保存将更新路线轨迹与自由观察配置，不会删除或修改已有的。</p>
          <FreeObservationConfig
            enabled={freeObservationEnabled}
            count={requiredFreeObservationCount}
            onEnabledChange={changeFreeObservationEnabled}
            onCountChange={changeFreeObservationCount}
          />
          <section className="editor-point-section">
            <div className="editor-point-heading"><div><small>观察点管理</small><strong>{pendingPoint ? '填写观察点信息' : '点击地图选择位置'}</strong></div><span>{points.length} 个</span></div>
            {pendingPoint && (
              <form className="editor-point-form" onSubmit={handlePointSave}>
                <div className="editor-coordinate"><span>纬度 {pendingPoint.latitude.toFixed(6)}</span><span>经度 {pendingPoint.longitude.toFixed(6)}</span></div>
                <label><span>观察点名称</span><input name="point_name" value={pointForm.point_name} onChange={handlePointFormChange} required /></label>
                <label><span>观察点说明</span><textarea name="point_description" rows="3" value={pointForm.point_description} onChange={handlePointFormChange} /></label>
                <label><span>观察任务</span><textarea name="task" rows="3" value={pointForm.task} onChange={handlePointFormChange} /></label>
                <PointMaterials pointId={savedPointId} />
                <div className="editor-point-actions">{savedPointId ? <button className="primary-button" type="button" onClick={() => { setPendingPoint(null); setSavedPointId(null); setPointForm(emptyPointForm) }}>完成</button> : <><button className="secondary-button" type="button" onClick={() => setPendingPoint(null)}>取消</button><button className="primary-button" type="submit" disabled={savingPoint}>{savingPoint ? '保存中…' : '保存观察点'}</button></>}</div>
              </form>
            )}
            {points.length > 0 && <div className="editor-point-list">{points.map((point, index) => <div key={point.id ?? `${point.longitude}-${point.latitude}-${index}`}><i /> <span>{point.point_name || point.name || `观察点 ${index + 1}`}</span></div>)}</div>}
          </section>
        </aside>
        <RouteEditorMap
          initialPath={path}
          points={points}
          pendingPoint={pendingPoint}
          onPathChange={setPath}
          onMapClick={selectPointLocation}
          onAddLocatedPoint={addLocatedRoutePoint}
        />
      </div>
    </div>
  )
}
