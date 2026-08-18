from sqlalchemy import and_, or_

from app.models.observation import Observation
from app.models.point import Point


def filter_current_observations(query):
    """Keep free observations and observations tied to an active fixed point."""
    return (
        query
        .outerjoin(Point, Observation.point_id == Point.id)
        .filter(
            or_(
                and_(
                    Observation.observation_type == "free",
                    Observation.point_id.is_(None),
                ),
                and_(
                    Observation.observation_type.in_(["fixed", "checkin"]),
                    Observation.point_id.is_not(None),
                    Point.is_active.is_(True),
                ),
            )
        )
    )
