from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database.database import Base


class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String(100), nullable=False)
    phone_number = Column(String(20), nullable=True)
    department = Column(String(100), nullable=True)
    title = Column(String(100), nullable=True)
    bio = Column(Text, nullable=True)
    courses = relationship("CourseTeachers",back_populates="teacher")
    report_evaluations = relationship("ReportEvaluation",back_populates="teacher")