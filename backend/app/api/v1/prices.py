from typing import Optional
from fastapi import APIRouter, Depends
import duckdb

from backend.app.db.duckdb import get_db
from backend.app.models.common import FilterParams, ResponseMetadata
from backend.app.utils.validation import validate_date_range
from backend.app.repositories.prices import PricesRepository

router = APIRouter()


@router.get("/prices/kpis")
def get_prices_kpis(
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
    repo = PricesRepository(conn)
    kpis = repo.get_price_kpis(filters)
    
    return {
        "data": kpis,
        "metadata": ResponseMetadata(
            date_from=date_from,
            date_to=date_to,
            filters=filters.model_dump(exclude_none=True)
        )
    }


@router.get("/prices/msp")
@router.get("/prices/msp-trend")
def get_prices_msp_trend(
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
    repo = PricesRepository(conn)
    trend = repo.get_msp_trend_aggregated(filters)
    series = repo.get_msp_time_series(filters)
    
    return {
        "data": trend,
        "series": series,
        "metadata": ResponseMetadata(
            date_from=date_from,
            date_to=date_to,
            filters=filters.model_dump(exclude_none=True)
        )
    }


@router.get("/prices/by-crop")
def get_prices_by_crop(
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
    repo = PricesRepository(conn)
    by_crop = repo.get_crop_price_pressure(filters)
    
    return {
        "data": by_crop,
        "metadata": ResponseMetadata(
            date_from=date_from,
            date_to=date_to,
            filters=filters.model_dump(exclude_none=True)
        )
    }


@router.get("/prices/by-mandi")
def get_prices_by_mandi(
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
    repo = PricesRepository(conn)
    by_mandi = repo.get_mandi_price_pressure(filters)
    
    return {
        "data": by_mandi,
        "metadata": ResponseMetadata(
            date_from=date_from,
            date_to=date_to,
            filters=filters.model_dump(exclude_none=True)
        )
    }


@router.get("/prices/directory")
def get_price_directory(
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
    repo = PricesRepository(conn)
    time_series = repo.get_msp_time_series(filters)
    
    return {
        "data": time_series[:100],  # Return top 100 aggregated daily rows for UI directory
        "metadata": ResponseMetadata(
            date_from=date_from,
            date_to=date_to,
            filters=filters.model_dump(exclude_none=True)
        )
    }


@router.get("/prices/pressure")
def get_price_pressure(
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
    repo = PricesRepository(conn)
    crop_pressure = repo.get_crop_price_pressure(filters)
    mandi_pressure = repo.get_mandi_price_pressure(filters)
    
    return {
        "crop_pressure": crop_pressure,
        "mandi_pressure": mandi_pressure,
        "metadata": ResponseMetadata(
            date_from=date_from,
            date_to=date_to,
            filters=filters.model_dump(exclude_none=True)
        )
    }
