import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { getTeacherCourses } from '../api/course.js'
import { addRoutePoint, deleteRoutePoint, getRouteDetail, getRouteMap, getRoutePoints, updateRoutePoint } from '../api/route.js'
import Icon from '../components/Icon.jsx'
import PointMaterials from '../components/PointMaterials.jsx'
import RouteMapViewer from '../components/map/RouteMapViewer.jsx'

const emptyPoint = { point_name: '', latitude: '', longitude: '', point_description: '', task: '' }

function pointPayload(point) {
  return {
    point_name: point.point_name.trim(),
    latitude: Number(point.latitude),
    longitude: Number(point.longitude),
    point_description: point.point_description?.trim() || '',
    task: point.task?.trim() || '',
  }
}

function getRequestMessage(error, fallback) {
  const detail = error.response?.data?.detail
  if (typeof detail === 'string') return detail
  return fallback
}

function routeLengthMeters(path) {
  const earthRadius = 6371008.8
  const toRadians = (value) => value * Math.PI / 180
  return path.reduce((total, point, index) => {
    if (index === 0) return total
    const previous = path[index - 1]
    const latitudeDelta = toRadians(point.latitude - previous.latitude)
    const longitudeDelta = toRadians(point.longitude - previous.longitude)
    const firstLatitude = toRadians(previous.latitude)
    const secondLatitude = toRadians(point.latitude)
    const haversine = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2
    return total + 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(haversine)))
  }, 0)
}

function formatRouteLength(path) {
  if (path.length < 2) return '暂无轨迹'
  const meters = routeLengthMeters(path)
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`
}

export default function RouteDetail() {
  const { routeId } = useParams()
  const navigate = useNavigate()
  const { teacher } = useOutletContext()
  const [route, setRoute] = useState(null)
  const [courseName, setCourseName] = useState('')
  const [points, setPoints] = useState([])
  const [routePath, setRoutePath] = useState([])
  const [form, setForm] = useState(emptyPoint)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyPoint)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    const [routeData, pointData, mapData, courseData] = await Promise.all([getRouteDetail(routeId), getRoutePoints(routeId), getRouteMap(routeId), getTeacherCourses(teacher.id)])
    if (!routeData?.id) throw new Error('Route not found')
    setRoute(routeData)
    setPoints(Array.isArray(pointData) ? pointData : [])
    setRoutePath(mapData.route_points)
    setCourseName(courseData.find((course) => course.id === routeData.course_id)?.course_name || '')
  }, [routeId, teacher.id])

  useEffect(() => {
    let active = true
    setLoading(true)
    loadData().catch(() => active && setError('路线详情加载失败，请检查后端服务后重试。')).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [loadData])

  const activePoints = useMemo(() => points.filter((point) => point.is_active !== false), [points])
  function changeForm(event) { const { name, value } = event.target; setForm((current) => ({ ...current, [name]: value })) }
  function changeEditForm(event) { const { name, value } = event.target; setEditForm((current) => ({ ...current, [name]: value })) }

  async function handleAdd(event) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    try {
      const result = await addRoutePoint(routeId, pointPayload(form))
      setMessage(result.message || '观察点添加成功')
      const newPointId = result.point_id
      const newPointForm = { ...form }
      setForm(emptyPoint)
      await loadData()
      if (newPointId) {
        setEditingId(newPointId)
        setEditForm(newPointForm)
      }
    } catch (requestError) {
      setError(getRequestMessage(requestError, '观察点添加失败。后端接口可能缺少数据库要求的 point_code 字段。'))
    } finally { setSaving(false) }
  }

  function beginEdit(point) {
    setEditingId(point.id)
    setEditForm({ point_name: point.point_name || '', latitude: point.latitude ?? '', longitude: point.longitude ?? '', point_description: point.point_description || '', task: point.task || '' })
  }

  async function handleUpdate(event) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    try {
      const result = await updateRoutePoint(editingId, pointPayload(editForm))
      setMessage(result.message || '观察点修改成功')
      setEditingId(null)
      await loadData()
    } catch (requestError) {
      setError(getRequestMessage(requestError, '观察点修改失败，请稍后重试。'))
    } finally { setSaving(false) }
  }

  async function handleDelete(point) {
    if (!window.confirm(`确定删除观察点“${point.point_name}”吗？`)) return
    setSaving(true); setError(''); setMessage('')
    try {
      const result = await deleteRoutePoint(point.id)
      setMessage(`${result.message || '删除请求成功'}；若记录仍显示，说明后端未持久化删除状态。`)
      await loadData()
    } catch (requestError) {
      setError(getRequestMessage(requestError, '观察点删除失败，请稍后重试。'))
    } finally { setSaving(false) }
  }

  if (loading) return <div className="content-status">正在加载路线详情…</div>
  return (
    <div className="inner-page route-detail-page">
      <div className="page-title-row">
        <div><p>我的路线</p><h1>{route?.route_name || '路线详情'}</h1><span>{route?.route_description || '暂无路线说明'}</span></div>
        <div className="page-title-actions">
          <button className="primary-button" type="button" onClick={() => navigate(`/routes/${route?.id || routeId}/edit`)}>编辑路线</button>
          <Link className="secondary-button" to="/routes">返回路线列表</Link>
        </div>
      </div>
      {error && <div className="content-status error-message" role="alert">{error}</div>}
      {message && <div className="content-status success-message" role="status">{message}</div>}
      <section className="route-summary route-summary--with-path"><div><small>路线编号</small><strong>{route?.id || routeId}</strong></div><div><small>所属课程</small><strong>{courseName || (route?.course_id ? `课程 ID ${route.course_id}` : '接口未返回')}</strong></div><div><small>开始日期</small><strong>{route?.start_date || '待定'}</strong></div><div><small>路线长度</small><strong>{formatRouteLength(routePath)}</strong></div><div><small>固定观察点</small><strong>{activePoints.length} 个</strong></div><div><small>自由观察</small><strong>{route?.free_observation_enabled ? `已开启 · 要求 ${route.required_free_observation_count} 个` : '未开启'}</strong></div></section>
      <section className="route-track-preview">
        <div className="route-track-preview__heading">
          <div><small>路线轨迹</small><h2>最新 RoutePath</h2></div>
          <span>{routePath.length} 个轨迹点</span>
        </div>
        <RouteMapViewer routePoints={routePath} height="240px" compact />
        <div className="route-track-preview__footer">
          <span>{routePath.length >= 2 ? '根据最新 RoutePath 自动缩放' : '保存路线后将在此显示缩略图'}</span>
          <Link to={`/routes/${routeId}/map`}>打开完整地图 →</Link>
        </div>
      </section>
      <div className="point-management-grid">
        <section className="point-list-panel"><div className="panel-heading"><div><p>观察点管理</p><h2>路线观察点</h2></div><span>{activePoints.length} 个</span></div>
          {activePoints.length === 0 && <div className="compact-empty">当前路线暂无观察点，请使用右侧表单添加。</div>}
          <div className="point-list">{activePoints.map((point, index) => <article className="point-card" key={point.id}><span className="point-order">{String(index + 1).padStart(2, '0')}</span><div><h3>{point.point_name}</h3><p>{point.point_description || '暂无说明'}</p><small>{point.latitude}, {point.longitude}</small>{point.task && <em>任务：{point.task}</em>}</div><div className="point-actions"><button type="button" onClick={() => beginEdit(point)}>编辑</button><button className="danger-button" type="button" disabled={saving} onClick={() => handleDelete(point)}>删除</button></div></article>)}</div>
        </section>
        <section className="point-form-panel"><div className="panel-heading"><div><p>{editingId ? '修改信息' : '普通表单'}</p><h2>{editingId ? '编辑观察点' : '添加观察点'}</h2></div><Icon name="point" /></div>
          <form className="point-form" onSubmit={editingId ? handleUpdate : handleAdd}>
            <label><span>观察点名称</span><input name="point_name" value={editingId ? editForm.point_name : form.point_name} onChange={editingId ? changeEditForm : changeForm} required /></label>
            <div className="coordinate-fields"><label><span>纬度</span><input name="latitude" type="number" step="any" value={editingId ? editForm.latitude : form.latitude} onChange={editingId ? changeEditForm : changeForm} required /></label><label><span>经度</span><input name="longitude" type="number" step="any" value={editingId ? editForm.longitude : form.longitude} onChange={editingId ? changeEditForm : changeForm} required /></label></div>
            <label><span>观察点说明</span><textarea name="point_description" rows="3" value={editingId ? editForm.point_description : form.point_description} onChange={editingId ? changeEditForm : changeForm} /></label>
            <label><span>观察任务</span><textarea name="task" rows="3" value={editingId ? editForm.task : form.task} onChange={editingId ? changeEditForm : changeForm} /></label>
            <PointMaterials pointId={editingId} />
            <div className="point-form-actions">{editingId && <button className="secondary-button" type="button" onClick={() => setEditingId(null)}>取消编辑</button>}<button className="primary-button" type="submit" disabled={saving}>{saving ? '保存中…' : editingId ? '保存修改' : '添加观察点'}</button></div>
          </form>
        </section>
      </div>
    </div>
  )
}
