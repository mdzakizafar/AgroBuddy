from typing import Optional
from fastapi import APIRouter, Depends
import duckdb

from backend.app.db.duckdb import get_db
from backend.app.models.common import FilterParams, ResponseMetadata
from backend.app.utils.validation import validate_date_range
from backend.app.repositories.prices import PricesRepository

router = APIRouter()


@router.get("/prices/msp")
def get_prices_msp(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    crop: Optional[str] = None,
    mandi_id: Optional[str] = None,
    district: Optional[str] = None,
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
    repo = PricesRepository(conn)
    series = repo.get_msp_time_series(filters)
    
    return {
        "series": series,
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
