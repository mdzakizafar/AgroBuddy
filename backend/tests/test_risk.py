import pytest
from backend.app.db.duckdb import db_manager
from backend.app.analytics.risk import MandiRiskEngine


def test_mandi_risk_engine_determinism_and_bounds():
    conn = db_manager.get_connection(read_only=True)
    try:
        engine = MandiRiskEngine(conn)
        risks = engine.calculate_mandi_risks()
        assert len(risks) > 0, "Mandi risk engine returned no mandi results."

        for item in risks:
            score = item["risk_score"]
            assert 0.0 <= score <= 100.0, f"Risk score out of bounds: {score}"
            level = item["risk_level"]
            assert level in ["low", "medium", "high"], f"Invalid risk level: {level}"

            comps = item["components"]
            assert 0.0 <= comps["price_pressure"] <= 100.0
            assert 0.0 <= comps["arrival_instability"] <= 100.0
            assert 0.0 <= comps["logistics_delay"] <= 100.0

            assert isinstance(item["explanation"], list)
            assert len(item["explanation"]) > 0
            assert isinstance(item["recommended_action"], str)
    finally:
        conn.close()
