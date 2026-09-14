import math
from typing import Any, Optional
from fastapi import HTTPException


def validate_date_range(date_from: Optional[str], date_to: Optional[str]) -> None:
    if date_from and date_to:
        if date_from > date_to:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid date range: date_from ({date_from}) cannot be after date_to ({date_to})."
            )


def sanitize_nans(obj: Any) -> Any:
    if isinstance(obj, float) and math.isnan(obj):
        return None
    if isinstance(obj, dict):
        return {k: sanitize_nans(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_nans(item) for item in obj]
    return obj
