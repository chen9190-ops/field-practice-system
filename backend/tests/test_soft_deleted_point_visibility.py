import json
import unittest
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.database import Base
from app.models.ai_analysis import AiAnalysis
from app.models.checkin import Checkin
from app.models.course import Course
from app.models.course_teacher import CourseTeachers  # noqa: F401
from app.models.create_student import CourseStudents  # noqa: F401
from app.models.observation import Observation
from app.models.point import Point
from app.models.report import Report
from app.models.route import Route
from app.models.route_path import RoutePath  # noqa: F401
from app.models.student import Student
from app.models.teacher import Teacher  # noqa: F401
from app.models.track import Track  # noqa: F401
from app.routers import teacher
from app.service.current_task_service import filter_current_observations
from app.service.report_service import (
    get_checkin_records,
    get_observation_records,
    get_student_summary,
)


class SoftDeletedPointVisibilityTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        self.session_factory = sessionmaker(bind=self.engine)
        Base.metadata.create_all(self.engine)

        db = self.session_factory()
        course = Course(course_name="地质实习")
        student = Student(
            student_name="测试学生",
            student_email="student@example.com",
            major="地质学",
            grade="2026",
        )
        db.add_all([course, student])
        db.flush()

        route = Route(
            route_name="测试路线",
            course_id=course.id,
            status="published",
            free_observation_enabled=True,
            required_free_observation_count=1,
        )
        db.add(route)
        db.flush()

        point_a = Point(
            point_name="Point A",
            latitude=30.1,
            longitude=120.1,
            route_id=route.id,
        )
        point_b = Point(
            point_name="Point B",
            latitude=30.2,
            longitude=120.2,
            route_id=route.id,
        )
        db.add_all([point_a, point_b])
        db.flush()

        checkin_a = Checkin(
            student_id=student.id,
            point_id=point_a.id,
            latitude=30.1,
            longitude=120.1,
            status="success",
        )
        checkin_b = Checkin(
            student_id=student.id,
            point_id=point_b.id,
            latitude=30.2,
            longitude=120.2,
            status="success",
        )
        observation_a = Observation(
            student_id=student.id,
            route_id=route.id,
            point_id=point_a.id,
            observation_type="checkin",
            observation_text="Point A 签到观察",
            latitude=30.1,
            longitude=120.1,
        )
        observation_b = Observation(
            student_id=student.id,
            route_id=route.id,
            point_id=point_b.id,
            observation_type="fixed",
            observation_text="Point B 固定观察",
            latitude=30.2,
            longitude=120.2,
        )
        free_observation = Observation(
            student_id=student.id,
            route_id=route.id,
            point_id=None,
            observation_type="free",
            observation_text="自由观察保留",
            latitude=30.3,
            longitude=120.3,
        )
        db.add_all([
            checkin_a,
            checkin_b,
            observation_a,
            observation_b,
            free_observation,
        ])
        db.flush()

        analysis_a = AiAnalysis(
            observation_id=observation_a.id,
            rock_name="Point A 岩石",
            status="completed",
        )
        analysis_b = AiAnalysis(
            observation_id=observation_b.id,
            rock_name="Point B 岩石",
            status="completed",
        )
        free_analysis = AiAnalysis(
            observation_id=free_observation.id,
            rock_name="自由观察岩石",
            status="completed",
        )
        report = Report(
            student_id=student.id,
            route_id=route.id,
            report_text="包含 Point A 的旧报告",
            status="completed",
        )
        db.add_all([analysis_a, analysis_b, free_analysis, report])
        db.commit()

        self.student_id = student.id
        self.route_id = route.id
        self.point_a_id = point_a.id
        self.point_b_id = point_b.id
        self.observation_a_id = observation_a.id
        self.analysis_a_id = analysis_a.id
        db.close()

    def tearDown(self):
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_soft_delete_hides_current_task_data_and_preserves_history(self):
        with patch.object(teacher, "SessionLocal", self.session_factory):
            response = teacher.delete_point(self.point_a_id)

        self.assertEqual(response["point_id"], self.point_a_id)

        db = self.session_factory()
        try:
            active_point_ids = {
                point.id
                for point in db.query(Point).filter(
                    Point.route_id == self.route_id,
                    Point.is_active == True,
                ).all()
            }
            self.assertEqual(active_point_ids, {self.point_b_id})

            report_checkins = get_checkin_records(
                db, self.student_id, self.route_id
            )
            self.assertEqual(
                {record["point_id"] for record in report_checkins},
                {self.point_b_id},
            )

            current_observations = filter_current_observations(
                db.query(Observation).filter(
                    Observation.student_id == self.student_id,
                    Observation.route_id == self.route_id,
                )
            ).all()
            self.assertEqual(
                {observation.observation_text for observation in current_observations},
                {"Point B 固定观察", "自由观察保留"},
            )

            report_observations = get_observation_records(
                db, self.student_id, self.route_id
            )
            serialized_report_input = json.dumps(
                report_observations, ensure_ascii=False
            )
            self.assertNotIn("Point A", serialized_report_input)
            self.assertIn("Point B", serialized_report_input)
            self.assertIn("自由观察", serialized_report_input)

            summary = get_student_summary(db, self.student_id, self.route_id)
            self.assertEqual(summary["checkin_count"], 1)
            self.assertEqual(summary["successful_checkin_count"], 1)
            self.assertEqual(summary["observation_count"], 2)

            self.assertEqual(
                db.query(Report).filter(Report.route_id == self.route_id).count(),
                0,
            )
            self.assertEqual(
                db.query(Checkin).filter(Checkin.point_id == self.point_a_id).count(),
                1,
            )
            self.assertEqual(
                db.query(Observation).filter(
                    Observation.id == self.observation_a_id
                ).count(),
                1,
            )
            self.assertEqual(
                db.query(AiAnalysis).filter(AiAnalysis.id == self.analysis_a_id).count(),
                1,
            )
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
