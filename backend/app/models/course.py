from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database.database import Base

class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key = True, index = True)
    course_name = Column (String, nullable = False)
    course_description = Column(Text)
    teachers = relationship("CourseTeachers", back_populates="course")
    routes = relationship("Route",back_populates="course")
    is_active = Column(Boolean, default=True, nullable=False)  
    students = relationship("Student",secondary="course_students",back_populates="courses")