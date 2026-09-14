from typing import List, Optional
from pydantic import BaseModel, Field


class InsightOutputSchema(BaseModel):
    headline: str
    summary: str
    key_findings: List[str]
    severity: str = Field(..., pattern="^(low|medium|high)$")
    recommendation: str
