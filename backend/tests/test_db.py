import pytest
import duckdb
from backend.app.core.config import settings
from backend.app.db.duckdb import db_manager


def test_duckdb_tables_exist():
    conn = db_manager.get_connection(read_only=True)
    try:
        tables = [row[0] for row in conn.execute("SHOW TABLES").fetchall()]
        expected_tables = ["dim_mandi", "fact_arrivals", "fact_prices", "fact_transport", "fact_weather"]
        for tbl in expected_tables:
            assert tbl in tables, f"Table {tbl} missing from DuckDB database."
    finally:
        conn.close()


def test_dim_mandi_count():
    conn = db_manager.get_connection(read_only=True)
    try:
        count = conn.execute("SELECT COUNT(*) FROM dim_mandi").fetchone()[0]
        assert count > 0, "dim_mandi table is empty."
    finally:
        conn.close()
