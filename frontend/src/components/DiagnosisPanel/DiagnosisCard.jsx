import { motion } from 'framer-motion'
import { AlertTriangle, Zap, Bug, EyeOff, Scale, Radio, Waves } from 'lucide-react'

const DISEASE_META = {
  memory_rot:    { icon: AlertTriangle, color: 'text-accent-amber',  border: 'border-l-accent-amber',  label: 'Memory Rot'     },
  contamination: { icon: Bug,           color: 'text-accent-red',    border: 'border-l-accent-red',    label: 'Contamination' },
  fragmentation: { icon: Radio,         color: 'text-zinc-500',      border: 'border-l-zinc-400',      label: 'Fragmentation' },
  amnesia:       { icon: EyeOff,        color: 'text-accent-blue',   border: 'border-l-accent-blue',   label: 'Amnesia'       },
  bias:          { icon: Scale,         color: 'text-purple-600',    border: 'border-l-purple-500',    label: 'Memory Bias'   },
  noise:         { icon: Waves,         color: 'text-zinc-500',      border: 'border-l-zinc-400',      label: 'Memory Noise'  },
}

const SEV_COLOR = (s) =>
  s > 0.7 ? 'bg-accent-red' : s > 0.4 ? 'bg-accent-amber' : 'bg-accent-green'

export default function DiagnosisCard({ disease, onRepair }) {
  const meta = DISEASE_META[disease.type] || DISEASE_META.contamination
  const Icon = meta.icon
  const sevPct = disease.severity * 100

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      className={`border border-border-dim border-l-2 ${meta.border} rounded-lg bg-bg-card overflow-hidden`}
    >
      <div className="px-4 py-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <Icon size={14} className={`${meta.color} shrink-0`} />
          <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
          <div className="ml-auto flex items-center gap-3 text-2xs font-mono text-zinc-500">
            <span>{sevPct.toFixed(0)}% severity</span>
            <span>{(disease.confidence * 100).toFixed(0)}% conf.</span>
          </div>
        </div>

        {/* Severity bar */}
        <div className="h-px w-full bg-border-dim mb-3">
          <div className={`h-full ${SEV_COLOR(disease.severity)} transition-all duration-500`} style={{ width: `${sevPct}%` }} />
        </div>

        <p className="text-xs text-zinc-600 leading-relaxed mb-3">{disease.description}</p>

        {/* Suggestion */}
        <div className="flex items-start gap-2 bg-bg-secondary border border-border-dim rounded-md px-3 py-2 mb-3">
          <Zap size={11} className="text-accent-purple mt-0.5 shrink-0" />
          <p className="text-xs text-zinc-700 leading-snug">{disease.suggestion}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {disease.repair_actions.map((action) => (
            <button
              key={action}
              onClick={() => onRepair(disease.id, action)}
              className="text-2xs px-2.5 py-1 rounded-md bg-bg-secondary border border-border-dim text-zinc-500 hover:text-zinc-900 hover:border-border-mid transition-colors font-mono"
            >
              {action.replace(/_/g, ' ')}
            </button>
          ))}
          <button
            onClick={() => onRepair(disease.id, 'apply_suggested')}
            className="text-2xs px-2.5 py-1 rounded-md bg-accent-purple/10 border border-accent-purple/25 text-accent-purple hover:bg-accent-purple/15 transition-colors font-mono"
          >
            auto repair
          </button>
        </div>
      </div>
    </motion.div>
  )
}
