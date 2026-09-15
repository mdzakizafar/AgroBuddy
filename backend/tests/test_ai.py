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
    assert data.get("is_grounded") is True
    assert data.get("data_points_count", 0) > 0
    
    viz = data["visualization"]
    assert viz["chart_type"] in ["line", "area", "bar", "histogram", "scatter", "donut", "treemap", "heatmap", "map", "table"]
    assert "title" in viz
    assert "series" in viz
    assert len(viz["series"]) > 0


def test_agent_query_out_of_scope_guardrail():
    payload = {
        "query": "Write a python script to implement quicksort and binary search"
    }
    response = client.post("/api/v1/agent/query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["intent"]["intent_type"] == "out_of_scope"
    assert data["visualization"] is None
    assert len(data["data"]) == 0
    assert "agricultural" in data["summary"].lower() or "agrobuddy" in data["summary"].lower()


def test_agent_query_gibberish_noise():
    # Exact user query and random gibberish variations
    for gibberish in ["6,33467,olij,oooo", "asdfghjkl", "123456", "???!!!", "xyz9999"]:
        payload = {"query": gibberish}
        response = client.post("/api/v1/agent/query", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["intent"]["intent_type"] == "out_of_scope", f"Failed for gibberish: {gibberish}"
        assert data["visualization"] is None, f"Dummy visualization returned for gibberish: {gibberish}"
        assert len(data["data"]) == 0, f"Data returned for gibberish: {gibberish}"
        assert "not understand" in data["summary"].lower() or "agricultural" in data["summary"].lower()


def test_benchmark_19_queries_coverage():
    test_suite = [
        # (Query, Expected Intent Type, Expected Chart Type, Check Horizontal)
        ("Plot the daily arrival trend of Wheat in Amritsar mandi for the last 30 days.", "daily_arrival_trend", "line", False),
        ("Compare Wheat, Rice and Maize arrivals over the last 30 days.", "multi_crop_daily_comparison", "line", False),
        ("Which 5 mandis received the highest crop arrivals?", "top_mandis_by_arrivals", "bar", True),
        ("Which crops have the highest percentage of sales below MSP?", "crop_below_msp_ranking", "bar", True),
        ("Show Wheat modal price versus MSP over time.", "price_vs_msp_timeseries", "line", False),
        ("Which mandis have the largest gap between modal price and MSP for Wheat?", "mandi_largest_msp_gap", "bar", True),
        ("Which mandis show a supply glut with rising arrivals and falling prices?", "mandi_supply_glut_divergence", "scatter", False),
        ("Which crop is facing the most severe market pressure?", "most_pressured_crop_insight", "bar", True),
        ("How do registered farmers correlate with crop arrivals across mandis?", "farmers_vs_arrivals_correlation", "scatter", False),
        ("Which crop has the highest arrival volatility?", "crop_arrival_volatility", "bar", False),
        ("Which 5 mandis have the worst logistics delays?", "worst_logistics_mandis", "bar", True),
        ("Show average transit time trend over the last 30 days.", "transit_time_trend", "line", False),
        ("Which transport routes are the most severe bottlenecks?", "bottleneck_routes", "bar", True),
        ("How does distance affect transit time across warehouse routes?", "distance_vs_transit_time_scatter", "scatter", False),
        ("Which sensor locations have the highest heatwave frequency?", "heatwave_sensors", "bar", True),
        ("Show daily average temperature and rainfall trends over time.", "weather_daily_trends", "line", False),
        ("Which 5 mandis have the highest operational risk?", "highest_operational_risk_mandis", "bar", True),
        ("How does operational risk score compare to logistics risk across top mandis?", "multifactor_risk_divergence", "scatter", False),
        ("Rank mandis by urgent intervention priority.", "board_priority_intervention", "bar", True),
    ]

    for query, expected_intent, expected_chart, expected_horizontal in test_suite:
        payload = {"query": query}
        response = client.post("/api/v1/agent/query", json=payload)
        assert response.status_code == 200, f"HTTP Error on query: {query}"
        data = response.json()
        assert data.get("is_grounded") is True, f"Response not marked grounded for: {query}"
        assert data.get("intent", {}).get("intent_type") == expected_intent, f"Wrong intent for '{query}': got {data.get('intent', {}).get('intent_type')} expected {expected_intent}"
        assert data.get("visualization") is not None, f"Visualization is None for: {query}"
        viz = data["visualization"]
        assert viz.get("chart_type") == expected_chart, f"Wrong chart_type for '{query}': got {viz.get('chart_type')} expected {expected_chart}"
        if expected_horizontal:
            assert viz.get("horizontal") is True, f"Expected horizontal=True for '{query}'"
        assert len(data.get("data", [])) > 0, f"No data returned for '{query}'"


def test_agent_query_parameterized_variations():
    variations = [
        ("Compare Mustard and Cotton arrivals over the last 14 days", "multi_crop_daily_comparison", "line"),
        ("Which 10 mandis received the most arrivals?", "top_mandis_by_arrivals", "bar"),
        ("Show Rice modal price versus MSP over time", "price_vs_msp_timeseries", "line"),
        ("Which mandis have the worst transit delays?", "worst_logistics_mandis", "bar"),
        ("Which sensors recorded the most heatwaves?", "heatwave_sensors", "bar"),
        ("Give me the top risky mandis needing priority intervention", "board_priority_intervention", "bar"),
    ]
    for query, expected_intent, expected_chart in variations:
        payload = {"query": query}
        response = client.post("/api/v1/agent/query", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("intent", {}).get("intent_type") == expected_intent
        assert data.get("visualization", {}).get("chart_type") == expected_chart
        assert len(data.get("data", [])) > 0

