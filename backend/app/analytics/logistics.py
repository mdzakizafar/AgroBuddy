from typing import Any, Dict, Optional
import duckdb
from backend.app.models.common import FilterParams
from backend.app.repositories.logistics import LogisticsRepository


class LogisticsAnalytics:
    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.repo = LogisticsRepository(conn)

    def get_logistics_command(self, filters: Optional[FilterParams] = None) -> Dict[str, Any]:
        kpis = self.repo.get_logistics_kpis(filters)
        delays_series = self.repo.get_delays_time_series(filters)
        by_mandi = self.repo.get_logistics_by_mandi(filters)
        routes = self.repo.get_route_logistics(filters)

        return {
            "summary": kpis,
            "delays_series": delays_series,
            "by_mandi": by_mandi,
            "routes": routes
        }
