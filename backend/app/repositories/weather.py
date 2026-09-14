from typing import Any, Dict, List, Optional
import duckdb
import pandas as pd
from backend.app.models.common import FilterParams
from backend.app.utils.validation import sanitize_nans


class WeatherRepository:
    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.conn = conn

    def get_weather_trend(self, sensor_id: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None) -> List[Dict[str, Any]]:
        where_clauses = ["1=1"]
        params = []
        if sensor_id:
            where_clauses.append("sensor_id = ?")
            params.append(sensor_id)
        if date_from:
            where_clauses.append("timestamp >= ?")
            params.append(date_from)
        if date_to:
            where_clauses.append("timestamp <= ?")
            params.append(date_to)

        where_str = " AND ".join(where_clauses)
        query = f"""
            SELECT 
                timestamp::VARCHAR AS timestamp,
                temperature_c,
                rainfall_mm,
                humidity_percent
            FROM fact_weather
            WHERE {where_str}
            ORDER BY timestamp ASC
            LIMIT 500
        """
        df = self.conn.execute(query, params).df()
        return sanitize_nans(df.to_dict(orient="records"))

    def get_weather_extremes(self, sensor_id: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None) -> Dict[str, Any]:
        where_clauses = ["1=1"]
        params = []
        if sensor_id:
            where_clauses.append("sensor_id = ?")
            params.append(sensor_id)
        if date_from:
            where_clauses.append("timestamp >= ?")
            params.append(date_from)
        if date_to:
            where_clauses.append("timestamp <= ?")
            params.append(date_to)

        where_str = " AND ".join(where_clauses)
        summary_query = f"""
            SELECT 
                SUM(CASE WHEN is_heatwave_flag THEN 1 ELSE 0 END) AS heatwave_event_count,
                SUM(CASE WHEN is_heavy_rain_flag THEN 1 ELSE 0 END) AS heavy_rain_event_count,
                MAX(temperature_c) AS highest_temperature_c,
                MAX(rainfall_mm) AS highest_rainfall_mm,
                SUM(CASE WHEN is_negative_rainfall_anomaly THEN 1 ELSE 0 END) AS negative_rainfall_anomalies_count
            FROM fact_weather
            WHERE {where_str}
        """
        row = self.conn.execute(summary_query, params).fetchone()
        extremes_summary = {
            "heatwave_event_count": int(row[0]) if row[0] is not None else 0,
            "heavy_rain_event_count": int(row[1]) if row[1] is not None else 0,
            "highest_temperature_c": float(row[2]) if row[2] is not None else None,
            "highest_rainfall_mm": float(row[3]) if row[3] is not None else None,
            "negative_rainfall_anomalies_count": int(row[4]) if row[4] is not None else 0,
        }

        top_temp_query = f"""
            SELECT timestamp::VARCHAR AS timestamp, temperature_c, rainfall_mm, humidity_percent
            FROM fact_weather
            WHERE {where_str} AND temperature_c IS NOT NULL
            ORDER BY temperature_c DESC
            LIMIT 5
        """
        top_temp = self.conn.execute(top_temp_query, params).df().to_dict(orient="records")

        top_rain_query = f"""
            SELECT timestamp::VARCHAR AS timestamp, temperature_c, rainfall_mm, humidity_percent
            FROM fact_weather
            WHERE {where_str} AND rainfall_mm IS NOT NULL
            ORDER BY rainfall_mm DESC
            LIMIT 5
        """
        top_rain = self.conn.execute(top_rain_query, params).df().to_dict(orient="records")

        res = {
            "extremes": extremes_summary,
            "top_temperature_readings": top_temp,
            "top_rainfall_readings": top_rain
        }
        return sanitize_nans(res)

    def get_sensors_status(self) -> List[Dict[str, Any]]:
        query = """
            WITH ranked AS (
                SELECT 
                    sensor_id,
                    timestamp,
                    temperature_c,
                    rainfall_mm,
                    humidity_percent,
                    is_heatwave_flag,
                    is_heavy_rain_flag,
                    is_negative_rainfall_anomaly,
                    ROW_NUMBER() OVER(PARTITION BY sensor_id ORDER BY timestamp DESC) as rn
                FROM fact_weather
            )
            SELECT 
                sensor_id,
                timestamp::VARCHAR AS latest_timestamp,
                temperature_c AS latest_temperature_c,
                rainfall_mm AS latest_rainfall_mm,
                humidity_percent AS latest_humidity_percent,
                (is_heatwave_flag = 1) AS is_heatwave,
                (is_heavy_rain_flag = 1) AS is_heavy_rain,
                (is_negative_rainfall_anomaly = 1) AS is_rainfall_anomaly
            FROM ranked
            WHERE rn = 1
            ORDER BY sensor_id
        """
        df = self.conn.execute(query).df()
        return sanitize_nans(df.to_dict(orient="records"))
