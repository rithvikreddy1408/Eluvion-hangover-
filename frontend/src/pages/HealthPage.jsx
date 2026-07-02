import { useEffect, useState } from 'react'
import { RefreshCw, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import HealthDashboard from '../components/HealthDashboard/HealthDashboard'
import DiagnosisPanel from '../components/DiagnosisPanel/DiagnosisPanel'
import TimelineViewer from '../components/TimelineViewer/TimelineViewer'
import { useMemory } from '../hooks/useMemory'

export default function HealthPage() {
  const { health, diagnosis, timeline, loading, refresh, repair } = useMemory()
  const [repairMsg, setRepairMsg] = useState(null)

  useEffect(() => { refresh() }, [refresh])

  const handleRepair = async (diseaseId, action) => {
    const result = await repair(diseaseId, action)
    setRepairMsg(result.message)
    setTimeout(() => setRepairMsg(null), 3000)
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        {/* Page header */}
        <div className="px-6 h-11 border-b border-border-dim flex items-center justify-between shrink-0 sticky top-0 bg-bg-primary z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-medium text-zinc-900">Memory Health</h1>
            <span className="text-2xs text-zinc-400 font-mono">/ MRI Scan</span>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 border border-border-dim hover:border-border-mid rounded-md px-3 py-1.5 transition-colors"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 max-w-4xl">
          <HealthDashboard health={health} />

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Pathology Report</h2>
              {diagnosis?.total_diseases > 0 && (
                <span className="text-2xs font-mono text-accent-red">
                  {diagnosis.total_diseases} issue{diagnosis.total_diseases !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <DiagnosisPanel diagnosis={diagnosis} onRepair={handleRepair} loading={loading} />
          </div>
        </div>
      </div>

      {/* Timeline sidebar */}
      <div className="w-64 border-l border-border-dim bg-bg-secondary flex flex-col shrink-0">
        <div className="px-4 h-11 border-b border-border-dim flex items-center justify-between shrink-0">
          <span className="text-xs font-medium text-zinc-700">Timeline</span>
          <span className="text-2xs font-mono text-zinc-400">{timeline.length} events</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <TimelineViewer events={timeline} />
        </div>
      </div>

      {/* Repair toast */}
      <AnimatePresence>
        {repairMsg && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-bg-card border border-accent-green/30 text-accent-green rounded-lg px-4 py-2.5 text-sm shadow-md"
          >
            <CheckCircle2 size={14} />
            {repairMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
