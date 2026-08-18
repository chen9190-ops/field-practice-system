import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { getTeacherCourses } from '../api/course.js'
import { createTeacherRoute } from '../api/route.js'
import FreeObservationConfig from '../components/FreeObservationConfig.jsx'
import Icon from '../components/Icon.jsx'

const emptyForm = { course_id: '', route_name: '', route_description: '', start_date: '', free_observation_enabled: false, required_free_observation_count: 0 }

function requestMessage(error, fallback) {
  const detail = error.response?.data?.detail
  return typeof detail === 'string' ? detail : fallback
}

export default function CreateRoute() {
  const navigate = useNavigate()
  const { teacher } = useOutletContext()
  const [courses, setCourses] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getTeacherCourses(teacher.id)
      .then((data) => active && setCourses(Array.isArray(data) ? data : []))
      .catch(() => active && setError('课程列表加载失败，请检查后端服务后重试。'))
      .finally(() => active && setLoadingCourses(false))
    return () => { active = false }
  }, [teacher.id])

  function change(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function changeFreeObservationEnabled(enabled) {
    setForm((current) => ({
      ...current,
      free_observation_enabled: enabled,
      required_free_observation_count: enabled ? Math.max(1, Number(current.required_free_observation_count) || 1) : 0,
    }))
  }

  function changeFreeObservationCount(count) {
    setForm((current) => ({ ...current, required_free_observation_count: Math.max(1, Number(count) || 1) }))
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const result = await createTeacherRoute(form)
      if (!result?.route_id) throw new Error('CREATE_ROUTE_MISSING_ID')
      navigate(`/routes/${result.route_id}/edit`, { replace: true })
    } catch (requestError) {
      setError(requestMessage(requestError, '路线创建失败，请检查填写内容和后端服务后重试。'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="inner-page">
      <div className="page-title-row">
        <div><p>发布管理</p><h1>创建路线</h1><span>填写路线信息，创建后进入地图绘制轨迹</span></div>
        <span className="page-title-icon"><Icon name="route" size={30} /></span>
      </div>
      <form className="business-form" onSubmit={submit}>
        <label><span>所属课程</span><select name="course_id" value={form.course_id} onChange={change} disabled={loadingCourses} required><option value="">{loadingCourses ? '正在加载课程…' : '请选择课程'}</option>{courses.map((course) => <option value={course.id} key={course.id}>{course.course_name}</option>)}</select></label>
        <label><span>开始日期</span><input name="start_date" type="date" value={form.start_date} onChange={change} required /></label>
        <label className="wide-field"><span>路线名称</span><input name="route_name" value={form.route_name} onChange={change} required /></label>
        <label className="wide-field"><span>路线说明</span><textarea name="route_description" rows="5" value={form.route_description} onChange={change} required /></label>
        <div className="wide-field"><FreeObservationConfig enabled={form.free_observation_enabled} count={form.required_free_observation_count} onEnabledChange={changeFreeObservationEnabled} onCountChange={changeFreeObservationCount} /></div>
        <div className="form-feedback wide-field">
          {error && <p className="form-error" role="alert">{error}</p>}
          {!loadingCourses && courses.length === 0 && !error && <p className="form-error">当前教师暂无可选课程，请先创建课程。</p>}
          <button className="primary-button" type="submit" disabled={saving || loadingCourses || courses.length === 0}>{saving ? '正在创建…' : '创建并绘制路线'}</button>
        </div>
      </form>
    </div>
  )
}
