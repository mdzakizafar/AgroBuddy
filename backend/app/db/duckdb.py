import duckdb
from pathlib import Path
from typing import Generator
from backend.app.core.config import settings
from backend.app.core.logging import logger


class DuckDBManager:
    def __init__(self, db_path: Path = settings.DUCKDB_PATH):
        self.db_path = db_path

    def get_connection(self, read_only: bool = True) -> duckdb.DuckDBPyConnection:
        if not self.db_path.exists() and read_only:
            # If database doesn't exist yet, connect without read_only mode to allow initialization
            logger.warning(f"Database path {self.db_path} does not exist. Opening read-write connection.")
            return duckdb.connect(str(self.db_path), read_only=False)
        return duckdb.connect(str(self.db_path), read_only=read_only)


db_manager = DuckDBManager()


def get_db() -> Generator[duckdb.DuckDBPyConnection, None, None]:
    conn = db_manager.get_connection(read_only=True)
    try:
        yield conn
    finally:
        conn.close()
