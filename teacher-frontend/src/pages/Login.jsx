import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { teacherLogin } from '../api/teacher.js'
import PlatformLogo from '../components/PlatformLogo.jsx'
import { storeTeacher } from '../utils/teacherAuth.js'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [remember, setRemember] = useState(true)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const teacher = await teacherLogin(email, password)

      if (teacher?.access_token) {
        localStorage.setItem('access_token', teacher.access_token)
      }

      storeTeacher(teacher)
      navigate('/dashboard')
    } catch (requestError) {
      setError(requestError.response?.status === 401 ? '账号或密码错误' : '登录服务暂时不可用，请检查后端服务')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page teacher-login-page">
      <section className="paper-card login-card" aria-labelledby="login-title">
        <div className="login-card-brand">
          <PlatformLogo />
          <div><strong>野外实习教学平台</strong><small>FIELD PRACTICE TEACHER</small></div>
        </div>
        <p className="eyebrow">WELCOME BACK</p>
        <h1 id="login-title">教师登录</h1>
        <p className="login-subtitle">登录野外实习教学管理平台</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">账号或工号</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="请输入教师邮箱"
            required
          />

          <label htmlFor="password">密码</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="请输入密码"
            required
          />

          <div className="login-options"><label><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />记住密码</label><button type="button" onClick={() => setError('请联系系统管理员重置密码')}>忘记密码？</button></div>

          {location.state?.message && (
            <p className="form-success" role="status">{location.state.message}</p>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '登录中…' : '登录教师平台'}
          </button>

          <p className="account-switch">
            还没有账号？<Link to="/register">立即注册</Link>
          </p>
        </form>
      </section>
    </main>
  )
}

export default Login
