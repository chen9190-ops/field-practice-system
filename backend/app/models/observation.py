from sqlalchemy import Boolean, Column, Integer, String, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database.database import Base
from datetime import datetime
from sqlalchemy import DateTime

class Observation(Base):
    __tablename__ = "observations"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    route_id = Column(Integer,ForeignKey("routes.id"))
    point_id = Column(Integer, ForeignKey("points.id"), nullable=True, index=True)
    observation_time = Column(DateTime, default=datetime.utcnow)
    observation_text = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    rock_type = Column(String)
    photo_url = Column(String, nullable=True)  # URL to the photo associated with the observation
    is_favorite = Column(Boolean, default=False, nullable=False)
    is_pinned = Column(Boolean, default=False, nullable=False)
    student = relationship("Student", back_populates="observations")
    point = relationship("Point")
    ai_analysis = relationship("AiAnalysis", back_populates="observation", uselist=False)  # One-to-one relationship with AIAnalysis
    observation_type = Column(String, default="free", nullable=False)
