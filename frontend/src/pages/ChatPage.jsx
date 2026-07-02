import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pin, AlertTriangle, GitBranch } from 'lucide-react'
import ChatInterface from '../components/Chat/ChatInterface'

function MemoryRow({ mem, index }) {
  const confPct = Math.round((mem.confidence ?? 0) * 100)
  return (
    <motion.div
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.03 }}
      className="py-2.5 px-1 border-b border-border-dim last:border-0 hover:bg-bg-hover transition-colors cursor-default"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-700 leading-snug line-clamp-2 mb-1">{mem.content}</p>
          <div className="flex items-center gap-2 text-2xs font-mono text-zinc-400">
            {mem.subject && <span className="text-accent-purple/70 truncate max-w-[80px]">{mem.subject}</span>}
            <span>{confPct}%</span>
            <span>×{mem.retrieval_count}</span>
            {mem.is_pinned && <Pin size={9} className="text-zinc-400" />}
            {mem.is_outdated && <AlertTriangle size={9} className="text-accent-amber" />}
          </div>
        </div>
        {/* Confidence bar */}
        <div className="w-1 h-8 bg-border-dim rounded-full overflow-hidden shrink-0 mt-0.5">
          <div
            className={`w-full rounded-full transition-all ${
              confPct >= 80 ? 'bg-accent-green' : confPct >= 50 ? 'bg-accent-amber' : 'bg-accent-red'
            }`}
            style={{ height: `${confPct}%`, marginTop: `${100 - confPct}%` }}
          />
        </div>
      </div>
    </motion.div>
  )
}

export default function ChatPage() {
  const [lastRetrieval, setLastRetrieval] = useState([])

  return (
    <div className="flex h-full overflow-hidden">
      {/* Chat */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border-dim">
        <div className="px-5 h-11 border-b border-border-dim flex items-center gap-2 shrink-0">
          <h1 className="text-sm font-medium text-zinc-900">Chat</h1>
          <span className="text-2xs text-zinc-400 font-mono">/ Probe Memory</span>
        </div>
        <div className="flex-1 min-h-0">
          <ChatInterface onRetrieval={setLastRetrieval} />
        </div>
      </div>

      {/* Memory feed */}
      <div className="w-64 flex flex-col bg-bg-secondary shrink-0">
        <div className="px-4 h-11 border-b border-border-dim flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <GitBranch size={13} className="text-zinc-400" />
            <span className="text-xs font-medium text-zinc-700">Recalled</span>
          </div>
          {lastRetrieval.length > 0 && (
            <span className="text-2xs font-mono text-zinc-400">{lastRetrieval.length} nodes</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3">
          <AnimatePresence mode="popLayout">
            {lastRetrieval.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 text-center"
              >
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Memory nodes retrieved<br />for each query appear here
                </p>
              </motion.div>
            ) : lastRetrieval.map((mem, i) => (
              <MemoryRow key={mem.id} mem={mem} index={i} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
