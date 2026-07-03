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
  related_to:  '#4b5563',
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

// Node tooltip HTML
function nodeLabel(n) {
  const color = n.__color
  return `<div style="
      font:11px ui-monospace,monospace;
      background:#0d0b14f0;
      color:${color};
      padding:8px 12px;
      border-radius:8px;
      max-width:280px;
      border:1px solid ${color}55;
      box-shadow:0 0 20px ${color}22;
      line-height:1.5;
    ">
    <b style="font-size:12px">${n.subject || n.type || 'memory'}</b><br/>
    <span style="color:#d1d5db">${(n.content || '').slice(0, 120)}${(n.content || '').length > 120 ? '…' : ''}</span><br/>
    <span style="color:#6b7280;font-size:10px;margin-top:4px;display:block">
      conf ${Math.round((n.confidence ?? 0) * 100)}% · recalled ×${n.retrieval_count ?? 0}
    </span>
  </div>`
}

export default function MemoryGraph({ graphData, diseases, onNodeClick, mode = '3d' }) {
  const containerRef = useRef(null)
  const graphRef     = useRef(null)
  const { nodes: rawNodes = [], edges: rawEdges = [] } = graphData

  const gd = useMemo(() => ({
    nodes: rawNodes.map(n => ({
      ...n,
      __color: DISEASE_COLOR[getDisease(n, diseases)] ?? DISEASE_COLOR.healthy,
      __r:     5 + Math.min(n.confidence ?? 0.5, 1) * 6
                 + Math.min(n.retrieval_count ?? 0, 10) * 0.6,
    })),
    links: rawEdges.map(e => ({
      ...e,
      source:  e.source,
      target:  e.target,
      __color: EDGE_COLOR[e.relationship] ?? EDGE_COLOR.related_to,
    })),
  }), [rawNodes, rawEdges, diseases])

  // ── Mount / remount when mode changes ──────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false
    const el = containerRef.current
    el.innerHTML = ''

    if (mode === '3d') {
      import('3d-force-graph').then(mod => {
        if (cancelled || !containerRef.current) return
        const FG = mod.default ?? mod
        const w = el.clientWidth  || 800
        const h = el.clientHeight || 600

        const G = FG()(el)
          .width(w).height(h)
          .backgroundColor('#07050c')
          .showNavInfo(false)

          // ── Nodes ─────────────────────────────────────────────────
          .nodeColor(n      => n.__color)
          .nodeVal(n        => Math.pow(n.__r, 2))
          .nodeOpacity(0.92)
          .nodeResolution(16)
          .nodeLabel(n      => nodeLabel(n))

          // ── Edges ─────────────────────────────────────────────────
          .linkColor(l      => l.__color)
          .linkWidth(l      => l.relationship === 'contradicts' ? 2.0 : 0.8)
          .linkOpacity(0.5)
          .linkDirectionalArrowLength(5)
          .linkDirectionalArrowRelPos(1)
          .linkDirectionalParticles(4)
          .linkDirectionalParticleSpeed(0.005)
          .linkDirectionalParticleWidth(l => l.relationship === 'contradicts' ? 2.5 : 1.5)
          .linkDirectionalParticleColor(l => l.__color)

          .onNodeClick(node => onNodeClick?.(node))
          .graphData(gd)

        G.d3Force('charge').strength(-220)
        G.d3Force('link').distance(80)

        graphRef.current = G

        const ro = new ResizeObserver(([entry]) => {
          const { width, height } = entry.contentRect
          graphRef.current?.width(width).height(height)
        })
        ro.observe(el)
        G._ro = ro
      }).catch(e => console.error('[MemoryGraph 3D]', e))

    } else {
      // ── 2D mode ───────────────────────────────────────────────────
      import('force-graph').then(mod => {
        if (cancelled || !containerRef.current) return
        const FG = mod.default ?? mod
        const w = el.clientWidth  || 800
        const h = el.clientHeight || 600

        const G = FG()(el)
          .width(w).height(h)
          .backgroundColor('#07050c')

          // ── Custom canvas nodes (glow rings) ──────────────────────
          .nodeCanvasObject((node, ctx, scale) => {
            const r     = node.__r * 0.75
            const color = node.__color

            // glow halos
            for (let i = 4; i >= 1; i--) {
              ctx.beginPath()
              ctx.arc(node.x, node.y, r + i * 3, 0, 2 * Math.PI)
              ctx.fillStyle = color + Math.round(0.05 * i * 255).toString(16).padStart(2, '0')
              ctx.fill()
            }

            // core circle with radial gradient
            const grad = ctx.createRadialGradient(
              node.x - r * 0.3, node.y - r * 0.3, 0,
              node.x, node.y, r
            )
            grad.addColorStop(0, color + 'ff')
            grad.addColorStop(1, color + 'aa')
            ctx.beginPath()
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
            ctx.fillStyle = grad
            ctx.fill()

            // crisp rim
            ctx.strokeStyle = color + 'cc'
            ctx.lineWidth   = 0.8
            ctx.stroke()

            // label when zoomed
            if (scale >= 1.4) {
              const label = (node.subject || node.type || 'node').slice(0, 20)
              const fs    = Math.max(3, 5 / scale)
              ctx.font          = `${fs}px ui-monospace,monospace`
              ctx.fillStyle     = '#e2e8f0'
              ctx.textAlign     = 'center'
              ctx.textBaseline  = 'middle'
              ctx.fillText(label, node.x, node.y + r + 7 / scale)
            }
          })
          .nodePointerAreaPaint((node, color, ctx) => {
            ctx.beginPath()
            ctx.arc(node.x, node.y, node.__r * 0.75 + 5, 0, 2 * Math.PI)
            ctx.fillStyle = color
            ctx.fill()
          })

          // ── Edges ─────────────────────────────────────────────────
          .linkColor(l      => l.__color + 'aa')
          .linkWidth(l      => l.relationship === 'contradicts' ? 2.5 : 1.2)
          .linkDirectionalArrowLength(6)
          .linkDirectionalArrowRelPos(1)
          .linkDirectionalParticles(3)
          .linkDirectionalParticleSpeed(0.006)
          .linkDirectionalParticleWidth(2)
          .linkDirectionalParticleColor(l => l.__color)

          .onNodeClick(node => onNodeClick?.(node))
          .graphData(gd)

        G.d3Force('charge').strength(-160)
        G.d3Force('link').distance(70)

        graphRef.current = G

        const ro = new ResizeObserver(([entry]) => {
          const { width, height } = entry.contentRect
          graphRef.current?.width(width).height(height)
        })
        ro.observe(el)
        G._ro = ro
      }).catch(e => console.error('[MemoryGraph 2D]', e))
    }

    return () => {
      cancelled = true
      graphRef.current?._ro?.disconnect()
      graphRef.current?._destructor?.()
      graphRef.current = null
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [mode])

  // Push data updates without remounting
  useEffect(() => {
    graphRef.current?.graphData(gd)
  }, [gd])

  return (
    <div className="relative w-full h-full" style={{ background: '#07050c' }}>
      <div ref={containerRef} className="w-full h-full" />

      {rawNodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none select-none">
          <div className="text-5xl opacity-10">⬡</div>
          <p className="text-sm text-zinc-500">No memory nodes yet</p>
          <p className="text-xs text-zinc-600">Chat in Memory or Hybrid mode to build your graph</p>
        </div>
      )}

      {/* Disease legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 pointer-events-none">
        {Object.entries(DISEASE_COLOR).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: color, boxShadow: `0 0 5px ${color}88` }}
            />
            {type.replace('_', ' ')}
          </div>
        ))}
      </div>

      {/* Node / edge count */}
      <div className="absolute top-3 right-3 text-[10px] font-mono text-zinc-600 bg-black/60 px-2 py-1 rounded border border-white/5">
        {rawNodes.length} nodes · {rawEdges.length} edges
      </div>
    </div>
  )
}
