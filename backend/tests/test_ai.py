import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_insights_endpoint_fallback():
    payload = {
        "page": "farmer_price_watch",
        "filters": {"crop": "Wheat"}
    }
    response = client.post("/api/v1/insights", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == "farmer_price_watch"
    assert "insight" in data
    insight = data["insight"]
    assert "headline" in insight
    assert "summary" in insight
    assert "key_findings" in insight
    assert insight["severity"] in ["low", "medium", "high"]


def test_agent_query_endpoint():
    payload = {
        "query": "Plot daily arrivals vs MSP for Wheat over the last 30 days"
    }
    response = client.post("/api/v1/agent/query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "intent" in data
    assert "data" in data
    assert "visualization" in data
    
    viz = data["visualization"]
    assert viz["chart_type"] in ["line", "area", "bar", "histogram", "scatter", "donut", "treemap", "heatmap", "map", "table"]
    assert "title" in viz
    assert "series" in viz
    assert len(viz["series"]) > 0
