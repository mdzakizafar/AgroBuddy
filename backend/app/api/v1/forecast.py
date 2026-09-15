from typing import Optional
from fastapi import APIRouter, Depends
import duckdb

from backend.app.db.duckdb import get_db
from backend.app.models.common import ResponseMetadata, FilterParams
from backend.app.models.forecast import ForecastResponse, HistoricalItem
from backend.app.repositories.arrivals import ArrivalsRepository

router = APIRouter()


@router.get("/forecast/arrivals", response_model=ForecastResponse)
def get_forecast_arrivals(
    mandi_id: Optional[str] = None,
    crop: Optional[str] = None,
    horizon: int = 7,
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    filters = FilterParams(mandi_id=mandi_id, crop=crop)
    repo = ArrivalsRepository(conn)
    trend = repo.get_arrival_trend(filters)
    
    historical = [
        HistoricalItem(date=item["date"], arrival_qtl=item["arrival_qtl"])
        for item in trend[-30:]
    ]
    
    meta = ResponseMetadata(
        filters={"mandi_id": mandi_id, "crop": crop, "horizon": horizon}
    )
    
    return ForecastResponse(
        mandi_id=mandi_id,
        crop=crop,
        horizon=horizon,
        status="not_available",
        message="Forecasting model pipeline is not yet connected. Historical data is provided for baseline.",
        model="baseline_historical",
        metrics={"mae": None, "mape": None},
        historical=historical,
        forecast=[],
        metadata=meta
    )
