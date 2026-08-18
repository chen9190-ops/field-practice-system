from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)

from sqlalchemy.orm import relationship

from app.database.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)

    type = Column(String, nullable=False)
    # route / evaluation / system

    course_id = Column(
        Integer,
        ForeignKey("courses.id"),
        nullable=True,
        index=True,
    )

    route_id = Column(
        Integer,
        ForeignKey("routes.id"),
        nullable=True,
        index=True,
    )

    student_id = Column(
    Integer,
    ForeignKey(
        "students.id",
        ondelete="CASCADE",
    ),
    nullable=True,
    index=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    reads = relationship(
        "NotificationRead",
        back_populates="notification",
        cascade="all, delete-orphan",
    )
