import json
from typing import Optional
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.models.insights import InsightData, InsightResponse, InsightError
from backend.app.analytics.context import PageInsightContext
from backend.app.ai.prompts import INSIGHT_SYSTEM_PROMPT, PAGE_PROMPTS


class DashboardInsightLLM:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.model = settings.INSIGHT_MODEL

    def generate_insight(self, context: PageInsightContext) -> InsightResponse:
        page_key = context.page.lower()
        question = PAGE_PROMPTS.get(page_key, "What are the key insights from this data?")

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
            completion = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": INSIGHT_SYSTEM_PROMPT},
                    {"role": "user", "content": user_content}
                ],
                temperature=0.2,
                response_format={"type": "json_object"}
            )

            response_content = completion.choices[0].message.content
            parsed = json.loads(response_content)

            insight_data = InsightData(
                headline=parsed.get("headline", "Operational Overview"),
                summary=parsed.get("summary", "Summary of current operational data."),
                key_findings=parsed.get("key_findings", []),
                severity=parsed.get("severity", "medium") if parsed.get("severity") in ["low", "medium", "high"] else "medium",
                recommendation=parsed.get("recommendation", "Continue monitoring supply chain metrics.")
            )

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

        severity = "medium"
        if kpis.get("below_msp_percentage", 0.0) > 40.0 or kpis.get("delayed_trip_percentage", 0.0) > 30.0:
            severity = "high"
        elif kpis.get("below_msp_percentage", 0.0) < 15.0 and kpis.get("delayed_trip_percentage", 0.0) < 10.0:
            severity = "low"

        fallback_data = InsightData(
            headline=f"Operational Summary for {context.page.replace('_', ' ').title()}",
            summary=f"Automated analytics indicate active tracking across {len(context.top_rankings)} primary indicators under current filter criteria.",
            key_findings=findings[:3],
            severity=severity,
            recommendation="Review high-pressure metrics in detail via the interactive page table."
        )
        return InsightResponse(page=context.page, insight=fallback_data)
