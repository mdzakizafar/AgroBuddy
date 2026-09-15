import joblib
import pandas as pd
import numpy as np
import duckdb
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.models.forecast import HistoricalItem, ForecastItem

ARTIFACTS_DIR = settings.BASE_DIR / "backend" / "app" / "ml" / "artifacts"
BEST_MODEL_PATH = ARTIFACTS_DIR / "best_model.pkl"


class ArrivalsPredictor:
    def __init__(self, model_path: Path = BEST_MODEL_PATH):
        self.model_path = model_path
        self.payload = None
        self._load_model()

    def _load_model(self):
        if self.model_path.exists():
            try:
                self.payload = joblib.load(self.model_path)
                logger.info(f"Loaded ML forecasting model artifact: {self.payload.get('model_name')}")
            except Exception as e:
                logger.error(f"Error loading ML model from {self.model_path}: {str(e)}")
                self.payload = None
        else:
            logger.warning(f"ML model artifact not found at {self.model_path}")

    @property
    def is_ready(self) -> bool:
        return self.payload is not None and "model" in self.payload

    def predict_forecast(
        self,
        conn: duckdb.DuckDBPyConnection,
        crop: Optional[str] = None,
        mandi_id: Optional[str] = None,
        horizon: int = 7
    ) -> Dict[str, Any]:
        if not self.is_ready:
            return {
                "status": "not_available",
                "message": "ML model artifact is not loaded. Train model using python -m backend.app.ml.trainer",
                "model": "baseline_historical",
                "metrics": {"mae": None, "rmse": None, "r2": None},
                "forecast": []
            }

        model = self.payload["model"]
        model_name = self.payload["model_name"]
        feature_cols = self.payload["feature_cols"]
        metrics = self.payload.get("metrics", {})

        # Fetch recent historical daily arrivals for requested filter
        where_clauses = ["arrival_qtl IS NOT NULL", "arrival_qtl > 0"]
        params = []
        if crop:
            where_clauses.append("LOWER(crop_name) = LOWER(?)")
            params.append(crop)
        if mandi_id:
            where_clauses.append("mandi_id = ?")
            params.append(mandi_id)

        where_str = " AND ".join(where_clauses)
        query = f"""
            SELECT date, SUM(arrival_qtl) as arrival_qtl
            FROM fact_arrivals
            WHERE {where_str}
            GROUP BY date
            ORDER BY date ASC
        """
        df_hist = conn.execute(query, params).df()

        if df_hist.empty:
            # Fallback to overall historical trends if specific filter combination has no data
            df_hist = conn.execute("""
                SELECT date, SUM(arrival_qtl) as arrival_qtl
                FROM fact_arrivals
                GROUP BY date
                ORDER BY date ASC
            """).df()

        df_hist['date'] = pd.to_datetime(df_hist['date'])
        last_date = df_hist['date'].max() if not df_hist.empty else pd.Timestamp.now()

        # Frequencies for feature vector
        crop_freq = self.payload.get("crop_freq", {}).get(crop, 0.1)
        mandi_freq = self.payload.get("mandi_freq", {}).get(mandi_id, 0.05)
        district_freq = 0.05
        state_freq = 0.1

        # Recursive multi-step forecasting
        forecast_items = []
        recent_arrivals = list(df_hist['arrival_qtl'].tail(14).values)
        if not recent_arrivals:
            recent_arrivals = [100.0] * 14
        while len(recent_arrivals) < 14:
            recent_arrivals.insert(0, recent_arrivals[0])

        current_date = last_date
        for i in range(1, horizon + 1):
            current_date += timedelta(days=1)
            
            lag_1 = recent_arrivals[-1]
            lag_7 = recent_arrivals[-7] if len(recent_arrivals) >= 7 else recent_arrivals[0]
            lag_14 = recent_arrivals[-14] if len(recent_arrivals) >= 14 else recent_arrivals[0]
            rolling_mean_7 = float(np.mean(recent_arrivals[-7:]))
            rolling_std_7 = float(np.std(recent_arrivals[-7:]))

            feat_vector = pd.DataFrame([{
                'day_of_week': current_date.dayofweek,
                'day_of_month': current_date.day,
                'month': current_date.month,
                'day_of_year': current_date.dayofyear,
                'lag_1': lag_1,
                'lag_7': lag_7,
                'lag_14': lag_14,
                'rolling_mean_7': rolling_mean_7,
                'rolling_std_7': rolling_std_7,
                'crop_name_freq': crop_freq,
                'mandi_id_freq': mandi_freq,
                'district_freq': district_freq,
                'state_freq': state_freq
            }])[feature_cols]

            pred_val = float(model.predict(feat_vector)[0])
            pred_val = max(1.0, round(pred_val, 2))
            recent_arrivals.append(pred_val)

            # Confidence interval estimation
            std_err = float(metrics.get("rmse", 50.0))
            lower_bound = max(0.0, round(pred_val - 1.96 * std_err, 2))
            upper_bound = round(pred_val + 1.96 * std_err, 2)

            forecast_items.append(
                ForecastItem(
                    date=current_date.strftime("%Y-%m-%d"),
                    predicted_arrival_qtl=pred_val,
                    lower_bound=lower_bound,
                    upper_bound=upper_bound
                )
            )

        return {
            "status": "available",
            "message": f"Forecast generated successfully using trained MLflow model ({model_name}).",
            "model": f"{model_name} (MLflow Experiment Best)",
            "metrics": metrics,
            "forecast": forecast_items
        }
