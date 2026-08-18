import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCurrentCourse,
  getStudentCourses,
  switchCurrentCourse,
} from "../api/course";
import { Background } from "../components/Background";
import { MobilePageShell } from "../components/layout/MobilePageShell";
import { backIcon } from "../assets/observation";
import { useStudentAuth } from "../context/StudentAuthContext";
import "./MyCoursesPage.css";

export function MyCoursesPage() {
  const navigate = useNavigate();
  const { student } = useStudentAuth();
  const [courses, setCourses] = useState([]);
  const [currentCourse, setCurrentCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switchingCourseId, setSwitchingCourseId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    Promise.all([
      getStudentCourses(student.id),
      getCurrentCourse(student.id),
    ])
      .then(([coursesResponse, currentCourseResponse]) => {
        if (!active) return;
        setCourses(Array.isArray(coursesResponse.data) ? coursesResponse.data : []);
        setCurrentCourse(currentCourseResponse.data || null);
      })
      .catch(() => {
        if (active) setError("课程信息加载失败，请稍后重试");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [student.id]);

  const handleSwitchCourse = async (courseId) => {
    setSwitchingCourseId(courseId);
    setError("");
    setMessage("");

    try {
      const { data } = await switchCurrentCourse(student.id, courseId);
      setCurrentCourse(data?.current_course || courses.find((course) => course.id === courseId));
      setMessage("当前课程已切换");
    } catch {
      setError("当前课程切换失败，请稍后重试");
    } finally {
      setSwitchingCourseId(null);
    }
  };

  return (
    <MobilePageShell className="my-courses-page">
      <Background />
      <div className="my-courses-page__wash" aria-hidden="true" />
      <div className="my-courses-page__content">
        <header className="my-courses-header">
          <button type="button" onClick={() => navigate("/profile")} aria-label="返回我的">
            <img src={backIcon} alt="" aria-hidden="true" />
          </button>
          <div>
            <h1>我的课程</h1>
            <p>管理你加入的实习课程</p>
          </div>
          <span aria-hidden="true" />
        </header>

        <section className="my-courses-list" aria-live="polite">
          {loading && <p className="my-courses-state">正在加载课程…</p>}
          {!loading && error && <p className="my-courses-state is-error" role="alert">{error}</p>}
          {!loading && !error && courses.length === 0 && (
            <p className="my-courses-state">暂未加入课程</p>
          )}
          {message && <p className="my-courses-message" role="status">{message}</p>}

          {!loading && courses.map((course) => {
            const isCurrent = course.id === currentCourse?.id;
            return (
              <article className={`my-course-card${isCurrent ? " is-current" : ""}`} key={course.id}>
                <div className="my-course-card__heading">
                  <span className="my-course-card__eyebrow">
                    {isCurrent ? "CURRENT COURSE · 当前课程" : "FIELD COURSE · 实习课程"}
                  </span>
                  <h2>{course.name}</h2>
                  <p>{course.description || "暂无课程描述"}</p>
                </div>
                <button
                  type="button"
                  className={isCurrent ? "is-current" : ""}
                  disabled={isCurrent || switchingCourseId === course.id}
                  onClick={() => handleSwitchCourse(course.id)}
                >
                  {isCurrent
                    ? "当前课程"
                    : switchingCourseId === course.id ? "切换中…" : "切换到此课程"}
                </button>
              </article>
            );
          })}

          {!loading && (
            <button
              type="button"
              className="my-courses-add"
              onClick={() => navigate("/courses/select", { state: { source: "my-courses" } })}
            >
              ＋ 新增课程
            </button>
          )}
        </section>
      </div>
    </MobilePageShell>
  );
}
