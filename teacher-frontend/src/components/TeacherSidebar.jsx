import { NavLink, useNavigate } from 'react-router-dom'
import Icon from './Icon.jsx'
import PlatformLogo from './PlatformLogo.jsx'
import { clearStoredTeacher } from '../utils/teacherAuth.js'

export const navGroups = [
  { label: '发布管理', items: [
    ['我的课程', '/courses', 'course'], ['我的路线', '/routes', 'route'], ['创建课程', '/courses/create', 'add'], ['创建路线', '/routes/create', 'route'], ['添加观察点', '/points/create', 'point'], ['发布路线', '/routes/publish', 'send'],
  ] },
  { label: '学生管理', items: [
    ['学生列表', '/students', 'students'], ['完成度总览', '/completion', 'progress'], ['签到管理', '/attendance', 'check'], ['观察记录', '/observations', 'record'], ['AI分析', '/ai-analysis', 'ai'],
  ] },
  { label: '教学评价', items: [
    ['报告查看', '/reports', 'report'], ['评分管理', '/scores', 'score'], ['评论管理', '/comments', 'comment'], ['数据统计', '/statistics', 'chart'],
  ] },
]

export default function TeacherSidebar({ open, collapsed, onClose, onCollapse }) {
  const navigate = useNavigate()
  function logout() {
    clearStoredTeacher()
    navigate('/login', { replace: true })
  }
  return (
    <aside className={`teacher-sidebar ${open ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`}>
      <NavLink className="teacher-brand" to="/dashboard" onClick={onClose}>
        <PlatformLogo />
        <span className="brand-copy"><strong>野外实习教学平台</strong><small>FIELD PRACTICE TEACHER</small></span>
      </NavLink>
      <nav className="sidebar-nav" aria-label="教师端主导航">
        {navGroups.map((group) => (
          <section className="nav-group" key={group.label}>
            <h2>{group.label}部分</h2>
            {group.items.map(([label, path, icon]) => (
              <NavLink key={path} to={path} end={path === '/courses' || path === '/routes'} onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Icon name={icon} size={20} /><span>{label}</span>
              </NavLink>
            ))}
          </section>
        ))}
      </nav>
      <div className="sidebar-footer">
        <NavLink className="nav-item" to="/profile" onClick={onClose}><Icon name="settings" size={20} /><span>个人与设置</span></NavLink>
        <button
          className="nav-item sidebar-collapse-button"
          type="button"
          onClick={onCollapse}
          aria-expanded={!collapsed}
          aria-label={collapsed ? '展开菜单' : '收起菜单'}
          title={collapsed ? '展开菜单' : '收起菜单'}
        >
          <Icon name="menu" size={20} /><span>{collapsed ? '展开菜单' : '收起菜单'}</span>
        </button>
        <button className="nav-item logout-item" type="button" onClick={logout}><Icon name="logout" size={20} /><span>退出登录</span></button>
      </div>
      <div className="sidebar-landscape" aria-hidden="true"><span /><i /><b /></div>
    </aside>
  )
}
