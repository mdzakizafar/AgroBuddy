from typing import Any, Dict, Optional
import duckdb
from backend.app.models.common import FilterParams
from backend.app.repositories.prices import PricesRepository


class PricesAnalytics:
    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.repo = PricesRepository(conn)

    def get_price_watch(self, filters: Optional[FilterParams] = None) -> Dict[str, Any]:
        crop_pressure = self.repo.get_crop_price_pressure(filters)
        mandi_pressure = self.repo.get_mandi_price_pressure(filters)
        time_series = self.repo.get_msp_time_series(filters)

        return {
            "crop_pressure": crop_pressure,
            "mandi_pressure": mandi_pressure,
            "series": time_series
        }
