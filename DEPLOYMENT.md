# AgroBuddy Deployment Guide 🚀

AgroBuddy is designed for flexible, high-performance deployment across any infrastructure. Choose the deployment strategy that best matches your target environment.

---

## 📋 Prerequisites & Environment Variables

Before deploying, ensure you have your **Groq API Key** (for AgroBuddy Intelligence Copilot and automatic AI insight generation).

Create a `.env` file in the root repository (or configure in your cloud dashboard):

```env
# Groq LLM API Key (Required for AI features)
GROQ_API_KEY=gsk_your_groq_api_key_here

# LLM Models
INSIGHT_MODEL=llama-3.3-70b-versatile
AGENT_MODEL=llama-3.3-70b-versatile

# Optional Redis Cache (In-Memory fallback active by default)
REDIS_URL=
LLM_CACHE_ENABLED=true
LLM_INSIGHT_CACHE_TTL_SECONDS=900
```

---

## 🐳 Option 1: Docker Compose (Recommended for Local / VPS / AWS EC2)

Deploy the full stack (FastAPI Backend + React Frontend + Nginx Reverse Proxy + DuckDB Analytics) with a single command.

### 1. Start Containers
```bash
docker compose up -d --build
```

### 2. Access the Application
- **Frontend Web Application**: [http://localhost:3000](http://localhost:3000) or [http://localhost](http://localhost)
- **Backend API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Endpoint**: [http://localhost:8000/health](http://localhost:8000/health)

### 3. Stop Containers
```bash
docker compose down
```

---

## ☁️ Option 2: Free Cloud Tier (Vercel + Render / Railway)

### Step 1: Deploy Backend to Render or Railway

#### Via Render Blueprint (1-Click):
1. Push your repository to GitHub.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Blueprint** → Connect your repository.
4. Render will automatically detect `render.yaml` and provision both services.
5. Add your `GROQ_API_KEY` under the Environment tab.

#### Or Manual Render Web Service:
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path**: `/health`
- **Env Vars**: `GROQ_API_KEY=<your_key>`

---

### Step 2: Deploy Frontend to Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New Project** → Import your `agro-buddy` repository.
3. Configure the Project Settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable:
   - `VITE_API_BASE_URL` = `https://your-backend-app.onrender.com` (your deployed backend URL)
5. Click **Deploy**.

---

## 🖥️ Option 3: Unified Single-Server Mode (Single Port / Single Process)

Run both the frontend and backend together on a single port (e.g. `8000`) without Nginx. FastAPI automatically serves the compiled React production bundle and API endpoints simultaneously.

### 1. Build the Frontend
```bash
cd frontend
npm install
npm run build
cd ..
```

### 2. Start the FastAPI Server
```bash
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

### 3. Open Browser
Visit [http://localhost:8000](http://localhost:8000). The React SPA and all API endpoints `/api/v1/*` are served seamlessly from the same host and port.

---

## 🌐 Option 4: Linux VPS Deployment (Ubuntu / Debian / AWS EC2 / DigitalOcean)

### 1. Install Docker & Compose
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
```

### 2. Clone & Launch
```bash
git clone https://github.com/shayan-codes-405/agro-buddy.git
cd agro-buddy
cp .env.example .env
nano .env # Add your GROQ_API_KEY

docker compose up -d --build
```

### 3. Setup SSL with Certbot (Optional)
To attach a custom domain with HTTPS:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🔍 Verification & Health Checks

Once deployed, verify each component:

1. **System Health Check**:
   ```bash
   curl https://your-domain.com/health
   # Expected response: {"status":"healthy","service":"AgroBuddy Backend","version":"1.0.0","database":true}
   ```

2. **Run Backend Test Suite**:
   ```bash
   pytest backend/tests/
   # Expected: 22 passed
   ```

3. **Database Integrity**:
   DuckDB automatically initializes on first run if `duckdb/agrobuddy.duckdb` is missing, sourcing processed parquet datasets from `data/processed/`.
