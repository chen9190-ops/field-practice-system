import stat
import uuid
from typing import Optional

from app.models.course import Course
from app.models.course_teacher import CourseTeachers
from app.models.observation import Observation
from app.models.report import Report
from app.models.route import Route
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.point import Point
from app.models.checkin import Checkin
from app.models.ai_analysis import AiAnalysis
from app.models.report_evaluation import ReportEvaluation
from app.models.point_learning_material import PointLearningMaterial
from app.models.notification import Notification

from app.models.create_student import CourseStudents
from fastapi import (APIRouter,HTTPException,UploadFile,File,Form,)
from pydantic import BaseModel, ConfigDict

from app.database.database import SessionLocal
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy import func
from pathlib import Path
from app.core.security import create_access_token

class ReportEvaluationUpdate(BaseModel):
    score: Optional[int] = Field(
        default=None,
        ge=0,
        le=100,
    )

    comment: Optional[str] = Field(
        default=None,
        max_length=5000,
    )


router = APIRouter(
    prefix="/teachers",
    tags=["teachers"],
)

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent

from app.core.upload_dir import get_uploads_root

POINT_MATERIAL_UPLOAD_DIR = (
    get_uploads_root()
    / "point_materials"
)

POINT_MATERIAL_UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

ALLOWED_MATERIAL_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}

MAX_MATERIAL_FILE_SIZE = 20 * 1024 * 1024

class CreateTeacher(BaseModel):
    name: str
    email: str
    password: str
    phone_number: Optional[str] = None
    department: Optional[str] = None
    title: Optional[str] = None
    bio: Optional[str] = None


class TeacherResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    phone_number: Optional[str] = None
    department: Optional[str] = None
    title: Optional[str] = None
    bio: Optional[str] = None

class TeacherLogin(BaseModel):
    email: str
    password: str


class UpdateRouteObservationConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    free_observation_enabled: bool
    required_free_observation_count: int


@router.post("/", response_model=TeacherResponse) #创建新的老师
def create_teacher(teacher: CreateTeacher):
    db = SessionLocal()
    try:
        new_teacher = Teacher(
            name=teacher.name,
            email=teacher.email,
            password=teacher.password,
            phone_number=teacher.phone_number,
            department=teacher.department,
            title=teacher.title,
            bio=teacher.bio,
        )
        db.add(new_teacher)
        db.commit()
        db.refresh(new_teacher)
        return new_teacher
    finally:
        db.close()


@router.post("/login")
def teacher_login(teacher: TeacherLogin):
    db = SessionLocal()

    try:
        db_teacher = (
            db.query(Teacher)
            .filter(
                Teacher.email == teacher.email,
                Teacher.password == teacher.password,
            )
            .first()
        )

        if db_teacher is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        access_token = create_access_token(
            user_id=db_teacher.id,
            role="teacher"
        )

        return {
            "id": db_teacher.id,
            "name": db_teacher.name,
            "email": db_teacher.email,
            "department": db_teacher.department,
            "title": db_teacher.title,
            "access_token": access_token,
            "token_type": "bearer",
        }

    finally:
        db.close()


@router.get("/profile/{teacher_id}", response_model=TeacherResponse) #根据教师id获取教师全部信息
def get_teacher(teacher_id: int):
    db = SessionLocal()
    try:
        teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
        if teacher is None:
            raise HTTPException(status_code=404, detail="Teacher not found")
        return teacher
    finally:
        db.close()

@router.get("/")
def get_all_teachers():
    db = SessionLocal()
    try:
        teachers = db.query(Teacher).all()

        return [
            {
                "id": teacher.id,
                "name": teacher.name,
                "department": teacher.department,
                "title": teacher.title,
            }
            for teacher in teachers
        ]
    finally:
        db.close()

@router.get("/{teacher_id}/dashboard") #根据教师id获取教师的仪表盘信息，包括课程数量、路线数量、学生数量、观察记录数量和报告数量
def teacher_dashboard(teacher_id: int):
    db = SessionLocal()

    try:
        # 检查教师是否存在
        teacher = (
            db.query(Teacher)
            .filter(Teacher.id == teacher_id)
            .first()
        )

        if teacher is None:
            raise HTTPException(
                status_code=404,
                detail="Teacher not found"
            )

        # 课程数量
        course_count = (
            db.query(Course)
            .join(
                CourseTeachers,
                Course.id == CourseTeachers.course_id
            )
            .filter(
                CourseTeachers.teacher_id == teacher_id,
                Course.is_active == True
            )
            .distinct(Course.id)
            .count()
        )


        # 路线数量
        route_count = (
            db.query(Route)
            .join(
                Course,
                Route.course_id == Course.id,
            )
            .filter(Route.is_active==True)
            .join(
                CourseTeachers,
                Course.id == CourseTeachers.course_id
            )
            .filter(
                CourseTeachers.teacher_id == teacher_id
            )
            .distinct(Route.id)
            .count()
        )


        # 学生数量
        student_count = (
            db.query(Student)
            .join(
                CourseStudents,
                Student.id == CourseStudents.student_id
            )
            .join(
                CourseTeachers,
                CourseStudents.course_id == CourseTeachers.course_id
            )
            .filter(
                CourseTeachers.teacher_id == teacher_id
            )
            .distinct(Student.id)
            .count()
        )


        # 观察记录数量
        observation_count = (
            db.query(Observation)
            .join(
                Student,
                Observation.student_id == Student.id
            )
            .join(
                CourseStudents,
                Student.id == CourseStudents.student_id
            )
            .join(
                CourseTeachers,
                CourseStudents.course_id == CourseTeachers.course_id
            )
            .filter(
                CourseTeachers.teacher_id == teacher_id
            )
            .distinct(Observation.id)
            .count()
        )


        # 报告数量
        report_count = (
            db.query(Report)
            .join(
                Student,
                Report.student_id == Student.id
            )
            .join(
                CourseStudents,
                Student.id == CourseStudents.student_id
            )
            .join(
                CourseTeachers,
                CourseStudents.course_id == CourseTeachers.course_id
            )
            .filter(
                CourseTeachers.teacher_id == teacher_id
            )
            .distinct(Report.id)
            .count()
        )


        return {
            "course_count": course_count,
            "route_count": route_count,
            "student_count": student_count,
            "observation_count": observation_count,
            "report_count": report_count
        }


    finally:
        db.close()
    

@router.get("/{teacher_id}/courses") #根据教师id获取教师的所有课程信息
def get_teacher_courses(teacher_id: int):
    db = SessionLocal()

    try:
        teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()

        if teacher is None:
            raise HTTPException(status_code=404,detail="Teacher not found")
        courses = (db.query(Course).join(CourseTeachers).filter(CourseTeachers.teacher_id == teacher_id, Course.is_active == True).all())
        return [
            {
                "id": course.id,
                "course_name": course.course_name,
                "course_description": course.course_description
            }
            for course in courses
        ]

    finally:
        db.close()
class UpdateCourse(BaseModel):
    course_name: Optional[str]=None
    course_description: Optional[str]=None
@router.put("/courses/{course_id}") #修改课程信息
def modified_course(course_id: int, course: UpdateCourse):
    db = SessionLocal()
    try:
        course = db.query(Course).filter(Course.id == course_id, Course.is_active == True).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        if course.course_name is not None:
            course.course_name = course.course_name
        if course.course_description is not None:
            course.course_description = course.course_description
        db.commit()
        db.refresh(course)
        return {
            "id": course.id,
            "course_name": course.course_name,
            "course_description": course.course_description
        }
    finally:
        db.close()

@router.get("/{teacher_id}/routes")
def get_teacher_routes(teacher_id: int):
    db = SessionLocal()
    try:
        teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
        if teacher is None:
            raise HTTPException(status_code=404, detail="Teacher not found")

        routes = (
            db.query(Route)
            .join(Course)
            .join(CourseTeachers)
            .filter(
                CourseTeachers.teacher_id == teacher_id,
                Route.is_active == True
            )
            .all()
        )

        return [
            {
                "id": route.id,
                "route_name": route.route_name,
                "route_description": route.route_description,
                "course_id": route.course_id,
                "start_date": route.start_date,
                "status": route.status
            }
            for route in routes
        ]

    finally:
        db.close()

@router.post("/routes/{route_id}/publish")  # 根据路线id发布路线
def publish_route(route_id: int):
    db = SessionLocal()

    try:
        route = (
            db.query(Route)
            .filter(Route.id == route_id)
            .first()
        )

        if not route:
            raise HTTPException(
                status_code=404,
                detail="Route not found"
            )

        if route.status == "published":
            raise HTTPException(
                status_code=409,
                detail="该路线已经发布",
            )

        route.status = "published"

        notification = Notification(
            title="新实习路线已发布",
            content=f"路线“{route.route_name}”已发布，请及时查看实习任务。",
            type="route",
            course_id=route.course_id,
            route_id=route.id,
            student_id=None,
        )

        db.add(notification)

        # 路线状态 + 通知一起提交
        db.commit()

        db.refresh(route)

        return {
            "message": f"Route {route.route_name} has been published.",
            "route_id": route.id,
            "status": route.status,
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


@router.patch("/routes/{route_id}")
def update_route_observation_config(
    route_id: int,
    config: UpdateRouteObservationConfig,
):
    db = SessionLocal()
    try:
        route = db.query(Route).filter(
            Route.id == route_id,
            Route.is_active == True,
        ).first()
        if not route:
            raise HTTPException(status_code=404, detail="Route not found")

        if (
            config.free_observation_enabled
            and config.required_free_observation_count < 1
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "required_free_observation_count must be at least 1 "
                    "when free observation is enabled"
                ),
            )

        route.free_observation_enabled = config.free_observation_enabled
        route.required_free_observation_count = (
            config.required_free_observation_count
            if config.free_observation_enabled
            else 0
        )

        db.commit()
        db.refresh(route)
        return {
            "message": f"Route {route.route_name} observation config has been updated.",
            "route_id": route.id,
            "free_observation_enabled": route.free_observation_enabled,
            "required_free_observation_count": route.required_free_observation_count,
        }
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

class CreatePoint(BaseModel):
    point_name:str
    latitude:float
    longitude:float
    point_description:str|None=None
    task:str|None=None
@router.post("/routes/{route_id}/points") #根据路线id添加新的点位
def add_point_to_route(route_id: int, point: CreatePoint):
    db = SessionLocal()
    try:
        route = db.query(Route).filter(Route.id == route_id).first()
        if not route:
            raise HTTPException(status_code=404, detail="Route not found")
        
        new_point = Point(
            point_name=point.point_name,
            latitude=point.latitude,
            longitude=point.longitude,
            point_description=point.point_description,
            task=point.task,
            route_id=route_id
        )
        db.add(new_point)
        db.commit()
        db.refresh(new_point)
        return {
            "message": f"Point {new_point.point_name} has been added to Route {route.route_name}.",
            "point_id": new_point.id
        }
    finally:
        db.close()
@router.put("/points/{point_id}") #修改点位信息
def update_point(point_id: int, point_name: Optional[str] = None, latitude: Optional[float] = None, longitude: Optional[float] = None, point_description: Optional[str] = None, task: Optional[str] = None):
    db = SessionLocal()
    try:
        point = db.query(Point).filter(Point.id == point_id).first()
        if not point:
            raise HTTPException(status_code=404, detail="Point not found")
        
        if point_name is not None:
            point.point_name = point_name
        if latitude is not None:
            point.latitude = latitude
        if longitude is not None:
            point.longitude = longitude
        if point_description is not None:
            point.point_description = point_description
        if task is not None:
            point.task = task
        
        db.commit()
        db.refresh(point)
        return {
            "message": f"Point {point.point_name} has been updated.",
            "point_id": point.id
        }
    finally:
        db.close()
@router.delete("/points/{point_id}") #根据点位id删除点位
def delete_point(point_id: int):
    db = SessionLocal()
    try:
        point = db.query(Point).filter(Point.id == point_id, Point.is_active == True).first()
        if not point:
            raise HTTPException(status_code=404, detail="Point not found")
        point.is_active = False
        db.query(Report).filter(Report.route_id == point.route_id).delete(
            synchronize_session=False
        )
        db.commit()
        return {
            "message": f"Point {point.point_name} has been deleted.",
            "point_id": point.id
        }
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

@router.delete("/routes/{route_id}")
def delete_route(route_id: int):
    db = SessionLocal()
    try:
        route = db.query(Route).filter(Route.id == route_id, Route.is_active == True).first()
        if not route:
            raise HTTPException(status_code = 404, detail = "Route not found")
        route.is_active = False
        db.commit()
        return {
            "message": f"Route {route.route_name} has been deleted.",
            "route_id": route_id
        }
    finally:
        db.close()

@router.delete("/courses/{course_id}")
def delete_course(course_id: int):
    db =SessionLocal()
    try:
        course = db.query(Course).filter(Course.id == course_id, Course.is_active == True).first()
        if not course:
            raise HTTPException(status_code = 404, detail = "Course not found")
        course.is_active = False
        db.commit()
        return{
            "message": f"Course {course.course_name} has been deleted.",
            "course_id": course_id
        }
    finally:
        db.close()

@router.get("/{teacher_id}/courses/{course_id}/students")
def get_course_stu(teacher_id:int, course_id:int):
    db = SessionLocal()
    try:
        teacher_course = db.query(CourseTeachers).filter(CourseTeachers.teacher_id == teacher_id, CourseTeachers.course_id == course_id).first()
        if not teacher_course:
            return{
                "message": "该课程不属于当前教师"
            }
        courses = db.query(Course).filter(Course.id == course_id, Course.is_active == True).all()
        if not courses:
            return {
                "message": "未找到课程信息"
            }
        students = (db.query(Student).join(CourseStudents,Student.id == CourseStudents.student_id).filter(CourseStudents.course_id == course_id).order_by(Student.student_name.asc()).all())
        
        if not students:
            return{
                "message": "未找到任何学生信息"
            }
        return[
                {
                    "id": student.id,
                    "student_name": student.student_name,
                    "student_number": student.student_number,
                    "college": student.college,
                    "major": student.major,
                    "grade": student.grade
                }
                for student in students
            ]
    finally:
        db.close()
@router.get("/{teacher_id}/courses/{course_id}/routes/{route_id}/progress")
def get_route_progress(
    teacher_id: int,
    course_id: int,
    route_id: int,
):
    db = SessionLocal()

    try:
        # 1. 验证课程属于该教师
        teacher_course = (
            db.query(CourseTeachers)
            .filter(
                CourseTeachers.teacher_id == teacher_id,
                CourseTeachers.course_id == course_id,
            )
            .first()
        )

        if not teacher_course:
            raise HTTPException(
                status_code=404,
                detail="该课程不属于当前教师"
            )

        # 2. 验证路线属于该课程
        route = (
            db.query(Route)
            .filter(
                Route.id == route_id,
                Route.course_id == course_id,
                Route.is_active == True,
            )
            .first()
        )

        if not route:
            raise HTTPException(
                status_code=404,
                detail="路线不存在或不属于该课程"
            )

        # 3. 查询课程所有学生
        students = (
            db.query(Student)
            .join(
                CourseStudents,
                Student.id == CourseStudents.student_id
            )
            .filter(
                CourseStudents.course_id == course_id
            )
            .all()
        )

        # 4. 查询该路线所有有效固定观察点
        fixed_points = (
            db.query(Point)
            .filter(
                Point.route_id == route_id,
                Point.is_active == True,
            )
            .all()
        )

        fixed_total = len(fixed_points)

        free_required = (
            route.required_free_observation_count
            if route.free_observation_enabled
            else 0
        )

        overall_total = fixed_total + free_required

        result_students = []

        completed_students = 0
        in_progress_students = 0
        not_started_students = 0

        for student in students:

            # 5. 已完成固定观察点
            fixed_completed_point_ids = {
                row[0]
                for row in (
                    db.query(Observation.point_id)
                    .filter(
                        Observation.student_id == student.id,
                        Observation.route_id == route_id,
                        Observation.observation_type.in_(
                            ["fixed", "checkin"]
                        ),
                        Observation.point_id.isnot(None),
                    )
                    .distinct()
                    .all()
                )
            }

            # 只计算当前仍有效的固定点
            valid_point_ids = {
                point.id for point in fixed_points
            }

            fixed_completed = len(
                fixed_completed_point_ids & valid_point_ids
            )

            # 6. 自由观察完成数
            if route.free_observation_enabled:
                free_completed_raw = (
                    db.query(Observation)
                    .filter(
                        Observation.student_id == student.id,
                        Observation.route_id == route_id,
                        Observation.observation_type == "free",
                    )
                    .count()
                )
            else:
                free_completed_raw = 0

            # 超出要求的自由观察不继续增加总体完成度
            free_completed = min(
                free_completed_raw,
                free_required
            )

            overall_completed = (
                fixed_completed + free_completed
            )

            if overall_total > 0:
                completion_rate = round(
                    overall_completed / overall_total * 100,
                    1
                )
            else:
                completion_rate = 0

            # 7. 判断状态
            if overall_total > 0 and overall_completed >= overall_total:
                status = "completed"
                completed_students += 1

            elif overall_completed > 0:
                status = "in_progress"
                in_progress_students += 1

            else:
                status = "not_started"
                not_started_students += 1

            result_students.append({
                "student_id": student.id,
                "student_name": student.student_name,
                "student_number": student.student_number,

                "fixed_completed": fixed_completed,
                "fixed_total": fixed_total,

                "free_completed": free_completed_raw,
                "free_required": free_required,

                "overall_completed": overall_completed,
                "overall_total": overall_total,

                "completion_rate": completion_rate,
                "status": status,
            })

        total_students = len(students)

        if total_students > 0:
            overall_completion_rate = round(
                sum(
                    item["completion_rate"]
                    for item in result_students
                ) / total_students,
                1
            )
        else:
            overall_completion_rate = 0

        return {
            "teacher_id": teacher_id,
            "course_id": course_id,
            "route_id": route_id,

            "total_students": total_students,

            "completed_students": completed_students,
            "in_progress_students": in_progress_students,
            "not_started_students": not_started_students,

            "completion_rate": overall_completion_rate,

            "task_requirement": {
                "fixed_total": fixed_total,
                "free_required": free_required,
                "overall_total": overall_total,
            },

            "students": result_students,
        }

    finally:
        db.close()
@router.get("/{teacher_id}/courses/{course_id}/routes/{route_id}/checkins")
def get_route_checkins(
    teacher_id: int,
    course_id: int,
    route_id: int,
):
    db = SessionLocal()

    try:
        # 1. 验证课程属于该教师
        teacher_course = (
            db.query(CourseTeachers)
            .filter(
                CourseTeachers.teacher_id == teacher_id,
                CourseTeachers.course_id == course_id,
            )
            .first()
        )

        if not teacher_course:
            raise HTTPException(
                status_code=404,
                detail="该课程不属于当前教师"
            )

        # 2. 验证路线属于该课程
        route = (
            db.query(Route)
            .filter(
                Route.id == route_id,
                Route.course_id == course_id,
                Route.is_active == True,
            )
            .first()
        )

        if not route:
            raise HTTPException(
                status_code=404,
                detail="路线不存在或不属于该课程"
            )

        # 3. 查询该课程学生
        students = (
            db.query(Student)
            .join(
                CourseStudents,
                Student.id == CourseStudents.student_id
            )
            .filter(
                CourseStudents.course_id == course_id
            )
            .all()
        )

        # 4. 查询该路线有效点位
        points = (
            db.query(Point)
            .filter(
                Point.route_id == route_id,
                Point.is_active == True
            )
            .all()
        )

        point_ids = {point.id for point in points}
        total_points = len(point_ids)

        result_students = []

        fully_checked_in_students = 0
        partial_students = 0
        not_started_students = 0

        for student in students:

            # 5. 查该学生在当前路线有效点位的签到
            checkins = (
                db.query(Checkin)
                .filter(
                    Checkin.student_id == student.id,
                    Checkin.point_id.in_(point_ids),
                    Checkin.status.in_(["success", "checked_in"]),
                )
                .order_by(Checkin.checkin_time.desc())
                .all()
            ) if point_ids else []

            # 同一个点多次签到只算一次
            checked_point_ids = {
                checkin.point_id
                for checkin in checkins
            }

            checked_in_points = len(checked_point_ids)

            # 最新签到
            last_checkin_at = (
                checkins[0].checkin_time
                if checkins
                else None
            )

            # 状态
            if total_points > 0 and checked_in_points >= total_points:
                status = "completed"
                fully_checked_in_students += 1

            elif checked_in_points > 0:
                status = "partial"
                partial_students += 1

            else:
                status = "not_started"
                not_started_students += 1

            checkin_rate = (
                round(
                    checked_in_points / total_points * 100,
                    1
                )
                if total_points > 0
                else 0
            )

            result_students.append({
                "student_id": student.id,
                "student_name": student.student_name,
                "student_number": student.student_number,

                "checked_in_points": checked_in_points,
                "total_points": total_points,

                "checkin_rate": checkin_rate,
                "last_checkin_at": last_checkin_at,
                "status": status,
            })

        return {
            "teacher_id": teacher_id,
            "course_id": course_id,
            "route_id": route_id,

            "total_students": len(students),
            "total_points": total_points,

            "fully_checked_in_students": fully_checked_in_students,
            "partial_students": partial_students,
            "not_started_students": not_started_students,

            "students": result_students,
        }

    finally:
        db.close()
@router.get("/{teacher_id}/courses/{course_id}/routes/{route_id}/observations")
def get_route_observations(
    teacher_id: int,
    course_id: int,
    route_id: int,
    student_id: int | None = None,
    point_id: int | None = None,
    observation_type: str | None = None,
    page: int = 1,
    page_size: int = 20,
):
    db = SessionLocal()

    try:
        # 1. 验证课程属于该教师
        teacher_course = (
            db.query(CourseTeachers)
            .filter(
                CourseTeachers.teacher_id == teacher_id,
                CourseTeachers.course_id == course_id,
            )
            .first()
        )

        if not teacher_course:
            raise HTTPException(
                status_code=404,
                detail="该课程不属于当前教师",
            )

        # 2. 验证路线属于该课程
        route = (
            db.query(Route)
            .filter(
                Route.id == route_id,
                Route.course_id == course_id,
                Route.is_active == True,
            )
            .first()
        )

        if not route:
            raise HTTPException(
                status_code=404,
                detail="路线不存在或不属于该课程",
            )

        # 3. 查询该课程学生 ID
        course_student_ids = (
            db.query(CourseStudents.student_id)
            .filter(
                CourseStudents.course_id == course_id
            )
            .subquery()
        )

        # 4. 查询该路线观察记录
        query = (
            db.query(
                Observation,
                Student,
                Point,
            )
            .join(
                Student,
                Observation.student_id == Student.id,
            )
            .outerjoin(
                Point,
                Observation.point_id == Point.id,
            )
            .filter(
                Observation.route_id == route_id,
                Observation.student_id.in_(course_student_ids),
            )
        )

        # 5. 可选：按学生筛选
        if student_id is not None:
            query = query.filter(
                Observation.student_id == student_id
            )

        # 6. 可选：按点位筛选
        if point_id is not None:
            query = query.filter(
                Observation.point_id == point_id
            )

        # 7. 可选：按观察类型筛选
        if observation_type is not None:
            query = query.filter(
                Observation.observation_type == observation_type
            )

        if page < 1:
            page = 1

        if page_size < 1:
            page_size = 20

        if page_size > 100:
            page_size = 100

        total = query.count()

        rows = (
            query
            .order_by(
                Observation.observation_time.desc()
            )
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        result = []

        for observation, student, point in rows:

            result.append({
                "id": observation.id,

                "student_id": student.id,
                "student_name": student.student_name,
                "student_number": student.student_number,

                "route_id": observation.route_id,

                "point_id": observation.point_id,
                "point_name": (
                    point.point_name
                    if point is not None
                    else None
                ),

                "observation_type": observation.observation_type,

                "observation_text": observation.observation_text,
                "rock_type": observation.rock_type,

                "latitude": observation.latitude,
                "longitude": observation.longitude,

                "photo_url": observation.photo_url,

                "is_favorite": observation.is_favorite,
                "is_pinned": observation.is_pinned,

                "observation_time": observation.observation_time,

                "has_ai_analysis": (
                    observation.ai_analysis is not None
                ),
            })

        total_pages = (
            (total + page_size - 1) // page_size
            if total > 0
            else 0
        )

        return {
            "teacher_id": teacher_id,
            "course_id": course_id,
            "route_id": route_id,

            "items": result,

            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": total_pages,
            },
        }

    finally:
        db.close()

@router.get("/{teacher_id}/courses/{course_id}/routes/{route_id}/ai-analysis")
def get_route_ai_analysis(
    teacher_id: int,
    course_id: int,
    route_id: int,
    student_id: int | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 20,
):
    db = SessionLocal()

    try:
        # 验证教师是否拥有该课程
        teacher_course = (
            db.query(CourseTeachers)
            .filter(
                CourseTeachers.teacher_id == teacher_id,
                CourseTeachers.course_id == course_id,
            )
            .first()
        )

        if not teacher_course:
            raise HTTPException(
                status_code=404,
                detail="该课程不属于当前教师",
            )

        # 验证路线属于该课程
        route = (
            db.query(Route)
            .filter(
                Route.id == route_id,
                Route.course_id == course_id,
                Route.is_active == True,
            )
            .first()
        )

        if not route:
            raise HTTPException(
                status_code=404,
                detail="路线不存在或不属于该课程",
            )

        # 该课程学生范围
        course_student_ids = (
            db.query(CourseStudents.student_id)
            .filter(
                CourseStudents.course_id == course_id
            )
        )

        query = (
            db.query(
                Observation,
                Student,
                Point,
                AiAnalysis,
            )
            .join(
                Student,
                Observation.student_id == Student.id,
            )
            .outerjoin(
                Point,
                Observation.point_id == Point.id,
            )
            .outerjoin(
                AiAnalysis,
                AiAnalysis.observation_id == Observation.id,
            )
            .filter(
                Observation.route_id == route_id,
                Observation.student_id.in_(course_student_ids),
            )
        )

        if student_id is not None:
            query = query.filter(
                Observation.student_id == student_id
            )

        if status is not None:
            if status == "not_analyzed":
                query = query.filter(
                    AiAnalysis.id.is_(None)
                )
            else:
                query = query.filter(
                    AiAnalysis.status == status
                )

        if page < 1:
            page = 1

        if page_size < 1:
            page_size = 20

        if page_size > 100:
            page_size = 100

        total = query.count()
        rows = (
            query
            .order_by(
                Observation.observation_time.desc()
            )
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        items = []

        for observation, student, point, analysis in rows:

            ai_data = None

            if analysis is not None:
                ai_data = {
                    "id": analysis.id,
                    "status": analysis.status,

                    "rock_name": analysis.rock_name,
                    "rock_type": analysis.rock_type,
                    "confidence": analysis.confidence,

                    "structure": analysis.structure,
                    "mineral": analysis.mineral,
                    "weathering": analysis.weathering,

                    "formation_environment":
                        analysis.formation_environment,

                    "uncertainty":
                        analysis.uncertainty,

                    "suggestions":
                        analysis.suggestions,

                    "student_report":
                        analysis.student_report,

                    "analysis_time":
                        analysis.analysis_time,
                }

            items.append({
                "observation_id": observation.id,

                "student": {
                    "id": student.id,
                    "student_name":
                        student.student_name,
                    "student_number":
                        student.student_number,
                },

                "point": {
                    "id": observation.point_id,
                    "name": (
                        point.point_name
                        if point is not None
                        else None
                    ),
                },

                "observation_type":
                    observation.observation_type,

                "observation_text":
                    observation.observation_text,

                "student_rock_type":
                    observation.rock_type,

                "photo_url":
                    observation.photo_url,

                "latitude":
                    observation.latitude,

                "longitude":
                    observation.longitude,

                "observation_time":
                    observation.observation_time,

                "has_ai_analysis":
                    analysis is not None,

                "ai_analysis":
                    ai_data,
            })

        total_pages = (
            (total + page_size - 1) // page_size
            if total > 0
            else 0
        )

        return {
            "teacher_id": teacher_id,
            "course_id": course_id,
            "route_id": route_id,

            "items": items,

            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": total_pages,
            },
        }

    finally:
        db.close()
@router.get("/{teacher_id}/courses/{course_id}/routes/{route_id}/students/{student_id}/ai-analysis")
def get_student_route_ai_analysis(
    teacher_id: int,
    course_id: int,
    route_id: int,
    student_id: int,
):
    db = SessionLocal()

    try:
        # 教师-课程验证
        teacher_course = (
            db.query(CourseTeachers)
            .filter(
                CourseTeachers.teacher_id == teacher_id,
                CourseTeachers.course_id == course_id,
            )
            .first()
        )

        if not teacher_course:
            raise HTTPException(
                status_code=404,
                detail="该课程不属于当前教师",
            )

        # 路线验证
        route = (
            db.query(Route)
            .filter(
                Route.id == route_id,
                Route.course_id == course_id,
                Route.is_active == True,
            )
            .first()
        )

        if not route:
            raise HTTPException(
                status_code=404,
                detail="路线不存在或不属于该课程",
            )

        # 学生是否属于课程
        joined = (
            db.query(CourseStudents)
            .filter(
                CourseStudents.student_id == student_id,
                CourseStudents.course_id == course_id,
            )
            .first()
        )

        if not joined:
            raise HTTPException(
                status_code=404,
                detail="该学生不属于当前课程",
            )

        student = (
            db.query(Student)
            .filter(
                Student.id == student_id
            )
            .first()
        )

        if not student:
            raise HTTPException(
                status_code=404,
                detail="学生不存在",
            )

        rows = (
            db.query(
                Observation,
                Point,
                AiAnalysis,
            )
            .outerjoin(
                Point,
                Observation.point_id == Point.id,
            )
            .outerjoin(
                AiAnalysis,
                AiAnalysis.observation_id == Observation.id,
            )
            .filter(
                Observation.student_id == student_id,
                Observation.route_id == route_id,
            )
            .order_by(
                Observation.observation_time.asc()
            )
            .all()
        )

        items = []

        completed_count = 0
        processing_count = 0
        failed_count = 0
        not_analyzed_count = 0

        for observation, point, analysis in rows:

            if analysis is None:
                analysis_status = "not_analyzed"
                not_analyzed_count += 1

            elif analysis.status == "completed":
                analysis_status = "completed"
                completed_count += 1

            elif analysis.status == "failed":
                analysis_status = "failed"
                failed_count += 1

            else:
                analysis_status = analysis.status
                processing_count += 1

            items.append({
                "observation_id": observation.id,

                "point": {
                    "id": observation.point_id,
                    "name": (
                        point.point_name
                        if point is not None
                        else None
                    ),
                },

                "observation_type":
                    observation.observation_type,

                "observation_text":
                    observation.observation_text,

                "student_rock_type":
                    observation.rock_type,

                "photo_url":
                    observation.photo_url,

                "observation_time":
                    observation.observation_time,

                "analysis_status":
                    analysis_status,

                "ai_analysis": (
                    None
                    if analysis is None
                    else {
                        "id": analysis.id,

                        "rock_name":
                            analysis.rock_name,

                        "rock_type":
                            analysis.rock_type,

                        "confidence":
                            analysis.confidence,

                        "structure":
                            analysis.structure,

                        "mineral":
                            analysis.mineral,

                        "weathering":
                            analysis.weathering,

                        "formation_environment":
                            analysis.formation_environment,

                        "uncertainty":
                            analysis.uncertainty,

                        "suggestions":
                            analysis.suggestions,

                        "student_report":
                            analysis.student_report,

                        "analysis_time":
                            analysis.analysis_time,

                        "status":
                            analysis.status,
                    }
                ),
            })

        total_observations = len(rows)
        analyzed_count = (
            completed_count
            + processing_count
            + failed_count
        )

        return {
            "student": {
                "id": student.id,
                "student_name":
                    student.student_name,
                "student_number":
                    student.student_number,
                "college":
                    student.college,
                "major":
                    student.major,
                "grade":
                    student.grade,
            },

            "course": {
                "id": course_id,
            },

            "route": {
                "id": route.id,
                "route_name":
                    route.route_name,
            },

            "statistics": {
                "total_observations":
                    total_observations,

                "analyzed":
                    analyzed_count,

                "completed":
                    completed_count,

                "processing":
                    processing_count,

                "failed":
                    failed_count,

                "not_analyzed":
                    not_analyzed_count,

                "analysis_coverage_rate": (
                    round(
                        analyzed_count
                        / total_observations
                        * 100,
                        1,
                    )
                    if total_observations > 0
                    else 0
                ),
            },

            "items": items,
        }

    finally:
        db.close()
@router.get("/{teacher_id}/courses/{course_id}/routes/{route_id}/ai-summary")
def get_route_ai_summary(
    teacher_id: int,
    course_id: int,
    route_id: int,
):
    db = SessionLocal()

    try:
        # 验证教师课程关系
        teacher_course = (
            db.query(CourseTeachers)
            .filter(
                CourseTeachers.teacher_id == teacher_id,
                CourseTeachers.course_id == course_id,
            )
            .first()
        )

        if not teacher_course:
            raise HTTPException(
                status_code=404,
                detail="该课程不属于当前教师",
            )

        # 验证路线
        route = (
            db.query(Route)
            .filter(
                Route.id == route_id,
                Route.course_id == course_id,
                Route.is_active == True,
            )
            .first()
        )

        if not route:
            raise HTTPException(
                status_code=404,
                detail="路线不存在或不属于该课程",
            )

        # 课程学生
        student_ids = [
            row[0]
            for row in (
                db.query(
                    CourseStudents.student_id
                )
                .filter(
                    CourseStudents.course_id
                    == course_id
                )
                .all()
            )
        ]

        total_students = len(student_ids)

        if not student_ids:
            return {
                "teacher_id": teacher_id,
                "course_id": course_id,
                "route_id": route_id,
                "total_students": 0,
                "students_with_observations": 0,
                "students_with_ai_analysis": 0,
                "total_observations": 0,
                "completed_analyses": 0,
                "processing_analyses": 0,
                "failed_analyses": 0,
                "not_analyzed_observations": 0,
                "analysis_coverage_rate": 0,
                "completion_rate": 0,
            }

        observations = (
            db.query(Observation)
            .filter(
                Observation.route_id == route_id,
                Observation.student_id.in_(
                    student_ids
                ),
            )
            .all()
        )

        total_observations = len(observations)

        students_with_observations = {
            observation.student_id
            for observation in observations
        }

        if not observations:
            return {
                "teacher_id": teacher_id,
                "course_id": course_id,
                "route_id": route_id,
                "total_students":
                    total_students,
                "students_with_observations": 0,
                "students_with_ai_analysis": 0,
                "total_observations": 0,
                "completed_analyses": 0,
                "processing_analyses": 0,
                "failed_analyses": 0,
                "not_analyzed_observations": 0,
                "analysis_coverage_rate": 0,
                "completion_rate": 0,
            }

        observation_ids = [
            observation.id
            for observation in observations
        ]

        observation_student_map = {
            observation.id:
                observation.student_id
            for observation in observations
        }

        analyses = (
            db.query(AiAnalysis)
            .filter(
                AiAnalysis.observation_id.in_(
                    observation_ids
                )
            )
            .all()
        )

        completed = 0
        processing = 0
        failed = 0

        students_with_ai = set()

        for analysis in analyses:

            student_id = (
                observation_student_map.get(
                    analysis.observation_id
                )
            )

            if student_id is not None:
                students_with_ai.add(
                    student_id
                )

            if analysis.status == "completed":
                completed += 1

            elif analysis.status == "failed":
                failed += 1

            else:
                processing += 1

        analyzed_count = len(analyses)

        not_analyzed = max(
            total_observations - analyzed_count,
            0,
        )

        coverage_rate = (
            round(
                analyzed_count
                / total_observations
                * 100,
                1,
            )
            if total_observations > 0
            else 0
        )

        completion_rate = (
            round(
                completed
                / total_observations
                * 100,
                1,
            )
            if total_observations > 0
            else 0
        )

        return {
            "teacher_id": teacher_id,
            "course_id": course_id,
            "route_id": route_id,

            "total_students":
                total_students,

            "students_with_observations":
                len(
                    students_with_observations
                ),

            "students_with_ai_analysis":
                len(
                    students_with_ai
                ),

            "total_observations":
                total_observations,

            "completed_analyses":
                completed,

            "processing_analyses":
                processing,

            "failed_analyses":
                failed,

            "not_analyzed_observations":
                not_analyzed,

            "analysis_coverage_rate":
                coverage_rate,

            "completion_rate":
                completion_rate,
        }

    finally:
        db.close()

@router.get("/{teacher_id}/courses/{course_id}/routes/{route_id}/reports")
def get_stu_reports(
    teacher_id: int,
    course_id: int,
    route_id: int,
):
    db = SessionLocal()

    try:
        # 1. 验证课程属于当前教师
        teacher_course = (
            db.query(CourseTeachers)
            .filter(
                CourseTeachers.course_id == course_id,
                CourseTeachers.teacher_id == teacher_id,
            )
            .first()
        )

        if not teacher_course:
            raise HTTPException(
                status_code=404,
                detail="该课程不属于当前教师",
            )

        # 2. 验证路线属于当前课程
        route = (
            db.query(Route)
            .filter(
                Route.id == route_id,
                Route.course_id == course_id,
                Route.is_active == True,
            )
            .first()
        )

        if not route:
            raise HTTPException(
                status_code=404,
                detail="路线不存在或不属于该课程",
            )

        # 3. 当前课程学生范围
        course_student_ids = (
            db.query(CourseStudents.student_id)
            .filter(
                CourseStudents.course_id == course_id
            )
        )

        # 4. 查询报告 + 学生 + 教师评价
        rows = (
            db.query(
                Report,
                Student,
                ReportEvaluation,
            )
            .join(
                Student,
                Report.student_id == Student.id,
            )
            .outerjoin(
                ReportEvaluation,
                ReportEvaluation.report_id == Report.id,
            )
            .filter(
                Report.route_id == route_id,
                Report.student_id.in_(course_student_ids),
            )
            .order_by(
                Report.create_time.desc()
            )
            .all()
        )

        result = []

        for report, student, evaluation in rows:
            result.append({
                "report_id": report.id,

                "student_id": student.id,
                "student_name": student.student_name,
                "student_number": student.student_number,

                "status": report.status,
                "report_text": report.report_text,
                "error_message": report.error_message,
                "create_time": report.create_time,

                "score": (
                    evaluation.score
                    if evaluation
                    else None
                ),

                "comment": (
                    evaluation.comment
                    if evaluation
                    else None
                ),

                "evaluation_id": (
                    evaluation.id
                    if evaluation
                    else None
                ),

                "evaluated_by": (
                    evaluation.teacher_id
                    if evaluation
                    else None
                ),

                "evaluation_updated_at": (
                    evaluation.updated_at
                    if evaluation
                    else None
                ),
            })

        return result

    finally:
        db.close()
@router.get("/{teacher_id}/courses/{course_id}/routes/{route_id}/reports/{report_id}")
def get_report_detail(
    teacher_id: int,
    course_id: int,
    route_id: int,
    report_id: int,
):
    db = SessionLocal()

    try:
        # 1. 验证课程属于当前教师
        teacher_course = (
            db.query(CourseTeachers)
            .filter(
                CourseTeachers.teacher_id == teacher_id,
                CourseTeachers.course_id == course_id,
            )
            .first()
        )

        if not teacher_course:
            raise HTTPException(
                status_code=404,
                detail="该课程不属于当前教师",
            )

        # 2. 验证路线属于当前课程
        route = (
            db.query(Route)
            .filter(
                Route.id == route_id,
                Route.course_id == course_id,
                Route.is_active == True,
            )
            .first()
        )

        if not route:
            raise HTTPException(
                status_code=404,
                detail="路线不存在或不属于该课程",
            )

        # 3. 查询报告 + 学生 + 教师评价
        row = (
            db.query(
                Report,
                Student,
                ReportEvaluation,
            )
            .join(
                Student,
                Report.student_id == Student.id,
            )
            .outerjoin(
                ReportEvaluation,
                ReportEvaluation.report_id == Report.id,
            )
            .join(
                CourseStudents,
                CourseStudents.student_id == Student.id,
            )
            .filter(
                Report.id == report_id,
                Report.route_id == route_id,
                CourseStudents.course_id == course_id,
            )
            .first()
        )

        if not row:
            raise HTTPException(
                status_code=404,
                detail="报告不存在或不属于当前课程/路线",
            )

        report, student, evaluation = row

        return {
            "report_id": report.id,

            "student": {
                "id": student.id,
                "student_name": student.student_name,
                "student_number": student.student_number,
                "college": student.college,
                "major": student.major,
                "grade": student.grade,
            },

            "route": {
                "id": route.id,
                "route_name": route.route_name,
                "route_description": route.route_description,
            },

            "report_text": report.report_text,
            "status": report.status,
            "error_message": report.error_message,
            "create_time": report.create_time,

            "evaluation": (
                {
                    "evaluation_id": evaluation.id,
                    "score": evaluation.score,
                    "comment": evaluation.comment,
                    "teacher_id": evaluation.teacher_id,
                    "created_at": evaluation.created_at,
                    "updated_at": evaluation.updated_at,
                }
                if evaluation
                else None
            ),
        }

    finally:
        db.close()
@router.put("/{teacher_id}/courses/{course_id}/routes/{route_id}/reports/{report_id}/evaluation")
def update_report_evaluation(
    teacher_id: int,
    course_id: int,
    route_id: int,
    report_id: int,
    data: ReportEvaluationUpdate,
):
    db = SessionLocal()

    try:
        # 1. 验证教师是否拥有该课程
        teacher_course = (
            db.query(CourseTeachers)
            .filter(
                CourseTeachers.teacher_id == teacher_id,
                CourseTeachers.course_id == course_id,
            )
            .first()
        )

        if not teacher_course:
            raise HTTPException(
                status_code=403,
                detail="无权访问该课程",
            )

        # 2. 验证路线属于课程且有效
        route = (
            db.query(Route)
            .filter(
                Route.id == route_id,
                Route.course_id == course_id,
                Route.is_active == True,
            )
            .first()
        )

        if not route:
            raise HTTPException(
                status_code=404,
                detail="路线不存在或不属于该课程",
            )

        # 3. 查询报告及学生
        row = (
            db.query(
                Report,
                Student,
            )
            .join(
                Student,
                Report.student_id == Student.id,
            )
            .join(
                CourseStudents,
                CourseStudents.student_id == Student.id,
            )
            .filter(
                Report.id == report_id,
                Report.route_id == route_id,
                CourseStudents.course_id == course_id,
            )
            .first()
        )

        if not row:
            raise HTTPException(
                status_code=404,
                detail="报告不存在或不属于当前课程/路线",
            )

        report, student = row

        # 4. 只有成功生成的报告允许评价
        if report.status != "completed":
            raise HTTPException(
                status_code=409,
                detail="报告尚未生成完成，暂不可评分",
            )

        # 5. 至少提供一个可修改字段
        if data.score is None and data.comment is None:
            raise HTTPException(
                status_code=400,
                detail="请至少提交评分或评语",
            )

        # 6. 查询已有评价
        evaluation = (
            db.query(ReportEvaluation)
            .filter(
                ReportEvaluation.report_id == report_id,
            )
            .first()
        )

        # 7. 不存在则创建
        if not evaluation:
            evaluation = ReportEvaluation(
                report_id=report_id,
                teacher_id=teacher_id,
                score=data.score,
                comment=data.comment,
            )

            db.add(evaluation)

        else:
            # 防止其他教师修改已有评价
            if evaluation.teacher_id != teacher_id:
                raise HTTPException(
                    status_code=403,
                    detail="该报告已由其他教师评价",
                )

            # PATCH-like 更新：
            # 没传的字段不覆盖原值
            if data.score is not None:
                evaluation.score = data.score

            if data.comment is not None:
                evaluation.comment = data.comment
        notification = Notification(
            title="实习报告评价已更新",
            content=(
                f"你的“{route.route_name}”实习报告"
                "已有新的评分或教师评语，请及时查看。"
            ),
            type="evaluation",
            course_id=course_id,
            route_id=route_id,
            student_id=student.id,
        )

        db.add(notification)
        db.commit()
        db.refresh(evaluation)

        return {
            "message": "报告评价保存成功",

            "evaluation": {
                "evaluation_id": evaluation.id,
                "report_id": evaluation.report_id,
                "teacher_id": evaluation.teacher_id,

                "score": evaluation.score,
                "comment": evaluation.comment,

                "created_at": evaluation.created_at,
                "updated_at": evaluation.updated_at,
            },

            "report": {
                "report_id": report.id,
                "student_id": student.id,
                "student_name": student.student_name,
                "student_number": student.student_number,
                "route_id": report.route_id,
            },
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"保存报告评价失败: {str(e)}",
        )

    finally:
        db.close()



@router.get("/{teacher_id}/courses/{course_id}/routes/{route_id}/evaluation-summary")
def get_evaluation_summary(
    teacher_id: int,
    course_id: int,
    route_id: int,
):
    db = SessionLocal()

    try:
        # 1. 验证课程属于当前教师
        teacher_course = (
            db.query(CourseTeachers)
            .filter(
                CourseTeachers.teacher_id == teacher_id,
                CourseTeachers.course_id == course_id,
            )
            .first()
        )

        if not teacher_course:
            raise HTTPException(
                status_code=403,
                detail="无权访问该课程",
            )

        # 2. 验证路线属于当前课程
        route = (
            db.query(Route)
            .filter(
                Route.id == route_id,
                Route.course_id == course_id,
                Route.is_active == True,
            )
            .first()
        )

        if not route:
            raise HTTPException(
                status_code=404,
                detail="路线不存在或不属于该课程",
            )

        # 3. 当前课程学生范围
        course_student_ids = (
            db.query(CourseStudents.student_id)
            .filter(
                CourseStudents.course_id == course_id
            )
        )

        # 4. 查询当前路线所有报告 + 评价
        rows = (
            db.query(
                Report,
                ReportEvaluation,
            )
            .outerjoin(
                ReportEvaluation,
                ReportEvaluation.report_id == Report.id,
            )
            .filter(
                Report.route_id == route_id,
                Report.student_id.in_(course_student_ids),
            )
            .all()
        )

        total_reports = len(rows)

        # 只有真正有 score 的才算已评分
        scored_rows = [
            (report, evaluation)
            for report, evaluation in rows
            if evaluation is not None
            and evaluation.score is not None
        ]

        graded_reports = len(scored_rows)

        # 5. 平均分
        if graded_reports > 0:
            average_score = round(
                sum(
                    evaluation.score
                    for _, evaluation in scored_rows
                ) / graded_reports,
                1,
            )
        else:
            average_score = 0

        # 6. 分数分布
        distribution = {
            "excellent": 0,
            "good": 0,
            "pass": 0,
            "fail": 0,
        }

        for _, evaluation in scored_rows:
            score = evaluation.score

            if score >= 90:
                distribution["excellent"] += 1

            elif score >= 80:
                distribution["good"] += 1

            elif score >= 60:
                distribution["pass"] += 1

            else:
                distribution["fail"] += 1

        # 7. 百分比
        if graded_reports > 0:
            distribution_percent = {
                key: round(
                    value / graded_reports * 100,
                    1,
                )
                for key, value in distribution.items()
            }
        else:
            distribution_percent = {
                "excellent": 0,
                "good": 0,
                "pass": 0,
                "fail": 0,
            }

        # 8. 平均分趋势
        #
        # 这里按照评价更新时间的“日期”统计当天平均分
        trend_rows = (
            db.query(
                func.date(
                    ReportEvaluation.updated_at
                ).label("date"),

                func.avg(
                    ReportEvaluation.score
                ).label("average_score"),
            )
            .join(
                Report,
                ReportEvaluation.report_id == Report.id,
            )
            .filter(
                Report.route_id == route_id,
                Report.student_id.in_(course_student_ids),
                ReportEvaluation.score.isnot(None),
            )
            .group_by(
                func.date(
                    ReportEvaluation.updated_at
                )
            )
            .order_by(
                func.date(
                    ReportEvaluation.updated_at
                )
            )
            .all()
        )

        score_trend = [
            {
                "date": str(row.date),
                "average_score": round(
                    float(row.average_score),
                    1,
                ),
            }
            for row in trend_rows
        ]

        return {
            "route_id": route_id,
            "route_name": route.route_name,

            "total_reports": total_reports,
            "graded_reports": graded_reports,
            "ungraded_reports": (
                total_reports - graded_reports
            ),

            "average_score": average_score,

            "score_distribution": distribution,

            "score_distribution_percent":
                distribution_percent,

            "score_trend": score_trend,
        }

    finally:
        db.close()


class LearningMaterialCreate(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=255,
    )

    description: Optional[str] = None

    material_type: str

    external_url: Optional[str] = None
class LearningMaterialUpdate(BaseModel):
    title: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=255,
    )

    description: Optional[str] = None

    external_url: Optional[str] = None
def serialize_learning_material(material):
    return {
        "id": material.id,
        "point_id": material.point_id,

        "title": material.title,
        "description": material.description,

        "material_type": material.material_type,

        "file_url": material.file_url,
        "file_name": material.file_name,
        "file_type": material.file_type,
        "file_size": material.file_size,

        "external_url": material.external_url,

        "created_at": material.created_at,
        "updated_at": material.updated_at,
    }
@router.get("/points/{point_id}/materials")
def get_point_learning_materials(
    point_id: int,
):
    db = SessionLocal()

    try:
        point = (
            db.query(Point)
            .filter(
                Point.id == point_id,
                Point.is_active == True,
            )
            .first()
        )

        if not point:
            raise HTTPException(
                status_code=404,
                detail="观察点不存在",
            )

        materials = (
            db.query(PointLearningMaterial)
            .filter(
                PointLearningMaterial.point_id == point_id
            )
            .order_by(
                PointLearningMaterial.created_at.asc()
            )
            .all()
        )

        return {
            "point_id": point_id,
            "total": len(materials),
            "items": [
                serialize_learning_material(material)
                for material in materials
            ],
        }

    finally:
        db.close()
@router.post("/points/{point_id}/materials")
def create_point_learning_material(
    point_id: int,
    data: LearningMaterialCreate,
):
    db = SessionLocal()

    try:
        point = (
            db.query(Point)
            .filter(
                Point.id == point_id,
                Point.is_active == True,
            )
            .first()
        )

        if not point:
            raise HTTPException(
                status_code=404,
                detail="观察点不存在",
            )

        if data.material_type not in [
            "text",
            "link",
        ]:
            raise HTTPException(
                status_code=400,
                detail="该接口仅支持 text 或 link 类型",
            )

        if (
            data.material_type == "link"
            and not data.external_url
        ):
            raise HTTPException(
                status_code=400,
                detail="链接资料必须提供 external_url",
            )

        new_material = PointLearningMaterial(
            point_id=point_id,

            title=data.title.strip(),

            description=(
                data.description.strip()
                if data.description
                else None
            ),

            material_type=data.material_type,

            external_url=(
                data.external_url.strip()
                if data.external_url
                else None
            ),
        )

        db.add(new_material)
        db.commit()
        db.refresh(new_material)

        return {
            "message": "学习资料创建成功",
            "material":
                serialize_learning_material(
                    new_material
                ),
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()

@router.post("/points/{point_id}/materials/upload")
async def upload_point_learning_material(
    point_id: int,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
):
    db = SessionLocal()
    saved_path = None

    try:
        # 1. 先确认观察点存在
        point = (
            db.query(Point)
            .filter(
                Point.id == point_id,
                Point.is_active == True,
            )
            .first()
        )

        if not point:
            raise HTTPException(
                status_code=404,
                detail="观察点不存在",
            )

        # 2. 标题不能为空
        if not title.strip():
            raise HTTPException(
                status_code=400,
                detail="资料标题不能为空",
            )

        # 3. 检查扩展名
        original_name = file.filename or ""

        extension = Path(
            original_name
        ).suffix.lower()

        if extension not in ALLOWED_MATERIAL_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail="不支持的文件类型",
            )

        # 4. 读取文件
        content = await file.read()

        if not content:
            raise HTTPException(
                status_code=400,
                detail="上传文件不能为空",
            )

        # 5. 最大 20MB
        if len(content) > MAX_MATERIAL_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="文件不能超过 20MB",
            )

        # 6. UUID + 保留真实扩展名
        unique_name = (
            f"{uuid.uuid4().hex}{extension}"
        )

        saved_path = (
            POINT_MATERIAL_UPLOAD_DIR
            / unique_name
        )

        # 7. 写到磁盘
        with open(saved_path, "wb") as output:
            output.write(content)

        # 注意：
        # 数据库继续保持你现有项目的相对路径规则
        file_url = (
            f"uploads/point_materials/"
            f"{unique_name}"
        )

        # 8. 保存数据库记录
        material = PointLearningMaterial(
            point_id=point_id,
            title=title.strip(),
            description=(
                description.strip()
                if description
                else None
            ),
            material_type="file",
            file_url=file_url,
            file_name=original_name,
            file_type=file.content_type,
            file_size=len(content),
            external_url=None,
        )

        db.add(material)
        db.commit()
        db.refresh(material)

        return {
            "message": "学习资料上传成功",
            "material": serialize_learning_material(
                material
            ),
        }

    except Exception:
        db.rollback()

        # DB 失败时顺便删除刚写进去的文件
        if saved_path and saved_path.exists():
            saved_path.unlink()

        raise

    finally:
        db.close()
@router.put("/materials/{material_id}")
def update_learning_material(
    material_id: int,
    data: LearningMaterialUpdate,
):
    db = SessionLocal()

    try:
        material = (
            db.query(PointLearningMaterial)
            .filter(
                PointLearningMaterial.id == material_id
            )
            .first()
        )

        if not material:
            raise HTTPException(
                status_code=404,
                detail="学习资料不存在",
            )

        if data.title is not None:
            material.title = data.title.strip()

        if data.description is not None:
            material.description = (
                data.description.strip()
                if data.description
                else None
            )

        if data.external_url is not None:
            if material.material_type != "link":
                raise HTTPException(
                    status_code=400,
                    detail="只有链接资料可以修改链接地址",
                )

            material.external_url = (
                data.external_url.strip()
                if data.external_url
                else None
            )

        db.commit()
        db.refresh(material)

        return {
            "message": "学习资料修改成功",
            "material": serialize_learning_material(
                material
            ),
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()
@router.delete("/materials/{material_id}")
def delete_learning_material(
    material_id: int,
):
    db = SessionLocal()

    try:
        material = (
            db.query(PointLearningMaterial)
            .filter(
                PointLearningMaterial.id == material_id
            )
            .first()
        )

        if not material:
            raise HTTPException(
                status_code=404,
                detail="学习资料不存在",
            )

        file_path = None

        if (
            material.material_type == "file"
            and material.file_url
        ):
            filename = Path(
                material.file_url
            ).name

            file_path = (
                POINT_MATERIAL_UPLOAD_DIR
                / filename
            )

        db.delete(material)
        db.commit()

        if file_path and file_path.exists():
            try:
                file_path.unlink()
            except OSError:
                pass

        return {
            "message": "学习资料删除成功",
            "material_id": material_id,
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()