import os
import joblib
import numpy as np
import pandas as pd
import duckdb
from pathlib import Path
from typing import Dict, Any, Tuple, List
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb
import mlflow
import mlflow.sklearn
import mlflow.xgboost

from backend.app.core.config import settings
from backend.app.core.logging import logger

ARTIFACTS_DIR = settings.BASE_DIR / "backend" / "app" / "ml" / "artifacts"


class MLForecastingTrainer:
    def __init__(self, duckdb_path: Path = settings.DUCKDB_PATH):
        self.duckdb_path = duckdb_path
        ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
        self.best_model_path = ARTIFACTS_DIR / "best_model.pkl"

    def load_data(self) -> pd.DataFrame:
        conn = duckdb.connect(str(self.duckdb_path), read_only=True)
        try:
            query = """
                SELECT 
                    a.date,
                    a.mandi_id,
                    m.mandi_name,
                    m.district,
                    m.state,
                    a.crop_name,
                    a.arrival_qtl
                FROM fact_arrivals a
                JOIN dim_mandi m ON a.mandi_id = m.mandi_id
                WHERE a.arrival_qtl IS NOT NULL AND a.arrival_qtl > 0
                ORDER BY a.crop_name, a.mandi_id, a.date
            """
            df = conn.execute(query).df()
            df['date'] = pd.to_datetime(df['date'])
            return df
        finally:
            conn.close()

    def engineer_features(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
        df = df.sort_values(['crop_name', 'mandi_id', 'date']).reset_index(drop=True)
        
        # Calendar features
        df['day_of_week'] = df['date'].dt.dayofweek
        df['day_of_month'] = df['date'].dt.day
        df['month'] = df['date'].dt.month
        df['day_of_year'] = df['date'].dt.dayofyear
        
        # Lag features grouped by crop & mandi
        df['lag_1'] = df.groupby(['crop_name', 'mandi_id'])['arrival_qtl'].shift(1)
        df['lag_7'] = df.groupby(['crop_name', 'mandi_id'])['arrival_qtl'].shift(7)
        df['lag_14'] = df.groupby(['crop_name', 'mandi_id'])['arrival_qtl'].shift(14)
        
        # Rolling features
        df['rolling_mean_7'] = df.groupby(['crop_name', 'mandi_id'])['arrival_qtl'].transform(
            lambda x: x.shift(1).rolling(window=7, min_periods=1).mean()
        )
        df['rolling_std_7'] = df.groupby(['crop_name', 'mandi_id'])['arrival_qtl'].transform(
            lambda x: x.shift(1).rolling(window=7, min_periods=1).std()
        ).fillna(0)
        
        # Categorical frequency encoding
        for col in ['crop_name', 'mandi_id', 'district', 'state']:
            freq = df[col].value_counts(normalize=True).to_dict()
            df[f'{col}_freq'] = df[col].map(freq)

        # Drop rows with NaNs caused by lags
        df_clean = df.dropna(subset=['lag_1', 'lag_7', 'lag_14', 'rolling_mean_7']).copy()
        
        feature_cols = [
            'day_of_week', 'day_of_month', 'month', 'day_of_year',
            'lag_1', 'lag_7', 'lag_14', 'rolling_mean_7', 'rolling_std_7',
            'crop_name_freq', 'mandi_id_freq', 'district_freq', 'state_freq'
        ]
        return df_clean, feature_cols

    def train_and_evaluate_all(self) -> Dict[str, Any]:
        logger.info("Starting ML Forecasting training pipeline with MLflow tracking...")
        df_raw = self.load_data()
        df_features, feature_cols = self.engineer_features(df_raw)

        # Chronological train-test split (80% train, 20% test)
        df_sorted = df_features.sort_values('date').reset_index(drop=True)
        split_idx = int(len(df_sorted) * 0.8)
        
        train_df = df_sorted.iloc[:split_idx]
        test_df = df_sorted.iloc[split_idx:]

        X_train, y_train = train_df[feature_cols], train_df['arrival_qtl']
        X_test, y_test = test_df[feature_cols], test_df['arrival_qtl']

        # Setup MLflow experiment
        mlflow.set_experiment("AgroBuddy_Arrivals_Forecasting")
        
        models = {
            "RandomForest": RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42),
            "GradientBoosting": GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42),
            "XGBoost": xgb.XGBRegressor(n_estimators=100, max_depth=6, learning_rate=0.05, random_state=42),
            "RidgeRegression": Ridge(alpha=1.0)
        }

        results = {}
        best_mae = float('inf')
        best_model_name = None
        best_model_obj = None
        best_metrics = {}

        for model_name, model in models.items():
            logger.info(f"Training ML model candidate: {model_name}")
            with mlflow.start_run(run_name=f"Forecast_{model_name}"):
                model.fit(X_train, y_train)
                preds = model.predict(X_test)
                preds = np.clip(preds, a_min=0, a_max=None)  # Non-negative arrivals

                mae = float(mean_absolute_error(y_test, preds))
                rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
                r2 = float(r2_score(y_test, preds))
                mape = float(np.mean(np.abs((y_test - preds) / np.maximum(y_test, 1.0))) * 100)

                # Log parameters & metrics to MLflow
                mlflow.log_param("model_type", model_name)
                mlflow.log_param("num_features", len(feature_cols))
                mlflow.log_metric("mae", mae)
                mlflow.log_metric("rmse", rmse)
                mlflow.log_metric("r2", r2)
                mlflow.log_metric("mape", mape)

                # Log model artifact
                if "XGB" in model_name:
                    mlflow.xgboost.log_model(model, artifact_path="model")
                else:
                    mlflow.sklearn.log_model(model, artifact_path="model")

                results[model_name] = {
                    "mae": mae,
                    "rmse": rmse,
                    "r2": r2,
                    "mape": mape,
                    "model": model
                }

                logger.info(f"Model {model_name} -> MAE: {mae:.2f}, RMSE: {rmse:.2f}, R2: {r2:.4f}")

                if mae < best_mae:
                    best_mae = mae
                    best_model_name = model_name
                    best_model_obj = model
                    best_metrics = {"mae": mae, "rmse": rmse, "r2": r2, "mape": mape}

        # Tag the best run in MLflow
        logger.info(f"Best forecasting model identified: {best_model_name} with MAE {best_mae:.2f}")
        
        # Save best model payload to artifact storage
        payload = {
            "model_name": best_model_name,
            "model": best_model_obj,
            "feature_cols": feature_cols,
            "metrics": best_metrics,
            "crop_freq": df_features['crop_name'].value_counts(normalize=True).to_dict(),
            "mandi_freq": df_features['mandi_id'].value_counts(normalize=True).to_dict(),
            "district_freq": df_features['district'].value_counts(normalize=True).to_dict(),
            "state_freq": df_features['state'].value_counts(normalize=True).to_dict()
        }
        joblib.dump(payload, self.best_model_path)
        logger.info(f"Saved best model artifact to: {self.best_model_path}")

        return {
            "best_model_name": best_model_name,
            "metrics": best_metrics,
            "all_results": {k: {m: v[m] for m in ["mae", "rmse", "r2", "mape"]} for k, v in results.items()}
        }


if __name__ == "__main__":
    trainer = MLForecastingTrainer()
    res = trainer.train_and_evaluate_all()
    print("Training Results Summary:", res)
