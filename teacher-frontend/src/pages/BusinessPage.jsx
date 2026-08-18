import { Link } from 'react-router-dom'
import Icon from '../components/Icon.jsx'

const pageConfig = {
  students: ['学生列表', '学生管理', 'students', '集中查看参与课程的学生信息。学生聚合接口接入后，数据将在此处展示。'],
  completion: ['完成度总览', '学生管理', 'progress', '按课程和路线查看学生任务整体完成情况。'],
  attendance: ['签到管理', '学生管理', 'check', '查看各路线观察点的签到进度与异常情况。'],
  observations: ['观察记录', '学生管理', 'record', '汇总学生提交的野外观察记录，支持后续筛选与查看。'],
  'ai-analysis': ['AI分析', '学生管理', 'ai', '查看学生观察记录的智能分析结果与处理状态。'],
  reports: ['报告查看', '教学评价', 'report', '查看学生实习报告及报告生成状态。'],
  scores: ['评分管理', '教学评价', 'score', '对已提交的学生实习报告进行评分。'],
  comments: ['评论管理', '教学评价', 'comment', '查看和维护学生报告的教师评语'],
  statistics: ['数据统计', '教学评价', 'chart', '从课程、路线、完成度与评价等维度分析教学数据。'],
}

export default function BusinessPage({ type }) {
  const [title, section, icon, description] = pageConfig[type]
  return (
    <div className="inner-page">
      <div className="page-title-row"><div><p>{section}</p><h1>{title}</h1><span>{description}</span></div><span className="page-title-icon"><Icon name={icon} size={30} /></span></div>
      <section className="empty-state"><span><Icon name={icon} size={34} /></span><h2>暂无可展示数据</h2><p>当前后端暂未提供此教师端聚合接口，页面结构已预留，接入后无需调整导航与布局。</p><Link to="/dashboard">返回工作台</Link></section>
    </div>
  )
}
