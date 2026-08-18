import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { createCourse } from '../api/course.js'
import { addRoutePoint, createRoute, getTeacherRoutes } from '../api/route.js'
import Icon from '../components/Icon.jsx'

const configs = {
  course: { title: '创建课程', subtitle: '新建一门野外实习课程', icon: 'add', initial: { name: '', description: '' }, fields: [['name','课程名称','text'],['description','课程说明','textarea']], submit: createCourse },
  route: { title: '创建路线', subtitle: '设计实习路线与行程', icon: 'route', initial: { name: '', description: '', course_id: '', start_date: '' }, fields: [['name','路线名称','text'],['course_id','所属课程 ID','number'],['start_date','开始日期','date'],['description','路线说明','textarea']], submit: createRoute },
  point: { title: '添加观察点', subtitle: '在路线中添加野外观察点', icon: 'point', initial: { point_name: '', latitude: '', longitude: '', point_description: '', task: '', route_id: '' }, fields: [['point_name','观察点名称','text'],['route_id','所属路线','select'],['latitude','纬度','number'],['longitude','经度','number'],['point_description','观察点说明','textarea'],['task','观察任务','textarea']], submit: null },
}

export default function CreatePage({ type }) {
  const { teacher } = useOutletContext()
  const config = configs[type]
  const [form, setForm] = useState(config.initial)
  const [routes, setRoutes] = useState([])
  const [status, setStatus] = useState({ loading: false, message: '', error: '' })
  useEffect(() => { setForm(config.initial); setStatus({ loading: false, message: '', error: '' }) }, [config])
  useEffect(() => { if (type === 'point') getTeacherRoutes(teacher.id).then(setRoutes).catch(() => setRoutes([])) }, [teacher.id, type])
  function change(event) { const { name, value } = event.target; setForm((current) => ({ ...current, [name]: value })) }
  async function submit(event) { event.preventDefault(); setStatus({ loading: true, message: '', error: '' }); try { const payload = { ...form }; let result; if (type === 'route') { payload.course_id = Number(payload.course_id); payload.start_date = new Date(`${payload.start_date}T00:00:00`).toISOString(); result = await config.submit(payload) } else if (type === 'point') { const routeId = Number(payload.route_id); delete payload.route_id; payload.latitude = Number(payload.latitude); payload.longitude = Number(payload.longitude); result = await addRoutePoint(routeId, payload) } else if (type === 'course') { payload.teacher_id = Number(teacher.id); result = await config.submit(payload) } else { result = await config.submit(payload) } setStatus({ loading: false, message: result.message || '保存成功', error: '' }); setForm(config.initial) } catch (requestError) { setStatus({ loading: false, message: '', error: requestError.response?.data?.detail || '保存失败，请检查填写内容和服务状态后重试。' }) } }
  return <div className="inner-page"><div className="page-title-row"><div><p>发布管理</p><h1>{config.title}</h1><span>{config.subtitle}</span></div><span className="page-title-icon"><Icon name={config.icon} size={30} /></span></div>
    <form className="business-form" onSubmit={submit}>{config.fields.map(([name,label,kind]) => <label className={kind === 'textarea' ? 'wide-field' : ''} key={name}><span>{label}</span>{kind === 'textarea' ? <textarea name={name} rows="5" value={form[name]} onChange={change} required /> : kind === 'select' ? <select name={name} value={form[name]} onChange={change} required><option value="">请选择路线</option>{routes.map((route) => <option value={route.id} key={route.id}>{route.route_name}</option>)}</select> : <input name={name} type={kind} step={kind === 'number' ? 'any' : undefined} value={form[name]} onChange={change} required />}</label>)}
      <div className="form-feedback wide-field">{status.error && <p className="form-error">{status.error}</p>}{status.message && <p className="form-success">{status.message}</p>}<button className="primary-button" disabled={status.loading} type="submit">{status.loading ? '正在保存…' : '保存'}</button></div>
    </form>
  </div>
}
