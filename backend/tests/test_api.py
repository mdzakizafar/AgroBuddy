import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] is True


def test_filters_endpoint():
    response = client.get("/api/v1/filters")
    assert response.status_code == 200
    data = response.json()
    assert "crops" in data
    assert "mandis" in data
    assert "districts" in data
    assert "states" in data
    assert "mandi_types" in data


def test_overview_endpoint():
    response = client.get("/api/v1/overview")
    assert response.status_code == 200
    data = response.json()
    assert "kpis" in data
    assert "top_arrival_crops" in data
    assert "mandis_under_price_pressure" in data
    assert "worst_logistics_mandis" in data
    assert "arrival_anomaly_summary" in data


def test_invalid_date_range_filter():
    response = client.get("/api/v1/overview?date_from=2026-10-01&date_to=2026-05-01")
    assert response.status_code == 400
    data = response.json()
    assert "Invalid date range" in data["detail"]


def test_arrivals_endpoints():
    r1 = client.get("/api/v1/arrivals/trend")
    assert r1.status_code == 200
    assert "series" in r1.json()

    r2 = client.get("/api/v1/arrivals/by-crop")
    assert r2.status_code == 200
    assert "by_crop" in r2.json()

    r3 = client.get("/api/v1/arrivals/by-mandi")
    assert r3.status_code == 200
    assert "by_mandi" in r3.json()


def test_prices_endpoints():
    r1 = client.get("/api/v1/prices/msp")
    assert r1.status_code == 200
    assert "series" in r1.json()

    r2 = client.get("/api/v1/prices/pressure")
    assert r2.status_code == 200
    assert "crop_pressure" in r2.json()


def test_mandis_endpoints():
    r1 = client.get("/api/v1/mandis")
    assert r1.status_code == 200
    mandis = r1.json()["mandis"]
    assert len(mandis) > 0

    mandi_id = mandis[0]["mandi_id"]
    r2 = client.get(f"/api/v1/mandis/{mandi_id}")
    assert r2.status_code == 200
    assert r2.json()["mandi"]["mandi_id"] == mandi_id

    r3 = client.get(f"/api/v1/mandis/{mandi_id}/market-state")
    assert r3.status_code == 200
    assert "overall_condition" in r3.json()


def test_weather_endpoints():
    r = client.get("/api/v1/weather/trend")
    assert r.status_code == 200
    assert r.json()["metadata"]["mapping_status"] == "unmapped"


def test_forecast_endpoint():
    r = client.get("/api/v1/forecast/arrivals?crop=Wheat")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "not_available"
    assert "historical" in data
