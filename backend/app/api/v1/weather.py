from typing import Optional
from fastapi import APIRouter, Depends
import duckdb

from backend.app.db.duckdb import get_db
from backend.app.models.common import ResponseMetadata
from backend.app.utils.validation import validate_date_range
from backend.app.repositories.weather import WeatherRepository

router = APIRouter()


@router.get("/weather/trend")
def get_weather_trend(
    sensor_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    validate_date_range(date_from, date_to)
    repo = WeatherRepository(conn)
    series = repo.get_daily_weather_trend(sensor_id=sensor_id, date_from=date_from, date_to=date_to)
    
    meta = ResponseMetadata(
        date_from=date_from,
        date_to=date_to,
        filters={"sensor_id": sensor_id} if sensor_id else {},
        mapping_status="unmapped",
        message="Weather observations are currently available at sensor level."
    )
    return {
        "data": series,
        "series": series,
        "metadata": meta
    }


@router.get("/weather/rainfall")
def get_weather_rainfall(
    sensor_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    validate_date_range(date_from, date_to)
    repo = WeatherRepository(conn)
    rainfall_series = repo.get_daily_rainfall(sensor_id=sensor_id, date_from=date_from, date_to=date_to)
    
    meta = ResponseMetadata(
        date_from=date_from,
        date_to=date_to,
        filters={"sensor_id": sensor_id} if sensor_id else {},
        mapping_status="unmapped",
        message="Weather observations are currently available at sensor level."
    )
    return {
        "data": rainfall_series,
        "series": rainfall_series,
        "rainfall_series": rainfall_series,
        "metadata": meta
    }


@router.get("/weather/events")
def get_weather_events(
    sensor_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    validate_date_range(date_from, date_to)
    repo = WeatherRepository(conn)
    events_series = repo.get_weather_events(sensor_id=sensor_id, date_from=date_from, date_to=date_to)
    
    meta = ResponseMetadata(
        date_from=date_from,
        date_to=date_to,
        filters={"sensor_id": sensor_id} if sensor_id else {},
        mapping_status="unmapped",
        message="Weather observations are currently available at sensor level."
    )
    return {
        "data": events_series,
        "series": events_series,
        "events_series": events_series,
        "metadata": meta
    }


@router.get("/weather/sensors")
def get_weather_sensors(conn: duckdb.DuckDBPyConnection = Depends(get_db)):
    repo = WeatherRepository(conn)
    sensors = repo.get_sensors_summary()
    
    meta = ResponseMetadata(
        mapping_status="unmapped",
        message="Weather observations are currently available at sensor level."
    )
    return {
        "data": sensors,
        "sensors": sensors,
        "metadata": meta
    }


@router.get("/weather/extremes")
def get_weather_extremes(
    sensor_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    validate_date_range(date_from, date_to)
    repo = WeatherRepository(conn)
    extremes_data = repo.get_weather_extremes(sensor_id=sensor_id, date_from=date_from, date_to=date_to)
    
    meta = ResponseMetadata(
        date_from=date_from,
        date_to=date_to,
        filters={"sensor_id": sensor_id} if sensor_id else {},
        mapping_status="unmapped",
        message="Weather observations are currently available at sensor level."
    )
    return {
        "data": extremes_data,
        "extremes": extremes_data.get("extremes", {}),
        "top_temperature_readings": extremes_data.get("top_temperature_readings", []),
        "top_rainfall_readings": extremes_data.get("top_rainfall_readings", []),
        "metadata": meta
    }


@router.get("/weather/calendar")
def get_weather_calendar(
    sensor_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    validate_date_range(date_from, date_to)
    repo = WeatherRepository(conn)
    calendar_data = repo.get_weather_calendar(sensor_id=sensor_id, date_from=date_from, date_to=date_to)
    
    meta = ResponseMetadata(
        date_from=date_from,
        date_to=date_to,
        filters={"sensor_id": sensor_id} if sensor_id else {},
        mapping_status="unmapped",
        message="Weather observations are currently available at sensor level."
    )
    return {
        "data": calendar_data,
        "calendar": calendar_data,
        "metadata": meta
    }

