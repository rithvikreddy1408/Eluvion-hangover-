# Eluvion v2 — AI Memory OS

> **The AI that actually remembers you.** A full-stack knowledge graph system that gives conversational AI persistent, inspectable, and surgically controllable memory.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Solution Overview](#2-solution-overview)
3. [Project Architecture](#3-project-architecture)
4. [Project Structure](#4-project-structure)
5. [Technology Stack](#5-technology-stack)
6. [Features](#6-features)
7. [System Workflow](#7-system-workflow)
8. [Development Timeline](#8-development-timeline)
9. [Installation & Setup](#9-installation--setup)
10. [Usage Guide](#10-usage-guide)
11. [Challenges Faced](#11-challenges-faced)
12. [Future Scope](#12-future-scope)
13. [Team Contributions](#13-team-contributions)
14. [Screenshots](#14-screenshots)
15. [Demo](#15-demo)
16. [License](#16-license)

---

## 1. Problem Statement

### The Core Problem

Every time you close a chat with an AI assistant — GPT, Gemini, Claude — **it forgets you completely.** The next conversation starts from zero. You re-introduce yourself, re-explain your project, re-state your preferences. Every single session.

This is not a minor inconvenience. It is a fundamental architectural flaw that prevents AI from being a true long-term collaborator.

### Why It Matters

- **Knowledge workers** lose hours re-contextualizing AI on ongoing projects
- **Developers** can't use AI as a genuine pair programmer across sessions
- **Students** can't build on previous AI tutoring sessions
- **Teams** lose all institutional knowledge when a chat ends

### Who Is Affected

Anyone who uses AI assistants for anything that takes more than one session — which is, practically speaking, *every meaningful use case*.

### Existing Limitations

| Problem | Existing Solutions | Why They Fall Short |
|---|---|---|
| No memory across sessions | Long system prompts | Manual, stale, unsearchable, hit token limits |
| No knowledge graph | RAG / embeddings | Flat retrieval, no relationships, no health monitoring |
| No memory control | None | You can't see, fix, or delete what the AI knows |
| Hallucination from stale data | Fine-tuning | Expensive, slow, doesn't scale to personal data |
| No memory health visibility | None | You don't know when memory is wrong or outdated |

### The Gap

No existing product gives users **persistent memory + full visibility + surgical control** in a single system. Eluvion fills that gap.

---

## 2. Solution Overview

### What Eluvion Does

Eluvion v2 is an **AI Memory Operating System** — a full-stack application that wraps a large language model in a persistent, graph-based memory layer. It stores what you tell it, recalls relevant facts automatically, and gives you a complete dashboard to inspect, repair, and control its knowledge.

### Primary Objectives

- **Persistence**: Facts survive across sessions — forever, until you choose to forget them
- **Transparency**: Every AI response shows exactly where its knowledge came from
- **Control**: You can see, edit, delete, and surgically repair individual memories
- **Health**: The system monitors its own knowledge quality and warns you about problems

### Key Innovations

| Innovation | Description |
|---|---|
| **Dual recall pipeline** | Shadow store (instant) + Cognee cloud (semantic) — merged, deduplicated, blacklist-filtered |
| **Content fingerprinting** | MD5 hash of normalized content prevents forgotten memories from resurfacing |
| **Cascade forget** | Forgetting one node auto-forgets semantically similar nodes (Jaccard ≥ 0.45) |
| **Memory disease system** | Six named pathology types with automated detection and repair |
| **3D knowledge graph** | Three.js force-directed graph renders the memory as a live, interactive 3D space |
| **Provenance badges** | Every response shows the exact mix of memory vs. general knowledge used |

### Expected Impact

A user who talks to Eluvion for 10 minutes has an AI that knows more about them than any commercial chatbot learns in a year. That knowledge compounds — the longer you use it, the smarter and more personalized it gets.

---

## 3. Project Architecture

### System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          BROWSER (React + Vite)                      │
│                                                                      │
│  ┌───────────┐  ┌────────────────┐  ┌──────────┐  ┌─────────────┐  │
│  │ Chat Page │  │ Graph Page     │  │  Health  │  │  Surgery /  │  │
│  │           │  │ (Three.js 3D)  │  │Dashboard │  │  Explorer   │  │
│  │ 3 modes   │  │ Force-directed │  │  A-F     │  │  Pages      │  │
│  └─────┬─────┘  └──────┬─────────┘  └────┬─────┘  └──────┬──────┘  │
│        └───────────────┴────────────────┴───────────────┘          │
│                              │  axios HTTP calls                     │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────────┐
│                       FastAPI Backend (Python)                        │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                      API Routes Layer                          │  │
│  │  /api/chat · /api/memories · /api/graph · /api/health          │  │
│  │  /api/feedback · /api/surgery · /api/diagnosis · /api/repair  │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
│                               │                                      │
│  ┌────────────────────────────▼───────────────────────────────────┐  │
│  │                   Services Layer                               │  │
│  │                                                                │  │
│  │  KnowledgeRouter ──► AgentService ──► [General|Memory|Hybrid] │  │
│  │       │                   │                    │               │  │
│  │  HallucinationPredictor   │              Groq LLM API          │  │
│  │  HealthEngine             │                                    │  │
│  │  PathologyEngine          ▼                                    │  │
│  │  RepairEngine       CogneeAdapter                              │  │
│  │  MRIMonitor (bg)    · remember()  · recall()                   │  │
│  │  EvolutionService   · forget()    · shadow store               │  │
│  │  FeedbackService    · blacklist   · keyword index              │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
└───────────────────────────────┼──────────────────────────────────────┘
                                │
             ┌──────────────────┴──────────────────┐
             │                                     │
   ┌─────────▼──────────┐               ┌──────────▼────────────┐
   │   Cognee Cloud     │               │   Local Storage        │
   │  Knowledge Graph   │      OR       │  LanceDB  (vectors)    │
   │  Vector Embeddings │               │  Ladybug  (graph)      │
   │  Semantic Search   │               │  Shadow   (in-memory)  │
   └────────────────────┘               └───────────────────────┘
```

### Three Chat Modes

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Question                            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │   GENERAL   │  │   MEMORY    │  │   HYBRID    │
     │             │  │             │  │             │
     │  LLM only   │  │ Cognee only │  │ LLM + Graph │
     │  No memory  │  │ No halluc.  │  │ Best of both│
     └─────────────┘  └─────────────┘  └─────────────┘
     "What is React?" "What's my       "Explain React
                       job title?"      for my project"
```

### Memory Pipeline: Save → Store → Recall

```
remember(content, tags):
    │
    ├─► shadow_store[node.id] = node          (immediate, in-process)
    │
    └─► threading.Thread(cognee.remember)     (background, non-blocking)
             │
             ▼
        Cognee Cloud / LanceDB + Ladybug      (indexed, searchable)


recall(query):
    │
    ├─► _score_local(query)                   (keyword match, instant)
    │        returns List[(score, node)]
    │
    ├─► cognee.recall(query_text=query)       (semantic vector search)
    │        returns cloud results
    │
    ├─► merge both → deduplicate by node.id
    │
    ├─► filter: _content_fingerprint(n.content) in _forgotten_fingerprints
    │
    └─► return top-8 nodes → inject into LLM prompt


forget(node_id):
    │
    ├─► compute Jaccard overlap with all other nodes
    ├─► cascade-forget all nodes with overlap ≥ 0.45
    ├─► _forgotten_fingerprints.add(fingerprint)   (permanent blacklist)
    ├─► remove from shadow_store
    │
    └─► threading.Thread(cognee.forget)       (background cloud purge)
```

### Request / Response Flow

```
Browser                  FastAPI                    Services
  │                         │                          │
  │  POST /api/chat         │                          │
  │  { query, mode }        │                          │
  ├────────────────────────►│                          │
  │                         │  knowledge_router        │
  │                         │  .route(query, mode)     │
  │                         ├─────────────────────────►│
  │                         │                          │ recall() or LLM
  │                         │                          │ or both
  │                         │◄─────────────────────────┤
  │                         │  { answer, nodes,        │
  │                         │    provenance, score }   │
  │◄────────────────────────┤                          │
  │                         │                          │
  │  Render message +       │                          │
  │  provenance badges +    │                          │
  │  feedback buttons       │                          │
```

---

## 4. Project Structure

```text
hangover/
│
├── backend/                          # Python FastAPI server
│   ├── main.py                       # Entry point — starts app + background services
│   ├── requirements.txt              # Python dependencies
│   ├── .env.example                  # Environment variable template
│   └── app/
│       ├── config.py                 # All settings loaded from .env (Pydantic)
│       │
│       ├── api/
│       │   └── routes/               # One file per endpoint group
│       │       ├── chat.py           # POST /api/chat — main conversation endpoint
│       │       ├── memory.py         # GET/POST/DELETE /api/memories
│       │       ├── graph.py          # GET /api/graph — nodes + edges for 3D render
│       │       ├── health.py         # GET /api/health — grade + metrics
│       │       ├── feedback.py       # POST /api/feedback — thumbs/forget/correct
│       │       ├── surgery.py        # Bulk memory operations
│       │       ├── diagnosis.py      # GET disease list with severity
│       │       ├── repair.py         # POST /api/repair — trigger auto-fix
│       │       ├── evolution.py      # Memory aging timeline
│       │       ├── audit.py          # Audit log of all memory events
│       │       └── status.py         # GET /api/status — system health check
│       │
│       ├── models/                   # Pydantic request/response shapes
│       │   ├── memory.py             # MemoryNode, MemoryEdge, GraphData
│       │   ├── feedback.py           # FeedbackRequest / FeedbackResponse
│       │   └── chat.py               # ChatRequest / ChatResponse
│       │
│       └── services/                 # All business logic
│           ├── agent_service.py      # 3 chat pipelines (general/memory/hybrid)
│           ├── cognee_adapter.py     # Bridge to Cognee — remember/recall/forget
│           ├── knowledge_router.py   # Detects which mode to use, routes request
│           ├── hallucination_predictor.py  # Scores response reliability (0–1)
│           ├── health_engine.py      # Computes memory health score A–F
│           ├── pathology_engine.py   # Detects 6 disease types in memory
│           ├── contradiction_service.py    # Finds conflicting memory nodes
│           ├── feedback_service.py   # Processes user feedback, updates graph
│           ├── repair_engine.py      # Auto-fixes detected diseases
│           ├── mri_monitor.py        # Background thread: scans health every N min
│           ├── evolution_service.py  # Memory decay and aging over time
│           ├── preference_service.py # Learns and updates user preferences
│           ├── surgery_service.py    # Bulk pin/delete/merge operations
│           ├── version_service.py    # History and undo for individual memories
│           ├── importance_engine.py  # Scores node importance for recall ranking
│           ├── graph_reasoning.py    # Multi-hop graph traversal for answers
│           ├── explainable_recall.py # Explains WHY a node was recalled
│           ├── memory_utils.py       # Shared helpers (normalize, score, embed)
│           ├── audit_log.py          # Logs all memory events to disk
│           └── store.py              # Singleton: exports active_store instance
│
└── frontend/                         # React 18 + Vite web app
    ├── index.html                    # Single-page app shell
    ├── package.json                  # Node dependencies (3d-force-graph, three, etc.)
    ├── tailwind.config.js            # Dark warm stone palette
    ├── vite.config.js                # Dev server + build config
    └── src/
        ├── App.jsx                   # React Router — wires pages to URLs
        ├── main.jsx                  # React 18 root mount
        ├── index.css                 # Global dark theme, scrollbar, table styles
        │
        ├── api/
        │   └── client.js             # All API calls in one place (axios instance)
        │
        ├── hooks/
        │   ├── useChat.js            # 3 isolated conversation states + send/save
        │   ├── useMemory.js          # Graph, health, diagnosis data + polling
        │   └── useStatus.js          # Backend status polling (online/offline)
        │
        ├── components/
        │   ├── Chat/
        │   │   ├── ChatInterface.jsx  # Mode selector + message list + input bar
        │   │   ├── MessageBubble.jsx  # Single message with provenance badges
        │   │   └── FeedbackBar.jsx    # Save / thumbs up / thumbs down / forget
        │   │
        │   ├── MemoryGraph/
        │   │   ├── MemoryGraph.jsx    # Three.js 3D force-directed graph
        │   │   └── NodeDetail.jsx     # Side panel on node click (full details)
        │   │
        │   ├── HealthDashboard/       # Score ring + grade card + metric panels
        │   ├── DiagnosisPanel/        # Disease cards with severity + repair buttons
        │   └── TimelineViewer/        # Chronological memory event log
        │
        └── pages/
            ├── ChatPage.jsx           # /           — chat + recalled node list
            ├── GraphPage.jsx          # /graph      — 3D memory graph fullscreen
            ├── HealthPage.jsx         # /health     — health dashboard + diagnosis
            ├── SurgeryPage.jsx        # /surgery    — bulk memory edit table
            ├── EvolutionPage.jsx      # /evolution  — memory timeline / aging
            └── ExplorerPage.jsx       # /explorer   — search + filter all nodes
```

---

## 5. Technology Stack

### Programming Languages

| Language | Usage |
|---|---|
| Python 3.10+ | Backend, memory engine, all AI logic |
| JavaScript (ES2022) | Frontend React application |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18 | Component model, state management |
| Vite | 5.4 | Build tool, hot module replacement |
| Tailwind CSS | 3 | Utility-first dark warm stone theme |
| Three.js | 0.185 | 3D rendering engine for memory graph |
| 3d-force-graph | 1.80 | Force-directed graph on top of Three.js |
| Framer Motion | 11 | Smooth message and panel animations |
| Lucide React | latest | Consistent icon set |
| Axios | 1.7 | HTTP client with interceptors |
| React Router | 6 | Client-side routing |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| FastAPI | 0.111 | Async web framework, auto-generates `/docs` |
| Uvicorn | 0.30 | ASGI server |
| Pydantic | 2 | Request/response validation + settings |
| Cognee | 1.2.2 | Knowledge graph with `remember/recall/forget` API |
| Groq SDK | latest | Fast LLM inference (Llama 3.3 70B) |
| Python `threading` | stdlib | Non-blocking background memory indexing |

### AI / ML

| Technology | Purpose |
|---|---|
| Groq + Llama 3.3 70B Versatile | Main LLM for all chat responses |
| Cognee 1.2.2 | Knowledge graph construction + semantic recall |
| LanceDB | Local vector database for embeddings |
| Ladybug | Local graph database for entity relationships |
| MD5 fingerprinting | Content-addressable forget blacklist |
| Jaccard similarity | Cascade forget for semantically similar nodes |

### APIs & Cloud Services

| Service | Purpose |
|---|---|
| Groq API | LLM inference (free tier, ~300 req/min) |
| Cognee Cloud (optional) | Persistent cloud memory across machine restarts |
| Gemini API (optional) | Fallback LLM if Groq unavailable |

---

## 6. Features

### Implemented Features

#### Core Memory System
- **Persistent memory**: facts stored in knowledge graph survive across sessions
- **Dual recall pipeline**: shadow store (instant keyword match) + Cognee cloud (semantic vector search) merged and deduplicated
- **Content blacklist**: MD5 fingerprint prevents forgotten memories from ever resurfacing
- **Cascade forget**: forgetting one node auto-forgets semantically similar nodes (Jaccard ≥ 0.45)
- **Auto-tagging**: every stored memory is auto-tagged with extracted content keywords
- **Background indexing**: `cognee.remember()` runs in a background thread — never blocks the chat response

#### Three Chat Modes
- **General mode**: pure LLM, no memory injection — for factual questions
- **Memory mode**: pure memory recall, no LLM hallucination — for personal context
- **Hybrid mode**: merges both — best of both worlds, default for most questions

#### Memory Visibility & Control
- **3D knowledge graph**: Three.js force-directed graph of all memory nodes with animated edges
- **Provenance badges**: every response shows the exact source (memory % vs. LLM %)
- **Node detail panel**: click any graph node to see full content, tags, confidence, retrieval history
- **Save to Memory**: in General mode, bookmark any AI response with one click
- **Forget button**: permanently remove a memory — it never comes back

#### Memory Health System
- **Health score A–F**: overall grade computed from confidence, freshness, contradiction density
- **MRI monitor**: background thread re-scans health every few minutes
- **Six disease types**: Memory Rot, Contamination, Fragmentation, Amnesia, Bias, Noise
- **Auto-repair engine**: one-click fix for each detected disease
- **Contradiction detection**: flags nodes that conflict with each other

#### Additional Features
- **Feedback system**: thumbs up / thumbs down / mark wrong / mark correct per message
- **Surgery page**: bulk pin, delete, or merge memory nodes in a table view
- **Evolution timeline**: chronological log of when memories were added, modified, or forgotten
- **Explorer page**: full-text search and filter across all stored nodes
- **Hallucination predictor**: scores each response for reliability before sending
- **Explainable recall**: explains why specific nodes were retrieved for a query
- **Version history**: undo changes to individual memories
- **Audit log**: persistent log of all memory operations
- **Preference learning**: automatically detects and stores user preference patterns
- **Graph reasoning**: multi-hop traversal finds indirect connections between memories
- **Dark warm theme**: low-eye-strain stone palette throughout the UI

### Planned Features

- **Multi-user memory namespacing** — separate memory graphs per user account
- **Memory export / import** — JSON download of your entire knowledge graph
- **Scheduled memory review** — weekly digest of memories that may have become stale
- **Voice input** — speak facts directly into memory
- **Browser extension** — save any webpage or article to Eluvion memory with one click
- **Memory sharing** — share specific memory subgraphs with teammates
- **LLM agnostic layer** — swap between GPT-4, Claude, Gemini without changing anything else
- **Mobile app** — React Native companion for on-the-go memory capture
- **Semantic deduplication** — auto-merge nodes that mean the same thing expressed differently
- **Memory compression** — summarize low-priority old nodes to save space

---

## 7. System Workflow

### End-to-End Conversation Flow

```
1. User opens the app at http://localhost:5173
   └─► React loads, checks backend status at /api/status
   └─► useMemory hook starts polling graph + health every 30s

2. User selects a chat mode (General / Memory / Hybrid)
   └─► ChatInterface renders mode-specific UI

3. User types a message and hits Enter
   └─► useChat.send(query, mode) called
   └─► POST /api/chat { query, mode, conversation_id }

4. Backend receives request
   └─► knowledge_router.route(query, mode) selects pipeline
   └─► agent_service runs the matching pipeline:
       ┌─ General ──► Groq LLM directly, no memory
       ├─ Memory ───► cognee_adapter.recall(query) → inject nodes → Groq LLM
       └─ Hybrid ───► recall() + Groq LLM both run → merge response

5. For Memory / Hybrid: cognee_adapter.recall(query)
   └─► _score_local(query): keyword match on shadow store (< 1ms)
   └─► cognee.recall(query_text): semantic vector search (< 500ms)
   └─► merge both result sets, deduplicate by node.id
   └─► filter: skip any node whose fingerprint is in _forgotten_fingerprints
   └─► return top-8 nodes

6. LLM call (Groq, ~200ms)
   └─► System prompt includes injected memory nodes as context
   └─► hallucination_predictor scores reliability of response
   └─► provenance computed (what % came from memory vs. LLM)

7. Backend returns ChatResponse
   └─► { answer, recalled_nodes, provenance, hallucination_score, mode }

8. Frontend renders response
   └─► MessageBubble shows answer text
   └─► Provenance badges: "🟢 Cognee Memory 60% · 3 nodes" etc.
   └─► FeedbackBar: Save / 👍 / 👎 / Forget buttons
   └─► Recalled nodes list shows which memories were used

9. User clicks "Forget" on a message
   └─► POST /api/feedback { feedback_type: "forget", message_id }
   └─► cognee_adapter.forget(node_id)
       └─► Jaccard cascade: auto-forget similar nodes (≥ 45% word overlap)
       └─► Add MD5 fingerprint to blacklist
       └─► Remove from shadow store
       └─► Background thread: cognee.forget() cloud purge
   └─► Graph re-renders without those nodes

10. Background MRI monitor (every 5 min)
    └─► health_engine.compute_score() → grade A-F
    └─► pathology_engine.detect_diseases() → list of diseases
    └─► Results cached → served from /api/health + /api/diagnosis
```

### Memory Storage Lifecycle

```
New fact arrives
    │
    ▼
cognee_adapter.remember()
    │
    ├── Create MemoryNode (id, content, subject, tags, confidence, timestamps)
    │
    ├── Auto-extract keywords (stop-word filtered, top-12 content words)
    │   └── merge into node.tags
    │
    ├── shadow_store[node.id] = node        ← available for recall IMMEDIATELY
    │
    └── background thread:
            cognee.remember(content, dataset)
                │
                └── Cognee indexes into LanceDB (vectors) + Ladybug (graph)
                    └── available for semantic search within ~2 seconds

Node lives in memory
    │
    ├── recalled → retrieval_count += 1, last_retrieved updated
    ├── thumbs up → confidence += 0.05
    ├── marked wrong → confidence -= 0.2
    └── evolution_service ages confidence over time (slow decay)

Node is forgotten
    │
    ├── _forgotten_fingerprints.add(MD5(normalized_content))
    ├── shadow_store.pop(node.id)
    ├── edges referencing node removed
    └── background: cognee.forget() cloud purge
        └── fingerprint blacklist ensures it never returns from cloud
```

---

## 8. Development Timeline

### Day 1 — Foundation & Core Memory

**Objectives**
- Set up project structure
- Get basic chat working with Cognee memory

**Tasks Completed**
- Initialized FastAPI backend and React + Vite frontend
- Integrated Cognee 1.2.2 with `remember/recall/forget` native API
- Built `CogneeAdapter` class wrapping all Cognee calls
- Created basic chat endpoint `/api/chat` with General and Memory modes
- Set up Groq LLM integration (Llama 3.3 70B)
- Built initial `ChatInterface.jsx` with message list and input

**Features Implemented**
- Three chat modes (General / Memory / Hybrid)
- Basic memory store and recall (keyword only, no cloud yet)
- Message history per mode

**Challenges Faced**
- Cognee 1.2.2 API surface differs from 1.1.x documentation — had to trace source code to find correct method signatures
- `cognee.recall()` takes `query_text`, not positional argument

**Solutions**
- Read Cognee source directly; wrote thin adapter to isolate API surface from business logic

---

### Day 2 — Memory Control & Forget System

**Objectives**
- Make "Forget" work reliably
- Prevent forgotten memories from resurfacing

**Tasks Completed**
- Implemented `_content_fingerprint(content)` — MD5 of lowercased normalized content
- Added `_forgotten_fingerprints: set` to `CogneeAdapter.__init__`
- Implemented cascade forget with Jaccard ≥ 0.45 overlap detection
- Built `/api/feedback` endpoint for thumbs up/down/forget/correct
- Fixed recall path to filter blacklist from both shadow store and cloud results

**Features Implemented**
- Permanent forget with content fingerprint blacklist
- Cascade forget catches auto-stored paraphrases
- Background `cognee.forget()` cloud purge

**Bugs Fixed**
- Forgotten memories resurfacing from cloud — fixed by applying fingerprint filter to both recall paths
- Auto-saved paraphrases surviving forget — fixed by Jaccard cascade

---

### Day 3 — Dual Recall Pipeline & Save-to-Memory

**Objectives**
- Fix General mode → Memory mode cross-contamination
- Ensure freshly saved memories are immediately retrievable

**Tasks Completed**
- Refactored `recall()` to merge shadow store + cloud results rather than taking either/or
- Added `_score_local()` returning `List[tuple[score, node]]` for clean separation
- Fixed `saveToMemory()` in `useChat.js` to accept and pass `userQuery` for auto-tagging
- Updated `FeedbackBar.jsx` to pass `message.userQuery` to `GeneralBar` component
- Verified save → recall pipeline works end-to-end within the same session

**Bugs Fixed**
- `recall()` exclusive path: cloud results bypassed shadow store — fixed with dual merge
- Freshly saved General memories not found in Memory mode — fixed by always checking shadow store first

---

### Day 4 — Health System & Memory Diseases

**Objectives**
- Build memory health monitoring
- Add disease detection and repair

**Tasks Completed**
- Built `health_engine.py` — computes A–F grade from confidence, age, contradiction density
- Built `pathology_engine.py` — detects Memory Rot, Contamination, Fragmentation, Amnesia, Bias, Noise
- Built `mri_monitor.py` — background thread rescanning every 5 minutes
- Built `repair_engine.py` — auto-repair for each disease type
- Built `contradiction_service.py` — finds conflicting nodes
- Added `/api/health` and `/api/diagnosis` endpoints
- Built `HealthDashboard` and `DiagnosisPanel` components

**Features Implemented**
- Real-time health grade with MRI background monitor
- Six disease types with severity scoring
- One-click auto-repair

---

### Day 5 — 3D Graph & Visual Layer

**Objectives**
- Replace 2D ReactFlow graph with immersive 3D graph
- Make memory visually navigable

**Tasks Completed**
- Installed `3d-force-graph@1.80.0` and `three@0.185.1`
- Rewrote `MemoryGraph.jsx` from scratch using dynamic `import('3d-force-graph')`
- Implemented `ResizeObserver` to keep canvas sized to container
- Added animated directional particles on edges
- Added disease-colored nodes (cyan=healthy, amber=rotting, red=contaminated, etc.)
- Added node size encoding (size = confidence + retrieval count)
- Fixed mounting bug: container always rendered to keep `useRef` stable
- Added empty-state overlay (absolute positioned, doesn't affect Three.js mount)

**Bugs Fixed**
- `react-force-graph` AFRAME crash — switched to `3d-force-graph`
- Blank screen: early return for empty nodes set `containerRef=null` — fixed with always-render container
- `await` inside non-async `useEffect` — removed bad `await import()` call

---

### Day 6 — Dark Theme, Git Hygiene & Polish

**Objectives**
- Fix eye-strain bright UI
- Clean up git history
- Write comprehensive README

**Tasks Completed**
- Full dark warm stone theme applied to `tailwind.config.js` and `index.css`
- `bg-primary` shifted from `#e2dcd3` to `#1c1917`, full warm dark palette
- Set `color-scheme: dark` to fix browser chrome (scrollbars, inputs, etc.)
- Fixed git root (home dir was accidentally the git root, sweeping IDE files)
- Expanded `.gitignore` to cover skills, agents, IDE, cache, binaries, secrets
- Removed all gitignored files from tracking with `git rm --cached`
- Wrote comprehensive README with architecture diagrams

**Bugs Fixed**
- Git push rejected due to 192MB file from home-dir git root — re-initialized git inside `hangover/`
- Large files swept up: `.agents/`, `skills/`, IDE caches excluded by `.gitignore`

---

## 9. Installation & Setup

### Prerequisites

| Requirement | Minimum Version | How to Check |
|---|---|---|
| Python | 3.10+ | `python3 --version` |
| pip | 23+ | `pip --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Git | any | `git --version` |

You will also need a **free Groq API key** from [console.groq.com](https://console.groq.com) — takes 30 seconds, no credit card required.

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/rithvikreddy1408/Eluvion-hangover-.git
cd Eluvion-hangover-
```

---

### Step 2 — Backend Setup

```bash
cd backend

# Create a virtual environment
python3 -m venv .venv

# Activate it
source .venv/bin/activate          # macOS / Linux
# .venv\Scripts\activate           # Windows

# Install Python dependencies
pip install -r requirements.txt
```

Create your environment file:

```bash
cp .env.example .env
# Open .env in any editor and fill in your keys
```

Minimum `.env` to get started (all other settings have defaults):

```env
GROQ_API_KEY=gsk_your_key_here

USE_COGNEE=true
LLM_PROVIDER=groq
LLM_MODEL=llama-3.3-70b-versatile

VECTOR_DB_PROVIDER=lancedb
GRAPH_DATABASE_PROVIDER=ladybug
COGNEE_DATASET=eluvion
```

**Optional — Cognee Cloud** (memory persists across machine restarts):

```env
COGNEE_API_KEY=your_cognee_cloud_key
COGNEE_SERVICE_URL=https://your-tenant.aws.cognee.ai
```

**Optional — Gemini fallback LLM**:

```env
GEMINI_API_KEY=your_gemini_key
```

---

### Step 3 — Start the Backend

```bash
# Make sure you're in the backend/ directory with venv activated
uvicorn main:app --reload --port 8000
```

Expected output:

```
[Eluvion v2] Memory backend: cognee-local
[Eluvion v2] MRI monitor started
[Eluvion v2] Evolution service started
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

Interactive API docs available at: **http://localhost:8000/docs**

---

### Step 4 — Frontend Setup

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Expected output:

```
  VITE v5.4.21  ready in 248 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open **http://localhost:5173** in your browser.

---

### Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `GROQ_API_KEY` | **Yes** | — | From console.groq.com (free) |
| `USE_COGNEE` | No | `false` | Enable real memory engine |
| `LLM_PROVIDER` | No | `groq` | `groq` or `gemini` |
| `LLM_MODEL` | No | `llama-3.3-70b-versatile` | Model name for Groq |
| `VECTOR_DB_PROVIDER` | No | `lancedb` | Local vector store |
| `GRAPH_DATABASE_PROVIDER` | No | `ladybug` | Local graph store |
| `COGNEE_DATASET` | No | `eluvion` | Memory namespace |
| `COGNEE_API_KEY` | No | — | Cognee Cloud key |
| `COGNEE_SERVICE_URL` | No | — | Cognee Cloud tenant URL |
| `GEMINI_API_KEY` | No | — | Fallback LLM key |

---

## 10. Usage Guide

### First Run Walkthrough

**1. Verify the backend is online**

Open http://localhost:5173 — the sidebar should show a green dot next to "Memory System Online".

**2. Store your first memory**

Select **Memory** mode (brain icon). Type:

```
My name is Rithvik and I'm building an AI startup called Eluvion.
```

The AI will respond and automatically store this as a memory node.

**3. Test recall**

Still in Memory mode, type:

```
What's my name?
```

Eluvion should answer: *"According to my memory, your name is Rithvik and you're building an AI startup called Eluvion."*

**4. Save from General mode**

Switch to **General** mode (globe icon). Ask:

```
What are the best practices for building a REST API?
```

Click **"Save to Memory"** on the response. Now switch to Memory mode and ask:

```
What do I know about REST API best practices?
```

It will retrieve what you just saved.

**5. Explore the 3D graph**

Go to **/graph** — you should see your memory nodes as glowing spheres connected by edges. Drag to rotate, scroll to zoom, click any node for details.

**6. Check memory health**

Go to **/health** — the dashboard shows your current memory grade and any detected issues.

**7. Forget something**

In any chat, click the **Forget** button (trash icon) on a message. That memory is permanently erased — it will never appear in any future recall.

---

### Key Interactions

| Action | How | Effect |
|---|---|---|
| Store a memory | Chat in Memory or Hybrid mode | Auto-stored + indexed |
| Recall a memory | Chat in Memory or Hybrid mode | Top-8 relevant nodes injected into response |
| Save General response | Click "Save to Memory" button | Bookmarked to knowledge graph |
| Forget a memory | Click Forget (trash) on a message | Permanent — cascade deletes similar nodes |
| Thumbs up | Click 👍 | Confidence +5% |
| Thumbs down | Click 👎 | Confidence −10% |
| View full graph | Navigate to /graph | 3D interactive visualization |
| Check health | Navigate to /health | Grade + disease list |
| Bulk edit | Navigate to /surgery | Table with pin/delete/merge |
| Search memories | Navigate to /explorer | Full-text search + filter |

---

### API Usage Examples

```bash
# Chat in hybrid mode
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What is my name?", "mode": "hybrid"}'

# List all memories
curl http://localhost:8000/api/memories

# Add a memory manually
curl -X POST http://localhost:8000/api/memories \
  -H "Content-Type: application/json" \
  -d '{"content": "I prefer dark mode", "subject": "preferences", "tags": ["ui"]}'

# Get memory health
curl http://localhost:8000/api/health

# Get disease diagnosis
curl http://localhost:8000/api/diagnosis

# Get graph data for visualization
curl http://localhost:8000/api/graph
```

---

## 11. Challenges Faced

### Challenge 1: Forgotten Memories Resurfacing

**Problem**: After clicking Forget, the memory would come back in the next conversation because Cognee's cloud index still held it and the `recall()` path fetched it again.

**Solution**: Content fingerprinting. Every node's content is normalized (lowercased, whitespace-collapsed) and hashed with MD5. The hash goes into a permanent `_forgotten_fingerprints` set. Both recall paths (shadow store and cloud) are filtered against this blacklist — so even if Cognee cloud returns a forgotten node, it is silently dropped before reaching the LLM.

---

### Challenge 2: Auto-Stored Paraphrases Surviving Forget

**Problem**: Cognee internally stores variations and paraphrases of input. Forgetting the original by its node ID left these paraphrases alive — the same knowledge kept coming back in different wording.

**Solution**: Cascade forget using Jaccard similarity. When a node is forgotten, we compute the Jaccard overlap (intersection / union of content word sets, minus stop words) between the forgotten node and every other node in the shadow store. Any node with ≥ 45% overlap is also cascade-forgotten. This catches paraphrases, summaries, and auto-stored variations.

---

### Challenge 3: Fresh Memories Not Immediately Recallable

**Problem**: `cognee.remember()` indexes asynchronously in the cloud. A memory saved at T=0 wasn't searchable until T≈2s. Users who typed in Memory mode right after saving saw "no memory found".

**Solution**: Dual recall pipeline. The shadow store (in-process Python dict) is always updated synchronously before the background thread fires. `recall()` now queries BOTH the shadow store (keyword match, sub-millisecond) AND the cloud (semantic, async). Results are merged and deduplicated by node ID. Fresh memories are always found via shadow store, regardless of cloud indexing latency.

---

### Challenge 4: 3D Graph Blank Screen

**Problem**: `react-force-graph` bundles AFRAME (a WebXR/VR framework) which crashed the browser tab on load. When we switched to `3d-force-graph` with dynamic import, the graph still showed blank because the component returned early for empty node lists — which set `containerRef` to null — so when data arrived later, the `useEffect([])` never re-ran (refs don't trigger effects).

**Solution**: The container `<div>` is always rendered unconditionally. The empty-state UI is an absolutely positioned overlay with `pointer-events: none` — it floats over the canvas without affecting the Three.js mount point. The `useEffect([], [])` always fires, always finds the container, and always mounts the graph. Data updates go through a second `useEffect([gd])` that calls `graphRef.current?.graphData(gd)`.

---

### Challenge 5: Git Root at Home Directory

**Problem**: Running `git init` from the home directory (`~`) accidentally made the entire home directory a git repository. When we ran `git add .`, it swept up 192MB of IDE files, cache directories, API keys, and everything else in `~`.

**Solution**: Proper `.gitignore` first, then moved git root to `hangover/` only. Removed all gitignored files from tracking with `git rm --cached -r`. Pushed clean history.

---

### Challenge 6: Cognee API Surface Mismatch

**Problem**: Cognee 1.2.2 has a different API than what the 1.1.x documentation shows. Methods like `cognee.recall()` require keyword arguments (`query_text=`) not positional.

**Solution**: Read Cognee source code directly instead of relying on docs. Wrapped all Cognee calls in the `CogneeAdapter` class so the API surface is isolated — if Cognee changes again, only one file needs updating.

---

## 12. Future Scope

### Near-Term (Next Sprint)

- **Multi-user support**: namespace memory graphs by user ID, add auth layer
- **Memory export**: download full knowledge graph as JSON or Markdown
- **Semantic deduplication**: auto-merge nodes expressing the same fact differently
- **Stale memory alerts**: weekly digest of memories that may have rotted
- **Richer provenance**: show exact graph path used to answer a question

### Medium-Term

- **Browser extension**: save any webpage or article to Eluvion with one click
- **Voice input**: speak directly into memory via Web Speech API
- **Memory sharing**: export and share specific memory subgraphs as read-only links
- **LLM-agnostic adapter**: swap between GPT-4, Claude, Gemini from a config value
- **Scheduled learning**: auto-review flagged memories on a cron schedule

### Long-Term

- **Mobile app**: React Native companion for on-the-go memory capture
- **Team memory**: shared organizational knowledge graph with role-based access
- **Memory compression**: summarize clusters of low-priority old nodes to save space
- **Edge deployment**: run the full stack locally on-device (no cloud required)
- **Plugin system**: third-party plugins to connect memory to Notion, Obsidian, GitHub Issues
- **Federated memory**: sync memory across multiple devices while keeping it private

---

## 13. Team Contributions

| Member | Role | Responsibilities |
|---|---|---|
| Rithvik Reddy | Full-Stack Developer & AI Engineer | Backend architecture, CogneeAdapter, memory pipeline, health system, all frontend components, 3D graph, dark theme, DevOps |

*Built solo for the Cognee Hackathon 2026.*

---

## 14. Screenshots

### Chat Interface — Hybrid Mode

```
┌─────────────────────────────────────────────────────┐
│  ◉ General   ◉ Memory   ● Hybrid                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  You: What framework should I use for my project?  │
│                                                     │
│  Eluvion: Based on your preference for Python and  │
│  FastAPI that I have stored, I recommend staying   │
│  with FastAPI for your backend...                  │
│                                                     │
│  🟢 Cognee Memory 68% · 2 nodes                    │
│  🔵 General Knowledge 32%                          │
│                                                     │
│  [💾 Save]  [👍]  [👎]  [🗑 Forget]               │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Type a message...                         [Send]  │
└─────────────────────────────────────────────────────┘
```

### 3D Memory Graph

```
         ●  [FastAPI]
        /|\
       / | \
[Python]─●─[Startup]
          |
        [REST API]──●──[Best Practices]

  ● = Memory node (color = health status)
  ── = Relationship edge with animated particles
  Drag to rotate · Scroll to zoom · Click for details
```

### Health Dashboard

```
┌──────────────────────────────────────────┐
│  Memory Health Score                     │
│                                          │
│         ████████░░  82/100              │
│              Grade: B                    │
│                                          │
│  Nodes: 47    Edges: 61    Diseases: 1  │
│                                          │
│  ⚠ Memory Rot detected (2 nodes)        │
│    These facts may be outdated           │
│    [Auto-Repair]                         │
└──────────────────────────────────────────┘
```

---

## 15. Demo

| Resource | Link |
|---|---|
| GitHub Repository | [github.com/rithvikreddy1408/Eluvion-hangover-](https://github.com/rithvikreddy1408/Eluvion-hangover-) |
| Live API Docs | http://localhost:8000/docs (run locally) |
| Backend API | http://localhost:8000 |
| Frontend | http://localhost:5173 |

---

## 16. License

MIT License

```
Copyright (c) 2026 Rithvik Reddy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

*Built for the Cognee Hackathon · Eluvion v2 — AI Memory OS · 2026*
