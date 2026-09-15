import json
import re
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
from backend.app.ai.prompts import AGENT_INTENT_PROMPT, GENERAL_QUERY_SYSTEM_PROMPT
from backend.app.ml.predictor import ArrivalsPredictor
from backend.app.services.llm_cache import llm_cache
from backend.app.utils.validation import sanitize_nans


SUPPORTED_CROPS = ["Wheat", "Rice", "Maize", "Cotton", "Sugarcane", "Mustard"]


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
        self.predictor = ArrivalsPredictor()

    def process_query(self, request: AgentQueryRequest) -> AgentQueryResponse:
        query_text = request.query.strip()
        logger.info(f"Processing AgroBuddy AI query: '{query_text}'")

        # 1. Check LLM Cache
        cache_key = llm_cache.generate_agent_cache_key(
            query=query_text,
            filters=getattr(request, "filters", {}) or {},
            model=self.model
        )
        cached_val = llm_cache.get(cache_key)
        if cached_val:
            try:
                return AgentQueryResponse(**cached_val)
            except Exception as ce:
                logger.warning(f"Error parsing cached agent query response: {str(ce)}")

        # 2. Parse intent & extract structured query plan
        intent = self._extract_intent(query_text)

        # 3. Execute predefined capability based on intent
        data, viz_spec, summary, recommendation = self._execute_query_plan(intent, query_text)

        response_obj = AgentQueryResponse(
            query=query_text,
            intent=intent,
            data=data,
            visualization=viz_spec,
            summary=summary,
            recommendation=recommendation
        )

        # 4. Save in LLM Cache
        try:
            llm_cache.set(cache_key, response_obj.model_dump())
        except Exception as e:
            logger.warning(f"Could not cache agent response: {str(e)}")

        return response_obj

    def _extract_intent(self, query_text: str) -> AgentIntent:
        # 1. Try LLM parser if API key is present
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
                    temperature=0.0,
                    response_format={"type": "json_object"}
                )
                res = json.loads(completion.choices[0].message.content)
                intent_type = res.get("intent_type", "")
                valid_intents = [
                    "general_query", "mandi_price_pressure", "mandi_divergence",
                    "crop_comparison", "forecast_arrivals", "trend_comparison",
                    "logistics_bottlenecks", "crop_price_pressure", "mandi_risk_ranking",
                    "weather_extremes"
                ]
                if intent_type in valid_intents:
                    return AgentIntent(
                        intent_type=intent_type,
                        crop=res.get("crop"),
                        crops=res.get("crops", []),
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

        # 2. Heuristic fallback intent extraction
        return self._extract_intent_fallback(query_text)

    def _extract_intent_fallback(self, query_text: str) -> AgentIntent:
        q_lower = query_text.lower()

        # Extract mentioned crops
        found_crops = []
        for c in SUPPORTED_CROPS:
            if c.lower() in q_lower:
                found_crops.append(c)
        primary_crop = found_crops[0] if found_crops else None

        # Extract date range
        date_range = None
        if "30 day" in q_lower or "last 30" in q_lower:
            date_range = "last_30_days"
        elif "7 day" in q_lower or "last 7" in q_lower:
            date_range = "last_7_days"

        # 1. Conversational / Greetings / Definitions (General Queries)
        is_greeting = bool(re.search(r"\b(hello|hi|hey|who are you|what can you do|help|agrobuddy|features|capabilities)\b", q_lower))
        is_definition = bool(re.search(r"\b(what is|how is|how do you|formula|explain|meaning of)\b", q_lower)) and not bool(re.search(r"\b(which mandi|show|list|plot|compare|forecast|predict)\b", q_lower))
        if is_greeting or is_definition:
            return AgentIntent(
                intent_type="general_query",
                crop=primary_crop,
                crops=found_crops,
                visualization_suggestion=None
            )

        # 2. Forecasting
        if re.search(r"\b(forecast|predict|prediction|future|project)\b", q_lower):
            return AgentIntent(
                intent_type="forecast_arrivals",
                crop=primary_crop or "Wheat",
                crops=found_crops,
                visualization_suggestion="line"
            )

        # 3. Crop Comparison (e.g. "Compare Wheat and Rice arrivals across Mandis")
        if (re.search(r"\b(compare|versus|vs|comparison)\b", q_lower) and len(found_crops) >= 2) or (
            re.search(r"compare.*(wheat|rice|maize|cotton|sugarcane|mustard)", q_lower)
        ):
            crops_to_compare = found_crops if len(found_crops) >= 2 else ["Wheat", "Rice"]
            return AgentIntent(
                intent_type="crop_comparison",
                crop=crops_to_compare[0],
                crops=crops_to_compare,
                visualization_suggestion="bar"
            )

        # 4. Mandi Divergence (increasing arrivals but prices below MSP)
        if re.search(r"\b(increasing|surge|rising|glut|divergence)\b", q_lower) and re.search(r"\b(msp|price)\b", q_lower):
            return AgentIntent(
                intent_type="mandi_divergence",
                crop=primary_crop,
                crops=found_crops,
                visualization_suggestion="bar"
            )

        # 5. Mandi Price Pressure (specific Mandis below MSP)
        if (re.search(r"\bwhich mandi|which mandis\b", q_lower) and re.search(r"\b(below msp|under msp|price|msp)\b", q_lower)) or (
            re.search(r"\bmandis?.*below msp\b", q_lower)
        ):
            return AgentIntent(
                intent_type="mandi_price_pressure",
                crop=primary_crop or "Wheat",
                crops=found_crops,
                visualization_suggestion="bar"
            )

        # 6. Logistics Delays
        if re.search(r"\b(delay|delays|transit|transport|logistics|bottleneck)\b", q_lower):
            return AgentIntent(
                intent_type="logistics_bottlenecks",
                crop=primary_crop,
                visualization_suggestion="bar"
            )

        # 7. Mandi Risk Ranking
        if re.search(r"\b(risk|vulnerable|vulnerability)\b", q_lower):
            return AgentIntent(
                intent_type="mandi_risk_ranking",
                crop=primary_crop,
                visualization_suggestion="bar"
            )

        # 8. Weather Extremes
        if re.search(r"\b(weather|rain|rainfall|temp|temperature|heatwave|monsoon)\b", q_lower):
            return AgentIntent(
                intent_type="weather_extremes",
                visualization_suggestion="line"
            )

        # 9. Crop Price Pressure (crop-level comparison)
        if "msp" in q_lower or "price pressure" in q_lower:
            return AgentIntent(
                intent_type="crop_price_pressure",
                crop=primary_crop,
                visualization_suggestion="bar"
            )

        # 10. Default: Daily Arrival/Price Trend
        return AgentIntent(
            intent_type="trend_comparison",
            crop=primary_crop or "Wheat",
            date_range=date_range,
            visualization_suggestion="line"
        )

    def _execute_query_plan(self, intent: AgentIntent, raw_query: str):
        filters = FilterParams(crop=intent.crop, mandi_id=intent.mandi_id, district=intent.district, state=intent.state)
        crop = intent.crop or "Wheat"

        # ==========================================
        # 1. GENERAL CONVERSATIONAL QUERY
        # ==========================================
        if intent.intent_type == "general_query":
            summary = None
            rec = None

            # Try LLM conversational response if API key configured
            if self.api_key:
                try:
                    from groq import Groq
                    client = Groq(api_key=self.api_key)
                    completion = client.chat.completions.create(
                        model=self.model,
                        messages=[
                            {"role": "system", "content": GENERAL_QUERY_SYSTEM_PROMPT},
                            {"role": "user", "content": raw_query}
                        ],
                        temperature=0.2,
                        response_format={"type": "json_object"}
                    )
                    res = json.loads(completion.choices[0].message.content)
                    summary = res.get("summary")
                    rec = res.get("recommendation")
                except Exception as e:
                    logger.warning(f"Groq general query fallback triggered: {str(e)}")

            # Deterministic domain fallback if LLM is offline or unconfigured
            if not summary:
                q_lower = raw_query.lower()
                if any(w in q_lower for w in ["msp", "price", "gap", "shortfall"]):
                    summary = (
                        "In AgroBuddy, Government Minimum Support Price (MSP) is the statutory floor price established by the "
                        "Government of India to safeguard farmers against market price crashes. The MSP Gap is calculated as: "
                        "MSP Gap = Statutory MSP - Modal Price (₹/Qtl). A positive MSP gap signifies distress sales where crops are "
                        "trading below the guaranteed support rate, requiring targeted market interventions."
                    )
                    rec = "Try asking: 'Which Mandis had wheat prices below MSP?' to review markets currently under price distress."

                elif any(w in q_lower for w in ["delay", "logistics", "transit", "speed", "transport"]):
                    summary = (
                        "Logistics transit delay is calculated against an Indian national freight benchmark speed of 40 km/h: "
                        "Expected Transit Hours = Distance (km) / 40.0, and Delay Hours = Actual Transit Hours - Expected Hours. "
                        "Shipments with positive delay hours are flagged to identify bottlenecked transit corridors and warehouse unloading backlogs."
                    )
                    rec = "Try asking: 'Which Mandis have the highest logistics delays?' to view affected transit hubs."

                elif any(w in q_lower for w in ["risk", "vulnerability", "score", "level"]):
                    summary = (
                        "The Mandi Vulnerability Score (0 to 100) is an operational composite risk index weighting four pillars: "
                        "Price Gap Rate (35%), Arrival Volatility (25%), Logistics Delay Rate (25%), and Environmental Weather Exposure (15%). "
                        "Mandis are classified into three actionable tiers: Low Risk (<50, Green), Medium Risk (50–74, Yellow), and High Risk (≥75, Red)."
                    )
                    rec = "Explore the Mandi Risk & Operations dashboard for comprehensive geographic vulnerability maps."

                elif any(w in q_lower for w in ["forecast", "predict", "model", "ml"]):
                    summary = (
                        "AgroBuddy generates multi-step 7-day arrival volume forecasts using Ridge Regression and Random Forest models "
                        "tracked via MLflow. The model incorporates 14-day historical arrival lags, rolling 7-day moving statistics, and calendar "
                        "seasonality features to deliver projections with 95% confidence intervals."
                    )
                    rec = "Try asking: 'Show the forecast for Wheat arrivals.' to generate upcoming volume projections."

                elif any(w in q_lower for w in ["crop", "state", "coverage", "mandi"]):
                    summary = (
                        "AgroBuddy monitors 57 Mandis across 7 key Indian agricultural States (Punjab, Haryana, Uttar Pradesh, "
                        "Madhya Pradesh, Rajasthan, Gujarat, and Maharashtra) across 6 major commodities: Wheat, Rice, Maize, Cotton, Sugarcane, and Mustard."
                    )
                    rec = "Try asking: 'Compare Wheat and Rice arrivals across Mandis.' to analyze regional crop inflows."

                else:
                    summary = (
                        "Welcome to AgroBuddy Intelligence! I am your AI decision assistant for Mandi-to-Market agricultural analytics. "
                        "I monitor 57 Mandis across 7 States, analyzing daily crop arrivals, price-vs-MSP pressures, logistics transit bottlenecks, "
                        "weather sensor extremes, and 7-day ML arrival forecasts."
                    )
                    rec = "You can ask: 'Which Mandis had wheat prices below MSP?', 'Show wheat arrivals for the last 30 days.', or 'Show the forecast for Wheat arrivals.'"

            return [], None, summary, rec or "Select any suggested query above or type a specific crop/mandi question."

        # ==========================================
        # 2. MANDI PRICE PRESSURE (Template 1)
        # ==========================================
        elif intent.intent_type == "mandi_price_pressure":
            mandis = self.prices_repo.get_mandi_price_pressure(FilterParams(crop=crop))
            below_mandis = [m for m in mandis if m.get("below_msp_rate", 0) > 0]
            if not below_mandis:
                below_mandis = mandis[:10]
            else:
                below_mandis = below_mandis[:10]

            data = [
                {
                    "mandi_name": m["mandi_name"],
                    "district": m.get("district", ""),
                    "below_msp_rate": round(float(m.get("below_msp_rate", 0.0)), 1),
                    "avg_modal_price": round(float(m.get("avg_modal_price", 0.0)), 1),
                    "avg_msp": round(float(m.get("avg_msp", 0.0)), 1),
                    "avg_msp_gap": round(float(m.get("avg_msp_gap", 0.0)), 1)
                }
                for m in below_mandis
            ]

            viz_spec = VisualizationSpec(
                chart_type="bar",
                title=f"Mandis with {crop} Prices Below MSP",
                x_axis=AxisSpec(field="mandi_name", label="Mandi"),
                series=[
                    SeriesSpec(field="below_msp_rate", label="Below MSP Rate (%)", color="#DC2626"),
                    SeriesSpec(field="avg_modal_price", label="Avg Modal Price (₹/Qtl)", color="#5B7B10"),
                    SeriesSpec(field="avg_msp", label="Statutory MSP (₹/Qtl)", color="#D97706")
                ]
            )
            top_m = data[0]["mandi_name"] if data else "N/A"
            top_rate = data[0]["below_msp_rate"] if data else 0
            m2 = data[1]["mandi_name"] if len(data) > 1 else ""
            m2_rate = f" and {m2} ({data[1]['below_msp_rate']}%)" if len(data) > 1 else ""
            msp_val = data[0]["avg_msp"] if data else 0

            summary = (
                f"Evaluated {crop} modal prices against the Government MSP (₹{msp_val:,.0f}/Qtl). "
                f"Identified {len(below_mandis)} Mandis experiencing severe price pressure, led by {top_m} "
                f"({top_rate}% of trades below MSP){m2_rate}."
            )
            rec = "Initiate targeted FCI/NAFED procurement drives and price deficiency disbursements at top distressed mandis to defend statutory floor prices."

        # ==========================================
        # 3. MANDI DIVERGENCE (Template 3)
        # ==========================================
        elif intent.intent_type == "mandi_divergence":
            query = """
                WITH arr AS (
                    SELECT a.mandi_id, SUM(a.arrival_qtl) as arrival_qtl
                    FROM fact_arrivals a
                    WHERE (? IS NULL OR LOWER(a.crop_name) = LOWER(?))
                    GROUP BY a.mandi_id
                ),
                prc AS (
                    SELECT 
                        p.mandi_id,
                        m.mandi_name,
                        m.district,
                        ROUND(AVG(p.modal_price), 1) as avg_modal_price,
                        ROUND(AVG(p.msp), 1) as avg_msp,
                        ROUND(AVG(p.msp - p.modal_price), 1) as avg_msp_gap,
                        ROUND((SUM(CASE WHEN p.modal_price < p.msp THEN 1 ELSE 0 END)::DOUBLE / COUNT(*)) * 100.0, 1) as below_msp_rate
                    FROM fact_prices p
                    JOIN dim_mandi m ON p.mandi_id = m.mandi_id
                    WHERE (? IS NULL OR LOWER(p.crop_name) = LOWER(?))
                    GROUP BY p.mandi_id, m.mandi_name, m.district
                    HAVING below_msp_rate > 0
                )
                SELECT 
                    prc.mandi_name,
                    prc.district,
                    ROUND(arr.arrival_qtl, 1) as total_arrivals_qtl,
                    prc.avg_modal_price,
                    prc.avg_msp,
                    prc.avg_msp_gap,
                    prc.below_msp_rate
                FROM prc
                JOIN arr ON prc.mandi_id = arr.mandi_id
                ORDER BY arr.arrival_qtl DESC, prc.below_msp_rate DESC
                LIMIT 10
            """
            crop_param = intent.crop if intent.crop else None
            df = self.conn.execute(query, [crop_param, crop_param, crop_param, crop_param]).df()
            data = sanitize_nans(df.to_dict(orient="records"))

            viz_spec = VisualizationSpec(
                chart_type="bar",
                title=f"Supply Glut Divergence: High Arrivals & Below-MSP Prices ({intent.crop or 'All Crops'})",
                x_axis=AxisSpec(field="mandi_name", label="Mandi"),
                series=[
                    SeriesSpec(field="total_arrivals_qtl", label="Total Arrivals (Qtl)", color="#5B7B10"),
                    SeriesSpec(field="below_msp_rate", label="Below MSP Rate (%)", color="#DC2626")
                ]
            )
            top_m = data[0]["mandi_name"] if data else "N/A"
            top_arr = data[0]["total_arrivals_qtl"] if data else 0
            top_rate = data[0]["below_msp_rate"] if data else 0
            summary = (
                f"Identified {len(data)} Mandis demonstrating supply glut divergence — heavy arrival volume accompanied by "
                f"depressed market prices below MSP. Highest divergence pressure detected at {top_m} with {top_arr:,.1f} Qtl "
                f"arrivals and {top_rate}% below-MSP sales."
            )
            rec = "Open emergency procurement intake channels and warehouse storage buffers at these glut centers to prevent distress liquidation."

        # ==========================================
        # 4. CROP COMPARISON (Template 5)
        # ==========================================
        elif intent.intent_type == "crop_comparison":
            crops = intent.crops if intent.crops and len(intent.crops) >= 2 else ["Wheat", "Rice"]
            c1, c2 = crops[0], crops[1]

            query = """
                SELECT 
                    m.mandi_name,
                    ROUND(SUM(CASE WHEN LOWER(a.crop_name) = LOWER(?) THEN a.arrival_qtl ELSE 0 END), 1) AS crop1_arrivals,
                    ROUND(SUM(CASE WHEN LOWER(a.crop_name) = LOWER(?) THEN a.arrival_qtl ELSE 0 END), 1) AS crop2_arrivals,
                    ROUND(SUM(a.arrival_qtl), 1) AS total_arrivals
                FROM fact_arrivals a
                JOIN dim_mandi m ON a.mandi_id = m.mandi_id
                WHERE LOWER(a.crop_name) IN (LOWER(?), LOWER(?))
                GROUP BY m.mandi_name
                ORDER BY total_arrivals DESC
                LIMIT 10
            """
            df = self.conn.execute(query, [c1, c2, c1, c2]).df()
            data = sanitize_nans(df.to_dict(orient="records"))

            viz_spec = VisualizationSpec(
                chart_type="bar",
                title=f"{c1} vs {c2} Arrivals Across Top Mandis",
                x_axis=AxisSpec(field="mandi_name", label="Mandi"),
                series=[
                    SeriesSpec(field="crop1_arrivals", label=f"{c1} Arrivals (Qtl)", color="#5B7B10"),
                    SeriesSpec(field="crop2_arrivals", label=f"{c2} Arrivals (Qtl)", color="#D97706")
                ]
            )
            tot_c1 = sum(d["crop1_arrivals"] for d in data) if data else 0
            tot_c2 = sum(d["crop2_arrivals"] for d in data) if data else 0
            top_m = data[0]["mandi_name"] if data else "N/A"

            summary = (
                f"Compared {c1} and {c2} arrivals across the top 10 market centers. Total volume reached "
                f"{tot_c1:,.1f} Qtl for {c1} and {tot_c2:,.1f} Qtl for {c2}. Leading combined throughput was recorded at {top_m}."
            )
            rec = f"Allocate dedicated storage silos and grading lines based on the relative arrival volume of {c1} versus {c2} at each hub."

        # ==========================================
        # 5. FORECAST ARRIVALS (Template 6)
        # ==========================================
        elif intent.intent_type == "forecast_arrivals":
            forecast_res = self.predictor.predict_forecast(self.conn, crop=crop, horizon=7)
            raw_items = forecast_res.get("forecast", [])
            model_name = forecast_res.get("model", "Ridge Regression (MLflow)")

            data = []
            for item in raw_items:
                if hasattr(item, "model_dump"):
                    data.append(item.model_dump())
                elif isinstance(item, dict):
                    data.append(item)
                else:
                    data.append({
                        "date": getattr(item, "date", ""),
                        "predicted_arrival_qtl": getattr(item, "predicted_arrival_qtl", 0.0),
                        "forecast": getattr(item, "forecast", 0.0),
                        "lower_bound": getattr(item, "lower_bound", 0.0),
                        "upper_bound": getattr(item, "upper_bound", 0.0)
                    })

            viz_spec = VisualizationSpec(
                chart_type="line",
                title=f"7-Day ML Arrival Forecast: {crop}",
                x_axis=AxisSpec(field="date", label="Forecast Date"),
                series=[
                    SeriesSpec(field="predicted_arrival_qtl", label=f"Predicted {crop} Arrivals (Qtl)", color="#5B7B10"),
                    SeriesSpec(field="upper_bound", label="Upper Bound 95% CI (Qtl)", color="#D97706"),
                    SeriesSpec(field="lower_bound", label="Lower Bound 95% CI (Qtl)", color="#6B7C4B")
                ]
            )
            if data:
                preds = [d.get("predicted_arrival_qtl", 0.0) for d in data]
                avg_pred = sum(preds) / len(preds) if preds else 0.0
                min_pred = min(preds) if preds else 0.0
                max_pred = max(preds) if preds else 0.0
                summary = (
                    f"Generated 7-day arrival forecast for {crop} using {model_name}. Projected average daily arrival is "
                    f"{avg_pred:,.1f} Qtl (anticipated range: {min_pred:,.1f} to {max_pred:,.1f} Qtl across monitored centers)."
                )
            else:
                summary = f"Arrival forecast generated for {crop} using {model_name}."

            rec = "Coordinate additional weighbridges, labor shifts, and outward truck dispatch to handle projected arrival surges."

        # ==========================================
        # 6. LOGISTICS BOTTLENECKS (Template 4)
        # ==========================================
        elif intent.intent_type == "logistics_bottlenecks":
            raw_data = self.logistics_repo.get_logistics_by_mandi(filters)[:10]
            data = [
                {
                    "mandi_name": m["mandi_name"],
                    "district": m.get("district", ""),
                    "delayed_trip_percentage": round(float(m.get("delayed_trip_percentage", 0.0)), 1),
                    "avg_delay_hours": round(float(m.get("avg_delay_hours", 0.0)), 1),
                    "avg_transit_hours": round(float(m.get("avg_transit_hours", 0.0)), 1),
                    "trip_count": int(m.get("trip_count", 0))
                }
                for m in raw_data
            ]

            viz_spec = VisualizationSpec(
                chart_type="bar",
                title="Transport Delay Percentage & Hours by Mandi",
                x_axis=AxisSpec(field="mandi_name", label="Mandi"),
                series=[
                    SeriesSpec(field="delayed_trip_percentage", label="Delayed Trip %", color="#DC2626"),
                    SeriesSpec(field="avg_delay_hours", label="Avg Delay (Hours)", color="#D97706")
                ]
            )
            top_m = data[0]["mandi_name"] if data else "N/A"
            top_del = data[0]["delayed_trip_percentage"] if data else 0
            top_hours = data[0]["avg_delay_hours"] if data else 0

            summary = (
                f"Evaluated transport bottlenecks across Mandis against the 40 km/h transit standard. Highest congestion "
                f"was recorded at {top_m} with {top_del:.1f}% delayed trips and an average transit delay of {top_hours:.1f} hours."
            )
            rec = "Enforce pre-dispatch slot booking and reroute fleet vehicles away from congested transit corridors."

        # ==========================================
        # 7. MANDI RISK RANKING
        # ==========================================
        elif intent.intent_type == "mandi_risk_ranking":
            data = self.risk_engine.calculate_mandi_risks(filters)[:10]
            viz_spec = VisualizationSpec(
                chart_type="bar",
                title="Mandi Vulnerability Risk Ranking (Composite Score)",
                x_axis=AxisSpec(field="mandi_name", label="Mandi"),
                series=[
                    SeriesSpec(field="risk_score", label="Risk Score (0-100)", color="#DC2626")
                ]
            )
            top_mandi = data[0]["mandi_name"] if data else "N/A"
            top_score = data[0]["risk_score"] if data else 0
            top_lvl = data[0]["risk_level"] if data else "N/A"
            summary = (
                f"Evaluated composite Mandi risk scores across price, supply volatility, logistics, and weather. Highest risk "
                f"hub identified is {top_mandi} with score {top_score:.1f} ({top_lvl} risk)."
            )
            rec = "Deploy multi-agency rapid response teams to stabilize price and logistics bottlenecks at critical mandis."

        # ==========================================
        # 8. WEATHER EXTREMES
        # ==========================================
        elif intent.intent_type == "weather_extremes":
            w_extremes = self.weather_repo.get_weather_extremes()
            data = w_extremes["top_temperature_readings"] + w_extremes["top_rainfall_readings"]
            viz_spec = VisualizationSpec(
                chart_type="line",
                title="Regional Weather Extremes (Sensor Readings)",
                x_axis=AxisSpec(field="timestamp", label="Timestamp"),
                series=[
                    SeriesSpec(field="temperature_c", label="Temperature (°C)", color="#DC2626"),
                    SeriesSpec(field="rainfall_mm", label="Rainfall (mm)", color="#2563EB")
                ]
            )
            summary = (
                f"Environmental sensors recorded maximum temperature of {w_extremes['extremes']['highest_temperature_c']}°C "
                f"and peak rainfall of {w_extremes['extremes']['highest_rainfall_mm']}mm across regional monitoring stations."
            )
            rec = "Issue pre-emptive localized weather advisories to mitigate spoilage and flash flood transit delays."

        # ==========================================
        # 9. CROP PRICE PRESSURE (Overall)
        # ==========================================
        elif intent.intent_type == "crop_price_pressure":
            data = self.prices_repo.get_crop_price_pressure(filters)
            if not data:
                data = self.prices_repo.get_crop_price_pressure()

            viz_spec = VisualizationSpec(
                chart_type="bar",
                title=f"Modal Price vs MSP Comparison ({intent.crop or 'All Crops'})",
                x_axis=AxisSpec(field="crop_name", label="Crop"),
                series=[
                    SeriesSpec(field="avg_modal_price", label="Avg Modal Price (₹/Qtl)", color="#5B7B10"),
                    SeriesSpec(field="avg_msp", label="Statutory MSP (₹/Qtl)", color="#D97706")
                ]
            )
            top_crop = data[0].get("crop_name", "N/A") if data else "N/A"
            below_rate = round(float(data[0].get("below_msp_rate", 0.0)), 1) if data else 0.0
            summary = (
                f"Analyzed price pressures relative to MSP. Top crop experiencing price pressure is {top_crop} with "
                f"{below_rate}% of market transactions below Government MSP."
            )
            rec = "Deploy targeted market price support interventions in high-gap crop centers."

        # ==========================================
        # 10. TREND COMPARISON (Template 2 Default)
        # ==========================================
        else:
            arrivals_trend = self.arrivals_repo.get_arrival_trend(filters)
            prices_series = self.prices_repo.get_msp_time_series(filters)
            price_map = {p["date"]: p for p in prices_series}

            # Handle date range slicing
            q_lower = raw_query.lower()
            if intent.date_range == "last_30_days" or "30 day" in q_lower or "last 30" in q_lower:
                selected_trend = arrivals_trend[-30:] if len(arrivals_trend) >= 30 else arrivals_trend
                period_str = "the last 30 days"
            elif intent.date_range == "last_7_days" or "7 day" in q_lower or "last 7" in q_lower:
                selected_trend = arrivals_trend[-7:] if len(arrivals_trend) >= 7 else arrivals_trend
                period_str = "the last 7 days"
            else:
                selected_trend = arrivals_trend[-30:] if len(arrivals_trend) > 30 else arrivals_trend
                period_str = "recent daily trends"

            combined_data = []
            for a in selected_trend:
                dt = a["date"]
                p = price_map.get(dt, {})
                combined_data.append({
                    "date": dt,
                    "arrival_qtl": round(float(a["arrival_qtl"]), 1),
                    "rolling_7d_arrival_qtl": round(float(a.get("rolling_7d_arrival_qtl", a["arrival_qtl"])), 1),
                    "farmer_count": int(a.get("farmer_count", 0)),
                    "modal_price": round(float(p.get("modal_price", 0.0)), 1) if p.get("modal_price") else None,
                    "msp": round(float(p.get("msp", 0.0)), 1) if p.get("msp") else None
                })
            data = combined_data

            viz_spec = VisualizationSpec(
                chart_type="line",
                title=f"Daily Arrivals & 7-Day Moving Average ({crop})",
                x_axis=AxisSpec(field="date", label="Date"),
                series=[
                    SeriesSpec(field="arrival_qtl", label="Daily Arrivals (Qtl)", color="#5B7B10"),
                    SeriesSpec(field="rolling_7d_arrival_qtl", label="7-Day Moving Avg (Qtl)", color="#D97706")
                ]
            )
            tot_vol = sum(d["arrival_qtl"] for d in data) if data else 0.0
            avg_vol = tot_vol / len(data) if data else 0.0
            start_d = data[0]["date"] if data else ""
            end_d = data[-1]["date"] if data else ""

            summary = (
                f"Analyzed daily {crop} arrivals for {period_str} ({start_d} to {end_d}). "
                f"Total arrival volume reached {tot_vol:,.1f} Quintals with an average daily inflow of {avg_vol:,.1f} Quintals."
            )
            rec = "Synchronize procurement yard schedules and warehouse unloading gates with 7-day moving average arrival peaks."

        return data, viz_spec, summary, rec
