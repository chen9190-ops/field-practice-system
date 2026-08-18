import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { getTeacherCourses } from '../api/course.js'
import { getTeacherRoutes } from '../api/route.js'
import { getRoutePoints } from '../api/route.js'
import {
  getCourseStudents, getRouteAIAnalysis, getRouteAISummary, getRouteCheckins,
  getRouteObservations, getRouteProgress, getStudentRouteAIAnalysis,
} from '../api/studentManagement.js'
import Icon from '../components/Icon.jsx'
import {
  AIAnalysisPanel, CheckinPanel, ObservationPanel, ProgressPanel,
  StudentAIDetail, StudentListPanel,
} from '../components/StudentManagementPanels.jsx'

const tabs = [
  ['students', '学生列表'], ['completion', '完成度总览'], ['attendance', '签到管理'],
  ['observations', '观察记录'], ['ai-analysis', 'AI分析'],
]

const iconMap = { students: 'students', completion: 'progress', attendance: 'check', observations: 'record', 'ai-analysis': 'ai' }
const PAGE_SIZE = 20

const errorText = (error, fallback) => error?.response?.data?.detail || fallback

export default function StudentManagementPage({ initialTab = 'students' }) {
  const { teacher } = useOutletContext()
  const [activeTab, setActiveTab] = useState(initialTab)
  const [courses, setCourses] = useState([])
  const [routes, setRoutes] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [students, setStudents] = useState([])
  const [routePoints, setRoutePoints] = useState([])
  const [progress, setProgress] = useState(null)
  const [checkins, setCheckins] = useState(null)
  const [observations, setObservations] = useState(null)
  const [aiSummary, setAiSummary] = useState(null)
  const [aiData, setAiData] = useState(null)
  const [aiDetail, setAiDetail] = useState(null)
  const [observationFilters, setObservationFilters] = useState({ student_id: '', point_id: '', observation_type: '' })
  const [aiFilters, setAiFilters] = useState({ student_id: '', status: '' })
  const [observationPage, setObservationPage] = useState(1)
  const [aiPage, setAiPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [baseLoading, setBaseLoading] = useState(false)
  const [panelLoading, setPanelLoading] = useState(false)
  const [error, setError] = useState('')
  const requestVersion = useRef(0)
  const observationRequestVersion = useRef(0)
  const aiRequestVersion = useRef(0)
  const cache = useRef(new Map())

  useEffect(() => { setActiveTab(initialTab) }, [initialTab])

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([getTeacherCourses(teacher.id), getTeacherRoutes(teacher.id)])
      .then(([courseData, routeData]) => {
        if (!active) return
        const nextCourses = Array.isArray(courseData) ? courseData : []
        const nextRoutes = Array.isArray(routeData) ? routeData.filter((route) => route.is_active !== false) : []
        setCourses(nextCourses)
        setRoutes(nextRoutes)
        setSelectedCourseId(nextCourses[0]?.id ? String(nextCourses[0].id) : '')
      })
      .catch((requestError) => active && setError(errorText(requestError, '课程与路线数据加载失败，请稍后重试')))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [teacher.id])

  const courseRoutes = useMemo(() => routes.filter((route) => Number(route.course_id) === Number(selectedCourseId)), [routes, selectedCourseId])

  useEffect(() => {
    setSelectedRouteId(courseRoutes[0]?.id ? String(courseRoutes[0].id) : '')
  }, [selectedCourseId, courseRoutes])

  useEffect(() => {
    requestVersion.current += 1
    observationRequestVersion.current += 1; aiRequestVersion.current += 1
    setStudents([]); setRoutePoints([]); setProgress(null); setCheckins(null); setObservations(null); setAiSummary(null); setAiData(null); setAiDetail(null)
    setObservationFilters({ student_id: '', point_id: '', observation_type: '' }); setAiFilters({ student_id: '', status: '' }); setObservationPage(1); setAiPage(1); setError('')
    if (!selectedCourseId) { setBaseLoading(false); return }

    const version = requestVersion.current
    setBaseLoading(true)
    const studentKey = `students:${selectedCourseId}`
    const studentPromise = cache.current.has(studentKey)
      ? Promise.resolve(cache.current.get(studentKey))
      : getCourseStudents(teacher.id, selectedCourseId).then((data) => { cache.current.set(studentKey, data); return data })
    if (!selectedRouteId) {
      studentPromise.then((data) => version === requestVersion.current && setStudents(data)).catch((e) => version === requestVersion.current && setError(errorText(e, '学生数据加载失败，请稍后重试'))).finally(() => version === requestVersion.current && setBaseLoading(false))
      return
    }
    const progressKey = `progress:${selectedCourseId}:${selectedRouteId}`
    const checkinKey = `checkins:${selectedCourseId}:${selectedRouteId}`
    const cachedFetch = (key, loader) => cache.current.has(key) ? Promise.resolve(cache.current.get(key)) : loader().then((data) => { cache.current.set(key, data); return data })
    Promise.all([
      studentPromise,
      cachedFetch(progressKey, () => getRouteProgress(teacher.id, selectedCourseId, selectedRouteId)),
      cachedFetch(checkinKey, () => getRouteCheckins(teacher.id, selectedCourseId, selectedRouteId)),
      getRoutePoints(selectedRouteId).catch(() => []),
    ]).then(([studentData, p, c, points]) => { if (version === requestVersion.current) { setStudents(studentData); setProgress(p); setCheckins(c); setRoutePoints(Array.isArray(points) ? points : []) } }).catch((e) => version === requestVersion.current && setError(errorText(e, '学生与路线统计加载失败，请稍后重试'))).finally(() => version === requestVersion.current && setBaseLoading(false))
  }, [selectedCourseId, selectedRouteId, teacher.id])

  useEffect(() => {
    if (!selectedCourseId || !selectedRouteId || activeTab !== 'observations') return
    observationRequestVersion.current += 1
    const version = observationRequestVersion.current
    const params = { ...Object.fromEntries(Object.entries(observationFilters).filter(([, value]) => value !== '')), page: observationPage, page_size: PAGE_SIZE }
    const key = `observations:${selectedCourseId}:${selectedRouteId}:${JSON.stringify(params)}`
    setPanelLoading(true); setError('')
    const request = cache.current.has(key) ? Promise.resolve(cache.current.get(key)) : getRouteObservations(teacher.id, selectedCourseId, selectedRouteId, params).then((data) => { cache.current.set(key, data); return data })
    request.then((data) => version === observationRequestVersion.current && setObservations(data)).catch((e) => version === observationRequestVersion.current && setError(errorText(e, '观察记录加载失败，请稍后重试'))).finally(() => version === observationRequestVersion.current && setPanelLoading(false))
  }, [activeTab, observationFilters, observationPage, selectedCourseId, selectedRouteId, teacher.id])

  useEffect(() => {
    if (!selectedCourseId || !selectedRouteId || activeTab !== 'ai-analysis') return
    aiRequestVersion.current += 1
    const version = aiRequestVersion.current
    const params = { ...Object.fromEntries(Object.entries(aiFilters).filter(([, value]) => value !== '')), page: aiPage, page_size: PAGE_SIZE }
    const listKey = `ai:${selectedCourseId}:${selectedRouteId}:${JSON.stringify(params)}`
    const summaryKey = `ai-summary:${selectedCourseId}:${selectedRouteId}`
    const cachedFetch = (key, loader) => cache.current.has(key) ? Promise.resolve(cache.current.get(key)) : loader().then((data) => { cache.current.set(key, data); return data })
    setPanelLoading(true); setError('')
    Promise.all([
      cachedFetch(summaryKey, () => getRouteAISummary(teacher.id, selectedCourseId, selectedRouteId)),
      cachedFetch(listKey, () => getRouteAIAnalysis(teacher.id, selectedCourseId, selectedRouteId, params)),
    ]).then(([summary, list]) => { if (version === aiRequestVersion.current) { setAiSummary(summary); setAiData(list) } }).catch((e) => version === aiRequestVersion.current && setError(errorText(e, 'AI 分析数据加载失败，请稍后重试'))).finally(() => version === aiRequestVersion.current && setPanelLoading(false))
  }, [activeTab, aiFilters, aiPage, selectedCourseId, selectedRouteId, teacher.id])

  const openAIDetail = async (studentId) => {
    setPanelLoading(true); setError('')
    try { setAiDetail(await getStudentRouteAIAnalysis(teacher.id, selectedCourseId, selectedRouteId, studentId)) }
    catch (e) { setError(errorText(e, '学生 AI 详情加载失败，请稍后重试')) }
    finally { setPanelLoading(false) }
  }

  const title = tabs.find(([id]) => id === activeTab)?.[1] || '学生管理'
  const hasCourse = Boolean(selectedCourseId)
  const hasRoute = Boolean(selectedRouteId)

  return <div className="inner-page student-management-page">
    <div className="page-title-row"><div><p>学生管理</p><h1>{title}</h1><span>按课程和路线查看学生完成度、签到、观察与 AI 分析。</span></div><span className="page-title-icon"><Icon name={iconMap[activeTab]} size={30} /></span></div>
    <section className="management-context"><label><span>课程</span><select value={selectedCourseId} onChange={(e) => { setObservationPage(1); setAiPage(1); setSelectedRouteId(''); setSelectedCourseId(e.target.value) }} disabled={loading || !courses.length}>{courses.length ? courses.map((course) => <option key={course.id} value={course.id}>{course.course_name}</option>) : <option value="">暂无课程</option>}</select></label><label><span>路线</span><select value={selectedRouteId} onChange={(e) => { setObservationPage(1); setAiPage(1); setSelectedRouteId(e.target.value) }} disabled={!hasCourse || !courseRoutes.length}>{courseRoutes.length ? courseRoutes.map((route) => <option key={route.id} value={route.id}>{route.route_name || route.name}</option>) : <option value="">该课程暂无路线</option>}</select></label><div className="management-overview"><span>整体完成度<strong>{hasRoute ? `${progress?.completion_rate ?? 0}%` : '—'}</strong></span><span>签到完成<strong>{hasRoute ? `${checkins?.fully_checked_in_students ?? 0} / ${checkins?.total_students ?? 0}` : '—'}</strong></span></div></section>
    <nav className="management-tabs">{tabs.map(([id, label]) => <button key={id} className={activeTab === id ? 'is-active' : ''} onClick={() => setActiveTab(id)}>{label}</button>)}</nav>
    {error && <div className="management-alert" role="alert">{error}</div>}
    {loading ? <div className="content-status">正在加载学生管理数据…</div> : !hasCourse ? <div className="empty-state"><h2>暂无课程</h2><p>请先创建课程。</p></div> : !hasRoute && activeTab !== 'students' ? <div className="empty-state"><h2>该课程暂无实习路线</h2><p>创建并发布路线后可查看路线统计。</p></div> : (baseLoading && ['students','completion','attendance'].includes(activeTab)) || (panelLoading && (activeTab === 'observations' || activeTab === 'ai-analysis')) ? <div className="content-status">正在加载数据…</div> : <>
      {activeTab === 'students' && <StudentListPanel students={students} />}
      {activeTab === 'completion' && <ProgressPanel data={progress} />}
      {activeTab === 'attendance' && <CheckinPanel data={checkins} />}
      {activeTab === 'observations' && <ObservationPanel data={observations} students={students} points={routePoints} filters={observationFilters} onFilter={(key, value) => { setObservationPage(1); setObservationFilters((old) => ({ ...old, [key]: value })) }} onPageChange={setObservationPage} />}
      {activeTab === 'ai-analysis' && <AIAnalysisPanel summary={aiSummary} data={aiData} students={students} filters={aiFilters} onFilter={(key, value) => { setAiPage(1); setAiFilters((old) => ({ ...old, [key]: value })) }} onPageChange={setAiPage} onDetail={openAIDetail} />}
    </>}
    <StudentAIDetail data={aiDetail} onClose={() => setAiDetail(null)} />
  </div>
}
