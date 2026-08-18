from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database.database import Base
from datetime import datetime
from sqlalchemy import DateTime

class Track(Base):
    __tablename__ = "tracks"
    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer,ForeignKey("routes.id"),nullable=False,index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    recorded_time = Column(DateTime, default=datetime.utcnow, index=True)
    student = relationship("Student", back_populates="tracks")
