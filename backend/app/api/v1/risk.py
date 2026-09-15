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
        "data": risks,
        "metadata": ResponseMetadata(filters=filters.model_dump(exclude_none=True))
    }


@router.get("/risk/map")
def get_risk_map(
    district: Optional[str] = None,
    state: Optional[str] = None,
    mandi_type: Optional[str] = None,
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    filters = FilterParams(district=district, state=state, mandi_type=mandi_type)
    engine = MandiRiskEngine(conn)
    risks = engine.calculate_mandi_risks(filters)
    
    map_points = []
    for r in risks:
        p = r["price_pressure_score"]
        a = r["arrival_instability_score"]
        l = r["logistics_delay_score"]
        below_pct = r.get("below_msp_percentage", 0)
        delay_hrs = r.get("avg_delay_hours", 0)
        
        # Determine dominant driver based on operational severity
        if below_pct >= 32.0 or p >= 23.5:
            driver = "price"
            driver_label = "Price Pressure Hotspot"
        elif delay_hrs >= 50.0 or l >= 31.5:
            driver = "logistics"
            driver_label = "Logistics Bottleneck"
        elif a >= 31.8:
            driver = "arrival"
            driver_label = "Arrival Volatility Hotspot"
        elif r["risk_score"] < 22.0:
            driver = "baseline"
            driver_label = "Operational Baseline"
        else:
            # Fallback to relative max
            scores = {"price": p / 28.0, "arrival": a / 34.0, "logistics": l / 34.0}
            driver = max(scores, key=scores.get)
            driver_label = "Price Pressure" if driver == "price" else "Arrival Volatility" if driver == "arrival" else "Logistics Delay"

        map_points.append({
            "mandi_id": r["mandi_id"],
            "mandi_name": r["mandi_name"],
            "district": r["district"],
            "state": r["state"],
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "coordinate_source": r["coordinate_source"],
            "risk_score": r["risk_score"],
            "risk_level": r["risk_level"],
            "price_pressure": p,
            "price_pressure_score": p,
            "arrival_instability": a,
            "arrival_instability_score": a,
            "logistics_delay": l,
            "logistics_delay_score": l,
            "arrival_volume": r["arrival_volume"],
            "below_msp_percentage": below_pct,
            "avg_delay_hours": delay_hrs,
            "delayed_trip_percentage": r.get("delayed_trip_percentage", 0),
            "avg_modal_price": r.get("avg_modal_price", 0),
            "avg_msp": r.get("avg_msp", 0),
            "primary_risk_driver": driver,
            "primary_driver_label": driver_label
        })

    
    return {
        "data": map_points,
        "metadata": ResponseMetadata(filters=filters.model_dump(exclude_none=True))
    }


@router.get("/risk/distribution")
def get_risk_distribution(
    district: Optional[str] = None,
    state: Optional[str] = None,
    mandi_type: Optional[str] = None,
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    filters = FilterParams(district=district, state=state, mandi_type=mandi_type)
    engine = MandiRiskEngine(conn)
    risks = engine.calculate_mandi_risks(filters)
    
    bins = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
    for r in risks:
        s = r["risk_score"]
        if s <= 20:
            bins["0-20"] += 1
        elif s <= 40:
            bins["21-40"] += 1
        elif s <= 60:
            bins["41-60"] += 1
        elif s <= 80:
            bins["61-80"] += 1
        else:
            bins["81-100"] += 1

    dist_series = [{"score_bin": k, "count": v} for k, v in bins.items()]
    return {
        "data": dist_series,
        "metadata": ResponseMetadata(filters=filters.model_dump(exclude_none=True))
    }


@router.get("/risk/drivers")
def get_risk_drivers(
    district: Optional[str] = None,
    state: Optional[str] = None,
    mandi_type: Optional[str] = None,
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    filters = FilterParams(district=district, state=state, mandi_type=mandi_type)
    engine = MandiRiskEngine(conn)
    risks = engine.calculate_mandi_risks(filters)
    
    avg_price = round(sum(r["price_pressure_score"] for r in risks) / max(len(risks), 1), 1)
    avg_arrival = round(sum(r["arrival_instability_score"] for r in risks) / max(len(risks), 1), 1)
    avg_logistics = round(sum(r["logistics_delay_score"] for r in risks) / max(len(risks), 1), 1)
    
    return {
        "data": {
            "avg_price_pressure": avg_price,
            "avg_arrival_instability": avg_arrival,
            "avg_logistics_delay": avg_logistics,
            "mandi_matrix": [
                {
                    "mandi_id": r["mandi_id"],
                    "mandi_name": r["mandi_name"],
                    "price_pressure": r["price_pressure_score"],
                    "logistics_delay": r["logistics_delay_score"],
                    "arrival_instability": r["arrival_instability_score"],
                    "risk_score": r["risk_score"],
                    "risk_level": r["risk_level"]
                }
                for r in risks
            ]
        },
        "metadata": ResponseMetadata(filters=filters.model_dump(exclude_none=True))
    }


@router.get("/risk/emerging")
def get_emerging_risks(
    district: Optional[str] = None,
    state: Optional[str] = None,
    mandi_type: Optional[str] = None,
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    filters = FilterParams(district=district, state=state, mandi_type=mandi_type)
    engine = MandiRiskEngine(conn)
    risks = engine.calculate_mandi_risks(filters)
    
    top_emerging = sorted(risks, key=lambda x: x["risk_score"], reverse=True)[:10]
    return {
        "data": top_emerging,
        "top_emerging": top_emerging,
        "total_emerging": len(top_emerging),
        "metadata": ResponseMetadata(filters=filters.model_dump(exclude_none=True))
    }


@router.get("/risk/mandis/{mandi_id}")
def get_risk_mandi_detail(mandi_id: str, conn: duckdb.DuckDBPyConnection = Depends(get_db)):
    engine = MandiRiskEngine(conn)
    risks = engine.calculate_mandi_risks(mandi_id_filter=mandi_id)
    if not risks:
        raise HTTPException(status_code=404, detail=f"Mandi risk profile for ID '{mandi_id}' not found.")
    
    return {
        "data": risks[0],
        "metadata": ResponseMetadata(filters={"mandi_id": mandi_id})
    }
