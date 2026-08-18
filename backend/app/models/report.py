from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.database import Base

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False, index=True)
    report_text = Column(Text)
    status = Column(String, default="completed", nullable=False)
    error_message = Column(Text)
    create_time = Column(DateTime, default=datetime.utcnow)
    student = relationship("Student", back_populates="reports")
    evaluation = relationship("ReportEvaluation",back_populates="report",uselist=False)