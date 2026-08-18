from app.database.database import SessionLocal
from app.models.track import Track
from app.models.observation import Observation
from app.models.route_path import RoutePath
from app.models.route import Route
from app.models.student import Student
from datetime import datetime
from app.models.point import Point

db = SessionLocal()

student = db.query(Student).filter(
    Student.id == 1
).first()

if not student:
    student = Student(
        id=1,
        student_name="测试学生",
        student_email="test@example.com",
        major="地质工程专业",
        grade="2022级"
    )

    db.add(student)
    db.commit()

route_paths = [
    {
        "route_id": 1,
        "latitude": 30.456200,
        "longitude": 114.315385,
        "order_index": 1,
        "coordinate_system": "WGS84"
    },
    {
        "route_id": 1,
        "latitude": 30.456650,
        "longitude": 114.316200,
        "order_index": 2,
        "coordinate_system": "WGS84"
    },
    {
        "route_id": 1,
        "latitude": 30.457100,
        "longitude": 114.317000,
        "order_index": 3,
        "coordinate_system": "WGS84"
    }
]


observations = [
    {
        "student_id":1,
        "route_id":1,
        "observation_text":"测试岩石露头，观察到层理结构",
        "latitude":30.456650,
        "longitude":114.316200,
        "photo_url":None
    },
    {
        "student_id":1,
        "route_id":1,
        "observation_text":"测试地貌观察点，记录周边地形",
        "latitude":30.457100,
        "longitude":114.317000,
        "photo_url":None
    }
]


tracks = [
    {
        "student_id":1,
        "route_id":1,
        "latitude":30.456200,
        "longitude":114.315385,
        "recorded_time":datetime(2026,7,31,9,0,0)
    },
    {
        "student_id":1,
        "route_id":1,
        "latitude":30.456650,
        "longitude":114.316200,
        "recorded_time":datetime(2026,7,31,9,1,0)
    }
]

points = [
    {
        "route_id":1,
        "point_name":"石灰岩露头观察点",
        "point_code":"P01",
        "latitude":30.456650,
        "longitude":114.316200,
        "task":"观察岩石层理结构",
        "point_description":"记录碳酸盐岩露头特征"
    },
    {
        "route_id":1,
        "point_name":"地貌观察点",
        "point_code":"P02",
        "latitude":30.457100,
        "longitude":114.317000,
        "task":"观察周边地形",
        "point_description":"记录区域地貌特征"
    }
]

db.query(RoutePath).filter(
    RoutePath.route_id == 1
).delete()

for item in points:
    db.add(Point(**item))

for item in route_paths:
    db.add(RoutePath(**item))


for item in observations:
    db.add(Observation(**item))


for item in tracks:
    db.add(Track(**item))


db.commit()

db.close()

print("地图测试数据插入完成")