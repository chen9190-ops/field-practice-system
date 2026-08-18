import { useState } from 'react'
import { getRouteMediaUrl } from '../api/route.js'

export const statusLabels = {
  completed: '已完成', in_progress: '进行中', not_started: '未开始',
  partial: '部分签到', processing: '分析中', failed: '分析失败', not_analyzed: '未分析', analyzed: 'AI已分析',
}

export const observationLabels = { fixed: '指定点观察', free: '自由观察', checkin: '签到记录' }

export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN')
}

const Badge = ({ status }) => <span className={`management-badge is-${status}`}>{statusLabels[status] || status}</span>

function Pagination({ pagination, label, onPageChange }) {
  const page = Number(pagination?.page) || 1
  const totalPages = Number(pagination?.total_pages) || 0
  if (totalPages <= 1) return null
  return <nav className="management-pagination" aria-label={`${label}分页`}><span>共 {pagination?.total ?? 0} 条</span><div><button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>上一页</button><strong>第 {page} / {totalPages} 页</strong><button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>下一页</button></div></nav>
}

function ObservationPhoto({ path }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <span className="observation-photo-fallback">图片加载失败</span>
  return <a href={getRouteMediaUrl(path)} target="_blank" rel="noreferrer"><img src={getRouteMediaUrl(path)} alt="观察记录" onError={() => setFailed(true)} /></a>
}

export function StudentListPanel({ students }) {
  const [query, setQuery] = useState('')
  const keyword = query.trim().toLowerCase()
  const visible = students.filter((student) => (
    !keyword || student.student_name?.toLowerCase().includes(keyword)
    || student.student_number?.toLowerCase().includes(keyword)
  ))
  return <section className="management-panel"><div className="panel-toolbar"><h2>学生列表</h2><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索姓名或学号" /></div>{visible.length ? <div className="management-table-wrap"><table className="management-table"><thead><tr><th>姓名</th><th>学号</th><th>学院</th><th>专业</th><th>年级</th></tr></thead><tbody>{visible.map((student) => <tr key={student.id}><td><strong>{student.student_name}</strong></td><td>{student.student_number}</td><td>{student.college || '—'}</td><td>{student.major || '—'}</td><td>{student.grade || '—'}</td></tr>)}</tbody></table></div> : <div className="management-empty">该课程暂无学生</div>}</section>
}

export function ProgressPanel({ data }) {
  const rows = Array.isArray(data?.students) ? data.students : []
  return <><div className="management-metrics"><article><span>整体完成度</span><strong>{data?.completion_rate ?? 0}%</strong></article><article><span>已完成</span><strong>{data?.completed_students ?? 0}</strong></article><article><span>进行中</span><strong>{data?.in_progress_students ?? 0}</strong></article><article><span>未开始</span><strong>{data?.not_started_students ?? 0}</strong></article></div><section className="management-panel"><h2>学生完成明细</h2>{rows.length ? <div className="management-table-wrap"><table className="management-table"><thead><tr><th>学生</th><th>固定观察</th><th>自由观察</th><th>总体</th><th>完成度</th><th>状态</th></tr></thead><tbody>{rows.map((item) => <tr key={item.student_id}><td><strong>{item.student_name}</strong><small>{item.student_number}</small></td><td>{item.fixed_completed} / {item.fixed_total}</td><td>{item.free_completed} / {item.free_required}</td><td>{item.overall_completed} / {item.overall_total}</td><td>{item.completion_rate}%</td><td><Badge status={item.status} /></td></tr>)}</tbody></table></div> : <div className="management-empty">该路线暂无完成度数据</div>}</section></>
}

export function CheckinPanel({ data }) {
  const rows = Array.isArray(data?.students) ? data.students : []
  return <><div className="management-metrics"><article><span>签到完成</span><strong>{data?.fully_checked_in_students ?? 0} / {data?.total_students ?? 0}</strong></article><article><span>部分签到</span><strong>{data?.partial_students ?? 0}</strong></article><article><span>未签到</span><strong>{data?.not_started_students ?? 0}</strong></article><article><span>路线点位</span><strong>{data?.total_points ?? 0}</strong></article></div><section className="management-panel"><h2>签到管理</h2>{rows.length ? <div className="management-table-wrap"><table className="management-table"><thead><tr><th>学生</th><th>签到点位</th><th>签到完成率</th><th>最后签到时间</th><th>状态</th></tr></thead><tbody>{rows.map((item) => <tr key={item.student_id}><td><strong>{item.student_name}</strong><small>{item.student_number}</small></td><td>{item.checked_in_points} / {item.total_points}</td><td>{item.checkin_rate}%</td><td>{formatDate(item.last_checkin_at)}</td><td><Badge status={item.status} /></td></tr>)}</tbody></table></div> : <div className="management-empty">该路线暂无签到数据</div>}</section></>
}

export function ObservationPanel({ data, students, points, filters, onFilter, onPageChange }) {
  const rows = Array.isArray(data?.items) ? data.items : []
  return <section className="management-panel"><div className="panel-toolbar"><h2>观察记录</h2><div className="inline-filters"><select value={filters.student_id} onChange={(e) => onFilter('student_id', e.target.value)}><option value="">全部学生</option>{students.map((s) => <option key={s.id} value={s.id}>{s.student_name}</option>)}</select><select value={filters.point_id} onChange={(e) => onFilter('point_id', e.target.value)}><option value="">全部点位</option>{points.map((point) => <option key={point.id} value={point.id}>{point.point_name || point.name}</option>)}</select><select value={filters.observation_type} onChange={(e) => onFilter('observation_type', e.target.value)}><option value="">全部类型</option><option value="fixed">指定点观察</option><option value="free">自由观察</option><option value="checkin">签到记录</option></select></div></div>{rows.length ? <div className="observation-grid">{rows.map((item) => <article className="observation-record" key={item.id}>{item.photo_url && <ObservationPhoto path={item.photo_url} />}<div><div className="record-heading"><strong>{item.student_name} · {item.student_number}</strong><Badge status={item.has_ai_analysis ? 'analyzed' : 'not_analyzed'} /></div><small>{observationLabels[item.observation_type] || item.observation_type} · {item.point_name || '自由观察'} · {formatDate(item.observation_time)}</small><p>{item.observation_text || '暂无观察文字'}</p><em>岩石类型：{item.rock_type || '未填写'}</em></div></article>)}</div> : <div className="management-empty">该路线暂无观察记录</div>}<Pagination pagination={data?.pagination} label="观察记录" onPageChange={onPageChange} /></section>
}

export function AIAnalysisPanel({ summary, data, students, filters, onFilter, onPageChange, onDetail }) {
  const rows = Array.isArray(data?.items) ? data.items : []
  return <><div className="management-metrics ai-metrics"><article><span>AI覆盖率</span><strong>{summary?.analysis_coverage_rate ?? 0}%</strong></article><article><span>AI完成率</span><strong>{summary?.completion_rate ?? 0}%</strong></article><article><span>已完成</span><strong>{summary?.completed_analyses ?? 0}</strong></article><article><span>处理中 / 失败 / 未分析</span><strong>{summary?.processing_analyses ?? 0} / {summary?.failed_analyses ?? 0} / {summary?.not_analyzed_observations ?? 0}</strong></article></div><section className="management-panel"><div className="panel-toolbar"><h2>AI分析记录</h2><div className="inline-filters"><select value={filters.student_id} onChange={(e) => onFilter('student_id', e.target.value)}><option value="">全部学生</option>{students.map((s) => <option key={s.id} value={s.id}>{s.student_name}</option>)}</select><select value={filters.status} onChange={(e) => onFilter('status', e.target.value)}><option value="">全部状态</option><option value="completed">已完成</option><option value="processing">分析中</option><option value="failed">失败</option><option value="not_analyzed">未分析</option></select></div></div>{rows.length ? <div className="ai-record-grid">{rows.map((item) => { const status = item.ai_analysis?.status || 'not_analyzed'; return <article className="ai-record" key={item.observation_id}><div className="record-heading"><strong>{item.student?.student_name} · {item.student?.student_number}</strong><Badge status={status} /></div><small>{item.point?.name || observationLabels[item.observation_type] || '自由观察'}</small><p><b>学生记录：</b>{item.observation_text || '暂无记录'}</p><p><b>AI识别：</b>{item.ai_analysis?.rock_name || '尚未分析'}</p><p><b>置信度：</b>{item.ai_analysis?.confidence ?? '—'}</p><button type="button" onClick={() => onDetail(item.student.id)}>查看详情</button></article> })}</div> : <div className="management-empty">该路线暂无 AI 分析数据</div>}<Pagination pagination={data?.pagination} label="AI分析记录" onPageChange={onPageChange} /></section></>
}

export function StudentAIDetail({ data, onClose }) {
  if (!data) return null
  const stats = data.statistics || {}
  return <div className="management-modal-backdrop" onMouseDown={onClose}><aside className="management-drawer" onMouseDown={(e) => e.stopPropagation()}><button className="drawer-close" onClick={onClose}>×</button><h2>{data.student?.student_name} · AI分析详情</h2><p>{[data.student?.student_number, data.student?.college, data.student?.major, data.student?.grade].filter(Boolean).join(' · ')}</p><div className="drawer-stats"><span>总观察 <b>{stats.total_observations ?? 0}</b></span><span>覆盖率 <b>{stats.analysis_coverage_rate ?? 0}%</b></span><span>已完成 <b>{stats.completed ?? 0}</b></span><span>处理中 <b>{stats.processing ?? 0}</b></span><span>失败 <b>{stats.failed ?? 0}</b></span><span>未分析 <b>{stats.not_analyzed ?? 0}</b></span></div><div className="drawer-items">{(data.items || []).map((item) => <article key={item.observation_id}><div className="record-heading"><strong>{item.point?.name || '自由观察'}</strong><Badge status={item.analysis_status} /></div><p>{item.observation_text || '暂无观察文字'}</p>{item.ai_analysis && <dl>{[['AI岩石名称','rock_name'],['AI岩石类型','rock_type'],['置信度','confidence'],['构造','structure'],['矿物','mineral'],['风化','weathering'],['形成环境','formation_environment'],['不确定性','uncertainty'],['建议','suggestions'],['学生报告','student_report']].map(([label,key]) => item.ai_analysis[key] != null && <div key={key}><dt>{label}</dt><dd>{String(item.ai_analysis[key])}</dd></div>)}<div><dt>分析时间</dt><dd>{formatDate(item.ai_analysis.analysis_time)}</dd></div></dl>}</article>)}</div></aside></div>
}
