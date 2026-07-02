# ELUVION — ARCHITECTURE BIBLE v2.0

> The permanent engineering reference for rebuilding Eluvion from zero.
> Authored from the perspective of a Staff AI Systems Architect.
> No implementation detail from v1 survives unless it is architecturally correct.

---

## 1. VISION

### What is Eluvion?

Eluvion is an **AI Memory Pathology Platform** — a system that treats AI memory as a living organism: something that can be healthy, sick, fragmented, contaminated, decayed, or healed.

It is not a chatbot. It is not a memory viewer. It is a diagnostic and surgical platform for AI cognition.

### Why does it exist?

Every AI system that relies on persistent memory eventually suffers from memory failure. Memories contradict each other. Old facts persist after they become false. Confidence scores drift. Concepts fragment across disconnected nodes. Retrieval returns the wrong subgraph. The LLM hallucinates — not because it lacks knowledge, but because its memory is diseased.

No existing tool diagnoses this. No existing tool repairs it. Eluvion does both.

### What problem does it solve?

**The silent degradation of AI memory over time.**

Specifically:
- Retrieved memories that no longer reflect ground truth
- Confidence scores that were never calibrated
- Graph topology that prevents correct concept association
- No observability into what the LLM "remembers" vs "knows"
- No mechanism to repair memory without destroying it

### Why does AI memory matter?

Without reliable memory, every AI interaction starts from zero. The LLM cannot build on previous conversations, cannot correct itself over time, cannot distinguish between what it was told yesterday vs a year ago. Memory is the difference between a tool and an agent with continuity.

Memory is not optional. It is the substrate of intelligence.

### Why is Cognee the core of the system?

Cognee is not a vector database wrapper. It is a memory cognition library — it models memory as a **knowledge graph** with semantic relationships, not a flat embedding store. This matters because:

- Memories relate to each other (Cognee models this)
- Retrieval should traverse concept graphs, not just rank vectors (Cognee does this)
- Memory evolution should reshape the graph structure (Cognee enables this)
- `remember()`, `recall()`, `forget()`, `improve()` are cognitive operations, not CRUD

Any other storage backend makes Eluvion a dashboard. Cognee makes it a cognition platform.

### Why is this NOT another chatbot?

A chatbot sends messages. Eluvion **operates on the memory substrate that makes messages meaningful.**

The chat interface is a probe — a way to inject observations and verify that recall is functioning correctly. The real product is the MRI engine, the pathology scanner, the repair pipeline, and the evolution service. The chat is a window into memory, not the purpose of the system.

---

## 2. CORE PHILOSOPHY

These principles are architectural law. Every engineering decision must be consistent with them.

### Memory is the first-class citizen
Every service exists to serve memory. The LLM is a reasoning tool that operates on retrieved memory. The UI exists to expose memory state. The API exists to operate on memory. Nothing bypasses memory.

### Retrieval happens before inference — always
The LLM must never generate a response without first querying the memory graph. Retrieval is not optional. It is step one of every pipeline.

### Diagnosis is continuous, not on-demand
The MRI engine runs in the background at all times. By the time the user opens the diagnosis panel, the report already exists. Scanning on click is a v1 mistake.

### Memory evolves autonomously
The system does not wait for user commands to improve itself. An evolution service runs idle-time background jobs: merging duplicates, decaying stale nodes, strengthening frequently-retrieved concepts, rebuilding graph topology.

### Reasoning is downstream of memory
The LLM receives a curated, health-scored, pre-verified memory context. It does not decide what to remember. It does not decide what to retrieve. It only reasons over what the memory layer provides.

### Graph visualization is NOT the product
The knowledge graph is an internal data structure. Visualizing it is a debugging tool. The product is the ability to diagnose memory health and perform surgical repair.

### Every operation is traceable
Every retrieval must record: what was queried, what was returned, traversal path, confidence at time of retrieval, and whether the retrieved memory was stale. This trace feeds the MRI engine.

### Repair must be reversible
No surgery modifies memory destructively. Every repair operation creates a snapshot before execution and can be rolled back. Memory is treated like a database with transactions.

---

## 3. CRITICAL REVIEW OF EXISTING ARCHITECTURE

### Issue 1: Shadow Store Anti-Pattern

**Current:** `cognee_adapter.py` maintains an in-memory Python dict (`self.nodes`) as a "mirror" of Cognee. All recall uses this dict, not Cognee.

**Problem:** Cognee is bypassed entirely for retrieval. The shadow store is the actual memory system. Cognee becomes a write-only log that nobody reads.

**Why it is wrong:** The entire value proposition of Cognee — semantic retrieval, graph traversal, relationship-aware recall — is completely unused. The system is a dict with a Cognee logo painted on it.

**Correct solution:** Cognee must be the single source of truth. Retrieval must use `cognee.recall()` with proper embedding. The shadow store should be eliminated.

**Impact:** Recall quality, graph accuracy, and all downstream diagnosis depend on Cognee working correctly. This is the most critical flaw in v1.

---

### Issue 2: Diagnosis Runs on Click

**Current:** `GET /diagnosis` calls `pathology_engine.run()` synchronously when the user clicks "Scan."

**Problem:** Diagnosis is slow. It blocks the request. The cached result is stale by the next interaction. There is no continuous awareness of memory health.

**Why it is wrong:** A system that only knows its own health when asked is not a health monitoring system. It is a health reporting system, which is weaker.

**Correct solution:** A background `DiagnosisService` runs continuously on a tick interval, storing the latest report in a persistent cache. The API endpoint reads the cache — it never triggers a scan.

**Impact:** The system always knows its health. The UI shows live health, not stale snapshots.

---

### Issue 3: Agent Service is a Prompt Builder

**Current:** `agent_service.py` builds a string prompt, calls Groq, returns text. Memory context is formatted as a bullet list appended to a string.

**Problem:** This is not an agent. It is a string interpolator. There is no retrieval strategy, no context ranking, no hallucination check, no memory update on structured response.

**Why it is wrong:** The LLM receives unstructured memory context with no confidence weighting, no staleness flags, no relationship context. It cannot distinguish between a highly-confident recent memory and a decayed uncertain one.

**Correct solution:** An `AgentOrchestrator` that (1) retrieves memory subgraph with metadata, (2) passes structured context to LLM with confidence + staleness annotations, (3) post-processes the response through a verifier before storing.

**Impact:** Response quality, hallucination rate, and memory update correctness all improve.

---

### Issue 4: Repair Has No Simulation Phase

**Current:** `POST /repair` immediately modifies memory. No preview. No rollback.

**Problem:** A bad repair can destroy correct memories. There is no way to undo it.

**Why it is wrong:** Memory surgery without a simulation phase is malpractice. The user cannot see what will change before it changes.

**Correct solution:** Repair pipeline: `Diagnose → Plan → Simulate (dry run) → User confirms → Execute → Verify → Snapshot for rollback`.

**Impact:** Repair becomes safe. The UI can show a diff before applying changes.

---

### Issue 5: Health Score is Computed from Mock Data

**Current:** `health_engine.py` computes metrics from the shadow store, which is populated only by the current session. Metrics reset on restart.

**Problem:** Health score is meaningless — it reflects only the current in-memory session, not the actual persisted memory graph.

**Why it is wrong:** Health metrics must reflect the persistent Cognee graph, not a temporary Python object.

**Correct solution:** `HealthEngine` must query Cognee directly for node count, edge density, confidence distribution, staleness ratio, and retrieval hit rate — all from the real graph.

**Impact:** The health score becomes a genuine measurement of the system's cognitive state.

---

### Issue 6: No Retrieval Tracing

**Current:** `recall()` returns a list of nodes. Nothing records what was retrieved, why, or at what confidence.

**Problem:** There is no audit trail. The MRI engine cannot analyze retrieval patterns. The hallucination predictor has no data to work with.

**Why it is wrong:** Retrieval tracing is the foundation of memory intelligence. Without it, diagnosis is guesswork.

**Correct solution:** Every `recall()` call produces a `RetrievalTrace` object: query, timestamp, returned nodes, traversal path, confidence scores, staleness flags. Traces are stored and indexed.

**Impact:** All downstream intelligence — diagnosis, hallucination prediction, evolution — becomes possible.

---

### Issue 7: No Hallucination Prediction

**Current:** Does not exist.

**Problem:** The system has no ability to predict whether its own retrieval will produce a hallucination before the LLM speaks.

**Correct solution:** A `HallucinationPredictor` that scores each retrieval context: confidence distribution, recency of memories, contradictions in subgraph, coverage gaps. If score exceeds threshold, the system warns before inference.

**Impact:** Eluvion becomes proactive rather than reactive. This is the most impressive hackathon feature.

---

### Issue 8: Frontend Mixes Pages and Cognition Concepts

**Current:** Pages are named "Chat", "Graph", "Health". These are UI metaphors.

**Problem:** The UI does not communicate what the system actually does. "Graph" is a technical detail. "Health" is vague. The UI should communicate cognitive concepts.

**Correct solution:** Rename pages to reflect the product's intelligence: "Probe" (chat), "MRI" (memory scan + health), "Surgery" (repair), "Evolution" (background service status), "Observatory" (graph).

**Impact:** Demo storytelling improves significantly. Judges understand the product in 30 seconds.

---

### Issue 9: Cognee.remember() Runs in Daemon Thread with No Error Recovery

**Current:** `remember()` fires a daemon thread. If it fails, a `print()` statement logs it and the error disappears.

**Problem:** Memory writes are silently lost. The system has no knowledge of write failures.

**Correct solution:** A `MemoryWriteQueue` (async task queue) that retries failed writes, logs failures to a structured error store, and exposes write health as a metric.

**Impact:** Memory durability becomes observable and reliable.

---

### Issue 10: No Domain Separation

**Current:** `services/` contains unrelated concerns: LLM calling, memory adapting, pathology detection, health computation, repair execution — all flat siblings.

**Problem:** A change to pathology detection can accidentally affect repair logic. There are no enforced boundaries.

**Correct solution:** Domain-driven folder structure with explicit boundaries. Each domain owns its models, services, and interfaces.

**Impact:** Codebase becomes maintainable. Features can be developed independently.

---

## 4. CORRECT SYSTEM ARCHITECTURE

### Layered Architecture

```
┌─────────────────────────────────────────────┐
│              PRESENTATION LAYER             │  React frontend, WebSocket stream
├─────────────────────────────────────────────┤
│              AGENT LAYER                    │  AgentOrchestrator, multi-agent routing
├─────────────────────────────────────────────┤
│              RETRIEVAL LAYER                │  CogneeRetriever, RetrievalTracer
├─────────────────────────────────────────────┤
│              MRI ENGINE LAYER               │  HealthMonitor, PathologyScanner (continuous)
├─────────────────────────────────────────────┤
│              REASONING LAYER                │  LLM Adapter (Groq/Gemini/OpenAI)
├─────────────────────────────────────────────┤
│              PREDICTION LAYER               │  HallucinationPredictor, ConfidenceScorer
├─────────────────────────────────────────────┤
│              REPAIR LAYER                   │  SurgeonPlanner, Executor, Verifier, Rollback
├─────────────────────────────────────────────┤
│              EVOLUTION LAYER                │  EvolutionService, background idle jobs
├─────────────────────────────────────────────┤
│              COGNEE MEMORY LAYER            │  remember(), recall(), improve(), forget()
├─────────────────────────────────────────────┤
│              PERSISTENCE LAYER              │  SQLite + LanceDB + Ladybug (local) or Cloud
└─────────────────────────────────────────────┘
```

### Layer Responsibilities

**Presentation Layer**
Renders cognitive state. Does not contain business logic. Communicates with Agent Layer and MRI Layer exclusively via WebSocket (streaming) and REST.

**Agent Layer**
Orchestrates every request. Decides which sub-agents to invoke. Owns conversation state. Produces structured instructions for the Retrieval Layer. Never calls the LLM directly — always through the Reasoning Layer.

**Retrieval Layer**
Queries Cognee using `recall()`. Returns structured `RetrievalResult` with nodes, edges, traversal path, confidence scores, staleness flags. Records every retrieval as a `RetrievalTrace`. Never formats strings — returns structured objects.

**MRI Engine Layer**
Runs continuously in the background. Consumes `RetrievalTrace` events and raw memory graph snapshots. Produces `HealthReport` and `PathologyReport` on every tick. The API reads these cached reports — it never triggers a scan.

**Reasoning Layer**
Single responsibility: given a structured `InferenceRequest` (memories with metadata, system prompt, user query), call the LLM and return a structured `InferenceResult`. No prompt building happens here. Prompt building belongs to the Agent Layer.

**Prediction Layer**
Before inference, scores the retrieved context for hallucination risk. After inference, scores the LLM output against the memory graph for contradiction. Returns `PredictionReport` with risk level and specific risky claims.

**Repair Layer**
Given a `DiseaseReport`, generates a `RepairPlan`, runs a simulation (dry run), executes with snapshot, verifies result, exposes rollback. Never modifies memory directly — always through Cognee's `improve()` and `forget()`.

**Evolution Layer**
A background service that runs during idle periods. Performs autonomous memory improvement: merging duplicates, decaying stale nodes, strengthening frequently-retrieved concepts, generating concept summaries. Never blocks user requests.

**Cognee Memory Layer**
The only layer allowed to call `cognee.remember()`, `cognee.recall()`, `cognee.improve()`, `cognee.forget()`. All other layers go through this layer's interface. This is the cognition boundary.

**Persistence Layer**
Managed entirely by Cognee. Local: SQLite (relational) + LanceDB (vectors) + Ladybug (graph). Cloud: Weaviate (vectors) + Neo4j (graph). Zero application code in this layer.

### Layer Communication Rules
- Each layer communicates only with adjacent layers
- No layer skips a layer to call a deeper one
- All inter-layer communication uses typed interfaces (Pydantic models)
- The MRI Engine Layer is an observer — it reads all layers but modifies nothing

---

## 5. DOMAIN DRIVEN DESIGN

### Memory Domain
**Owns:** Memory node lifecycle — creation, update, deletion, confidence management, provenance tracking.
**Entities:** `MemoryNode`, `MemoryEdge`, `MemoryProvenance`, `ConfidenceHistory`
**Rule:** No other domain modifies memory directly. All writes go through this domain's `MemoryService`.

### Retrieval Domain
**Owns:** Everything about fetching memory — query strategy, embedding, graph traversal, result ranking, trace recording.
**Entities:** `RetrievalQuery`, `RetrievalResult`, `RetrievalTrace`, `TraversalPath`
**Rule:** This domain never modifies memory. It only reads.

### Diagnosis Domain
**Owns:** Memory health scoring, disease detection, pathology reporting.
**Entities:** `HealthReport`, `PathologyReport`, `Disease`, `Symptom`, `DiseaseMetric`
**Rule:** This domain only reads from the Memory and Retrieval domains. It never writes.

### Prediction Domain
**Owns:** Hallucination risk scoring, confidence calibration, contradiction detection.
**Entities:** `PredictionReport`, `HallucinationRisk`, `ContradictionPair`, `ConfidenceScore`
**Rule:** Runs before and after every inference. Never skipped.

### Repair Domain
**Owns:** Repair planning, simulation, execution, verification, rollback.
**Entities:** `RepairPlan`, `RepairSimulation`, `RepairResult`, `RepairSnapshot`
**Rule:** Every repair requires a `RepairSnapshot` before execution. Rollback must always be possible.

### Evolution Domain
**Owns:** Autonomous background improvement — deduplication, decay, strengthening, summarization.
**Entities:** `EvolutionJob`, `EvolutionResult`, `MergeCandidate`, `DecayCandidate`
**Rule:** Evolution jobs are non-destructive. They propose changes; the Repair domain executes them.

### Agent Domain
**Owns:** Conversation management, intent classification, sub-agent routing, context assembly.
**Entities:** `ConversationTurn`, `AgentContext`, `AgentIntent`, `MemoryAugmentedPrompt`
**Rule:** Agents are stateless per-request. Conversation state lives in the Memory domain.

### Visualization Domain
**Owns:** Graph rendering data preparation, layout computation, timeline formatting.
**Entities:** `GraphSnapshot`, `VisualNode`, `VisualEdge`, `TimelineEvent`
**Rule:** This domain is read-only and derives everything from the Memory domain. It owns no data.

---

## 6. FOLDER STRUCTURE

```
eluvion/
├── backend/
│   ├── main.py                        ← app factory only
│   ├── .env
│   │
│   ├── domains/
│   │   ├── memory/
│   │   │   ├── models.py              ← MemoryNode, MemoryEdge, MemoryProvenance
│   │   │   ├── service.py             ← MemoryService (only write interface)
│   │   │   ├── repository.py          ← CogneeRepository (wraps cognee API)
│   │   │   └── write_queue.py         ← async retry queue for cognee.remember()
│   │   │
│   │   ├── retrieval/
│   │   │   ├── models.py              ← RetrievalQuery, RetrievalResult, RetrievalTrace
│   │   │   ├── retriever.py           ← CogneeRetriever (calls cognee.recall())
│   │   │   ├── ranker.py              ← ranks results by confidence + recency
│   │   │   └── tracer.py             ← records RetrievalTrace for every recall
│   │   │
│   │   ├── diagnosis/
│   │   │   ├── models.py              ← HealthReport, PathologyReport, Disease, Symptom
│   │   │   ├── health_engine.py       ← computes HealthScore from graph metrics
│   │   │   ├── pathology_engine.py    ← detects diseases from memory graph
│   │   │   └── monitor.py            ← continuous background scan, caches reports
│   │   │
│   │   ├── prediction/
│   │   │   ├── models.py              ← PredictionReport, HallucinationRisk
│   │   │   ├── predictor.py           ← scores retrieval context for hallucination risk
│   │   │   └── calibrator.py          ← calibrates confidence from retrieval traces
│   │   │
│   │   ├── repair/
│   │   │   ├── models.py              ← RepairPlan, RepairSimulation, RepairSnapshot
│   │   │   ├── planner.py             ← builds RepairPlan from DiseaseReport
│   │   │   ├── simulator.py           ← dry-run of repair, returns diff
│   │   │   ├── executor.py            ← applies repair via cognee.improve()/forget()
│   │   │   ├── verifier.py            ← validates repair outcome
│   │   │   └── rollback.py            ← restores snapshot if verification fails
│   │   │
│   │   ├── evolution/
│   │   │   ├── models.py              ← EvolutionJob, MergeCandidate, DecayCandidate
│   │   │   ├── scheduler.py           ← idle-time job scheduler
│   │   │   ├── merger.py              ← finds and merges duplicate nodes
│   │   │   ├── decayer.py             ← weakens stale memories
│   │   │   ├── strengthener.py        ← boosts frequently-retrieved nodes
│   │   │   └── summarizer.py          ← generates concept summaries
│   │   │
│   │   ├── agent/
│   │   │   ├── models.py              ← ConversationTurn, AgentContext, AgentIntent
│   │   │   ├── orchestrator.py        ← routes requests, assembles context, calls LLM
│   │   │   ├── prompt_builder.py      ← builds MemoryAugmentedPrompt from context
│   │   │   └── llm_adapter.py         ← LLM abstraction (Groq / Gemini / OpenAI)
│   │   │
│   │   └── visualization/
│   │       ├── models.py              ← GraphSnapshot, VisualNode, TimelineEvent
│   │       └── serializer.py          ← converts Memory domain objects to UI models
│   │
│   ├── api/
│   │   ├── routes/
│   │   │   ├── agent.py               ← POST /probe (chat)
│   │   │   ├── memory.py              ← GET/DELETE /memory
│   │   │   ├── mri.py                 ← GET /mri/health, GET /mri/pathology
│   │   │   ├── surgery.py             ← POST /surgery/plan, POST /surgery/execute, POST /surgery/rollback
│   │   │   ├── evolution.py           ← GET /evolution/status, POST /evolution/trigger
│   │   │   ├── observatory.py         ← GET /observatory/graph, GET /observatory/timeline
│   │   │   └── prediction.py          ← GET /prediction/last
│   │   └── middleware/
│   │       ├── trace.py               ← attaches trace_id to every request
│   │       └── auth.py                ← API key auth (for production)
│   │
│   ├── infrastructure/
│   │   ├── cognee_client.py           ← singleton cognee setup + configuration
│   │   ├── event_bus.py               ← internal pub/sub for cross-domain events
│   │   └── cache.py                   ← in-process cache (reports, traces)
│   │
│   └── config.py                      ← pydantic-settings, absolute .env path
│
└── frontend/
    ├── src/
    │   ├── modules/
    │   │   ├── probe/                 ← chat interface (Probe module)
    │   │   ├── mri/                   ← health + pathology (MRI module)
    │   │   ├── surgery/               ← repair planning + execution
    │   │   ├── observatory/           ← knowledge graph visualization
    │   │   ├── evolution/             ← background service status
    │   │   └── prediction/            ← hallucination risk display
    │   ├── shared/
    │   │   ├── api/                   ← typed API client per module
    │   │   ├── hooks/                 ← shared React hooks
    │   │   └── ui/                    ← design system components
    │   ├── App.jsx
    │   └── main.jsx
    └── (config files)
```

**What should NEVER exist inside `domains/`:** HTTP handling, response serialization, database drivers, frontend logic.

**What should NEVER exist inside `api/`:** Business logic, Cognee calls, domain model construction.

**What should NEVER exist inside `infrastructure/`:** Domain logic, API routes, UI state.

---

## 7. DATA FLOW

### Every User Question — Step by Step

**Step 1: Receive**
`POST /probe` receives `{ message: string, session_id: string }`. Middleware attaches `trace_id`.

**Step 2: Intent Classification**
`AgentOrchestrator` classifies intent — conversation, memory lookup, system query, diagnosis request. Intent determines which sub-agents activate.

**Step 3: Retrieval**
`CogneeRetriever` calls `cognee.recall(query, limit=10)`. Returns `RetrievalResult` with nodes, edges, traversal path, confidence per node, staleness flag per node, retrieval timestamp. `RetrievalTracer` records this as a `RetrievalTrace` and emits a `retrieval.completed` event to the event bus.

**Step 4: MRI Observation**
`DiagnosisMonitor` (background listener) consumes `retrieval.completed`. Updates running health metrics. If anomaly detected, updates `PathologyReport` cache.

**Step 5: Hallucination Prediction**
`HallucinationPredictor` scores the `RetrievalResult`. Checks: confidence distribution, staleness ratio, contradiction pairs in subgraph, coverage gaps (query terms not represented in any retrieved node). Produces `PredictionReport { risk: low|medium|high, details: [...] }`.

**Step 6: Prompt Assembly**
`PromptBuilder` constructs `MemoryAugmentedPrompt`. Memory context is structured JSON, not a bullet string. Each memory carries: content, confidence, staleness, relationship to query, provenance. System prompt includes: identity, today's date, hallucination risk level, instruction to hedge if risk is high.

**Step 7: Inference**
`LLMAdapter` sends prompt to Groq. Returns `InferenceResult { text, tokens_used, latency_ms }`. This is the only place an LLM is called.

**Step 8: Post-Inference Verification**
`HallucinationPredictor` scores the LLM output against the memory graph. Detects: claims not supported by any retrieved memory, claims that contradict retrieved memories. If contradiction detected, flags for memory update.

**Step 9: Memory Update**
`MemoryService.remember()` stores: user message, assistant reply, retrieval context used, prediction score, timestamp. `WriteQueue` handles Cognee write asynchronously with retry. `RetrievalTracer` updates retrieval counts on used nodes.

**Step 10: Response**
Returns `{ answer, trace_id, memory_count, hallucination_risk, provider }`. Frontend displays answer + risk indicator.

---

## 8. COGNEE INTEGRATION

Cognee is cognition infrastructure. Treat its four APIs as cognitive operations, not database calls.

### `cognee.remember(content, dataset_name)`
**When:** After every verified user exchange. After every autonomous evolution job. After repair execution.
**Why:** This is the write path for the knowledge graph. Cognee extracts entities, relationships, and concepts and builds the graph automatically.
**How:** Always async. Always through the `WriteQueue` with retry. Never block user requests. Pass rich content — full exchange, not just the user's words. The richer the content, the better the graph.
**Never:** Call `remember()` synchronously. Call it with truncated or stripped content. Call it for temporary, session-only data.

### `cognee.recall(query, limit, dataset_name)`
**When:** Before every LLM inference. Mandatory, not optional.
**Why:** This traverses the knowledge graph semantically — it finds not just similar nodes but related concepts through graph edges. This is categorically better than flat vector search.
**How:** Pass the full user query. Request metadata alongside results (confidence, timestamps). Wrap in `CogneeRetriever` which adds ranking and tracing.
**Never:** Skip recall because "the user's question seems simple." Never use the shadow store as a substitute.

### `cognee.improve(content, dataset_name)`
**When:** During repair execution when a memory needs updating (not deletion). During evolution when a node needs strengthening or summarization.
**Why:** `improve()` updates existing knowledge graph nodes while preserving their relationships. Deletion + reinsertion destroys graph structure.
**How:** Called by `RepairExecutor` after `RepairSimulator` confirms the plan is safe. Always preceded by `RepairSnapshot`.
**Never:** Use `improve()` without a snapshot. Use it for new memories (use `remember()`).

### `cognee.forget(dataset_name)`
**When:** When a disease is diagnosed as irrecoverable (Memory Rot, Memory Contamination with no repair path). When evolution marks nodes for pruning.
**Why:** Some memories cannot be improved — they must be removed to restore graph health.
**How:** Targeted — pass specific node identifiers. Never call `forget()` on the entire dataset unless explicitly resetting. Always preceded by `RepairSnapshot`.
**Never:** Use `forget()` as a shortcut to avoid implementing `improve()`. Use it impulsively. Use it without verification.

---

## 9. RETRIEVAL ARCHITECTURE

### What is retrieved?
A `RetrievalResult` containing:
- `nodes[]` — matched MemoryNodes with full metadata
- `edges[]` — relationships between returned nodes
- `traversal_path` — the graph path Cognee followed to find results
- Per-node metadata:
  - `similarity_score` — embedding distance (0–1)
  - `confidence` — stored confidence at time of retrieval
  - `is_stale` — boolean, based on age + retrieval frequency decay
  - `source` — where the memory originated (chat, repair, evolution, import)
  - `created_at` — original timestamp
  - `last_retrieved_at` — previous retrieval timestamp
  - `retrieval_count` — how many times this node has been retrieved
  - `provenance` — what input produced this memory

### How is retrieval ranked?
A composite score per node: `0.4 × similarity + 0.3 × confidence + 0.2 × recency + 0.1 × retrieval_frequency`. Recency decays exponentially. Staleness applies a penalty multiplier.

### Retrieval Trace
Every call produces a `RetrievalTrace`:
```
{
  trace_id,
  query,
  timestamp,
  nodes_returned: [{ node_id, score, rank }],
  traversal_path: [node_id, ...],
  total_latency_ms,
  cognee_latency_ms,
  ranking_latency_ms,
  session_id
}
```
Traces are the primary input to the MRI Engine. Without traces, diagnosis is impossible.

---

## 10. MEMORY MRI ENGINE

The MRI Engine is the heart of Eluvion. It runs continuously, observes the memory graph, and produces health and pathology reports.

### Responsibilities
- Consume `RetrievalTrace` events in real-time
- Periodically snapshot the full memory graph
- Compute `HealthReport` (aggregate score + per-metric breakdown)
- Detect diseases and produce `PathologyReport`
- Cache both reports for instant API read access
- Emit `health.degraded` events when score drops below threshold

### Inputs
- `RetrievalTrace` stream (from event bus)
- `MemoryGraph` snapshot (from `CogneeRetriever`)
- `EvolutionResult` events (from Evolution Service)
- `RepairResult` events (from Repair Layer)

### Outputs
- `HealthReport { score, metrics[], timestamp, trend }`
- `PathologyReport { diseases[], scan_timestamp, total_affected_nodes }`

### Metrics Computed
- **Node Count** — total memories in graph
- **Edge Density** — edges per node (low = fragmented graph)
- **Average Confidence** — mean confidence across all nodes
- **Stale Ratio** — percentage of nodes not retrieved in N days
- **Orphan Ratio** — percentage of nodes with no edges
- **Retrieval Hit Rate** — percentage of queries that returned ≥1 node
- **Contradiction Density** — pairs of nodes with conflicting claims
- **Write Success Rate** — percentage of `remember()` calls that succeeded

### Algorithms
- Stale detection: `age_days × (1 / retrieval_count)` exceeds threshold
- Orphan detection: node degree = 0 in graph
- Contradiction detection: semantic similarity > 0.85 + confidence divergence > 0.4
- Fragmentation: graph has > N disconnected components
- Decay: confidence < 0.3 with retrieval_count < 2

### Tick Interval
Every 30 seconds during active use. Every 5 minutes during idle. Triggered immediately after any `repair.executed` or `evolution.completed` event.

---

## 11. MEMORY DISEASES

### Memory Rot
**Definition:** A node's confidence has decayed below the functional threshold and has not been retrieved recently enough to self-correct.
**Detection:** `confidence < 0.25 AND days_since_retrieval > 14`
**Repair:** Attempt `improve()` with a confidence reset. If content is still valid, strengthen. If content cannot be verified, apply `forget()`.

### Memory Fragmentation
**Definition:** The knowledge graph has disconnected subgraphs — islands of memories with no relationships to the main concept cluster.
**Detection:** Graph component analysis reveals > 1 connected component. Orphan ratio > 20%.
**Repair:** Attempt to identify semantic bridges between orphaned nodes and main graph. Apply `improve()` to add relationship metadata. If no bridge exists, escalate to Memory Amnesia.

### Memory Contamination
**Definition:** A node contains factually incorrect or contradictory information relative to another higher-confidence node on the same concept.
**Detection:** Two nodes with semantic similarity > 0.85, same subject, confidence difference > 0.3, and conflicting claims detected by LLM verifier.
**Repair:** Retain the higher-confidence node. Apply `improve()` to the lower-confidence node to mark it as superseded. Record the supersession relationship as an edge.

### Memory Bias
**Definition:** One concept cluster is disproportionately represented in the graph, creating over-retrieval of that cluster and under-retrieval of others.
**Detection:** Top concept by retrieval frequency accounts for > 40% of all retrievals.
**Repair:** Apply retrieval diversity weighting in `CogneeRetriever`. Evolution Service generates summaries for underrepresented clusters to increase their retrieval surface.

### Memory Amnesia
**Definition:** The system cannot retrieve any memory for a broad class of queries — the knowledge graph has a structural gap.
**Detection:** Query category (classified by LLM) returns 0 results for > 3 consecutive queries.
**Repair:** Flag the gap. Suggest the user provide seed memories for this domain. Evolution Service generates concept stubs from adjacent memories to build a bridging structure.

### Memory Noise
**Definition:** The graph contains high volumes of low-value, highly specific memories that dilute retrieval quality — individual exchange utterances treated as facts.
**Detection:** > 30% of nodes are conversational turn records (e.g. "User said: hi") with confidence < 0.4 and retrieval count = 0.
**Repair:** Evolution merger identifies noise nodes. Batch `forget()` applied. Conversation turns above a content threshold are summarized and re-ingested as facts.

### Memory Overfitting
**Definition:** The system retrieves the same small set of nodes for almost every query, regardless of query content, because those nodes have accumulated high retrieval counts and thus high ranking scores.
**Detection:** Top 5% of nodes by retrieval count account for > 60% of all retrievals.
**Repair:** Apply retrieval count normalization in ranking. Evolution decayer reduces over-retrieved node ranking weight proportionally.

---

## 12. MEMORY HEALTH SCORE

### Formula
`HealthScore = Σ(weight_i × normalized_metric_i)` where weights sum to 1.0

### Metric Weights
| Metric | Weight | Rationale |
|---|---|---|
| Average Confidence | 0.25 | Core indicator of memory reliability |
| Retrieval Hit Rate | 0.20 | System's ability to answer queries |
| Edge Density | 0.15 | Graph connectivity = concept coherence |
| Write Success Rate | 0.15 | Memory durability |
| Stale Ratio (inverted) | 0.10 | Freshness of knowledge |
| Orphan Ratio (inverted) | 0.10 | Graph structural health |
| Contradiction Density (inverted) | 0.05 | Factual consistency |

### Normalization
Each metric normalized to [0, 1]. Inverted metrics: `1 - raw_value`. Confidence already in [0, 1]. Ratios: `1 - ratio` for inverted. Edge density: capped at 3.0 edges/node = 1.0.

### Thresholds
- **90–100:** Excellent. Memory is healthy and coherent.
- **70–89:** Good. Minor issues present, evolution will self-correct.
- **50–69:** Degraded. Active diseases present. Repair recommended.
- **30–49:** Critical. Multiple severe diseases. Immediate surgery required.
- **0–29:** Failure. Memory graph is unreliable. Full reset may be warranted.

### Trend
Score is tracked over time. A declining trend over 3+ consecutive measurements triggers `health.degraded` event regardless of absolute score.

---

## 13. HALLUCINATION PREDICTION

### Purpose
Before the LLM speaks, predict whether the retrieved memory context is likely to produce a hallucination. After the LLM speaks, verify the output against the graph.

### Pre-Inference Scoring
**Input:** `RetrievalResult` for the current query.

**Signals:**
- `low_confidence_ratio` — fraction of retrieved nodes with confidence < 0.5
- `staleness_ratio` — fraction of retrieved nodes flagged as stale
- `coverage_gap` — fraction of query terms not represented in retrieved nodes
- `contradiction_present` — boolean, any contradicting pairs in retrieved set
- `retrieval_count` — zero means no memory, high hallucination risk

**Score formula:** `risk = 0.3×low_confidence + 0.25×staleness + 0.25×coverage_gap + 0.15×contradiction + 0.05×(1 if retrieval_count==0 else 0)`

**Output:** `{ risk_level: low|medium|high, score: float, signals: {...}, recommendation: string }`

### Post-Inference Verification
After LLM produces response, extract factual claims using an LLM classifier. For each claim, attempt retrieval. Flag claims with: no supporting memory, contradicting memory, or confidence below threshold.

### Prompt Adjustment
If `risk_level == high`: inject into system prompt — "Your retrieved memories have low confidence. Hedge your response. Say 'based on what I recall' rather than stating facts definitively."

If `risk_level == medium`: inject — "Some memories are stale. Acknowledge uncertainty where relevant."

---

## 14. MEMORY SURGERY

Surgery replaces repair. It is deliberate, reversible, and verified.

### Pipeline

**Phase 1 — Diagnosis**
MRI Engine provides `PathologyReport`. Each disease is a surgical case. Cases are prioritized by severity × affected node count.

**Phase 2 — Repair Planning**
`SurgeonPlanner` generates `RepairPlan` for each disease:
- Target nodes (by id)
- Operation type: `improve | forget | merge | strengthen | decay`
- Parameters per node
- Expected outcome metrics
- Risk assessment (what could go wrong)

**Phase 3 — Simulation (Dry Run)**
`Simulator` applies the plan to an in-memory copy of the graph. Produces:
- Before/after diff of affected nodes
- Predicted health score change
- Risk flags (e.g. "this forget() would orphan 3 connected nodes")
The UI shows this diff to the user before any real change.

**Phase 4 — User Confirmation (for UI-triggered repairs)**
User reviews the simulation diff and approves or modifies the plan. Background evolution jobs skip this phase.

**Phase 5 — Snapshot**
Before execution, `RepairSnapshot` records: all affected node states, all affected edge states, current `HealthReport`. Stored in the repair history log.

**Phase 6 — Execution**
`RepairExecutor` applies operations via `cognee.improve()` or `cognee.forget()`. Operations are applied in dependency order (forget orphaned nodes last). Execution is transactional where possible.

**Phase 7 — Verification**
`RepairVerifier` re-queries the affected subgraph and confirms: disease symptoms are no longer present, health score improved or unchanged, no new diseases introduced.

**Phase 8 — Rollback (if verification fails)**
`Rollback` restores the `RepairSnapshot`. The failed repair is logged with failure reason. MRI Engine is triggered to rescan immediately.

---

## 15. MEMORY EVOLUTION

Evolution is what separates a memory system from a knowledge system. The graph improves autonomously over time.

### Background Service Architecture
`EvolutionScheduler` runs as a FastAPI background task (asyncio). Activates during idle periods (no active requests for > 60 seconds). Each job type has its own cadence.

### Evolution Jobs

**Deduplication (every 10 minutes idle)**
`Merger` identifies node pairs with semantic similarity > 0.9 and same subject tag. Creates a merged node using `improve()`. `forget()`s the weaker duplicate. Connects merged node to all edges from both originals.

**Decay (every 30 minutes idle)**
`Decayer` reduces confidence of nodes not retrieved in > 30 days. Decay formula: `new_confidence = confidence × (1 - decay_rate)^days_since_retrieval`. Nodes below 0.1 confidence are flagged for eventual `forget()`.

**Strengthening (every 10 minutes idle)**
`Strengthener` increases confidence of nodes retrieved > 5 times in the last 7 days. Strengthening formula: `new_confidence = min(1.0, confidence × 1.05)`.

**Summarization (every 60 minutes idle)**
`Summarizer` identifies clusters of > 10 nodes sharing a subject tag. Calls LLM to generate a concept summary. Stores summary as a new `MemoryNode` with edges to all source nodes. This compresses the graph and improves retrieval of the concept.

**Topology Repair (every 60 minutes idle)**
Identifies orphaned nodes with semantic proximity to existing clusters. Creates bridge edges via `improve()`. This reconnects fragmented graph components without deleting content.

### Safety Rules for Evolution
- Every job operates on a snapshot
- No job deletes more than 10% of nodes in a single run
- All proposed changes are logged before execution
- Evolution results are reported to the MRI Engine for health score update

---

## 16. AGENT ARCHITECTURE

### Agent Types

**ChatAgent**
Handles conversational turns. Orchestrates: retrieve → predict → infer → verify → store. Produces streaming response. Stateless per turn — state lives in Cognee.

**DiagnosisAgent**
Triggered by MRI Engine events or explicit `/mri/scan` calls. Runs pathology detection. Produces `PathologyReport`. Does not repair.

**RepairAgent**
Triggered by user action on the Surgery page. Accepts `disease_id` and optional user preferences. Runs surgery pipeline. Reports progress via WebSocket.

**EvolutionAgent**
Long-running background agent. Manages all evolution jobs. Reports status to `/evolution/status`. Pauses during high-load periods.

**PredictionAgent**
Invoked synchronously before every inference. Asynchronously after. Produces `PredictionReport`. Never blocks — if prediction takes > 200ms, skip post-inference check for this turn.

### Communication
Agents communicate through the event bus, not direct calls. `ChatAgent` emits `retrieval.completed` → `DiagnosisAgent` and `PredictionAgent` consume it. `RepairAgent` emits `repair.executed` → `DiagnosisAgent` rescans. No agent calls another agent directly.

---

## 17. API DESIGN

All endpoints represent behaviors, not resources.

### Agent
| Endpoint | Method | Purpose |
|---|---|---|
| `/probe` | POST | Submit a message, receive AI response with memory context |
| `/probe/stream` | WebSocket | Streaming version of /probe |

### MRI
| Endpoint | Method | Purpose |
|---|---|---|
| `/mri/health` | GET | Latest HealthReport (from cache) |
| `/mri/pathology` | GET | Latest PathologyReport (from cache) |
| `/mri/scan` | POST | Force immediate MRI scan (clears cache) |
| `/mri/history` | GET | Health score over time |

### Surgery
| Endpoint | Method | Purpose |
|---|---|---|
| `/surgery/plan` | POST `{ disease_id }` | Generate RepairPlan |
| `/surgery/simulate` | POST `{ plan_id }` | Run dry-run, return diff |
| `/surgery/execute` | POST `{ plan_id }` | Execute approved plan |
| `/surgery/rollback` | POST `{ repair_id }` | Restore snapshot |
| `/surgery/history` | GET | All past repairs with outcomes |

### Evolution
| Endpoint | Method | Purpose |
|---|---|---|
| `/evolution/status` | GET | Current job statuses, last run times |
| `/evolution/trigger` | POST `{ job_type }` | Manually trigger a specific job |
| `/evolution/log` | GET | History of evolution actions |

### Observatory (Visualization)
| Endpoint | Method | Purpose |
|---|---|---|
| `/observatory/graph` | GET | Full graph snapshot for React Flow |
| `/observatory/timeline` | GET | Chronological memory event feed |
| `/observatory/subgraph` | GET `?node_id=` | Subgraph around a specific node |

### Prediction
| Endpoint | Method | Purpose |
|---|---|---|
| `/prediction/last` | GET | Most recent PredictionReport |
| `/prediction/history` | GET | Risk score over time |

### Memory (low-level access)
| Endpoint | Method | Purpose |
|---|---|---|
| `/memory` | GET | Paginated node list |
| `/memory/{id}` | GET | Single node with full metadata |
| `/memory` | DELETE | Clear all (dev/reset only) |

---

## 18. FRONTEND ARCHITECTURE

The UI communicates cognitive state, not page content.

### Module: Probe (formerly Chat)
**Purpose:** Conversational interface to the memory system.
**Left panel:** Message stream with streaming response. Each assistant message shows: hallucination risk badge, memory count used, retrieval latency.
**Right panel:** Retrieved memories for the last message, shown as cards with confidence bars and staleness indicators.
**Bottom:** Input with send button. No suggestion chips — memory is rich enough to need none.

### Module: MRI (formerly Health + Diagnosis combined)
**Purpose:** Real-time memory health monitoring.
**Top section:** Health score gauge (0–100) with trend sparkline. Score updates live via WebSocket.
**Middle section:** Metric breakdown — 7 health metrics as horizontal bars with values.
**Bottom section:** Detected diseases list. Each disease shows: name, severity, affected node count, a "Plan Surgery" button. Clicking "Plan Surgery" navigates to Surgery module with disease pre-selected.

### Module: Surgery (formerly Repair)
**Purpose:** Safe memory repair with full simulation.
**Left panel:** Active diseases. Click to select for surgery.
**Center panel:** Repair plan — list of operations (improve/forget/merge) with target nodes.
**Right panel:** Simulation diff — before/after node states. Green = new state, red = removed, yellow = modified.
**Bottom bar:** "Execute Surgery" button (only active after simulation reviewed). Progress indicator during execution. Rollback button after execution.

### Module: Observatory (formerly Graph)
**Purpose:** Visual inspection of the knowledge graph.
**Main canvas:** React Flow graph. Nodes colored by health: green (healthy), yellow (stale), red (diseased), grey (orphaned).
**Node click:** Opens detail drawer: content, confidence, retrieval count, created/last-retrieved, edges, provenance.
**Controls:** Filter by concept cluster, staleness, confidence range. Layout selector (force, hierarchy, radial).

### Module: Evolution
**Purpose:** Monitor autonomous background improvement.
**Shows:** Current job running (if any), last completion time per job type, count of nodes merged/decayed/strengthened in last run, next scheduled run.
**Manual triggers:** "Run Now" buttons per job type for demo purposes.

### Module: Prediction
**Purpose:** Visibility into hallucination risk.
**Shows:** Risk level for last query (low/medium/high), breakdown of risk signals, post-inference verification result (any flagged claims), historical risk trend chart.

---

## 19. DEMO ARCHITECTURE

The demo must tell this story in under 5 minutes:

### Act 1 — The Problem (60 seconds)
Open Probe. Type: "My name is [name] and I work on AI safety research." Eluvion responds naturally, acknowledges. Show the MRI panel — health is perfect. Show the Observatory — the memory node appears instantly. This establishes: memories are stored.

### Act 2 — Memory Degradation (90 seconds)
Type 10+ messages on unrelated topics. Introduce a contradiction: "I work at Google." (Previously implied AI safety independent researcher.) Switch to MRI panel — health score has dropped. Contamination disease appears. The system detected the contradiction autonomously. Click the disease — see which nodes are in conflict. This establishes: memory has an immune system.

### Act 3 — Memory Surgery (90 seconds)
Click "Plan Surgery." Simulation diff appears — showing exactly what will change. Click "Execute." Progress animation. Health score rises in real-time. Go back to Probe. Ask "What do I do professionally?" — Eluvion gives a consistent, correct answer. This establishes: memory can be healed.

### Act 4 — Memory Evolution (60 seconds)
Trigger deduplication manually from the Evolution module. Show before/after node count. Open Observatory — orphaned nodes have been reconnected. Briefly explain: "This happens automatically in the background." This establishes: memory improves itself.

### Act 5 — The Vision (30 seconds)
"Every AI system has memory. None of them know when it's broken. Eluvion is the MRI machine for AI cognition."

### Demo Tips
- Pre-seed 20–30 memories before the demo starts. An empty graph is unimpressive.
- Use the WebSocket streaming so responses appear character-by-character. Streaming feels alive.
- Have the health score visible on every page as a persistent header metric. The number dropping during Act 2 is the most compelling moment.
- Animate score changes with framer-motion transitions. The number should visibly tick down.
- The Surgery diff panel is the highest-value visual — spend the most time here.

---

## 20. SCALING STRATEGY

### 10 Users — Current Local Stack
SQLite + LanceDB + Ladybug. Single process. No changes needed. This is the hackathon configuration.

### 100 Users — Multi-Session Isolation
Each user gets a separate Cognee dataset. FastAPI stays single-server but moves to PostgreSQL for relational data and keeps LanceDB (supports concurrent reads). Evolution and Diagnosis services move to background workers (Celery or asyncio TaskGroup). Session state moves to Redis.

### 10,000 Users — Service Decomposition
Memory domain becomes a standalone `memory-service`. Retrieval domain becomes `retrieval-service`. MRI Engine becomes `mri-service`. Each is an independent FastAPI service behind a gateway. Cognee Cloud (Weaviate + Neo4j) replaces local stack. Write queue becomes a proper message broker (RabbitMQ or Kafka). Frontend gets CDN caching for static assets.

### 1 Million Users — Full Platform
Multi-tenant architecture. Each tenant's knowledge graph is isolated. Retrieval service scales horizontally with stateless pods. MRI Engine becomes a streaming pipeline (Kafka consumers computing health metrics in real-time). Repair and Evolution services become workflow orchestrators (Temporal or Prefect). Weaviate and Neo4j deployed as managed cloud services with read replicas. Rate limiting and cost allocation per tenant.

---

## 21. TECHNICAL DEBT

### Acceptable for Hackathon

| Compromise | Why Acceptable | Future Solution | Priority |
|---|---|---|---|
| `cognee.recall()` uses local shadow keyword search | Embedding setup is complex | Wire real `cognee.recall()` with fastembed | High |
| Single Groq API key, no rotation | 14k req/day is enough for demo | Add key pool + rate limit tracking | Medium |
| In-process event bus (simple dict) | Zero infra to set up | Replace with Redis pub/sub | Medium |
| Evolution jobs run in asyncio, not a worker | Simple for single server | Move to Celery when scaling | Low |
| No auth on API | Demo only, not exposed | Add API key middleware | High (pre-production) |
| Repair snapshot stored in memory | Lost on restart | Persist to SQLite | Medium |
| No WebSocket — polling instead | Simpler frontend | Add WebSocket for live health score | Low |

---

## 22. ANTI-PATTERNS — NEVER DO THIS

**Never treat Cognee as a storage layer.**
Cognee is cognition. It builds a knowledge graph, not a record store. If you are using it as a key-value store, you are wasting it.

**Never bypass the Retrieval Layer.**
Every LLM call must be preceded by a `cognee.recall()`. There is no exception. "The user is asking a simple question" is not a justification.

**Never diagnose after inference.**
Diagnosis must inform inference, not follow it. Post-inference, the MRI Engine updates its model. But the inference already used the last-known health state.

**Never build CRUD memory pages.**
"Add Memory" forms are a UI anti-pattern. Memory should be created by interaction (chat) or inference (evolution). Manual CRUD treats Cognee like a database.

**Never skip retrieval tracing.**
An untraced retrieval is invisible to the MRI Engine. The diagnosis system is blind without traces. Tracing is not optional overhead.

**Never compute health score on request.**
Health score must be pre-computed by the continuous MRI Engine. Computing it on `GET /health` is too slow and creates stale results.

**Never couple UI state to memory domain logic.**
The frontend knows nothing about `MemoryNode` internals. It only receives `VisualNode` shapes from the Visualization domain. A change to MemoryNode must not require a frontend change.

**Never use daemon threads for Cognee writes.**
`threading.Thread(daemon=True)` silently loses failed writes. Use a proper async write queue with retry and failure logging.

**Never store conversation turns as facts.**
"User said: hi" is not a memory. It is noise. Only store semantically meaningful exchanges, entities, and facts. Conversation turns should be summarized, not indexed.

**Never let the Repair Layer call Cognee directly.**
All Cognee operations go through the Memory domain's `MemoryService`. The Repair Layer calls `MemoryService.improve()` and `MemoryService.forget()`. This ensures provenance is always recorded.

---

## 23. ENGINEERING RULES

**Every memory must have provenance.**
Where did this memory come from? What input produced it? When? If you cannot answer these questions for every node, the system is unauditable.

**Every retrieval must be traceable.**
A retrieval without a `RetrievalTrace` did not happen, as far as the MRI Engine is concerned.

**Every diagnosis must be reproducible.**
Given the same memory graph state, `pathology_engine.run()` must return the same `PathologyReport`. No randomness. No timestamp-dependent logic in detection algorithms.

**Every repair must be reversible.**
No `RepairExecutor.execute()` call without a preceding `RepairSnapshot.create()`. No exceptions.

**Every metric must be deterministic.**
`HealthEngine.compute()` must return the same score for the same memory state. If it does not, the score is meaningless.

**Every service owns one responsibility.**
`DiagnosisMonitor` detects disease. `SurgeonPlanner` plans repair. `RepairExecutor` executes. These are never combined in one class.

**Every domain boundary is enforced.**
No domain imports from another domain's internal implementation. Only from published interfaces (`service.py`, `models.py`). Cross-domain calls go through `infrastructure/event_bus.py`.

**Everything must be testable in isolation.**
Every service receives its dependencies via constructor injection. No global state inside domain services. This enables unit tests without a running Cognee instance.

---

## 24. FUTURE RESEARCH

### Memory Dreaming
During deep idle periods, the system generates hypothetical queries, attempts retrieval, and identifies systematic retrieval failures. Like REM sleep — the system rehearses and strengthens memory pathways without user input.

### Memory Compression
As the graph grows, information-theoretically compress concept clusters into abstract representations. Store the abstraction as a high-confidence node. Retain source nodes as evidence. Retrieval returns the abstraction first.

### Memory Genetics
Memories that survive long-term without decay and are retrieved frequently become "dominant." Memories that are consistently low-confidence and rarely retrieved become "recessive." Recessive memories decay faster. Dominant memories propagate their relationship patterns to new, similar memories.

### Collective Memory
Multiple Eluvion instances (across users or sessions) can contribute to a shared knowledge graph. Individual memories are private. Concept abstractions (distilled from private memories) can be shared. Privacy-preserving collaborative knowledge building.

### Memory Immunity
The system learns which types of information consistently lead to contamination or contradiction. When a new memory of that type arrives, it is quarantined and flagged for manual review before integration.

### Hallucination Vaccines
After a hallucination is detected and verified, the system generates a "corrective memory" with maximum confidence and provenance explicitly set to "post-hallucination correction." This corrective memory takes priority in all future retrievals on the same topic.

### Memory Evolution Genetics (MEVO)
An evolutionary algorithm that breeds retrieval strategies. Different ranking weight combinations compete. The combination that produces the highest health score over time survives. The system discovers its own optimal retrieval parameters.

---

## 25. FINAL CHECKLIST

Before writing any code, the engineer must verify:

**Architecture**
- [ ] All 10 layers defined and responsibilities documented
- [ ] All 8 domains defined with explicit boundaries
- [ ] No cross-domain coupling in the folder structure
- [ ] Event bus designed for cross-domain communication

**Memory-First**
- [ ] Every LLM call is preceded by `cognee.recall()`
- [ ] Every user exchange is stored via `cognee.remember()`
- [ ] Every memory has provenance
- [ ] Retrieval tracing is implemented before any other feature

**Cognee-Native**
- [ ] `remember()` goes through `WriteQueue` (async, with retry)
- [ ] `recall()` goes through `CogneeRetriever` (with ranking and tracing)
- [ ] `improve()` only called through `MemoryService` with snapshot
- [ ] `forget()` only called through `MemoryService` with snapshot
- [ ] Shadow store does NOT exist

**Scalable**
- [ ] Services are stateless (state lives in Cognee, not Python objects)
- [ ] Background services (MRI, Evolution) are non-blocking
- [ ] Database provider is swappable via `.env` only
- [ ] LLM provider is swappable via `.env` only

**Production-Ready**
- [ ] API endpoints return typed Pydantic response models
- [ ] All failures are logged with structured context
- [ ] All Cognee write failures are retried
- [ ] Health endpoint reflects actual Cognee graph state
- [ ] No hardcoded secrets anywhere

**Hackathon-Ready**
- [ ] Demo script written and rehearsed
- [ ] 20+ seed memories pre-loaded before demo
- [ ] WebSocket streaming for chat responses
- [ ] Health score visible on every page
- [ ] Surgery simulation diff visually compelling
- [ ] Evolution module shows autonomous action

**Documentation**
- [ ] Every component has single-sentence responsibility statement
- [ ] Every API endpoint has request/response models documented
- [ ] Every disease has detection algorithm documented
- [ ] This checklist reviewed before first line of code
