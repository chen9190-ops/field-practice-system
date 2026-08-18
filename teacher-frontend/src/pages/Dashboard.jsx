import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { getTeacherDashboard } from '../api/teacher.js'
import { getTeacherCourses } from '../api/course.js'
import { getTeacherRoutes } from '../api/route.js'
import { getRouteCheckins, getRouteProgress } from '../api/studentManagement.js'
import { getEvaluationSummary, getReports } from '../api/evaluation.js'
import StatCard from '../components/StatCard.jsx'
import QuickActionCard from '../components/QuickActionCard.jsx'
import ManagementSection from '../components/ManagementSection.jsx'
import ProgressDonut from '../components/ProgressDonut.jsx'
import ScoreTrendChart from '../components/ScoreTrendChart.jsx'
import Icon from '../components/Icon.jsx'

const stats = [
  ['course', '课程总数', 'course_count', 'green'], ['route', '路线总数', 'route_count', 'gold'], ['students', '学生总数', 'student_count', 'gold'], ['record', '观察记录数', 'observation_count', 'blue'], ['report', '报告总数', 'report_count', 'blue'],
]
const publishActions = [
  ['我的课程', '管理我创建的课程', 'course', '/courses'], ['创建课程', '新建一门野外实习课程', 'add', '/courses/create'], ['创建路线', '设计实习路线与行程', 'route', '/routes/create'], ['添加观察点', '在路线中添加观察点', 'point', '/points/create'], ['发布路线', '发布路线供学生使用', 'send', '/routes/publish'],
]
const studentActions = [
  ['学生列表', '查看学生信息', 'students', '/students'], ['完成度总览', '查看整体完成情况', 'progress', '/completion'], ['签到管理', '查看学生签到情况', 'check', '/attendance'], ['观察记录', '查看学生观察记录', 'record', '/observations'], ['AI分析', '智能分析学生表现', 'ai', '/ai-analysis'],
]
const evaluationActions = [
  ['报告查看', '查看学生实习报告', 'report', '/reports'], ['评分管理', '对学生报告进行评分', 'score', '/scores'], ['评论管理', '查看和维护学生报告的教师评语', 'comment', '/comments'], ['数据统计', '多维度教学数据分析', 'chart', '/statistics'],
]

function Legend({ items, suffix = '%' }) {
  return <ul className="chart-legend">{items.map(([label, value, color]) => <li key={label}><i style={{ background: color }} /><span>{label}</span><strong>{value}{suffix}</strong></li>)}</ul>
}

export default function Dashboard() {
  const { teacher } = useOutletContext()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [studentOverview, setStudentOverview] = useState({ progress: null, checkins: null })
  const [evaluationCourses, setEvaluationCourses] = useState([])
  const [evaluationRoutes, setEvaluationRoutes] = useState([])
  const [evaluationCourseId, setEvaluationCourseId] = useState('')
  const [evaluationRouteId, setEvaluationRouteId] = useState('')
  const [evaluationReports, setEvaluationReports] = useState([])
  const [evaluationSummary, setEvaluationSummary] = useState(null)
  const [evaluationLoading, setEvaluationLoading] = useState(true)
  const [evaluationError, setEvaluationError] = useState('')
  const evaluationVersion = useRef(0)
  useEffect(() => {
    let active = true
    getTeacherDashboard(teacher.id).then((result) => { if (active) setData(result) }).catch(() => { if (active) setError('教学统计加载失败，请确认后端服务和登录状态。') })
    return () => { active = false }
  }, [teacher.id])
  useEffect(() => {
    let active = true
    setEvaluationLoading(true); setEvaluationError('')
    Promise.all([getTeacherCourses(teacher.id), getTeacherRoutes(teacher.id)])
      .then(([courses, routes]) => {
        if (!active) return
        const nextCourses = Array.isArray(courses) ? courses : []
        setEvaluationCourses(nextCourses)
        setEvaluationRoutes(Array.isArray(routes) ? routes.filter((route) => route.is_active !== false) : [])
        setEvaluationCourseId(nextCourses[0]?.id != null ? String(nextCourses[0].id) : '')
      })
      .catch(() => active && setEvaluationError('教学评价课程与路线加载失败，请稍后重试'))
      .finally(() => active && setEvaluationLoading(false))
    return () => { active = false }
  }, [teacher.id])
  const evaluationCourseRoutes = useMemo(() => evaluationRoutes.filter((route) => Number(route.course_id) === Number(evaluationCourseId)), [evaluationRoutes, evaluationCourseId])
  useEffect(() => {
    setEvaluationRouteId(evaluationCourseRoutes[0]?.id != null ? String(evaluationCourseRoutes[0].id) : '')
  }, [evaluationCourseId, evaluationCourseRoutes])
  useEffect(() => {
    evaluationVersion.current += 1
    const version = evaluationVersion.current
    setEvaluationReports([]); setEvaluationSummary(null); setEvaluationError('')
    if (!evaluationCourseId || !evaluationRouteId) { setEvaluationLoading(false); return }
    setEvaluationLoading(true)
    Promise.all([
      getReports(teacher.id, evaluationCourseId, evaluationRouteId),
      getEvaluationSummary(teacher.id, evaluationCourseId, evaluationRouteId),
    ]).then(([reports, summary]) => {
      if (version === evaluationVersion.current) { setEvaluationReports(reports); setEvaluationSummary(summary) }
    }).catch(() => version === evaluationVersion.current && setEvaluationError('教学评价数据加载失败，请稍后重试'))
      .finally(() => version === evaluationVersion.current && setEvaluationLoading(false))
  }, [teacher.id, evaluationCourseId, evaluationRouteId])
  useEffect(() => {
    let active = true
    Promise.all([getTeacherCourses(teacher.id), getTeacherRoutes(teacher.id)])
      .then(async ([courses, routes]) => {
        const course = Array.isArray(courses) ? courses[0] : null
        const route = course && Array.isArray(routes)
          ? routes.find((item) => Number(item.course_id) === Number(course.id))
          : null
        if (!course || !route) return
        const [progress, checkins] = await Promise.all([
          getRouteProgress(teacher.id, course.id, route.id),
          getRouteCheckins(teacher.id, course.id, route.id),
        ])
        if (active) setStudentOverview({ progress, checkins })
      })
      .catch(() => {})
    return () => { active = false }
  }, [teacher.id])
  const values = data || {}
  const completion = studentOverview.progress
  const attendance = studentOverview.checkins
  const totalStudents = completion?.total_students || 0
  const completionSegments = totalStudents ? [
    completion.completed_students / totalStudents * 100,
    completion.in_progress_students / totalStudents * 100,
    completion.not_started_students / totalStudents * 100,
  ] : [0, 0, 100]
  return (
    <div className="dashboard-page">
      {error && <div className="data-notice" role="alert">{error}</div>}
      <section className="stats-grid" aria-label="教学统计">
        {stats.map(([icon, title, key, tone]) => <StatCard key={key} icon={icon} title={title} value={data ? values[key] ?? 0 : '—'} change={data ? '实时统计' : '正在加载'} tone={tone} />)}
      </section>
      <div className="management-grid">
        <ManagementSection title="发布管理" icon="course" tone="green" className="publish-panel">
          <div className="action-stack">{publishActions.map(([title, description, icon, to]) => <QuickActionCard key={title} title={title} description={description} icon={icon} to={to} />)}</div>
          <div className="panel-landscape" aria-hidden="true"><i /><span /><b /></div>
        </ManagementSection>
        <ManagementSection title="学生管理" icon="students" tone="blue">
          <div className="student-panel-grid">
            <div className="action-stack compact-stack">{studentActions.map(([title, description, icon, to]) => <QuickActionCard compact key={title} title={title} description={description} icon={icon} to={to} />)}</div>
            <div className="student-insights">
              <div className="insight-card completion-card"><h3>整体完成度</h3><ProgressDonut value={`${completion?.completion_rate ?? 0}%`} label="整体完成度" segments={completionSegments} colors={['#557531', '#7898c5', '#d6d8d5']} /><Legend suffix="" items={[["已完成",completion?.completed_students ?? 0,"#557531"],["进行中",completion?.in_progress_students ?? 0,"#7898c5"],["未开始",completion?.not_started_students ?? 0,"#c8ccca"]]} /></div>
              <div className="insight-card attendance-card"><h3>签到完成</h3><div className="attendance-count"><Icon name="check" /><span>完成学生<strong>{attendance?.fully_checked_in_students ?? 0}<small> / {attendance?.total_students ?? 0} 人</small></strong></span></div><div className="progress-track"><span style={{ width: `${attendance?.total_students ? attendance.fully_checked_in_students / attendance.total_students * 100 : 0}%` }} /></div><Link to="/attendance">查看详细数据 <span>→</span></Link></div>
            </div>
          </div>
        </ManagementSection>
        <ManagementSection title="教学评价" icon="score" tone="gold">
          <div className="dashboard-evaluation-context"><label><span>课程</span><select value={evaluationCourseId} onChange={(event) => { setEvaluationRouteId(''); setEvaluationReports([]); setEvaluationSummary(null); setEvaluationCourseId(event.target.value) }} disabled={!evaluationCourses.length}>{evaluationCourses.length ? evaluationCourses.map((course) => <option key={course.id} value={course.id}>{course.course_name}</option>) : <option value="">暂无课程</option>}</select></label><label><span>路线</span><select value={evaluationRouteId} onChange={(event) => { setEvaluationReports([]); setEvaluationSummary(null); setEvaluationRouteId(event.target.value) }} disabled={!evaluationCourseId || !evaluationCourseRoutes.length}>{evaluationCourseRoutes.length ? evaluationCourseRoutes.map((route) => <option key={route.id} value={route.id}>{route.route_name || route.name}</option>) : <option value="">该课程暂无路线</option>}</select></label><div><span>总报告<strong>{evaluationSummary?.total_reports ?? evaluationReports.length}</strong></span><span>已评分<strong>{evaluationSummary?.graded_reports ?? 0}</strong></span><span>待评分<strong>{evaluationSummary?.ungraded_reports ?? 0}</strong></span><span>平均分<strong>{evaluationSummary?.average_score ?? 0}</strong></span></div></div>
          {evaluationError && <div className="management-alert">{evaluationError}</div>}
          {!evaluationLoading && !evaluationCourseId && <div className="management-empty dashboard-evaluation-empty">暂无课程，请先创建课程</div>}
          {!evaluationLoading && evaluationCourseId && !evaluationRouteId && <div className="management-empty dashboard-evaluation-empty">该课程暂无路线</div>}
          <div className="evaluation-grid">
            <div className="action-stack compact-stack">{evaluationActions.map(([title, description, icon, to]) => <QuickActionCard compact key={title} title={title} description={description} icon={icon} to={to} />)}</div>
            <div className="evaluation-insights">
              <div className="insight-card score-card"><h3>报告评分分布</h3>{evaluationLoading ? <div className="chart-empty">正在加载评分数据...</div> : !evaluationSummary?.graded_reports ? <div className="chart-empty">暂无评分数据</div> : <div className="score-layout"><ProgressDonut value={evaluationSummary.graded_reports} label="已评分报告" segments={['excellent','good','pass','fail'].map((key) => Number(evaluationSummary.score_distribution_percent?.[key]) || 0)} colors={['#557531','#7898c5','#e4b548','#c86d49']} /><Legend items={[["优秀",evaluationSummary.score_distribution_percent?.excellent ?? 0,"#557531"],["良好",evaluationSummary.score_distribution_percent?.good ?? 0,"#7898c5"],["及格",evaluationSummary.score_distribution_percent?.pass ?? 0,"#e4b548"],["不及格",evaluationSummary.score_distribution_percent?.fail ?? 0,"#c86d49"]]} /></div>}</div>
              <ScoreTrendChart values={evaluationSummary?.score_trend || []} />
            </div>
          </div>
        </ManagementSection>
      </div>
    </div>
  )
}
