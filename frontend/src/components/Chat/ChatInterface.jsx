import { useRef, useEffect } from 'react'
import { Send, Loader2, Brain, Globe, Layers } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import MessageBubble from './MessageBubble'
import { useChat } from '../../hooks/useChat'

const MODES = [
  {
    id: 'general',
    label: 'General',
    Icon: Globe,
    desc: 'LLM only — no memory',
    active: 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue',
  },
  {
    id: 'memory',
    label: 'Memory',
    Icon: Brain,
    desc: 'Cognee only — no hallucination',
    active: 'bg-accent-green/10 border-accent-green/30 text-accent-green',
  },
  {
    id: 'hybrid',
    label: 'Hybrid',
    Icon: Layers,
    desc: 'Cognee + LLM combined',
    active: 'bg-accent-purple/10 border-accent-purple/30 text-accent-purple',
  },
]

export default function ChatInterface({ onRetrieval }) {
  const {
    messages, lastRetrieval, loading,
    draft, setDraft,
    send, sendFeedback, saveToMemory,
    mode, setMode,
  } = useChat()

  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  // Scroll to bottom whenever the active conversation's messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Notify parent graph panel of new retrievals
  useEffect(() => {
    if (lastRetrieval.length > 0) onRetrieval?.(lastRetrieval)
  }, [lastRetrieval, onRetrieval])

  // Reset textarea height when switching modes (draft content changes)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollH = textareaRef.current.scrollHeight
      textareaRef.current.style.height = Math.min(scrollH, 120) + 'px'
    }
  }, [mode, draft])

  const handleSend = () => {
    const text = draft.trim()
    if (!text || loading) return
    send(text)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const activeMode = MODES.find(m => m.id === mode)

  return (
    <div className="flex flex-col h-full">
      {/* Mode selector */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border-dim bg-bg-secondary shrink-0">
        <span className="text-2xs text-zinc-400 font-mono mr-1">Agent</span>
        {MODES.map(({ id, label, Icon, desc, active }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            title={desc}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-2xs font-medium transition-colors
              ${mode === id ? active : 'border-border-dim text-zinc-500 hover:text-zinc-700 hover:border-border-mid'}`}
          >
            <Icon size={10} />
            {label}
          </button>
        ))}
        {activeMode && (
          <span className="ml-auto text-2xs text-zinc-400 italic hidden sm:block">{activeMode.desc}</span>
        )}
      </div>

      {/* Messages — isolated per mode */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center select-none">
            <activeMode.Icon size={24} className="text-zinc-300 mb-3" />
            <p className="text-sm text-zinc-500 font-medium">{activeMode.label} Agent</p>
            <p className="text-xs text-zinc-400 mt-1">{activeMode.desc}</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} onFeedback={sendFeedback} onSave={saveToMemory} />
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex gap-3 mb-5">
            <div className="w-6 h-6 rounded-full bg-bg-secondary border border-border-dim flex items-center justify-center shrink-0 mt-0.5">
              <Loader2 size={12} className="text-zinc-400 animate-spin" />
            </div>
            <div className="bg-bg-card border border-border-dim rounded-lg px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1 h-1 rounded-full bg-zinc-300 animate-pulse" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-zinc-300 animate-pulse" style={{ animationDelay: '200ms' }} />
                <span className="w-1 h-1 rounded-full bg-zinc-300 animate-pulse" style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border-dim px-4 py-3">
        <div className={`flex gap-3 items-end bg-bg-card border rounded-lg px-4 py-2.5 transition-colors
          ${draft ? 'border-border-mid' : 'border-border-dim'}`}
        >
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            onInput={(e) => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            placeholder={
              mode === 'general' ? 'Ask a general knowledge question…'
              : mode === 'memory'  ? 'Ask about something in your memory…'
              : 'Ask anything…'
            }
            rows={1}
            style={{ resize: 'none', minHeight: '22px', maxHeight: '120px' }}
            maxLength={4000}
            className="flex-1 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none leading-relaxed"
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || loading}
            className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors
              ${draft.trim() && !loading
                ? 'bg-accent-purple text-white hover:bg-accent-purple/80'
                : 'bg-bg-secondary text-zinc-400 cursor-not-allowed'
              }`}
          >
            <Send size={12} />
          </button>
        </div>
        <p className="text-2xs text-zinc-400 text-center mt-2 font-mono">Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  )
}
