from typing import Any, Dict, Optional
import duckdb
import pandas as pd
from backend.app.models.common import FilterParams
from backend.app.repositories.arrivals import ArrivalsRepository
from backend.app.repositories.prices import PricesRepository
from backend.app.repositories.logistics import LogisticsRepository
from backend.app.repositories.weather import WeatherRepository
from backend.app.analytics.risk import MandiRiskEngine


class OverviewAnalytics:
    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.conn = conn
        self.arrivals_repo = ArrivalsRepository(conn)
        self.prices_repo = PricesRepository(conn)
        self.logistics_repo = LogisticsRepository(conn)
        self.weather_repo = WeatherRepository(conn)
        self.risk_engine = MandiRiskEngine(conn)

    def get_overview(self, filters: Optional[FilterParams] = None) -> Dict[str, Any]:
        arr_kpis = self.arrivals_repo.get_arrival_kpis(filters)
        price_kpis = self.prices_repo.get_price_kpis(filters)
        log_kpis = self.logistics_repo.get_logistics_kpis(filters)
        weather_extremes = self.weather_repo.get_weather_extremes()
        risks = self.risk_engine.calculate_mandi_risks(filters)

        on_time_delivery_rate = round(100.0 - log_kpis.get("delayed_trip_percentage", 0.0), 2)
        below_msp_rate = round(price_kpis.get("below_msp_percentage", 0.0), 2)

        # 4 Primary Executive KPIs as required by Master Prompt Section 9
        kpis = {
            "total_arrivals_qtl": round(arr_kpis["total_arrivals_qtl"], 2),
            "avg_modal_price": round(price_kpis["avg_modal_price"], 2) if price_kpis["avg_modal_price"] is not None else 0.0,
            "below_msp_rate": below_msp_rate,
            "below_msp_percentage": below_msp_rate,
            "on_time_delivery_rate": on_time_delivery_rate,
            "delayed_trip_percentage": round(log_kpis.get("delayed_trip_percentage", 0.0), 2),
            "total_farmers": arr_kpis["total_farmers"],
            "avg_msp": round(price_kpis["avg_msp"], 2) if price_kpis["avg_msp"] is not None else 0.0,
            "total_trips": log_kpis["total_trips"],
            "average_delay_hours": round(log_kpis["average_delay_hours"], 2),
            "mandi_count": arr_kpis["active_mandi_count"],
            "active_crop_count": arr_kpis["active_crop_count"],
            "emerging_risk_mandis": len([r for r in risks if r["risk_level"] in ["High", "Critical"]])
        }

        # Mandi Array Health Summary
        critical_cnt = len([r for r in risks if r["risk_level"] == "Critical"])
        high_cnt = len([r for r in risks if r["risk_level"] == "High"])
        medium_cnt = len([r for r in risks if r["risk_level"] == "Medium"])
        low_cnt = len([r for r in risks if r["risk_level"] == "Low"])

        mandi_array_health = {
            "total_assessed": len(risks),
            "critical_count": critical_cnt,
            "high_count": high_cnt,
            "medium_count": medium_cnt,
            "low_count": low_cnt,
            "overall_status": "Critical Intervention Needed" if critical_cnt > 0 else ("Watchlist Alert" if high_cnt > 0 else "Stable Operations")
        }

        # Supply & Market Movement (Daily Arrivals + 7d MA + Daily MSP Gap)
        arr_trend = self.arrivals_repo.get_arrival_trend(filters)
        price_trend = self.prices_repo.get_msp_trend_aggregated(filters)
        price_map = {p["date"]: p for p in price_trend}

        supply_movement = []
        for a in arr_trend:
            dt = a["date"]
            p = price_map.get(dt, {})
            supply_movement.append({
                "date": dt,
                "daily_arrival_qtl": round(a.get("arrival_qtl", 0.0), 2),
                "rolling_7d_arrival": round(a.get("rolling_7d_arrival_qtl", a.get("arrival_qtl", 0.0)), 2),
                "rolling_7d_arrival_qtl": round(a.get("rolling_7d_arrival_qtl", a.get("arrival_qtl", 0.0)), 2),
                "farmer_count": a.get("farmer_count", 0),
                "avg_modal_price": round(p.get("avg_modal_price", 0.0), 2),
                "avg_msp": round(p.get("avg_msp", 0.0), 2),
                "avg_msp_gap": round(p.get("avg_msp_gap", 0.0), 2)
            })

        # Mandi Performance Matrix (X: Price Pressure, Y: Logistics Delay, Bubble Size: Volume, Color: Risk Level)
        mandi_matrix = []
        for r in risks:
            mandi_matrix.append({
                "mandi_id": r["mandi_id"],
                "mandi_name": r["mandi_name"],
                "district": r["district"],
                "state": r.get("state"),
                "arrival_volume": round(r.get("arrival_volume", 0.0), 2),
                "logistics_delay_score": round(r.get("logistics_delay_score", 0.0), 1),
                "logistics_delay_hours": round(r.get("avg_delay_hours", 0.0), 1),
                "delayed_trip_percentage": round(r.get("delayed_trip_percentage", 0.0), 1),
                "below_msp_rate": round(r.get("below_msp_percentage", 0.0), 1),
                "price_pressure_score": round(r.get("price_pressure_score", 0.0), 1),
                "risk_score": round(r["risk_score"], 1),
                "risk_level": r["risk_level"]
            })

        # Mandi Supply Concentration (Top 5-8 Mandis by throughput percentage: mandi_arrival_qtl / total_arrival_qtl)
        total_volume = arr_kpis["total_arrivals_qtl"] or sum(r.get("arrival_volume", 0.0) for r in risks)
        supply_concentration = sorted(
            [
                {
                    "mandi_id": r["mandi_id"],
                    "mandi_name": r["mandi_name"],
                    "district": r["district"],
                    "state": r.get("state"),
                    "arrival_qtl": round(r.get("arrival_volume", 0.0), 2),
                    "share_percentage": round((r.get("arrival_volume", 0.0) / total_volume * 100.0), 1) if total_volume > 0 else 0.0
                }
                for r in risks
            ],
            key=lambda x: x["arrival_qtl"],
            reverse=True
        )[:8]

        top_crops = self.arrivals_repo.get_arrivals_by_crop(filters)[:5]
        price_pressure = self.prices_repo.get_mandi_price_pressure(filters)[:5]
        worst_logistics = self.logistics_repo.get_logistics_by_mandi(filters)[:5]

        arrival_anomaly_summary = {
            "anomaly_count": arr_kpis["anomaly_count"],
            "total_records": arr_kpis["total_records"],
            "anomaly_rate_pct": round((arr_kpis["anomaly_count"] / arr_kpis["total_records"] * 100.0), 2) if arr_kpis["total_records"] > 0 else 0.0
        }

        return {
            "kpis": kpis,
            "mandi_array_health": mandi_array_health,
            "arrival_trend": arr_trend,
            "supply_movement": supply_movement,
            "mandi_performance_matrix": mandi_matrix,
            "mandi_supply_concentration": supply_concentration,
            "top_arrival_crops": top_crops,
            "mandis_under_price_pressure": price_pressure,
            "worst_logistics_mandis": worst_logistics,
            "arrival_anomaly_summary": arrival_anomaly_summary
        }
