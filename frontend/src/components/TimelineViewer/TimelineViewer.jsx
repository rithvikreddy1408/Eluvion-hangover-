import { motion } from 'framer-motion'
import { Plus, Search, Edit3, Trash2, Zap } from 'lucide-react'

const EVENT_META = {
  memory_added:     { dot: 'bg-accent-green',  icon: Plus,   label: 'Added',    color: 'text-accent-green'  },
  memory_retrieved: { dot: 'bg-accent-purple', icon: Search, label: 'Recalled', color: 'text-accent-purple' },
  memory_improved:  { dot: 'bg-accent-blue',   icon: Edit3,  label: 'Improved', color: 'text-accent-blue'   },
  memory_removed:   { dot: 'bg-accent-red',    icon: Trash2, label: 'Removed',  color: 'text-accent-red'    },
  memory_evolved:   { dot: 'bg-accent-amber',  icon: Zap,    label: 'Evolved',  color: 'text-accent-amber'  },
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  const h = Math.floor(diff / 3600000)
  const m = Math.floor(diff / 60000)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  if (m > 0) return `${m}m ago`
  return 'just now'
}

export default function TimelineViewer({ events = [] }) {
  if (events.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-xs text-zinc-400">No events yet</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Vertical rail */}
      <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border-dim" />

      <div className="space-y-1">
        {events.map((event, i) => {
          const meta = EVENT_META[event.type] || { dot: 'bg-zinc-400', label: event.type, color: 'text-zinc-500' }
          const Icon = meta.icon || Plus
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="flex gap-3 relative pl-4 group"
            >
              <div className={`absolute left-0 top-2 w-2.5 h-2.5 rounded-full border-2 border-bg-secondary ${meta.dot} shrink-0 z-10`} />

              <div className="flex-1 py-2 border-b border-border-dim last:border-0 group-hover:bg-bg-hover -mx-1 px-1 rounded transition-colors">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className={`text-2xs font-mono uppercase tracking-wide ${meta.color}`}>
                    {meta.label}
                  </span>
                  <span className="text-2xs text-zinc-400 font-mono">{timeAgo(event.timestamp)}</span>
                </div>
                <p className="text-xs text-zinc-700 leading-snug line-clamp-2">{event.content}</p>
                {event.node_count != null && (
                  <p className="text-2xs text-zinc-400 mt-0.5 font-mono">{event.node_count} nodes recalled</p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
