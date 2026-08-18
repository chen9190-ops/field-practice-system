import json

from app.database.database import SessionLocal
from app.models.ai_analysis import AiAnalysis
from app.models.checkin import Checkin
from app.models.course import Course
from app.models.observation import Observation
from app.models.route import Route
from app.models.student import Student
from app.models.point import Point
from app.service.current_task_service import filter_current_observations


def get_student_info(db, student_id):
    # Fetch student information from the database
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        return None
    return {
        "id": student.id,
        "name": student.student_name,
        "email": student.student_email,
        "major": student.major,
        # Add other relevant fields as needed
    }

def get_course_info(db, route_id):
    # Fetch course information from the database
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        return None
    course = db.query(Course).filter(Course.id == route.course_id).first()
    if not course:
        return None
    return {
        "id": course.id,
        "name": course.course_name,
        "description": course.course_description,
        # Add other relevant fields as needed
    }

def get_route_info(db, route_id):
    # Fetch route information from the database
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        return None
    return {
        "id": route.id,
        "name": route.route_name,
        "description": route.route_description,
        # Add other relevant fields as needed
    }

def get_checkin_records(db, student_id, route_id):
    # Fetch check-in records for the student and route from the database
    checkins = db.query(Checkin).join(Point).filter(
        Checkin.student_id == student_id,
        Point.route_id == route_id,
        Point.is_active == True,
    ).all()
    return [
        {
            "point_id": checkin.point_id,
            "checkin_time": str(checkin.checkin_time),
            "status": checkin.status,
            # Add other relevant fields as needed
        }
        for checkin in checkins
            if checkin is not None  

    ]

def get_observation_records(db, student_id, route_id):
    # 只获取 fixed / free 观察记录
    # checkin 不进入 observation_records，
    # 因为签到已经单独通过 checkin_records 传给 Dify
    observations = filter_current_observations(
        db.query(Observation).filter(
            Observation.student_id == student_id,
            Observation.route_id == route_id,
            Observation.observation_type.in_(["fixed", "free"]),
        )
    ).all()

    records = []

    for obs in observations:
        if obs is not None:
            # 只把 AI 分析成功完成的记录传给 Dify
            analysis = (
                db.query(AiAnalysis)
                .filter(
                    AiAnalysis.observation_id == obs.id,
                    AiAnalysis.status == "completed",
                )
                .first()
            )

            if analysis is not None:
                records.append({
                    "observation_id": obs.id,

                    # 告诉 Dify 这是 fixed 还是 free
                    "observation_type": obs.observation_type,

                    # fixed 有 point_id，free 通常为 None
                    "point_id": obs.point_id,

                    "observation_text": obs.observation_text,

                    "location": {
                        "latitude": obs.latitude,
                        "longitude": obs.longitude
                    },

                    "rock_name": analysis.rock_name,
                    "rock_type": analysis.rock_type,
                    "confidence": analysis.confidence,
                    "structure": analysis.structure,
                    "mineral": analysis.mineral,
                    "weathering": analysis.weathering,
                    "formation_environment": analysis.formation_environment,
                    "uncertainty": analysis.uncertainty,
                    "suggestions": analysis.suggestions
                })

    return records

def get_student_summary(db, student_id, route_id):
    observation_count = filter_current_observations(
    db.query(Observation).filter(
        Observation.student_id == student_id,
        Observation.route_id == route_id,
        Observation.observation_type.in_(["fixed", "free"]),
        )
    ).count()
    current_checkins = db.query(Checkin).join(Point).filter(
        Checkin.student_id == student_id,
        Point.route_id == route_id,
        Point.is_active == True,
    )
    checkin_count = current_checkins.count()
    successful_checkin_count = current_checkins.filter(
        Checkin.status == "success"
    ).count()
    first_checkin_time = current_checkins.order_by(Checkin.checkin_time.asc()).first()
    last_checkin_time = current_checkins.order_by(Checkin.checkin_time.desc()).first()
    return {
        "observation_count": observation_count,
        "checkin_count": checkin_count,
        "successful_checkin_count": successful_checkin_count,
        "first_checkin_time": str(first_checkin_time.checkin_time) if first_checkin_time else None,
        "last_checkin_time": str(last_checkin_time.checkin_time) if last_checkin_time else None
    }


def print_dify_input_lengths(
    student_info,
    course_info,
    route_info,
    checkin_records,
    observation_records,
    student_summary,
):
    inputs = {
        "student_info": student_info,
        "course_info": course_info,
        "route_info": route_info,
        "checkin_records": checkin_records,
        "observation_records": observation_records,
        "student_summary": student_summary,
    }

    print("===== DIFY INPUT LENGTHS =====")
    for field, value in inputs.items():
        serialized = json.dumps(value, ensure_ascii=False)
        print(
            f"{field}: {len(serialized)} chars, "
            f"{len(serialized.encode('utf-8'))} bytes"
        )
    print("==============================")
