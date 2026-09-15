from typing import Any, Dict, List, Optional
import duckdb
import pandas as pd
from backend.app.models.common import FilterParams
from backend.app.utils.validation import sanitize_nans


class MandiRiskEngine:
    def __init__(
        self,
        conn: duckdb.DuckDBPyConnection,
        w_price: float = 0.45,
        w_arrival: float = 0.25,
        w_logistics: float = 0.30
    ):
        self.conn = conn
        self.w_price = w_price
        self.w_arrival = w_arrival
        self.w_logistics = w_logistics

    def calculate_mandi_risks(self, filters: Optional[FilterParams] = None, mandi_id_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        # Fetch Mandi Master with coordinates
        mandi_where = ["1=1"]
        mandi_params = []
        if mandi_id_filter:
            mandi_where.append("mandi_id = ?")
            mandi_params.append(mandi_id_filter)
        elif filters and filters.mandi_id:
            mandi_where.append("mandi_id = ?")
            mandi_params.append(filters.mandi_id)

        if filters:
            if filters.district:
                mandi_where.append("LOWER(district) = LOWER(?)")
                mandi_params.append(filters.district)
            if filters.state:
                mandi_where.append("LOWER(state) = LOWER(?)")
                mandi_params.append(filters.state)
            if filters.mandi_type:
                mandi_where.append("LOWER(mandi_type) = LOWER(?)")
                mandi_params.append(filters.mandi_type)

        query = f"SELECT mandi_id, mandi_name, district, state, total_area_acres, latitude, longitude, coordinate_source FROM dim_mandi WHERE {' AND '.join(mandi_where)}"
        mandis_df = self.conn.execute(query, mandi_params).df()

        if mandis_df.empty:
            return []

        # 1. Price Pressure Query per mandi
        price_query = """
            SELECT 
                mandi_id,
                COUNT(*) AS total_price_records,
                SUM(CASE WHEN modal_price < msp THEN 1 ELSE 0 END) AS below_msp_count,
                AVG(msp - modal_price) AS avg_msp_gap,
                AVG(modal_price) AS avg_modal_price,
                AVG(msp) AS avg_msp
            FROM fact_prices
            GROUP BY mandi_id
        """
        price_df = self.conn.execute(price_query).df().set_index("mandi_id")

        # 2. Arrival Instability Query per mandi
        arrival_query = """
            SELECT 
                mandi_id,
                COUNT(*) AS total_arrival_records,
                SUM(arrival_qtl) AS total_arrival_qtl,
                SUM(CASE WHEN is_negative_anomaly THEN 1 ELSE 0 END) AS arrival_anomaly_count,
                STDDEV_SAMP(arrival_qtl) / NULLIF(AVG(arrival_qtl), 0) AS arrival_cv
            FROM fact_arrivals
            GROUP BY mandi_id
        """
        arrival_df = self.conn.execute(arrival_query).df().set_index("mandi_id")

        # 3. Logistics Delay Query per mandi
        logistics_query = """
            SELECT 
                mandi_id,
                COUNT(*) AS total_trips,
                SUM(CASE WHEN is_delayed_flag = 1 THEN 1 ELSE 0 END) AS delayed_trips,
                AVG(delay_hours) AS avg_delay_hours,
                AVG(transit_hours) AS avg_transit_hours
            FROM fact_transport
            GROUP BY mandi_id
        """
        logistics_df = self.conn.execute(logistics_query).df().set_index("mandi_id")

        results = []
        for _, row in mandis_df.iterrows():
            mid = row["mandi_id"]

            below_pct = 0.0
            avg_modal = 0.0
            avg_msp_val = 0.0
            # Compute Price Component Score
            p_score = 0.0
            if mid in price_df.index:
                p_row = price_df.loc[mid]
                tot_p = p_row["total_price_records"]
                below_pct = float((p_row["below_msp_count"] / tot_p * 100.0)) if tot_p > 0 else 0.0
                gap = float(p_row["avg_msp_gap"]) if pd.notnull(p_row["avg_msp_gap"]) else 0.0
                avg_modal = float(p_row["avg_modal_price"]) if pd.notnull(p_row["avg_modal_price"]) else 0.0
                avg_msp_val = float(p_row["avg_msp"]) if pd.notnull(p_row["avg_msp"]) else 0.0
                gap_factor = min(100.0, max(0.0, gap) / 500.0 * 100.0)
                p_score = min(100.0, (below_pct * 0.7) + (gap_factor * 0.3))

            # Compute Arrival Instability Score
            a_score = 0.0
            arrival_vol = 0.0
            if mid in arrival_df.index:
                a_row = arrival_df.loc[mid]
                tot_a = a_row["total_arrival_records"]
                arrival_vol = float(a_row["total_arrival_qtl"]) if pd.notnull(a_row["total_arrival_qtl"]) else 0.0
                anom_pct = float((a_row["arrival_anomaly_count"] / tot_a * 100.0)) if tot_a > 0 else 0.0
                cv = float(a_row["arrival_cv"]) if pd.notnull(a_row["arrival_cv"]) else 0.0
                cv_factor = min(100.0, cv * 100.0)
                a_score = min(100.0, (anom_pct * 0.6) + (cv_factor * 0.4))

            # Compute Logistics Delay Score
            l_score = 0.0
            delayed_pct = 0.0
            avg_delay = 0.0
            if mid in logistics_df.index:
                l_row = logistics_df.loc[mid]
                tot_l = l_row["total_trips"]
                delayed_pct = float((l_row["delayed_trips"] / tot_l * 100.0)) if tot_l > 0 else 0.0
                avg_delay = float(l_row["avg_delay_hours"]) if pd.notnull(l_row["avg_delay_hours"]) else 0.0
                delay_factor = min(100.0, max(0.0, avg_delay) / 10.0 * 100.0)
                l_score = min(100.0, (delayed_pct * 0.7) + (delay_factor * 0.3))

            # Total Weighted Risk Score
            raw_risk = (p_score * self.w_price) + (a_score * self.w_arrival) + (l_score * self.w_logistics)
            risk_score = round(min(100.0, max(0.0, raw_risk)), 1)

            # Standardized 4-level Risk Classification
            if risk_score >= 75.0:
                risk_level = "Critical"
            elif risk_score >= 50.0:
                risk_level = "High"
            elif risk_score >= 25.0:
                risk_level = "Medium"
            else:
                risk_level = "Low"

            # Explanations
            explanation = []
            if p_score >= 50.0:
                explanation.append("Prices are frequently below MSP with high MSP gaps.")
            elif p_score >= 25.0:
                explanation.append("Moderate price pressure observed below MSP.")

            if a_score >= 50.0:
                explanation.append("Arrival volumes exhibit high volatility and negative anomalies.")
            elif a_score >= 25.0:
                explanation.append("Minor arrival volume fluctuations detected.")

            if l_score >= 50.0:
                explanation.append("Transport trips experience significant transit delays above network average.")
            elif l_score >= 25.0:
                explanation.append("Moderate logistics transit delays reported.")

            if not explanation:
                explanation.append("Market operations, prices, and logistics are functioning within normal baseline limits.")

            # Recommendations
            if risk_level in ["Critical", "High"]:
                rec = "Prioritize urgent price support interventions, dispatch logistics clearance, and deploy procurement buffers."
            elif risk_level == "Medium":
                rec = "Monitor price gaps closely and review transport route efficiencies."
            else:
                rec = "Maintain routine operational monitoring."

            lat_val = float(row["latitude"]) if pd.notnull(row["latitude"]) else None
            lng_val = float(row["longitude"]) if pd.notnull(row["longitude"]) else None

            results.append({
                "mandi_id": mid,
                "mandi_name": row["mandi_name"],
                "district": row["district"],
                "state": row["state"],
                "latitude": lat_val,
                "longitude": lng_val,
                "coordinate_source": str(row["coordinate_source"]) if pd.notnull(row["coordinate_source"]) else "unavailable",
                "risk_score": risk_score,
                "risk_level": risk_level,
                "price_pressure_score": round(p_score, 1),
                "arrival_instability_score": round(a_score, 1),
                "logistics_delay_score": round(l_score, 1),
                "arrival_volume": round(arrival_vol, 2),
                "below_msp_percentage": round(below_pct, 2),
                "avg_modal_price": round(avg_modal, 2),
                "avg_msp": round(avg_msp_val, 2),
                "avg_delay_hours": round(avg_delay, 2),
                "delayed_trip_percentage": round(delayed_pct, 2),
                "explanation": explanation,
                "recommended_action": rec,
                "recommended_intervention": rec
            })

        # Sort by risk score descending
        results.sort(key=lambda x: x["risk_score"], reverse=True)
        return sanitize_nans(results)
