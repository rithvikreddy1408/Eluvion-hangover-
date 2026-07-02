import { useState } from 'react'
import { ThumbsUp, ThumbsDown, RefreshCw, Pin, Trash2, Check, Loader2, X, Brain, Copy } from 'lucide-react'

const FEEDBACK_ACTIONS = [
  { key: 'correct',    icon: ThumbsUp,   label: 'Helpful' },
  { key: 'incorrect',  icon: ThumbsDown, label: 'Wrong'   },
  { key: 'replace',    icon: RefreshCw,  label: 'Correct' },
  { key: 'strengthen', icon: Pin,        label: 'Pin'     },
  { key: 'forget',     icon: Trash2,     label: 'Forget'  },
]

function CopyButton({ content }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={handleCopy}
      title="Copy"
      className="flex items-center gap-1 text-2xs px-2 py-1 rounded-md border border-border-dim text-zinc-500 hover:text-zinc-800 hover:border-border-mid transition-colors"
    >
      {copied ? <Check size={9} className="text-accent-green" /> : <Copy size={9} />}
      <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

// General Mode — shows "Save to Memory" + Copy. No feedback buttons.
function GeneralBar({ content, userQuery, onSave }) {
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const result = await onSave?.(content, userQuery)
    setSaving(false)
    if (result) setSaved(true)
  }

  return (
    <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-border-dim flex-wrap">
      {saved ? (
        <span className="inline-flex items-center gap-1 text-2xs text-accent-green font-mono">
          <Check size={9} /> Saved to Cognee memory
        </span>
      ) : (
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 text-2xs px-2.5 py-1 rounded-md border border-accent-green/30 bg-accent-green/8 text-accent-green hover:bg-accent-green/15 disabled:opacity-40 transition-colors"
        >
          {saving ? <Loader2 size={9} className="animate-spin" /> : <Brain size={9} />}
          Save to Memory
        </button>
      )}
      <CopyButton content={content} />
    </div>
  )
}

// Memory / Hybrid Mode — shows feedback buttons + Copy. No save button.
function FeedbackButtons({ message, onFeedback }) {
  const [sent, setSent] = useState(null)
  const [loading, setLoading] = useState(null)
  const [showReplace, setShowReplace] = useState(false)
  const [correction, setCorrection] = useState('')

  const handleAction = async (key) => {
    if (key === 'replace') { setShowReplace(true); return }
    setLoading(key)
    const result = await onFeedback(message, key, null)
    setLoading(null)
    if (result?.success) setSent(key)
  }

  const handleReplace = async () => {
    if (!correction.trim()) return
    setLoading('replace')
    const result = await onFeedback(message, 'replace', correction.trim())
    setLoading(null)
    if (result?.success) { setSent('replace'); setShowReplace(false) }
  }

  if (sent) {
    return (
      <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-border-dim">
        <Check size={10} className="text-accent-green" />
        <span className="text-2xs text-zinc-500 font-mono">Memory updated · {sent}</span>
      </div>
    )
  }

  return (
    <div className="mt-3 pt-2.5 border-t border-border-dim">
      {showReplace ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xs text-zinc-500">Enter the correct information</span>
            <button onClick={() => setShowReplace(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
              <X size={11} />
            </button>
          </div>
          <textarea
            value={correction}
            onChange={e => setCorrection(e.target.value)}
            placeholder="The correct answer is…"
            rows={2}
            autoFocus
            className="w-full bg-bg-secondary border border-border-mid rounded-md px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 resize-none focus:outline-none focus:border-accent-purple/40 transition-colors"
          />
          <button
            onClick={handleReplace}
            disabled={!correction.trim() || !!loading}
            className="flex items-center gap-1.5 text-2xs px-2.5 py-1 rounded-md bg-bg-secondary border border-border-mid text-zinc-700 hover:text-zinc-900 disabled:opacity-40 transition-colors"
          >
            {loading === 'replace' ? <Loader2 size={9} className="animate-spin" /> : <Check size={9} />}
            Save
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-2xs text-zinc-400 mr-1 font-mono">feedback</span>
          {FEEDBACK_ACTIONS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => handleAction(key)}
              disabled={!!loading}
              title={label}
              className="flex items-center gap-1 text-2xs px-2 py-1 rounded-md border border-border-dim text-zinc-500 hover:text-zinc-800 hover:border-border-mid disabled:opacity-40 transition-colors"
            >
              {loading === key ? <Loader2 size={9} className="animate-spin" /> : <Icon size={9} />}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
          <CopyButton content={message.content} />
        </div>
      )}
    </div>
  )
}

export default function FeedbackBar({ message, onFeedback, onSave }) {
  const isGeneral = message.mode === 'general'
  const hasMemoryIds = message.retrievedMemoryIds?.length > 0

  // General mode: show save button (always, since the response exists)
  if (isGeneral) {
    return <GeneralBar content={message.content} userQuery={message.userQuery} onSave={onSave} />
  }

  // Memory / Hybrid mode: show feedback buttons only when there are memory nodes to act on
  if (hasMemoryIds) {
    return <FeedbackButtons message={message} onFeedback={onFeedback} />
  }

  // Memory mode with no results — show just a copy button
  return (
    <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-border-dim">
      <CopyButton content={message.content} />
    </div>
  )
}
