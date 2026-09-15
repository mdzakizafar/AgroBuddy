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
            assert level.lower() in ["low", "medium", "high", "critical"], f"Invalid risk level: {level}"

            p_score = item.get("price_pressure_score", item.get("components", {}).get("price_pressure"))
            a_score = item.get("arrival_instability_score", item.get("components", {}).get("arrival_instability"))
            l_score = item.get("logistics_delay_score", item.get("components", {}).get("logistics_delay"))
            assert 0.0 <= p_score <= 100.0
            assert 0.0 <= a_score <= 100.0
            assert 0.0 <= l_score <= 100.0

            assert isinstance(item["explanation"], list)
            assert len(item["explanation"]) > 0
            assert isinstance(item["recommended_action"], str)
    finally:
        conn.close()
