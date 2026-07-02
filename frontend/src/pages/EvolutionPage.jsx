import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Dna, Play, GitMerge, TrendingDown, Zap, Loader2, Clock } from 'lucide-react'
import { getEvolutionStatus, triggerEvolution } from '../api/client'

const JOBS = [
  {
    key: 'merge', icon: GitMerge, label: 'Deduplication', color: 'text-accent-blue',
    description: 'Find near-duplicate memories (>75% overlap) and merge them into single coherent nodes.',
    statKey: 'total_merged', lastKey: 'last_merge',
  },
  {
    key: 'strengthen', icon: Zap, label: 'Strengthening', color: 'text-accent-purple',
    description: 'Boost confidence of top-20% most-retrieved memories to reinforce reliable knowledge.',
    statKey: 'total_strengthened', lastKey: 'last_strengthen',
  },
  {
    key: 'decay', icon: TrendingDown, label: 'Decay', color: 'text-accent-amber',
    description: 'Reduce confidence of memories not retrieved in 30+ days to reflect diminishing relevance.',
    statKey: 'total_decayed', lastKey: 'last_decay',
  },
]

function fmt(iso) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function EvolutionPage() {
  const [status, setStatus] = useState(null)
  const [running, setRunning] = useState(null)
  const [lastResults, setLastResults] = useState({})

  const fetchStatus = () => {
    getEvolutionStatus().then(r => setStatus(r.data)).catch(() => {})
  }

  useEffect(() => {
    fetchStatus()
    const id = setInterval(fetchStatus, 8000)
    return () => clearInterval(id)
  }, [])

  const handleTrigger = async (job) => {
    setRunning(job)
    try {
      const r = await triggerEvolution(job)
      setLastResults(r.data.results || {})
      fetchStatus()
    } catch (e) { console.error(e) }
    finally { setRunning(null) }
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 h-11 border-b border-border-dim flex items-center justify-between shrink-0 sticky top-0 bg-bg-primary z-10">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-medium text-zinc-900">Evolution</h1>
          <span className="text-2xs text-zinc-400 font-mono">/ Auto-optimization</span>
        </div>
        {/* Status */}
        <div className={`flex items-center gap-1.5 text-2xs font-mono px-2.5 py-1 rounded-md border
          ${status?.running ? 'text-accent-green border-accent-green/25' : 'text-zinc-400 border-border-dim'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status?.running ? 'bg-accent-green animate-pulse' : 'bg-zinc-300'}`} />
          {status?.current_job ? `running: ${status.current_job}` : status?.running ? 'idle' : 'offline'}
        </div>
      </div>

      <div className="px-6 py-5 max-w-3xl space-y-5">
        {/* Run All */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-700">Background jobs improve memory quality during idle time.</p>
            <p className="text-xs text-zinc-400 mt-0.5">Trigger manually below, or wait for auto-activation after 60s idle.</p>
          </div>
          <button
            onClick={() => handleTrigger('all')}
            disabled={!!running}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent-purple text-white text-sm font-medium hover:bg-accent-purple/80 disabled:opacity-40 transition-colors shrink-0 ml-6"
          >
            {running === 'all' ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Run All
          </button>
        </div>

        {/* Job table */}
        <div className="border border-border-dim rounded-lg overflow-hidden bg-bg-card">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Description</th>
                <th>Last Run</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {JOBS.map(({ key, icon: Icon, label, color, description, statKey, lastKey }) => {
                const jobResult = lastResults[key]
                const statVal = status?.[statKey] ?? 0
                const lastRun = status?.[lastKey]
                return (
                  <motion.tr
                    key={key}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="group"
                  >
                    <td>
                      <div className="flex items-center gap-2">
                        <Icon size={13} className={color} />
                        <span className={`font-medium ${color}`}>{label}</span>
                      </div>
                    </td>
                    <td className="text-zinc-500 text-xs max-w-xs">{description}</td>
                    <td>
                      <span className="flex items-center gap-1 text-2xs font-mono text-zinc-400">
                        <Clock size={9} />{fmt(lastRun)}
                      </span>
                    </td>
                    <td className="font-mono text-2xs text-zinc-500">
                      {statVal}
                      {jobResult && (
                        <span className={`ml-1.5 ${color}`}>+{Object.values(jobResult)[0]}</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleTrigger(key)}
                        disabled={!!running}
                        className="flex items-center gap-1 text-2xs px-2.5 py-1 rounded-md border border-border-dim text-zinc-500 hover:text-zinc-900 hover:border-border-mid disabled:opacity-40 transition-colors"
                      >
                        {running === key ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                        Run
                      </button>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Info */}
        <div className="text-xs text-zinc-400 space-y-1 border-t border-border-dim pt-4">
          <p>· Activates after 60 seconds of system idle time</p>
          <p>· Never deletes memories — only merges duplicates or adjusts confidence</p>
          <p>· Triggers an MRI rescan after every completed run</p>
          <p>· All changes are reversible via Memory Surgery rollback</p>
        </div>
      </div>
    </div>
  )
}
