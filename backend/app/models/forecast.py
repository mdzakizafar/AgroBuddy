from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from backend.app.models.common import ResponseMetadata


class ForecastItem(BaseModel):
    date: str
    predicted_arrival_qtl: Optional[float] = None
    actual: Optional[float] = None
    forecast: Optional[float] = None
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None


class HistoricalItem(BaseModel):
    date: str
    arrival_qtl: float


class ForecastResponse(BaseModel):
    mandi_id: Optional[str] = None
    crop: Optional[str] = None
    horizon: int = 7
    horizon_days: int = 7
    status: str = "available"  # "available" or "not_available"
    message: str = "Forecast generated successfully."
    model: Optional[str] = None
    metrics: Dict[str, Any] = {}
    historical: List[HistoricalItem] = []
    forecast: List[ForecastItem] = []
    data: List[ForecastItem] = []
    metadata: ResponseMetadata
