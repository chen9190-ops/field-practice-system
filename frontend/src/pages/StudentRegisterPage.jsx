import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerStudent } from "../api/student";
import { headerSignBg } from "../assets";
import { recordCardBackground } from "../assets/checkin-records";
import { autoCheckinButtonBg } from "../assets/map-page";
import { profileMenuRowBackground } from "../assets/profile-ui";
import loginFieldBackground from "../assets/student-login/login_field_background_v3.webp";
import { MobilePageShell } from "../components/layout/MobilePageShell";
import "./StudentRegisterPage.css";

const INITIAL_FORM = {
  student_name: "",
  student_number: "",
  college: "",
  major: "",
  grade: "",
  password: "",
};

const FIELDS = [
  { name: "student_name", label: "姓名", placeholder: "请输入姓名", autoComplete: "name", required: true },
  { name: "student_number", label: "学号", placeholder: "请输入学号", autoComplete: "username", required: true },
  { name: "college", label: "学院", placeholder: "请输入学院", autoComplete: "organization", required: true },
  { name: "major", label: "专业", placeholder: "请输入专业（选填）" },
  { name: "grade", label: "年级", placeholder: "请输入年级（选填）" },
  { name: "password", label: "密码", placeholder: "请输入密码", autoComplete: "new-password", required: true, type: "password" },
];

export function StudentRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const { data } = await registerStudent({
        student_name: form.student_name.trim(),
        student_number: form.student_number.trim(),
        college: form.college.trim(),
        password: form.password,
        major: form.major.trim(),
        grade: form.grade.trim(),
      });

      if (data?.message === "学生注册成功") {
        navigate("/student/login", {
          replace: true,
          state: { registrationMessage: "注册成功，请登录" },
        });
        return;
      }

      if (data?.message === "该学生已注册") {
        setError("该学号已经注册");
        return;
      }

      setError(data?.message || "注册失败，请稍后重试");
    } catch {
      setError("注册服务暂时不可用，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MobilePageShell className="student-register-page">
      <img
        className="student-register-page__background"
        src={loginFieldBackground}
        alt=""
        aria-hidden="true"
      />
      <div className="student-register-page__wash" aria-hidden="true" />

      <header className="student-register-brand">
        <img src={headerSignBg} alt="" aria-hidden="true" />
        <h1>野外实习助手</h1>
      </header>

      <form className="student-register-form" onSubmit={handleSubmit}>
        <img
          className="student-register-form__paper"
          src={recordCardBackground}
          alt=""
          aria-hidden="true"
        />
        <div className="student-register-form__content">
          <p className="student-register-form__eyebrow">STUDENT · 学生端</p>
          <h2>注册实习账号</h2>

          <div className="student-register-fields">
            {FIELDS.map((field) => (
              <label className="student-register-field" htmlFor={`register-${field.name}`} key={field.name}>
                <span>{field.label}</span>
                <span className="student-register-field__control">
                  <img src={profileMenuRowBackground} alt="" aria-hidden="true" />
                  <input
                    id={`register-${field.name}`}
                    name={field.name}
                    type={field.type || "text"}
                    autoComplete={field.autoComplete}
                    value={form[field.name]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                </span>
              </label>
            ))}
          </div>

          <div className="student-register-form__message" aria-live="polite">
            {error && <p className="student-register-error" role="alert">{error}</p>}
          </div>

          <button
            className="student-register-submit"
            type="submit"
            disabled={isSubmitting}
            style={{ backgroundImage: `url(${autoCheckinButtonBg})` }}
          >
            {isSubmitting ? "注册中…" : "注册"}
          </button>

          <p className="student-register-login">
            已有账号？
            <button type="button" onClick={() => navigate("/student/login")}>去登录</button>
          </p>
        </div>
      </form>
    </MobilePageShell>
  );
}
