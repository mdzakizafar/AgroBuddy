import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "AgroBuddy Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Paths
    BASE_DIR: Path = BASE_DIR
    DATA_DIR: Path = BASE_DIR / "data" / "processed"
    DUCKDB_PATH: Path = BASE_DIR / "duckdb" / "agrobuddy.duckdb"
    
    # Groq Configuration (Models separated as per requirement)
    GROQ_API_KEY: str = ""
    INSIGHT_MODEL: str = "llama-3.3-70b-versatile"
    AGENT_MODEL: str = "llama-3.3-70b-versatile"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
