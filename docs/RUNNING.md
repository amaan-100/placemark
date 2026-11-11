# Running PlaceMark (start here)

This is the simple, copy‑paste guide to get the whole app running on your own machine.
It covers every "instance" you need:

| # | Instance | Where it runs | Do you start it? |
|---|----------|---------------|------------------|
| 1 | **Database** (PostgreSQL) | Neon cloud (already configured) — or SQLite if you want offline | Usually no (cloud). Optionally yes for SQLite |
| 2 | **Backend** (FastAPI API) | Your PC, `http://127.0.0.1:8000` | **Yes** |
| 3 | **Frontend** (React/Vite UI) | Your PC, `http://127.0.0.1:5173` | **Yes** |
| 4 | **LLM provider** (AI text) | Requesty cloud, or local Ollama, or off | Optional (app works without it) |

> Order matters: database must be reachable → then backend → then frontend.
> The backend runs DB migrations automatically when it starts.

---

## 0. Prerequisites (check once)

Open PowerShell in the project root (`...\AGENTX\placement-copilot`) and run:

```powershell
node -v            # need Node 20+ (this project uses Node 24)
npm -v
py --version       # or: python --version  (need Python 3.11+; project uses 3.14)
```

Also make sure you have internet access (the database is in Neon cloud, jobs come from Jobicy,
and AI comes from Requesty — unless you switch to offline/SQLite/disabled as shown below).

---

## 1. One-time setup

### Backend

A virtual environment (`.venv`) and dependencies already exist in this repo. If you are on a
fresh clone, create them once:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env        # then edit .env (see the Database section)
```

On macOS/Linux use `python3 -m venv .venv`, `source .venv/bin/activate`, `cp .env.example .env`.

### Frontend

Dependencies already exist. On a fresh clone:

```powershell
cd frontend
npm install
```

---

## 2. Database

There is **no database server to start locally** — `backend/.env` points at a hosted
**Neon Postgres** database. You just need internet, and the backend will create/upgrade the tables
on startup.

Check which database you are pointed at (do not print the password):

```powershell
Select-String -Path backend\.env -Pattern "^DATABASE_URL"
```

- Starts with `postgresql+psycopg://...neon.tech...` → **Neon cloud** (default here).
- Starts with `sqlite:///placement.db` → local file, no server needed.

### Option A — Use the Neon database (default, needs internet)

Nothing to do. It is already set in `backend/.env`:

```dotenv
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST/DBNAME?sslmode=require
```

If you ever need a fresh Neon database: create a project at https://neon.tech, copy the pooled
connection string, convert it to the `postgresql+psycopg://...?sslmode=require` form, and put it in
`backend/.env`. Migrations run automatically when the backend boots.

### Option B — Use local SQLite (works fully offline)

Edit `backend/.env` and set:

```dotenv
DATABASE_URL=sqlite:///placement.db
```

No server to start. The file `backend/placement.db` is created automatically on first run.

### Run migrations manually (only if needed)

Normally automatic. To run them by hand:

```powershell
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
```

---

## 3. Start the Backend  (Terminal 1)

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

macOS/Linux: `source .venv/bin/activate` then `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`.

Verify it is up (leave this terminal running):

- API docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/api/health   → should return `{"status":"ok",...}`

```powershell
# from a new terminal
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

---

## 4. Start the Frontend  (Terminal 2)

Open a **second** terminal:

```powershell
cd frontend
npm run dev
```

Open http://127.0.0.1:5173 in your browser.

The frontend talks to the backend at `http://127.0.0.1:8000/api` by default. To point it elsewhere,
create `frontend/.env.local` with:

```dotenv
VITE_API_URL=http://127.0.0.1:8000/api
```

---

## 5. LLM provider (optional — pick one)

The app always works: if the provider is unavailable it falls back to deterministic templates.
Current default is the cloud gateway (Requesty). Choose what you want in `backend/.env`:

### Option A — Cloud (OpenAI-compatible), default

```dotenv
LLM_PROVIDER=openai_compatible
LLM_PROVIDER_LABEL=requesty
LLM_BASE_URL=https://router.requesty.ai/v1
LLM_API_KEY=<your-key-here>
LLM_MODEL=google/gemma-4-31b-it
```

### Option B — Local Ollama (no cloud key)

```powershell
ollama serve
ollama pull qwen2.5-coder:7b
```

```dotenv
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5-coder:7b
```

### Option C — Turn AI off (fastest, fully deterministic)

```dotenv
LLM_PROVIDER=disabled
```

After changing `backend/.env`, **restart the backend** (Ctrl+C, then start it again). Check status:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/llm/status
```

---

## 6. Stopping everything

- Frontend terminal: press `Ctrl + C`.
- Backend terminal: press `Ctrl + C`.
- Database: nothing to stop (it is cloud-hosted). If you used SQLite, nothing to stop either.

Close the terminals when finished.

---

## 7. Quick smoke test (2 minutes)

1. Open http://127.0.0.1:5173 and click **Start with your resume**.
2. Step 01: upload a text-based PDF (≤ 8 MB). You should see skills + a summary.
3. Step 02: search a role, pick a listing, click **Draft for this role**.
4. Step 03: open **Review**, type `approve`, confirm the checkbox, and click **Approve & record decision**.
5. Step 04: start practice, submit an answer, and check the rubric feedback.

A `404` on `/api/resume/latest` in the browser console **before** your first upload is expected and harmless.

---

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| Frontend shows "cannot reach the API" banner | Start the backend (Terminal 1) and click **Retry connection**. |
| `Address already in use` on port 8000 | Another uvicorn is running. Stop it, or start on another port: `--port 8001` (then set `VITE_API_URL` accordingly). |
| `Address already in use` on port 5173 | Stop the other Vite process, or run `npm run dev -- --port 5174`. |
| Database auth / connection error on startup | Check `DATABASE_URL` in `backend/.env`; confirm internet; or switch to `sqlite:///placement.db`. |
| CORS error in the browser console | Add your frontend origin to `CORS_ORIGINS` in `backend/.env` (default already includes `http://127.0.0.1:5173`). |
| AI badge says "Fallback mode" | The LLM key/model is unavailable — the app still works. Fix or ignore it (Step 5). |
| AI badge says "Checking AI" for a while | The status check can be slow on the first call after idle; wait a few seconds. |
| "Waking the workspace" notice | First request after idle is slow (cloud DB/API wake-up). Wait up to a minute. |
| Fonts look like a plain serif/sans | You are offline; Google Fonts could not load. The app still works. |

---

## 9. Optional: run the tests

```powershell
cd backend
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest -q
```

Tests use an isolated SQLite database, mock jobs, and `LLM_PROVIDER=disabled` — no internet needed.

Frontend type-check / build:

```powershell
cd frontend
npm run build
```

---

## 10. Optional: production deployment (Vercel + Render + Neon)

If you want a public URL instead of local dev, see the "Free deployment" section of the root
[`README.md`](../README.md). Short version: Neon Postgres (database) → Render (backend) →
Vercel (frontend).

---

## TL;DR (everyday use)

```powershell
# Terminal 1 — backend (port 8000)
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Terminal 2 — frontend (port 5173)
cd frontend
npm run dev

# Then open: http://127.0.0.1:5173
```

That's it — database is Neon (cloud, nothing to run), backend and frontend are the only two
things you start each time.
