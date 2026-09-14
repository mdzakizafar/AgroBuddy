from fastapi import APIRouter, Depends
import duckdb

from backend.app.db.duckdb import get_db
from backend.app.repositories.mandi import MandiRepository
from backend.app.models.common import FilterOptionsResponse, ResponseMetadata, MandiOption

router = APIRouter()


@router.get("/filters", response_model=FilterOptionsResponse)
def get_filters(conn: duckdb.DuckDBPyConnection = Depends(get_db)):
    repo = MandiRepository(conn)
    raw = repo.get_filter_options()
    
    mandis = [MandiOption(**m) for m in raw["mandis"]]
    return FilterOptionsResponse(
        crops=raw["crops"],
        mandis=mandis,
        districts=raw["districts"],
        states=raw["states"],
        mandi_types=raw["mandi_types"],
        metadata=ResponseMetadata()
    )
