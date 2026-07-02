import { useRef, useEffect, useCallback, useMemo } from 'react'
import ForceGraph3D from 'react-force-graph'
import * as THREE from 'three'

// ── Color palette ─────────────────────────────────────────────────────────────
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
  related_to:  '#d4d4d8',
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

// ── Three.js sphere factory (cached by color+size) ────────────────────────────
const _geoCache = {}
function makeSphere(r) {
  if (!_geoCache[r]) _geoCache[r] = new THREE.SphereGeometry(r, 16, 16)
  return _geoCache[r]
}

// ── Sprite label helper ───────────────────────────────────────────────────────
function makeLabel(text, color) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, 512, 128)
  ctx.fillStyle = 'rgba(20,18,16,0.82)'
  const W = 504, H = 120, R = 10
  ctx.beginPath()
  ctx.moveTo(R, 4); ctx.lineTo(W - R, 4)
  ctx.quadraticCurveTo(W, 4, W, 4 + R)
  ctx.lineTo(W, H - R); ctx.quadraticCurveTo(W, H, W - R, H)
  ctx.lineTo(R, H); ctx.quadraticCurveTo(4, H, 4, H - R)
  ctx.lineTo(4, 4 + R); ctx.quadraticCurveTo(4, 4, R, 4)
  ctx.closePath()
  ctx.fill()
  ctx.font = 'bold 18px ui-monospace, monospace'
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.fillText(text.slice(0, 28), 256, 30)
  ctx.font = '15px system-ui, sans-serif'
  ctx.fillStyle = '#e4e4e7'
  const words = text.split(' ')
  let line = '', y = 58
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > 480 && line) {
      ctx.fillText(line, 256, y); line = w; y += 22
    } else { line = test }
  }
  ctx.fillText(line, 256, y)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(40, 10, 1)
  return sprite
}

export default function MemoryGraph({ graphData, diseases, onNodeClick }) {
  const fgRef = useRef()
  const labelMap = useRef({})   // node id → sprite (for cleanup)
  const hoveredRef = useRef(null)

  const { nodes: rawNodes = [], edges: rawEdges = [] } = graphData

  // ── Build graph data ───────────────────────────────────────────────────────
  const gd = useMemo(() => {
    const nodes = rawNodes.map(n => {
      const disease = getDisease(n, diseases)
      const color   = DISEASE_COLOR[disease] || DISEASE_COLOR.healthy
      const r       = 4 + Math.min(n.confidence || 0.5, 1) * 4
                        + Math.min(n.retrieval_count || 0, 8) * 0.4
      return { ...n, __color: color, __r: r, __disease: disease }
    })
    const links = rawEdges.map(e => ({
      ...e,
      source: e.source, target: e.target,
      __color: EDGE_COLOR[e.relationship] || EDGE_COLOR.related_to,
    }))
    return { nodes, links }
  }, [rawNodes, rawEdges, diseases])

  // ── Custom node object ─────────────────────────────────────────────────────
  const nodeThreeObject = useCallback((node) => {
    const group = new THREE.Group()

    // Glow halo
    const haloGeo = makeSphere(node.__r * 1.55)
    const haloMat = new THREE.MeshBasicMaterial({
      color: node.__color,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
    })
    group.add(new THREE.Mesh(haloGeo, haloMat))

    // Core sphere
    const coreMat = new THREE.MeshPhongMaterial({
      color: node.__color,
      emissive: node.__color,
      emissiveIntensity: 0.35,
      shininess: 80,
      opacity: node.is_outdated ? 0.35 : 1,
      transparent: node.is_outdated,
    })
    group.add(new THREE.Mesh(makeSphere(node.__r), coreMat))

    // Pinned ring
    if (node.is_pinned) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(node.__r * 1.3, 0.5, 8, 24),
        new THREE.MeshBasicMaterial({ color: '#fbbf24' }),
      )
      ring.rotation.x = Math.PI / 2
      group.add(ring)
    }

    return group
  }, [])

  // ── Link color ─────────────────────────────────────────────────────────────
  const linkColor    = useCallback(link => link.__color, [])
  const linkWidth    = useCallback(link => link.relationship === 'contradicts' ? 2.5 : 1.2, [])
  const linkOpacity  = useCallback(link => link.relationship === 'contradicts' ? 0.9 : 0.5, [])

  // ── Node label (tooltip on hover) ─────────────────────────────────────────
  const nodeLabel = useCallback(node =>
    `<div style="font:12px ui-monospace,monospace;background:#141210cc;color:${node.__color};
     padding:6px 10px;border-radius:6px;max-width:260px;border:1px solid ${node.__color}44">
      <b>${node.subject || node.type}</b><br/>
      <span style="color:#e4e4e7;font:11px system-ui">${node.content?.slice(0, 120) || ''}</span><br/>
      <span style="color:#71717a;font-size:10px">conf ${((node.confidence||0)*100).toFixed(0)}% · ×${node.retrieval_count||0}</span>
    </div>`, [])

  // ── Click handler ──────────────────────────────────────────────────────────
  const onNodeClickCb = useCallback(node => {
    onNodeClick?.(node)
    // Zoom camera to node
    const dist = 80
    const { x = 0, y = 0, z = 0 } = node
    fgRef.current?.cameraPosition(
      { x: x + dist, y: y + dist, z: z + dist },
      { x, y, z },
      800,
    )
  }, [onNodeClick])

  // ── Scene setup (lights, background) ──────────────────────────────────────
  useEffect(() => {
    if (!fgRef.current) return
    const scene  = fgRef.current.scene()
    const camera = fgRef.current.camera()

    // Warm ambient + directional
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dir = new THREE.DirectionalLight(0xffffff, 1.2)
    dir.position.set(200, 300, 200)
    scene.add(dir)
    const fill = new THREE.PointLight(0x8b5cf6, 0.8, 600)
    fill.position.set(-200, -100, -200)
    scene.add(fill)

    // Subtle fog
    scene.fog = new THREE.FogExp2(0x0c0a09, 0.004)
    scene.background = new THREE.Color(0x0c0a09)

    camera.near = 1
    camera.updateProjectionMatrix()
  }, [])

  // ── Warm up simulation then freeze ────────────────────────────────────────
  useEffect(() => {
    if (!fgRef.current || !gd.nodes.length) return
    fgRef.current.d3Force('charge')?.strength(-180)
    fgRef.current.d3Force('link')?.distance(60)
    setTimeout(() => fgRef.current?.d3AlphaDecay(0.04), 200)
  }, [gd])

  if (!rawNodes.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center select-none gap-3">
        <div className="text-4xl opacity-20">⬡</div>
        <p className="text-sm text-zinc-500">No memory nodes yet</p>
        <p className="text-xs text-zinc-400">Chat in Memory or Hybrid mode to build your graph</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      <ForceGraph3D
        ref={fgRef}
        graphData={gd}
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={false}
        nodeLabel={nodeLabel}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkOpacity={linkOpacity}
        linkDirectionalArrowLength={5}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={linkColor}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleColor={linkColor}
        onNodeClick={onNodeClickCb}
        backgroundColor="#0c0a09"
        showNavInfo={false}
      />

      {/* Legend overlay */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1 pointer-events-none">
        {Object.entries(DISEASE_COLOR).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
            {type.replace('_', ' ')}
          </div>
        ))}
      </div>

      {/* Node count badge */}
      <div className="absolute top-3 right-3 text-[10px] font-mono text-zinc-500 bg-bg-card/80 px-2 py-1 rounded border border-border-dim">
        {rawNodes.length} nodes · {rawEdges.length} edges
      </div>
    </div>
  )
}
