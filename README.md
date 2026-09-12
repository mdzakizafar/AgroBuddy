# 🌾 AgroBuddy: Mandi-to-Market Supply Chain Intelligence

> **TransOrg AgentIQ Datathon — Track 3: AgriTech Supply Chain Optimizer**  
> An end-to-end data rescue, supply chain analytics, and AI-driven market intelligence platform.

---

## 📌 Executive Summary

Agricultural supply chains generate heterogeneous, noisy data across mandi arrivals, wholesale trading prices, Minimum Support Prices (MSP), IoT weather sensors, and warehouse transport logistics. 

**AgroBuddy** transforms messy raw agricultural data into actionable supply-chain insights. It identifies **supply stress, price pressure (modal prices dropping below MSP), weather impact on arrivals, and logistics bottlenecks** through a reproducible 6-layer architecture:

```text
RAW DATA → DATA RESCUE → CANONICAL MODEL → DUCKDB MART → ANALYTICS & ML → FASTAPI & DASHBOARD → AI ANALYST
```

---

## 📂 Repository Directory Structure

```text
agrobuddy/
├── data/
│   ├── raw/                             # Immutable source datasets (CSV, JSON, XLSX)
│   │   ├── track3_mandi_arrivals.csv
│   │   ├── track3_mandi_master.csv
│   │   ├── track3_price_and_msp.json
│   │   ├── track3_transport_logistics.csv
│   │   └── track3_weather_sensors.xlsx
│   └── processed/                       # Rescued clean outputs (CSV / Parquet)
│       ├── clean_mandi_arrivals.csv
│       └── clean_mandi_master.csv
│
├── notebooks/                           # Reproducible Gate 2 Jupyter Notebooks
│   ├── 01_Mandi_Arrivals_Data_Rescue.ipynb
│   ├── 02_Mandi_Master_Data_Rescue.ipynb
│   ├── 03_Price_and_MSP_Data_Rescue.ipynb
│   ├── 04_Transport_Logistics_Data_Rescue.ipynb
│   └── 05_Weather_Sensors_Data_Rescue.ipynb
│
├── src/                                 # Production Python Rescue Modules
│   └── rescue_arrivals.py
│
├── README.md                            # Project Overview & Execution Guide
└── requirements.txt                     # Python Dependencies
```

---

## 📊 Gate 2 Data Engineering & Rescue Audit

Our data rescue pipeline enforces **zero lazy row drops**, intelligent imputation, unit standardization, and key normalization across all datasets.

### Dataset 1: Mandi Arrivals (`track3_mandi_arrivals.csv`) — COMPLETED ✅

| Audit Metric | Raw State | Rescued / Standardized State | Rationale & Methodology |
| :--- | :---: | :---: | :--- |
| **Total Records** | 25,750 rows | **25,000 rows** | Removed 750 exact duplicate rows to prevent volume inflation (0 genuine data loss). |
| **Missing Units** | 5,004 rows missing | **0 missing** | Extracted embedded unit strings from `arrival_quantity` text (e.g., `"415.88 qtl"`). |
| **Crop Name Aliases** | 36 raw variants | **6 Canonical Categories** | Standardized Hindi (`गेहूं`), Punjabi (`Kanak`), and English (`Gehun`) to *Wheat, Rice, Cotton, Mustard, Maize, Sugarcane*. |
| **Negative Outliers** | 1,233 rows negative | **1,233 corrected** | Fixed logging sign inversions using `abs()` and set `is_negative_anomaly = True`. |
| **Volume Standardisation** | Mixed (`T`, `KG`, `Qtl`) | **5,597,535.54 Qtl** | Converted Tonnes (`x10`) and KGs (`/100`) to **Quintals (Qtl)**. |
| **Date Format** | 5 pattern variants | **100% YYYY-MM-DD** | Parsed mixed date patterns into `ISO-8601 YYYY-MM-DD` with **0 NaNs**. |
| **Missing Farmer Count**| 3,800 rows missing | **0 missing** | Imputed missing farmer counts using crop-wise median volume batch ratios (`arrival_qtl / median_ratio`). |
| **Missing Variety** | 3,627 rows missing | **0 missing** | Imputed missing variety entries with `"Common"`. |

### Dataset 2: Mandi Master (`track3_mandi_master.csv`) — COMPLETED ✅

| Audit Metric | Raw State | Rescued / Standardized State | Rationale & Methodology |
| :--- | :---: | :---: | :--- |
| **Total Master Records** | 60 rows | **57 unique Mandi Master rows** | Deduplicated 3 duplicate primary key entries (`MANDI001`, `MANDI006`, `MANDI031`) to prevent SQL JOIN row multiplication. |
| **Mandi Type Casing** | Mixed (`APMC`, `apmc`, `PRIVATE`, `Private`, `Direct`, `NaN`) | **3 Canonical Enums** (`APMC`, `Private`, `Direct`) | Normalized case variations and imputed 11 missing `mandi_type` entries with mode category (`APMC`). |
| **Missing Location** | 4 missing districts, 4 missing states | **0 missing** | Imputed missing geographic attributes for 8 mandis via location lookup dictionary (0 master rows lost). |
| **Missing Acreage** | 6 missing area rows | **0 missing** | Imputed missing `total_area_acres` using median acreage size of corresponding mandi type (~24-25 acres). |

---

## 🛠️ Datathon Progress Scorecard

- [x] **Phase 1: Dataset 1 — Mandi Arrivals Data Rescue (`01_Mandi_Arrivals_Data_Rescue.ipynb`)**
- [x] **Phase 2: Dataset 2 — Mandi Master Data Rescue (`02_Mandi_Master_Data_Rescue.ipynb`)**
- [ ] **Phase 3: Dataset 3 — Price & MSP Data Rescue (`03_Price_and_MSP_Data_Rescue.ipynb`)**
- [ ] **Phase 4: Dataset 4 — Transport Logistics Data Rescue (`04_Transport_Logistics_Data_Rescue.ipynb`)**
- [ ] **Phase 5: Dataset 5 — Weather Sensors Data Rescue (`05_Weather_Sensors_Data_Rescue.ipynb`)**
- [ ] **Phase 6: Master Automated Pipeline (`src/run_pipeline.py`)**

---

## 💻 How to Run and Reproduce

### 1. Environment Setup
Clone the repository and install requirements:
```bash
git clone https://github.com/shayan-codes-405/agro-buddy.git
pip install -r requirements.txt
```

### 2. Run Data Rescue Notebooks
Open VS Code or Jupyter Lab and execute the notebooks top-to-bottom:
```bash
jupyter notebook notebooks/01_Mandi_Arrivals_Data_Rescue.ipynb
jupyter notebook notebooks/02_Mandi_Master_Data_Rescue.ipynb
```

### 3. Verify Clean Outputs
The processed clean datasets will be generated automatically under `data/processed/`:
- `data/processed/clean_mandi_arrivals.csv`
- `data/processed/clean_mandi_master.csv`

---

## 🧱 Technology Stack
- **Data Engineering**: Python 3.10+, Pandas, NumPy, Regex
- **Analytical Storage**: DuckDB / Apache Parquet
- **Backend API**: FastAPI (REST endpoints)
- **Frontend Dashboard**: Next.js / TypeScript / Recharts
- **AI Analyst**: Natural Language to SQL Semantic Query Layer
