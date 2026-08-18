import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getTeacherProfile } from '../api/teacher.js'
import { getStoredTeacher } from '../utils/teacherAuth.js'

function Profile() {
  const teacher = getStoredTeacher()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!teacher?.id) return

    let isActive = true

    getTeacherProfile(teacher.id)
      .then((data) => {
        if (isActive) setProfile(data)
      })
      .catch(() => {
        if (isActive) setError('个人信息加载失败，请稍后重试')
      })

    return () => {
      isActive = false
    }
  }, [teacher?.id])

  if (!teacher?.id) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="inner-page profile-shell">
        <div className="section-heading profile-heading">
          <div>
            <p className="eyebrow">TEACHER PROFILE</p>
            <h1>个人信息</h1>
          </div>
          <span className="profile-leaf" aria-hidden="true">⌇</span>
        </div>

        {error && <p className="status-message error-message" role="alert">{error}</p>}
        {!profile && !error && <p className="status-message">正在加载个人信息…</p>}

        {profile && (
          <dl className="profile-card">
            <div><dt>姓名</dt><dd>{profile.name || '未填写'}</dd></div>
            <div><dt>邮箱</dt><dd>{profile.email || '未填写'}</dd></div>
            <div><dt>学院</dt><dd>{profile.department || '未填写'}</dd></div>
            <div><dt>职称</dt><dd>{profile.title || '未填写'}</dd></div>
            <div><dt>电话</dt><dd>{profile.phone_number || '未填写'}</dd></div>
            <div className="profile-bio"><dt>简介</dt><dd>{profile.bio || '未填写'}</dd></div>
          </dl>
        )}
    </div>
  )
}

export default Profile
