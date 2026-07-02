# Eluvion — Code Structure (for context-passing)

**What it is:** AI Memory Pathology Platform. It stores AI memories in a knowledge graph, diagnoses memory failures (orphaned nodes, confidence decay, contradictions), and repairs them. Built on Cognee (open-source memory library), Groq LLM, React frontend.

---

## Two parts: `backend/` + `frontend/`

---

## BACKEND (FastAPI, Python, port 8000)

**`main.py`** — starts the server, wires up all routes, sets CORS so the frontend can talk to it.

**`.env`** — all secrets and config live here: Groq API key, which DBs to use, Cognee settings.

**`app/config.py`** — reads `.env` into a typed Python object (`settings`). Everything imports from here.

### `app/api/routes/` — HTTP endpoints

| File | What it does |
|---|---|
| `chat.py` | `POST /chat` — takes user message, returns AI reply |
| `memory.py` | `GET/POST/DELETE /memory` — view, add, delete memories |
| `graph.py` | `GET /graph` — returns all memory nodes + edges for the graph UI |
| `health.py` | `GET /health` — memory system health score |
| `diagnosis.py` | `GET /diagnosis` — scans memory for diseases, caches the report |
| `repair.py` | `POST /repair` — fixes a specific disease from the cached report |

### `app/models/` — data shapes (Pydantic)

- `memory.py` — what a memory node looks like (content, tags, confidence, timestamps)
- `diagnosis.py` — what a disease report looks like (id, name, severity, affected nodes)
- `health.py` — health metric structure

### `app/services/` — all the logic

| File | What it does |
|---|---|
| `store.py` | Picks which memory backend to use: Cognee (real) or in-memory mock |
| `cognee_adapter.py` | Wraps Cognee library. Stores memories in the background (non-blocking). Keeps a fast in-memory mirror for instant recall and graph display. |
| `memory_store.py` | Simple in-memory fallback — used when Cognee is off |
| `agent_service.py` | The chat brain. Builds the prompt (with recalled memories + today's date), calls Groq LLM, stores the exchange back to memory |
| `pathology_engine.py` | Detects memory diseases — orphaned nodes, contradictions, decay, low confidence |
| `health_engine.py` | Turns raw memory stats into a health score (0–100) |
| `repair_engine.py` | Fixes diseases — prunes dead nodes, consolidates duplicates, boosts confidence |

---

## FRONTEND (React + Vite, port 5173)

**`index.html`** — bare HTML shell, mounts React.

**`vite.config.js`** — proxies `/api/*` → `localhost:8000` so the frontend never hard-codes the backend URL.

**`tailwind.config.js`** — custom dark theme colors (deep slate background, purple + cyan accents).

### `src/api/client.js`
Single axios instance. All API calls go through here — chat, memory fetch, diagnosis, repair.

### `src/hooks/` — data fetching

| File | What it does |
|---|---|
| `useChat.js` | Manages chat messages array, sends to `/api/chat`, tracks loading state |
| `useMemory.js` | Fetches memory nodes and graph edges from the backend |
| `useStatus.js` | Polls `/api/status` — shows backend name, node count, which LLM is active |

### `src/pages/` — the 3 screens

| File | What it shows |
|---|---|
| `ChatPage.jsx` | Chat interface on the left, recent memories on the right |
| `GraphPage.jsx` | Full-screen interactive knowledge graph + node detail drawer |
| `HealthPage.jsx` | Health score cards + diagnosis panel with repair buttons |

### `src/components/` — UI pieces

| Folder | Components |
|---|---|
| `Layout/Sidebar.jsx` | Left nav bar — logo, page links, live status dot |
| `Chat/ChatInterface.jsx` | Textarea + send button + scrolling message list |
| `Chat/MessageBubble.jsx` | Styles a single chat message (user vs AI) |
| `MemoryGraph/MemoryGraph.jsx` | React Flow canvas — renders nodes as custom cards with connection handles |
| `MemoryGraph/NodeDetail.jsx` | Sidebar panel when you click a node — shows metadata |
| `HealthDashboard/HealthDashboard.jsx` | Grid of health metric cards |
| `HealthDashboard/MetricCard.jsx` | One KPI card (label, score, color) |
| `DiagnosisPanel/DiagnosisPanel.jsx` | Lists detected memory diseases |
| `DiagnosisPanel/DiagnosisCard.jsx` | One disease card with severity + "Repair" button |
| `TimelineViewer/TimelineViewer.jsx` | Chronological feed of memory events |

---

## How data flows (end to end)

```
User types in chat
  → useChat.js → POST /api/chat
  → agent_service.py recalls relevant memories from cognee_adapter
  → builds prompt → calls Groq LLM
  → stores the exchange back to memory
  → returns answer to frontend

User opens Graph page
  → useMemory.js → GET /api/graph
  → cognee_adapter.get_graph() returns nodes + edges
  → MemoryGraph.jsx renders them in React Flow

User clicks "Run Diagnosis"
  → GET /api/diagnosis → pathology_engine scans all nodes → returns disease list (cached)
  → User clicks "Repair" → POST /api/repair → repair_engine fixes it → graph updates
```

---

## Tech stack summary

| Layer | Tech |
|---|---|
| LLM | Groq (llama-3.3-70b), Gemini fallback |
| Memory | Cognee 1.2.2 — SQLite + LanceDB (vectors) + Ladybug (graph) |
| Backend | FastAPI + Pydantic + Uvicorn |
| Frontend | React 18 + Vite + Tailwind + React Flow + Framer Motion |
