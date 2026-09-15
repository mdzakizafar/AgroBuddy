# AgroBuddy — Mandi-to-Market Supply Chain Optimizer 🌾⚡

[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19.0+-61DAFB.svg?style=for-the-badge&logo=react)](https://react.dev/)
[![DuckDB](https://img.shields.io/badge/DuckDB-0.9.2+-FFF000.svg?style=for-the-badge&logo=duckdb)](https://duckdb.org/)
[![Groq Llama-3.3-70B](https://img.shields.io/badge/Groq-Llama--3.3--70B-f55036.svg?style=for-the-badge)](https://groq.com/)
[![Docker Ready](https://img.shields.io/badge/Docker-Enabled-2496ED.svg?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![Pytest Suite](https://img.shields.io/badge/Pytest-22%2F22%20Passed-brightgreen.svg?style=for-the-badge&logo=pytest)](https://docs.pytest.org/)

**AgroBuddy** is an end-to-end AgriTech analytics application that optimizes mandi arrivals, tracks farmer Minimum Support Price (MSP) realization, resolves transit bottlenecks, monitors sensor-level weather risks, and delivers multi-intent natural language AI intelligence across agricultural supply chain networks.

---

## 🏗️ System Architecture & Data Pipeline

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                        PROCESSED DATASETS (CSV / PARQUET)                         │
│       [dim_mandi, fact_arrivals, fact_prices, fact_transport, fact_weather]       │
└────────────────────────────────────────┬──────────────────────────────────────────┘
                                         │
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                       DUCKDB ANALYTICS ENGINE (IN-MEMORY)                         │
│                    duckdb/agrobuddy.duckdb (High-Speed OLAP)                      │
└────────────────────────────────────────┬──────────────────────────────────────────┘
                                         │
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                    SEMANTIC ANALYTICS & MANDI RISK ENGINE                         │
│                 Source of Truth Business Logic & Metric Repository                │
└──────────────────┬─────────────────────────────────────────────┬──────────────────┘
                   │                                             │
                   ▼                                             ▼
┌──────────────────────────────────────┐       ┌────────────────────────────────────┐
│      MODEL #1: INSIGHT LLM           │       │    MODEL #2: AGROBUDDY AI AGENT     │
│   (Passive Page Intelligence)        │       │  (Active Natural Language Copilot) │
│   • Llama-3.3-70B via Groq API       │       │  • LangGraph Multi-Intent Planning │
│   • Instant Page Summary & Context   │       │  • Generates VisualizationSpec     │
└──────────────────┬───────────────────┘       └─────────────────┬──────────────────┘
                   │                                             │
                   └─────────────────────┬───────────────────────┘
                                         │
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           FASTAPI V1 API ENDPOINTS                                │
│        /api/v1/overview, /arrivals, /prices, /logistics, /weather, /risk, /agent     │
└────────────────────────────────────────┬──────────────────────────────────────────┘
                                         │
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           REACT 19 + ECHARTS FRONTEND                             │
│       • Executive Command Center        • Omnipresent AI Assistant Drawer          │
│       • Farmer Price Watch & MSP Gap   • Quick Command-K Search Palette           │
│       • Logistics & Weather Operations  • Mandi Geographic Vulnerability Risk Map  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧮 Enforced Business Logic & Formulas

AgroBuddy implements strict, deterministic agricultural metrics across both backend analytical endpoints and frontend chart views:

| Metric | Formula / Logic | Description |
| :--- | :--- | :--- |
| **MSP Gap** | $\text{msp\_gap} = \text{msp} - \text{modal\_price}$ | Measures exact per-quintal financial loss to farmers when realized price falls below floor price. |
| **Below MSP Flag** | $1 \text{ if } \text{modal\_price} < \text{msp} \text{ else } 0$ | Flag applied to transactions sold below statutory minimum support price. |
| **Expected Transit Hours** | $\text{expected\_hours} = \frac{\text{distance\_km}}{40.0}$ | Standard truck transit velocity benchmark (40 km/h baseline). |
| **Transit Delay Hours** | $\text{delay\_hours} = \text{transit\_hours} - \text{expected\_hours}$ | Net delay against expected SLA transit time. |
| **Delayed Trip Flag** | $1 \text{ if } \text{delay\_hours} > 2.0 \text{ else } 0$ | Triggers logistics alert when transit delay exceeds 2 hours. |
| **Mandi Risk Vulnerability** | $\text{Weighted Score}(\text{Price Pressure}, \text{Arrival Volatility}, \text{Logistics Delay})$ | Ranked mandi risk index bounding scores from $0.0$ (Safe) to $100.0$ (Critical). |
| **Sensor Isolation** | Sensor-level telemetry without unverified mandi joins | Weather metrics are strictly sensor-level and never forcibly joined to mandis. |

---

## 🤖 Dual Groq AI Copilot & Guardrails

AgroBuddy decouples AI responsibilities into two distinct, independently configurable models powered by **Groq Llama-3.3-70B**:

```
                              ┌────────────────────────┐
                              │  User Query / Request  │
                              └───────────┬────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │   Out-of-Scope & Noise Guard    │
                         └────────────────┬────────────────┘
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   │ Valid Domain Query                          │ Out-of-Scope / Noise
                   ▼                                             ▼
┌─────────────────────────────────────┐      ┌───────────────────────────────────────┐
│     LangGraph Intent Classifier     │      │   Structured Friendly Refusal Spec    │
│ [ARRIVALS, PRICES, LOGISTICS, RISK] │      │    "Please ask an AgriTech query"     │
└──────────────────┬──────────────────┘      └───────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│ Analytics Repository API Call       │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│ VisualizationSpec Generator & Charts│
└─────────────────────────────────────┘
```

### 1. Model #1: Passive Insight LLM (`INSIGHT_MODEL`)
- Generates structured, deterministic executive page summaries (`headline`, `summary`, `key_findings`, `severity`, `recommendation`).
- Configured via environment variable `INSIGHT_MODEL=llama-3.3-70b-versatile`.

### 2. Model #2: Active Agent Copilot (`AGENT_MODEL`)
- Multi-intent natural language query planning with LangGraph logic.
- Evaluates 19+ complex domain queries (e.g., *"Which mandis have high MSP gap?"*, *"Show weather heatwave alerts"*, *"Rank top arrival mandis for Wheat"*).
- **Graceful Fallback & Guardrails**: If API keys are unconfigured or queries contain noise/gibberish, the agent returns structured fallback responses without breaking UI views.

---

## 💻 Frontend Dashboard & Visual Features

- **Executive Command Center**: Live mandi telemetry grid (72-cell status matrix), output volume cards, supply flow distribution, and real-time operations alerts.
- **Farmer Price Watch**: Modal price vs. MSP floor trend lines, crop pressure bar charts, and distressed trade inspector.
- **Logistics Command**: Transit delay trends, route efficiency matrices, and delay hour heatmaps.
- **Weather & Operations**: Dual-axis temperature and rainfall telemetry charts, heatwave alerts, and sensor status list.
- **Mandi Risk Engine**: Ranked vulnerability scores with interactive mandi inspection drawers.
- **Ask AgroBuddy AI Workspace**: Full natural language chat workspace + omnipresent floating AI drawer.
- **Quick Command Palette (<kbd>Ctrl + K</kbd>)**: Keyboard-shortcut modal for searching mandis, crops, districts, and actions.

---

## ⚡ Quick Start (Local Development)

### 1. Environment Setup
```bash
# Clone repository
git clone https://github.com/shayan-codes-405/agro-buddy.git
cd agro-buddy/agro-buddy-main

# Create Python Virtual Environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install Python Backend Dependencies
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` to include your Groq API key:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
INSIGHT_MODEL=llama-3.3-70b-versatile
AGENT_MODEL=llama-3.3-70b-versatile
```

### 3. Initialize DuckDB Database
```bash
python -m backend.scripts.initialize_db
```

### 4. Start Backend Server
```bash
python -m uvicorn backend.app.main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/docs`

### 5. Start Frontend Server
```bash
cd frontend
npm install
npm run dev
```
- Web Application: `http://localhost:3000`

---

## 🐳 Docker & Cloud Deployment

### 1. Local / VPS Container Deployment (Docker Compose)
Launch the full stack (FastAPI Backend + React Frontend + Nginx + DuckDB) with a single command:
```bash
docker compose up -d --build
```
- **Web App**: `http://localhost:3000` or `http://localhost`
- **Backend API**: `http://localhost:8000`

### 2. Cloud Deployment Targets
- **Render / Railway**: Automatic deployment via `render.yaml` blueprint.
- **Vercel**: Frontend deployment configured via `frontend/vercel.json`.
- **Unified SPA Mode**: Serve built React static assets directly from FastAPI on a single port (`python -m uvicorn backend.app.main:app --port 8000`).

For detailed deployment instructions across AWS, Render, Vercel, and DigitalOcean, view [DEPLOYMENT.md](file:///c:/Users/Zaki/Downloads/agro-buddy-main/agro-buddy-main/DEPLOYMENT.md).

---

## 🧪 Automated Testing & Quality Assurance

Run the comprehensive pytest suite covering database schemas, MSP math, transit delay formulas, AI guardrails, and API endpoints:

```bash
pytest backend/tests/ -v
```

```
============================== test session starts ==============================
backend/tests/test_ai.py::test_insights_endpoint_fallback PASSED         [  4%]
backend/tests/test_ai.py::test_agent_query_endpoint PASSED               [  9%]
backend/tests/test_ai.py::test_agent_query_out_of_scope_guardrail PASSED [ 13%]
backend/tests/test_ai.py::test_agent_query_gibberish_noise PASSED        [ 18%]
backend/tests/test_ai.py::test_benchmark_19_queries_coverage PASSED      [ 22%]
...
======================== 22 passed, 1 warning in 8.42s ========================
```

---

## 📌 API Endpoint Directory

### 1. System & Metadata
- `GET /health` — System status check.
- `GET /api/v1/filters` — Global filter options (crops, mandis, districts, states).

### 2. Analytics & Command Center
- `GET /api/v1/overview` — System-wide KPIs, price pressure mandis, and alert summaries.
- `GET /api/v1/arrivals/trend` — Daily arrival volumes and farmer count time-series.
- `GET /api/v1/prices/msp` — Modal price vs MSP floor comparisons.
- `GET /api/v1/prices/pressure` — Crop and mandi level MSP pressure rankings.
- `GET /api/v1/logistics/summary` — Transit delay hours and fleet SLA adherence.
- `GET /api/v1/weather/trend` — Sensor-level weather time-series.
- `GET /api/v1/risk/mandis` — Ranked mandi vulnerability scores.
- `GET /api/v1/forecast/arrivals` — Machine learning arrival horizon predictions.

### 3. AI Intelligence
- `POST /api/v1/insights` — Request passive page insight summaries.
- `POST /api/v1/agent/query` — Execute natural language analytical queries.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
