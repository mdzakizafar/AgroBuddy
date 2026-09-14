from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
import duckdb

from backend.app.db.duckdb import get_db
from backend.app.models.common import FilterParams, ResponseMetadata
from backend.app.repositories.mandi import MandiRepository
from backend.app.repositories.arrivals import ArrivalsRepository
from backend.app.repositories.prices import PricesRepository
from backend.app.repositories.logistics import LogisticsRepository
from backend.app.analytics.risk import MandiRiskEngine

router = APIRouter()


@router.get("/mandis")
def get_mandis(
    district: Optional[str] = None,
    state: Optional[str] = None,
    mandi_type: Optional[str] = None,
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    filters = FilterParams(district=district, state=state, mandi_type=mandi_type)
    repo = MandiRepository(conn)
    mandis = repo.get_mandis(filters)
    return {
        "mandis": mandis,
        "metadata": ResponseMetadata(filters=filters.model_dump(exclude_none=True))
    }


@router.get("/mandis/{mandi_id}")
def get_mandi_detail(mandi_id: str, conn: duckdb.DuckDBPyConnection = Depends(get_db)):
    mandi_repo = MandiRepository(conn)
    mandi_info = mandi_repo.get_mandi_by_id(mandi_id)
    if not mandi_info:
        raise HTTPException(status_code=404, detail=f"Mandi with ID '{mandi_id}' not found.")

    filters = FilterParams(mandi_id=mandi_id)
    arr_repo = ArrivalsRepository(conn)
    pr_repo = PricesRepository(conn)
    log_repo = LogisticsRepository(conn)

    arr_summary = arr_repo.get_arrival_kpis(filters)
    pr_summary = pr_repo.get_price_kpis(filters)
    log_summary = log_repo.get_logistics_kpis(filters)

    return {
        "mandi": mandi_info,
        "arrival_summary": arr_summary,
        "price_summary": pr_summary,
        "logistics_summary": log_summary,
        "metadata": ResponseMetadata(filters={"mandi_id": mandi_id})
    }


@router.get("/mandis/{mandi_id}/market-state")
def get_mandi_market_state(mandi_id: str, conn: duckdb.DuckDBPyConnection = Depends(get_db)):
    mandi_repo = MandiRepository(conn)
    mandi_info = mandi_repo.get_mandi_by_id(mandi_id)
    if not mandi_info:
        raise HTTPException(status_code=404, detail=f"Mandi with ID '{mandi_id}' not found.")

    risk_engine = MandiRiskEngine(conn)
    risks = risk_engine.calculate_mandi_risks(mandi_id_filter=mandi_id)
    risk_info = risks[0] if risks else {}

    comps = risk_info.get("components", {})
    p_comp = comps.get("price_pressure", 0.0)
    a_comp = comps.get("arrival_instability", 0.0)
    l_comp = comps.get("logistics_delay", 0.0)

    arr_cond = "Stable" if a_comp < 40 else ("Volatile" if a_comp < 70 else "Critical Instability")
    pr_cond = "Fair Pricing" if p_comp < 40 else ("Under MSP Pressure" if p_comp < 70 else "Severe Price Gap")
    log_cond = "Smooth Transit" if l_comp < 40 else ("Moderate Bottleneck" if l_comp < 70 else "High Delay Bottleneck")

    overall = risk_info.get("risk_level", "low").title() + " Risk"

    return {
        "mandi_id": mandi_id,
        "mandi_name": mandi_info["mandi_name"],
        "arrival_condition": arr_cond,
        "price_condition": pr_cond,
        "logistics_condition": log_cond,
        "overall_condition": overall,
        "risk_details": risk_info,
        "metadata": ResponseMetadata(filters={"mandi_id": mandi_id})
    }
