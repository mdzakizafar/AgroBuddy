from typing import Any, Dict, Optional
import duckdb
from backend.app.models.common import FilterParams
from backend.app.repositories.arrivals import ArrivalsRepository


class ArrivalsAnalytics:
    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.repo = ArrivalsRepository(conn)

    def get_supply_pulse(self, filters: Optional[FilterParams] = None) -> Dict[str, Any]:
        kpis = self.repo.get_arrival_kpis(filters)
        trend = self.repo.get_arrival_trend(filters)
        by_crop = self.repo.get_arrivals_by_crop(filters)
        by_mandi = self.repo.get_arrivals_by_mandi(filters)

        total_rec = kpis["total_records"]
        anomaly_rate = round((kpis["anomaly_count"] / total_rec * 100.0), 2) if total_rec > 0 else 0.0

        metrics = {
            "total_arrival_qtl": round(kpis["total_arrivals_qtl"], 2),
            "total_farmers": kpis["total_farmers"],
            "arrival_growth_pct": None,  # Can be computed if needed across periods
            "arrival_volatility_std": round(kpis["arrival_volatility_std"], 2),
            "anomaly_count": kpis["anomaly_count"],
            "anomaly_rate_pct": anomaly_rate
        }

        return {
            "metrics": metrics,
            "trend": trend,
            "by_crop": by_crop,
            "by_mandi": by_mandi
        }
