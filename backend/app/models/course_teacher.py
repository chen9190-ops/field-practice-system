from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database.database import Base

class CourseTeachers(Base):
    __tablename__ = "course_teachers"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    course = relationship("Course", back_populates="teachers")
    teacher = relationship("Teacher", back_populates="courses")