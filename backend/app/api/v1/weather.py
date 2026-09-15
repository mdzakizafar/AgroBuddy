from typing import Optional
from fastapi import APIRouter, Depends
import duckdb

import requests
from fastapi import HTTPException

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



'''weather'''
@router.get("/weather/current")
def get_current_weather(
    latitude: float = 30.9010,
    longitude: float = 75.8573
):
    """
    Get current weather for the Agro-Buddy dashboard.

    Default location:
    Ludhiana, Punjab, India

    Can be overridden:
    /weather/current?latitude=28.6139&longitude=77.2090
    """

    url = "https://api.open-meteo.com/v1/forecast"

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": (
            "temperature_2m,"
            "relative_humidity_2m,"
            "apparent_temperature,"
            "precipitation,"
            "rain,"
            "weather_code,"
            "cloud_cover,"
            "wind_speed_10m,"
            "is_day"
        ),
        "timezone": "auto",
        "temperature_unit": "celsius",
        "wind_speed_unit": "kmh",
        "precipitation_unit": "mm"
    }

    try:
        response = requests.get(
            url,
            params=params,
            timeout=10
        )

        response.raise_for_status()

        weather = response.json()

        current = weather.get("current")

        if not current:
            raise HTTPException(
                status_code=502,
                detail="Weather provider returned no current weather data."
            )

        return {
            "data": {
                "temperature": current.get("temperature_2m"),
                "humidity": current.get("relative_humidity_2m"),
                "apparent_temperature": current.get(
                    "apparent_temperature"
                ),
                "precipitation": current.get("precipitation"),
                "rain": current.get("rain"),
                "weather_code": current.get("weather_code"),
                "cloud_cover": current.get("cloud_cover"),
                "wind_speed": current.get("wind_speed_10m"),
                "is_day": current.get("is_day"),
                "time": current.get("time"),
            },
            "location": {
                "latitude": latitude,
                "longitude": longitude
            },
            "timezone": weather.get("timezone"),
            "source": "Open-Meteo"
        }

    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to fetch current weather: {str(exc)}"
        )