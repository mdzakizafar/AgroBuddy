import json
import re
import time
from typing import Any, Dict, List, Optional, Tuple
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
from backend.app.ai.prompts import (
    AGENT_INTENT_PROMPT,
    GROUNDED_SYNTHESIS_SYSTEM_PROMPT,
    GENERAL_QUERY_SYSTEM_PROMPT,
    OUT_OF_SCOPE_SYSTEM_PROMPT
)
from backend.app.ml.predictor import ArrivalsPredictor
from backend.app.services.llm_cache import llm_cache
from backend.app.utils.validation import sanitize_nans


SUPPORTED_CROPS = ["Wheat", "Rice", "Maize", "Cotton", "Sugarcane", "Mustard"]

CROP_ALIASES = {
    "corn": "Maize",
    "paddy": "Rice",
    "chawal": "Rice",
    "gehun": "Wheat",
    "sarson": "Mustard",
    "kapas": "Cotton",
    "ganna": "Sugarcane"
}

OUT_OF_SCOPE_KEYWORDS = [
    "python", "javascript", "java", "c++", "code", "programming", "react", "html", "css",
    "movie", "film", "actor", "actress", "song", "music", "game", "football", "fifa",
    "world cup", "cricket match", "celebrity", "crypto", "bitcoin", "stock market",
    "tesla", "apple stock", "recipe", "cooking", "medical", "doctor", "lawyer", "politics",
    "election", "president", "prime minister", "joke", "poem", "story", "write an essay"
]


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
        self._mandi_lookup = self._load_mandi_lookup()

    def _load_mandi_lookup(self) -> Dict[str, Dict[str, Any]]:
        """Load comprehensive lookup table for Mandis and Districts from dim_mandi."""
        try:
            df = self.conn.execute("SELECT mandi_id, mandi_name, district, state FROM dim_mandi").df()
            lookup = {}
            for _, r in df.iterrows():
                info = {
                    "mandi_id": r["mandi_id"],
                    "mandi_name": r["mandi_name"],
                    "district": r["district"],
                    "state": r["state"]
                }
                # Full name lowercase
                lookup[r["mandi_name"].lower()] = info
                # Short name without "mandi", "grain market", "market", "apmc"
                cleaned = re.sub(r"\b(mandi|grain market|market|apmc)\b", "", r["mandi_name"].lower()).strip()
                if cleaned and len(cleaned) >= 3:
                    lookup[cleaned] = info
                # District
                d_clean = str(r["district"]).lower().strip()
                if d_clean and len(d_clean) >= 3:
                    lookup[d_clean] = info
            return lookup
        except Exception as e:
            logger.warning(f"Could not load mandi lookup table: {str(e)}")
            return {}

    def process_query(self, request: AgentQueryRequest) -> AgentQueryResponse:
        start_time = time.time()
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
                cached_obj = AgentQueryResponse(**cached_val)
                cached_obj.execution_time_ms = round((time.time() - start_time) * 1000, 1)
                return cached_obj
            except Exception as ce:
                logger.warning(f"Error parsing cached agent query response: {str(ce)}")

        # 2. Parse intent & extract structured query plan
        intent = self._extract_intent(query_text)

        # 3. Resolve entities (Mandi name, crops, dates, limits)
        intent = self._resolve_entities(intent, query_text)

        # 4. Execute capability and retrieve ground-truth facts
        data, viz_spec, summary, recommendation = self._execute_query_plan(intent, query_text)

        # 5. Grounded synthesis via LLM if data is present and API key is configured
        if self.api_key and data and intent.intent_type not in ["out_of_scope", "general_query"]:
            grounded_summary, grounded_rec = self._synthesize_grounded_response(
                query=query_text,
                intent=intent,
                data=data,
                default_summary=summary,
                default_rec=recommendation
            )
            if grounded_summary:
                summary = grounded_summary
            if grounded_rec:
                recommendation = grounded_rec

        execution_ms = round((time.time() - start_time) * 1000, 1)

        response_obj = AgentQueryResponse(
            query=query_text,
            intent=intent,
            data=data,
            visualization=viz_spec,
            summary=summary,
            recommendation=recommendation,
            is_grounded=True,
            data_points_count=len(data),
            execution_time_ms=execution_ms
        )

        # 6. Save in LLM Cache
        try:
            llm_cache.set(cache_key, response_obj.model_dump())
        except Exception as e:
            logger.warning(f"Could not cache agent response: {str(e)}")

        return response_obj

    def _resolve_entities(self, intent: AgentIntent, query_text: str) -> AgentIntent:
        """Extract and ground entity references against database dimension tables."""
        q_lower = query_text.lower()

        # Check crops
        found_crops = []
        for c in SUPPORTED_CROPS:
            if re.search(rf"\b{re.escape(c.lower())}\b", q_lower):
                found_crops.append(c)
        for alias, canon in CROP_ALIASES.items():
            if re.search(rf"\b{re.escape(alias)}\b", q_lower) and canon not in found_crops:
                found_crops.append(canon)

        if found_crops:
            intent.crops = found_crops
            if not intent.crop:
                intent.crop = found_crops[0]

        # Check Mandis / Districts
        if not intent.mandi_id:
            for name, info in self._mandi_lookup.items():
                if re.search(rf"\b{re.escape(name)}\b", q_lower):
                    intent.mandi_id = info["mandi_id"]
                    intent.mandi_name = info["mandi_name"]
                    intent.district = info["district"]
                    intent.state = info["state"]
                    break

        # Check numeric limits (e.g. "top 5", "5 mandis", "3 crops")
        limit_match = re.search(r"\b(?:top|bottom|first|worst|highest|lowest)?\s*(\d+)\s*(?:mandis?|crops?|sensors?|routes?|markets?|items?)\b", q_lower)
        if limit_match:
            try:
                intent.limit = int(limit_match.group(1))
            except Exception:
                pass
        elif re.search(r"\bwhich\s*(\d+)\s*mandis\b", q_lower):
            m = re.search(r"\bwhich\s*(\d+)\s*mandis\b", q_lower)
            intent.limit = int(m.group(1))

        # Check time horizon / days
        day_match = re.search(r"\b(\d+)\s*days?\b", q_lower)
        if day_match:
            intent.days = int(day_match.group(1))
        elif "2 weeks" in q_lower or "two weeks" in q_lower:
            intent.days = 14
        elif "month" in q_lower or "30 day" in q_lower:
            intent.days = 30
        elif "week" in q_lower or "7 day" in q_lower:
            intent.days = 7

        return intent

    def _extract_intent(self, query_text: str) -> AgentIntent:
        # 1. Try LLM parser if API key is present
        if self.api_key:
            try:
                from groq import Groq
                client = Groq(api_key=self.api_key)
                candidate_models = list(dict.fromkeys([self.model, "llama-3.1-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192", "mixtral-8x7b-32768"]))
                
                completion = None
                for m_name in candidate_models:
                    try:
                        completion = client.chat.completions.create(
                            model=m_name,
                            messages=[
                                {"role": "system", "content": AGENT_INTENT_PROMPT},
                                {"role": "user", "content": f"User question: {query_text}"}
                            ],
                            temperature=0.0,
                            response_format={"type": "json_object"}
                        )
                        if completion:
                            break
                    except Exception:
                        continue

                if completion:
                    res = json.loads(completion.choices[0].message.content)
                    intent_type = res.get("intent_type", "")
                    valid_intents = [
                        "out_of_scope", "general_query", "mandi_profile", "trend_comparison",
                        "multi_crop_daily_comparison", "top_mandis_by_arrivals", "crop_below_msp_ranking",
                        "price_vs_msp_timeseries", "mandi_largest_msp_gap", "mandi_supply_glut_divergence",
                        "most_pressured_crop_insight", "farmers_vs_arrivals_correlation", "crop_arrival_volatility",
                        "worst_logistics_mandis", "transit_time_trend", "bottleneck_routes",
                        "distance_vs_transit_time_scatter", "heatwave_sensors", "weather_daily_trends",
                        "highest_operational_risk_mandis", "multifactor_risk_divergence",
                        "board_priority_intervention", "forecast_arrivals"
                    ]
                    if intent_type in valid_intents:
                        return AgentIntent(
                            intent_type=intent_type,
                            crop=res.get("crop"),
                            crops=res.get("crops", []),
                            mandi_name=res.get("mandi_name"),
                            mandi_id=res.get("mandi_id"),
                            district=res.get("district"),
                            state=res.get("state"),
                            limit=res.get("limit"),
                            days=res.get("days"),
                            metrics=res.get("metrics", []),
                            group_by=res.get("group_by"),
                            date_range=res.get("date_range"),
                            visualization_suggestion=res.get("visualization_suggestion")
                        )
            except Exception as e:
                logger.warning(f"Groq intent extraction fallback triggered: {str(e)}")

        # 2. Generalized Heuristic & Pattern Intent Extractor
        return self._extract_intent_fallback(query_text)

    def _extract_intent_fallback(self, query_text: str) -> AgentIntent:
        q_lower = query_text.lower().strip()

        # 1. Noise / Gibberish Check (e.g. "6,33467,olij,oooo", "asdfghjkl", "123456")
        clean_alpha = re.sub(r"[^a-zA-Z\s]", " ", query_text).strip()
        words = clean_alpha.split()
        alpha_len = sum(len(w) for w in words)
        
        has_repeated_chars = bool(re.search(r"(.)\1{3,}", q_lower))
        is_gibberish = (
            len(query_text) > 0 and (
                alpha_len < 3
                or has_repeated_chars
                or (len(words) == 0)
                or (len(words) == 1 and len(words[0]) > 14 and not any(name in q_lower for name in self._mandi_lookup.keys()))
            )
        )
        if is_gibberish:
            return AgentIntent(intent_type="out_of_scope", visualization_suggestion=None)

        # 2. Out-of-scope keywords check
        for kw in OUT_OF_SCOPE_KEYWORDS:
            if re.search(rf"\b{re.escape(kw)}\b", q_lower):
                if not any(ag in q_lower for ag in ["mandi", "crop", "arrival", "price", "msp", "wheat", "rice", "maize", "cotton", "sugarcane", "mustard", "transit", "delay", "weather", "rainfall"]):
                    return AgentIntent(intent_type="out_of_scope", visualization_suggestion=None)

        # Extract Crops & Mandis
        found_crops = [c for c in SUPPORTED_CROPS if re.search(rf"\b{re.escape(c.lower())}\b", q_lower)]
        for alias, canon in CROP_ALIASES.items():
            if re.search(rf"\b{re.escape(alias)}\b", q_lower) and canon not in found_crops:
                found_crops.append(canon)
        primary_crop = found_crops[0] if found_crops else None

        # ==========================================
        # 3. SEMANTIC PATTERN MATCHING ACROSS 19 CAPABILITIES
        # ==========================================

        # Q20: Executive Board Priority Intervention
        if any(w in q_lower for w in ["priority", "prioritize", "intervention", "agriculture board", "urgent intervention", "action plan"]):
            return AgentIntent(intent_type="board_priority_intervention", visualization_suggestion="bar")

        # Q18: Multi-factor Risk Scatter (price, unstable arrivals, logistics delays)
        if re.search(r"(multi.*factor|unstable.*delay|price.*arrival.*delay|price pressure.*unstable|compound risk|risk.*compare|operational risk.*compare|compare.*logistics risk)", q_lower):
            return AgentIntent(intent_type="multifactor_risk_divergence", visualization_suggestion="scatter")

        # Q17: Highest Operational Risk Mandis
        if re.search(r"(highest.*operational risk|highest.*risk|most vulnerable|vulnerable mandis|critical risk mandis|operational risk|top.*risky mandis|risky mandis)", q_lower):
            return AgentIntent(intent_type="highest_operational_risk_mandis", visualization_suggestion="bar")

        # Q16: Weather Daily Trends (Dual-axis temp & rain)
        if re.search(r"(temperature and rainfall|rainfall and temperature|temperature.*rainfall.*trend|weather.*trend|daily.*weather|temp.*rain)", q_lower):
            return AgentIntent(intent_type="weather_daily_trends", visualization_suggestion="line")

        # Q15: Heatwave Sensors Detection
        if re.search(r"(heatwave|sensors?.*heat|heat.*sensors?|40\s*°?\s*c|extreme temp|sensors?.*recorded.*heatwave)", q_lower):
            return AgentIntent(intent_type="heatwave_sensors", visualization_suggestion="bar")

        # Q14: Distance vs Transit Time Scatter
        if re.search(r"(distance.*affect.*(transit|time)|distance.*vs.*transit|distance.*transit.*time|distance.*time|relationship between distance|mileage.*transit)", q_lower):
            return AgentIntent(intent_type="distance_vs_transit_time_scatter", visualization_suggestion="scatter")

        # Q13: Bottleneck Routes Analysis
        if re.search(r"(bottleneck|routes?.*delay|corridor.*delay|slow.*routes?|routes?.*exceeding|routes?.*taking.*longer|severe bottlenecks)", q_lower):
            return AgentIntent(intent_type="bottleneck_routes", visualization_suggestion="bar")

        # Q12: Transit Time Trend (Actual vs Expected SLA)
        if re.search(r"(average transit time trend|transit time trend|transit time.*(over|last|by)|actual versus expected|actual.*expected.*transit|freight.*delay.*trend|delivery.*sla.*trend)", q_lower):
            return AgentIntent(intent_type="transit_time_trend", visualization_suggestion="line")

        # Q11: Worst Logistics & On-Time Performance Mandis
        if re.search(r"(worst.*(logistics|transit|delivery|transport|delay)|highest.*(logistics|transit|delivery|transport|delay)|most late shipments|on-time delivery)", q_lower):
            return AgentIntent(intent_type="worst_logistics_mandis", visualization_suggestion="bar")

        # Q10: Crop Arrival Volatility Analysis
        if re.search(r"(most volatile|volatility|unstable arrivals|fluctuations|arrival instability|standard deviation.*arrival|coefficient of variation)", q_lower):
            return AgentIntent(intent_type="crop_arrival_volatility", visualization_suggestion="bar")

        # Q9: Farmers Served vs Arrival Quantity Correlation
        if re.search(r"(registered farmers|farmers.*correlate|farmers.*arrival|farmer footfall|farmers.*quantity|farmers.*quintals)", q_lower):
            return AgentIntent(intent_type="farmers_vs_arrivals_correlation", visualization_suggestion="scatter")

        # Q8: Most Pressured Crop Insight
        if re.search(r"(most.*(severe )?market pressure|most price pressure|crop.*under.*price pressure|most pressured crop|most distressed crop|price crash)", q_lower):
            return AgentIntent(intent_type="most_pressured_crop_insight", visualization_suggestion="bar")

        # Q7: High Arrivals but Below MSP Divergence (Supply Glut)
        if re.search(r"(supply glut|glut distress|rising arrivals.*falling prices|high arrivals.*below msp|volume surge.*price depression|diverging supply)", q_lower):
            return AgentIntent(intent_type="mandi_supply_glut_divergence", crop=primary_crop, crops=found_crops, visualization_suggestion="line")

        # Q6: Mandis with Largest MSP Gap
        if re.search(r"(largest.*gap.*msp|largest msp gap|biggest.*msp gap|widest.*price gap|largest price gap|maximum msp deficit|highest msp gap)", q_lower):
            return AgentIntent(intent_type="mandi_largest_msp_gap", crop=primary_crop, crops=found_crops, visualization_suggestion="bar")

        # Q5: Price vs MSP Over Time (Time series)
        if re.search(r"(modal price versus msp|price.*vs.*msp|price.*versus.*msp|modal price.*msp.*time|historical msp compliance)", q_lower):
            return AgentIntent(intent_type="price_vs_msp_timeseries", crop=primary_crop or "Wheat", visualization_suggestion="line")

        # Q4: Crops with Highest % Below MSP
        if re.search(r"(highest percentage.*below msp|percentage.*sales below msp|crops.*highest.*below msp|crops.*below msp|distress sales)", q_lower):
            return AgentIntent(intent_type="crop_below_msp_ranking", visualization_suggestion="bar")

        # Q3: Top Mandis by Arrivals Ranking
        if re.search(r"(highest.*(crop )?arrivals|top.*mandis.*arrivals|mandis.*highest.*arrivals|mandis received.*highest|most arrivals|highest volume mandis)", q_lower):
            return AgentIntent(intent_type="top_mandis_by_arrivals", crop=primary_crop, crops=found_crops, visualization_suggestion="bar")

        # Q2: Multi-Crop Daily Arrival Comparison
        if (re.search(r"(compare.*arrivals|compare.*wheat|arrivals over the last)", q_lower) and len(found_crops) >= 2) or (
            "compare" in q_lower and any(c.lower() in q_lower for c in SUPPORTED_CROPS) and not any(w in q_lower for w in ["distance", "farmers", "routes", "risk", "gap", "below msp"])
        ):
            crops_to_compare = found_crops if len(found_crops) >= 2 else ["Wheat", "Rice", "Maize"]
            return AgentIntent(intent_type="multi_crop_daily_comparison", crops=crops_to_compare, visualization_suggestion="line")

        # Q1: Basic Daily Arrival Trend (Single crop/mandi)
        if re.search(r"(daily arrival trend|arrival trend|arrivals for the last|daily arrival|daily.*arrival|arrivals over time|trend of .* in .* mandi)", q_lower):
            return AgentIntent(
                intent_type="daily_arrival_trend",
                crop=primary_crop or "Wheat",
                crops=found_crops,
                visualization_suggestion="line"
            )

        # Mandi Profile Overview
        if any(w in q_lower for w in ["about", "profile", "overview", "status of", "tell me about", "details of"]):
            for name, info in self._mandi_lookup.items():
                if re.search(rf"\b{re.escape(name)}\b", q_lower):
                    return AgentIntent(
                        intent_type="mandi_profile",
                        crop=primary_crop,
                        crops=found_crops,
                        mandi_id=info["mandi_id"],
                        mandi_name=info["mandi_name"],
                        district=info["district"],
                        state=info["state"],
                        visualization_suggestion="bar"
                    )

        # ML Forecasting
        if re.search(r"\b(forecast|predict|prediction|future|project|projections)\b", q_lower):
            return AgentIntent(intent_type="forecast_arrivals", crop=primary_crop or "Wheat", crops=found_crops, visualization_suggestion="line")

        # Conversational / Greetings / Definitions
        is_greeting = bool(re.search(r"\b(hello|hi|hey|greetings|who are you|what can you do|help|agrobuddy|features|capabilities)\b", q_lower))
        is_definition = bool(re.search(r"\b(what is|how is|how do you|formula|explain|meaning of)\b", q_lower)) and not bool(re.search(r"\b(which mandi|show|list|plot|compare|forecast|predict)\b", q_lower))
        if is_greeting or is_definition:
            return AgentIntent(intent_type="general_query", crop=primary_crop, crops=found_crops, visualization_suggestion=None)

        # Default Trend Comparison (if asking for arrivals / volume / price of a crop or mandi)
        has_trend_intent = any(w in q_lower for w in ["arrival", "volume", "trend", "daily", "inflow", "timeseries", "plot", "show", "chart"])
        has_mandi_or_crop = bool(primary_crop) or any(name in q_lower for name in self._mandi_lookup.keys())

        if has_trend_intent or has_mandi_or_crop:
            return AgentIntent(
                intent_type="daily_arrival_trend",
                crop=primary_crop or "Wheat",
                visualization_suggestion="line"
            )

        # Out-of-scope fallback for unrecognized queries
        return AgentIntent(intent_type="out_of_scope", visualization_suggestion=None)

    def _execute_query_plan(self, intent: AgentIntent, raw_query: str) -> Tuple[List[Dict[str, Any]], Optional[VisualizationSpec], str, str]:
        crop = intent.crop or "Wheat"
        limit = intent.limit or 5

        # ==========================================
        # 0. OUT OF SCOPE GUARDRAIL
        # ==========================================
        if intent.intent_type == "out_of_scope":
            clean_text = re.sub(r"[^a-zA-Z\s]", " ", raw_query).strip()
            if len(clean_text) < 3 or re.search(r"(.)\1{3,}", raw_query.lower()) or not any(c.isalpha() for c in raw_query):
                summary = (
                    f"I could not understand your query or find relevant agricultural parameters in '{raw_query}'. "
                    "AgroBuddy AI is specialized strictly in Indian agricultural supply chains, Mandi market operations, "
                    "price-vs-MSP tracking, logistics transit delays, weather risk telemetry, and arrival volume forecasts."
                )
            else:
                summary = (
                    "AgroBuddy AI is a dedicated Indian agricultural intelligence decision system. "
                    "I specialize in analyzing 57 Mandis across 7 States, modal prices against Government MSP, "
                    "daily arrival trends, logistics transit bottlenecks, environmental weather telemetry, and 7-day ML arrival forecasts. "
                    "Your question appears to be outside this agricultural domain."
                )
            rec = "Try asking: 'Which Mandis had wheat prices below MSP?', 'Show wheat arrivals for the last 30 days.', or 'Tell me about Karnal mandi'."
            return [], None, summary, rec

        # ==========================================
        # 1. GENERAL CONVERSATIONAL / FORMULA QUERY
        # ==========================================
        elif intent.intent_type == "general_query":
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
            else:
                summary = (
                    "Welcome to AgroBuddy Intelligence! I am your AI decision assistant for Mandi-to-Market agricultural analytics. "
                    "I monitor 57 Mandis across 7 States, analyzing daily crop arrivals, price-vs-MSP pressures, logistics transit bottlenecks, "
                    "weather sensor extremes, and 7-day ML arrival forecasts."
                )
                rec = "You can ask: 'Which Mandis had wheat prices below MSP?', 'Compare Wheat, Rice and Maize arrivals over the last 30 days.', or 'Which mandi should the Agriculture Board prioritize for intervention?'"
            return [], None, summary, rec

        # ==========================================
        # Q2: MULTI-CROP DAILY ARRIVAL COMPARISON (Multi-Line Chart)
        # ==========================================
        elif intent.intent_type == "multi_crop_daily_comparison":
            crops = intent.crops if intent.crops and len(intent.crops) >= 2 else ["Wheat", "Rice", "Maize"]
            days = intent.days or 30

            placeholders = ", ".join(["?"] * len(crops))
            query = f"""
                WITH daily_crops AS (
                    SELECT 
                        date,
                        crop_name,
                        SUM(arrival_qtl) as arrival_qtl
                    FROM fact_arrivals
                    WHERE crop_name IN ({placeholders})
                    GROUP BY date, crop_name
                ),
                latest_dates AS (
                    SELECT DISTINCT date FROM daily_crops ORDER BY date DESC LIMIT {days}
                )
                SELECT 
                    d.date,
                    {', '.join([f"COALESCE(MAX(CASE WHEN c.crop_name = '{cr}' THEN ROUND(c.arrival_qtl, 1) END), 0.0) AS {cr.lower()}_arrivals_qtl" for cr in crops])}
                FROM latest_dates d
                LEFT JOIN daily_crops c ON d.date = c.date
                GROUP BY d.date
                ORDER BY d.date ASC
            """
            df = self.conn.execute(query, crops).df()
            data = sanitize_nans(df.to_dict(orient="records"))

            palette = ["#5B7B10", "#D97706", "#2563EB", "#7C3AED", "#DC2626", "#059669"]
            series = [
                SeriesSpec(
                    field=f"{cr.lower()}_arrivals_qtl",
                    label=f"{cr} Arrivals (Qtl)",
                    color=palette[idx % len(palette)]
                )
                for idx, cr in enumerate(crops)
            ]

            crops_str = ", ".join(crops)
            viz_spec = VisualizationSpec(
                chart_type="line",
                title=f"Multi-Crop Daily Arrival Comparison: {crops_str} (Last {days} Days)",
                x_axis=AxisSpec(field="date", label="Date"),
                series=series
            )

            tot_summary = []
            for cr in crops:
                field = f"{cr.lower()}_arrivals_qtl"
                tot = sum(d.get(field, 0.0) for d in data)
                tot_summary.append(f"{cr}: {tot:,.1f} Qtl")
            tot_str = ", ".join(tot_summary)

            summary = (
                f"Comparative arrival trajectory across {len(crops)} key commodities ({crops_str}) over the last {days} days. "
                f"Aggregate throughput recorded: {tot_str}."
            )
            rec = "Adjust seasonal warehouse silo allocation and weighbridge staffing to accommodate high-volume arrival surges."
            return data, viz_spec, summary, rec

        # ==========================================
        # Q3: TOP MANDIS BY CROP ARRIVALS (Horizontal Bar)
        # ==========================================
        elif intent.intent_type == "top_mandis_by_arrivals":
            limit = intent.limit or 5
            crop_filter = intent.crop if intent.crop and intent.crop in SUPPORTED_CROPS else None

            query = f"""
                SELECT 
                    m.mandi_name,
                    m.district,
                    m.state,
                    ROUND(SUM(a.arrival_qtl), 1) as total_arrivals_qtl,
                    SUM(a.farmer_count) as total_farmers,
                    COUNT(DISTINCT a.date) as active_days
                FROM fact_arrivals a
                JOIN dim_mandi m ON a.mandi_id = m.mandi_id
                WHERE (? IS NULL OR a.crop_name = ?)
                GROUP BY m.mandi_name, m.district, m.state
                ORDER BY total_arrivals_qtl DESC
                LIMIT {limit}
            """
            df = self.conn.execute(query, [crop_filter, crop_filter]).df()
            data = sanitize_nans(df.to_dict(orient="records"))

            crop_label = f" ({crop_filter})" if crop_filter else " (All Commodities)"
            viz_spec = VisualizationSpec(
                chart_type="bar",
                title=f"Top {limit} Mandis by Total Crop Arrivals{crop_label}",
                x_axis=AxisSpec(field="mandi_name", label="Mandi"),
                horizontal=True,
                series=[
                    SeriesSpec(field="total_arrivals_qtl", label="Total Arrivals (Qtl)", color="#5B7B10")
                ]
            )
            top_m = data[0]["mandi_name"] if data else "N/A"
            top_vol = data[0]["total_arrivals_qtl"] if data else 0.0
            summary = (
                f"Ranked top {len(data)} market centers by aggregate volume{crop_label}. Leading market is "
                f"{top_m} with {top_vol:,.1f} Quintals handled across monitored operational dates."
            )
            rec = "Deploy fast-track electronic weighbridges and expand intake holding bays at these top-tier arrival hubs."
            return data, viz_spec, summary, rec

        # ==========================================
        # Q4: CROPS WITH HIGHEST % OF SALES BELOW MSP (Horizontal Bar)
        # ==========================================
        elif intent.intent_type == "crop_below_msp_ranking":
            query = """
                SELECT 
                    p.crop_name,
                    ROUND((SUM(CASE WHEN p.modal_price < p.msp THEN 1 ELSE 0 END)::DOUBLE / COUNT(*)) * 100.0, 1) as below_msp_rate,
                    ROUND(AVG(p.modal_price), 1) as avg_modal_price,
                    ROUND(AVG(p.msp), 1) as avg_msp,
                    ROUND(AVG(p.msp - p.modal_price), 1) as avg_msp_gap,
                    COUNT(*) as transaction_count
                FROM fact_prices p
                GROUP BY p.crop_name
                ORDER BY below_msp_rate DESC
            """
            df = self.conn.execute(query).df()
            data = sanitize_nans(df.to_dict(orient="records"))

            viz_spec = VisualizationSpec(
                chart_type="bar",
                title="Crops Ranked by Percentage of Sales Below MSP",
                x_axis=AxisSpec(field="crop_name", label="Crop"),
                horizontal=True,
                series=[
                    SeriesSpec(field="below_msp_rate", label="Below MSP Rate (%)", color="#DC2626"),
                    SeriesSpec(field="avg_modal_price", label="Avg Modal Price (₹/Qtl)", color="#5B7B10"),
                    SeriesSpec(field="avg_msp", label="Statutory MSP (₹/Qtl)", color="#D97706")
                ]
            )
            top_c = data[0]["crop_name"] if data else "N/A"
            top_r = data[0]["below_msp_rate"] if data else 0.0
            summary = (
                f"Evaluated statutory MSP defense across all commodities. {top_c} faces the highest distress rate with "
                f"{top_r:.1f}% of recorded market transactions settling below Government MSP."
            )
            rec = f"Issue immediate market intervention mandate and activate decentralized procurement centers for {top_c}."
            return data, viz_spec, summary, rec

        # ==========================================
        # Q5: MODAL PRICE VERSUS MSP OVER TIME (Line Chart)
        # ==========================================
        elif intent.intent_type == "price_vs_msp_timeseries":
            query = """
                SELECT 
                    date,
                    ROUND(AVG(modal_price), 1) as modal_price,
                    ROUND(AVG(msp), 1) as msp,
                    ROUND(AVG(msp - modal_price), 1) as msp_gap
                FROM fact_prices
                WHERE LOWER(crop_name) = LOWER(?)
                GROUP BY date
                ORDER BY date ASC
            """
            df = self.conn.execute(query, [crop]).df()
            data = sanitize_nans(df.to_dict(orient="records"))

            viz_spec = VisualizationSpec(
                chart_type="line",
                title=f"{crop} Modal Price vs Government MSP Trajectory",
                x_axis=AxisSpec(field="date", label="Date"),
                series=[
                    SeriesSpec(field="modal_price", label=f"{crop} Modal Price (₹/Qtl)", color="#5B7B10"),
                    SeriesSpec(field="msp", label="Statutory MSP Floor (₹/Qtl)", color="#D97706")
                ]
            )
            msp_val = data[0]["msp"] if data else 0.0
            below_days = sum(1 for d in data if (d.get("modal_price") or 0.0) < (d.get("msp") or 0.0))
            summary = (
                f"Historical daily price tracking for {crop} against the statutory MSP of ₹{msp_val:,.0f}/Qtl. "
                f"Prices traded below the statutory floor price on {below_days} of {len(data)} recorded market dates."
            )
            rec = "Enforce price deficiency payments (Bhavantar Bhugtan) during periods where modal prices breach the MSP floor."
            return data, viz_spec, summary, rec

        # ==========================================
        # Q6: MANDIS WITH LARGEST MSP GAP (Horizontal Bar)
        # ==========================================
        elif intent.intent_type == "mandi_largest_msp_gap":
            limit = intent.limit or 10
            query = f"""
                SELECT 
                    m.mandi_name,
                    m.district,
                    m.state,
                    ROUND(AVG(p.msp - p.modal_price), 1) as avg_msp_gap,
                    ROUND(AVG(p.modal_price), 1) as avg_modal_price,
                    ROUND(AVG(p.msp), 1) as avg_msp,
                    ROUND((SUM(CASE WHEN p.modal_price < p.msp THEN 1 ELSE 0 END)::DOUBLE / COUNT(*)) * 100.0, 1) as below_msp_rate
                FROM fact_prices p
                JOIN dim_mandi m ON p.mandi_id = m.mandi_id
                WHERE p.modal_price < p.msp
                GROUP BY m.mandi_name, m.district, m.state
                ORDER BY avg_msp_gap DESC
                LIMIT {limit}
            """
            df = self.conn.execute(query).df()
            data = sanitize_nans(df.to_dict(orient="records"))

            viz_spec = VisualizationSpec(
                chart_type="bar",
                title=f"Top {limit} Mandis with Largest MSP Deficit Gap",
                x_axis=AxisSpec(field="mandi_name", label="Mandi"),
                horizontal=True,
                series=[
                    SeriesSpec(field="avg_msp_gap", label="Avg MSP Gap (₹/Qtl)", color="#DC2626"),
                    SeriesSpec(field="below_msp_rate", label="Below MSP Rate (%)", color="#D97706")
                ]
            )
            top_m = data[0]["mandi_name"] if data else "N/A"
            top_gap = data[0]["avg_msp_gap"] if data else 0.0
            summary = (
                f"Identified top {len(data)} Mandis with severe price discounts below Government MSP. "
                f"Largest price deficit recorded at {top_m} with an average gap of ₹{top_gap:,.1f}/Qtl below statutory support."
            )
            rec = "Direct FCI state directors to open emergency direct purchase kiosks at the identified high-gap mandis."
            return data, viz_spec, summary, rec

        # ==========================================
        # Q7: MANDIS WITH HIGH ARRIVALS BUT PRICES BELOW MSP (Scatter Plot)
        # ==========================================
        elif intent.intent_type == "mandi_supply_glut_divergence":
            query = """
                WITH arr AS (
                    SELECT mandi_id, SUM(arrival_qtl) as arrival_qtl
                    FROM fact_arrivals
                    WHERE (? IS NULL OR crop_name = ?)
                    GROUP BY mandi_id
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
                    WHERE (? IS NULL OR p.crop_name = ?)
                    GROUP BY p.mandi_id, m.mandi_name, m.district
                    HAVING below_msp_rate > 0
                )
                SELECT 
                    prc.mandi_name,
                    prc.district,
                    ROUND(arr.arrival_qtl, 1) as total_arrivals_qtl,
                    prc.below_msp_rate,
                    prc.avg_modal_price,
                    prc.avg_msp_gap
                FROM prc
                JOIN arr ON prc.mandi_id = arr.mandi_id
                ORDER BY arr.arrival_qtl DESC
                LIMIT 20
            """
            crop_param = intent.crop if intent.crop and intent.crop in SUPPORTED_CROPS else None
            df = self.conn.execute(query, [crop_param, crop_param, crop_param, crop_param]).df()
            data = sanitize_nans(df.to_dict(orient="records"))

            viz_spec = VisualizationSpec(
                chart_type="scatter",
                title="Supply Glut Divergence: High Arrivals (X) vs Below-MSP Rate (Y)",
                x_axis=AxisSpec(field="total_arrivals_qtl", label="Total Arrivals (Qtl)"),
                y_axis=AxisSpec(field="below_msp_rate", label="Below MSP Rate (%)"),
                series=[
                    SeriesSpec(field="below_msp_rate", label="Distress Rate (%)", color="#DC2626")
                ],
                options={"xKey": "total_arrivals_qtl", "yKey": "below_msp_rate", "xName": "Arrival Volume (Qtl)", "yName": "Below MSP Rate (%)"}
            )
            top_m = data[0]["mandi_name"] if data else "N/A"
            top_arr = data[0]["total_arrivals_qtl"] if data else 0.0
            top_rate = data[0]["below_msp_rate"] if data else 0.0
            summary = (
                f"Identified {len(data)} Mandis demonstrating supply glut divergence — heavy arrival volume accompanied by "
                f"depressed market prices below MSP. Highest divergence pressure detected at {top_m} with {top_arr:,.1f} Qtl "
                f"arrivals and {top_rate:.1f}% below-MSP sales."
            )
            rec = "Open emergency procurement intake channels and warehouse storage buffers at these glut centers to prevent distress liquidation."
            return data, viz_spec, summary, rec

        # ==========================================
        # Q8: MOST PRESSURED CROP INSIGHT (Diagnostic Bar Chart)
        # ==========================================
        elif intent.intent_type == "most_pressured_crop_insight":
            query = """
                SELECT 
                    p.crop_name,
                    ROUND((SUM(CASE WHEN p.modal_price < p.msp THEN 1 ELSE 0 END)::DOUBLE / COUNT(*)) * 100.0, 1) as below_msp_rate,
                    ROUND(AVG(p.msp - p.modal_price), 1) as avg_msp_gap,
                    ROUND(AVG(p.modal_price), 1) as avg_modal_price,
                    ROUND(AVG(p.msp), 1) as avg_msp
                FROM fact_prices p
                GROUP BY p.crop_name
                ORDER BY below_msp_rate DESC, avg_msp_gap DESC
            """
            df = self.conn.execute(query).df()
            data = sanitize_nans(df.to_dict(orient="records"))

            top_crop_item = data[0] if data else {}
            distressed_crop = top_crop_item.get("crop_name", "Wheat")
            distressed_rate = top_crop_item.get("below_msp_rate", 0.0)
            distressed_gap = top_crop_item.get("avg_msp_gap", 0.0)

            viz_spec = VisualizationSpec(
                chart_type="bar",
                title=f"Commodity Price Pressure Diagnostics: {distressed_crop} Most Distressed",
                x_axis=AxisSpec(field="crop_name", label="Crop"),
                horizontal=True,
                series=[
                    SeriesSpec(field="below_msp_rate", label="Below MSP Rate (%)", color="#DC2626"),
                    SeriesSpec(field="avg_msp_gap", label="Avg MSP Gap (₹/Qtl)", color="#D97706")
                ]
            )

            summary = (
                f"Executive Diagnostic: {distressed_crop} is currently under the most severe price pressure across monitored Indian markets. "
                f"It registers the highest distress rate at {distressed_rate:.1f}% of transactions below Government MSP, with an average "
                f"price deficit of ₹{distressed_gap:,.1f}/Qtl relative to statutory support levels."
            )
            rec = f"Recommend immediate deployment of Price Support Scheme (PSS) funds and mandatory minimum bidding thresholds for {distressed_crop} auctions."
            return data, viz_spec, summary, rec

        # ==========================================
        # Q9: FARMERS SERVED VS ARRIVAL QUANTITY (Scatter Plot)
        # ==========================================
        elif intent.intent_type == "farmers_vs_arrivals_correlation":
            query = """
                SELECT 
                    m.mandi_name,
                    m.district,
                    SUM(a.farmer_count) as total_farmers,
                    ROUND(SUM(a.arrival_qtl), 1) as total_arrivals_qtl,
                    ROUND(SUM(a.arrival_qtl) / NULLIF(SUM(a.farmer_count), 0), 2) as avg_qtl_per_farmer
                FROM fact_arrivals a
                JOIN dim_mandi m ON a.mandi_id = m.mandi_id
                GROUP BY m.mandi_name, m.district
                ORDER BY total_farmers DESC
                LIMIT 35
            """
            df = self.conn.execute(query).df()
            data = sanitize_nans(df.to_dict(orient="records"))

            viz_spec = VisualizationSpec(
                chart_type="scatter",
                title="Correlation Analysis: Farmers Served (X) vs Arrival Quantity (Y)",
                x_axis=AxisSpec(field="total_farmers", label="Farmers Served"),
                y_axis=AxisSpec(field="total_arrivals_qtl", label="Total Arrivals (Qtl)"),
                series=[
                    SeriesSpec(field="total_arrivals_qtl", label="Arrival Volume (Qtl)", color="#5B7B10")
                ],
                options={"xKey": "total_farmers", "yKey": "total_arrivals_qtl", "xName": "Farmers Served", "yName": "Total Arrivals (Qtl)"}
            )
            tot_farmers = sum(d.get("total_farmers", 0) for d in data)
            tot_vol = sum(d.get("total_arrivals_qtl", 0.0) for d in data)
            avg_per = tot_vol / tot_farmers if tot_farmers else 0.0
            summary = (
                f"Evaluated relationship between farmer footfall and crop volume across {len(data)} Mandis. "
                f"Across {tot_farmers:,} total farmer interactions, average throughput is {avg_per:.2f} Quintals per farmer."
            )
            rec = "Designate dedicated express unloading bays at high-footfall Mandis to reduce farmer turnaround times."
            return data, viz_spec, summary, rec

        # ==========================================
        # Q10: CROPS WITH MOST VOLATILE DAILY ARRIVALS (Bar Chart)
        # ==========================================
        elif intent.intent_type == "crop_arrival_volatility":
            query = """
                SELECT 
                    crop_name,
                    ROUND(STDDEV(arrival_qtl), 1) as stddev_arrival_qtl,
                    ROUND(AVG(arrival_qtl), 1) as avg_arrival_qtl,
                    ROUND((STDDEV(arrival_qtl) / NULLIF(AVG(arrival_qtl), 0)) * 100.0, 1) as arrival_volatility_pct,
                    ROUND(SUM(arrival_qtl), 1) as total_arrivals_qtl
                FROM fact_arrivals
                GROUP BY crop_name
                ORDER BY arrival_volatility_pct DESC
            """
            df = self.conn.execute(query).df()
            data = sanitize_nans(df.to_dict(orient="records"))

            top_v_crop = data[0]["crop_name"] if data else "N/A"
            top_cv = data[0]["arrival_volatility_pct"] if data else 0.0

            viz_spec = VisualizationSpec(
                chart_type="bar",
                title="Commodity Daily Arrival Volatility Ranking (Coefficient of Variation %)",
                x_axis=AxisSpec(field="crop_name", label="Crop"),
                series=[
                    SeriesSpec(field="arrival_volatility_pct", label="Arrival Volatility (CV %)", color="#D97706"),
                    SeriesSpec(field="stddev_arrival_qtl", label="Standard Deviation (Qtl)", color="#5B7B10")
                ]
            )

            summary = (
                f"Statistical volatility analysis across monitored commodities: {top_v_crop} displays the highest arrival volatility "
                f"with a Coefficient of Variation (CV) of {top_cv:.1f}%, indicating sharp daily arrival spikes and troughs."
            )
            rec = f"Establish dynamic buffer storage contracts and flexible truck scheduling to absorb daily inflow shocks for {top_v_crop}."
            return data, viz_spec, summary, rec

        # ==========================================
        # Q11: WORST ON-TIME DELIVERY LOGISTICS MANDIS (Horizontal Bar)
        # ==========================================
        elif intent.intent_type == "worst_logistics_mandis":
            limit = intent.limit or 10
            query = f"""
                SELECT 
                    m.mandi_name,
                    m.district,
                    m.state,
                    COUNT(*) as trip_count,
                    ROUND((SUM(t.is_delayed_flag)::DOUBLE / COUNT(*)) * 100.0, 1) as delayed_trip_percentage,
                    ROUND(100.0 - (SUM(t.is_delayed_flag)::DOUBLE / COUNT(*)) * 100.0, 1) as on_time_rate,
                    ROUND(AVG(t.delay_hours), 1) as avg_delay_hours,
                    ROUND(AVG(t.transit_hours), 1) as avg_transit_hours
                FROM fact_transport t
                JOIN dim_mandi m ON t.mandi_id = m.mandi_id
                GROUP BY m.mandi_name, m.district, m.state
                ORDER BY delayed_trip_percentage DESC, avg_delay_hours DESC
                LIMIT {limit}
            """
            df = self.conn.execute(query).df()
            data = sanitize_nans(df.to_dict(orient="records"))

            viz_spec = VisualizationSpec(
                chart_type="bar",
                title=f"Top {limit} Mandis with Worst On-Time Delivery Performance",
                x_axis=AxisSpec(field="mandi_name", label="Mandi"),
                horizontal=True,
                series=[
                    SeriesSpec(field="delayed_trip_percentage", label="Delayed Trip %", color="#DC2626"),
                    SeriesSpec(field="avg_delay_hours", label="Avg Delay (Hours)", color="#D97706")
                ]
            )
            top_m = data[0]["mandi_name"] if data else "N/A"
            top_del = data[0]["delayed_trip_percentage"] if data else 0.0
            top_hrs = data[0]["avg_delay_hours"] if data else 0.0
            summary = (
                f"Logistics SLA evaluation: {top_m} recorded the worst freight reliability with {top_del:.1f}% delayed trips "
                f"and an average delay of {top_hrs:.1f} hours relative to the 40 km/h national benchmark."
            )
            rec = "Enforce pre-dispatch slot booking and reroute outward grain dispatches via non-congested secondary freight corridors."
            return data, viz_spec, summary, rec

        # ==========================================
        # Q12: ACTUAL VS EXPECTED TRANSIT TIME TREND (Line Chart)
        # ==========================================
        elif intent.intent_type == "transit_time_trend":
            query = """
                SELECT 
                    CAST(departure_time AS DATE) as date,
                    ROUND(AVG(transit_hours), 1) as actual_transit_hours,
                    ROUND(AVG(distance_km / 40.0), 1) as expected_transit_hours,
                    ROUND(AVG(delay_hours), 1) as avg_delay_hours,
                    COUNT(*) as trip_count
                FROM fact_transport
                GROUP BY CAST(departure_time AS DATE)
                ORDER BY date ASC
            """
            df = self.conn.execute(query).df()
            data = sanitize_nans(df.to_dict(orient="records"))

            viz_spec = VisualizationSpec(
                chart_type="line",
                title="Freight Logistics: Actual vs Expected Transit Time Over Time",
                x_axis=AxisSpec(field="date", label="Date"),
                series=[
                    SeriesSpec(field="actual_transit_hours", label="Actual Transit Hours", color="#DC2626"),
                    SeriesSpec(field="expected_transit_hours", label="Expected SLA (40 km/h)", color="#5B7B10")
                ]
            )
            avg_act = sum(d["actual_transit_hours"] for d in data) / len(data) if data else 0.0
            avg_exp = sum(d["expected_transit_hours"] for d in data) / len(data) if data else 0.0
            summary = (
                f"Historical timeline tracking freight transit durations: Actual transit averaged {avg_act:.1f} hours versus "
                f"an expected benchmark of {avg_exp:.1f} hours across {len(data)} dispatch dates."
            )
            rec = "Audit transit bottlenecks on dates experiencing delay spikes to address road toll and weighbridge congestion."
            return data, viz_spec, summary, rec

        # ==========================================
        # Q13: BOTTLENECK FREIGHT ROUTES (Horizontal Bar / Table)
        # ==========================================
        elif intent.intent_type == "bottleneck_routes":
            limit = intent.limit or 10
            query = f"""
                SELECT 
                    m.mandi_name || ' → ' || t.destination_warehouse as route_name,
                    COUNT(*) as trip_count,
                    ROUND(AVG(t.distance_km), 1) as avg_distance_km,
                    ROUND(AVG(t.transit_hours), 1) as avg_transit_hours,
                    ROUND(AVG(t.distance_km / 40.0), 1) as avg_expected_hours,
                    ROUND(AVG(t.delay_hours), 1) as avg_delay_hours,
                    ROUND((SUM(t.is_delayed_flag)::DOUBLE / COUNT(*)) * 100.0, 1) as delayed_trip_percentage
                FROM fact_transport t
                JOIN dim_mandi m ON t.mandi_id = m.mandi_id
                GROUP BY m.mandi_name, t.destination_warehouse
                HAVING trip_count >= 2
                ORDER BY avg_delay_hours DESC
                LIMIT {limit}
            """
            df = self.conn.execute(query).df()
            data = sanitize_nans(df.to_dict(orient="records"))

            viz_spec = VisualizationSpec(
                chart_type="bar",
                title=f"Top {limit} Freight Route Bottlenecks by Average Delay Hours",
                x_axis=AxisSpec(field="route_name", label="Corridor Route"),
                horizontal=True,
                series=[
                    SeriesSpec(field="avg_delay_hours", label="Avg Delay (Hours)", color="#DC2626"),
                    SeriesSpec(field="delayed_trip_percentage", label="Delayed Trip %", color="#D97706")
                ]
            )
            top_r = data[0]["route_name"] if data else "N/A"
            top_h = data[0]["avg_delay_hours"] if data else 0.0
            summary = (
                f"Identified {len(data)} high-congestion transport corridors. The most bottlenecked route is {top_r}, "
                f"averaging {top_h:.1f} hours of transit delay beyond SLA expectations."
            )
            rec = "Deploy dynamic GPS tracking and incentivize off-peak nocturnal freight dispatch along critical corridors."
            return data, viz_spec, summary, rec

        # ==========================================
        # Q14: DISTANCE VS TRANSIT TIME SCATTER (Scatter Plot)
        # ==========================================
        elif intent.intent_type == "distance_vs_transit_time_scatter":
            query = """
                SELECT 
                    trip_id,
                    m.mandi_name,
                    ROUND(t.distance_km, 1) as distance_km,
                    ROUND(t.transit_hours, 1) as transit_hours,
                    ROUND(t.distance_km / 40.0, 1) as expected_transit_hours,
                    t.is_delayed_flag
                FROM fact_transport t
                JOIN dim_mandi m ON t.mandi_id = m.mandi_id
                LIMIT 60
            """
            df = self.conn.execute(query).df()
            data = sanitize_nans(df.to_dict(orient="records"))

            viz_spec = VisualizationSpec(
                chart_type="scatter",
                title="Freight Efficiency Correlation: Distance (KM) vs Actual Transit Time (Hours)",
                x_axis=AxisSpec(field="distance_km", label="Distance (KM)"),
                y_axis=AxisSpec(field="transit_hours", label="Actual Transit Hours"),
                series=[
                    SeriesSpec(field="transit_hours", label="Transit Hours", color="#DC2626")
                ],
                options={"xKey": "distance_km", "yKey": "transit_hours", "xName": "Distance (KM)", "yName": "Transit Hours"}
            )
            avg_dist = sum(float(d.get("distance_km") or 0.0) for d in data) / len(data) if data else 0.0
            avg_time = sum(float(d.get("transit_hours") or 0.0) for d in data) / len(data) if data else 0.0
            summary = (
                f"Evaluated transport correlation across {len(data)} freight dispatches: Mean haul distance is {avg_dist:,.1f} KM "
                f"taking an average of {avg_time:.1f} transit hours."
            )
            rec = "Flag trips deviating significantly above the 40 km/h regression slope line for carrier audit."
            return data, viz_spec, summary, rec

        # ==========================================
        # Q15: HEATWAVE SENSORS DETECTION (Horizontal Bar)
        # ==========================================
        elif intent.intent_type == "heatwave_sensors":
            limit = intent.limit or 10
            query = f"""
                SELECT 
                    sensor_id,
                    COUNT(*) as heatwave_reading_count,
                    ROUND(MAX(temperature_c), 1) as max_temperature_c,
                    ROUND(AVG(temperature_c), 1) as avg_temperature_c
                FROM fact_weather
                WHERE is_heatwave_flag = 1 OR temperature_c >= 40.0
                GROUP BY sensor_id
                ORDER BY heatwave_reading_count DESC, max_temperature_c DESC
                LIMIT {limit}
            """
            df = self.conn.execute(query).df()
            data = sanitize_nans(df.to_dict(orient="records"))

            viz_spec = VisualizationSpec(
                chart_type="bar",
                title=f"Top {limit} Environmental Sensors Logging Heatwave Conditions (≥40°C)",
                x_axis=AxisSpec(field="sensor_id", label="Sensor Station"),
                horizontal=True,
                series=[
                    SeriesSpec(field="heatwave_reading_count", label="Heatwave Readings Count", color="#DC2626"),
                    SeriesSpec(field="max_temperature_c", label="Peak Temperature (°C)", color="#D97706")
                ]
            )
            top_s = data[0]["sensor_id"] if data else "N/A"
            top_cnt = data[0]["heatwave_reading_count"] if data else 0
            top_max = data[0]["max_temperature_c"] if data else 0.0
            summary = (
                f"Environmental telemetry sensor audit: Detected {len(data)} stations recording heatwave conditions (≥40°C). "
                f"Most severe thermal exposure detected at station {top_s} ({top_cnt} heatwave readings, peak {top_max}°C)."
            )
            rec = "Issue high-temperature crop aeration advisories and mandate shaded storage for perishables near affected telemetry zones."
            return data, viz_spec, summary, rec

        # ==========================================
        # Q16: WEATHER DAILY TRENDS (Dual-Axis Chart)
        # ==========================================
        elif intent.intent_type == "weather_daily_trends":
            query = """
                SELECT 
                    CAST(timestamp AS DATE) as date,
                    ROUND(AVG(temperature_c), 1) as avg_temperature_c,
                    ROUND(MAX(temperature_c), 1) as max_temperature_c,
                    ROUND(SUM(rainfall_mm), 1) as total_rainfall_mm
                FROM fact_weather
                GROUP BY CAST(timestamp AS DATE)
                ORDER BY date ASC
            """
            df = self.conn.execute(query).df()
            data = sanitize_nans(df.to_dict(orient="records"))

            viz_spec = VisualizationSpec(
                chart_type="line",
                title="Continuous Weather Dynamics: Daily Temperature vs Precipitation Volume",
                x_axis=AxisSpec(field="date", label="Date"),
                series=[
                    SeriesSpec(field="total_rainfall_mm", label="Rainfall (mm)", color="#2563EB", type="bar", yAxisIndex=1),
                    SeriesSpec(field="max_temperature_c", label="Max Temp (°C)", color="#DC2626", type="line", yAxisIndex=0),
                    SeriesSpec(field="avg_temperature_c", label="Avg Temp (°C)", color="#D97706", type="line", yAxisIndex=0)
                ]
            )
            max_t = max((float(d.get("max_temperature_c") or 0.0) for d in data), default=0.0)
            tot_r = sum(float(d.get("total_rainfall_mm") or 0.0) for d in data)
            summary = (
                f"Telemetry dynamics over recorded operational dates: Peak recorded temperature reached {max_t}°C with total "
                f"cumulative rainfall of {tot_r:,.1f} mm across regional sensor nodes."
            )
            rec = "Cross-reference peak precipitation dates against logistics schedules to mitigate flash-flood transport delays."
            return data, viz_spec, summary, rec

        # ==========================================
        # Q17: HIGHEST OPERATIONAL RISK MANDIS (Horizontal Bar)
        # ==========================================
        elif intent.intent_type == "highest_operational_risk_mandis":
            limit = intent.limit or 10
            data = self.risk_engine.calculate_mandi_risks()[:limit]

            viz_spec = VisualizationSpec(
                chart_type="bar",
                title=f"Top {limit} Mandis at Highest Composite Operational Risk",
                x_axis=AxisSpec(field="mandi_name", label="Mandi"),
                horizontal=True,
                series=[
                    SeriesSpec(field="risk_score", label="Risk Score (0-100)", color="#DC2626")
                ]
            )
            top_m = data[0]["mandi_name"] if data else "N/A"
            top_score = data[0]["risk_score"] if data else 0.0
            top_lvl = data[0]["risk_level"] if data else "High"
            summary = (
                f"Comprehensive 4-pillar risk assessment: {top_m} is ranked as the highest-risk market center with a composite "
                f"vulnerability score of {top_score:.1f} ({top_lvl} Risk tier), driven by compound price gaps and logistics bottlenecks."
            )
            rec = "Deploy multi-agency rapid stabilization taskforce to address price floor breaches and warehouse delays."
            return data, viz_spec, summary, rec

        # ==========================================
        # Q18: MULTI-FACTOR RISK SCATTER (Scatter Plot)
        # ==========================================
        elif intent.intent_type == "multifactor_risk_divergence":
            all_risks = self.risk_engine.calculate_mandi_risks()
            data = [
                {
                    "mandi_name": r["mandi_name"],
                    "district": r.get("district", ""),
                    "state": r.get("state", ""),
                    "below_msp_rate": round(float(r.get("price_gap_rate", 0.0)), 1),
                    "delayed_trip_percentage": round(float(r.get("delayed_trip_rate", 0.0)), 1),
                    "arrival_volatility_pct": round(float(r.get("arrival_volatility_rate", 0.0)), 1),
                    "risk_score": round(float(r.get("risk_score", 0.0)), 1)
                }
                for r in all_risks[:25]
            ]

            viz_spec = VisualizationSpec(
                chart_type="scatter",
                title="Multi-Factor Risk Matrix: Below-MSP Rate (X) vs Logistics Delay % (Y)",
                x_axis=AxisSpec(field="below_msp_rate", label="Below MSP Rate (%)"),
                y_axis=AxisSpec(field="delayed_trip_percentage", label="Delayed Trip Rate (%)"),
                series=[
                    SeriesSpec(field="delayed_trip_percentage", label="Delay Rate (%)", color="#DC2626")
                ],
                options={"xKey": "below_msp_rate", "yKey": "delayed_trip_percentage", "xName": "Price Distress (%)", "yName": "Logistics Delay (%)"}
            )
            high_multi = [d for d in data if d["below_msp_rate"] > 20 and d["delayed_trip_percentage"] > 20]
            count_h = len(high_multi)
            summary = (
                f"Multi-factor risk mapping evaluated {len(data)} Mandis: Identified {count_h} markets simultaneously suffering "
                f"from critical price distress (>20% below MSP) and severe logistics delay rates (>20%)."
            )
            rec = "Prioritize joint capital allocation for physical warehouse upgrades and FCI price stabilization funds at intersecting high-risk centers."
            return data, viz_spec, summary, rec

        # ==========================================
        # Q20: AGRICULTURE BOARD PRIORITY INTERVENTION (Executive Bar + Decision)
        # ==========================================
        elif intent.intent_type == "board_priority_intervention":
            all_risks = self.risk_engine.calculate_mandi_risks()
            top_candidates = all_risks[:5]
            target = top_candidates[0] if top_candidates else {}

            target_mandi = target.get("mandi_name", "Kadapa Mandi")
            target_score = target.get("risk_score", 75.0)
            target_dist = target.get("district", "Punjab")

            data = [
                {
                    "mandi_name": r["mandi_name"],
                    "risk_score": r["risk_score"],
                    "price_gap_rate": r.get("price_gap_rate", 0.0),
                    "delayed_trip_rate": r.get("delayed_trip_rate", 0.0),
                    "risk_level": r.get("risk_level", "High")
                }
                for r in top_candidates
            ]

            viz_spec = VisualizationSpec(
                chart_type="bar",
                title=f"Board Intervention Priority Ranking: {target_mandi} (#1 Priority)",
                x_axis=AxisSpec(field="mandi_name", label="Mandi"),
                horizontal=True,
                series=[
                    SeriesSpec(field="risk_score", label="Composite Risk Score (0-100)", color="#DC2626")
                ]
            )

            summary = (
                f"EXECUTIVE INTERVENTION DIRECTIVE: The Agriculture Board should immediately prioritize {target_mandi} ({target_dist}) "
                f"for direct statutory intervention. {target_mandi} holds the state's highest composite risk score ({target_score:.1f}/100), "
                f"driven by acute farmer price distress below MSP coupled with critical logistics backlog."
            )
            rec = (
                f"Action Plan for {target_mandi}: 1) Mobilize FCI/NAFED emergency procurement kiosks within 48 hours; "
                f"2) Open secondary buffer storage silos; 3) Re-sequence outward freight dispatch slots to clear corridor congestion."
            )
            return data, viz_spec, summary, rec

        # ==========================================
        # Q1 & GENERAL TREND COMPARISON (Line Chart)
        # ==========================================
        else:
            days = intent.days or 30
            filters = FilterParams(crop=intent.crop, mandi_id=intent.mandi_id, district=intent.district, state=intent.state)
            arrivals_trend = self.arrivals_repo.get_arrival_trend(filters)
            prices_series = self.prices_repo.get_msp_time_series(filters)
            price_map = {p["date"]: p for p in prices_series}

            selected_trend = arrivals_trend[-days:] if len(arrivals_trend) >= days else arrivals_trend

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

            target_label = intent.mandi_name or crop
            viz_spec = VisualizationSpec(
                chart_type="line",
                title=f"Daily Arrivals & 7-Day Moving Average ({target_label}) - Last {days} Days",
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
                f"Analyzed daily {crop} arrivals for {target_label} ({start_d} to {end_d}). "
                f"Total arrival volume reached {tot_vol:,.1f} Quintals with an average daily inflow of {avg_vol:,.1f} Quintals."
            )
            rec = "Synchronize procurement yard schedules and warehouse unloading gates with 7-day moving average arrival peaks."
            return data, viz_spec, summary, rec

    def _synthesize_grounded_response(
        self, query: str, intent: AgentIntent, data: List[Dict[str, Any]], default_summary: str, default_rec: str
    ) -> Tuple[Optional[str], Optional[str]]:
        """Synthesize response with strict context injection to ensure factual grounding."""
        try:
            from groq import Groq
            client = Groq(api_key=self.api_key)
            context_snippet = data[:15]
            user_prompt = (
                f"User Question: {query}\n"
                f"Intent Type: {intent.intent_type}\n"
                f"Crop / Entity: {intent.crop or intent.mandi_name or 'General'}\n"
                f"Context Data (Ground Truth Facts from DuckDB):\n"
                f"{json.dumps(context_snippet, indent=2, default=str)}\n\n"
                f"Please synthesize a strictly grounded summary and recommendation citing only the facts above."
            )
            candidate_models = list(dict.fromkeys([self.model, "llama-3.1-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192", "mixtral-8x7b-32768"]))
            
            for m_name in candidate_models:
                try:
                    completion = client.chat.completions.create(
                        model=m_name,
                        messages=[
                            {"role": "system", "content": GROUNDED_SYNTHESIS_SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt}
                        ],
                        temperature=0.1,
                        max_tokens=300,
                        response_format={"type": "json_object"}
                    )
                    if completion:
                        res = json.loads(completion.choices[0].message.content)
                        summary = res.get("summary")
                        rec = res.get("recommendation")
                        if summary:
                            return summary, rec
                except Exception:
                    continue

            return default_summary, default_rec
        except Exception as e:
            logger.warning(f"Grounded synthesis LLM call skipped, using deterministic summary: {str(e)}")
            return default_summary, default_rec
