from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database.database import Base

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    student_name = Column(String, nullable=False)
    student_email = Column(String, unique=True, nullable=True)
    student_number = Column(String, unique = True, nullable=False)
    password_hash = Column(String, nullable=False)
    college = Column(String, nullable=False)
    major = Column(String)  
    grade = Column(String)
    observations = relationship("Observation", back_populates="student")
    reports = relationship("Report",back_populates="student")
    tracks = relationship("Track",back_populates="student")
    courses = relationship("Course",secondary="course_students",back_populates="students")
    current_course_id = Column(Integer,ForeignKey("courses.id"),nullable=True)
    notification_reads = relationship("NotificationRead",back_populates="student",cascade="all, delete-orphan",)