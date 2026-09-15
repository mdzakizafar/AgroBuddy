import json
from typing import Any, Dict, List, Optional
import duckdb

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.models.agent import (
    AgentIntent, AgentQueryRequest, AgentQueryResponse,
    VisualizationSpec, AxisSpec, SeriesSpec
)
from backend.app.models.common import FilterParams
from backend.app.repositories.arrivals import ArrivalsRepository
from backend.app.repositories.prices import PricesRepository
from backend.app.repositories.logistics import LogisticsRepository
from backend.app.repositories.weather import WeatherRepository
from backend.app.analytics.risk import MandiRiskEngine
from backend.app.ai.prompts import AGENT_INTENT_PROMPT


class AgroBuddyAIAgent:
    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.conn = conn
        self.api_key = settings.GROQ_API_KEY
        self.model = settings.AGENT_MODEL
        self.arrivals_repo = ArrivalsRepository(conn)
        self.prices_repo = PricesRepository(conn)
        self.logistics_repo = LogisticsRepository(conn)
        self.weather_repo = WeatherRepository(conn)
        self.risk_engine = MandiRiskEngine(conn)

    def process_query(self, request: AgentQueryRequest) -> AgentQueryResponse:
        query_text = request.query
        logger.info(f"Processing AgroBuddy AI query: '{query_text}'")

        # 1. Parse intent & extract structured query plan
        intent = self._extract_intent(query_text)

        # 2. Execute predefined capability based on intent
        data, viz_spec, summary, recommendation = self._execute_query_plan(intent, query_text)

        return AgentQueryResponse(
            query=query_text,
            intent=intent,
            data=data,
            visualization=viz_spec,
            summary=summary,
            recommendation=recommendation
        )

    def _extract_intent(self, query_text: str) -> AgentIntent:
        if self.api_key:
            try:
                from groq import Groq
                client = Groq(api_key=self.api_key)
                completion = client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": AGENT_INTENT_PROMPT},
                        {"role": "user", "content": f"User question: {query_text}"}
                    ],
                    temperature=0.1,
                    response_format={"type": "json_object"}
                )
                res = json.loads(completion.choices[0].message.content)
                return AgentIntent(
                    intent_type=res.get("intent_type", "trend_comparison"),
                    crop=res.get("crop"),
                    mandi_id=res.get("mandi_id"),
                    district=res.get("district"),
                    state=res.get("state"),
                    metrics=res.get("metrics", []),
                    group_by=res.get("group_by"),
                    date_range=res.get("date_range"),
                    visualization_suggestion=res.get("visualization_suggestion")
                )
            except Exception as e:
                logger.error(f"Error extracting intent via Groq: {str(e)}")

        # Heuristic fallback for intent extraction if Groq API is not set or fails
        q_lower = query_text.lower()
        if "msp" in q_lower or "price" in q_lower:
            intent_type = "crop_price_pressure"
            viz = "bar"
        elif "delay" in q_lower or "transport" in q_lower or "logistics" in q_lower:
            intent_type = "logistics_bottlenecks"
            viz = "bar"
        elif "risk" in q_lower or "vulnerable" in q_lower or "mandi" in q_lower:
            intent_type = "mandi_risk_ranking"
            viz = "bar"
        elif "weather" in q_lower or "rain" in q_lower or "temp" in q_lower:
            intent_type = "weather_extremes"
            viz = "line"
        else:
            intent_type = "trend_comparison"
            viz = "line"

        crop = None
        for c in ["Wheat", "Rice", "Maize", "Cotton", "Sugarcane", "Mustard"]:
            if c.lower() in q_lower:
                crop = c
                break

        return AgentIntent(
            intent_type=intent_type,
            crop=crop,
            metrics=["arrival_qtl", "modal_price", "msp"],
            visualization_suggestion=viz
        )

    def _execute_query_plan(self, intent: AgentIntent, raw_query: str):
        filters = FilterParams(crop=intent.crop, mandi_id=intent.mandi_id, district=intent.district, state=intent.state)

        if intent.intent_type == "crop_price_pressure":
            data = self.prices_repo.get_crop_price_pressure(filters)
            if not data:
                data = self.prices_repo.get_crop_price_pressure()
            
            viz_spec = VisualizationSpec(
                chart_type="bar",
                title=f"Modal Price vs MSP Comparison ({intent.crop or 'All Crops'})",
                x_axis=AxisSpec(field="crop", label="Crop Name"),
                series=[
                    SeriesSpec(field="avg_modal_price", label="Avg Modal Price (₹/Qtl)"),
                    SeriesSpec(field="msp", label="Government MSP (₹/Qtl)")
                ]
            )
            summary = f"Analyzed price pressures relative to MSP. Top crop under pressure is {data[0]['crop'] if data else 'N/A'} with {data[0]['below_msp_percentage'] if data else 0}% records below MSP."
            rec = "Deploy targeted market price support interventions in high-gap crop centers."

        elif intent.intent_type == "mandi_risk_ranking":
            data = self.risk_engine.calculate_mandi_risks(filters)[:10]
            viz_spec = VisualizationSpec(
                chart_type="bar",
                title="Mandi Vulnerability Risk Ranking",
                x_axis=AxisSpec(field="mandi_name", label="Mandi"),
                series=[
                    SeriesSpec(field="risk_score", label="Risk Score (0-100)")
                ]
            )
            top_mandi = data[0]['mandi_name'] if data else 'N/A'
            summary = f"Evaluated Mandi risk scores. Highest risk mandi identified is {top_mandi} with score {data[0]['risk_score'] if data else 0} ({data[0]['risk_level'] if data else 'N/A'} risk)."
            rec = "Prioritize logistics clearance and price stabilization interventions at high risk mandis."

        elif intent.intent_type == "logistics_bottlenecks":
            data = self.logistics_repo.get_logistics_by_mandi(filters)[:10]
            viz_spec = VisualizationSpec(
                chart_type="bar",
                title="Transport Delay Percentage by Mandi",
                x_axis=AxisSpec(field="mandi_name", label="Mandi"),
                series=[
                    SeriesSpec(field="delayed_trip_percentage", label="Delayed Trip %"),
                    SeriesSpec(field="avg_delay_hours", label="Avg Delay (Hours)")
                ]
            )
            summary = f"Logistics analysis indicates high delay percentages at top bottleneck points like {data[0]['mandi_name'] if data else 'N/A'}."
            rec = "Re-route fleet capacity away from bottlenecked warehouses."

        elif intent.intent_type == "weather_extremes":
            w_extremes = self.weather_repo.get_weather_extremes()
            data = w_extremes["top_temperature_readings"] + w_extremes["top_rainfall_readings"]
            viz_spec = VisualizationSpec(
                chart_type="line",
                title="Regional Weather Extremes (Sensor Readings)",
                x_axis=AxisSpec(field="timestamp", label="Timestamp"),
                series=[
                    SeriesSpec(field="temperature_c", label="Temperature (°C)"),
                    SeriesSpec(field="rainfall_mm", label="Rainfall (mm)")
                ]
            )
            summary = f"Weather sensors recorded a maximum temperature of {w_extremes['extremes']['highest_temperature_c']}°C and max rainfall of {w_extremes['extremes']['highest_rainfall_mm']}mm."
            rec = "Monitor environmental sensor alerts for regional agricultural impact."

        else:  # Default: trend_comparison
            arrivals_trend = self.arrivals_repo.get_arrival_trend(filters)
            prices_series = self.prices_repo.get_msp_time_series(filters)

            # Combine time-series by date
            price_map = {p["date"]: p for p in prices_series}
            combined_data = []
            for a in arrivals_trend[:60]:
                dt = a["date"]
                p = price_map.get(dt, {})
                combined_data.append({
                    "date": dt,
                    "arrival_qtl": a["arrival_qtl"],
                    "modal_price": p.get("modal_price"),
                    "msp": p.get("msp")
                })
            data = combined_data

            viz_spec = VisualizationSpec(
                chart_type="line",
                title=f"Daily Arrivals & Price Trend ({intent.crop or 'All Crops'})",
                x_axis=AxisSpec(field="date", label="Date"),
                series=[
                    SeriesSpec(field="arrival_qtl", label="Daily Arrivals (Qtl)"),
                    SeriesSpec(field="modal_price", label="Modal Price (₹/Qtl)"),
                    SeriesSpec(field="msp", label="MSP (₹/Qtl)")
                ]
            )
            summary = f"Daily trend for {intent.crop or 'selected crops'} indicates peak arrival volume with corresponding market price movements."
            rec = "Maintain balanced procurement schedules aligned with market arrival peaks."

        return data, viz_spec, summary, rec
