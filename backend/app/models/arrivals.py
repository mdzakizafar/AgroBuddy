from typing import List, Optional
from pydantic import BaseModel
from backend.app.models.common import ResponseMetadata


class DailyArrivalTrend(BaseModel):
    date: str
    arrival_qtl: float
    farmer_count: int


class CropArrivalItem(BaseModel):
    crop_name: str
    arrival_qtl: float
    percentage_of_total: float
    farmer_count: int


class MandiArrivalItem(BaseModel):
    mandi_id: str
    mandi_name: str
    district: str
    arrival_qtl: float
    farmer_count: int
    avg_qtl_per_farmer: float


class SupplyMetrics(BaseModel):
    total_arrival_qtl: float
    total_farmers: int
    arrival_growth_pct: Optional[float] = None
    arrival_volatility_std: float
    anomaly_count: int
    anomaly_rate_pct: float


class ArrivalsTrendResponse(BaseModel):
    series: List[DailyArrivalTrend]
    metadata: ResponseMetadata


class ArrivalsByCropResponse(BaseModel):
    by_crop: List[CropArrivalItem]
    metadata: ResponseMetadata


class ArrivalsByMandiResponse(BaseModel):
    by_mandi: List[MandiArrivalItem]
    metadata: ResponseMetadata


class SupplyPulseResponse(BaseModel):
    metrics: SupplyMetrics
    trend: List[DailyArrivalTrend]
    by_crop: List[CropArrivalItem]
    by_mandi: List[MandiArrivalItem]
    metadata: ResponseMetadata
