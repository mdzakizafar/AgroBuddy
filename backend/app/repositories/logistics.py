from typing import Any, Dict, List, Optional
import duckdb
import pandas as pd
from backend.app.models.common import FilterParams
from backend.app.utils.validation import sanitize_nans


class LogisticsRepository:
    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.conn = conn

    def _build_where(self, filters: Optional[FilterParams]) -> (str, list):
        where_clauses = ["1=1"]
        params = []
        if not filters:
            return " AND ".join(where_clauses), params

        if filters.date_from:
            where_clauses.append("t.departure_time >= ?")
            params.append(filters.date_from)
        if filters.date_to:
            where_clauses.append("t.departure_time <= ?")
            params.append(filters.date_to)
        if filters.mandi_id:
            where_clauses.append("t.mandi_id = ?")
            params.append(filters.mandi_id)

        return " AND ".join(where_clauses), params

    def get_logistics_kpis(self, filters: Optional[FilterParams] = None) -> Dict[str, Any]:
        where_str, params = self._build_where(filters)
        query = f"""
            SELECT 
                COUNT(*) AS total_trips,
                COALESCE(AVG(t.transit_hours), 0.0) AS average_transit_hours,
                COALESCE(MEDIAN(t.transit_hours), 0.0) AS median_transit_hours,
                COALESCE(AVG(t.delay_hours), 0.0) AS average_delay_hours,
                COALESCE(MEDIAN(t.delay_hours), 0.0) AS median_delay_hours,
                COALESCE(QUANTILE_CONT(t.delay_hours, 0.90), 0.0) AS p90_delay_hours,
                CASE WHEN COUNT(*) > 0 THEN (SUM(t.is_delayed_flag)::DOUBLE / COUNT(*)::DOUBLE) * 100.0 ELSE 0.0 END AS delayed_trip_percentage,
                CASE WHEN COUNT(*) > 0 THEN 100.0 - ((SUM(t.is_delayed_flag)::DOUBLE / COUNT(*)::DOUBLE) * 100.0) ELSE 100.0 END AS on_time_rate,
                COALESCE(AVG(t.distance_km), 0.0) AS average_distance_km,
                COALESCE(SUM(CASE WHEN t.is_negative_anomaly THEN 1 ELSE 0 END), 0) AS anomaly_count
            FROM fact_transport t
            JOIN dim_mandi m ON t.mandi_id = m.mandi_id
            WHERE {where_str}
        """
        if filters:
            if filters.district:
                query += " AND LOWER(m.district) = LOWER(?)"
                params.append(filters.district)
            if filters.state:
                query += " AND LOWER(m.state) = LOWER(?)"
                params.append(filters.state)
            if filters.mandi_type:
                query += " AND LOWER(m.mandi_type) = LOWER(?)"
                params.append(filters.mandi_type)

        row = self.conn.execute(query, params).fetchone()
        raw = {
            "total_trips": int(row[0]) if row[0] is not None else 0,
            "average_transit_hours": float(row[1]) if row[1] is not None else 0.0,
            "median_transit_hours": float(row[2]) if row[2] is not None else 0.0,
            "average_delay_hours": float(row[3]) if row[3] is not None else 0.0,
            "median_delay_hours": float(row[4]) if row[4] is not None else 0.0,
            "p90_delay_hours": float(row[5]) if row[5] is not None else 0.0,
            "delayed_trip_percentage": float(row[6]) if row[6] is not None else 0.0,
            "on_time_rate": float(row[7]) if row[7] is not None else 100.0,
            "average_distance_km": float(row[8]) if row[8] is not None else 0.0,
            "anomaly_count": int(row[9]) if row[9] is not None else 0
        }
        return sanitize_nans(raw)

    def get_delays_time_series(self, filters: Optional[FilterParams] = None) -> List[Dict[str, Any]]:
        where_str, params = self._build_where(filters)
        query = f"""
            SELECT 
                t.departure_time::DATE::VARCHAR AS date,
                AVG(t.transit_hours) AS actual_transit_hours,
                AVG(t.distance_km / 40.0) AS expected_transit_hours,
                MEDIAN(t.transit_hours) AS median_transit_hours,
                MEDIAN(t.delay_hours) AS median_delay_hours,
                AVG(t.delay_hours) AS average_delay_hours,
                (SUM(t.is_delayed_flag)::DOUBLE / COUNT(*)::DOUBLE) * 100.0 AS delayed_trip_percentage
            FROM fact_transport t
            JOIN dim_mandi m ON t.mandi_id = m.mandi_id
            WHERE {where_str}
        """
        if filters:
            if filters.district:
                query += " AND LOWER(m.district) = LOWER(?)"
                params.append(filters.district)
            if filters.state:
                query += " AND LOWER(m.state) = LOWER(?)"
                params.append(filters.state)
            if filters.mandi_type:
                query += " AND LOWER(m.mandi_type) = LOWER(?)"
                params.append(filters.mandi_type)

        query += " GROUP BY t.departure_time::DATE ORDER BY date ASC"
        df = self.conn.execute(query, params).df()
        return sanitize_nans(df.to_dict(orient="records"))

    def get_logistics_by_mandi(self, filters: Optional[FilterParams] = None) -> List[Dict[str, Any]]:
        where_str, params = self._build_where(filters)
        query = f"""
            SELECT 
                t.mandi_id,
                m.mandi_name,
                m.district,
                COUNT(*)::INT AS trip_count,
                AVG(t.transit_hours) AS avg_transit_hours,
                MEDIAN(t.transit_hours) AS median_transit_hours,
                AVG(t.delay_hours) AS avg_delay_hours,
                MEDIAN(t.delay_hours) AS median_delay_hours,
                (SUM(t.is_delayed_flag)::DOUBLE / COUNT(*)::DOUBLE) * 100.0 AS delayed_trip_percentage,
                100.0 - ((SUM(t.is_delayed_flag)::DOUBLE / COUNT(*)::DOUBLE) * 100.0) AS on_time_rate
            FROM fact_transport t
            JOIN dim_mandi m ON t.mandi_id = m.mandi_id
            WHERE {where_str}
        """
        if filters:
            if filters.district:
                query += " AND LOWER(m.district) = LOWER(?)"
                params.append(filters.district)
            if filters.state:
                query += " AND LOWER(m.state) = LOWER(?)"
                params.append(filters.state)
            if filters.mandi_type:
                query += " AND LOWER(m.mandi_type) = LOWER(?)"
                params.append(filters.mandi_type)

        query += " GROUP BY t.mandi_id, m.mandi_name, m.district ORDER BY delayed_trip_percentage DESC"
        df = self.conn.execute(query, params).df()
        return sanitize_nans(df.to_dict(orient="records"))

    def get_route_logistics(self, filters: Optional[FilterParams] = None) -> List[Dict[str, Any]]:
        where_str, params = self._build_where(filters)
        query = f"""
            SELECT 
                t.mandi_id,
                m.mandi_name,
                t.destination_warehouse,
                (m.mandi_name || ' → ' || t.destination_warehouse) AS route,
                COUNT(*)::INT AS trip_count,
                AVG(t.distance_km) AS distance_km,
                AVG(t.distance_km / 40.0) AS expected_hours,
                AVG(t.transit_hours) AS actual_transit_hours,
                AVG(t.delay_hours) AS delay_hours,
                CASE WHEN AVG(t.distance_km / 40.0) > 0 THEN AVG(t.transit_hours) / AVG(t.distance_km / 40.0) ELSE 1.0 END AS efficiency_ratio,
                (SUM(t.is_delayed_flag)::DOUBLE / COUNT(*)::DOUBLE) * 100.0 AS delayed_trip_percentage
            FROM fact_transport t
            JOIN dim_mandi m ON t.mandi_id = m.mandi_id
            WHERE {where_str}
        """
        if filters:
            if filters.district:
                query += " AND LOWER(m.district) = LOWER(?)"
                params.append(filters.district)
            if filters.state:
                query += " AND LOWER(m.state) = LOWER(?)"
                params.append(filters.state)
            if filters.mandi_type:
                query += " AND LOWER(m.mandi_type) = LOWER(?)"
                params.append(filters.mandi_type)

        query += " GROUP BY t.mandi_id, m.mandi_name, t.destination_warehouse ORDER BY delay_hours DESC"
        df = self.conn.execute(query, params).df()
        return sanitize_nans(df.to_dict(orient="records"))
