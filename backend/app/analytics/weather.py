from typing import Any, Dict, Optional
import duckdb
from backend.app.repositories.weather import WeatherRepository


class WeatherAnalytics:
    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.repo = WeatherRepository(conn)

    def get_weather_analytics(self, sensor_id: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None) -> Dict[str, Any]:
        trend = self.repo.get_weather_trend(sensor_id, date_from, date_to)
        extremes = self.repo.get_weather_extremes(sensor_id, date_from, date_to)
        sensors = self.repo.get_sensors_status()

        return {
            "trend": trend,
            "extremes": extremes,
            "sensors": sensors,
            "unmapped_metadata": {
                "mapping_status": "unmapped",
                "message": "Weather observations are currently available at sensor level."
            }
        }
