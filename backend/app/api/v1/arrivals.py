from typing import Optional
from fastapi import APIRouter, Depends
import duckdb

from backend.app.db.duckdb import get_db
from backend.app.models.common import FilterParams, ResponseMetadata
from backend.app.utils.validation import validate_date_range
from backend.app.analytics.arrivals import ArrivalsAnalytics
from backend.app.repositories.arrivals import ArrivalsRepository

router = APIRouter()


@router.get("/arrivals/trend")
def get_arrivals_trend(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    crop: Optional[str] = None,
    mandi_id: Optional[str] = None,
    district: Optional[str] = None,
    group_by: str = "date",
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    validate_date_range(date_from, date_to)
    filters = FilterParams(
        date_from=date_from,
        date_to=date_to,
        crop=crop,
        mandi_id=mandi_id,
        district=district
    )
    repo = ArrivalsRepository(conn)
    series = repo.get_arrival_trend(filters)
    
    return {
        "series": series,
        "metadata": ResponseMetadata(
            date_from=date_from,
            date_to=date_to,
            filters=filters.model_dump(exclude_none=True)
        )
    }


@router.get("/arrivals/by-crop")
def get_arrivals_by_crop(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    mandi_id: Optional[str] = None,
    district: Optional[str] = None,
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    validate_date_range(date_from, date_to)
    filters = FilterParams(
        date_from=date_from,
        date_to=date_to,
        mandi_id=mandi_id,
        district=district
    )
    repo = ArrivalsRepository(conn)
    by_crop = repo.get_arrivals_by_crop(filters)
    
    return {
        "by_crop": by_crop,
        "metadata": ResponseMetadata(
            date_from=date_from,
            date_to=date_to,
            filters=filters.model_dump(exclude_none=True)
        )
    }


@router.get("/arrivals/by-mandi")
def get_arrivals_by_mandi(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    crop: Optional[str] = None,
    district: Optional[str] = None,
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    validate_date_range(date_from, date_to)
    filters = FilterParams(
        date_from=date_from,
        date_to=date_to,
        crop=crop,
        district=district
    )
    repo = ArrivalsRepository(conn)
    by_mandi = repo.get_arrivals_by_mandi(filters)
    
    return {
        "by_mandi": by_mandi,
        "metadata": ResponseMetadata(
            date_from=date_from,
            date_to=date_to,
            filters=filters.model_dump(exclude_none=True)
        )
    }
