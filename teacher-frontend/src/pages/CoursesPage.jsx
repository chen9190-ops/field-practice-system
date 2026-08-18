import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { deleteCourse, getTeacherCourses } from '../api/course.js'
import Icon from '../components/Icon.jsx'

export default function CoursesPage() {
  const { teacher } = useOutletContext()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getTeacherCourses(teacher.id)
      .then((data) => active && setCourses(Array.isArray(data) ? data : []))
      .catch(() => active && setError('课程数据加载失败，请检查服务后重试。'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [teacher.id])

  function openDeleteDialog(course) {
    setDeleteError('')
    setDeleteTarget(course)
  }

  function closeDeleteDialog() {
    if (deletingId !== null) return
    setDeleteTarget(null)
    setDeleteError('')
  }

  async function confirmDelete() {
    if (!deleteTarget || deletingId !== null) return
    setDeletingId(deleteTarget.id)
    setDeleteError('')
    try {
      await deleteCourse(deleteTarget.id)
      const deletedCourseId = deleteTarget.id
      setDeleteTarget(null)
      setError('')
      try {
        const data = await getTeacherCourses(teacher.id)
        setCourses(Array.isArray(data) ? data : [])
      } catch {
        setCourses((currentCourses) => currentCourses.filter((course) => course.id !== deletedCourseId))
        setError('课程已删除，但列表刷新失败，请稍后重新加载页面。')
      }
    } catch (requestError) {
      const detail = requestError.response?.data?.detail
      setDeleteError(typeof detail === 'string' ? detail : '课程删除失败，请检查服务后重试。')
    } finally {
      setDeletingId(null)
    }
  }

  return <div className="inner-page"><div className="page-title-row"><div><p>发布管理</p><h1>我的课程</h1><span>管理我创建的野外实习课程</span></div><Link className="primary-button" to="/courses/create"><Icon name="add" size={18} />创建课程</Link></div>
    {loading && <div className="content-status">正在加载课程…</div>}{error && <div className="content-status error-message">{error}</div>}
    {!loading && !error && courses.length === 0 && <section className="empty-state"><span><Icon name="course" size={34} /></span><h2>还没有课程</h2><p>创建第一门野外实习课程后，会在这里集中管理。</p><Link to="/courses/create">创建课程</Link></section>}
    {courses.length > 0 && <div className="resource-grid">{courses.map((course) => <article className="resource-card course-card" key={course.id}><Link className="course-card-main resource-card-link" to={`/routes?courseId=${course.id}`}><span><Icon name="course" /></span><div><small>课程编号 {course.id}</small><h2>{course.course_name}</h2><p>{course.course_description || '暂无课程说明'}</p><b>查看课程路线 <span>→</span></b></div></Link><footer><button className="course-delete-button" type="button" onClick={() => openDeleteDialog(course)} disabled={deletingId !== null}>{deletingId === course.id ? '删除中…' : '删除课程'}</button></footer></article>)}</div>}
    {deleteTarget && <div className="dialog-backdrop" role="presentation" onMouseDown={closeDeleteDialog}><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-course-title" onMouseDown={(event) => event.stopPropagation()}><div className="confirm-dialog-mark">!</div><h2 id="delete-course-title">确认删除课程？</h2><p>即将删除“{deleteTarget.course_name}”。删除后课程相关数据可能无法恢复。</p>{deleteError && <div className="dialog-error" role="alert">{deleteError}</div>}<div className="confirm-dialog-actions"><button className="secondary-button" type="button" onClick={closeDeleteDialog} disabled={deletingId !== null}>取消</button><button className="danger-button" type="button" onClick={confirmDelete} disabled={deletingId !== null}>{deletingId !== null ? '删除中…' : '确认删除'}</button></div></section></div>}
  </div>
}
