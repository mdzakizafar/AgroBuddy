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
        # Deterministic summary built from context metrics without LLM
        kpis = context.summary_kpis
        findings = []
        for note in context.context_notes:
            findings.append(note)

        if "below_msp_percentage" in kpis:
            findings.append(f"Below MSP rate recorded at {kpis['below_msp_percentage']}%.")
        if "delayed_trip_percentage" in kpis:
            findings.append(f"Logistics trip delay rate recorded at {kpis['delayed_trip_percentage']}%.")
        if "highest_temperature_c" in kpis and kpis["highest_temperature_c"] is not None:
            findings.append(f"Peak telemetry temperature reached {kpis['highest_temperature_c']}°C.")
        if "heatwave_event_count" in kpis and kpis["heatwave_event_count"] > 0:
            findings.append(f"Heatwave anomalies registered at {kpis['heatwave_event_count']} events across telemetry stations.")
        if "heavy_rain_event_count" in kpis and kpis["heavy_rain_event_count"] > 0:
            findings.append(f"Heavy rainfall anomalies logged at {kpis['heavy_rain_event_count']} downpour events.")

        severity = "medium"
        if (
            kpis.get("below_msp_percentage", 0.0) > 40.0
            or kpis.get("delayed_trip_percentage", 0.0) > 30.0
            or kpis.get("highest_temperature_c", 0.0) >= 40.0
            or kpis.get("heatwave_event_count", 0) > 500
        ):
            severity = "high"
        elif kpis.get("below_msp_percentage", 0.0) < 15.0 and kpis.get("delayed_trip_percentage", 0.0) < 10.0:
            severity = "low"

        fallback_data = InsightData(
            headline=f"Environmental & Operational Telemetry for {context.page.replace('_', ' ').title()}",
            summary=f"Automated sensor telemetry reports {kpis.get('heatwave_event_count', 0)} heatwave alerts and {kpis.get('heavy_rain_event_count', 0)} heavy rain anomalies across regional monitoring stations.",
            key_findings=findings[:3],
            severity=severity,
            recommendation="Monitor high-temperature zones and ensure buffer stock protection at vulnerable transport corridors."
        )
        return InsightResponse(page=context.page, insight=fallback_data)
