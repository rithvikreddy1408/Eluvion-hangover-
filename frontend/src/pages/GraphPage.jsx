import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import MemoryGraph from '../components/MemoryGraph/MemoryGraph'
import NodeDetail from '../components/MemoryGraph/NodeDetail'
import { useMemory } from '../hooks/useMemory'

const LEGEND = [
  { color: '#06b6d4', label: 'Healthy'       },
  { color: '#d97706', label: 'Memory Rot'    },
  { color: '#dc2626', label: 'Contamination' },
  { color: '#64748b', label: 'Fragmentation' },
  { color: '#2563eb', label: 'Amnesia'       },
  { color: '#7c3aed', label: 'Bias'          },
]

export default function GraphPage() {
  const { graph, diagnosis, loading, refresh } = useMemory()
  const [selectedNode, setSelectedNode] = useState(null)

  useEffect(() => { refresh() }, [refresh])

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="px-5 h-11 border-b border-border-dim flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-medium text-zinc-900">Graph</h1>
            <span className="text-2xs text-zinc-400 font-mono">
              {graph.nodes.length}n · {graph.edges.length}e
            </span>
          </div>

          {/* Legend */}
          <div className="hidden lg:flex items-center gap-3 border-l border-border-dim pl-4">
            {LEGEND.map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-2xs text-zinc-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 border border-border-dim hover:border-border-mid rounded-md px-3 py-1.5 transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Graph + Inspector */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          <MemoryGraph
            graphData={graph}
            diseases={diagnosis?.diseases}
            onNodeClick={setSelectedNode}
          />
        </div>
        {selectedNode && (
          <NodeDetail node={selectedNode} onClose={() => setSelectedNode(null)} />
        )}
      </div>
    </div>
  )
}
