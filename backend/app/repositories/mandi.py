from typing import Any, Dict, List, Optional
import duckdb
import pandas as pd
from backend.app.models.common import FilterParams


class MandiRepository:
    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.conn = conn

    def get_filter_options(self) -> Dict[str, Any]:
        crops = [row[0] for row in self.conn.execute("SELECT DISTINCT crop_name FROM fact_arrivals WHERE crop_name IS NOT NULL ORDER BY crop_name").fetchall()]
        
        mandis_raw = self.conn.execute("""
            SELECT mandi_id, mandi_name, district, state, mandi_type 
            FROM dim_mandi 
            ORDER BY mandi_name
        """).fetchall()
        
        mandis = [
            {
                "id": row[0],
                "label": row[1],
                "district": row[2],
                "state": row[3],
                "mandi_type": row[4]
            }
            for row in mandis_raw
        ]
        
        districts = [row[0] for row in self.conn.execute("SELECT DISTINCT district FROM dim_mandi WHERE district IS NOT NULL ORDER BY district").fetchall()]
        states = [row[0] for row in self.conn.execute("SELECT DISTINCT state FROM dim_mandi WHERE state IS NOT NULL ORDER BY state").fetchall()]
        mandi_types = [row[0] for row in self.conn.execute("SELECT DISTINCT mandi_type FROM dim_mandi WHERE mandi_type IS NOT NULL ORDER BY mandi_type").fetchall()]
        
        return {
            "crops": crops,
            "mandis": mandis,
            "districts": districts,
            "states": states,
            "mandi_types": mandi_types
        }

    def get_mandis(self, filters: Optional[FilterParams] = None) -> List[Dict[str, Any]]:
        where_clauses = ["1=1"]
        params = []

        if filters:
            if filters.mandi_id:
                where_clauses.append("mandi_id = ?")
                params.append(filters.mandi_id)
            if filters.district:
                where_clauses.append("LOWER(district) = LOWER(?)")
                params.append(filters.district)
            if filters.state:
                where_clauses.append("LOWER(state) = LOWER(?)")
                params.append(filters.state)
            if filters.mandi_type:
                where_clauses.append("LOWER(mandi_type) = LOWER(?)")
                params.append(filters.mandi_type)

        where_str = " AND ".join(where_clauses)
        query = f"""
            SELECT mandi_id, mandi_name, district, state, mandi_type, total_area_acres
            FROM dim_mandi
            WHERE {where_str}
            ORDER BY mandi_name
        """
        df = self.conn.execute(query, params).df()
        df = df.where(pd.notnull(df), None)
        return df.to_dict(orient="records")

    def get_mandi_by_id(self, mandi_id: str) -> Optional[Dict[str, Any]]:
        query = """
            SELECT mandi_id, mandi_name, district, state, mandi_type, total_area_acres
            FROM dim_mandi
            WHERE mandi_id = ?
        """
        res = self.conn.execute(query, [mandi_id]).fetchone()
        if not res:
            return None
        return {
            "mandi_id": res[0],
            "mandi_name": res[1],
            "district": res[2],
            "state": res[3],
            "mandi_type": res[4],
            "total_area_acres": res[5]
        }
