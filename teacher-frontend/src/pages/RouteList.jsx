import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { getTeacherCourses } from '../api/course.js'
import { deleteRoute, getTeacherRoutes, publishRoute } from '../api/route.js'
import Icon from '../components/Icon.jsx'

export default function RouteList() {
  const { teacher } = useOutletContext()
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get('courseId')
  const [routes, setRoutes] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [publishingId, setPublishingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    let active = true
    Promise.all([getTeacherRoutes(teacher.id), getTeacherCourses(teacher.id)])
      .then(([routeData, courseData]) => {
        if (!active) return
        setRoutes(routeData)
        setCourses(courseData)
      })
      .catch(() => active && setError('路线数据加载失败，请检查后端服务后重试。'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [teacher.id])

  const courseMap = useMemo(() => new Map(courses.map((course) => [course.id, course.course_name])), [courses])
  const visibleRoutes = courseId ? routes.filter((route) => String(route.course_id) === courseId) : routes
  const selectedCourse = courseId ? courseMap.get(Number(courseId)) : ''

  async function handlePublish(routeId) {
    const targetRoute = routes.find((route) => route.id === routeId)
    if (!targetRoute || targetRoute.status === 'published' || publishingId !== null) return
    setPublishingId(routeId)
    setError('')
    setMessage('')
    try {
      const result = await publishRoute(routeId)
      const nextStatus = result.status || 'published'
      setRoutes((current) => current.map((route) => route.id === routeId ? { ...route, status: nextStatus } : route))
      setMessage(`路线“${targetRoute.route_name}”发布成功。`)
    } catch (requestError) {
      setError(requestError.response?.data?.detail || '路线发布失败，请稍后重试。')
    } finally {
      setPublishingId(null)
    }
  }

  async function handleDelete(routeId) {
    const targetRoute = routes.find((route) => route.id === routeId)
    if (!targetRoute || deletingId !== null || publishingId !== null) return
    if (!window.confirm('确定删除该路线吗？')) return

    setDeletingId(routeId)
    setError('')
    setMessage('')
    try {
      await deleteRoute(routeId)
      setRoutes((current) => current.filter((route) => route.id !== routeId))
      setMessage(`路线“${targetRoute.route_name}”删除成功。`)
    } catch (requestError) {
      setError(requestError.response?.data?.detail || '路线删除失败，请稍后重试。')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="inner-page">
      <div className="page-title-row">
        <div><p>发布管理</p><h1>我的路线</h1><span>{selectedCourse ? `课程：${selectedCourse}` : '查看并管理我负责课程下的全部路线'}</span></div>
        <Link className="primary-button" to="/routes/create"><Icon name="add" size={18} />创建路线</Link>
      </div>
      {courseId && <div className="filter-bar"><span>正在按课程筛选</span><Link to="/routes">查看全部路线</Link></div>}
      {loading && <div className="content-status">正在加载路线…</div>}
      {error && <div className="content-status error-message" role="alert">{error}</div>}
      {message && <div className="content-status success-message" role="status">{message}</div>}
      {!loading && visibleRoutes.length === 0 && <section className="empty-state"><span><Icon name="route" size={34} /></span><h2>暂无路线</h2><p>当前课程下还没有可展示的实习路线。</p><Link to="/routes/create">创建路线</Link></section>}
      {visibleRoutes.length > 0 && <div className="route-grid">{visibleRoutes.map((route) => (
        <article className="route-card" key={route.id}>
          <Link className="route-card-main" to={`/routes/${route.id}`}>
            <span className="route-card-icon"><Icon name="route" /></span>
            <div><small>{courseMap.get(route.course_id) || `课程 ID ${route.course_id}`}</small><h2>{route.route_name}</h2><p>{route.route_description || '暂无路线说明'}</p><div className={`route-observation-meta ${route.free_observation_enabled ? 'is-enabled' : ''}`}><span>自由观察</span><strong>{route.free_observation_enabled ? `已开启 · 要求 ${route.required_free_observation_count} 个` : '未开启'}</strong></div></div>
          </Link>
          <footer><span>{route.start_date || '开始日期待定'}</span><span className={`status-badge ${route.status === 'published' ? 'published' : 'draft'}`}>{route.status === 'published' ? '已发布' : '草稿'}</span><button type="button" disabled={route.status === 'published' || publishingId !== null || deletingId !== null} onClick={() => handlePublish(route.id)}>{publishingId === route.id ? '发布中…' : route.status === 'published' ? '已发布' : '发布'}</button><button type="button" disabled={deletingId !== null || publishingId !== null} onClick={() => handleDelete(route.id)}>{deletingId === route.id ? '删除中…' : '删除路线'}</button></footer>
        </article>
      ))}</div>}
    </div>
  )
}
