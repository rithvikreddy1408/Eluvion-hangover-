import { useRef, useEffect, useMemo } from 'react'

// ── Vivid palette — 3D (pops against dark space) ───────────────────
const DISEASE_3D = {
  healthy:       '#22d3ee',
  memory_rot:    '#f59e0b',
  contamination: '#ef4444',
  fragmentation: '#94a3b8',
  amnesia:       '#3b82f6',
  bias:          '#a855f7',
  noise:         '#71717a',
}
const EDGE_3D = {
  related_to:  '#374151',
  updates:     '#22d3ee',
  contradicts: '#ef4444',
  supports:    '#22c55e',
  supersedes:  '#f59e0b',
  REPLACED_BY: '#f97316',
}

// ── Muted palette — 2D (professional, no neon) ─────────────────────
const DISEASE_2D = {
  healthy:       '#5ba8c4',   // slate-teal
  memory_rot:    '#b8863a',   // warm ochre
  contamination: '#b05060',   // dusty rose-red
  fragmentation: '#6b8090',   // steel-blue-grey
  amnesia:       '#5470b0',   // cornflower
  bias:          '#8060a8',   // muted plum
  noise:         '#585f6a',   // charcoal-grey
}
const EDGE_2D = {
  related_to:  '#2e3740',   // near-invisible, structural
  updates:     '#3d8095',   // muted teal
  contradicts: '#8f3a45',   // muted burgundy
  supports:    '#3d7858',   // muted sage
  supersedes:  '#8f6a2a',   // muted gold
  REPLACED_BY: '#8f5030',   // muted burnt-orange
}

function getDisease(node, diseases) {
  if (!diseases?.length) return 'healthy'
  for (const d of diseases) {
    if (d.affected_node_ids?.includes(node.id)) return d.type
  }
  return 'healthy'
}

function nodeTooltip(n, color) {
  return `<div style="
      font:11px ui-monospace,monospace;
      background:#0d0b14f2;
      color:${color};
      padding:8px 12px;
      border-radius:8px;
      max-width:280px;
      border:1px solid ${color}44;
      box-shadow:0 4px 20px rgba(0,0,0,0.6);
      line-height:1.55;
    ">
    <b style="font-size:12px;letter-spacing:0.01em">${n.subject || n.type || 'memory'}</b><br/>
    <span style="color:#c9cdd4">${(n.content || '').slice(0, 120)}${(n.content || '').length > 120 ? '…' : ''}</span><br/>
    <span style="color:#5a6370;font-size:10px;margin-top:4px;display:block">
      conf ${Math.round((n.confidence ?? 0) * 100)}% · recalled ×${n.retrieval_count ?? 0}
    </span>
  </div>`
}

export default function MemoryGraph({ graphData, diseases, onNodeClick, mode = '3d' }) {
  const containerRef = useRef(null)
  const graphRef     = useRef(null)
  const { nodes: rawNodes = [], edges: rawEdges = [] } = graphData

  // Pre-compute both color sets — renderer picks the right one
  const gd = useMemo(() => ({
    nodes: rawNodes.map(n => {
      const disease = getDisease(n, diseases)
      const r = 5 + Math.min(n.confidence ?? 0.5, 1) * 6
                  + Math.min(n.retrieval_count ?? 0, 10) * 0.5
      return { ...n, __disease: disease, __c3: DISEASE_3D[disease] ?? DISEASE_3D.healthy,
               __c2: DISEASE_2D[disease] ?? DISEASE_2D.healthy, __r: r }
    }),
    links: rawEdges.map(e => ({
      ...e,
      source:  e.source,
      target:  e.target,
      __e3:    EDGE_3D[e.relationship] ?? EDGE_3D.related_to,
      __e2:    EDGE_2D[e.relationship] ?? EDGE_2D.related_to,
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
          // nodes
          .nodeColor(n      => n.__c3)
          .nodeVal(n        => Math.pow(n.__r, 2))
          .nodeOpacity(0.92)
          .nodeResolution(16)
          .nodeLabel(n      => nodeTooltip(n, n.__c3))
          // edges
          .linkColor(l      => l.__e3)
          .linkWidth(l      => l.relationship === 'contradicts' ? 2.0 : 0.8)
          .linkOpacity(0.5)
          .linkDirectionalArrowLength(5)
          .linkDirectionalArrowRelPos(1)
          .linkDirectionalParticles(3)
          .linkDirectionalParticleSpeed(0.005)
          .linkDirectionalParticleWidth(l => l.relationship === 'contradicts' ? 2.5 : 1.5)
          .linkDirectionalParticleColor(l => l.__e3)
          .onNodeClick(node => onNodeClick?.(node))
          .onEngineStop(() => G.zoomToFit(600, 40))
          .graphData(gd)

        // Stronger repulsion + longer springs → nodes spread out; zoomToFit keeps clusters visible
        G.d3Force('charge').strength(-180)
        G.d3Force('link').distance(70)

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

          // ── Custom canvas nodes — muted glow discs ─────────────
          .nodeCanvasObject((node, ctx, scale) => {
            const r     = node.__r * 0.75
            const color = node.__c2

            // soft ambient halo (subtle, not neon)
            for (let i = 3; i >= 1; i--) {
              ctx.beginPath()
              ctx.arc(node.x, node.y, r + i * 2.5, 0, 2 * Math.PI)
              ctx.fillStyle = color + Math.round(0.04 * i * 255).toString(16).padStart(2, '0')
              ctx.fill()
            }

            // filled disc with slight inner highlight
            const grad = ctx.createRadialGradient(
              node.x - r * 0.25, node.y - r * 0.25, 0,
              node.x, node.y, r
            )
            grad.addColorStop(0, color + 'ee')
            grad.addColorStop(1, color + '88')
            ctx.beginPath()
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
            ctx.fillStyle = grad
            ctx.fill()

            // thin rim
            ctx.strokeStyle = color + '99'
            ctx.lineWidth   = 0.7
            ctx.stroke()

            // label when zoomed in enough
            if (scale >= 1.4) {
              const label = (node.subject || node.type || 'node').slice(0, 22)
              const fs    = Math.max(3, 4.5 / scale)
              ctx.font         = `${fs}px ui-monospace,monospace`
              ctx.fillStyle    = '#9ba3ae'
              ctx.textAlign    = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillText(label, node.x, node.y + r + 6 / scale)
            }
          })
          .nodePointerAreaPaint((node, color, ctx) => {
            ctx.beginPath()
            ctx.arc(node.x, node.y, node.__r * 0.75 + 5, 0, 2 * Math.PI)
            ctx.fillStyle = color
            ctx.fill()
          })

          // ── Edges — muted, structural ──────────────────────────
          .linkColor(l      => l.__e2 + 'bb')
          .linkWidth(l      => l.relationship === 'contradicts' ? 2.0 : 1.0)
          .linkDirectionalArrowLength(5)
          .linkDirectionalArrowRelPos(1)
          .linkDirectionalParticles(2)
          .linkDirectionalParticleSpeed(0.005)
          .linkDirectionalParticleWidth(1.5)
          .linkDirectionalParticleColor(l => l.__e2)

          .onNodeClick(node => onNodeClick?.(node))
          .onEngineStop(() => G.zoomToFit(600, 40))
          .graphData(gd)

        G.d3Force('charge').strength(-220)
        G.d3Force('link').distance(50)

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

  useEffect(() => { graphRef.current?.graphData(gd) }, [gd])

  // Active palette for legend
  const legendColors = mode === '3d' ? DISEASE_3D : DISEASE_2D

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

      {/* Legend — colors match active mode */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 pointer-events-none">
        {Object.entries(legendColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: color }}
            />
            {type.replace('_', ' ')}
          </div>
        ))}
      </div>

      {/* Node / edge count */}
      <div className="absolute top-3 right-3 text-[10px] font-mono text-zinc-600 bg-black/50 px-2 py-1 rounded border border-white/5">
        {rawNodes.length} nodes · {rawEdges.length} edges
      </div>
    </div>
  )
}
