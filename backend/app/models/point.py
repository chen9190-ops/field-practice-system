from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database.database import Base


class Point(Base):
    __tablename__ = "points"
    id = Column(Integer, primary_key=True, index=True)
    point_name = Column(String, nullable=False)
    latitude = Column(Float, nullable = False)
    longitude = Column(Float, nullable = False)
    point_description = Column(Text)
    task = Column(String)
    route_id = Column(Integer, ForeignKey("routes.id"))  # Assuming a foreign key relationship with Route
    route = relationship("Route",back_populates="points")
    checkins = relationship("Checkin",back_populates="point")
    is_active = Column(Boolean, default=True, nullable=False)  
    learning_materials = relationship("PointLearningMaterial",back_populates="point",cascade="all, delete-orphan",)