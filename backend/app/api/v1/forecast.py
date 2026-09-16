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
    
    # Compute dynamic commodity level signals from recent historical data
    signals_query = """
        WITH recent AS (
            SELECT crop_name, SUM(arrival_qtl) as recent_qtl
            FROM fact_arrivals
            WHERE date BETWEEN '2026-09-03' AND '2026-09-09'
            GROUP BY crop_name
        ),
        prior AS (
            SELECT crop_name, SUM(arrival_qtl) as prior_qtl
            FROM fact_arrivals
            WHERE date BETWEEN '2026-08-27' AND '2026-09-02'
            GROUP BY crop_name
        )
        SELECT 
            r.crop_name,
            ROUND(r.recent_qtl, 1) as recent_qtl,
            ROUND((r.recent_qtl - p.prior_qtl) / NULLIF(p.prior_qtl, 0) * 100.0, 1) as pct_change
        FROM recent r
        JOIN prior p ON r.crop_name = p.crop_name
        ORDER BY pct_change DESC
    """
    signals_rows = conn.execute(signals_query).fetchall()
    commodity_signals = []
    for row in signals_rows:
        c_name, qtl, pct = row[0], row[1], row[2]
        if pct is None:
            pct = 0.0
        if pct > 5.0:
            direction, arrow, label = "rising", "↑", "Increasing arrivals"
        elif pct < -5.0:
            direction, arrow, label = "declining", "↓", "Supply tightening"
        else:
            direction, arrow, label = "stable", "→", "Stable flow"
        commodity_signals.append({
            "crop": c_name,
            "trend": f"{'+' if pct > 0 else ''}{pct:.1f}%",
            "direction": direction,
            "arrow": arrow,
            "signal": label,
            "recent_volume_qtl": f"{qtl:,.0f} Qtl"
        })

    # Defensible operational planning recommendations
    planning_recommendations = [
        {
            "category": "Storage Capacity Watch",
            "type": "capacity",
            "text": "Review auxiliary storage readiness at high-volume hubs if projected daily arrivals exceed the 7-day moving average.",
            "severity": "info"
        },
        {
            "category": "Logistics Corridor Monitoring",
            "type": "logistics",
            "text": "Monitor transport dispatch SLAs along northern mandi routes showing transit delay variance above the 2.0-hour SLA baseline.",
            "severity": "warning"
        },
        {
            "category": "Price Stabilization Readiness",
            "type": "price",
            "text": "Monitor designated APMC procurement centers where modal prices persistently track below statutory MSP thresholds.",
            "severity": "primary"
        }
    ]

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
        commodity_signals=commodity_signals,
        planning_recommendations=planning_recommendations,
        metadata=meta
    )
