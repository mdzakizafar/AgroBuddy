from typing import Optional
from fastapi import APIRouter, Depends
import duckdb

from backend.app.db.duckdb import get_db
from backend.app.models.common import FilterParams, ResponseMetadata
from backend.app.utils.validation import validate_date_range
from backend.app.repositories.arrivals import ArrivalsRepository

router = APIRouter()


@router.get("/arrivals/trend")
def get_arrivals_trend(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    crop: Optional[str] = None,
    mandi_id: Optional[str] = None,
    district: Optional[str] = None,
    state: Optional[str] = None,
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    validate_date_range(date_from, date_to)
    filters = FilterParams(
        date_from=date_from,
        date_to=date_to,
        crop=crop,
        mandi_id=mandi_id,
        district=district,
        state=state
    )
    repo = ArrivalsRepository(conn)
    series = repo.get_arrival_trend(filters)
    
    return {
        "data": series,
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
    repo = ArrivalsRepository(conn)
    by_crop = repo.get_arrivals_by_crop(filters)
    
    return {
        "data": by_crop,
        "by_crop": by_crop,
        "metadata": ResponseMetadata(
            date_from=date_from,
            date_to=date_to,
            filters=filters.model_dump(exclude_none=True)
        )
    }


@router.get("/arrivals/mix")
def get_arrivals_mix(
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
    repo = ArrivalsRepository(conn)
    mix_data = repo.get_arrival_mix_time_series(filters)
    
    return {
        "data": mix_data,
        "metadata": ResponseMetadata(
            date_from=date_from,
            date_to=date_to,
            filters=filters.model_dump(exclude_none=True)
        )
    }


@router.get("/arrivals/volatility")
def get_arrivals_volatility(
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
    repo = ArrivalsRepository(conn)
    volatility_data = repo.get_arrival_volatility(filters)
    
    return {
        "data": volatility_data,
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
    state: Optional[str] = None,
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    validate_date_range(date_from, date_to)
    filters = FilterParams(
        date_from=date_from,
        date_to=date_to,
        crop=crop,
        district=district,
        state=state
    )
    repo = ArrivalsRepository(conn)
    by_mandi = repo.get_arrivals_by_mandi(filters)
    
    return {
        "data": by_mandi,
        "by_mandi": by_mandi,
        "metadata": ResponseMetadata(
            date_from=date_from,
            date_to=date_to,
            filters=filters.model_dump(exclude_none=True)
        )
    }
