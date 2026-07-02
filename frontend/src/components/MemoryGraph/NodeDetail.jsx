import { X, Tag, AlertTriangle, Pin, Star, Clock, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

function Row({ label, children }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border-dim last:border-0">
      <span className="text-2xs text-zinc-400 font-mono uppercase tracking-wider pt-0.5 w-20 shrink-0">{label}</span>
      <div className="flex-1 min-w-0 text-xs text-zinc-700">{children}</div>
    </div>
  )
}

export default function NodeDetail({ node, onClose }) {
  if (!node) return null
  const age = Math.floor((Date.now() - new Date(node.created_at)) / 86400000)
  const confPct = Math.round((node.confidence ?? 0) * 100)
  const confColor = confPct >= 80 ? 'text-accent-green' : confPct >= 50 ? 'text-accent-amber' : 'text-accent-red'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="w-72 border-l border-border-dim bg-bg-secondary flex flex-col shrink-0"
      >
        {/* Header */}
        <div className="px-4 h-11 border-b border-border-dim flex items-center justify-between shrink-0">
          <div>
            <span className="text-xs font-medium text-zinc-900">Node Detail</span>
            <span className="ml-2 text-2xs font-mono text-zinc-400">{node.id?.slice(0, 8)}…</span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md border border-border-dim flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:border-border-mid transition-colors"
          >
            <X size={11} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {/* Flags */}
          {(node.is_outdated || node.is_pinned || node.is_favorite) && (
            <div className="flex gap-1.5 mb-3 pt-2">
              {node.is_outdated && (
                <span className="flex items-center gap-1 text-2xs px-2 py-0.5 rounded-md border border-accent-amber/30 text-accent-amber bg-accent-amber/8">
                  <AlertTriangle size={9} />outdated
                </span>
              )}
              {node.is_pinned && (
                <span className="flex items-center gap-1 text-2xs px-2 py-0.5 rounded-md border border-accent-purple/25 text-accent-purple bg-accent-purple/8">
                  <Pin size={9} />pinned
                </span>
              )}
              {node.is_favorite && (
                <span className="flex items-center gap-1 text-2xs px-2 py-0.5 rounded-md border border-yellow-500/30 text-yellow-600 bg-yellow-50">
                  <Star size={9} />favorite
                </span>
              )}
            </div>
          )}

          {/* Content field */}
          <div className="bg-bg-card border border-border-dim rounded-md px-3 py-2.5 mb-3">
            <p className="text-xs text-zinc-800 leading-relaxed">{node.content}</p>
          </div>

          {/* Properties table */}
          <div>
            <Row label="Subject">{node.subject || <span className="text-zinc-400">—</span>}</Row>
            <Row label="Type">{node.type || <span className="text-zinc-400">—</span>}</Row>
            <Row label="Confidence">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-border-dim rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${confPct >= 80 ? 'bg-accent-green' : confPct >= 50 ? 'bg-accent-amber' : 'bg-accent-red'}`}
                    style={{ width: `${confPct}%` }}
                  />
                </div>
                <span className={`font-mono text-2xs font-medium w-8 text-right ${confColor}`}>{confPct}%</span>
              </div>
            </Row>
            <Row label="Retrievals"><span className="font-mono">×{node.retrieval_count}</span></Row>
            <Row label="Age"><span className="font-mono">{age}d</span></Row>
            {node.weight != null && (
              <Row label="Weight"><span className="font-mono">{node.weight?.toFixed(3)}</span></Row>
            )}
            {node.importance_score != null && (
              <Row label="Importance"><span className="font-mono text-accent-amber">{node.importance_score?.toFixed(2)}</span></Row>
            )}
            {node.version != null && (
              <Row label="Version">
                <span className="flex items-center gap-1 font-mono text-zinc-500">
                  <RefreshCw size={9} />v{node.version}
                </span>
              </Row>
            )}
            <Row label="Created">
              <span className="flex items-center gap-1 font-mono text-zinc-500">
                <Clock size={9} />{new Date(node.created_at).toLocaleDateString()}
              </span>
            </Row>
          </div>

          {/* Tags */}
          {node.tags?.length > 0 && (
            <div className="pt-3">
              <div className="flex items-center gap-1 text-2xs text-zinc-400 mb-2">
                <Tag size={9} />
                <span className="uppercase tracking-wider font-medium">Tags</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {node.tags.map((t) => (
                  <span key={t} className="text-2xs font-mono px-1.5 py-0.5 rounded-md bg-bg-hover border border-border-dim text-zinc-500">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
