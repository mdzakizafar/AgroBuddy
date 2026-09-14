from typing import Dict, List, Optional
from pydantic import BaseModel
from backend.app.models.common import ResponseMetadata


class RiskComponents(BaseModel):
    price_pressure: float
    arrival_instability: float
    logistics_delay: float


class MandiRiskItem(BaseModel):
    mandi_id: str
    mandi_name: str
    district: str
    state: str
    risk_score: float
    risk_level: str  # "low", "medium", "high"
    components: RiskComponents
    explanation: List[str]
    recommended_action: str


class MandiRiskListResponse(BaseModel):
    mandis: List[MandiRiskItem]
    metadata: ResponseMetadata


class MandiRiskDetailResponse(BaseModel):
    mandi_risk: MandiRiskItem
    metadata: ResponseMetadata
