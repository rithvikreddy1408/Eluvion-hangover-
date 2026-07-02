// Used as a table row inside HealthDashboard — not a standalone card.
const thresholds = {
  freshness:           { good: 80, warn: 60 },
  consistency:         { good: 80, warn: 60 },
  graph_connectivity:  { good: 40, warn: 20 },
  contradiction_score: { good: 20, warn: 40, invert: true },
  hallucination_risk:  { good: 20, warn: 50, invert: true },
}

function getStatus(key, value) {
  const t = thresholds[key] || { good: 70, warn: 50 }
  if (t.invert) return value <= t.good ? 'good' : value <= t.warn ? 'warn' : 'bad'
  return value >= t.good ? 'good' : value >= t.warn ? 'warn' : 'bad'
}

const STATUS = {
  good: { dot: 'bg-accent-green', text: 'text-accent-green', bar: 'bg-accent-green', label: 'Good'     },
  warn: { dot: 'bg-accent-amber', text: 'text-accent-amber', bar: 'bg-accent-amber', label: 'Fair'     },
  bad:  { dot: 'bg-accent-red',   text: 'text-accent-red',   bar: 'bg-accent-red',   label: 'Critical' },
}

export default function MetricCard({ label, value, metricKey, description }) {
  const status = getStatus(metricKey, value)
  const cfg = STATUS[status]
  const pct = Math.min(100, typeof value === 'number' ? value : 0)

  return (
    <tr className="group">
      <td className="py-2.5 pr-4 text-zinc-700 whitespace-nowrap">{label}</td>
      <td className="py-2.5 pr-4 w-40">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-border-dim rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-xs font-mono font-medium w-10 text-right ${cfg.text}`}>
            {typeof value === 'number' ? value.toFixed(1) : '—'}
          </span>
        </div>
      </td>
      <td className="py-2.5 pr-4">
        <span className={`inline-flex items-center gap-1.5 text-2xs font-medium ${cfg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </td>
      <td className="py-2.5 text-2xs text-zinc-400 leading-snug hidden xl:table-cell">{description}</td>
    </tr>
  )
}
