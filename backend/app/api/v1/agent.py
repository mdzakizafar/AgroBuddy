from fastapi import APIRouter, Depends
import duckdb

from backend.app.db.duckdb import get_db
from backend.app.models.agent import AgentQueryRequest, AgentQueryResponse
from backend.app.ai.agent import AgroBuddyAIAgent

router = APIRouter()


@router.post("/agent/query", response_model=AgentQueryResponse)
def query_agrobuddy_agent(
    request: AgentQueryRequest,
    conn: duckdb.DuckDBPyConnection = Depends(get_db)
):
    agent = AgroBuddyAIAgent(conn)
    response = agent.process_query(request)
    return response
