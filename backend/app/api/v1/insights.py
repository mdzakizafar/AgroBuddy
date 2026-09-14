from fastapi import APIRouter, Depends
import duckdb

from backend.app.db.duckdb import get_db
from backend.app.models.common import FilterParams
from backend.app.models.insights import InsightRequest, InsightResponse
from backend.app.analytics.context import AnalyticsContextBuilder
from backend.app.ai.insight_llm import DashboardInsightLLM

router = APIRouter()


@router.post("/insights", response_model=InsightResponse)
def generate_page_insights(
    request: InsightRequest,
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    filters_raw = request.filters or {}
    filters = FilterParams(**filters_raw)
    
    # 1. Retrieve analytics & construct structured context
    builder = AnalyticsContextBuilder(conn)
    context = builder.build_context_for_page(request.page, filters)
    
    # 2. Pass context to Groq Model #1 (DashboardInsightLLM)
    llm = DashboardInsightLLM()
    response = llm.generate_insight(context)
    return response
