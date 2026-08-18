import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getMyCourses,
  getTeacherCourses,
  getTeachers,
  joinCourse,
} from "../api/course";
import { bgMain, headerSignBg } from "../assets";
import { backIcon } from "../assets/observation";
import { useStudentAuth } from "../context/StudentAuthContext";
import { MobilePageShell } from "../components/layout/MobilePageShell";
import "./CourseSelectPage.css";

function readCourses(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.courses)) return data.courses;
  return [];
}

export function CourseSelectPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { student } = useStudentAuth();
  const fromMyCourses = location.state?.source === "my-courses";
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);
  const [error, setError] = useState("");
  const [joinedCourseIds, setJoinedCourseIds] = useState([]);
  const teacherRequestId = useRef(0);

  useEffect(() => {
    let active = true;

    async function loadTeachers() {
      setLoading(true);
      setError("");

      try {
        const myCoursesResponse = await getMyCourses(student.id);

        if (!active) return;

        const joinedCourses = readCourses(myCoursesResponse.data);
        setJoinedCourseIds(joinedCourses.map((course) => course.id));

        if (!fromMyCourses && joinedCourses.length > 0) {
          navigate("/", { replace: true });
          return;
        }

        const teachersResponse = await getTeachers();
        if (active) {
          setTeachers(Array.isArray(teachersResponse.data) ? teachersResponse.data : []);
        }
      } catch {
        if (active) setError("教师列表加载失败，请稍后重试");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTeachers();

    return () => {
      active = false;
    };
  }, [fromMyCourses, navigate, student.id]);

  const handleSelectTeacher = async (teacher) => {
    const requestId = teacherRequestId.current + 1;
    teacherRequestId.current = requestId;
    setSelectedTeacher(teacher);
    setCourses([]);
    setError("");
    setLoading(true);

    try {
      const { data } = await getTeacherCourses(teacher.id);
      if (teacherRequestId.current === requestId) {
        setCourses(readCourses(data).filter((course) => !joinedCourseIds.includes(course.id)));
      }
    } catch {
      if (teacherRequestId.current === requestId) {
        setError("课程列表加载失败，请稍后重试");
      }
    } finally {
      if (teacherRequestId.current === requestId) {
        setLoading(false);
      }
    }
  };

  const handleBackToTeachers = () => {
    teacherRequestId.current += 1;
    setSelectedTeacher(null);
    setCourses([]);
    setError("");
    setLoading(false);
  };

  const handlePageBack = () => {
    if (fromMyCourses) {
      navigate("/my-courses", { replace: true });
      return;
    }

    if ((window.history.state?.idx || 0) > 0) {
      navigate(-1);
    } else {
      navigate("/", { replace: true });
    }
  };

  const handleJoin = async (courseId) => {
    setJoiningId(courseId);
    setError("");

    try {
      await joinCourse(student.id, courseId);
      navigate(fromMyCourses ? "/my-courses" : "/", { replace: true });
    } catch {
      setError("加入课程失败，请稍后重试");
      setJoiningId(null);
    }
  };

  return (
    <MobilePageShell className="course-select-page">
      <img className="course-select-page__background" src={bgMain} alt="" aria-hidden="true" />
      <div className="course-select-page__wash" aria-hidden="true" />

      <div className="course-select-page__content">
        {!selectedTeacher && (
          <button
            className="course-select-page-back"
            type="button"
            onClick={handlePageBack}
            aria-label={fromMyCourses ? "返回我的课程" : "返回上一页"}
          >
            <img src={backIcon} alt="" aria-hidden="true" />
          </button>
        )}

        <header className="course-select-header">
          <img src={headerSignBg} alt="" aria-hidden="true" />
          <h1>{selectedTeacher ? "选择实习课程" : "选择授课教师"}</h1>
          <p>
            {selectedTeacher
              ? `选择 ${selectedTeacher.name} 的课程`
              : "选择你的授课老师，查看对应的实习课程"}
          </p>
        </header>

        {selectedTeacher && (
          <button
            className="course-select-back"
            type="button"
            onClick={handleBackToTeachers}
            disabled={joiningId !== null}
          >
            ← 返回选择教师
          </button>
        )}

        <section className="course-select-list" aria-live="polite">
          {loading && (
            <p className="course-select-state">
              {selectedTeacher ? "正在加载课程…" : "正在加载教师…"}
            </p>
          )}
          {!loading && error && <p className="course-select-state is-error" role="alert">{error}</p>}
          {!loading && !error && !selectedTeacher && teachers.length === 0 && (
            <p className="course-select-state">暂无可选择的授课教师</p>
          )}
          {!loading && !error && selectedTeacher && courses.length === 0 && (
            <p className="course-select-state">
              {fromMyCourses ? "该教师暂无其他可加入课程" : "该教师暂无可选择的课程"}
            </p>
          )}

          {!loading && !selectedTeacher && teachers.map((teacher) => {
            const teacherDetails = [teacher.department, teacher.title].filter(Boolean);

            return (
              <article className="course-select-card" key={teacher.id}>
                <div>
                  <h2>{teacher.name}</h2>
                  {teacherDetails.length > 0 && <p>{teacherDetails.join(" · ")}</p>}
                </div>
                <button type="button" onClick={() => handleSelectTeacher(teacher)}>
                  选择老师
                </button>
              </article>
            );
          })}

          {!loading && selectedTeacher && courses.map((course) => (
            <article className="course-select-card" key={course.id}>
              <div>
                <h2>{course.course_name}</h2>
                <p>{course.course_description || "暂无课程描述"}</p>
              </div>
              <button
                type="button"
                disabled={joiningId !== null}
                onClick={() => handleJoin(course.id)}
              >
                {joiningId === course.id ? "加入中…" : "加入课程"}
              </button>
            </article>
          ))}
        </section>
      </div>
    </MobilePageShell>
  );
}
