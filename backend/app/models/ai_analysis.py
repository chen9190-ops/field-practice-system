from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database.database import Base
from datetime import datetime
from sqlalchemy import DateTime

class AiAnalysis(Base):
    __tablename__ = "ai_analyses"
    id = Column(Integer, primary_key=True, index=True)
    observation_id = Column(Integer, ForeignKey("observations.id"), nullable=False, unique = True, index=True)
    rock_name = Column(Text)
    rock_type = Column(Text)
    confidence = Column(Text)
    structure = Column(Text)
    mineral = Column(Text)
    weathering = Column(Text)
    formation_environment = Column(Text)
    uncertainty = Column(Text)
    suggestions = Column(Text)
    student_report = Column(Text)

    analysis_time = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="processing", nullable=False)
    observation = relationship("Observation", back_populates="ai_analysis")  # One-to-one relationship with Observation