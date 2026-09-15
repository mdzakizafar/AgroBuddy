from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AxisSpec(BaseModel):
    field: str
    label: Optional[str] = None


class SeriesSpec(BaseModel):
    field: str
    label: str
    color: Optional[str] = None


class VisualizationSpec(BaseModel):
    chart_type: str  # "line", "area", "bar", "histogram", "scatter", "donut", "treemap", "heatmap", "map", "table"
    title: str
    x_axis: Optional[AxisSpec] = None
    y_axis: Optional[AxisSpec] = None
    series: List[SeriesSpec] = Field(default_factory=list)
    options: Dict[str, Any] = Field(default_factory=dict)


class AgentQueryRequest(BaseModel):
    query: str = Field(..., description="Natural language query from user")


class AgentIntent(BaseModel):
    intent_type: str
    crop: Optional[str] = None
    crops: List[str] = Field(default_factory=list)
    mandi_id: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    metrics: List[str] = Field(default_factory=list)
    group_by: Optional[str] = None
    date_range: Optional[str] = None
    visualization_suggestion: Optional[str] = None


class AgentQueryResponse(BaseModel):
    query: str
    intent: AgentIntent
    data: List[Dict[str, Any]] = Field(default_factory=list)
    visualization: Optional[VisualizationSpec] = None
    summary: str
    recommendation: Optional[str] = ""
    error: Optional[Dict[str, str]] = None
