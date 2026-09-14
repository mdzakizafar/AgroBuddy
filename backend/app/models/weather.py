from typing import List, Optional
from pydantic import BaseModel
from backend.app.models.common import ResponseMetadata


class WeatherTrendItem(BaseModel):
    timestamp: str
    temperature_c: Optional[float] = None
    rainfall_mm: Optional[float] = None
    humidity_percent: Optional[float] = None


class SensorStatusItem(BaseModel):
    sensor_id: str
    latest_timestamp: Optional[str] = None
    latest_temperature_c: Optional[float] = None
    latest_rainfall_mm: Optional[float] = None
    latest_humidity_percent: Optional[float] = None
    is_heatwave: bool = False
    is_heavy_rain: bool = False
    is_rainfall_anomaly: bool = False


class WeatherExtremesSummary(BaseModel):
    heatwave_event_count: int
    heavy_rain_event_count: int
    highest_temperature_c: Optional[float] = None
    highest_rainfall_mm: Optional[float] = None
    negative_rainfall_anomalies_count: int


class WeatherTrendResponse(BaseModel):
    series: List[WeatherTrendItem]
    metadata: ResponseMetadata


class WeatherExtremesResponse(BaseModel):
    extremes: WeatherExtremesSummary
    top_temperature_readings: List[WeatherTrendItem]
    top_rainfall_readings: List[WeatherTrendItem]
    metadata: ResponseMetadata


class WeatherSensorsResponse(BaseModel):
    sensors: List[SensorStatusItem]
    metadata: ResponseMetadata
