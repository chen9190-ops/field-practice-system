from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database.database import Base

class Route(Base):
    __tablename__ = "routes"
    id = Column(Integer, primary_key = True, index = True)
    route_name = Column (String, nullable = False)
    route_description = Column(Text)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable = False)  # Assuming a foreign key relationship with Course
    start_date = Column(Date)
    status = Column(String, default="draft")  # New status column to indicate the status of the route
    course = relationship("Course", back_populates="routes")
    points = relationship("Point",back_populates="route")
    paths = relationship("RoutePath", back_populates="route")  # Assuming a relationship with Path for route paths
    is_active = Column(Boolean, default=True, nullable=False)
    free_observation_enabled = Column(Boolean, default=False, nullable=False)
    required_free_observation_count = Column(Integer, default=0, nullable=False)
