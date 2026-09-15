from typing import Any, Dict, List, Optional
from pydantic import BaseModel
import duckdb

from backend.app.models.common import FilterParams
from backend.app.analytics.overview import OverviewAnalytics
from backend.app.analytics.arrivals import ArrivalsAnalytics
from backend.app.analytics.prices import PricesAnalytics
from backend.app.analytics.logistics import LogisticsAnalytics
from backend.app.analytics.weather import WeatherAnalytics
from backend.app.analytics.risk import MandiRiskEngine


class PageInsightContext(BaseModel):
    page: str
    filters: Dict[str, Any]
    summary_kpis: Dict[str, Any]
    top_rankings: List[Dict[str, Any]]
    anomalies_and_alerts: List[Dict[str, Any]]
    context_notes: List[str]


class AnalyticsContextBuilder:
    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.conn = conn
        self.overview_analytics = OverviewAnalytics(conn)
        self.arrivals_analytics = ArrivalsAnalytics(conn)
        self.prices_analytics = PricesAnalytics(conn)
        self.logistics_analytics = LogisticsAnalytics(conn)
        self.weather_analytics = WeatherAnalytics(conn)
        self.risk_engine = MandiRiskEngine(conn)

    def build_context_for_page(self, page: str, filters: Optional[FilterParams] = None) -> PageInsightContext:
        filter_dict = filters.model_dump(exclude_none=True) if filters else {}

        if page == "command_center" or page == "overview":
            overview_data = self.overview_analytics.get_overview(filters)
            return PageInsightContext(
                page="command_center",
                filters=filter_dict,
                summary_kpis=overview_data["kpis"],
                top_rankings=overview_data["top_arrival_crops"][:3] + overview_data["mandis_under_price_pressure"][:3],
                anomalies_and_alerts=[overview_data["arrival_anomaly_summary"]],
                context_notes=[
                    "High-level Mandi-to-Market system overview.",
                    f"Total Arrivals: {overview_data['kpis'].get('total_arrivals_qtl', 0.0)} Qtl across {overview_data['kpis'].get('mandi_count', 0)} mandis.",
                    f"Below MSP: {overview_data['kpis'].get('below_msp_rate', overview_data['kpis'].get('below_msp_percentage', 0.0))}% of price records.",
                    f"Logistics Delays: {overview_data['kpis'].get('delayed_trip_percentage', 0.0)}% trips delayed."
                ]
            )

        elif page == "supply_pulse" or page == "arrivals":
            supply_data = self.arrivals_analytics.get_supply_pulse(filters)
            return PageInsightContext(
                page="supply_pulse",
                filters=filter_dict,
                summary_kpis=supply_data["metrics"],
                top_rankings=supply_data["by_crop"][:5],
                anomalies_and_alerts=[{"anomaly_count": supply_data["metrics"]["anomaly_count"]}],
                context_notes=[
                    "Crop supply and Mandi arrival trends.",
                    f"Top crop by arrival: {supply_data['by_crop'][0]['crop_name'] if supply_data['by_crop'] else 'N/A'}.",
                    f"Arrival volatility (std): {supply_data['metrics']['arrival_volatility_std']} Qtl."
                ]
            )

        elif page == "farmer_price_watch" or page == "prices":
            price_data = self.prices_analytics.get_price_watch(filters)
            top_pressure = price_data["crop_pressure"][:5]
            return PageInsightContext(
                page="farmer_price_watch",
                filters=filter_dict,
                summary_kpis={
                    "total_crops_monitored": len(price_data["crop_pressure"]),
                    "highest_below_msp_pct": top_pressure[0].get("below_msp_rate", top_pressure[0].get("below_msp_percentage", 0.0)) if top_pressure else 0.0
                },
                top_rankings=top_pressure,
                anomalies_and_alerts=[{"high_pressure_crops": [c.get("crop_name", c.get("crop")) for c in top_pressure if c.get("below_msp_rate", c.get("below_msp_percentage", 0.0)) > 40.0]}],
                context_notes=[
                    "Formula enforced: msp_gap = msp - modal_price, below_msp_flag = modal_price < msp.",
                    "Focus on crops where modal_price consistently trades below government MSP."
                ]
            )

        elif page == "logistics_command" or page == "logistics":
            log_data = self.logistics_analytics.get_logistics_command(filters)
            return PageInsightContext(
                page="logistics_command",
                filters=filter_dict,
                summary_kpis=log_data["summary"],
                top_rankings=log_data["by_mandi"][:5],
                anomalies_and_alerts=[{"anomalies": log_data["summary"]["anomaly_count"]}],
                context_notes=[
                    "Transit formula enforced: expected_hours = distance_km / 40, delay_hours = transit_hours - expected_hours.",
                    f"Overall delayed trip rate: {log_data['summary']['delayed_trip_percentage']}%."
                ]
            )

        elif page == "weather_operations" or page == "weather":
            w_data = self.weather_analytics.get_weather_analytics()
            return PageInsightContext(
                page="weather_operations",
                filters=filter_dict,
                summary_kpis=w_data["extremes"]["extremes"],
                top_rankings=w_data["extremes"]["top_temperature_readings"][:3],
                anomalies_and_alerts=[{"heatwaves": w_data["extremes"]["extremes"]["heatwave_event_count"]}],
                context_notes=[
                    "CRITICAL CONSTRAINT: Weather is sensor-level only and NOT mapped to Mandis.",
                    "Observations evaluate regional weather sensor readings only."
                ]
            )

        elif page == "mandi_risk" or page == "risk":
            risks = self.risk_engine.calculate_mandi_risks(filters)[:10]
            return PageInsightContext(
                page="mandi_risk",
                filters=filter_dict,
                summary_kpis={
                    "total_mandis_assessed": len(risks),
                    "high_risk_count": sum(1 for r in risks if r["risk_level"] == "high"),
                    "medium_risk_count": sum(1 for r in risks if r["risk_level"] == "medium")
                },
                top_rankings=risks[:5],
                anomalies_and_alerts=[{"high_risk_mandis": [r["mandi_name"] for r in risks if r["risk_level"] == "high"]}],
                context_notes=[
                    "Risk combining price pressure, arrival instability, and logistics delay.",
                    "Weather is excluded due to lack of sensor-to-mandi mapping."
                ]
            )

        else:  # Default/Forecast/Ask AgroBuddy
            overview_data = self.overview_analytics.get_overview(filters)
            return PageInsightContext(
                page=page,
                filters=filter_dict,
                summary_kpis=overview_data["kpis"],
                top_rankings=overview_data["top_arrival_crops"][:3],
                anomalies_and_alerts=[],
                context_notes=["General analytics context for AgroBuddy intelligence."]
            )
