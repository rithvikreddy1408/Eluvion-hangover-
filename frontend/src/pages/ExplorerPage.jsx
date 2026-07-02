import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Compass, User, FolderOpen, FileText, CheckSquare, Star, MessageCircle,
  Database, Pin, AlertTriangle, Clock, RefreshCw, ChevronRight, Loader2,
  GitBranch, Layers, TrendingUp, CheckCircle2,
} from 'lucide-react'
import { getExplorer, getContradictions, resolveContradiction, getAuditStats } from '../api/client'

const CATEGORY_META = {
  person:       { icon: User,          color: 'text-accent-blue',   label: 'People'        },
  project:      { icon: FolderOpen,    color: 'text-accent-purple', label: 'Projects'      },
  task:         { icon: CheckSquare,   color: 'text-accent-green',  label: 'Tasks'         },
  document:     { icon: FileText,      color: 'text-accent-amber',  label: 'Documents'     },
  preference:   { icon: Star,          color: 'text-yellow-600',    label: 'Preferences'   },
  conversation: { icon: MessageCircle, color: 'text-zinc-500',      label: 'Conversations' },
  fact:         { icon: Database,      color: 'text-zinc-500',      label: 'Facts'         },
}

const RESOLUTION_OPTIONS = [
  { value: 'replace',   label: 'Replace old', desc: 'Mark existing as outdated' },
  { value: 'keep_both', label: 'Keep both',   desc: 'No action taken' },
  { value: 'merge',     label: 'Merge',       desc: 'Combine into one' },
  { value: 'ignore',    label: 'Ignore',      desc: 'Lower new confidence' },
]

function ImportanceBar({ score }) {
  const pct = Math.min(100, (score / 2.0) * 100)
  const color = pct >= 70 ? 'bg-accent-green' : pct >= 40 ? 'bg-accent-amber' : 'bg-zinc-300'
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1 bg-border-dim rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-2xs font-mono text-zinc-400">{score.toFixed(2)}</span>
    </div>
  )
}

function MemoryRow({ node }) {
  return (
    <tr className="group">
      <td className="py-2.5 max-w-xs">
        <p className="text-xs text-zinc-700 leading-snug line-clamp-2">{node.content}</p>
      </td>
      <td className="py-2.5 text-2xs font-mono text-zinc-500">{Math.round((node.confidence ?? 0) * 100)}%</td>
      <td className="py-2.5 text-2xs font-mono text-zinc-500">×{node.retrieval_count}</td>
      <td className="py-2.5"><ImportanceBar score={node.importance_score} /></td>
      <td className="py-2.5">
        <div className="flex items-center gap-1">
          {node.is_pinned && <Pin size={9} className="text-accent-purple" />}
          {node.edge_count > 0 && (
            <span className="flex items-center gap-0.5 text-2xs font-mono text-zinc-400">
              <GitBranch size={8} />{node.edge_count}
            </span>
          )}
          <span className="text-2xs font-mono text-zinc-400">v{node.version}</span>
        </div>
      </td>
    </tr>
  )
}

function ContradictionCard({ record, onResolve }) {
  const [chosen, setChosen] = useState('')
  const [loading, setLoading] = useState(false)

  if (record.resolved) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 border border-border-dim rounded-md opacity-50">
        <CheckCircle2 size={10} className="text-accent-green" />
        <span className="text-2xs text-zinc-500 font-mono">Resolved · {record.resolution}</span>
      </div>
    )
  }

  return (
    <div className="border border-border-dim rounded-lg overflow-hidden bg-bg-card">
      <div className="px-4 py-2.5 border-b border-border-dim bg-bg-secondary flex items-center gap-2">
        <AlertTriangle size={12} className="text-accent-amber" />
        <span className="text-xs font-medium text-accent-amber">Conflict · {record.subject}</span>
        <span className="ml-auto text-2xs font-mono text-zinc-400">
          {(record.overlap_score * 100).toFixed(0)}% overlap
        </span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border-dim">
        <div className="px-4 py-3">
          <p className="text-2xs text-zinc-400 uppercase tracking-wider mb-1.5 font-medium">Existing</p>
          <p className="text-xs text-zinc-700 leading-relaxed">{record.existing_content}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-2xs text-zinc-400 uppercase tracking-wider mb-1.5 font-medium">New</p>
          <p className="text-xs text-zinc-700 leading-relaxed">{record.new_content}</p>
        </div>
      </div>
      <div className="px-4 py-3 border-t border-border-dim bg-bg-secondary flex items-center gap-2 flex-wrap">
        {RESOLUTION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setChosen(opt.value)}
            title={opt.desc}
            className={`text-2xs px-2.5 py-1 rounded-md border transition-colors font-mono
              ${chosen === opt.value
                ? 'border-accent-purple/40 bg-accent-purple/10 text-accent-purple'
                : 'border-border-dim text-zinc-500 hover:text-zinc-900 hover:border-border-mid'
              }`}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={async () => {
            if (!chosen) return
            setLoading(true)
            await onResolve(record.id, chosen)
            setLoading(false)
          }}
          disabled={!chosen || loading}
          className="ml-auto flex items-center gap-1.5 text-2xs px-3 py-1 rounded-md bg-accent-purple text-white hover:bg-accent-purple/80 disabled:opacity-40 transition-colors"
        >
          {loading ? <Loader2 size={10} className="animate-spin" /> : <ChevronRight size={10} />}
          Apply
        </button>
      </div>
    </div>
  )
}

export default function ExplorerPage() {
  const [explorer, setExplorer] = useState([])
  const [contradictions, setContradictions] = useState([])
  const [auditStats, setAuditStats] = useState(null)
  const [activeTab, setActiveTab] = useState('memories')
  const [loading, setLoading] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [ex, con, stats] = await Promise.all([getExplorer(), getContradictions(false), getAuditStats()])
      setExplorer(ex.data)
      setContradictions(con.data)
      setAuditStats(stats.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const handleResolve = async (id, resolution) => {
    await resolveContradiction(id, resolution)
    const res = await getContradictions(false)
    setContradictions(res.data)
  }

  const totalMemories = explorer.reduce((s, c) => s + c.total, 0)
  const unresolved = contradictions.filter(c => !c.resolved).length

  const TABS = [
    { key: 'memories',       label: 'Memories',  count: totalMemories },
    { key: 'contradictions', label: 'Conflicts', count: unresolved,  alert: unresolved > 0 },
    { key: 'audit',          label: 'Audit',     count: auditStats?.total },
  ]

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Sidebar */}
      <div className="w-52 border-r border-border-dim bg-bg-secondary flex flex-col shrink-0">
        <div className="px-4 h-11 border-b border-border-dim flex items-center gap-2 shrink-0">
          <Compass size={13} className="text-zinc-400" />
          <span className="text-xs font-medium text-zinc-900">Explorer</span>
          <span className="ml-auto text-2xs font-mono text-zinc-400">{totalMemories}</span>
        </div>

        <nav className="flex-1 py-1 overflow-y-auto">
          {/* Main tabs */}
          {TABS.map(({ key, label, count, alert }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors
                ${activeTab === key ? 'bg-accent-purple/8 text-accent-purple' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
            >
              <span className="flex-1 text-left text-xs">{label}</span>
              {count != null && (
                <span className={`text-2xs font-mono ${alert ? 'text-accent-amber' : 'text-zinc-400'}`}>{count}</span>
              )}
            </button>
          ))}

          {/* Category divider */}
          {explorer.length > 0 && (
            <>
              <div className="px-4 pt-4 pb-1">
                <span className="text-2xs text-zinc-400 uppercase tracking-wider font-medium">By Category</span>
              </div>
              {explorer.map(({ category, total }) => {
                const meta = CATEGORY_META[category] || CATEGORY_META.fact
                const Icon = meta.icon
                const key = `cat:${category}`
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`w-full flex items-center gap-2.5 px-4 py-1.5 text-xs transition-colors
                      ${activeTab === key ? 'bg-accent-purple/8 text-accent-purple' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'}`}
                  >
                    <Icon size={12} className={activeTab === key ? meta.color : ''} />
                    <span className="flex-1 text-left">{meta.label}</span>
                    <span className="text-2xs font-mono text-zinc-400">{total}</span>
                  </button>
                )
              })}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-border-dim">
          <button
            onClick={fetchAll}
            disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 text-2xs text-zinc-500 hover:text-zinc-900 border border-border-dim hover:border-border-mid rounded-md py-1.5 transition-colors disabled:opacity-40"
          >
            {loading ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* Memories */}
          {(activeTab === 'memories' || activeTab.startsWith('cat:')) && (
            <motion.div key="memories" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {explorer
                .filter(cat => activeTab === 'memories' || activeTab === `cat:${cat.category}`)
                .map(({ category, items, total }) => {
                  const meta = CATEGORY_META[category] || CATEGORY_META.fact
                  const Icon = meta.icon
                  return (
                    <div key={category} className="border-b border-border-dim">
                      <div className="px-5 py-3 flex items-center gap-2 bg-bg-secondary sticky top-0 z-10 border-b border-border-dim">
                        <Icon size={13} className={meta.color} />
                        <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
                        <span className="ml-auto text-2xs font-mono text-zinc-400">{total} items</span>
                      </div>
                      <div className="px-5">
                        <table className="w-full data-table">
                          <thead>
                            <tr>
                              <th>Content</th>
                              <th>Conf.</th>
                              <th>Recalls</th>
                              <th>Importance</th>
                              <th>Flags</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.slice(0, 10).map((node) => (
                              <MemoryRow key={node.id} node={node} />
                            ))}
                          </tbody>
                        </table>
                        {items.length > 10 && (
                          <p className="text-2xs text-zinc-400 text-center font-mono py-2">+{items.length - 10} more</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              {explorer.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Database size={22} className="text-zinc-300 mb-3" />
                  <p className="text-sm text-zinc-400">No memories indexed yet</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Contradictions */}
          {activeTab === 'contradictions' && (
            <motion.div key="contradictions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="px-5 py-4 border-b border-border-dim">
                <h2 className="text-sm font-medium text-zinc-900 mb-0.5">Memory Conflicts</h2>
                <p className="text-xs text-zinc-500">Resolve contradictions to maintain graph accuracy.</p>
              </div>
              {contradictions.length === 0 ? (
                <div className="flex items-center gap-2.5 px-5 py-8 text-accent-green">
                  <CheckCircle2 size={16} />
                  <span className="text-sm">No conflicts — memory graph is consistent</span>
                </div>
              ) : (
                <div className="p-5 space-y-3 max-w-3xl">
                  {contradictions.map((c) => (
                    <ContradictionCard key={c.id} record={c} onResolve={handleResolve} />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Audit */}
          {activeTab === 'audit' && (
            <motion.div key="audit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="px-5 py-4 border-b border-border-dim">
                <h2 className="text-sm font-medium text-zinc-900 mb-0.5">Operation Audit Log</h2>
                <p className="text-xs text-zinc-500">Every memory operation logged with timing and metadata.</p>
              </div>
              {auditStats && (
                <div className="px-5 py-4 space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Total ops',    value: auditStats.total,                                        icon: Layers },
                      { label: 'Avg latency',  value: `${auditStats.avg_duration_ms?.toFixed(0)}ms`,           icon: Clock },
                      { label: 'Success rate', value: `${((auditStats.success_rate ?? 1) * 100).toFixed(0)}%`, icon: TrendingUp },
                      { label: 'Op types',     value: Object.keys(auditStats.by_operation ?? {}).length,       icon: Database },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="border border-border-dim rounded-lg p-3 bg-bg-card">
                        <div className="text-base font-semibold font-mono text-zinc-900 tabular-nums">{value}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Icon size={10} className="text-zinc-400" />
                          <span className="text-2xs text-zinc-400">{label}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {auditStats.by_operation && (
                    <div className="border border-border-dim rounded-lg overflow-hidden bg-bg-card">
                      <div className="px-4 py-2.5 border-b border-border-dim bg-bg-secondary">
                        <span className="text-2xs text-zinc-400 uppercase tracking-wider font-medium">Operations breakdown</span>
                      </div>
                      <table className="w-full data-table px-4">
                        <thead><tr><th>Operation</th><th>Count</th><th>Share</th></tr></thead>
                        <tbody>
                          {Object.entries(auditStats.by_operation).map(([op, count]) => (
                            <tr key={op} className="group">
                              <td className="font-mono text-accent-purple">{op}</td>
                              <td className="font-mono">{count}</td>
                              <td className="w-40">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1 bg-border-dim rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${(count / auditStats.total) * 100}%` }}
                                      transition={{ duration: 0.5 }}
                                      className="h-full bg-accent-purple rounded-full"
                                    />
                                  </div>
                                  <span className="text-2xs font-mono text-zinc-400 w-8 text-right">
                                    {((count / auditStats.total) * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
