import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createTeacher } from '../api/teacher.js'

const initialForm = {
  name: '',
  email: '',
  password: '',
  phone_number: '',
  department: '',
  title: '',
  bio: '',
}

function getErrorMessage(error) {
  const detail = error.response?.data?.detail

  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).filter(Boolean).join('；') || '注册失败，请检查填写信息'
  }
  return '注册失败，请稍后重试'
}

function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState(initialForm)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await createTeacher(formData)
      navigate('/login', {
        replace: true,
        state: { message: '注册成功，请登录' },
      })
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page register-page">
      <div className="nature-mark nature-mark-left" aria-hidden="true">⌁</div>
      <div className="nature-mark nature-mark-right" aria-hidden="true">⌁</div>

      <section className="paper-card register-card" aria-labelledby="register-title">
        <p className="eyebrow">JOIN FIELD PRACTICE</p>
        <h1 id="register-title">教师注册</h1>
        <p className="register-subtitle">创建教师端账号</p>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="name">姓名</label>
            <input id="name" name="name" value={formData.name} onChange={handleChange} required />
          </div>

          <div className="form-field">
            <label htmlFor="register-email">邮箱</label>
            <input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="register-password">密码</label>
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="phone-number">手机号 <span>（可选）</span></label>
            <input
              id="phone-number"
              name="phone_number"
              type="tel"
              autoComplete="tel"
              value={formData.phone_number}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="department">学院</label>
            <input id="department" name="department" value={formData.department} onChange={handleChange} required />
          </div>

          <div className="form-field">
            <label htmlFor="title">职称</label>
            <input id="title" name="title" value={formData.title} onChange={handleChange} required />
          </div>

          <div className="form-field full-width">
            <label htmlFor="bio">个人简介</label>
            <textarea id="bio" name="bio" rows="4" value={formData.bio} onChange={handleChange} required />
          </div>

          {error && <p className="form-error full-width" role="alert">{error}</p>}

          <button className="full-width" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '注册中…' : '注册'}
          </button>

          <p className="account-switch full-width">
            已有账号？<Link to="/login">返回登录</Link>
          </p>
        </form>
      </section>
    </main>
  )
}

export default Register
