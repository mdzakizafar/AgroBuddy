from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class FilterParams(BaseModel):
    date_from: Optional[str] = Field(None, description="Start date (YYYY-MM-DD)")
    date_to: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")
    mandi_id: Optional[str] = Field(None, description="Mandi ID filter")
    district: Optional[str] = Field(None, description="District filter")
    crop: Optional[str] = Field(None, description="Crop name filter")
    state: Optional[str] = Field(None, description="State filter")
    mandi_type: Optional[str] = Field(None, description="Mandi type filter")


class ResponseMetadata(BaseModel):
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    filters: Dict[str, Any] = Field(default_factory=dict)
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    data_source: str = "duckdb"
    mapping_status: Optional[str] = None
    message: Optional[str] = None


class MandiOption(BaseModel):
    id: str
    label: str
    district: str
    state: str
    mandi_type: str


class FilterOptionsResponse(BaseModel):
    crops: List[str]
    mandis: List[MandiOption]
    districts: List[str]
    states: List[str]
    mandi_types: List[str]
    data_as_of: str = "2026-09-09"
    dashboard_date: str = "2026-09-16"
    min_date: str = "2026-01-01"
    max_date: str = "2026-09-09"
    default_date_from: str = "2026-08-10"
    default_date_to: str = "2026-09-09"
    metadata: ResponseMetadata

