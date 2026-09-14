import os
import duckdb
import pandas as pd
from pathlib import Path
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.utils.normalization import normalize_district


def init_db(data_dir: Path = settings.DATA_DIR, db_path: Path = settings.DUCKDB_PATH):
    logger.info(f"Initializing DuckDB database at: {db_path}")
    
    # Ensure directory for duckdb exists
    db_path.parent.mkdir(parents=True, exist_ok=True)
    
    conn = duckdb.connect(str(db_path), read_only=False)
    try:
        # 1. dim_mandi (Normalized Districts)
        mandi_csv = data_dir / "clean_mandi_master.csv"
        if mandi_csv.exists():
            logger.info(f"Loading dim_mandi from {mandi_csv}")
            df_mandi = pd.read_csv(mandi_csv)
            if "district" in df_mandi.columns:
                df_mandi["district"] = df_mandi["district"].apply(normalize_district)
            
            conn.register("df_mandi_temp", df_mandi)
            conn.execute("""
                CREATE OR REPLACE TABLE dim_mandi AS 
                SELECT 
                    CAST(mandi_id AS VARCHAR) AS mandi_id,
                    CAST(mandi_name AS VARCHAR) AS mandi_name,
                    CAST(district AS VARCHAR) AS district,
                    CAST(state AS VARCHAR) AS state,
                    CAST(mandi_type AS VARCHAR) AS mandi_type,
                    CAST(total_area_acres AS DOUBLE) AS total_area_acres
                FROM df_mandi_temp;
            """)
            conn.unregister("df_mandi_temp")
        else:
            logger.warning(f"File not found: {mandi_csv}")

        # 2. fact_arrivals
        arrivals_csv = data_dir / "clean_mandi_arrivals.csv"
        if arrivals_csv.exists():
            logger.info(f"Loading fact_arrivals from {arrivals_csv}")
            conn.execute(f"""
                CREATE OR REPLACE TABLE fact_arrivals AS 
                SELECT 
                    CAST(arrival_id AS VARCHAR) AS arrival_id,
                    CAST(date AS DATE) AS date,
                    CAST(mandi_id AS VARCHAR) AS mandi_id,
                    CAST(crop_name AS VARCHAR) AS crop_name,
                    CAST(variety AS VARCHAR) AS variety,
                    CAST(arrival_qtl AS DOUBLE) AS arrival_qtl,
                    CAST(unit AS VARCHAR) AS unit,
                    CAST(farmer_count AS INTEGER) AS farmer_count,
                    CAST(is_negative_anomaly AS BOOLEAN) AS is_negative_anomaly
                FROM read_csv_auto('{arrivals_csv.as_posix()}');
            """)
        else:
            logger.warning(f"File not found: {arrivals_csv}")

        # 3. fact_prices (Normalized Districts & Formula Enforcement)
        prices_csv = data_dir / "clean_price_and_msp.csv"
        if prices_csv.exists():
            logger.info(f"Loading fact_prices from {prices_csv}")
            df_prices = pd.read_csv(prices_csv)
            if "district" in df_prices.columns:
                df_prices["district"] = df_prices["district"].apply(normalize_district)
            
            conn.register("df_prices_temp", df_prices)
            conn.execute("""
                CREATE OR REPLACE TABLE fact_prices AS 
                SELECT 
                    CAST(record_id AS VARCHAR) AS record_id,
                    CAST(date AS DATE) AS date,
                    CAST(mandi_id AS VARCHAR) AS mandi_id,
                    CAST(district AS VARCHAR) AS district,
                    CAST(crop_name AS VARCHAR) AS crop_name,
                    CAST(min_price AS DOUBLE) AS min_price,
                    CAST(max_price AS DOUBLE) AS max_price,
                    CAST(modal_price AS DOUBLE) AS modal_price,
                    CAST(msp AS DOUBLE) AS msp,
                    COALESCE(CAST(msp_gap AS DOUBLE), CAST(msp AS DOUBLE) - CAST(modal_price AS DOUBLE)) AS msp_gap,
                    CASE WHEN CAST(modal_price AS DOUBLE) < CAST(msp AS DOUBLE) THEN 1 ELSE 0 END AS below_msp_flag
                FROM df_prices_temp;
            """)
            conn.unregister("df_prices_temp")
        else:
            logger.warning(f"File not found: {prices_csv}")

        # 4. fact_transport
        transport_csv = data_dir / "clean_transport_logistics.csv"
        if transport_csv.exists():
            logger.info(f"Loading fact_transport from {transport_csv}")
            conn.execute(f"""
                CREATE OR REPLACE TABLE fact_transport AS 
                SELECT 
                    CAST(trip_id AS VARCHAR) AS trip_id,
                    CAST(mandi_id AS VARCHAR) AS mandi_id,
                    CAST(destination_warehouse AS VARCHAR) AS destination_warehouse,
                    CAST(departure_time AS TIMESTAMP) AS departure_time,
                    CAST(arrival_time AS TIMESTAMP) AS arrival_time,
                    CAST(transit_hours AS DOUBLE) AS transit_hours,
                    CAST(distance_km AS DOUBLE) AS distance_km,
                    CAST(vehicle_no AS VARCHAR) AS vehicle_no,
                    CAST(driver_id AS VARCHAR) AS driver_id,
                    CAST(is_negative_anomaly AS BOOLEAN) AS is_negative_anomaly,
                    (CAST(transit_hours AS DOUBLE) - (CAST(distance_km AS DOUBLE) / 40.0)) AS delay_hours,
                    CASE WHEN (CAST(transit_hours AS DOUBLE) - (CAST(distance_km AS DOUBLE) / 40.0)) > 2.0 THEN 1 ELSE 0 END AS is_delayed_flag
                FROM read_csv_auto('{transport_csv.as_posix()}');
            """)
        else:
            logger.warning(f"File not found: {transport_csv}")

        # 5. fact_weather
        weather_csv = data_dir / "clean_weather_sensors.csv"
        if weather_csv.exists():
            logger.info(f"Loading fact_weather from {weather_csv}")
            conn.execute(f"""
                CREATE OR REPLACE TABLE fact_weather AS 
                SELECT 
                    CAST(sensor_id AS VARCHAR) AS sensor_id,
                    CAST(timestamp AS TIMESTAMP) AS timestamp,
                    CAST(temperature_c AS DOUBLE) AS temperature_c,
                    CAST(rainfall_mm AS DOUBLE) AS rainfall_mm,
                    CAST(humidity_percent AS DOUBLE) AS humidity_percent,
                    CAST(is_fahrenheit_flag AS BOOLEAN) AS is_fahrenheit_flag,
                    CAST(is_negative_rainfall_anomaly AS BOOLEAN) AS is_negative_rainfall_anomaly,
                    CAST(is_heatwave_flag AS BOOLEAN) AS is_heatwave_flag,
                    CAST(is_heavy_rain_flag AS BOOLEAN) AS is_heavy_rain_flag
                FROM read_csv_auto('{weather_csv.as_posix()}');
            """)
        else:
            logger.warning(f"File not found: {weather_csv}")

        logger.info("DuckDB database initialization completed successfully.")
    finally:
        conn.close()
