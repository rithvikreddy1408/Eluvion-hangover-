import { useState, useEffect } from 'react'
import { RefreshCw, Layers, Grid2x2 } from 'lucide-react'
import MemoryGraph from '../components/MemoryGraph/MemoryGraph'
import NodeDetail from '../components/MemoryGraph/NodeDetail'
import { useMemory } from '../hooks/useMemory'

const LEGEND = [
  { color: '#22d3ee', label: 'Healthy',       shadow: '#22d3ee55' },
  { color: '#f59e0b', label: 'Memory Rot',    shadow: '#f59e0b55' },
  { color: '#ef4444', label: 'Contamination', shadow: '#ef444455' },
  { color: '#94a3b8', label: 'Fragmentation', shadow: '#94a3b855' },
  { color: '#3b82f6', label: 'Amnesia',       shadow: '#3b82f655' },
  { color: '#a855f7', label: 'Bias',          shadow: '#a855f755' },
  { color: '#71717a', label: 'Noise',         shadow: '#71717a55' },
]

export default function GraphPage() {
  const { graph, diagnosis, loading, refresh } = useMemory()
  const [selectedNode, setSelectedNode] = useState(null)
  const [graphMode, setGraphMode]       = useState('3d')

  useEffect(() => { refresh() }, [refresh])

  return (
    <div className="flex h-full flex-col bg-[#07050c]">

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div
        className="px-5 h-11 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid #1e1a28' }}
      >
        {/* Left — title + stats + legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-200 tracking-tight">Memory Graph</span>
            <span className="text-[10px] text-zinc-600 font-mono bg-white/5 px-1.5 py-0.5 rounded">
              {graph.nodes.length}n · {graph.edges.length}e
            </span>
          </div>

          {/* Legend (hidden on small screens) */}
          <div
            className="hidden xl:flex items-center gap-3 pl-4"
            style={{ borderLeft: '1px solid #1e1a28' }}
          >
            {LEGEND.map(({ color, label, shadow }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: color, boxShadow: `0 0 5px ${shadow}` }}
                />
                <span className="text-[10px] text-zinc-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — 2D/3D toggle + refresh */}
        <div className="flex items-center gap-2">

          {/* 2D / 3D pill toggle */}
          <div
            className="flex items-center rounded-md overflow-hidden"
            style={{ border: '1px solid #2a2438', background: '#0d0b14' }}
          >
            <button
              onClick={() => setGraphMode('2d')}
              title="Flat 2D graph"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                color:      graphMode === '2d' ? '#a78bfa' : '#6b7280',
                background: graphMode === '2d' ? '#1e1a2e' : 'transparent',
              }}
            >
              <Grid2x2 size={11} />
              2D
            </button>
            <div style={{ width: 1, background: '#2a2438', height: 20 }} />
            <button
              onClick={() => setGraphMode('3d')}
              title="Rotating 3D graph"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                color:      graphMode === '3d' ? '#22d3ee' : '#6b7280',
                background: graphMode === '3d' ? '#091a1f' : 'transparent',
              }}
            >
              <Layers size={11} />
              3D
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors px-3 py-1.5 rounded-md"
            style={{
              color:      '#6b7280',
              border:     '1px solid #2a2438',
              background: '#0d0b14',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#a1a1aa'}
            onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Mode hint bar ────────────────────────────────────────────── */}
      <div
        className="px-5 py-1.5 text-[10px] text-zinc-600 font-mono shrink-0 flex items-center gap-3"
        style={{ borderBottom: '1px solid #0f0d18' }}
      >
        {graphMode === '3d' ? (
          <>
            <span>🖱 drag → rotate</span>
            <span>scroll → zoom</span>
            <span>right-drag → pan</span>
            <span>click node → inspect</span>
          </>
        ) : (
          <>
            <span>🖱 drag → pan</span>
            <span>scroll → zoom</span>
            <span>drag node → reposition</span>
            <span>click node → inspect</span>
          </>
        )}
      </div>

      {/* ── Graph canvas + node inspector ───────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          <MemoryGraph
            graphData={graph}
            diseases={diagnosis?.diseases}
            onNodeClick={setSelectedNode}
            mode={graphMode}
          />
        </div>

        {selectedNode && (
          <NodeDetail node={selectedNode} onClose={() => setSelectedNode(null)} />
        )}
      </div>
    </div>
  )
}
