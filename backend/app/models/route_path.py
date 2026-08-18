from sqlalchemy import Column, Integer, Float, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database.database import Base


class RoutePath(Base):
    __tablename__ = "route_paths"

    id = Column(Integer, primary_key=True)

    route_id = Column(
        Integer,
        ForeignKey("routes.id"),
        nullable=False
    )

    latitude = Column(Float, nullable=False)

    longitude = Column(Float, nullable=False)

    order_index = Column(
        Integer,
        nullable=False
    )

    coordinate_system = Column(
        String,
        default="WGS84"
    )

    route = relationship("Route", back_populates="paths")