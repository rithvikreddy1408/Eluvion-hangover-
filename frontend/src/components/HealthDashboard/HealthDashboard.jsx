import { Pin, GitBranch, AlertTriangle, Database, Link2, Activity } from 'lucide-react'
import MetricCard from './MetricCard'

const GRADE = {
  A: { color: '#16a34a', label: 'Excellent' },
  B: { color: '#16a34a', label: 'Good'      },
  C: { color: '#d97706', label: 'Fair'      },
  D: { color: '#ea580c', label: 'Poor'      },
  F: { color: '#dc2626', label: 'Critical'  },
}

function Stat({ label, value, sub }) {
  return (
    <div>
      <div className="text-xl font-semibold font-mono text-zinc-900 tabular-nums">{value}</div>
      <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
      {sub && <div className="text-2xs text-zinc-400 font-mono mt-0.5">{sub}</div>}
    </div>
  )
}

export default function HealthDashboard({ health }) {
  if (!health) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-24 bg-bg-card rounded-lg border border-border-dim" />
        <div className="h-40 bg-bg-card rounded-lg border border-border-dim" />
      </div>
    )
  }

  const cfg = GRADE[health.grade] || GRADE.C

  return (
    <div className="space-y-4">
      {/* Score summary */}
      <div className="flex items-center gap-8 py-4 border-b border-border-dim">
        {/* Grade + score */}
        <div className="flex items-baseline gap-3">
          <span className="text-5xl font-bold font-mono tabular-nums" style={{ color: cfg.color }}>
            {Math.round(health.overall_score)}
          </span>
          <div>
            <div className="text-2xs text-zinc-400 uppercase tracking-wider font-medium mb-1">Health Score</div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: cfg.color }}>Grade {health.grade}</span>
              <span className="text-xs text-zinc-500">— {cfg.label}</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-12 w-px bg-border-dim" />

        {/* Stats row */}
        <div className="flex items-center gap-8">
          <Stat label="Nodes" value={health.total_nodes} />
          <Stat label="Edges" value={health.total_edges} />
          {health.avg_retrieval_count != null && (
            <Stat label="Avg Recalls" value={health.avg_retrieval_count?.toFixed(1)} />
          )}
          {health.avg_importance != null && (
            <Stat label="Avg Importance" value={health.avg_importance?.toFixed(2)} />
          )}
        </div>

        {/* Flags */}
        <div className="ml-auto flex items-center gap-3 text-2xs font-mono">
          {health.pinned_count > 0 && (
            <span className="flex items-center gap-1 text-zinc-500">
              <Pin size={10} />{health.pinned_count} pinned
            </span>
          )}
          {health.orphan_nodes > 0 && (
            <span className="flex items-center gap-1 text-accent-amber">
              <GitBranch size={10} />{health.orphan_nodes} orphan{health.orphan_nodes !== 1 ? 's' : ''}
            </span>
          )}
          {health.contradiction_count > 0 && (
            <span className="flex items-center gap-1 text-accent-red">
              <AlertTriangle size={10} />{health.contradiction_count} conflict{health.contradiction_count !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Metrics table */}
      <div>
        <div className="text-2xs text-zinc-400 uppercase tracking-wider font-medium mb-3">Diagnostics</div>
        <table className="w-full data-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Score</th>
              <th>Status</th>
              <th className="hidden xl:table-cell">Description</th>
            </tr>
          </thead>
          <tbody>
            <MetricCard label="Freshness"          value={health.freshness}           metricKey="freshness"           description="How recent are retrieved memories?" />
            <MetricCard label="Consistency"        value={health.consistency}         metricKey="consistency"         description="Absence of contradicting edges." />
            <MetricCard label="Graph Connectivity" value={health.graph_connectivity}  metricKey="graph_connectivity"  description="How well-connected is the knowledge graph?" />
            <MetricCard label="Contradiction"      value={health.contradiction_score} metricKey="contradiction_score" description="Percentage of memories in direct conflict." />
            <MetricCard label="Hallucination Risk" value={health.hallucination_risk}  metricKey="hallucination_risk"  description="Estimated recall error probability." />
          </tbody>
        </table>
      </div>
    </div>
  )
}
