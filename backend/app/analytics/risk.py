from typing import Any, Dict, List, Optional
import duckdb
from backend.app.models.common import FilterParams


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
        # Fetch Mandi Master
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

        mandis_df = self.conn.execute(
            f"SELECT mandi_id, mandi_name, district, state FROM dim_mandi WHERE {' AND '.join(mandi_where)}",
            mandi_params
        ).df()

        if mandis_df.empty:
            return []

        # 1. Price Pressure Query per mandi
        price_query = """
            SELECT 
                mandi_id,
                COUNT(*) AS total_price_records,
                SUM(CASE WHEN modal_price < msp THEN 1 ELSE 0 END) AS below_msp_count,
                AVG(msp - modal_price) AS avg_msp_gap
            FROM fact_prices
            GROUP BY mandi_id
        """
        price_df = self.conn.execute(price_query).df().set_index("mandi_id")

        # 2. Arrival Instability Query per mandi
        arrival_query = """
            SELECT 
                mandi_id,
                COUNT(*) AS total_arrival_records,
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
                AVG(delay_hours) AS avg_delay_hours
            FROM fact_transport
            GROUP BY mandi_id
        """
        logistics_df = self.conn.execute(logistics_query).df().set_index("mandi_id")

        results = []
        for _, row in mandis_df.iterrows():
            mid = row["mandi_id"]

            # Compute Price Component Score
            p_score = 0.0
            if mid in price_df.index:
                p_row = price_df.loc[mid]
                tot_p = p_row["total_price_records"]
                below_pct = (p_row["below_msp_count"] / tot_p * 100.0) if tot_p > 0 else 0.0
                gap = p_row["avg_msp_gap"] if p_row["avg_msp_gap"] is not None else 0.0
                # Component normalization
                gap_factor = min(100.0, max(0.0, gap) / 500.0 * 100.0)
                p_score = min(100.0, (below_pct * 0.7) + (gap_factor * 0.3))

            # Compute Arrival Instability Score
            a_score = 0.0
            if mid in arrival_df.index:
                a_row = arrival_df.loc[mid]
                tot_a = a_row["total_arrival_records"]
                anom_pct = (a_row["arrival_anomaly_count"] / tot_a * 100.0) if tot_a > 0 else 0.0
                cv = a_row["arrival_cv"] if a_row["arrival_cv"] is not None and not float('nan') == a_row["arrival_cv"] else 0.0
                cv_factor = min(100.0, cv * 100.0)
                a_score = min(100.0, (anom_pct * 0.6) + (cv_factor * 0.4))

            # Compute Logistics Delay Score
            l_score = 0.0
            if mid in logistics_df.index:
                l_row = logistics_df.loc[mid]
                tot_l = l_row["total_trips"]
                delayed_pct = (l_row["delayed_trips"] / tot_l * 100.0) if tot_l > 0 else 0.0
                avg_delay = l_row["avg_delay_hours"] if l_row["avg_delay_hours"] is not None else 0.0
                delay_factor = min(100.0, max(0.0, avg_delay) / 10.0 * 100.0)
                l_score = min(100.0, (delayed_pct * 0.7) + (delay_factor * 0.3))

            # Total Weighted Risk Score
            raw_risk = (p_score * self.w_price) + (a_score * self.w_arrival) + (l_score * self.w_logistics)
            risk_score = round(min(100.0, max(0.0, raw_risk)), 1)

            # Categorize Risk Level
            if risk_score >= 70.0:
                risk_level = "high"
            elif risk_score >= 40.0:
                risk_level = "medium"
            else:
                risk_level = "low"

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
            if risk_level == "high":
                rec = "Prioritize urgent procurement price support and dispatch logistics clearance."
            elif risk_level == "medium":
                rec = "Monitor price gaps closely and review transport route efficiencies."
            else:
                rec = "Maintain routine operational monitoring."

            results.append({
                "mandi_id": mid,
                "mandi_name": row["mandi_name"],
                "district": row["district"],
                "state": row["state"],
                "risk_score": risk_score,
                "risk_level": risk_level,
                "components": {
                    "price_pressure": round(p_score, 1),
                    "arrival_instability": round(a_score, 1),
                    "logistics_delay": round(l_score, 1)
                },
                "explanation": explanation,
                "recommended_action": rec
            })

        # Sort by risk score descending
        results.sort(key=lambda x: x["risk_score"], reverse=True)
        return results
