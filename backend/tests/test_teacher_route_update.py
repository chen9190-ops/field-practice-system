import unittest
from unittest.mock import patch

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.database import Base
from app.models.ai_analysis import AiAnalysis  # noqa: F401
from app.models.checkin import Checkin  # noqa: F401
from app.models.course import Course
from app.models.course_teacher import CourseTeachers  # noqa: F401
from app.models.create_student import CourseStudents  # noqa: F401
from app.models.observation import Observation  # noqa: F401
from app.models.point import Point  # noqa: F401
from app.models.report import Report  # noqa: F401
from app.models.route import Route
from app.models.route_path import RoutePath  # noqa: F401
from app.models.student import Student  # noqa: F401
from app.models.teacher import Teacher  # noqa: F401
from app.models.track import Track  # noqa: F401
from app.routers import teacher


class TeacherRouteUpdateTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        self.session_factory = sessionmaker(bind=self.engine)
        Base.metadata.create_all(self.engine)

        db = self.session_factory()
        course = Course(course_name="地质实习")
        db.add(course)
        db.flush()
        route = Route(
            route_name="测试路线",
            course_id=course.id,
            free_observation_enabled=False,
            required_free_observation_count=0,
        )
        db.add(route)
        db.commit()
        self.route_id = route.id
        db.close()

    def tearDown(self):
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def update_config(self, enabled, count, route_id=None):
        config = teacher.UpdateRouteObservationConfig(
            free_observation_enabled=enabled,
            required_free_observation_count=count,
        )
        with patch.object(teacher, "SessionLocal", self.session_factory):
            return teacher.update_route_observation_config(
                self.route_id if route_id is None else route_id,
                config,
            )

    def get_route(self):
        db = self.session_factory()
        try:
            return db.query(Route).filter(Route.id == self.route_id).one()
        finally:
            db.close()

    def test_enables_free_observation(self):
        response = self.update_config(True, 2)

        route = self.get_route()
        self.assertTrue(route.free_observation_enabled)
        self.assertEqual(route.required_free_observation_count, 2)
        self.assertTrue(response["free_observation_enabled"])
        self.assertEqual(response["required_free_observation_count"], 2)

    def test_updates_required_free_observation_count(self):
        self.update_config(True, 1)
        response = self.update_config(True, 4)

        route = self.get_route()
        self.assertTrue(route.free_observation_enabled)
        self.assertEqual(route.required_free_observation_count, 4)
        self.assertEqual(response["required_free_observation_count"], 4)

    def test_disabling_free_observation_resets_count(self):
        self.update_config(True, 3)
        response = self.update_config(False, 99)

        route = self.get_route()
        self.assertFalse(route.free_observation_enabled)
        self.assertEqual(route.required_free_observation_count, 0)
        self.assertFalse(response["free_observation_enabled"])
        self.assertEqual(response["required_free_observation_count"], 0)

    def test_enabled_free_observation_requires_positive_count(self):
        with self.assertRaises(HTTPException) as context:
            self.update_config(True, 0)

        self.assertEqual(context.exception.status_code, 400)
        route = self.get_route()
        self.assertFalse(route.free_observation_enabled)
        self.assertEqual(route.required_free_observation_count, 0)

    def test_missing_route_returns_404(self):
        with self.assertRaises(HTTPException) as context:
            self.update_config(True, 1, route_id=999999)

        self.assertEqual(context.exception.status_code, 404)

    def test_rejects_fields_outside_observation_config(self):
        with self.assertRaises(ValidationError):
            teacher.UpdateRouteObservationConfig(
                free_observation_enabled=True,
                required_free_observation_count=1,
                course_id=99,
            )


if __name__ == "__main__":
    unittest.main()
