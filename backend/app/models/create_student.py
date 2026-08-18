from sqlalchemy import Column, Integer, ForeignKey
from app.database.database import Base


class CourseStudents(Base):
    __tablename__ = "course_students"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer,ForeignKey("courses.id"))
    student_id = Column(Integer,ForeignKey("students.id"))