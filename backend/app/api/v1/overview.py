from typing import Optional
from fastapi import APIRouter, Depends
import duckdb

from backend.app.db.duckdb import get_db
from backend.app.models.common import FilterParams, ResponseMetadata
from backend.app.utils.validation import validate_date_range
from backend.app.analytics.overview import OverviewAnalytics

router = APIRouter()


@router.get("/overview")
def get_overview(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    mandi_id: Optional[str] = None,
    district: Optional[str] = None,
    crop: Optional[str] = None,
    state: Optional[str] = None,
    mandi_type: Optional[str] = None,
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    validate_date_range(date_from, date_to)
    filters = FilterParams(
        date_from=date_from,
        date_to=date_to,
        mandi_id=mandi_id,
        district=district,
        crop=crop,
        state=state,
        mandi_type=mandi_type
    )
    
    analytics = OverviewAnalytics(conn)
    data = analytics.get_overview(filters)
    
    data["metadata"] = ResponseMetadata(
        date_from=date_from,
        date_to=date_to,
        filters=filters.model_dump(exclude_none=True)
    )
    return data
