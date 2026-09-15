from typing import Any, Dict, List, Optional
import duckdb
import pandas as pd
from backend.app.models.common import FilterParams
from backend.app.utils.validation import sanitize_nans


class ArrivalsRepository:
    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.conn = conn

    def _build_where(self, filters: Optional[FilterParams]) -> (str, list):
        where_clauses = ["1=1"]
        params = []
        if not filters:
            return " AND ".join(where_clauses), params

        if filters.date_from:
            where_clauses.append("a.date >= ?")
            params.append(filters.date_from)
        if filters.date_to:
            where_clauses.append("a.date <= ?")
            params.append(filters.date_to)
        if filters.crop:
            where_clauses.append("LOWER(a.crop_name) = LOWER(?)")
            params.append(filters.crop)
        if filters.mandi_id:
            where_clauses.append("a.mandi_id = ?")
            params.append(filters.mandi_id)

        return " AND ".join(where_clauses), params

    def get_arrival_kpis(self, filters: Optional[FilterParams] = None) -> Dict[str, Any]:
        where_str, params = self._build_where(filters)
        query = f"""
            SELECT 
                COALESCE(SUM(a.arrival_qtl), 0.0) AS total_arrivals_qtl,
                COALESCE(SUM(a.farmer_count), 0) AS total_farmers,
                COUNT(DISTINCT a.mandi_id) AS active_mandi_count,
                COUNT(DISTINCT a.crop_name) AS active_crop_count,
                COALESCE(SUM(CASE WHEN a.is_negative_anomaly THEN 1 ELSE 0 END), 0) AS anomaly_count,
                COALESCE(STDDEV_SAMP(a.arrival_qtl), 0.0) AS arrival_volatility_std,
                COUNT(*) AS total_records
            FROM fact_arrivals a
            JOIN dim_mandi m ON a.mandi_id = m.mandi_id
            WHERE {where_str}
        """
        extra_where = []
        if filters:
            if filters.district:
                extra_where.append("LOWER(m.district) = LOWER(?)")
                params.append(filters.district)
            if filters.state:
                extra_where.append("LOWER(m.state) = LOWER(?)")
                params.append(filters.state)
            if filters.mandi_type:
                extra_where.append("LOWER(m.mandi_type) = LOWER(?)")
                params.append(filters.mandi_type)
        if extra_where:
            query = query.replace("WHERE " + where_str, f"WHERE {where_str} AND " + " AND ".join(extra_where))

        row = self.conn.execute(query, params).fetchone()
        raw = {
            "total_arrivals_qtl": float(row[0]) if row[0] is not None else 0.0,
            "total_farmers": int(row[1]) if row[1] is not None else 0,
            "active_mandi_count": int(row[2]) if row[2] is not None else 0,
            "active_crop_count": int(row[3]) if row[3] is not None else 0,
            "anomaly_count": int(row[4]) if row[4] is not None else 0,
            "arrival_volatility_std": float(row[5]) if row[5] is not None else 0.0,
            "total_records": int(row[6]) if row[6] is not None else 0
        }
        return sanitize_nans(raw)

    def get_arrival_trend(self, filters: Optional[FilterParams] = None) -> List[Dict[str, Any]]:
        where_str, params = self._build_where(filters)
        query = f"""
            SELECT 
                a.date::VARCHAR AS date,
                SUM(a.arrival_qtl) AS arrival_qtl,
                SUM(a.farmer_count)::INT AS farmer_count
            FROM fact_arrivals a
            JOIN dim_mandi m ON a.mandi_id = m.mandi_id
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

        query += " GROUP BY a.date ORDER BY a.date"
        df = self.conn.execute(query, params).df()
        
        # Calculate 7-day moving average
        if not df.empty and "arrival_qtl" in df.columns:
            df["rolling_7d_arrival_qtl"] = df["arrival_qtl"].rolling(window=7, min_periods=1).mean().round(2)
        else:
            df["rolling_7d_arrival_qtl"] = []

        return sanitize_nans(df.to_dict(orient="records"))

    def get_arrivals_by_crop(self, filters: Optional[FilterParams] = None) -> List[Dict[str, Any]]:
        where_str, params = self._build_where(filters)
        query = f"""
            WITH crop_agg AS (
                SELECT 
                    a.crop_name,
                    SUM(a.arrival_qtl) AS arrival_qtl,
                    SUM(a.farmer_count)::INT AS farmer_count
                FROM fact_arrivals a
                JOIN dim_mandi m ON a.mandi_id = m.mandi_id
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

        query += """
                GROUP BY a.crop_name
            ),
            tot AS (
                SELECT COALESCE(SUM(arrival_qtl), 0.0) AS grand_total FROM crop_agg
            )
            SELECT 
                c.crop_name,
                c.arrival_qtl,
                CASE WHEN t.grand_total > 0 THEN (c.arrival_qtl / t.grand_total) * 100.0 ELSE 0.0 END AS share_percent,
                c.farmer_count
            FROM crop_agg c, tot t
            ORDER BY c.arrival_qtl DESC
        """
        df = self.conn.execute(query, params).df()
        return sanitize_nans(df.to_dict(orient="records"))

    def get_arrival_mix_time_series(self, filters: Optional[FilterParams] = None) -> List[Dict[str, Any]]:
        where_str, params = self._build_where(filters)
        query = f"""
            WITH daily_crop AS (
                SELECT 
                    a.date::VARCHAR AS date,
                    a.crop_name,
                    SUM(a.arrival_qtl) AS arrival_qtl
                FROM fact_arrivals a
                JOIN dim_mandi m ON a.mandi_id = m.mandi_id
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

        query += """
                GROUP BY a.date, a.crop_name
            ),
            daily_tot AS (
                SELECT date, SUM(arrival_qtl) AS day_total
                FROM daily_crop
                GROUP BY date
            )
            SELECT 
                dc.date,
                dc.crop_name,
                dc.arrival_qtl,
                CASE WHEN dt.day_total > 0 THEN (dc.arrival_qtl / dt.day_total) * 100.0 ELSE 0.0 END AS share_percent
            FROM daily_crop dc
            JOIN daily_tot dt ON dc.date = dt.date
            ORDER BY dc.date, dc.arrival_qtl DESC
        """
        df = self.conn.execute(query, params).df()
        return sanitize_nans(df.to_dict(orient="records"))

    def get_arrival_volatility(self, filters: Optional[FilterParams] = None) -> List[Dict[str, Any]]:
        where_str, params = self._build_where(filters)
        query = f"""
            WITH daily_crop AS (
                SELECT 
                    a.crop_name,
                    a.date,
                    SUM(a.arrival_qtl) AS daily_qtl
                FROM fact_arrivals a
                JOIN dim_mandi m ON a.mandi_id = m.mandi_id
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

        query += """
                GROUP BY a.crop_name, a.date
            )
            SELECT 
                crop_name,
                AVG(daily_qtl) AS mean_daily_arrival,
                STDDEV_SAMP(daily_qtl) AS std_daily_arrival,
                CASE WHEN AVG(daily_qtl) > 0 THEN (STDDEV_SAMP(daily_qtl) / AVG(daily_qtl)) * 100.0 ELSE 0.0 END AS volatility
            FROM daily_crop
            GROUP BY crop_name
            ORDER BY volatility DESC
        """
        df = self.conn.execute(query, params).df()
        return sanitize_nans(df.to_dict(orient="records"))

    def get_arrivals_by_mandi(self, filters: Optional[FilterParams] = None) -> List[Dict[str, Any]]:
        where_str, params = self._build_where(filters)
        query = f"""
            SELECT 
                a.mandi_id,
                m.mandi_name,
                m.district,
                SUM(a.arrival_qtl) AS total_arrival_qtl,
                SUM(a.farmer_count)::INT AS farmer_count,
                CASE WHEN SUM(a.farmer_count) > 0 THEN SUM(a.arrival_qtl) / SUM(a.farmer_count) ELSE 0.0 END AS avg_qtl_per_farmer
            FROM fact_arrivals a
            JOIN dim_mandi m ON a.mandi_id = m.mandi_id
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

        query += " GROUP BY a.mandi_id, m.mandi_name, m.district ORDER BY total_arrival_qtl DESC"
        df = self.conn.execute(query, params).df()
        return sanitize_nans(df.to_dict(orient="records"))
