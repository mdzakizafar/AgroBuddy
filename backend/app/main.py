from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.db.initialization import init_db
from backend.app.api.v1 import (
    filters, overview, arrivals, prices, mandis,
    logistics, weather, risk, insights, agent, forecast
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting AgroBuddy Backend v{settings.VERSION}")
    # Auto-initialize database if duckdb file is missing
    if not settings.DUCKDB_PATH.exists():
        logger.info(f"Database missing at {settings.DUCKDB_PATH}. Executing initialization...")
        init_db()
    yield
    logger.info("Shutting down AgroBuddy Backend.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS configuration for React frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": settings.DUCKDB_PATH.exists()
    }


# Include V1 API Routers
v1_prefix = settings.API_V1_STR
app.include_router(filters.router, prefix=v1_prefix, tags=["Filters"])
app.include_router(overview.router, prefix=v1_prefix, tags=["Command Center"])
app.include_router(arrivals.router, prefix=v1_prefix, tags=["Supply Pulse"])
app.include_router(prices.router, prefix=v1_prefix, tags=["Farmer Price Watch"])
app.include_router(mandis.router, prefix=v1_prefix, tags=["Mandis"])
app.include_router(logistics.router, prefix=v1_prefix, tags=["Logistics Command"])
app.include_router(weather.router, prefix=v1_prefix, tags=["Weather & Operations"])
app.include_router(risk.router, prefix=v1_prefix, tags=["Mandi Risk Engine"])
app.include_router(insights.router, prefix=v1_prefix, tags=["Insight LLM"])
app.include_router(agent.router, prefix=v1_prefix, tags=["AgroBuddy AI Agent"])
app.include_router(forecast.router, prefix=v1_prefix, tags=["Forecast & Planning"])


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled exception on {request.url}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An internal server error occurred.",
                "details": str(exc)
            }
        }
    )
