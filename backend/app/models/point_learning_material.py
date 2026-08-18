from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
)

from sqlalchemy.orm import relationship

from app.database.database import Base

class PointLearningMaterial(Base):
    __tablename__ = "point_learning_materials"

    id = Column(Integer, primary_key=True, index=True)

    point_id = Column(
        Integer,
        ForeignKey("points.id"),
        nullable=False,
        index=True,
    )

    title = Column(String, nullable=False)

    description = Column(Text, nullable=True)

    material_type = Column(
        String,
        nullable=False,
    )
    # text / file / link

    file_url = Column(
        String,
        nullable=True,
    )

    file_name = Column(
        String,
        nullable=True,
    )

    file_type = Column(
        String,
        nullable=True,
    )

    file_size = Column(
        Integer,
        nullable=True,
    )

    external_url = Column(
        String,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    point = relationship(
        "Point",
        back_populates="learning_materials",
    )