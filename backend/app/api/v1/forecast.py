from typing import Optional
from fastapi import APIRouter, Depends
import duckdb

from backend.app.db.duckdb import get_db
from backend.app.models.common import ResponseMetadata, FilterParams
from backend.app.models.forecast import ForecastResponse, HistoricalItem
from backend.app.repositories.arrivals import ArrivalsRepository
from backend.app.ml.predictor import ArrivalsPredictor

router = APIRouter()
predictor = ArrivalsPredictor()


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
    
    # Generate ML forecast using trained MLflow best model
    ml_res = predictor.predict_forecast(
        conn=conn,
        crop=crop,
        mandi_id=mandi_id,
        horizon=horizon
    )
    
    meta = ResponseMetadata(
        filters={"mandi_id": mandi_id, "crop": crop, "horizon": horizon}
    )
    
    return ForecastResponse(
        mandi_id=mandi_id,
        crop=crop,
        horizon=horizon,
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
        forecast=ml_res["forecast"],
        metadata=meta
    )
