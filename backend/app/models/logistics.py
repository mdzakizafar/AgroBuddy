from typing import List, Optional
from pydantic import BaseModel
from backend.app.models.common import ResponseMetadata


class LogisticsSummaryMetrics(BaseModel):
    total_trips: int
    average_transit_hours: float
    average_delay_hours: float
    delayed_trip_percentage: float
    average_distance_km: float
    anomaly_count: int


class LogisticsDelayTimeSeriesItem(BaseModel):
    date: str
    average_delay_hours: float
    delayed_trip_percentage: float


class MandiLogisticsItem(BaseModel):
    mandi_id: str
    mandi_name: str
    trip_count: int
    avg_transit_hours: float
    avg_delay_hours: float
    delayed_trip_percentage: float


class RouteLogisticsItem(BaseModel):
    mandi_id: str
    mandi_name: str
    destination_warehouse: str
    trip_count: int
    distance_km: float
    avg_transit_hours: float
    avg_delay_hours: float
    delayed_trip_percentage: float


class LogisticsSummaryResponse(BaseModel):
    summary: LogisticsSummaryMetrics
    metadata: ResponseMetadata


class LogisticsDelaysResponse(BaseModel):
    series: List[LogisticsDelayTimeSeriesItem]
    metadata: ResponseMetadata


class LogisticsByMandiResponse(BaseModel):
    by_mandi: List[MandiLogisticsItem]
    routes: List[RouteLogisticsItem]
    metadata: ResponseMetadata
