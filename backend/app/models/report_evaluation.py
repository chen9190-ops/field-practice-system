from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.database import Base


class ReportEvaluation(Base):
    __tablename__ = "report_evaluations"

    id = Column(Integer, primary_key=True, index=True)

    report_id = Column(
        Integer,
        ForeignKey("reports.id"),
        nullable=False,
        unique=True,
        index=True,
    )

    teacher_id = Column(
        Integer,
        ForeignKey("teachers.id"),
        nullable=False,
        index=True,
    )

    score = Column(Integer, nullable=True)

    comment = Column(Text, nullable=True)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    report = relationship(
        "Report",
        back_populates="evaluation",
    )

    teacher = relationship(
        "Teacher",
        back_populates="report_evaluations",
    )