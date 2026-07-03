# Eluvion v2 — AI Memory OS

> An AI assistant that actually **remembers** — and lets you see, fix, and control exactly what it knows.

Most AI chatbots forget everything the moment you close the tab. Eluvion is different. It stores what you tell it in a knowledge graph, recalls relevant facts when you ask questions, and gives you full visibility into its memory — including when that memory goes stale, contradicts itself, or needs to be erased.

---

## What It Does (Plain English)

Imagine you told your AI assistant:
- "My name is Rithvik"
- "I'm building a startup called Eluvion"
- "I prefer Python over JavaScript"

A normal chatbot forgets all of this the next day. Eluvion stores it permanently and recalls it automatically in future conversations. You can also:

- **See** your memory as a 3D graph of interconnected nodes
- **Fix** wrong memories by clicking "Wrong" or "Correct"
- **Erase** memories you no longer want
- **Watch** memory health scores and get warned about contradictions

---

## Three Chat Modes

The core idea: not every question needs memory, and not every question needs the internet. Eluvion routes each question to the right "brain":

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Question                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │   GENERAL   │ │   MEMORY    │ │   HYBRID    │
   │   (Globe)   │ │   (Brain)   │ │  (Layers)   │
   └─────────────┘ └─────────────┘ └─────────────┘
   LLM only.       Cognee only.    Both combined.
   No memory.      No hallucination. Best of both.
   "What is        "What's my       "Tell me about
    FastAPI?"       project name?"   my Python prefs
                                     + best practices"
```

| Mode | Uses | Best For |
|------|------|----------|
| **General** | AI knowledge only | Facts, coding help, explanations |
| **Memory** | Your stored memories only | Personal info, past decisions, preferences |
| **Hybrid** | Both combined | Most real-world questions (default) |

In **General** mode, every AI response has a **"Save to Memory"** button — so you can bookmark useful answers for later recall.

In **Memory** mode, every message you send is automatically stored so the AI learns continuously.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          BROWSER (React)                             │
│                                                                      │
│  ┌───────────┐  ┌─────────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Chat Page │  │ Graph Page  │  │  Health  │  │ Surgery / Audit│  │
│  │           │  │ (Three.js   │  │Dashboard │  │    Pages       │  │
│  │ 3 agents  │  │  3D graph)  │  │          │  │                │  │
│  └─────┬─────┘  └──────┬──────┘  └────┬─────┘  └───────┬────────┘  │
│        │               │              │                 │            │
│        └───────────────┴──────────────┴─────────────────┘           │
│                              │  axios HTTP                           │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────────┐
│                       FastAPI Backend (Python)                        │
│                                                                      │
│  /api/chat ──► Knowledge Router ──► General / Memory / Hybrid        │
│  /api/memories          ▲               │                            │
│  /api/graph             │               ▼                            │
│  /api/health            │         ┌──────────────┐                   │
│  /api/feedback          │         │ Agent Service│                   │
│  /api/surgery           │         │  (3 pipelines│                   │
│  /api/diagnosis         │         │   + Groq LLM)│                   │
│  ...                    │         └──────┬───────┘                   │
│                         │                │                            │
│                    ┌────┴────────────────▼──────────┐                │
│                    │        CogneeAdapter            │                │
│                    │  • remember()  • recall()       │                │
│                    │  • forget()    • shadow store   │                │
│                    │  • blacklist   • keyword index  │                │
│                    └────────────────┬────────────────┘                │
└─────────────────────────────────────┼────────────────────────────────┘
                                      │
              ┌───────────────────────┴────────────────────┐
              │                                            │
    ┌─────────▼──────────┐                    ┌───────────▼──────────┐
    │   Cognee Cloud     │                    │   Local Fallback     │
    │ (Knowledge Graph   │     OR             │  LanceDB (vectors)   │
    │  + Vector Search)  │                    │  Ladybug (graph)     │
    └────────────────────┘                    └──────────────────────┘
```

---

## Folder Structure

```
hangover/
├── backend/                  # Python FastAPI server
│   ├── main.py               # App entry point, starts all background services
│   ├── .env                  # Your API keys (never committed to git)
│   └── app/
│       ├── config.py         # All settings (reads from .env)
│       ├── api/routes/       # One file per API endpoint group
│       │   ├── chat.py       # POST /api/chat
│       │   ├── memory.py     # GET/POST/DELETE /api/memories
│       │   ├── graph.py      # GET /api/graph
│       │   ├── health.py     # GET /api/health
│       │   ├── feedback.py   # POST /api/feedback
│       │   ├── surgery.py    # Memory surgery operations
│       │   ├── diagnosis.py  # Disease detection
│       │   ├── repair.py     # Auto-repair memory
│       │   └── ...
│       ├── models/           # Data shapes (Pydantic models)
│       │   ├── memory.py     # MemoryNode, MemoryEdge, ChatRequest
│       │   ├── feedback.py   # FeedbackRequest / FeedbackResponse
│       │   └── ...
│       └── services/         # All the business logic
│           ├── agent_service.py        # 3 chat pipelines (general/memory/hybrid)
│           ├── cognee_adapter.py       # Bridge to Cognee — remember/recall/forget
│           ├── knowledge_router.py     # Auto-detects which mode to use
│           ├── hallucination_predictor.py  # Scores answer reliability
│           ├── health_engine.py        # Memory health scoring (grade A-F)
│           ├── pathology_engine.py     # Detects memory diseases
│           ├── contradiction_service.py# Finds conflicting memories
│           ├── feedback_service.py     # Processes thumbs up/down/forget
│           ├── repair_engine.py        # Auto-fixes bad memories
│           ├── mri_monitor.py          # Background health scanner
│           ├── evolution_service.py    # Memory decay + aging
│           ├── preference_service.py   # Learns user preferences
│           ├── surgery_service.py      # Bulk memory operations
│           ├── version_service.py      # History / undo for memories
│           └── store.py                # Singleton: active_store
│
└── frontend/                 # React + Vite web app
    ├── index.html
    ├── package.json
    └── src/
        ├── App.jsx            # Router — wires pages to URLs
        ├── api/client.js      # All backend API calls in one place
        ├── hooks/
        │   ├── useChat.js     # 3 isolated conversation states + send/save
        │   ├── useMemory.js   # Graph, health, diagnosis data fetching
        │   └── useStatus.js   # Backend status polling
        ├── components/
        │   ├── Chat/
        │   │   ├── ChatInterface.jsx  # Mode selector + message list + input
        │   │   ├── MessageBubble.jsx  # Single message + provenance badges
        │   │   └── FeedbackBar.jsx    # Save / thumbs / forget buttons
        │   ├── MemoryGraph/
        │   │   ├── MemoryGraph.jsx    # Three.js 3D force-directed graph
        │   │   └── NodeDetail.jsx     # Side panel when node is clicked
        │   ├── HealthDashboard/       # Score cards + metrics
        │   ├── DiagnosisPanel/        # Disease cards + repair buttons
        │   └── TimelineViewer/        # Chronological memory events
        └── pages/
            ├── ChatPage.jsx       # /           — chat + recalled nodes
            ├── GraphPage.jsx      # /graph      — 3D memory graph
            ├── HealthPage.jsx     # /health     — memory health dashboard
            ├── SurgeryPage.jsx    # /surgery    — bulk edit memories
            ├── EvolutionPage.jsx  # /evolution  — memory aging timeline
            └── ExplorerPage.jsx   # /explorer   — search all memories
```

---

## How Memory Works (Step by Step)

### Saving a Memory

```
You type: "My favourite framework is FastAPI"
              │
              ▼
     agent_service.py detects personal fact
              │
              ▼
     cognee_adapter.remember(content, tags, subject)
         │                          │
         ▼                          ▼
  Adds to shadow store       Fires cognee.remember()
  (instant, in-memory)       in background thread
  ← You can query this        → Cloud indexes it for
    immediately                 semantic search later
```

### Recalling a Memory

```
You ask: "What framework do I prefer?"
              │
              ▼
     cognee_adapter.recall(query)
         │                    │
         ▼                    ▼
  _score_local()         cognee.recall()     ← cloud semantic search
  keyword match          (may return results
  on shadow store         from indexed KG)
         │                    │
         └────────┬───────────┘
                  ▼
         Merge both results
         Filter blacklisted (forgotten) nodes
                  │
                  ▼
         Top 8 nodes → injected into LLM prompt
                  │
                  ▼
         LLM answers: "According to my memory, you prefer FastAPI"
```

### Forgetting a Memory

```
You click "Forget" on a message
              │
              ▼
     POST /api/feedback  { feedback_type: "forget" }
              │
              ▼
     cognee_adapter.forget(node_id)
         │
         ├── Removes node from shadow store
         ├── Fingerprints content → adds to _forgotten_fingerprints blacklist
         ├── Cascade: also removes nodes with >45% keyword overlap
         │   (so auto-saved paraphrases get wiped too)
         └── Fires cognee.forget() to cloud (best-effort purge)

Result: that knowledge NEVER returns in any future recall
```

---

## Memory Health System

Eluvion monitors your memory like a doctor monitors a patient. It runs a background **MRI scan** every few minutes and assigns a health grade:

| Grade | Score | Meaning |
|-------|-------|---------|
| A | 90–100 | Memory is clean and consistent |
| B | 75–89  | Minor issues, no action needed |
| C | 60–74  | Some stale or conflicting data |
| D | 40–59  | Significant problems detected |
| F | 0–39   | Memory needs immediate repair |

### Memory Diseases

The pathology engine detects six types of memory problems:

| Disease | What It Means |
|---------|---------------|
| **Memory Rot** | A fact has become outdated (e.g. old job, old address) |
| **Contamination** | A wrong/hallucinated fact got stored |
| **Fragmentation** | Related memories are disconnected from each other |
| **Amnesia** | Important facts were never stored |
| **Bias** | Memory skews heavily toward one topic |
| **Noise** | Too many low-quality, low-confidence nodes |

You can fix any disease from the **Health** or **Surgery** pages.

---

## Provenance Badges

Every AI response shows exactly where the answer came from:

```
┌─────────────────────────────────────────────────┐
│ FastAPI is a modern Python web framework...      │
│                                                  │
│  🟢 Cognee Memory  45%  · 3 nodes               │
│  🔵 General Knowledge  55%                       │
└─────────────────────────────────────────────────┘
```

- **🟢 Cognee Memory** — answered from your stored facts
- **🔵 General Knowledge** — answered from LLM training data
- Percentages show the mix in Hybrid mode
- "No memory found" shown when Memory mode has nothing relevant

---

## Tech Stack

### Backend
| Layer | Technology | Why |
|-------|-----------|-----|
| Web framework | **FastAPI** (Python) | Fast, async, auto-generates API docs at `/docs` |
| LLM | **Groq + Llama 3.3 70B** | Free tier, very fast inference |
| Memory engine | **Cognee 1.2.2** | Knowledge graph with `remember/recall/forget` API |
| Vector DB | **LanceDB** (local) or Cognee Cloud | Stores embeddings for semantic search |
| Graph DB | **Ladybug** (local) or Cognee Cloud | Stores relationships between memories |
| Background tasks | Python `threading` | Non-blocking memory indexing |

### Frontend
| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | **React 18** + **Vite** | Fast HMR, modern component model |
| 3D Graph | **Three.js** + **3d-force-graph** | Interactive 3D memory visualization |
| Animations | **Framer Motion** | Smooth message transitions |
| Styling | **Tailwind CSS** | Utility-first, warm stone palette |
| Icons | **Lucide React** | Consistent icon set |
| HTTP | **Axios** | Clean API calls with interceptors |

---

## Setup & Running Locally

### Prerequisites
- Python 3.10+
- Node.js 18+
- A free [Groq API key](https://console.groq.com) (takes 30 seconds)

### 1. Clone the repo

```bash
git clone https://github.com/rithvikreddy1408/Eluvion-hangover-.git
cd Eluvion-hangover-
```

### 2. Backend setup

```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file
cp .env.example .env             # then open .env and paste your keys
```

**Minimum `.env` to get started:**
```env
GROQ_API_KEY=your_groq_key_here
USE_COGNEE=true
LLM_PROVIDER=groq
LLM_MODEL=llama-3.3-70b-versatile
VECTOR_DB_PROVIDER=lancedb
GRAPH_DATABASE_PROVIDER=ladybug
COGNEE_DATASET=eluvion
```

**Optional — Cognee Cloud (persistent memory across restarts):**
```env
COGNEE_API_KEY=your_cognee_key
COGNEE_SERVICE_URL=https://your-tenant.aws.cognee.ai
```

### 3. Start the backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

You should see:
```
[Eluvion v2] Memory backend: cognee-local
[Eluvion v2] MRI monitor started
[Eluvion v2] Evolution service started
INFO: Uvicorn running on http://0.0.0.0:8000
```

### 4. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

### 5. First chat

1. Select **Hybrid** mode (default)
2. Type: *"My name is [your name] and I'm working on [your project]"*
3. Switch to **Memory** mode
4. Ask: *"What's my name?"* — it should remember!

---

## API Reference

The full interactive API docs are at **http://localhost:8000/docs** when the backend is running.

Key endpoints:

| Method | Endpoint | What it does |
|--------|----------|--------------|
| `POST` | `/api/chat` | Send a message, get an AI response |
| `GET` | `/api/memories` | List all stored memory nodes |
| `POST` | `/api/memories` | Manually add a memory |
| `DELETE` | `/api/memories/{id}` | Delete a specific memory |
| `POST` | `/api/feedback` | Send thumbs up/down/forget on a message |
| `GET` | `/api/graph` | Get all nodes + edges for the graph |
| `GET` | `/api/health` | Get memory health score + grade |
| `GET` | `/api/diagnosis` | Get detected memory diseases |
| `POST` | `/api/repair` | Trigger auto-repair for a disease |
| `GET` | `/api/status` | System status (LLM, DB, node count) |

---

## Pages Walkthrough

| Page | URL | What You Can Do |
|------|-----|----------------|
| **Chat** | `/` | Talk to the AI in General / Memory / Hybrid mode |
| **Graph** | `/graph` | Explore your memory as a 3D interactive graph |
| **Health** | `/health` | See your memory health grade and metrics |
| **Surgery** | `/surgery` | Bulk-edit, pin, or delete memories |
| **Evolution** | `/evolution` | Timeline of when memories were added/changed |
| **Explorer** | `/explorer` | Search and filter all stored memories |

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | Yes | — | Free at console.groq.com |
| `USE_COGNEE` | No | `false` | Enable real memory (vs mock) |
| `LLM_PROVIDER` | No | `groq` | `groq` or `gemini` |
| `LLM_MODEL` | No | `llama-3.3-70b-versatile` | Model name |
| `VECTOR_DB_PROVIDER` | No | `lancedb` | Local vector DB |
| `GRAPH_DATABASE_PROVIDER` | No | `ladybug` | Local graph DB |
| `COGNEE_DATASET` | No | `eluvion` | Namespace for your memories |
| `COGNEE_API_KEY` | No | — | For Cognee Cloud |
| `COGNEE_SERVICE_URL` | No | — | Your Cognee Cloud tenant URL |
| `GEMINI_API_KEY` | No | — | Fallback LLM if Groq unavailable |

---

## How the 3D Graph Works

Every memory is a **node** (sphere). Relationships between memories are **edges** (lines with arrows).

- **Sphere size** = how often that memory has been recalled + how confident the AI is in it
- **Sphere color** = health status (cyan = healthy, red = contaminated, amber = rotting...)
- **Animated particles** flowing along edges = active relationships
- **Click a node** = zooms in and shows full details in a side panel
- **Drag to rotate**, scroll to zoom, right-click drag to pan

---

## Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Make changes and test locally
4. Commit: `git commit -m "feat: describe what you did"`
5. Push and open a PR

---

## License

MIT — use it, fork it, build on it.

---

*Built for the Cognee Hackathon · Eluvion v2 · 2026*
