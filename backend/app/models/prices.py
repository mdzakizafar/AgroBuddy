from typing import List, Optional
from pydantic import BaseModel
from backend.app.models.common import ResponseMetadata


class PriceMSPTimeSeriesItem(BaseModel):
    date: str
    crop: str
    mandi_id: str
    mandi_name: Optional[str] = None
    district: Optional[str] = None
    modal_price: Optional[float] = None
    msp: Optional[float] = None
    msp_gap: Optional[float] = None
    below_msp_flag: int


class CropPricePressureItem(BaseModel):
    crop: str
    avg_modal_price: Optional[float] = None
    msp: Optional[float] = None
    avg_msp_gap: Optional[float] = None
    below_msp_percentage: float
    min_modal_price: Optional[float] = None
    max_modal_price: Optional[float] = None
    price_spread: Optional[float] = None


class MandiPricePressureItem(BaseModel):
    mandi_id: str
    mandi_name: str
    district: str
    crop: Optional[str] = None
    avg_modal_price: Optional[float] = None
    avg_msp: Optional[float] = None
    avg_msp_gap: Optional[float] = None
    below_msp_percentage: float


class PricePressureResponse(BaseModel):
    crop_pressure: List[CropPricePressureItem]
    mandi_pressure: List[MandiPricePressureItem]
    metadata: ResponseMetadata


class PriceMSPResponse(BaseModel):
    series: List[PriceMSPTimeSeriesItem]
    metadata: ResponseMetadata
