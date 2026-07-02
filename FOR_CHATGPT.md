# Eluvion — Codebase Context for ChatGPT

Eluvion is an AI Memory Pathology Platform. It stores AI conversation memories in a knowledge graph, detects memory failures (orphaned nodes, decay, contradictions), and auto-repairs them. Stack: FastAPI backend + React frontend + Cognee memory library + Groq LLM.

---

## BACKEND — `backend/` (FastAPI, Python, runs on port 8000)

```
main.py              → starts the server, registers all routes
.env                 → API keys + config (Groq key, DB settings)
app/config.py        → loads .env into a typed settings object
```

**Routes** (`app/api/routes/`) — these are the HTTP endpoints:
```
chat.py        → POST /chat       — takes user message, returns AI reply
memory.py      → GET/POST/DELETE  — view, add, delete memories
graph.py       → GET /graph       — returns nodes + edges for the graph UI
health.py      → GET /health      — memory system health score
diagnosis.py   → GET /diagnosis   — scans memory for diseases, caches result
repair.py      → POST /repair     — fixes a specific disease
```

**Models** (`app/models/`) — Pydantic data shapes:
```
memory.py      → MemoryNode (content, tags, confidence, timestamps)
diagnosis.py   → Disease (id, name, severity, affected nodes)
health.py      → HealthMetric (label, score)
```

**Services** (`app/services/`) — all business logic:
```
store.py              → picks Cognee (real) or in-memory mock based on .env
cognee_adapter.py     → wraps Cognee library; remember() runs in background thread
                         so chat isn't blocked; keeps fast in-memory mirror for recall
memory_store.py       → simple dict-based fallback when Cognee is off
agent_service.py      → builds LLM prompt (memories + today's date) → calls Groq → stores reply
pathology_engine.py   → detects memory diseases: orphans, conflicts, low confidence, decay
health_engine.py      → turns memory stats into a 0–100 health score
repair_engine.py      → fixes diseases: prunes dead nodes, consolidates duplicates
```

---

## FRONTEND — `frontend/` (React + Vite, runs on port 5173)

```
index.html          → HTML shell
vite.config.js      → proxies /api/* → localhost:8000
tailwind.config.js  → dark theme (slate background, purple + cyan accents)
src/main.jsx        → React entry point
src/App.jsx         → routes: / = chat, /graph, /health, /timeline
src/index.css       → global styles
src/api/client.js   → single axios instance, all API calls go through here
```

**Hooks** (`src/hooks/`) — data fetching logic:
```
useChat.js     → manages chat messages, calls POST /chat, tracks loading
useMemory.js   → fetches nodes + edges from /graph
useStatus.js   → polls /status for live backend info (node count, LLM provider)
```

**Pages** (`src/pages/`) — 3 screens:
```
ChatPage.jsx   → chat on left, recent memories on right
GraphPage.jsx  → interactive knowledge graph + node detail sidebar
HealthPage.jsx → health score cards + disease list with repair buttons
```

**Components** (`src/components/`):
```
Layout/Sidebar.jsx                → left nav, logo, page links, status dot
Chat/ChatInterface.jsx            → textarea, send button, message list
Chat/MessageBubble.jsx            → styles one message (user vs AI)
MemoryGraph/MemoryGraph.jsx       → React Flow canvas, custom node cards with connection handles
MemoryGraph/NodeDetail.jsx        → shows metadata when you click a node
HealthDashboard/HealthDashboard.jsx → grid of health KPI cards
HealthDashboard/MetricCard.jsx    → one KPI card
DiagnosisPanel/DiagnosisPanel.jsx → lists detected diseases
DiagnosisPanel/DiagnosisCard.jsx  → one disease + "Repair" button
TimelineViewer/TimelineViewer.jsx → chronological feed of memory events
```

---

## Full data flow (one sentence each)

- **Chat:** user types → `useChat` → `POST /chat` → `agent_service` recalls memories + calls Groq → stores exchange → returns reply
- **Graph:** open graph page → `useMemory` → `GET /graph` → `cognee_adapter.get_graph()` → React Flow renders nodes/edges
- **Diagnosis:** click scan → `GET /diagnosis` → `pathology_engine` detects diseases → cached
- **Repair:** click repair → `POST /repair` with disease id → `repair_engine` fixes it → graph refreshes

---

## Tech stack

| | |
|---|---|
| LLM | Groq (llama-3.3-70b), Gemini as fallback |
| Memory | Cognee — SQLite + LanceDB (vectors) + Ladybug (graph) |
| Backend | FastAPI + Pydantic + Uvicorn |
| Frontend | React 18 + Vite + Tailwind + React Flow + Framer Motion |
