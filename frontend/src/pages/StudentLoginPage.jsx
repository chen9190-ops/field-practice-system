import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loginStudent } from "../api/student";
import { useStudentAuth } from "../context/StudentAuthContext";
import { headerSignBg } from "../assets";
import { recordCardBackground } from "../assets/checkin-records";
import { autoCheckinButtonBg } from "../assets/map-page";
import { profileMenuRowBackground } from "../assets/profile-ui";
import loginFieldBackground from "../assets/student-login/login_field_background_v3.png";
import { MobilePageShell } from "../components/layout/MobilePageShell";
import "./StudentLoginPage.css";

export function StudentLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useStudentAuth();
  const [studentNumber, setStudentNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const { data } = await loginStudent({
        student_number: studentNumber,
        password,
      });
      const authenticatedStudent = data?.student || data;

      if (!authenticatedStudent?.id) {
        setError(data?.message || "学号或密码错误");
        return;
      }

      if (data?.access_token) {
        localStorage.setItem("access_token", data.access_token);
      }

      login(authenticatedStudent);
      const requestedDestination = location.state?.from?.pathname;
      const destination = requestedDestination && requestedDestination !== "/"
        ? requestedDestination
        : "/courses/select";
      navigate(destination, { replace: true });
    } catch {
      setError("登录服务暂时不可用，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MobilePageShell className="student-login-page">
      <img
        className="student-login-page__background"
        src={loginFieldBackground}
        alt=""
        aria-hidden="true"
      />
      <div className="student-login-page__wash" aria-hidden="true" />

      <header className="student-login-brand">
        <img src={headerSignBg} alt="" aria-hidden="true" />
        <h1 id="student-login-title">野外实习助手</h1>
      </header>

      <form
        className="student-login-form"
        aria-labelledby="student-login-title"
        onSubmit={handleSubmit}
      >
        <img
          className="student-login-form__paper"
          src={recordCardBackground}
          alt=""
          aria-hidden="true"
        />
        <div className="student-login-form__content">
          <p className="student-login-form__eyebrow">STUDENT · 学生端</p>
          <h2>登录实习账号</h2>

          <label className="student-login-field" htmlFor="student-number">
            <span>学号</span>
            <span className="student-login-field__control">
              <img src={profileMenuRowBackground} alt="" aria-hidden="true" />
              <input
                id="student-number"
                name="student_number"
                autoComplete="username"
                value={studentNumber}
                onChange={(event) => setStudentNumber(event.target.value)}
                placeholder="请输入学号"
                required
              />
            </span>
          </label>

          <label className="student-login-field" htmlFor="student-password">
            <span>密码</span>
            <span className="student-login-field__control">
              <img src={profileMenuRowBackground} alt="" aria-hidden="true" />
              <input
                id="student-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="请输入密码"
                required
              />
              <button
                type="button"
                className="student-login-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
              >
                {showPassword ? "隐藏" : "显示"}
              </button>
            </span>
          </label>

          <div className="student-login-form__message" aria-live="polite">
            {location.state?.registrationMessage && (
              <p className="student-login-success" role="status">
                {location.state.registrationMessage}
              </p>
            )}
            {error && <p className="student-login-error" role="alert">{error}</p>}
          </div>

          <button
            className="student-login-submit"
            type="submit"
            disabled={isSubmitting}
            style={{ backgroundImage: `url(${autoCheckinButtonBg})` }}
          >
            {isSubmitting ? "登录中…" : "登录"}
          </button>

          <p className="student-login-register">
            还没有账号？
            <button type="button" onClick={() => navigate("/student/register")}>注册</button>
          </p>
        </div>
      </form>
    </MobilePageShell>
  );
}
