from typing import Optional
from fastapi import APIRouter, Depends
import duckdb

from backend.app.db.duckdb import get_db
from backend.app.models.common import FilterParams, ResponseMetadata
from backend.app.utils.validation import validate_date_range
from backend.app.repositories.logistics import LogisticsRepository

router = APIRouter()


@router.get("/logistics/summary")
def get_logistics_summary(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    mandi_id: Optional[str] = None,
    district: Optional[str] = None,
    state: Optional[str] = None,
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    validate_date_range(date_from, date_to)
    filters = FilterParams(
        date_from=date_from,
        date_to=date_to,
        mandi_id=mandi_id,
        district=district,
        state=state
    )
    repo = LogisticsRepository(conn)
    summary = repo.get_logistics_kpis(filters)
    
    return {
        "data": summary,
        "summary": summary,
        "metadata": ResponseMetadata(
            date_from=date_from,
            date_to=date_to,
            filters=filters.model_dump(exclude_none=True)
        )
    }


@router.get("/logistics/transit-trend")
@router.get("/logistics/delays")
def get_transit_trend(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    mandi_id: Optional[str] = None,
    district: Optional[str] = None,
    state: Optional[str] = None,
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    validate_date_range(date_from, date_to)
    filters = FilterParams(
        date_from=date_from,
        date_to=date_to,
        mandi_id=mandi_id,
        district=district,
        state=state
    )
    repo = LogisticsRepository(conn)
    series = repo.get_delays_time_series(filters)
    
    return {
        "data": series,
        "series": series,
        "metadata": ResponseMetadata(
            date_from=date_from,
            date_to=date_to,
            filters=filters.model_dump(exclude_none=True)
        )
    }


@router.get("/logistics/mandi-performance")
@router.get("/logistics/by-mandi")
def get_mandi_performance(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    district: Optional[str] = None,
    state: Optional[str] = None,
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    validate_date_range(date_from, date_to)
    filters = FilterParams(
        date_from=date_from,
        date_to=date_to,
        district=district,
        state=state
    )
    repo = LogisticsRepository(conn)
    by_mandi = repo.get_logistics_by_mandi(filters)
    routes = repo.get_route_logistics(filters)
    
    return {
        "data": by_mandi,
        "by_mandi": by_mandi,
        "routes": routes,
        "metadata": ResponseMetadata(
            date_from=date_from,
            date_to=date_to,
            filters=filters.model_dump(exclude_none=True)
        )
    }


@router.get("/logistics/routes")
def get_route_logistics(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    mandi_id: Optional[str] = None,
    district: Optional[str] = None,
    state: Optional[str] = None,
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    validate_date_range(date_from, date_to)
    filters = FilterParams(
        date_from=date_from,
        date_to=date_to,
        mandi_id=mandi_id,
        district=district,
        state=state
    )
    repo = LogisticsRepository(conn)
    routes = repo.get_route_logistics(filters)
    
    return {
        "data": routes,
        "routes": routes,
        "metadata": ResponseMetadata(
            date_from=date_from,
            date_to=date_to,
            filters=filters.model_dump(exclude_none=True)
        )
    }
