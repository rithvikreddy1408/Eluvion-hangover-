import { AnimatePresence } from 'framer-motion'
import { CheckCircle, Loader2 } from 'lucide-react'
import DiagnosisCard from './DiagnosisCard'

export default function DiagnosisPanel({ diagnosis, onRepair, loading }) {
  if (!diagnosis) {
    return (
      <div className="flex items-center gap-2 py-8 text-zinc-400 text-sm">
        <Loader2 size={14} className="animate-spin" />
        Running diagnosis…
      </div>
    )
  }

  if (diagnosis.total_diseases === 0) {
    return (
      <div className="flex items-center gap-2.5 py-8 text-accent-green">
        <CheckCircle size={16} />
        <span className="text-sm">No pathologies detected — memory is healthy</span>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
        <span>{diagnosis.total_diseases} patholog{diagnosis.total_diseases === 1 ? 'y' : 'ies'} detected</span>
        {diagnosis.most_critical && (
          <span className="font-mono text-accent-red">
            critical: {diagnosis.most_critical.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {diagnosis.summary && (
        <p className="text-xs text-zinc-500 italic border-l-2 border-accent-purple/25 pl-3 pb-1">
          {diagnosis.summary}
        </p>
      )}

      <AnimatePresence>
        {diagnosis.diseases.map((d) => (
          <DiagnosisCard key={d.id} disease={d} onRepair={onRepair} />
        ))}
      </AnimatePresence>
    </div>
  )
}
