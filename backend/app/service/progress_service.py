def calculate_observation_progress(
    *,
    fixed_completed: int,
    fixed_required: int,
    free_submitted: int,
    free_enabled: bool,
    free_required: int,
):
    """Build fixed, free, and overall progress without exceeding requirements."""
    effective_free_required = free_required if free_enabled else 0
    free_completed = min(free_submitted, effective_free_required)
    overall_completed = fixed_completed + free_completed
    overall_required = fixed_required + effective_free_required

    return {
        # Keep the original fields for existing clients.
        "completed": overall_completed,
        "total": overall_required,
        "fixed": {
            "completed": fixed_completed,
            "required": fixed_required,
            "total": fixed_required,
            "is_complete": fixed_completed >= fixed_required,
        },
        "free": {
            "enabled": free_enabled,
            "completed": free_completed,
            "submitted": free_submitted,
            "required": effective_free_required,
            "total": effective_free_required,
            "is_complete": free_submitted >= effective_free_required,
        },
        "overall": {
            "completed": overall_completed,
            "required": overall_required,
            "total": overall_required,
            "is_complete": (
                fixed_completed >= fixed_required
                and free_submitted >= effective_free_required
            ),
        },
    }
