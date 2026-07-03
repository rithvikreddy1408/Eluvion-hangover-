import { useRef, useEffect, useMemo } from 'react'

const DISEASE_COLOR = {
  healthy:       '#22d3ee',
  memory_rot:    '#f59e0b',
  contamination: '#ef4444',
  fragmentation: '#94a3b8',
  amnesia:       '#3b82f6',
  bias:          '#a855f7',
  noise:         '#71717a',
}

const EDGE_COLOR = {
  related_to:  '#52525b',
  updates:     '#22d3ee',
  contradicts: '#ef4444',
  supports:    '#22c55e',
  supersedes:  '#f59e0b',
  REPLACED_BY: '#f97316',
}

function getDisease(node, diseases) {
  if (!diseases?.length) return 'healthy'
  for (const d of diseases) {
    if (d.affected_node_ids?.includes(node.id)) return d.type
  }
  return 'healthy'
}

export default function MemoryGraph({ graphData, diseases, onNodeClick }) {
  const containerRef = useRef(null)
  const graphRef     = useRef(null)
  const { nodes: rawNodes = [], edges: rawEdges = [] } = graphData

  const gd = useMemo(() => ({
    nodes: rawNodes.map(n => ({
      ...n,
      __color:   DISEASE_COLOR[getDisease(n, diseases)] || DISEASE_COLOR.healthy,
      __r:       4 + Math.min(n.confidence || 0.5, 1) * 4
                   + Math.min(n.retrieval_count || 0, 8) * 0.4,
    })),
    links: rawEdges.map(e => ({
      ...e,
      source:  e.source,
      target:  e.target,
      __color: EDGE_COLOR[e.relationship] || EDGE_COLOR.related_to,
    })),
  }), [rawNodes, rawEdges, diseases])

  // Mount the 3d graph once the container div is in the DOM
  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    import('3d-force-graph').then(mod => {
      if (cancelled || !containerRef.current) return
      const ForceGraph3D = mod.default ?? mod

      const el   = containerRef.current
      const w    = el.clientWidth  || 800
      const h    = el.clientHeight || 600

      const G = ForceGraph3D()(el)
        .width(w).height(h)
        .backgroundColor('#0c0a09')
        .showNavInfo(false)
        .nodeColor(n  => n.__color)
        .nodeVal(n    => Math.pow(n.__r, 2))
        .nodeLabel(n  =>
          `<div style="font:11px ui-monospace,monospace;background:#141210ee;
           color:${n.__color};padding:6px 10px;border-radius:6px;max-width:260px;
           border:1px solid ${n.__color}44">
            <b>${n.subject || n.type || 'memory'}</b><br/>
            <span style="color:#d4d4d8">${(n.content || '').slice(0, 100)}</span><br/>
            <span style="color:#71717a;font-size:10px">
              conf ${Math.round((n.confidence || 0) * 100)}% · ×${n.retrieval_count || 0}
            </span>
          </div>`)
        .nodeOpacity(0.9)
        .linkColor(l  => l.__color)
        .linkWidth(l  => l.relationship === 'contradicts' ? 2.5 : 1)
        .linkOpacity(0.55)
        .linkDirectionalArrowLength(6)
        .linkDirectionalArrowRelPos(1)
        .linkDirectionalParticles(2)
        .linkDirectionalParticleSpeed(0.004)
        .linkDirectionalParticleColor(l => l.__color)
        .onNodeClick(node => onNodeClick?.(node))
        .graphData(gd)

      G.d3Force('charge').strength(-180)
      G.d3Force('link').distance(70)

      graphRef.current = G

      // Resize observer keeps canvas sized to container
      const ro = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect
        graphRef.current?.width(width).height(height)
      })
      ro.observe(el)
      G._ro = ro
    }).catch(e => console.error('[MemoryGraph]', e))

    return () => {
      cancelled = true
      graphRef.current?._ro?.disconnect()
      graphRef.current?._destructor?.()
      graphRef.current = null
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, []) // mount once — data updates handled below

  // Push new data whenever it changes
  useEffect(() => {
    graphRef.current?.graphData(gd)
  }, [gd])

  return (
    <div className="relative w-full h-full bg-[#0c0a09]">
      {/* Three.js canvas lives here — always rendered so ref is stable */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Empty-state overlay — only shown when no nodes */}
      {rawNodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none gap-3 pointer-events-none">
          <div className="text-4xl opacity-20">⬡</div>
          <p className="text-sm text-zinc-400">No memory nodes yet</p>
          <p className="text-xs text-zinc-500">Chat in Memory or Hybrid mode to build your graph</p>
        </div>
      )}

      {/* Disease legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1 pointer-events-none">
        {Object.entries(DISEASE_COLOR).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
            {type.replace('_', ' ')}
          </div>
        ))}
      </div>

      {/* Node / edge count */}
      <div className="absolute top-3 right-3 text-[10px] font-mono text-zinc-500 bg-black/50 px-2 py-1 rounded border border-white/10">
        {rawNodes.length} nodes · {rawEdges.length} edges
      </div>
    </div>
  )
}
