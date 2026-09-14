from typing import Any, Dict, Optional
import duckdb
from backend.app.models.common import FilterParams
from backend.app.repositories.arrivals import ArrivalsRepository
from backend.app.repositories.prices import PricesRepository
from backend.app.repositories.logistics import LogisticsRepository
from backend.app.repositories.weather import WeatherRepository


class OverviewAnalytics:
    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.conn = conn
        self.arrivals_repo = ArrivalsRepository(conn)
        self.prices_repo = PricesRepository(conn)
        self.logistics_repo = LogisticsRepository(conn)
        self.weather_repo = WeatherRepository(conn)

    def get_overview(self, filters: Optional[FilterParams] = None) -> Dict[str, Any]:
        arr_kpis = self.arrivals_repo.get_arrival_kpis(filters)
        price_kpis = self.prices_repo.get_price_kpis(filters)
        log_kpis = self.logistics_repo.get_logistics_kpis(filters)
        weather_extremes = self.weather_repo.get_weather_extremes()

        weather_alert_count = (
            weather_extremes["extremes"]["heatwave_event_count"] +
            weather_extremes["extremes"]["heavy_rain_event_count"] +
            weather_extremes["extremes"]["negative_rainfall_anomalies_count"]
        )

        kpis = {
            "total_arrivals_qtl": round(arr_kpis["total_arrivals_qtl"], 2),
            "total_farmers": arr_kpis["total_farmers"],
            "avg_modal_price": round(price_kpis["avg_modal_price"], 2) if price_kpis["avg_modal_price"] is not None else 0.0,
            "avg_msp": round(price_kpis["avg_msp"], 2) if price_kpis["avg_msp"] is not None else 0.0,
            "below_msp_percentage": round(price_kpis["below_msp_percentage"], 2),
            "total_trips": log_kpis["total_trips"],
            "delayed_trip_percentage": round(log_kpis["delayed_trip_percentage"], 2),
            "average_delay_hours": round(log_kpis["average_delay_hours"], 2),
            "mandi_count": arr_kpis["active_mandi_count"],
            "active_crop_count": arr_kpis["active_crop_count"],
            "weather_alert_count": weather_alert_count
        }

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
            "top_arrival_crops": top_crops,
            "mandis_under_price_pressure": price_pressure,
            "worst_logistics_mandis": worst_logistics,
            "arrival_anomaly_summary": arrival_anomaly_summary
        }
