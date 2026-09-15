from typing import Any, Dict, List, Optional
import duckdb
import pandas as pd
from backend.app.models.common import FilterParams
from backend.app.utils.validation import sanitize_nans


class WeatherRepository:
    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.conn = conn

    def get_weather_trend(self, sensor_id: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None) -> List[Dict[str, Any]]:
        return self.get_daily_weather_trend(sensor_id=sensor_id, date_from=date_from, date_to=date_to)

    def get_daily_weather_trend(self, sensor_id: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None) -> List[Dict[str, Any]]:
        where_clauses = ["sensor_id IS NOT NULL AND UPPER(sensor_id) NOT IN ('UNKNOWN', 'UNASSIGNED', 'NONE', '')"]
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
                timestamp::DATE::VARCHAR AS date,
                timestamp::DATE::VARCHAR AS timestamp,
                AVG(temperature_c) AS avg_temperature_c,
                AVG(temperature_c) AS temperature_c,
                MAX(temperature_c) AS max_temperature_c,
                MIN(temperature_c) AS min_temperature_c,
                AVG(rainfall_mm) AS avg_rainfall_mm,
                AVG(rainfall_mm) AS rainfall_mm,
                SUM(rainfall_mm) AS total_rainfall_mm,
                AVG(humidity_percent) AS avg_humidity_percent
            FROM fact_weather
            WHERE {where_str}
            GROUP BY timestamp::DATE
            ORDER BY date ASC
        """
        df = self.conn.execute(query, params).df()
        return sanitize_nans(df.to_dict(orient="records"))

    def get_daily_rainfall(self, sensor_id: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None) -> List[Dict[str, Any]]:
        where_clauses = ["sensor_id IS NOT NULL AND UPPER(sensor_id) NOT IN ('UNKNOWN', 'UNASSIGNED', 'NONE', '')"]
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
                timestamp::DATE::VARCHAR AS date,
                SUM(rainfall_mm) AS total_rainfall_mm,
                AVG(rainfall_mm) AS avg_rainfall_mm,
                SUM(CASE WHEN is_heavy_rain_flag THEN 1 ELSE 0 END)::INT AS heavy_rain_events
            FROM fact_weather
            WHERE {where_str}
            GROUP BY timestamp::DATE
            ORDER BY date ASC
        """
        df = self.conn.execute(query, params).df()
        return sanitize_nans(df.to_dict(orient="records"))

    def get_weather_events(self, sensor_id: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None) -> List[Dict[str, Any]]:
        where_clauses = ["sensor_id IS NOT NULL AND UPPER(sensor_id) NOT IN ('UNKNOWN', 'UNASSIGNED', 'NONE', '')"]
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
                timestamp::DATE::VARCHAR AS date,
                SUM(CASE WHEN is_heatwave_flag THEN 1 ELSE 0 END)::INT AS heatwave_events,
                SUM(CASE WHEN is_heavy_rain_flag THEN 1 ELSE 0 END)::INT AS heavy_rain_events
            FROM fact_weather
            WHERE {where_str}
            GROUP BY timestamp::DATE
            ORDER BY date ASC
        """
        df = self.conn.execute(query, params).df()
        return sanitize_nans(df.to_dict(orient="records"))

    def get_sensors_status(self) -> List[Dict[str, Any]]:
        return self.get_sensors_summary()

    def get_sensors_summary(self) -> List[Dict[str, Any]]:
        query = """
            WITH ranked_readings AS (
                SELECT 
                    sensor_id,
                    timestamp AS latest_timestamp,
                    temperature_c AS latest_temperature_c,
                    rainfall_mm AS latest_rainfall_mm,
                    humidity_percent AS latest_humidity_percent,
                    is_heatwave_flag AS is_heatwave,
                    is_heavy_rain_flag AS is_heavy_rain,
                    ROW_NUMBER() OVER (PARTITION BY sensor_id ORDER BY timestamp DESC) as rn
                FROM fact_weather
                WHERE sensor_id IS NOT NULL AND UPPER(sensor_id) NOT IN ('UNKNOWN', 'UNASSIGNED', 'NONE', '')
            ),
            summary AS (
                SELECT 
                    sensor_id,
                    AVG(temperature_c) AS avg_temperature_c,
                    MAX(temperature_c) AS max_temperature_c,
                    SUM(rainfall_mm) AS total_rainfall_mm,
                    SUM(CASE WHEN is_heatwave_flag THEN 1 ELSE 0 END)::INT AS heatwave_events,
                    SUM(CASE WHEN is_heavy_rain_flag THEN 1 ELSE 0 END)::INT AS heavy_rain_events
                FROM fact_weather
                WHERE sensor_id IS NOT NULL AND UPPER(sensor_id) NOT IN ('UNKNOWN', 'UNASSIGNED', 'NONE', '')
                GROUP BY sensor_id
            )
            SELECT 
                s.sensor_id,
                s.avg_temperature_c,
                s.max_temperature_c,
                s.total_rainfall_mm,
                s.heatwave_events,
                s.heavy_rain_events,
                r.latest_timestamp::VARCHAR AS latest_timestamp,
                r.latest_temperature_c,
                r.latest_rainfall_mm,
                r.latest_humidity_percent,
                COALESCE(r.is_heatwave, FALSE) AS is_heatwave,
                COALESCE(r.is_heavy_rain, FALSE) AS is_heavy_rain
            FROM summary s
            LEFT JOIN ranked_readings r ON s.sensor_id = r.sensor_id AND r.rn = 1
            ORDER BY s.sensor_id ASC
        """
        df = self.conn.execute(query).df()
        return sanitize_nans(df.to_dict(orient="records"))

    def get_weather_extremes(self, sensor_id: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None) -> Dict[str, Any]:
        where_clauses = ["sensor_id IS NOT NULL AND UPPER(sensor_id) NOT IN ('UNKNOWN', 'UNASSIGNED', 'NONE', '')"]
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
                AVG(temperature_c) AS avg_temperature_c,
                SUM(rainfall_mm) AS total_rainfall_mm,
                COUNT(DISTINCT CASE WHEN is_heatwave_flag THEN timestamp::DATE END)::INT AS heatwave_days,
                COUNT(DISTINCT CASE WHEN is_heavy_rain_flag THEN timestamp::DATE END)::INT AS heavy_rain_days,
                COUNT(DISTINCT sensor_id)::INT AS active_sensors,
                SUM(CASE WHEN is_heatwave_flag THEN 1 ELSE 0 END)::INT AS heatwave_event_count,
                SUM(CASE WHEN is_heavy_rain_flag THEN 1 ELSE 0 END)::INT AS heavy_rain_event_count,
                MAX(temperature_c) AS highest_temperature_c,
                MAX(rainfall_mm) AS highest_rainfall_mm,
                SUM(CASE WHEN is_negative_rainfall_anomaly THEN 1 ELSE 0 END)::INT AS negative_rainfall_anomalies_count
            FROM fact_weather
            WHERE {where_str}
        """
        row = self.conn.execute(summary_query, params).fetchone()
        extremes_summary = {
            "avg_temperature_c": float(row[0]) if row[0] is not None else None,
            "total_rainfall_mm": float(row[1]) if row[1] is not None else 0.0,
            "heatwave_days": int(row[2]) if row[2] is not None else 0,
            "heavy_rain_days": int(row[3]) if row[3] is not None else 0,
            "active_sensors": int(row[4]) if row[4] is not None else 0,
            "heatwave_event_count": int(row[5]) if row[5] is not None else 0,
            "heavy_rain_event_count": int(row[6]) if row[6] is not None else 0,
            "highest_temperature_c": float(row[7]) if row[7] is not None else None,
            "highest_rainfall_mm": float(row[8]) if row[8] is not None else None,
            "negative_rainfall_anomalies_count": int(row[9]) if row[9] is not None else 0,
        }

        top_temp_query = f"""
            SELECT sensor_id, timestamp::VARCHAR AS timestamp, temperature_c, rainfall_mm, humidity_percent
            FROM fact_weather
            WHERE {where_str} AND temperature_c IS NOT NULL
            ORDER BY temperature_c DESC
            LIMIT 5
        """
        top_temp = self.conn.execute(top_temp_query, params).df().to_dict(orient="records")

        top_rain_query = f"""
            SELECT sensor_id, timestamp::VARCHAR AS timestamp, temperature_c, rainfall_mm, humidity_percent
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

    def get_weather_calendar(self, sensor_id: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None) -> List[Dict[str, Any]]:
        where_clauses = ["sensor_id IS NOT NULL AND UPPER(sensor_id) NOT IN ('UNKNOWN', 'UNASSIGNED', 'NONE', '')"]
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
                STRFTIME(timestamp, '%Y-%m') AS month_key,
                STRFTIME(timestamp, '%b') AS month,
                STRFTIME(timestamp, '%Y') AS year,
                COUNT(DISTINCT CASE WHEN is_heatwave_flag THEN timestamp::DATE END)::INT AS heatwave_days,
                SUM(CASE WHEN is_heatwave_flag THEN 1 ELSE 0 END)::INT AS heatwave_events,
                COUNT(DISTINCT CASE WHEN is_heavy_rain_flag THEN timestamp::DATE END)::INT AS heavy_rain_days,
                SUM(CASE WHEN is_heavy_rain_flag THEN 1 ELSE 0 END)::INT AS heavy_rain_events,
                AVG(temperature_c) AS avg_temperature_c,
                MAX(temperature_c) AS max_temperature_c,
                SUM(rainfall_mm) AS total_rainfall_mm
            FROM fact_weather
            WHERE {where_str}
            GROUP BY STRFTIME(timestamp, '%Y-%m'), STRFTIME(timestamp, '%b'), STRFTIME(timestamp, '%Y')
            ORDER BY month_key ASC
        """
        df = self.conn.execute(query, params).df()
        return sanitize_nans(df.to_dict(orient="records"))

