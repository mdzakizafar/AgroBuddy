from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
import duckdb

from backend.app.db.duckdb import get_db
from backend.app.models.common import FilterParams, ResponseMetadata
from backend.app.analytics.risk import MandiRiskEngine

router = APIRouter()


@router.get("/risk/mandis")
def get_risk_mandis(
    district: Optional[str] = None,
    state: Optional[str] = None,
    mandi_type: Optional[str] = None,
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    filters = FilterParams(district=district, state=state, mandi_type=mandi_type)
    engine = MandiRiskEngine(conn)
    risks = engine.calculate_mandi_risks(filters)
    
    return {
        "mandis": risks,
        "metadata": ResponseMetadata(filters=filters.model_dump(exclude_none=True))
    }


@router.get("/risk/mandis/{mandi_id}")
def get_risk_mandi_detail(mandi_id: str, conn: duckdb.DuckDBPyConnection = Depends(get_db)):
    engine = MandiRiskEngine(conn)
    risks = engine.calculate_mandi_risks(mandi_id_filter=mandi_id)
    if not risks:
        raise HTTPException(status_code=404, detail=f"Mandi risk profile for ID '{mandi_id}' not found.")
    
    return {
        "mandi_risk": risks[0],
        "metadata": ResponseMetadata(filters={"mandi_id": mandi_id})
    }
