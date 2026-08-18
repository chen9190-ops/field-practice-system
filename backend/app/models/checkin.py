from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database.database import Base
from datetime import datetime
from sqlalchemy import DateTime

class Checkin(Base):
    __tablename__ = "checkins"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    checkin_time = Column(DateTime, default=datetime.utcnow)
    point_id = Column(Integer, ForeignKey("points.id"), index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(String, default="pending")  # e.g., "checked_in", "not_checked_in"
    point = relationship("Point",back_populates="checkins")