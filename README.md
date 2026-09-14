# AgroBuddy — Mandi-to-Market Supply Chain Optimizer (Backend)

AgroBuddy is an AgriTech datathon application that optimizes mandi arrivals, farmer price realization (MSP tracking), transport logistics, and operational risks across regional agricultural markets.

This directory contains the complete **FastAPI + DuckDB + Semantic Analytics + Dual Groq AI** backend powering the AgroBuddy frontend.

---

## 🏗️ Architecture Overview

```
Processed Datasets (CSV)
         │
         ▼
  DuckDB Engine (duckdb/agrobuddy.duckdb)
  [dim_mandi, fact_arrivals, fact_prices, fact_transport, fact_weather]
         │
         ▼
  Repositories (duckdb queries with common filter validation)
         │
         ▼
  Semantic Analytics & Risk Engine Layer (Source of Truth)
         ├───► Analytics Context Layer (PageInsightContext) ──► Model #1: Insight LLM (Passive)
         ├───► Typed Capabilities & Query Planning ──────────► Model #2: AgroBuddy AI (Active Agent)
         │                                                            │
         ▼                                                            ▼
  FastAPI V1 Endpoints ◄──────────────────────────────────────── VizSpec Generator
         │
         ▼
  React / ECharts Frontend
```

### Business Logic & Formulas (Enforced)
- **MSP Gap**: `msp_gap = msp - modal_price`
- **Below MSP Flag**: `below_msp_flag = 1` when `modal_price < msp` else `0`
- **Transit Delay**:
  - `expected_hours = distance_km / 40.0`
  - `delay_hours = transit_hours - expected_hours`
  - `is_delayed_flag = 1` when `delay_hours > 2.0` else `0`
- **Weather Constraint**: Weather data is strictly **sensor-level** and NOT mapped to Mandis. No joining or attribution to mandis is performed.

---

## 🤖 Dual Groq AI Architecture

AgroBuddy decouples AI responsibilities into two distinct, independently configurable models:

| Component | Responsibility | Model Config Env | Mode | SQL Execution |
| :--- | :--- | :--- | :--- | :--- |
| **Model #1: Insight LLM** | Passive dashboard page intelligence (explains `InsightContext`) | `INSIGHT_MODEL` | Passive | No |
| **Model #2: AgroBuddy AI Agent** | Active natural language query assistant (produces `VisualizationSpec`) | `AGENT_MODEL` | Active (LangGraph) | No (Calls Analytics APIs) |

> **Graceful AI Degradation**: If Groq API keys are unconfigured or unavailable, AI endpoints gracefully return deterministic structured fallbacks (`AI_PROVIDER_UNAVAILABLE`) while all core dashboard analytics remain 100% operational.

---

## ⚡ Quick Start & Installation

### 1. Environment Setup
Create a Python virtual environment and install dependencies:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt  # Or install fastapi uvicorn duckdb pydantic pydantic-settings pandas groq langgraph pytest python-dotenv httpx
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and provide your Groq API key:
```bash
cp .env.example .env
```
Edit `.env`:
```env
GROQ_API_KEY=your_groq_api_key_here
INSIGHT_MODEL=llama-3.3-70b-versatile
AGENT_MODEL=llama-3.3-70b-versatile
```

### 3. Initialize DuckDB Database
Run the deterministic database initialization script to ingest processed CSVs into `duckdb/agrobuddy.duckdb`:
```bash
python -m backend.scripts.initialize_db
```

### 4. Start FastAPI Server
Launch the backend development server using uvicorn:
```bash
uvicorn backend.app.main:app --reload --port 8000
```
Interactive API Swagger Docs: `http://localhost:8000/docs`

---

## 🧪 Running Automated Tests

Run the complete test suite (covering database schemas, formula accuracy, risk determinism, API schemas, and AI fallbacks):
```bash
pytest backend/tests/ -v
```

---

## 📌 API Endpoint Directory

### 1. Common Filters & Metadata
- `GET /api/v1/filters`: Retrieve global filter options (crops, mandis, districts, states, mandi types).

### 2. Command Center
- `GET /api/v1/overview`: System-wide KPIs, top arrival crops, price pressure mandis, logistics bottlenecks, and alert summaries.

### 3. Supply Pulse (Arrivals)
- `GET /api/v1/arrivals/trend`: Daily arrival volume and farmer count time-series.
- `GET /api/v1/arrivals/by-crop`: Crop breakdown with percentage of total arrivals.
- `GET /api/v1/arrivals/by-mandi`: Mandi-level arrival volume and farmer efficiency.

### 4. Farmer Price Watch
- `GET /api/v1/prices/msp`: Modal price vs MSP time-series data.
- `GET /api/v1/prices/pressure`: Crop and mandi level MSP pressure rankings.

### 5. Mandi Master & Drill-down
- `GET /api/v1/mandis`: List all mandi master entries.
- `GET /api/v1/mandis/{mandi_id}`: Comprehensive mandi detail (arrivals, prices, logistics).
- `GET /api/v1/mandis/{mandi_id}/market-state`: Unified operational market state for drill-down.

### 6. Logistics Command
- `GET /api/v1/logistics/summary`: Logistics network KPIs (transit hours, delay hours, delayed trip %).
- `GET /api/v1/logistics/delays`: Time-series of daily delay hours and delay percentages.
- `GET /api/v1/logistics/by-mandi`: Mandi and route-level delay analytics.

### 7. Weather & Operations
- `GET /api/v1/weather/trend`: Sensor-level weather time-series.
- `GET /api/v1/weather/extremes`: Heatwaves, heavy rainfall events, and temperature extremes.
- `GET /api/v1/weather/sensors`: Sensor status list with active alert flags.

### 8. Mandi Risk Engine
- `GET /api/v1/risk/mandis`: Ranked mandi vulnerability risk scores (combining price pressure, arrival instability, logistics delay).
- `GET /api/v1/risk/mandis/{mandi_id}`: Single mandi risk breakdown.

### 9. AI Intelligence
- `POST /api/v1/insights`: Request passive page insights (Model #1).
- `POST /api/v1/agent/query`: Execute natural language data queries (Model #2 -> `VisualizationSpec`).

### 10. Forecast & Planning (Contract)
- `GET /api/v1/forecast/arrivals`: Horizon forecasting API contract.
