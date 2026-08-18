import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { getTeacherCourses } from '../api/course.js'
import { getTeacherRoutes } from '../api/route.js'
import { getEvaluationSummary, getReportDetail, getReports, saveReportEvaluation } from '../api/evaluation.js'
import Icon from '../components/Icon.jsx'
import ProgressDonut from '../components/ProgressDonut.jsx'
import ScoreTrendChart from '../components/ScoreTrendChart.jsx'

const tabs = [
  ['reports', '报告查看'], ['scores', '评分管理'], ['comments', '评论管理'], ['statistics', '数据统计'],
]
const pageCopy = {
  reports: ['报告查看', '查看当前课程与路线下的全部学生报告及生成状态。', 'report'],
  scores: ['评分管理', '快速筛选报告并新增或修改报告评分。', 'score'],
  comments: ['评论管理', '查看和维护学生报告的教师评语。', 'comment'],
  statistics: ['数据统计', '查看后端汇总的评分分布与平均分趋势。', 'chart'],
}
const statusLabels = { completed: '已完成', processing: '生成中', failed: '生成失败' }
const colors = ['#557531', '#7898c5', '#e4b548', '#c86d49']
const distributionKeys = [['excellent', '优秀'], ['good', '良好'], ['pass', '及格'], ['fail', '不及格']]

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN')
}

function errorText(_error, fallback) { return fallback }

function StatusBadge({ status }) {
  return <span className={`management-badge is-${status}`}>{statusLabels[status] || status || '—'}</span>
}

function EvaluationMetrics({ summary }) {
  return <div className="management-metrics evaluation-metrics">
    <article><span>总报告</span><strong>{summary?.total_reports ?? 0}</strong></article>
    <article><span>已评分</span><strong>{summary?.graded_reports ?? 0}</strong></article>
    <article><span>待评分</span><strong>{summary?.ungraded_reports ?? 0}</strong></article>
    <article><span>平均分</span><strong>{summary?.average_score ?? 0}</strong></article>
  </div>
}

function DistributionChart({ summary, showCounts = false }) {
  const percents = distributionKeys.map(([key]) => Number(summary?.score_distribution_percent?.[key]) || 0)
  const hasScores = percents.some((value) => value > 0)
  return <section className="management-panel evaluation-chart-card">
    <h2>报告评分分布</h2>
    {!hasScores ? <div className="management-empty compact-chart-empty">暂无评分数据</div> : <div className="evaluation-distribution">
      <ProgressDonut value={summary?.graded_reports ?? 0} label="已评分报告" segments={percents} colors={colors} />
      <ul className="chart-legend">{distributionKeys.map(([key, label], index) => <li key={key}><i style={{ background: colors[index] }} /><span>{label}</span><strong>{showCounts ? `${summary?.score_distribution?.[key] ?? 0} 人 · ` : ''}{percents[index]}%</strong></li>)}</ul>
    </div>}
  </section>
}

function ReportTable({ reports, onDetail }) {
  if (!reports.length) return <div className="management-empty">当前路线暂无学生报告</div>
  return <div className="management-table-wrap"><table className="management-table evaluation-table"><thead><tr><th>学生</th><th>报告状态</th><th>创建时间</th><th>当前评分</th><th>教师评语</th><th>操作</th></tr></thead><tbody>{reports.map((report) => <tr key={report.report_id}>
    <td><strong>{report.student_name || '—'}</strong><small>{report.student_number || '—'}</small></td>
    <td><StatusBadge status={report.status} /></td>
    <td>{formatDate(report.create_time)}</td><td>{report.score ?? '未评分'}</td><td>{typeof report.comment === 'string' && report.comment.trim() ? '已有评语' : '暂无评语'}</td>
    <td><button className="table-action" type="button" onClick={() => onDetail(report.report_id)}>查看详情</button></td>
  </tr>)}</tbody></table></div>
}

function ScoreTable({ reports, filter, onFilter, onEdit }) {
  const rows = reports.filter((report) => filter === 'all' || (filter === 'graded' ? report.score != null : report.score == null))
  return <section className="management-panel"><div className="panel-toolbar"><h2>学生报告评分</h2><div className="evaluation-filters">{[['all','全部'],['ungraded','未评分'],['graded','已评分']].map(([key,label]) => <button key={key} className={filter === key ? 'is-active' : ''} onClick={() => onFilter(key)}>{label}</button>)}</div></div>
    {rows.length ? <div className="management-table-wrap"><table className="management-table"><thead><tr><th>学生</th><th>报告时间</th><th>当前评分</th><th>操作</th></tr></thead><tbody>{rows.map((report) => <tr key={report.report_id}><td><strong>{report.student_name}</strong><small>{report.student_number}</small></td><td>{formatDate(report.create_time)}</td><td>{report.score ?? '未评分'}</td><td><button className="table-action" onClick={() => onEdit(report)}>编辑评分</button></td></tr>)}</tbody></table></div> : <div className="management-empty">当前筛选下暂无报告</div>}
  </section>
}

function CommentTable({ reports, filter, onFilter, onEdit }) {
  const hasComment = (report) => typeof report.comment === 'string' && report.comment.trim() !== ''
  const rows = reports.filter((report) => filter === 'all' || (filter === 'commented' ? hasComment(report) : !hasComment(report)))
  return <section className="management-panel"><div className="panel-toolbar"><h2>学生报告评语</h2><div className="evaluation-filters">{[['all','全部'],['uncommented','未评论'],['commented','已评论']].map(([key,label]) => <button key={key} className={filter === key ? 'is-active' : ''} onClick={() => onFilter(key)}>{label}</button>)}</div></div>
    {rows.length ? <div className="management-table-wrap"><table className="management-table"><thead><tr><th>学生</th><th>当前评分</th><th>当前评语</th><th>操作</th></tr></thead><tbody>{rows.map((report) => <tr key={report.report_id}><td><strong>{report.student_name}</strong><small>{report.student_number}</small></td><td>{report.score ?? '未评分'}</td><td className="comment-summary">{hasComment(report) ? report.comment : '暂无评论'}</td><td><button className="table-action" onClick={() => onEdit(report)}>编辑评语</button></td></tr>)}</tbody></table></div> : <div className="management-empty">当前筛选下暂无报告</div>}
  </section>
}

function ReportDetailDrawer({ data, loading, error, onClose }) {
  if (!loading && !data && !error) return null
  return <div className="management-modal-backdrop" onMouseDown={onClose}><aside className="management-drawer report-detail-drawer" onMouseDown={(event) => event.stopPropagation()}><button className="drawer-close" onClick={onClose}>×</button><h2>报告详情</h2>
    {loading ? <div className="content-status">正在加载报告详情...</div> : error ? <div className="management-alert">{error}</div> : <>
      <p>{data.student?.student_name || '—'} · {data.student?.student_number || '—'}</p>
      <div className="report-detail-grid"><section><h3>学生信息</h3><dl>{[['姓名',data.student?.student_name],['学号',data.student?.student_number],['学院',data.student?.college],['专业',data.student?.major],['年级',data.student?.grade]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl></section><section><h3>路线信息</h3><dl><div><dt>路线名称</dt><dd>{data.route?.route_name || '—'}</dd></div><div><dt>路线描述</dt><dd>{data.route?.route_description || '—'}</dd></div></dl></section></div>
      <section className="report-copy"><h3>报告内容</h3><div className="report-meta"><StatusBadge status={data.status} /><span>{formatDate(data.create_time)}</span></div><p>{data.report_text || '暂无报告内容'}</p>{data.error_message && <div className="management-alert">{data.error_message}</div>}</section>
      <section className="report-copy"><h3>教师评价</h3>{data.evaluation ? <><p><b>评分：</b>{data.evaluation.score ?? '未评分'}</p><p><b>评语：</b>{data.evaluation.comment || '暂无评论'}</p></> : <div className="management-empty">该报告尚未评价</div>}</section>
    </>}
  </aside></div>
}

function EditEvaluationDrawer({ mode, report, saving, error, onClose, onSave }) {
  const [value, setValue] = useState(mode === 'score' ? (report?.score ?? '') : (report?.comment ?? ''))
  const [validation, setValidation] = useState('')
  if (!report) return null
  const submit = (event) => {
    event.preventDefault(); setValidation('')
    if (mode === 'score') {
      const score = Number(value)
      if (value === '' || !Number.isFinite(score) || score < 0 || score > 100) { setValidation('请输入 0-100 之间的数字'); return }
      onSave({ score })
    } else onSave({ comment: value })
  }
  return <div className="management-modal-backdrop" onMouseDown={onClose}><aside className="management-drawer evaluation-editor" onMouseDown={(event) => event.stopPropagation()}><button className="drawer-close" onClick={onClose}>×</button><h2>{mode === 'score' ? '编辑评分' : '编辑评语'}</h2><p>{report.student_name} · {report.student_number}</p><form onSubmit={submit}>
    {mode === 'score' ? <label><span>报告评分（0-100）</span><input type="number" min="0" max="100" step="any" value={value} onChange={(event) => setValue(event.target.value)} autoFocus /></label> : <label><span>教师评语</span><textarea maxLength="5000" rows="10" value={value} onChange={(event) => setValue(event.target.value)} autoFocus /><small>{String(value).length} / 5000 字</small></label>}
    {(validation || error) && <div className="management-alert">{validation || error}</div>}<div className="editor-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={saving}>取消</button><button type="submit" className="primary-button" disabled={saving}>{saving ? '保存中...' : '保存评价'}</button></div>
  </form></aside></div>
}

export default function EvaluationPage({ initialTab = 'reports' }) {
  const { teacher } = useOutletContext()
  const [courses, setCourses] = useState([]), [routes, setRoutes] = useState([])
  const [courseId, setCourseId] = useState(''), [routeId, setRouteId] = useState('')
  const [reports, setReports] = useState([]), [summary, setSummary] = useState(null)
  const [loadingContext, setLoadingContext] = useState(true), [loading, setLoading] = useState(false)
  const [error, setError] = useState(''), [filter, setFilter] = useState('all')
  const [detail, setDetail] = useState(null), [detailLoading, setDetailLoading] = useState(false), [detailError, setDetailError] = useState('')
  const [editor, setEditor] = useState(null), [saving, setSaving] = useState(false), [saveError, setSaveError] = useState(''), [notice, setNotice] = useState('')
  const requestVersion = useRef(0)
  const [title, description, icon] = pageCopy[initialTab]

  useEffect(() => { setFilter('all'); setEditor(null); setDetail(null); setNotice('') }, [initialTab])
  useEffect(() => {
    let active = true; setLoadingContext(true); setError('')
    Promise.all([getTeacherCourses(teacher.id), getTeacherRoutes(teacher.id)]).then(([courseData, routeData]) => {
      if (!active) return
      const nextCourses = Array.isArray(courseData) ? courseData : []
      setCourses(nextCourses); setRoutes(Array.isArray(routeData) ? routeData.filter((route) => route.is_active !== false) : [])
      setCourseId(nextCourses[0]?.id != null ? String(nextCourses[0].id) : '')
    }).catch((requestError) => active && setError(errorText(requestError, '课程与路线加载失败，请稍后重试'))).finally(() => active && setLoadingContext(false))
    return () => { active = false }
  }, [teacher.id])
  const courseRoutes = useMemo(() => routes.filter((route) => Number(route.course_id) === Number(courseId)), [routes, courseId])
  useEffect(() => { setRouteId(courseRoutes[0]?.id != null ? String(courseRoutes[0].id) : '') }, [courseId, courseRoutes])

  const loadData = async (version = requestVersion.current) => {
    if (!courseId || !routeId) return
    const needReports = initialTab !== 'statistics'
    const needSummary = initialTab === 'statistics'
    setLoading(true); setError('')
    try {
      const result = needReports ? await getReports(teacher.id, courseId, routeId) : await getEvaluationSummary(teacher.id, courseId, routeId)
      if (version !== requestVersion.current) return
      if (needReports) setReports(result); else setSummary(result)
    } catch (requestError) { if (version === requestVersion.current) setError(errorText(requestError, needReports ? '报告加载失败，请稍后重试' : '评价统计加载失败，请稍后重试')) }
    finally { if (version === requestVersion.current) setLoading(false) }
  }
  useEffect(() => {
    requestVersion.current += 1; const version = requestVersion.current
    setReports([]); setSummary(null); setDetail(null); setEditor(null); setError(''); setNotice('')
    if (!courseId || !routeId) { setLoading(false); return }
    loadData(version)
  }, [courseId, routeId, initialTab, teacher.id])

  const openDetail = async (reportId) => {
    setDetail(null); setDetailError(''); setDetailLoading(true)
    try { setDetail(await getReportDetail(teacher.id, courseId, routeId, reportId)) }
    catch (requestError) { setDetailError(errorText(requestError, '报告详情加载失败，请稍后重试')) }
    finally { setDetailLoading(false) }
  }
  const saveEvaluation = async (payload) => {
    setSaving(true); setSaveError('')
    try {
      await saveReportEvaluation(teacher.id, courseId, routeId, editor.report_id, payload)
      setReports((rows) => rows.map((row) => row.report_id === editor.report_id ? { ...row, ...payload } : row))
      if (detail?.report_id === editor.report_id) setDetail((old) => ({ ...old, evaluation: { ...(old.evaluation || {}), ...payload } }))
      const [reportsResult, summaryResult] = await Promise.allSettled([getReports(teacher.id, courseId, routeId), getEvaluationSummary(teacher.id, courseId, routeId)])
      if (reportsResult.status === 'fulfilled') setReports(reportsResult.value)
      if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value)
      setEditor(null); setNotice(reportsResult.status === 'fulfilled' && summaryResult.status === 'fulfilled' ? '评价保存成功' : '评价已保存，最新统计暂时加载失败')
    } catch (requestError) { setSaveError(errorText(requestError, '评价保存失败，请稍后重试')) }
    finally { setSaving(false) }
  }
  const hasCourse = Boolean(courseId), hasRoute = Boolean(routeId)
  return <div className="inner-page evaluation-page"><div className="page-title-row"><div><p>教学评价</p><h1>{title}</h1><span>{description}</span></div><span className="page-title-icon"><Icon name={icon} size={30} /></span></div>
    <section className="management-context"><label><span>课程</span><select value={courseId} onChange={(event) => { setRouteId(''); setReports([]); setSummary(null); setDetail(null); setCourseId(event.target.value) }} disabled={loadingContext || !courses.length}>{courses.length ? courses.map((course) => <option key={course.id} value={course.id}>{course.course_name}</option>) : <option value="">暂无课程</option>}</select></label><label><span>路线</span><select value={routeId} onChange={(event) => { setReports([]); setSummary(null); setDetail(null); setRouteId(event.target.value) }} disabled={!hasCourse || !courseRoutes.length}>{courseRoutes.length ? courseRoutes.map((route) => <option key={route.id} value={route.id}>{route.route_name || route.name}</option>) : <option value="">该课程暂无路线</option>}</select></label><div className="management-overview"><span>当前报告<strong>{summary?.total_reports ?? reports.length}</strong></span><span>当前平均分<strong>{summary?.average_score ?? '—'}</strong></span></div></section>
    <nav className="management-tabs">{tabs.map(([key,label]) => <Link key={key} className={initialTab === key ? 'is-active' : ''} to={`/${key}`}>{label}</Link>)}</nav>
    {notice && <div className="content-status success-message">{notice}</div>}{error && <div className="management-alert" role="alert">{error}</div>}
    {loadingContext ? <div className="content-status">正在加载课程与路线...</div> : !hasCourse ? <div className="empty-state"><h2>暂无课程</h2><p>请先创建课程后再进行教学评价。</p></div> : !hasRoute ? <div className="empty-state"><h2>该课程暂无路线</h2><p>请先创建有效路线。</p></div> : loading ? <div className="content-status">{initialTab === 'statistics' ? '正在加载评价统计...' : '正在加载报告...'}</div> : !error && <>
      {initialTab === 'reports' && <section className="management-panel"><h2>学生报告</h2><ReportTable reports={reports} onDetail={openDetail} /></section>}
      {initialTab === 'scores' && <ScoreTable reports={reports} filter={filter} onFilter={setFilter} onEdit={(report) => { setSaveError(''); setEditor(report) }} />}
      {initialTab === 'comments' && <CommentTable reports={reports} filter={filter} onFilter={setFilter} onEdit={(report) => { setSaveError(''); setEditor(report) }} />}
      {initialTab === 'statistics' && <><EvaluationMetrics summary={summary} /><div className="evaluation-statistics-grid"><DistributionChart summary={summary} showCounts /><ScoreTrendChart values={summary?.score_trend || []} /></div></>}
    </>}
    <ReportDetailDrawer data={detail} loading={detailLoading} error={detailError} onClose={() => { setDetail(null); setDetailError(''); setDetailLoading(false) }} />
    <EditEvaluationDrawer key={`${initialTab}-${editor?.report_id || ''}`} mode={initialTab === 'scores' ? 'score' : 'comment'} report={editor} saving={saving} error={saveError} onClose={() => !saving && setEditor(null)} onSave={saveEvaluation} />
  </div>
}
