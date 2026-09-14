import pytest
from backend.app.db.duckdb import db_manager
from backend.app.repositories.prices import PricesRepository
from backend.app.repositories.logistics import LogisticsRepository
from backend.app.repositories.weather import WeatherRepository


def test_msp_gap_and_below_msp_formulas():
    conn = db_manager.get_connection(read_only=True)
    try:
        query = """
            SELECT 
                modal_price, 
                msp, 
                msp_gap, 
                below_msp_flag
            FROM fact_prices 
            WHERE modal_price IS NOT NULL AND msp IS NOT NULL
            LIMIT 50
        """
        rows = conn.execute(query).fetchall()
        assert len(rows) > 0, "No price records with both modal_price and msp."

        for modal, msp, gap, flag in rows:
            expected_gap = round(msp - modal, 2)
            actual_gap = round(gap, 2)
            assert abs(actual_gap - expected_gap) < 0.1, f"MSP gap mismatch: {actual_gap} vs expected {expected_gap}"

            expected_flag = 1 if modal < msp else 0
            assert flag == expected_flag, f"Below MSP flag mismatch for modal={modal}, msp={msp}: got {flag}, expected {expected_flag}"
    finally:
        conn.close()


def test_logistics_delay_formulas():
    conn = db_manager.get_connection(read_only=True)
    try:
        query = """
            SELECT 
                transit_hours, 
                distance_km, 
                delay_hours, 
                is_delayed_flag
            FROM fact_transport
            WHERE transit_hours IS NOT NULL AND distance_km IS NOT NULL
            LIMIT 50
        """
        rows = conn.execute(query).fetchall()
        assert len(rows) > 0, "No transport records."

        for transit, distance, delay, flag in rows:
            expected_delay = round(transit - (distance / 40.0), 2)
            actual_delay = round(delay, 2)
            assert abs(actual_delay - expected_delay) < 0.1, f"Delay hours mismatch: {actual_delay} vs expected {expected_delay}"

            expected_flag = 1 if delay > 2.0 else 0
            assert flag == expected_flag, f"Is delayed flag mismatch: got {flag}, expected {expected_flag}"
    finally:
        conn.close()


def test_weather_unmapped_constraint():
    repo = WeatherRepository(db_manager.get_connection(read_only=True))
    sensors = repo.get_sensors_status()
    assert len(sensors) > 0, "No weather sensors status found."
    for s in sensors:
        assert "sensor_id" in s
        assert "mandi_id" not in s, "Weather dataset must NOT contain mandi_id attribution."
