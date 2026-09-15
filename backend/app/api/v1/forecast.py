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
    
    forecast_list = ml_res["forecast"]
    return ForecastResponse(
        mandi_id=mandi_id,
        crop=crop,
        horizon=horizon,
        horizon_days=horizon,
        status=ml_res["status"],
        message=ml_res["message"],
        model=ml_res["model"],
        metrics={
            "mae": ml_res["metrics"].get("mae"),
            "mape": ml_res["metrics"].get("mape"),
            "rmse": ml_res["metrics"].get("rmse"),
            "r2": ml_res["metrics"].get("r2")
        },
        historical=historical,
        forecast=forecast_list,
        data=forecast_list,
        metadata=meta
    )
