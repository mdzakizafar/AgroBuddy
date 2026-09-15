from typing import Any, Dict, List, Optional
import duckdb
import pandas as pd
from backend.app.models.common import FilterParams
from backend.app.utils.validation import sanitize_nans


class PricesRepository:
    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.conn = conn

    def _build_where(self, filters: Optional[FilterParams]) -> (str, list):
        where_clauses = ["1=1"]
        params = []
        if not filters:
            return " AND ".join(where_clauses), params

        if filters.date_from:
            where_clauses.append("p.date >= ?")
            params.append(filters.date_from)
        if filters.date_to:
            where_clauses.append("p.date <= ?")
            params.append(filters.date_to)
        if filters.crop:
            where_clauses.append("LOWER(p.crop_name) = LOWER(?)")
            params.append(filters.crop)
        if filters.mandi_id:
            where_clauses.append("p.mandi_id = ?")
            params.append(filters.mandi_id)
        if filters.district:
            where_clauses.append("LOWER(p.district) = LOWER(?)")
            params.append(filters.district)

        return " AND ".join(where_clauses), params

    def get_price_kpis(self, filters: Optional[FilterParams] = None) -> Dict[str, Any]:
        where_str, params = self._build_where(filters)
        query = f"""
            SELECT 
                AVG(p.modal_price) AS avg_modal_price,
                AVG(p.msp) AS avg_msp,
                AVG(p.msp - p.modal_price) AS avg_msp_gap,
                COUNT(*) AS total_records,
                SUM(CASE WHEN p.modal_price < p.msp THEN 1 ELSE 0 END) AS below_msp_count,
                CASE WHEN COUNT(*) > 0 THEN (SUM(CASE WHEN p.modal_price < p.msp THEN 1 ELSE 0 END)::DOUBLE / COUNT(*)::DOUBLE) * 100.0 ELSE 0.0 END AS below_msp_percentage,
                COALESCE(AVG(CASE WHEN p.modal_price < p.msp THEN (p.msp - p.modal_price) END), 0.0) AS avg_msp_shortfall
            FROM fact_prices p
            JOIN dim_mandi m ON p.mandi_id = m.mandi_id
            WHERE {where_str}
        """
        if filters:
            if filters.state:
                query += " AND LOWER(m.state) = LOWER(?)"
                params.append(filters.state)
            if filters.mandi_type:
                query += " AND LOWER(m.mandi_type) = LOWER(?)"
                params.append(filters.mandi_type)

        row = self.conn.execute(query, params).fetchone()
        raw = {
            "avg_modal_price": float(row[0]) if row[0] is not None else 0.0,
            "avg_msp": float(row[1]) if row[1] is not None else 0.0,
            "avg_msp_gap": float(row[2]) if row[2] is not None else 0.0,
            "total_records": int(row[3]) if row[3] is not None else 0,
            "below_msp_count": int(row[4]) if row[4] is not None else 0,
            "below_msp_percentage": float(row[5]) if row[5] is not None else 0.0,
            "avg_msp_shortfall": float(row[6]) if row[6] is not None else 0.0
        }
        return sanitize_nans(raw)

    def get_msp_trend_aggregated(self, filters: Optional[FilterParams] = None) -> List[Dict[str, Any]]:
        where_str, params = self._build_where(filters)
        query = f"""
            SELECT 
                p.date::VARCHAR AS date,
                AVG(p.modal_price) AS avg_modal_price,
                AVG(p.msp) AS avg_msp,
                AVG(p.msp - p.modal_price) AS avg_msp_gap,
                (SUM(CASE WHEN p.modal_price < p.msp THEN 1 ELSE 0 END)::DOUBLE / COUNT(*)::DOUBLE) * 100.0 AS below_msp_rate
            FROM fact_prices p
            JOIN dim_mandi m ON p.mandi_id = m.mandi_id
            WHERE {where_str}
        """
        if filters:
            if filters.state:
                query += " AND LOWER(m.state) = LOWER(?)"
                params.append(filters.state)
            if filters.mandi_type:
                query += " AND LOWER(m.mandi_type) = LOWER(?)"
                params.append(filters.mandi_type)

        query += " GROUP BY p.date ORDER BY p.date ASC"
        df = self.conn.execute(query, params).df()
        return sanitize_nans(df.to_dict(orient="records"))

    def get_msp_time_series(self, filters: Optional[FilterParams] = None) -> List[Dict[str, Any]]:
        where_str, params = self._build_where(filters)
        query = f"""
            SELECT 
                p.date::VARCHAR AS date,
                p.crop_name AS crop,
                p.mandi_id,
                m.mandi_name,
                p.district,
                p.modal_price,
                p.msp,
                (p.msp - p.modal_price) AS msp_gap,
                CASE WHEN p.modal_price < p.msp THEN 1 ELSE 0 END AS below_msp_flag
            FROM fact_prices p
            JOIN dim_mandi m ON p.mandi_id = m.mandi_id
            WHERE {where_str}
        """
        if filters:
            if filters.state:
                query += " AND LOWER(m.state) = LOWER(?)"
                params.append(filters.state)
            if filters.mandi_type:
                query += " AND LOWER(m.mandi_type) = LOWER(?)"
                params.append(filters.mandi_type)

        query += " ORDER BY p.date DESC"
        df = self.conn.execute(query, params).df()
        return sanitize_nans(df.to_dict(orient="records"))

    def get_crop_price_pressure(self, filters: Optional[FilterParams] = None) -> List[Dict[str, Any]]:
        where_str, params = self._build_where(filters)
        query = f"""
            SELECT 
                p.crop_name AS crop_name,
                AVG(p.modal_price) AS avg_modal_price,
                AVG(p.msp) AS avg_msp,
                COALESCE(AVG(CASE WHEN p.modal_price < p.msp THEN p.msp - p.modal_price ELSE NULL END), 0) AS avg_msp_gap,
                (SUM(CASE WHEN p.modal_price < p.msp THEN 1 ELSE 0 END)::DOUBLE / COUNT(*)::DOUBLE) * 100.0 AS below_msp_rate,
                (SUM(CASE WHEN p.modal_price < p.msp THEN 1 ELSE 0 END)::DOUBLE / COUNT(*)::DOUBLE) * 100.0 AS below_msp_percentage,
                MIN(p.modal_price) AS min_modal_price,
                MAX(p.modal_price) AS max_modal_price,
                COUNT(*)::INT AS observation_count
            FROM fact_prices p
            JOIN dim_mandi m ON p.mandi_id = m.mandi_id
            WHERE {where_str}
        """
        if filters:
            if filters.state:
                query += " AND LOWER(m.state) = LOWER(?)"
                params.append(filters.state)
            if filters.mandi_type:
                query += " AND LOWER(m.mandi_type) = LOWER(?)"
                params.append(filters.mandi_type)

        query += " GROUP BY p.crop_name ORDER BY below_msp_rate DESC"
        df = self.conn.execute(query, params).df()
        return sanitize_nans(df.to_dict(orient="records"))

    def get_mandi_price_pressure(self, filters: Optional[FilterParams] = None) -> List[Dict[str, Any]]:
        where_str, params = self._build_where(filters)
        query = f"""
            SELECT 
                p.mandi_id,
                m.mandi_name,
                m.district,
                AVG(p.modal_price) AS avg_modal_price,
                AVG(p.msp) AS avg_msp,
                COALESCE(AVG(CASE WHEN p.modal_price < p.msp THEN p.msp - p.modal_price ELSE NULL END), 0) AS avg_msp_gap,
                (SUM(CASE WHEN p.modal_price < p.msp THEN 1 ELSE 0 END)::DOUBLE / COUNT(*)::DOUBLE) * 100.0 AS below_msp_rate,
                (SUM(CASE WHEN p.modal_price < p.msp THEN 1 ELSE 0 END)::DOUBLE / COUNT(*)::DOUBLE) * 100.0 AS below_msp_percentage
            FROM fact_prices p
            JOIN dim_mandi m ON p.mandi_id = m.mandi_id
            WHERE {where_str}
        """
        if filters:
            if filters.state:
                query += " AND LOWER(m.state) = LOWER(?)"
                params.append(filters.state)
            if filters.mandi_type:
                query += " AND LOWER(m.mandi_type) = LOWER(?)"
                params.append(filters.mandi_type)

        query += " GROUP BY p.mandi_id, m.mandi_name, m.district ORDER BY below_msp_rate DESC"
        df = self.conn.execute(query, params).df()
        return sanitize_nans(df.to_dict(orient="records"))
