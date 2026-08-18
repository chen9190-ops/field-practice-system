import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import TeacherHeader from './TeacherHeader.jsx'
import TeacherSidebar from './TeacherSidebar.jsx'
import { getStoredTeacher } from '../utils/teacherAuth.js'

export default function TeacherLayout() {
  const teacher = getStoredTeacher()
  const [menuOpen, setMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  if (!teacher) return <Navigate to="/login" replace />
  return (
    <div className={`teacher-app ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <TeacherSidebar open={menuOpen} collapsed={collapsed} onClose={() => setMenuOpen(false)} onCollapse={() => setCollapsed((value) => !value)} />
      {menuOpen && <button className="sidebar-backdrop" aria-label="关闭菜单" onClick={() => setMenuOpen(false)} />}
      <div className="teacher-main"><TeacherHeader teacher={teacher} onMenu={() => setMenuOpen(true)} /><main className="teacher-content"><Outlet context={{ teacher }} /></main></div>
    </div>
  )
}
