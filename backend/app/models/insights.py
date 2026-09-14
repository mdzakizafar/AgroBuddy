from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class InsightRequest(BaseModel):
    page: str = Field(..., description="Dashboard page identifier, e.g., 'farmer_price_watch'")
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Dashboard filters")


class InsightData(BaseModel):
    headline: str
    summary: str
    key_findings: List[str]
    severity: str  # "low", "medium", "high"
    recommendation: str


class InsightError(BaseModel):
    code: str
    message: str


class InsightResponse(BaseModel):
    page: str
    insight: Optional[InsightData] = None
    error: Optional[InsightError] = None
