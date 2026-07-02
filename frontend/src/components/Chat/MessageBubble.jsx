import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle, AlertTriangle, Brain, Globe, Layers } from 'lucide-react'
import FeedbackBar from './FeedbackBar'

const RISK = {
  low:    { label: 'Grounded',  Icon: CheckCircle,   cls: 'text-accent-green bg-accent-green/8 border-accent-green/20' },
  medium: { label: 'Uncertain', Icon: AlertTriangle, cls: 'text-accent-amber bg-accent-amber/8 border-accent-amber/20' },
  high:   { label: 'Risky',    Icon: AlertCircle,   cls: 'text-accent-red   bg-accent-red/8   border-accent-red/20'   },
}

function ProvenanceBadge({ provenance }) {
  if (!provenance) return null
  const { mode, sources = [], cognee_pct = 0, llm_pct = 0, cognee_nodes = 0, memory_found } = provenance

  const hasCognee = sources.includes('cognee')
  const hasLLM    = sources.includes('llm')

  // Memory-only with no results
  if (mode === 'memory' && !memory_found) {
    return (
      <div className="flex items-center gap-1.5 mt-2.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-2xs font-medium bg-zinc-100 border-zinc-300 text-zinc-500">
          <Brain size={9} /> No memory found
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
      {hasCognee && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-2xs font-medium bg-accent-green/8 border-accent-green/25 text-accent-green">
          <Brain size={9} />
          Cognee Memory
          {mode === 'hybrid' && <span className="ml-0.5 opacity-70">{cognee_pct}%</span>}
          {cognee_nodes > 0 && <span className="ml-0.5 opacity-60">· {cognee_nodes} node{cognee_nodes !== 1 ? 's' : ''}</span>}
        </span>
      )}
      {hasLLM && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-2xs font-medium bg-accent-blue/8 border-accent-blue/25 text-accent-blue">
          <Globe size={9} />
          General Knowledge
          {mode === 'hybrid' && hasCognee && <span className="ml-0.5 opacity-70">{llm_pct}%</span>}
        </span>
      )}
      {mode === 'general' && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-2xs font-medium bg-accent-blue/8 border-accent-blue/25 text-accent-blue">
          <Globe size={9} /> General Knowledge
        </span>
      )}
    </div>
  )
}

function ExplanationPanel({ explanation }) {
  const [open, setOpen] = useState(false)
  if (!explanation?.sources?.length) return null

  return (
    <div className="mt-2 border-t border-border-dim pt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-2xs text-zinc-500 hover:text-zinc-700 transition-colors"
      >
        {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        {explanation.sources.length} source{explanation.sources.length !== 1 ? 's' : ''} recalled
        {explanation.avg_confidence != null && (
          <span className="ml-1 text-zinc-400">· {(explanation.avg_confidence * 100).toFixed(0)}% avg conf.</span>
        )}
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 space-y-1.5"
        >
          {explanation.sources.map((src, i) => (
            <div key={i} className="bg-bg-secondary border border-border-dim rounded-md px-3 py-2">
              <div className="flex items-start gap-3">
                <p className="text-xs text-zinc-700 leading-relaxed flex-1">{src.content}</p>
                <span className="text-2xs font-mono text-zinc-400 shrink-0 mt-0.5">
                  {((src.relevance_score ?? src.confidence ?? 0) * 100).toFixed(0)}%
                </span>
              </div>
              {src.why_selected && (
                <p className="text-2xs text-zinc-400 mt-1">{src.why_selected}</p>
              )}
            </div>
          ))}
          {explanation.summary && (
            <p className="text-2xs text-zinc-400 italic pt-0.5">{explanation.summary}</p>
          )}
        </motion.div>
      )}
    </div>
  )
}

export default function MessageBubble({ message, onFeedback, onSave }) {
  const isUser = message.role === 'user'
  const risk = message.hallucinationRisk?.risk_level
    ? RISK[message.hallucinationRisk.risk_level]
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={`flex gap-3 mb-5 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-2xs font-semibold mt-0.5
        ${isUser
          ? 'bg-accent-purple/12 border border-accent-purple/20 text-accent-purple'
          : 'bg-bg-secondary border border-border-dim text-zinc-500'
        }`}
      >
        {isUser ? 'U' : 'E'}
      </div>

      {/* Content */}
      <div className={`max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-3 rounded-lg text-sm leading-relaxed
          ${isUser
            ? 'bg-accent-purple/10 border border-accent-purple/15 text-zinc-900'
            : 'bg-bg-card border border-border-dim text-zinc-700'
          }`}
        >
          <div className="bubble-content whitespace-pre-wrap">{message.content}</div>

          {/* Provenance badges */}
          {!isUser && <ProvenanceBadge provenance={message.provenance} />}

          {/* Hallucination risk */}
          {risk && !isUser && (() => {
            const { Icon, label, cls } = risk
            return (
              <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded border text-2xs font-medium ${cls}`}>
                <Icon size={9} />
                {label}
              </div>
            )
          })()}

          {/* Recalled sources */}
          {!isUser && message.explanation && (
            <ExplanationPanel explanation={message.explanation} />
          )}

          {/* Feedback / Save */}
          {!isUser && <FeedbackBar message={message} onFeedback={onFeedback} onSave={onSave} />}
        </div>

        {message.timestamp && (
          <span className="text-2xs text-zinc-400 font-mono mt-1 px-1">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </motion.div>
  )
}
