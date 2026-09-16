import json
from typing import Optional
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.models.insights import InsightData, InsightResponse, InsightError
from backend.app.analytics.context import PageInsightContext
from backend.app.ai.prompts import INSIGHT_SYSTEM_PROMPT, PAGE_PROMPTS


from backend.app.services.llm_cache import llm_cache


class DashboardInsightLLM:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.model = settings.INSIGHT_MODEL

    def generate_insight(self, context: PageInsightContext) -> InsightResponse:
        page_key = context.page.lower()
        question = PAGE_PROMPTS.get(page_key, "What are the key insights from this data?")

        # 1. Generate canonical cache key and check cache
        cache_key = llm_cache.generate_insight_cache_key(
            page=context.page,
            filters=context.filters,
            context_dict=context.model_dump(),
            model=self.model
        )
        cached_res = llm_cache.get(cache_key)
        if cached_res:
            try:
                insight_data = InsightData(**cached_res["insight"])
                return InsightResponse(page=context.page, insight=insight_data)
            except Exception as ce:
                logger.warning(f"Error parsing cached insight object: {str(ce)}")

        if not self.api_key:
            logger.info("GROQ_API_KEY not configured. Generating deterministic fallback insight.")
            return self._generate_fallback_insight(context, question)

        try:
            from groq import Groq
            client = Groq(api_key=self.api_key)

            user_content = f"""
Page Question: {question}

Structured Analytics Context:
{json.dumps(context.model_dump(), indent=2)}

Please provide structured dashboard insights.
"""
            candidate_models = [self.model, "qwen/qwen3.6-27b", "qwen/qwen3.8-27b", "groq/compound"]
            # Deduplicate preserving order
            models_to_try = list(dict.fromkeys(candidate_models))

            completion = None
            last_err = None
            for model_name in models_to_try:
                try:
                    completion = client.chat.completions.create(
                        model=model_name,
                        messages=[
                            {"role": "system", "content": INSIGHT_SYSTEM_PROMPT},
                            {"role": "user", "content": user_content}
                        ],
                        temperature=0.2,
                        max_tokens=500,
                        response_format={"type": "json_object"}
                    )
                    if completion:
                        break
                except Exception as model_e:
                    last_err = model_e
                    logger.warning(f"Groq model {model_name} failed: {str(model_e)}. Trying next candidate model...")

            if not completion:
                raise last_err or Exception("All candidate Groq models failed.")

            response_content = completion.choices[0].message.content
            parsed = json.loads(response_content)

            insight_data = InsightData(
                headline=parsed.get("headline", "Operational Overview"),
                summary=parsed.get("summary", "Summary of current operational data."),
                key_findings=parsed.get("key_findings", []),
                severity=parsed.get("severity", "medium") if parsed.get("severity") in ["low", "medium", "high"] else "medium",
                recommendation=parsed.get("recommendation", "Continue monitoring supply chain metrics.")
            )

            # Save in LLM cache
            llm_cache.set(cache_key, {"page": context.page, "insight": insight_data.model_dump()})
            return InsightResponse(page=context.page, insight=insight_data)

        except Exception as e:
            logger.error(f"Error calling Groq Insight LLM: {str(e)}")
            # Graceful fallback on AI failure as specified in prompt section 22
            return InsightResponse(
                page=context.page,
                insight=self._generate_fallback_insight(context, question).insight,
                error=InsightError(
                    code="AI_PROVIDER_UNAVAILABLE",
                    message="Dashboard insights are operating in deterministic fallback mode."
                )
            )

    def _generate_fallback_insight(self, context: PageInsightContext, question: str) -> InsightResponse:
        kpis = context.summary_kpis
        page = context.page.lower()
        findings = [note for note in context.context_notes]

        if page == "forecast_planning" or page == "forecast":
            mean_f = float(kpis.get("mean_daily_forecast_qtl", 22000.0))
            peak_f = float(kpis.get("peak_forecast_qtl", 25000.0))
            peak_d = str(kpis.get("peak_forecast_date", "2026-09-12"))
            cumul_f = float(kpis.get("cumulative_7d_projected_qtl", 154000.0))
            delta = float(kpis.get("projected_trajectory_delta_pct", 0.0))
            model_name = str(kpis.get("model_used", "Ridge Autoregressive ML"))

            headline = f"7-Day Arrival Forecast: {mean_f:,.0f} Qtl/d Projected Inflow (Peak on {peak_d})"
            summary = (
                f"Autoregressive machine learning models project state-wide mandi arrivals to average {mean_f:,.0f} Qtl/day "
                f"across the upcoming 7-day planning horizon (Sep 10–16, 2026), totaling {cumul_f:,.0f} Qtl in cumulative inflow "
                f"({'+' if delta >= 0 else ''}{delta:.1f}% trajectory vs recent historical baseline). "
                f"Operational peak volume is expected on {peak_d}."
            )
            key_findings = [
                f"Daily state inflow projected at {mean_f:,.0f} Qtl/day across 57 APMC terminals.",
                f"Peak single-day intake pressure forecast of {peak_f:,.0f} Qtl on {peak_d}.",
                f"Model architecture: {model_name} trained on verified historical arrivals through Sep 09, 2026."
            ]
            recommendation = (
                f"Stage auxiliary storage and coordinate transport fleet dispatches ahead of the {peak_d} peak intake volume."
            )
            severity = "high" if delta > 10.0 else ("medium" if delta > 3.0 else "low")

        elif page == "weather_operations" or page == "weather":
            heat_count = kpis.get("heatwave_event_count", 0)
            rain_count = kpis.get("heavy_rain_event_count", 0)
            max_t = kpis.get("highest_temperature_c", 40.0)
            headline = f"Regional Weather Telemetry: {heat_count} Extreme Heat & {rain_count} Rain Surge Events"
            summary = (
                f"Independent regional telemetry sensors recorded {heat_count} heatwave observations (peak {max_t:.1f}°C) "
                f"and {rain_count} localized heavy precipitation occurrences across the 50 station network."
            )
            key_findings = [
                f"Peak ambient temperature logged at {max_t:.1f}°C across telemetry grid.",
                f"Heatwave anomalies registered on {heat_count} qualifying sensor dates.",
                "Telemetry isolated strictly to regional stations without unverified mandi attribution."
            ]
            recommendation = "Deploy weather-proofing protocols for commodity transit in active heat and rain corridors."
            severity = "high" if heat_count > 100 or rain_count > 100 else "medium"

        elif page == "logistics_command" or page == "logistics":
            delayed_pct = kpis.get("delayed_trip_percentage", 0.0)
            trips = kpis.get("total_trips", 0)
            headline = f"Fleet Dispatch Velocity: {delayed_pct:.1f}% Delayed Corridor Trips"
            summary = (
                f"Corridor logistics analysis tracks {trips:,} freight trips with an on-time dispatch rate of "
                f"{100.0 - delayed_pct:.1f}%, while delayed routes average transit stalls above standard 40 km/h SLAs."
            )
            key_findings = [
                f"Corridor trip delay rate stands at {delayed_pct:.1f}%.",
                "Baseline SLA standard: 40 km/h target velocity across origin-to-hub corridors.",
                "Critical stalls (>24h) isolated to primary interstate freight corridors."
            ]
            recommendation = "Re-route delayed corridor trips through alternate transit hubs and enforce SLA compliance."
            severity = "high" if delayed_pct > 25.0 else ("medium" if delayed_pct > 10.0 else "low")

        elif page == "farmer_price_watch" or page == "prices":
            below_msp = kpis.get("highest_below_msp_pct", 30.0)
            headline = f"Farmer Price Protection: Peak Below-MSP Rate at {below_msp:.1f}%"
            summary = (
                f"APMC market transactions show approximately {below_msp:.1f}% of price observations clearing below "
                "statutory Minimum Support Price thresholds, indicating focused price pressure on vulnerable commodities."
            )
            key_findings = [
                f"Peak below-MSP frequency observed at {below_msp:.1f}%.",
                "Statutory formula enforced: msp_gap = msp - modal_price.",
                "Commodity disparity concentrated in seasonal intake periods."
            ]
            recommendation = "Activate targeted NAFED procurement interventions at mandis showing persistent negative MSP gaps."
            severity = "high" if below_msp > 35.0 else "medium"

        else:  # Command Center / Supply Pulse / Mandi Risk
            tot_arr = kpis.get("total_arrivals_qtl", 0.0)
            below_p = kpis.get("below_msp_rate", kpis.get("below_msp_percentage", 0.0))
            headline = f"Operational Intelligence Summary for {page.replace('_', ' ').title()}"
            summary = (
                f"State-wide agricultural monitoring across 57 APMC terminals tracks {tot_arr:,.0f} Qtl in arrival volume, "
                f"with {below_p:.1f}% of transactions trading below statutory price benchmarks."
            )
            key_findings = findings[:3] if findings else [
                f"Total Arrivals: {tot_arr:,.0f} Qtl across active network.",
                f"Below MSP Transaction Share: {below_p:.1f}%.",
                "Transactions bounded strictly to verified historical dates through Sep 09, 2026."
            ]
            recommendation = "Maintain real-time multi-factor surveillance and deploy proactive market stabilization measures."
            severity = "high" if below_p > 35.0 else "medium"

        fallback_data = InsightData(
            headline=headline,
            summary=summary,
            key_findings=key_findings,
            severity=severity,
            recommendation=recommendation
        )
        return InsightResponse(page=context.page, insight=fallback_data)
