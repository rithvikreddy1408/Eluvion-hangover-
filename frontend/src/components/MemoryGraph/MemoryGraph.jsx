import { useCallback, useEffect, useMemo } from 'react'
import ReactFlow, {
  Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  MarkerType, BackgroundVariant, Handle, Position,
} from 'reactflow'
import 'reactflow/dist/style.css'

const DISEASE_COLORS = {
  healthy:       '#06b6d4',
  memory_rot:    '#d97706',
  contamination: '#dc2626',
  fragmentation: '#64748b',
  amnesia:       '#2563eb',
  bias:          '#7c3aed',
  noise:         '#71717a',
}

const EDGE_STYLES = {
  related_to: { stroke: '#d4d4d8', strokeWidth: 1.5 },
  updates:    { stroke: '#06b6d4', strokeWidth: 1.5 },
  contradicts:{ stroke: '#dc2626', strokeWidth: 2,   strokeDasharray: '5 3' },
  supports:   { stroke: '#16a34a', strokeWidth: 1.5 },
  supersedes: { stroke: '#d97706', strokeWidth: 1.5, strokeDasharray: '4 2' },
}

function getNodeDisease(node, diseases) {
  if (!diseases) return 'healthy'
  for (const d of diseases) {
    if (d.affected_node_ids.includes(node.id)) return d.type
  }
  return 'healthy'
}

function buildLayout(nodes) {
  const subjects = {}
  nodes.forEach((n) => {
    const key = n.subject || 'misc'
    if (!subjects[key]) subjects[key] = []
    subjects[key].push(n)
  })
  const groups = Object.values(subjects)
  const aStep = (2 * Math.PI) / Math.max(groups.length, 1)
  const positions = {}
  groups.forEach((group, gi) => {
    const cx = Math.cos(gi * aStep) * 300 + 400
    const cy = Math.sin(gi * aStep) * 300 + 300
    const iStep = (2 * Math.PI) / Math.max(group.length, 1)
    group.forEach((n, ni) => {
      positions[n.id] = {
        x: cx + Math.cos(ni * iStep) * (group.length > 1 ? 110 : 0),
        y: cy + Math.sin(ni * iStep) * (group.length > 1 ? 110 : 0),
      }
    })
  })
  return positions
}

const MemoryNodeComponent = ({ data }) => (
  <div>
    <Handle type="target" position={Position.Top} style={{ background: data.color, width: 6, height: 6, border: 'none' }} />
    <div className="text-[10px] font-medium mb-0.5 truncate" style={{ color: data.color }}>
      {data.label.subject || data.label.type}
    </div>
    <div className="text-[11px] leading-snug text-zinc-700 line-clamp-2">
      {data.label.content}
    </div>
    {data.label.retrieval_count > 0 && (
      <div className="text-[9px] text-zinc-400 mt-1 font-mono">×{data.label.retrieval_count}</div>
    )}
    <Handle type="source" position={Position.Bottom} style={{ background: data.color, width: 6, height: 6, border: 'none' }} />
  </div>
)

const NODE_TYPES = { memoryNode: MemoryNodeComponent }

export default function MemoryGraph({ graphData, diseases, onNodeClick }) {
  const { nodes: rawNodes = [], edges: rawEdges = [] } = graphData
  const positions = useMemo(() => buildLayout(rawNodes), [rawNodes])

  const rfNodes = useMemo(() =>
    rawNodes.map((n) => {
      const disease = getNodeDisease(n, diseases)
      const color = DISEASE_COLORS[disease] || DISEASE_COLORS.healthy
      return {
        id: n.id,
        position: positions[n.id] || { x: Math.random() * 600, y: Math.random() * 400 },
        data: { label: n, disease, color },
        type: 'memoryNode',
        style: {
          background: '#eee8df',
          border: `1px solid ${color}66`,
          borderRadius: 6,
          padding: '8px 12px',
          color: '#1a1815',
          fontSize: 12,
          maxWidth: 180,
          opacity: n.is_outdated ? 0.45 : 1,
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        },
      }
    }), [rawNodes, diseases, positions])

  const rfEdges = useMemo(() =>
    rawEdges.map((e) => {
      const style = EDGE_STYLES[e.relationship] || EDGE_STYLES.related_to
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.relationship.replace(/_/g, ' '),
        labelStyle: { fill: '#71717a', fontSize: 9, fontFamily: 'ui-monospace' },
        labelBgStyle: { fill: '#eee8df', fillOpacity: 0.92 },
        style,
        markerEnd: { type: MarkerType.ArrowClosed, color: style.stroke, width: 12, height: 12 },
        animated: e.relationship === 'contradicts',
      }
    }), [rawEdges])

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges)

  useEffect(() => { setNodes(rfNodes) }, [rfNodes, setNodes])
  useEffect(() => { setEdges(rfEdges) }, [rfEdges, setEdges])

  const onNodeClickCb = useCallback((_, node) => {
    onNodeClick?.(node.data.label)
  }, [onNodeClick])

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClickCb}
        nodeTypes={NODE_TYPES}
        fitView fitViewOptions={{ padding: 0.2 }}
        minZoom={0.15} maxZoom={3}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="#e4e4e7" gap={24} size={1} />
        <Controls />
        <MiniMap nodeColor={(n) => n.data?.color || '#948e85'} maskColor="#e9e3dacc" />
      </ReactFlow>
    </div>
  )
}
