from unittest import result
import os

from app.models.point import Point
from app.models.track import Track
from app.models.student import Student
from app.models.observation import Observation
from app.models import ai_analysis
from app.models.course_teacher import CourseTeachers
from fastapi import BackgroundTasks, FastAPI, HTTPException
from app.database.database import engine, Base
from app.database.database import SessionLocal
from app.models.course import Course
from app.models.route import Route
from app.models.checkin import Checkin
from app.models.route_path import RoutePath
from app.models.create_student import CourseStudents
from app.models.notification import Notification
from app.models.notification_read import NotificationRead
from passlib.context import CryptContext
from pydantic import BaseModel, model_validator
from datetime import datetime
from fastapi import UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from app.service.dify_service import analyze_observation
from app.service.report_service import (
    get_student_info,
    get_course_info,
    get_route_info,
    get_checkin_records,
    get_observation_records,
    get_student_summary,
    print_dify_input_lengths
)

from app.service.dify_service2 import extract_report_text, generate_student_report
from app.service.location_service import calculate_distance
from app.service.progress_service import calculate_observation_progress
from app.service.current_task_service import filter_current_observations

from app.models.report import Report
from app.models.report_evaluation import ReportEvaluation
from app.routers.teacher import router as teacher_router
from fastapi.middleware.cors import CORSMiddleware
import shutil
import uuid
from pathlib import Path
from sqlalchemy import func, text
from sqlalchemy import exists, and_
from typing import List, Literal
from fastapi.middleware.cors import CORSMiddleware
from app.core.security import create_access_token
from contextlib import asynccontextmanager
from fastapi.responses import FileResponse, RedirectResponse

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        print("Database initialization completed")
    except Exception as error:
        print("Database initialization failed:", repr(error))

    yield


app = FastAPI(lifespan=lifespan)


frontend_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
]

student_frontend_url = os.getenv("STUDENT_FRONTEND_URL")
teacher_frontend_url = os.getenv("TEACHER_FRONTEND_URL")

if student_frontend_url:
    frontend_origins.append(student_frontend_url)

if teacher_frontend_url:
    frontend_origins.append(teacher_frontend_url)


app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

app.include_router(teacher_router)

from app.core.upload_dir import get_uploads_root

uploads_directory = get_uploads_root()

app.mount(
    "/uploads",
    StaticFiles(directory=str(uploads_directory)),
    name="uploads",
)

def ensure_report_task_columns(): #？
    """Keep the existing database usable without introducing a migration tool."""
    with engine.begin() as connection:
        connection.execute(text(
            "ALTER TABLE reports "
            "ADD COLUMN IF NOT EXISTS status VARCHAR "
            "DEFAULT 'completed' NOT NULL"
        ))
        connection.execute(text(
            "ALTER TABLE reports "
            "ADD COLUMN IF NOT EXISTS error_message TEXT"
        ))


ensure_report_task_columns()

def ensure_observation_configuration_columns():
    """Upgrade existing databases with the observation configuration fields."""
    with engine.begin() as connection:
        connection.execute(text(
            "ALTER TABLE routes "
            "ADD COLUMN IF NOT EXISTS free_observation_enabled BOOLEAN "
            "DEFAULT FALSE NOT NULL"
        ))
        connection.execute(text(
            "ALTER TABLE routes "
            "ADD COLUMN IF NOT EXISTS required_free_observation_count INTEGER "
            "DEFAULT 0 NOT NULL"
        ))
        connection.execute(text(
            "ALTER TABLE observations "
            "ADD COLUMN IF NOT EXISTS point_id INTEGER REFERENCES points(id)"
        ))
        connection.execute(text(
            "UPDATE observations SET observation_type = 'free' "
            "WHERE observation_type IS NULL OR observation_type = 'self'"
        ))
        connection.execute(text(
            "ALTER TABLE observations "
            "ALTER COLUMN observation_type SET DEFAULT 'free'"
        ))
        connection.execute(text(
            "ALTER TABLE observations "
            "ALTER COLUMN observation_type SET NOT NULL"
        ))
        connection.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_observations_point_id "
            "ON observations (point_id)"
        ))


ensure_observation_configuration_columns()

@app.get("/")
def root():
    return RedirectResponse(url="/student/")
@app.get("/health")
def health():
    return {
        "status": "ok",
        "message": "野外实习系统后端启动成功"
    }



@app.get("/test_db")
def test_db():
    try:
        with engine.connect() as connection:
            return{
                "database":"连接成功"
            }
    except Exception as e:
        return{
            "database":"连接失败",
            "error":str(e)
        }

class CreateCourse(BaseModel):
    name: str
    description: str
    teacher_id: int
@app.post("/courses")
def post_course(course:CreateCourse):
    db= SessionLocal()
    try:
        new_course = Course(course_name=course.name, course_description=course.description)
        db.add(new_course)
        db.commit()
        db.refresh(new_course)
        teacher_course = CourseTeachers(course_id=new_course.id, teacher_id=course.teacher_id)
        db.add(teacher_course)
        db.commit()
        return {"message": "课程创建成功", "course_id": new_course.id}
    finally:
        db.close()
   
@app.get("/courses/{course_id}")
def get_course(course_id:int):
    db = SessionLocal()
    try:
        course = db.query(Course).filter(Course.id == course_id, Course.is_active == True).first()
        if not course:
            return {"message":"未找到相关课程信息"}
        return course
    finally:
        db.close()
class CourseResponse(BaseModel):
    id: int
    course_name: str
    course_description: str | None = None

    class Config:
            from_attributes = True
@app.get("/students/{student_id}/courses")
def get_stu_course(student_id:int):
    db = SessionLocal()
    try:
        courses = db.query(Course).join(CourseStudents, Course.id == CourseStudents.course_id).filter(CourseStudents.student_id == student_id, Course.is_active == True).all()
        if not courses:
            return []
        return [
            {
                "id": course.id,
                "name": course.course_name,
                "description": course.course_description
            }
            for course in courses
        ]
    finally:
        db.close()
@app.post("/students/{student_id}/courses/{course_id}")
def student_join_course(student_id:int, course_id:int):
    db = SessionLocal()
    try:
        exist = (db.query(CourseStudents).filter(CourseStudents.student_id == student_id,CourseStudents.course_id == course_id).first())
        if exist:
            return {
                "message": "学生已经加入该课程"
            }
        course = (
            db.query(Course).filter(Course.id == course_id,Course.is_active == True).first())
        if not course:
            return {
                "message": "课程不存在"
            }
        student = (
            db.query(Student)
            .filter(Student.id == student_id)
            .first()
        )

        if not student:
            return {
                "message":"学生不存在"
            }
        student_course = CourseStudents(
            student_id=student_id,
            course_id=course_id
        )
        db.add(student_course)
        if student.current_course_id is None:
            student.current_course_id = course_id
        db.commit()
        db.refresh(student_course)
        return {
            "message": "加入课程成功",
            "course_id": course_id
        }
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
@app.get("/students/{student_id}/available-courses")
def get_available_courses(student_id: int):
    db = SessionLocal()
    try:
        # 查询学生已经加入的课程id
        joined_course_ids = (
            db.query(CourseStudents.course_id)
            .filter(
                CourseStudents.student_id == student_id
            )
            .subquery()
        )
        # 查询没有加入的有效课程
        courses = (
            db.query(Course)
            .filter(
                Course.is_active == True,
                ~Course.id.in_(joined_course_ids)
            )
            .all()
        )

        if not courses:
            return []

        return [
            {
                "id": course.id,
                "name": course.course_name,
                "description": course.course_description
            }
            for course in courses
        ]
    finally:
        db.close()
@app.get("/students/{student_id}/current-course")
def get_current_course(student_id: int):
    db = SessionLocal()
    try:
        student = (
            db.query(Student)
            .filter(Student.id == student_id)
            .first()
        )

        if not student:
            raise HTTPException(status_code=404, detail="学生不存在")

        if student.current_course_id is None:
            return None

        course = (
            db.query(Course)
            .filter(
                Course.id == student.current_course_id,
                Course.is_active == True
            )
            .first()
        )

        if not course:
            return None

        return {
            "id": course.id,
            "name": course.course_name,
            "description": course.course_description
        }
    finally:
        db.close()
@app.put("/students/{student_id}/current-course/{course_id}")
def switch_current_course(student_id: int, course_id: int):
    db = SessionLocal()

    try:
        student = (
            db.query(Student)
            .filter(Student.id == student_id)
            .first()
        )

        if not student:
            raise HTTPException(status_code=404, detail="学生不存在")

        joined = (
            db.query(CourseStudents)
            .filter(
                CourseStudents.student_id == student_id,
                CourseStudents.course_id == course_id
            )
            .first()
        )

        if not joined:
            raise HTTPException(
                status_code=400,
                detail="学生尚未加入该课程"
            )

        course = (
            db.query(Course)
            .filter(
                Course.id == course_id,
                Course.is_active == True
            )
            .first()
        )

        if not course:
            raise HTTPException(status_code=404, detail="课程不存在")

        student.current_course_id = course_id

        db.commit()

        return {
            "message": "当前课程切换成功",
            "current_course": {
                "id": course.id,
                "name": course.course_name,
                "description": course.course_description
            }
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()
@app.get("/students/{student_id}/current-course/routes")
def get_current_course_routes(student_id: int):
    db = SessionLocal()

    try:
        student = (
            db.query(Student)
            .filter(Student.id == student_id)
            .first()
        )

        if not student:
            raise HTTPException(status_code=404, detail="学生不存在")

        if student.current_course_id is None:
            return []
        course = (
            db.query(Course)
            .filter(
                Course.id == student.current_course_id,
                Course.is_active == True
            )
            .first()
        )

        if not course:
            return []
        routes = (
            db.query(Route)
            .filter(
                Route.course_id == student.current_course_id,
                Route.is_active == True,
                Route.status == "published"
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

class CreateRoute(BaseModel):
    name: str
    description: str
    course_id: int
    start_date: datetime
    free_observation_enabled: bool = False
    required_free_observation_count: int = 0

    @model_validator(mode="after")
    def validate_free_observation_configuration(self):
        if self.required_free_observation_count < 0:
            raise ValueError("自由观察要求数量不能小于 0")
        if not self.free_observation_enabled and self.required_free_observation_count != 0:
            raise ValueError("未启用自由观察时，要求数量必须为 0")
        return self

@app.post("/routes")
def post_route(route:CreateRoute):
    db= SessionLocal()
    try:
        new_route = Route(
            route_name=route.name,
            route_description=route.description,
            course_id=route.course_id,
            start_date=route.start_date.date(),
            free_observation_enabled=route.free_observation_enabled,
            required_free_observation_count=route.required_free_observation_count,
        )
        db.add(new_route)
        db.commit()
        db.refresh(new_route)
        return {
            "message": "路线创建成功",
            "route_id": new_route.id,
            "free_observation_enabled": new_route.free_observation_enabled,
            "required_free_observation_count": new_route.required_free_observation_count,
        }
    finally:
        db.close()

@app.get("/routes")
def get_routes():
    db = SessionLocal()
    try:
        routes = db.query(Route).filter(
            Route.is_active == True,
            Route.status == "published",
        ).order_by(Route.id.desc()).all()
        return [
            {
                "id": route.id,
                "route_name": route.route_name,
                "route_description": route.route_description,
                "start_date": route.start_date,
                "free_observation_enabled": route.free_observation_enabled,
                "required_free_observation_count": route.required_free_observation_count,
            }
            for route in routes
        ]
    finally:
        db.close()

@app.get("/routes/{route_id}")
def get_route(route_id:int):
    db=SessionLocal()
    try:
        route = db.query(Route).filter(Route.id == route_id, Route.is_active == True).first()
        if not route:
            return{"message":"没有找到这条路线信息"}
        else:
            return{
                "id": route.id,
                "route_name": route.route_name,
                "route_description": route.route_description,
                "course_id": route.course_id,
                "start_date": route.start_date,
                "free_observation_enabled": route.free_observation_enabled,
                "required_free_observation_count": route.required_free_observation_count,
            }
    finally:
        db.close()
class RouteResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    course_id: int
    start_date: datetime

    class Config:
            from_attributes = True

class CreatePoint(BaseModel):
    name: str
    point_code: str 
    latitude: float
    longitude: float
    description: str
    task: str
    route_id: int
@app.post("/points")
def post_point(point:CreatePoint):#变量名和其类型
    db= SessionLocal()
    try:
        new_point = Point(point_name=point.name, point_code=point.point_code, latitude=point.latitude, longitude=point.longitude, point_description=point.description, task=point.task, route_id=point.route_id)
        db.add(new_point)
        db.commit()
        db.refresh(new_point)
        return {"message": "点创建成功", "point_id": new_point.id}
    finally:
        db.close()


@app.get("/points")
def get_points():
    db = SessionLocal()
    try:
        points = db.query(Point).filter(Point.is_active == True).all()
        return points
    finally:
        db.close()

class PointResponse(BaseModel):
    id: int
    name: str
    point_code: str
    latitude: float
    longitude: float
    description: str | None = None
    task: str | None = None
    route_id: int

    class Config:
            from_attributes = True

class LocationCheckin(BaseModel):
    student_id: int
    latitude: float
    longitude: float

class CheckinResponse(BaseModel):
    id: int
    student_id: int
    point_id: int
    point_name: str
    latitude: float
    longitude: float
    status: str
    checkin_time: datetime

    class Config:
        from_attributes = True

class AutoCheckinResponse(BaseModel):
    message:str
    checkin_id:int | None = None
    point_id:int | None = None
    point_name:str | None = None
    distance:float | None = None
    observation_id:int | None = None
    photo_url:str | None = None
class OfflineCheckinSyncRequest(BaseModel):
    student_id: int
    point_id: int
    latitude: float
    longitude: float
    checked_at: datetime | None = None
@app.post("/routes/{route_id}/auto_checkin", response_model=AutoCheckinResponse)
def auto_checkin(
    route_id: int,
    submitted_route_id: int = Form(..., alias="route_id"),
    student_id: int = Form(...),
    point_id: int = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    photo: UploadFile = File(...),
):
    db= SessionLocal()
    saved_photo_path = None
    try:
        if submitted_route_id != route_id:
            raise HTTPException(status_code=400, detail="签到路线信息不一致")

        point = db.query(Point).filter(
            Point.id == point_id,
            Point.route_id == route_id,
            Point.is_active == True,
        ).first()
        if not point:
            raise HTTPException(status_code=404, detail="未找到对应的观察点")

        distance = calculate_distance(
            lat1=latitude,
            lon1=longitude,
            lat2=point.latitude,
            lon2=point.longitude,
        )
        CHECKIN_DISTANCE = 50
        if distance > CHECKIN_DISTANCE:
            return {
                "message": "距离观察点过远，无法签到",
                "point_id": point.id,
                "point_name": point.point_name,
                "distance": round(distance, 2),
            }

        existing = db.query(Checkin).filter(
            Checkin.student_id == student_id,
            Checkin.point_id == point.id,
        ).first()
        if existing:
            return {
                "message": "已签到",
                "checkin_id": existing.id,
                "point_id": point.id,
                "point_name": point.point_name,
                "distance": round(distance, 2),
            }

        if not photo.content_type or not photo.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="请上传有效的地质照片")

        uploads_directory.mkdir(parents=True, exist_ok=True)
        file_name = f"{uuid.uuid4()}.jpg"
        saved_photo_path = uploads_directory / file_name
        with saved_photo_path.open("wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
        photo_url = f"uploads/{file_name}"

        observation = Observation(
            student_id=student_id,
            route_id=route_id,
            point_id=point.id,
            observation_text=f"{point.point_name}签到照片",
            latitude=latitude,
            longitude=longitude,
            photo_url=photo_url,
            observation_type="checkin"
        )
        new_checkin = Checkin(
            student_id=student_id,
            point_id=point.id,
            latitude=latitude,
            longitude=longitude,
            status="success",
        )
        db.add(observation)
        db.add(new_checkin)
        db.flush()
        observation_id = observation.id
        checkin_id = new_checkin.id
        db.commit()
        return {
            "message": "已签到",
            "checkin_id": checkin_id,
            "point_id": point.id,
            "point_name": point.point_name,
            "distance": round(distance, 2),
            "observation_id": observation_id,
            "photo_url": photo_url,
        }
    except Exception:
        db.rollback()
        if saved_photo_path and saved_photo_path.exists():
            saved_photo_path.unlink()
        raise
    finally:
        photo.file.close()
        db.close()
@app.post("/routes/{route_id}/sync_offline_checkin",response_model=AutoCheckinResponse)
def sync_offline_checkin(
    route_id: int,

    submitted_route_id: int = Form(
        ...,
        alias="route_id",
    ),

    student_id: int = Form(...),

    point_id: int = Form(...),

    latitude: float = Form(...),

    longitude: float = Form(...),

    checked_at: str | None = Form(None),

    photo: UploadFile = File(...),
):
    db = SessionLocal()
    saved_photo_path = None

    try:
        # 1. 防止 path route_id 和表单 route_id 不一致
        if submitted_route_id != route_id:
            raise HTTPException(
                status_code=400,
                detail="签到路线信息不一致",
            )

        # 2. 找观察点，并验证这个点属于当前路线
        point = (
            db.query(Point)
            .filter(
                Point.id == point_id,
                Point.route_id == route_id,
                Point.is_active == True,
            )
            .first()
        )

        if not point:
            raise HTTPException(
                status_code=404,
                detail="未找到对应的观察点",
            )

        # 3. 后端重新根据“离线签到当时的坐标”计算距离
        distance = calculate_distance(
            lat1=latitude,
            lon1=longitude,
            lat2=point.latitude,
            lon2=point.longitude,
        )

        CHECKIN_DISTANCE = 50

        if distance > CHECKIN_DISTANCE:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"离线签到位置距离观察点过远："
                    f"{round(distance, 2)} 米"
                ),
            )

        # 4. 防止重复签到
        existing = (
            db.query(Checkin)
            .filter(
                Checkin.student_id == student_id,
                Checkin.point_id == point.id,
            )
            .first()
        )

        if existing:
            return {
                "message": "已签到",
                "checkin_id": existing.id,
                "point_id": point.id,
                "point_name": point.point_name,
                "distance": round(distance, 2),
            }

        # 5. 验证照片
        if (
            not photo.content_type
            or not photo.content_type.startswith("image/")
        ):
            raise HTTPException(
                status_code=400,
                detail="请上传有效的地质照片",
            )

        # 6. 保存照片
        uploads_directory.mkdir(
            parents=True,
            exist_ok=True,
        )

        file_name = f"{uuid.uuid4()}.jpg"

        saved_photo_path = (
            uploads_directory
            / file_name
        )

        with saved_photo_path.open("wb") as buffer:
            shutil.copyfileobj(
                photo.file,
                buffer,
            )

        photo_url = f"uploads/{file_name}"

        # 7. 创建签到 observation
        observation = Observation(
            student_id=student_id,
            route_id=route_id,
            point_id=point.id,

            observation_text=(
                f"{point.point_name}签到照片"
            ),

            latitude=latitude,
            longitude=longitude,

            photo_url=photo_url,

            observation_type="checkin",
        )

        # 8. 创建 checkin
        new_checkin = Checkin(
            student_id=student_id,
            point_id=point.id,

            latitude=latitude,
            longitude=longitude,

            status="success",
        )

        db.add(observation)
        db.add(new_checkin)

        db.flush()

        observation_id = observation.id
        checkin_id = new_checkin.id

        db.commit()

        return {
            "message": "离线签到同步成功",
            "checkin_id": checkin_id,
            "point_id": point.id,
            "point_name": point.point_name,
            "distance": round(distance, 2),
            "observation_id": observation_id,
            "photo_url": photo_url,
        }

    except Exception:
        db.rollback()

        if (
            saved_photo_path
            and saved_photo_path.exists()
        ):
            saved_photo_path.unlink()

        raise

    finally:
        photo.file.close()
        db.close()
@app.get("/checkins/student/{student_id}",response_model=list[CheckinResponse])#获取学生的签到记录
def get_checkins(student_id: int):
    db = SessionLocal()
    try:
        results = (db.query(Checkin, Point)
            .join(Point, Checkin.point_id == Point.id)
            .filter(
                Checkin.student_id == student_id,
                Point.is_active == True,
            )
            .all())
        checkins=[]
        for checkin, point in results:
            checkins.append({

                "id":checkin.id,

                "student_id":checkin.student_id,

                "point_id":point.id,

                "point_name":point.point_name,

                "latitude":checkin.latitude,

                "longitude":checkin.longitude,

                "status":checkin.status,

                "checkin_time":checkin.checkin_time

            })
        return checkins
    finally:
        db.close()
@app.get("/checkins/student/{student_id}/route/{route_id}")#获取学生某一具体线路的签到记录
def get_each_route_checkins(student_id:int, route_id:int):
    db = SessionLocal()
    try:
        results = (
            db.query(Checkin, Point)
            .join(Point, Checkin.point_id == Point.id)
            .filter(
                Checkin.student_id == student_id,
                Point.route_id == route_id,
                Point.is_active == True,
            )
            .all()
        )
        data=[]
        for checkin, point in results:
            data.append({
                "id":checkin.id,
                "student_id":checkin.student_id,
                "point_id":point.id,
                "point_name":point.point_name,
                "latitude":checkin.latitude,
                "longitude":checkin.longitude,
                "status":checkin.status,
                "checkin_time":checkin.checkin_time
            })
        return data
    finally:
        db.close()



class CreateTrack(BaseModel):
    student_id: int
    route_id: int
    latitude: float
    longitude: float
    recorded_time: datetime

@app.post("/tracks")
def post_track(track:CreateTrack):
    db= SessionLocal()
    try:
        new_track = Track(student_id=track.student_id, route_id=track.route_id, latitude=track.latitude, longitude=track.longitude, recorded_time=track.recorded_time)
        db.add(new_track)
        db.commit()
        db.refresh(new_track)
        return {"message": "轨迹记录创建成功", "track_id": new_track.id}
    finally:
        db.close()
@app.get("/tracks/student/{student_id}/routes/{route_id}")#根据学生和其路线获取轨迹记录
def get_tracks(student_id: int, route_id: int):
    db = SessionLocal()
    try:
        tracks = (db.query(Track).filter(Track.student_id == student_id,Track.route_id == route_id).order_by(Track.recorded_time.asc()).all())
        return {
            "coordinate_system": "WGS84",
            "tracks": [
                {
                    "id": t.id,
                    "student_id": t.student_id,
                    "route_id": t.route_id,
                    "latitude": t.latitude,
                    "longitude": t.longitude,
                    "recorded_time": t.recorded_time
                }
                for t in tracks
            ]
        }
    finally:
        db.close()
class TrackResponse(BaseModel):
    id: int
    student_id: int
    route_id:int
    latitude: float
    longitude: float
    recorded_time: datetime
    coordinate_system: str = "WGS84"

    class Config:
        from_attributes = True

@app.get("/routes/{route_id}/points")#查看路径中所有的点位
def get_points_by_route(route_id: int):
    db = SessionLocal()
    try:
        points = db.query(Point).filter(
            Point.route_id == route_id,
            Point.is_active == True,
        ).order_by(Point.id).all()
        return points
    finally:
        db.close()

@app.get("/students/{student_id}/routes/{route_id}/location")#根据路径获取学生的最新位置
def get_location(student_id:int, route_id:int):
    db = SessionLocal()
    try:
        latest_track = (db.query(Track).filter(Track.student_id == student_id,Track.route_id == route_id).order_by(Track.recorded_time.desc()).first())
        if latest_track:
            return {
                "latitude": latest_track.latitude,
                "longitude": latest_track.longitude,
                "recorded_time": latest_track.recorded_time
            }
        return {
            "message":"No location data found"
        }
    finally:
        db.close()

class RegisterStudent(BaseModel):
    student_name: str
    student_number: str
    college: str
    password: str
    major: str | None = None
    grade: str | None = None
@app.post("/students/register")
def student_register(student: RegisterStudent):
    db = SessionLocal()
    try:
        exist = db.query(Student).filter(Student.student_number == student.student_number).first()
        if exist:
            return {"message": "该学生已注册"}
        new_student = Student(student_name = student.student_name,student_number = student.student_number,password_hash=pwd_context.hash(student.password), college = student.college, major=student.major, grade = student.grade)
        db.add(new_student)
        db.commit()
        db.refresh(new_student)
        return{
            "message": "学生注册成功",
            "student_id": new_student.id
        }
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
class LoginStudent(BaseModel):
    student_number: str
    password: str
@app.post("/students/login")
def student_login(data: LoginStudent):
    db = SessionLocal()

    try:
        db_student = (
            db.query(Student)
            .filter(Student.student_number == data.student_number)
            .first()
        )

        if not db_student:
            return {
                "message": "该学生还未注册"
            }

        if not pwd_context.verify(
            data.password,
            db_student.password_hash
        ):
            return {
                "message": "密码错误"
            }

        access_token = create_access_token(
            user_id=db_student.id,
            role="student"
        )

        return {
            "message": "登录成功",
            "access_token": access_token,
            "token_type": "bearer",
            "student": {
                "id": db_student.id,
                "name": db_student.student_name,
                "student_number": db_student.student_number,
                "college": db_student.college,
                "major": db_student.major
            }
        }

    finally:
        db.close()
@app.get("/students/{student_id}")
def get_student(student_id:int):
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return{"message":"未找到此学生信息"}
    
        return student
    finally:
        db.close()




@app.get("/students/{student_id}/routes/{route_id}/summary")
def get_student_route_summary(student_id: int, route_id: int):
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="未找到此学生信息")

        route = db.query(Route).filter(
            Route.id == route_id,
            Route.is_active == True,
            Route.status == "published",
        ).first()
        if not route:
            raise HTTPException(status_code=404, detail="未找到已发布的实习路线")

        points = db.query(Point).filter(
            Point.route_id == route_id,
            Point.is_active == True,
        ).all()
        active_point_ids = {point.id for point in points}

        checkin_results = (
            db.query(Checkin, Point)
            .join(Point, Checkin.point_id == Point.id)
            .filter(
                Checkin.student_id == student_id,
                Point.route_id == route_id,
                Point.is_active == True,
                Checkin.status.in_(["success", "completed"]),
            )
            .order_by(Checkin.checkin_time.desc(), Checkin.id.desc())
            .all()
        )
        completed_point_ids = {
            checkin.point_id
            for checkin, _point in checkin_results
            if checkin.point_id in active_point_ids
        }

        observations = filter_current_observations(
            db.query(Observation)
            .filter(
                Observation.student_id == student_id,
                Observation.route_id == route_id,
            )
        ).all()
        free_observation_count = sum(
            1
            for observation in observations
            if observation.observation_type == "free"
        )
        fixed_observation_count = sum(
            1
            for observation in observations
            if observation.observation_type == "fixed"
        )
        fixed_required = len(points)
        fixed_completed = len(completed_point_ids)
        free_required = (
            route.required_free_observation_count
            if route.free_observation_enabled
            else 0
        )
        progress = calculate_observation_progress(
            fixed_completed=fixed_completed,
            fixed_required=fixed_required,
            free_submitted=free_observation_count,
            free_enabled=route.free_observation_enabled,
            free_required=free_required,
        )

        latest_analysis_result = (
            db.query(ai_analysis.AiAnalysis, Observation)
            .join(
                Observation,
                ai_analysis.AiAnalysis.observation_id == Observation.id,
            )
            .filter(
                Observation.student_id == student_id,
                Observation.route_id == route_id,
                ai_analysis.AiAnalysis.status == "completed",
            )
            .order_by(
                ai_analysis.AiAnalysis.analysis_time.desc(),
                ai_analysis.AiAnalysis.id.desc(),
            )
            .first()
        )
        latest_checkin_result = checkin_results[0] if checkin_results else None

        recent_activity = None
        if latest_analysis_result:
            analysis, observation = latest_analysis_result
            recent_activity = {
                "type": "analysis",
                "observation_id": observation.id,
                "activity_time": analysis.analysis_time or datetime.min,
                "location": analysis.rock_name or "观察记录",
            }
        if latest_checkin_result:
            checkin, point = latest_checkin_result
            if (
                recent_activity is None
                or (checkin.checkin_time or datetime.min) > recent_activity["activity_time"]
            ):
                recent_activity = {
                    "type": "checkin",
                    "point_id": point.id,
                    "activity_time": checkin.checkin_time or datetime.min,
                    "location": point.point_name,
                }

        return {
            "student": {
                "id": student.id,
                "student_name": student.student_name,
                "major": student.major,
                "grade": student.grade,
            },
            "route": {
                "id": route.id,
                "route_name": route.route_name,
                "start_date": route.start_date,
                "status": route.status,
                "free_observation_enabled": route.free_observation_enabled,
                "required_free_observation_count": route.required_free_observation_count,
            },
            "progress": progress,
            "stats": {
                "checkins": fixed_completed,
                "observations": len(observations),
                "fixed_observations": fixed_observation_count,
                "free_observations": free_observation_count,
            },
            "recent_activity": recent_activity,
        }
    finally:
        db.close()

@app.get("/dashboard/{student_id}/activities")#获取学生的所有活动记录，包括签到和AI分析结果 ？
def get_dashboard_activities(student_id: int):
    db = SessionLocal()
    try:
        analysis_results = filter_current_observations(
            db.query(ai_analysis.AiAnalysis, Observation)
            .join(
                Observation,
                ai_analysis.AiAnalysis.observation_id == Observation.id
            )
            .filter(Observation.student_id == student_id)
        ).all()

        checkin_results = (
            db.query(Checkin, Point)
            .join(Point, Checkin.point_id == Point.id)
            .filter(
                Checkin.student_id == student_id,
                Point.is_active == True,
            )
            .all()
        )

        activities = [
            {
                "type": "analysis",
                "observation_id": observation.id,
                "rock_name": analysis.rock_name,
                "analysis_time": analysis.analysis_time,
                "status": analysis.status,
            }
            for analysis, observation in analysis_results
        ]
        activities.extend([
            {
                "type": "checkin",
                "point_name": point.point_name,
                "checkin_time": checkin.checkin_time,
            }
            for checkin, point in checkin_results
        ])

        activities.sort(
            key=lambda activity: (
                activity.get("analysis_time")
                or activity.get("checkin_time")
                or datetime.min
            ),
            reverse=True
        )
        return activities
    finally:
        db.close()

class StudentResponse(BaseModel):
    id: int
    student_name: str
    student_email: str
    major: str
    grade: str

    class Config:
        from_attributes = True

class CreateObservation(BaseModel):
    student_id: int
    route_id:int
    point_id: int | None = None
    observation_type: Literal["fixed", "free"] = "free"
    observation_text: str
    latitude: float
    longitude: float
    rock_type: str | None = None  # Optional rock type
    photo_url: str | None = None  # Optional photo URL
@app.post("/observations")
def create_observation(observation: CreateObservation):
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == observation.student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="未找到此学生信息")

        route = db.query(Route).filter(
            Route.id == observation.route_id,
            Route.is_active == True,
        ).first()
        if not route:
            raise HTTPException(status_code=404, detail="未找到对应的实习路线")

        point = None
        if observation.observation_type == "fixed":
            if observation.point_id is None:
                raise HTTPException(status_code=400, detail="固定观察必须提供 point_id")
            point = db.query(Point).filter(
                Point.id == observation.point_id,
                Point.route_id == observation.route_id,
                Point.is_active == True,
            ).first()
            if not point:
                raise HTTPException(status_code=404, detail="未找到对应的固定观察点")
        else:
            if observation.point_id is not None:
                raise HTTPException(status_code=400, detail="自由观察不能关联固定观察点")
            if not route.free_observation_enabled:
                raise HTTPException(status_code=400, detail="当前路线未启用自由观察")

        new_observation = Observation(
            student_id=observation.student_id,
            route_id = observation.route_id,
            point_id=point.id if point else None,
            observation_text=observation.observation_text,
            latitude=observation.latitude,
            longitude=observation.longitude,
            rock_type=observation.rock_type,
            photo_url=observation.photo_url,
            observation_type=observation.observation_type,
        )
        db.add(new_observation)
        db.commit()
        db.refresh(new_observation)
        return {
            "message": "观察记录创建成功",
            "observation_id": new_observation.id,
            "observation_type": new_observation.observation_type,
            "point_id": new_observation.point_id,
        }
    finally:
        db.close()
@app.get("/observations/student/{student_id}")#每个学生的所有观察记录
def get_observation(student_id:int):
    db = SessionLocal()
    try:
        observation = filter_current_observations(
            db.query(Observation).filter(Observation.student_id == student_id)
        ).all()
        if not observation:
            return []

        return observation
    finally:
        db.close()

@app.get("/observations/student/{student_id}/records")#获取学生的所有观察记录及最新的AI分析结果 ？
def get_observation_records_with_latest_analysis(student_id: int):
    db = SessionLocal()
    try:
        latest_analysis_ids = (
            db.query(
                ai_analysis.AiAnalysis.observation_id.label("observation_id"),
                func.max(ai_analysis.AiAnalysis.id).label("latest_analysis_id")
            )
            .group_by(ai_analysis.AiAnalysis.observation_id)
            .subquery()
        )

        results = filter_current_observations(
            db.query(Observation, ai_analysis.AiAnalysis)
            .outerjoin(
                latest_analysis_ids,
                Observation.id == latest_analysis_ids.c.observation_id
            )
            .outerjoin(
                ai_analysis.AiAnalysis,
                ai_analysis.AiAnalysis.id == latest_analysis_ids.c.latest_analysis_id
            )
            .filter(Observation.student_id == student_id)
        ).order_by(
            Observation.observation_time.desc(),
            Observation.id.desc(),
        ).all()

        return [
            {
                "id": observation.id,
                "student_id": observation.student_id,
                "route_id": observation.route_id,
                "point_id": observation.point_id,
                "observation_type": observation.observation_type,
                "observation_time": observation.observation_time,
                "observation_text": observation.observation_text,
                "photo_url": observation.photo_url,
                "rock_type": observation.rock_type,
                "is_favorite": observation.is_favorite,
                "is_pinned": observation.is_pinned,
                "analysis_status": analysis.status if analysis else None,
                "rock_name": analysis.rock_name if analysis else None,
                "confidence": analysis.confidence if analysis else None,
            }
            for observation, analysis in results
        ]
    finally:
        db.close()

@app.get("/observations/student/{student_id}/favorites") # 获取学生收藏的观察记录（不受当前路线/观察点有效性过滤影响）
def get_observation_favorites(student_id: int):
    db = SessionLocal()
    try:
        latest_analysis_ids = (
            db.query(
                ai_analysis.AiAnalysis.observation_id.label("observation_id"),
                func.max(ai_analysis.AiAnalysis.id).label("latest_analysis_id")
            )
            .group_by(ai_analysis.AiAnalysis.observation_id)
            .subquery()
        )

        results = (
            db.query(Observation, ai_analysis.AiAnalysis)
            .outerjoin(
                latest_analysis_ids,
                Observation.id == latest_analysis_ids.c.observation_id
            )
            .outerjoin(
                ai_analysis.AiAnalysis,
                ai_analysis.AiAnalysis.id == latest_analysis_ids.c.latest_analysis_id
            )
            .filter(
                Observation.student_id == student_id,
                Observation.is_favorite == True,
            )
            .order_by(
                Observation.observation_time.desc(),
                Observation.id.desc(),
            )
            .all()
        )

        return [
            {
                "id": observation.id,
                "student_id": observation.student_id,
                "route_id": observation.route_id,
                "point_id": observation.point_id,
                "observation_type": observation.observation_type,
                "observation_time": observation.observation_time,
                "observation_text": observation.observation_text,
                "photo_url": observation.photo_url,
                "rock_type": observation.rock_type,
                "is_favorite": observation.is_favorite,
                "is_pinned": observation.is_pinned,
                "analysis_status": analysis.status if analysis else None,
                "rock_name": analysis.rock_name if analysis else None,
                "confidence": analysis.confidence if analysis else None,
            }
            for observation, analysis in results
        ]
    finally:
        db.close()

@app.put("/observations/{observation_id}/favorite") # 切换观察记录的收藏状态 ？
def toggle_observation_favorite(observation_id: int):
    db = SessionLocal()
    try:
        observation = db.query(Observation).filter(Observation.id == observation_id).first()
        if not observation:
            raise HTTPException(status_code=404, detail="未找到对应的观察记录")
        observation.is_favorite = not observation.is_favorite
        db.commit()
        db.refresh(observation)
        return {"id": observation.id, "is_favorite": observation.is_favorite}
    finally:
        db.close()

@app.put("/observations/{observation_id}/pin") # 切换观察记录的置顶状态
def toggle_observation_pin(observation_id: int):
    db = SessionLocal()
    try:
        observation = db.query(Observation).filter(Observation.id == observation_id).first()
        if not observation:
            raise HTTPException(status_code=404, detail="未找到对应的观察记录")
        observation.is_pinned = not observation.is_pinned
        db.commit()
        db.refresh(observation)
        return {"id": observation.id, "is_pinned": observation.is_pinned}
    finally:
        db.close()

@app.delete("/observations/{observation_id}") # 删除观察记录及其相关的AI分析结果 ？
def delete_observation(observation_id: int):
    db = SessionLocal()
    try:
        observation = db.query(Observation).filter(Observation.id == observation_id).first()
        if not observation:
            raise HTTPException(status_code=404, detail="未找到对应的观察记录")
        db.query(ai_analysis.AiAnalysis).filter(
            ai_analysis.AiAnalysis.observation_id == observation_id
        ).delete(synchronize_session=False)
        db.delete(observation)
        db.commit()
        return {"message": "观察记录删除成功", "id": observation_id}
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

@app.get("/observations/{observation_id}")
def get_observation(observation_id:int):
    db=SessionLocal()
    try:
        obs=db.query(Observation).filter( Observation.id==observation_id).first()
        return obs
    finally:
        db.close()
class ObservationResponse(BaseModel):
    id: int
    student_id: int
    route_id: int
    observation_text: str
    latitude: float
    longitude: float
    rock_type: str | None = None  # Optional rock type
    photo_url: str | None = None  # Optional photo URL
    observation_time: datetime

    class Config:
        from_attributes = True


@app.post("/observations/{observation_id}/upload_photo") #查询观察记录并上传照片
def upload_photo(observation_id: int, photo: UploadFile = File(...)):
    file_name= f"{uuid.uuid4()}.jpg"  # Generate a unique filename
    file_path = f"uploads/{file_name}"  # Save in the 'photos' directory

    # Save the uploaded file to the specified path
    uploads_directory.mkdir(parents=True, exist_ok=True)
    saved_photo_path = uploads_directory / file_name
    with saved_photo_path.open("wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)

    db = SessionLocal()
    try:
        observation = db.query(Observation).filter(Observation.id == observation_id).first()
        if observation:
            observation.photo_url = file_path
            db.commit()
            db.refresh(observation)
            return {"message": "照片上传成功", "observation_id": observation.id}
        else:
            return {"message": "未找到对应的观察记录"}
    finally:
        db.close()


def run_ai_analysis_task(id: int, analysis_id: int): # 运行AI分析任务 ？
    db = SessionLocal()
    try:
        observation = db.query(Observation).filter(Observation.id == id).first()
        if not observation:
            raise ValueError("未找到对应的观察记录")

        result = analyze_observation(
            text=observation.observation_text,
            longitude=observation.longitude,
            latitude=observation.latitude,
            photo_url=observation.photo_url,
            rock_type=observation.rock_type
        )
        outputs = result["data"]["outputs"]

        analysis_data = {
            "rock_name": outputs.get("rock_name", ""),
            "rock_type": outputs.get("rock_type", ""),
            "confidence": outputs.get("confidence", ""),
            "structure": outputs.get("structure", ""),
            "mineral": outputs.get("mineral", ""),
            "weathering": outputs.get("weathering", ""),
            "formation_environment": outputs.get("formation_environment", ""),
            "uncertainty": outputs.get("uncertainty", ""),
            "suggestions": outputs.get("suggestions", "")
        }

        student_report = outputs.get("student_report", "")

        analysis = db.query(ai_analysis.AiAnalysis).filter(
            ai_analysis.AiAnalysis.id == analysis_id
        ).first()
        analysis.rock_name = analysis_data["rock_name"]
        analysis.rock_type = analysis_data["rock_type"]
        analysis.confidence = analysis_data["confidence"]
        analysis.structure = analysis_data["structure"]
        analysis.mineral = analysis_data["mineral"]
        analysis.weathering = analysis_data["weathering"]
        analysis.formation_environment = analysis_data["formation_environment"]
        analysis.uncertainty = analysis_data["uncertainty"]
        analysis.suggestions = analysis_data["suggestions"]
        analysis.student_report = student_report
        analysis.status = "completed"
        db.commit()
    except Exception as error:
        db.rollback()
        print("AI analysis background task failed:", repr(error))
        try:
            analysis = db.query(ai_analysis.AiAnalysis).filter(
                ai_analysis.AiAnalysis.id == analysis_id
            ).first()
            if analysis:
                analysis.status = "failed"
                db.commit()
        except Exception as status_error:
            db.rollback()
            print("AI analysis status update failed:", repr(status_error))
    finally:
        db.close()


@app.post("/observations/{id}/ai_analysis")  # 创建 / 重新创建 AI分析任务
def create_ai_analysis(
    id: int,
    background_tasks: BackgroundTasks,
):
    db = SessionLocal()

    try:
        # 1. 先确认 observation 存在
        observation = (
            db.query(Observation)
            .filter(Observation.id == id)
            .first()
        )

        if not observation:
            raise HTTPException(
                status_code=404,
                detail="未找到对应的观察记录",
            )

        # 2. 查询这个 observation 是否已经有 AI analysis
        analysis = (
            db.query(ai_analysis.AiAnalysis)
            .filter(
                ai_analysis.AiAnalysis.observation_id == id
            )
            .first()
        )

        # 3. 已经有分析记录
        if analysis:
            # 如果当前还在分析，禁止重复启动
            if analysis.status == "processing":
                raise HTTPException(
                    status_code=409,
                    detail="该观察记录正在进行AI分析",
                )

            # 重新分析：复用原来的 AiAnalysis
            analysis.status = "processing"

            # 清除上一次分析结果
            # 下面字段只保留你 model 中真实存在的字段
            if hasattr(analysis, "rock_name"):
                analysis.rock_name = None

            if hasattr(analysis, "confidence"):
                analysis.confidence = None

            if hasattr(analysis, "analysis_result"):
                analysis.analysis_result = None

            if hasattr(analysis, "error_message"):
                analysis.error_message = None

        # 4. 第一次分析
        else:
            analysis = ai_analysis.AiAnalysis(
                observation_id=id,
                status="processing",
            )

            db.add(analysis)

        # 5. 先提交 processing 状态
        db.commit()
        db.refresh(analysis)

        analysis_id = analysis.id

        # 6. 后台继续跑原来的 AI 任务
        background_tasks.add_task(
            run_ai_analysis_task,
            id,
            analysis_id,
        )

        return {
            "message": "AI分析已开始",
            "analysis_id": analysis_id,
            "status": "processing",
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"启动AI分析失败: {str(e)}",
        )

    finally:
        db.close()

@app.get("/observations/{id}/ai_analysis") #查询某个观察的具体分析结果
def get_ai_analysis(id: int):
    db = SessionLocal()
    try:
        analysis = db.query(ai_analysis.AiAnalysis).filter(
            ai_analysis.AiAnalysis.observation_id == id
        ).order_by(ai_analysis.AiAnalysis.id.desc()).first()
        if not analysis:
            return {"message": "未找到对应的AI分析结果"}
        return {
            "message": "获取AI分析结果成功",
            "status": analysis.status,
            "analysis_result": analysis
        }
    finally:
        db.close()

def generate_and_save_ai_report( # 生成并保存AI报告 ?
    student_id: int,
    route_id: int,
    report_id: int | None = None,
    personal_summary: str = ""
):

    db = SessionLocal()

    try:
        student_info = get_student_info(db, student_id)
        course_info = get_course_info(db, route_id)
        route_info = get_route_info(db, route_id)
        checkin_records = get_checkin_records(db, student_id, route_id)
        observation_records = get_observation_records(db, student_id, route_id)
        student_summary = get_student_summary(db, student_id, route_id)

        print_dify_input_lengths(
            student_info,
            course_info,
            route_info,
            checkin_records,
            observation_records,
            student_summary
        )

        result = generate_student_report(
            student_info,
            course_info,
            route_info,
            checkin_records,
            observation_records,
            student_summary,
            personal_summary
        )

        print(result)

        report_content = extract_report_text(result)
        if not report_content:
            print("===== EMPTY DIFY REPORT OUTPUT =====")
            print(result)
            print("====================================")
            raise HTTPException(status_code=502, detail="Dify未返回报告内容")


        if report_id is None:
            report = Report(
                student_id=student_id,
                route_id=route_id,
                report_text=report_content,
                status="completed"
            )
            db.add(report)
        else:
            report = db.query(Report).filter(Report.id == report_id).first()
            if report is None:
                raise RuntimeError(f"报告任务不存在：{report_id}")
            report.report_text = report_content
            report.status = "completed"
            report.error_message = None

        db.commit()
        db.refresh(report)

        return {
            "message":"实习报告生成成功",
            "report_id":report.id,
            "status":report.status,
            "content":report_content
        }

    finally:
        db.close()


@app.post("/students/{student_id}/routes/{route_id}/generate_ai_report") #生成某个学生某个线路的AI实习报告
def create_ai_report(student_id: int, route_id: int):
    return generate_and_save_ai_report(student_id, route_id)

class GenerateReportRequest(BaseModel):
    student_id: int
    route_id: int
    personal_summary: str = ""

def run_ai_report_task(report_id: int, student_id: int, route_id: int, personal_summary: str = ""): # 运行AI报告生成任务 ？
    try:
        generate_and_save_ai_report(student_id,route_id,report_id=report_id,personal_summary=personal_summary)
    except Exception as error:
        print("AI report background task failed:", repr(error))
        db = SessionLocal()
        try:
            report = db.query(Report).filter(Report.id == report_id).first()
            if report is not None:
                detail = getattr(error, "detail", None)
                report.status = "failed"
                report.error_message = str(detail or error)[:2000]
                db.commit()
        except Exception as status_error:
            db.rollback()
            print("AI report status update failed:", repr(status_error))
        finally:
            db.close()


@app.post("/reports/generate", status_code=202) #生成AI实习报告
def generate_ai_report(data: GenerateReportRequest, background_tasks: BackgroundTasks):
    db = SessionLocal()
    try:
        report = Report(
            student_id=data.student_id,
            route_id=data.route_id,
            status="processing"
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        report_id = report.id
    finally:
        db.close()

    background_tasks.add_task(
        run_ai_report_task,
        report_id,
        data.student_id,
        data.route_id,
        data.personal_summary
    )
    return {
        "message": "报告生成任务已创建",
        "report_id": report_id,
        "status": "processing"
    }

@app.get("/reports/{report_id}") #查询某个AI实习报告的内容
def get_ai_report(report_id:int):
    db = SessionLocal()
    try:
        existing_report = db.query(Report).filter(Report.id == report_id).first()
        if not existing_report:
            raise HTTPException(status_code=404, detail="报告不存在")

        evaluation = db.query(ReportEvaluation).filter(
            ReportEvaluation.report_id == existing_report.id
        ).first()

        return {
            "id": existing_report.id,
            "student_id": existing_report.student_id,
            "route_id": existing_report.route_id,
            "report_text": existing_report.report_text,
            "status": existing_report.status,
            "error_message": existing_report.error_message,
            "create_time": existing_report.create_time,
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
@app.get("/reports/student/{student_id}") #查询某个学生的所有AI实习报告
def get_all_report(student_id:int):
    db = SessionLocal()
    try:
        reports = db.query(Report).filter(Report.student_id==student_id).all()
        if not reports:
            return{"message": "暂无报告存档"}

        return reports
    finally:
        db.close()

class RoutePathCreate(BaseModel):
    latitude: float
    longitude: float
    order_index: int
@app.post("/routes/{route_id}/paths")
def create_route_paths(
    route_id: int,
    paths: List[RoutePathCreate]
):
    db = SessionLocal()
    try:

        route = (
            db.query(Route)
            .filter(Route.id == route_id)
            .first()
        )

        if route is None:
            raise HTTPException(
                status_code=404,
                detail="Route not found"
            )

        # 如果重新绘制，先删除旧路线
        db.query(RoutePath).filter(
            RoutePath.route_id == route_id
        ).delete()
        for path in paths:
            route_path = RoutePath(
                route_id=route_id,
                latitude=path.latitude,
                longitude=path.longitude,
                order_index=path.order_index,
                coordinate_system="WGS84"
            )
            db.add(route_path)
        db.commit()
        return {
            "message":"Route path saved successfully",
            "route_id":route_id,
            "point_count":len(paths)
        }
    finally:
        db.close()

@app.get("/routes/{route_id}/map") #获取路线的地图信息，包括路线点位、观察点位和学生的观察记录
def get_route_map(route_id:int, student_id:int | None = None):
    db = SessionLocal()
    try:

        points = db.query(Point).filter(Point.route_id == route_id, Point.is_active == True).all()

        route = db.query(Route).filter(Route.id == route_id, Route.is_active == True).first()

        student_observations = []
        if student_id is not None:
            student_observations = filter_current_observations(
                db.query(Observation)
                .filter(
                    Observation.route_id == route_id,
                    Observation.student_id == student_id
                )
            ).all()

        paths = (
            db.query(RoutePath)
            .filter(RoutePath.route_id == route_id)
            .order_by(RoutePath.order_index)
            .all()
        )


        if not route:
            return {"message":"未找到路线"}

        return {
            "route":{
                "id":route.id,
                "name":route.route_name,
                "description":route.route_description,
                "coordinate_system":"WGS84",
                "free_observation_enabled": route.free_observation_enabled,
                "required_free_observation_count": route.required_free_observation_count,
            },

            # 观察点
            "points": [
                {
                    "id": point.id,
                    "name": point.point_name,
                    "latitude": point.latitude,
                    "longitude": point.longitude,
                    "task": point.task,
                    "description": point.point_description,
                    "coordinate_system": "WGS84",

                    "learning_materials": [
                        {
                            "id": material.id,
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
                        for material in point.learning_materials
                    ],
                }
                for point in points
            ],

            # 实习路线
            "route_points":[
                {
                    "latitude":p.latitude,
                    "longitude":p.longitude,
                    "order_index":p.order_index,
                    "coordinate_system":"WGS84"
                }
                for p in paths
            ],

            "student_observations":[
                {
                    "id":observation.id,
                    "student_id":observation.student_id,
                    "route_id":observation.route_id,
                    "point_id":observation.point_id,
                    "latitude":observation.latitude,
                    "longitude":observation.longitude,
                    "observation_text":observation.observation_text,
                    "photo_url":observation.photo_url,
                    "created_at":observation.observation_time,
                    "observation_type": observation.observation_type
                }
                for observation in student_observations
            ]
        }
    finally:
        db.close()

def serialize_notification(
    notification,
    is_read: bool,
):
    return {
        "id": notification.id,
        "title": notification.title,
        "content": notification.content,
        "type": notification.type,
        "course_id": notification.course_id,
        "route_id": notification.route_id,
        "created_at": notification.created_at,
        "is_read": is_read,
    }
@app.get("/students/{student_id}/notifications")
def get_student_notifications(
    student_id: int,
    page: int = 1,
    page_size: int = 20,
    type: str | None = None,
    unread_only: bool = False,
):
    db = SessionLocal()

    try:
        # 1. 学生是否存在
        student = (
            db.query(Student)
            .filter(Student.id == student_id)
            .first()
        )

        if not student:
            raise HTTPException(
                status_code=404,
                detail="学生不存在",
            )

        # 2. 分页保护
        if page < 1:
            page = 1

        if page_size < 1:
            page_size = 20

        if page_size > 100:
            page_size = 100

        # 3. 当前学生加入的课程
        course_ids_query = (
            db.query(CourseStudents.course_id)
            .filter(
                CourseStudents.student_id == student_id
            )
        )

        # 4. 可见通知范围
        #
        # A. 专门发给当前学生的通知
        #
        # B. 没有指定 student_id，
        #    但属于学生所在课程的通知
        #
        # C. 全局 system 通知：
        #    student_id NULL
        #    course_id NULL
        query = (
            db.query(Notification)
            .filter(
                (
                    Notification.student_id == student_id
                )
                |
                (
                    Notification.student_id.is_(None)
                    & Notification.course_id.in_(
                        course_ids_query
                    )
                )
                |
                (
                    Notification.student_id.is_(None)
                    & Notification.course_id.is_(None)
                    & (Notification.type == "system")
                )
            )
        )

        # 5. 类型筛选
        if type is not None:
            if type not in {
                "route",
                "evaluation",
                "system",
            }:
                raise HTTPException(
                    status_code=400,
                    detail="不支持的通知类型",
                )

            query = query.filter(
                Notification.type == type
            )

        # 6. 只看未读
        if unread_only:
            read_exists = (
                db.query(NotificationRead.id)
                .filter(
                    NotificationRead.notification_id
                    == Notification.id,

                    NotificationRead.student_id
                    == student_id,
                )
                .exists()
            )

            query = query.filter(
                ~read_exists
            )

        # 7. 总数
        total = query.count()

        # 8. 分页数据
        notifications = (
            query
            .order_by(
                Notification.created_at.desc(),
                Notification.id.desc(),
            )
            .offset(
                (page - 1) * page_size
            )
            .limit(page_size)
            .all()
        )

        # 9. 一次性查当前页哪些已读
        notification_ids = [
            notification.id
            for notification in notifications
        ]

        read_notification_ids = set()

        if notification_ids:
            read_notification_ids = {
                row[0]
                for row in (
                    db.query(
                        NotificationRead.notification_id
                    )
                    .filter(
                        NotificationRead.student_id
                        == student_id,

                        NotificationRead.notification_id.in_(
                            notification_ids
                        ),
                    )
                    .all()
                )
            }

        items = []

        for notification in notifications:
            items.append({
                "id": notification.id,
                "title": notification.title,
                "content": notification.content,
                "type": notification.type,

                "student_id": notification.student_id,
                "course_id": notification.course_id,
                "route_id": notification.route_id,

                "created_at": notification.created_at,

                "is_read": (
                    notification.id
                    in read_notification_ids
                ),
            })

        total_pages = (
            (total + page_size - 1) // page_size
            if total > 0
            else 0
        )

        return {
            "student_id": student_id,

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
@app.get(
    "/students/{student_id}/notifications/unread-count"
)
def get_student_notification_unread_count(
    student_id: int,
):
    db = SessionLocal()

    try:
        student = (
            db.query(Student)
            .filter(Student.id == student_id)
            .first()
        )

        if not student:
            raise HTTPException(
                status_code=404,
                detail="学生不存在",
            )

        course_ids_query = (
            db.query(CourseStudents.course_id)
            .filter(
                CourseStudents.student_id == student_id
            )
        )

        read_exists = (
            db.query(NotificationRead.id)
            .filter(
                NotificationRead.notification_id
                == Notification.id,

                NotificationRead.student_id
                == student_id,
            )
            .exists()
        )

        unread_count = (
            db.query(Notification)
            .filter(
                (
                    Notification.student_id == student_id
                )
                |
                (
                    Notification.student_id.is_(None)
                    & Notification.course_id.in_(
                        course_ids_query
                    )
                )
                |
                (
                    Notification.student_id.is_(None)
                    & Notification.course_id.is_(None)
                    & (Notification.type == "system")
                )
            )
            .filter(
                ~read_exists
            )
            .count()
        )

        return {
            "student_id": student_id,
            "unread_count": unread_count,
        }

    finally:
        db.close()
@app.put(
    "/students/{student_id}/notifications/"
    "{notification_id}/read"
)
def mark_student_notification_as_read(
    student_id: int,
    notification_id: int,
):
    db = SessionLocal()

    try:
        # 1. 学生存在
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

        # 2. 通知存在
        notification = (
            db.query(Notification)
            .filter(
                Notification.id == notification_id
            )
            .first()
        )

        if not notification:
            raise HTTPException(
                status_code=404,
                detail="通知不存在",
            )

        # 3. 判断是否允许当前学生看到
        can_view = False

        # 专门发给当前学生
        if notification.student_id is not None:
            can_view = (
                notification.student_id == student_id
            )

        # 没指定 student_id
        else:
            # 全局 system
            if (
                notification.type == "system"
                and notification.course_id is None
            ):
                can_view = True

            # 课程通知
            elif notification.course_id is not None:
                joined = (
                    db.query(CourseStudents)
                    .filter(
                        CourseStudents.student_id
                        == student_id,

                        CourseStudents.course_id
                        == notification.course_id,
                    )
                    .first()
                )

                can_view = joined is not None

        if not can_view:
            raise HTTPException(
                status_code=403,
                detail="无权访问该通知",
            )

        # 4. 已经读过
        existing = (
            db.query(NotificationRead)
            .filter(
                NotificationRead.notification_id
                == notification_id,

                NotificationRead.student_id
                == student_id,
            )
            .first()
        )

        if existing:
            return {
                "message": "通知已是已读状态",
                "notification_id": notification_id,
                "read_at": existing.read_at,
            }

        # 5. 插入已读记录
        read = NotificationRead(
            notification_id=notification_id,
            student_id=student_id,
            read_at=datetime.utcnow(),
        )

        db.add(read)
        db.commit()
        db.refresh(read)

        return {
            "message": "通知已标记为已读",
            "notification_id": notification_id,
            "read_at": read.read_at,
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()
@app.put(
    "/students/{student_id}/notifications/read-all"
)
def mark_all_student_notifications_as_read(
    student_id: int,
):
    db = SessionLocal()

    try:
        # 1. 学生存在
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

        # 2. 学生课程
        course_ids_query = (
            db.query(CourseStudents.course_id)
            .filter(
                CourseStudents.student_id == student_id
            )
        )

        # 3. 所有该学生可见通知
        notifications = (
            db.query(Notification)
            .filter(
                (
                    Notification.student_id == student_id
                )
                |
                (
                    Notification.student_id.is_(None)
                    & Notification.course_id.in_(
                        course_ids_query
                    )
                )
                |
                (
                    Notification.student_id.is_(None)
                    & Notification.course_id.is_(None)
                    & (Notification.type == "system")
                )
            )
            .all()
        )

        if not notifications:
            return {
                "message": "暂无可标记通知",
                "marked_count": 0,
            }

        notification_ids = [
            notification.id
            for notification in notifications
        ]

        # 4. 已经读过的
        already_read_ids = {
            row[0]
            for row in (
                db.query(
                    NotificationRead.notification_id
                )
                .filter(
                    NotificationRead.student_id
                    == student_id,

                    NotificationRead.notification_id.in_(
                        notification_ids
                    ),
                )
                .all()
            )
        }

        now = datetime.utcnow()

        # 5. 只补尚未读的
        new_reads = [
            NotificationRead(
                notification_id=notification_id,
                student_id=student_id,
                read_at=now,
            )
            for notification_id in notification_ids
            if notification_id
            not in already_read_ids
        ]

        if new_reads:
            db.add_all(new_reads)

        db.commit()

        return {
            "message": "全部通知已标记为已读",
            "marked_count": len(new_reads),
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()
frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"

if frontend_dist.exists():

    app.mount(
        "/student/assets",
        StaticFiles(directory=str(frontend_dist / "assets")),
        name="student-assets",
    )

    @app.get("/student")
    @app.get("/student/")
    async def serve_student_home():
        return FileResponse(frontend_dist / "index.html")

    @app.get("/student/{full_path:path}")
    async def serve_student_frontend(full_path: str):
        requested_file = frontend_dist / full_path

        if requested_file.exists() and requested_file.is_file():
            return FileResponse(requested_file)

        return FileResponse(frontend_dist / "index.html")
