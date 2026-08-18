import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { getTeacherRoutes, publishRoute } from '../api/route.js'
import Icon from '../components/Icon.jsx'

export default function PublishRoutesPage() {
  const { teacher } = useOutletContext()
  const [routes, setRoutes] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('')
  useEffect(() => { let active = true; getTeacherRoutes(teacher.id).then((data) => active && setRoutes(data)).catch(() => active && setError('路线数据加载失败，请稍后重试。')).finally(() => active && setLoading(false)); return () => { active = false } }, [teacher.id])
  async function handlePublish(routeId) { setError(''); try { const result = await publishRoute(routeId); setRoutes((current) => current.map((route) => route.id === routeId ? { ...route, status: result.status } : route)) } catch (requestError) { setError(requestError.response?.data?.detail || '路线发布失败，请稍后重试。') } }
  return <div className="inner-page"><div className="page-title-row"><div><p>发布管理</p><h1>发布路线</h1><span>查看已有路线并进行发布管理</span></div><span className="page-title-icon"><Icon name="send" size={30} /></span></div>{loading && <div className="content-status">正在加载路线…</div>}{error && <div className="content-status error-message">{error}</div>}{!loading && <div className="resource-grid">{routes.map((route) => <article className="resource-card" key={route.id}><span><Icon name="route" /></span><div><small>{route.start_date || '日期待定'} · {route.status || '接口未返回状态'}</small><h2>{route.route_name}</h2><p>{route.route_description || '暂无路线说明'}</p><button type="button" disabled={route.status === 'published'} onClick={() => handlePublish(route.id)}>{route.status === 'published' ? '已发布' : '发布路线'}</button></div></article>)}{routes.length === 0 && <section className="empty-state"><h2>暂无可发布路线</h2><p>请先创建路线。</p></section>}</div>}</div>
}
