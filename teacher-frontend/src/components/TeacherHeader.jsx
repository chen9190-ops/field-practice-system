import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'
import { teacherFallback } from '../data/teacherMock.js'

const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

export default function TeacherHeader({ teacher, onMenu }) {
  const current = { ...teacherFallback, ...teacher }
  const today = new Date()
  const dateLabel = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 ${weekdays[today.getDay()]}`
  return (
    <header className="teacher-header">
      <button className="mobile-menu" type="button" onClick={onMenu} aria-label="打开菜单"><Icon name="menu" /></button>
      <div className="header-welcome"><h1>欢迎回来，{current.name}</h1><p>今天是 {dateLabel}</p></div>
      <div className="header-actions">
        <button className="notification-button" type="button" aria-label="消息通知"><Icon name="bell" /><span>3</span></button>
        <Link className="teacher-identity" to="/profile">
          <span className="avatar">{current.name?.slice(0, 1) || '师'}</span>
          <span><strong>{current.name}</strong><small>{current.department || current.title}</small></span>
          <Icon name="chevron" size={16} />
        </Link>
      </div>
    </header>
  )
}
