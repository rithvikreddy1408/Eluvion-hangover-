import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Scissors, Play, FlaskConical, RotateCcw, CheckCircle2,
  AlertTriangle, ChevronRight, Loader2, Zap,
} from 'lucide-react'
import { getDiagnosis, planSurgery, simulateSurgery, executeSurgery, rollbackSurgery } from '../api/client'

const DISEASE_LABELS = {
  memory_rot: 'Memory Rot', contamination: 'Contamination',
  fragmentation: 'Fragmentation', amnesia: 'Amnesia',
  bias: 'Memory Bias', noise: 'Memory Noise',
}

const sevColor = (s) =>
  s > 0.7 ? 'text-accent-red border-accent-red/30 bg-accent-red/8'
  : s > 0.4 ? 'text-accent-amber border-accent-amber/30 bg-accent-amber/8'
  : 'text-accent-green border-accent-green/30 bg-accent-green/8'

function Step({ n, label, active, done }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-2xs font-semibold font-mono shrink-0
        ${done  ? 'border-accent-green/40 bg-accent-green/10 text-accent-green'
        : active ? 'border-accent-purple/40 bg-accent-purple/10 text-accent-purple'
        : 'border-border-mid text-zinc-400'}`}>
        {done ? '✓' : n}
      </div>
      <span className={`text-xs font-medium ${active || done ? 'text-zinc-900' : 'text-zinc-500'}`}>{label}</span>
    </div>
  )
}

export default function SurgeryPage() {
  const [diseases, setDiseases] = useState([])
  const [selected, setSelected] = useState(null)
  const [plan, setPlan] = useState(null)
  const [simulation, setSimulation] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState('select')
  const [error, setError] = useState(null)

  useEffect(() => {
    getDiagnosis().then(r => setDiseases(r.data.diseases || [])).catch(() => {})
  }, [])

  const handleSelect = (d) => {
    setSelected(d); setPlan(null); setSimulation(null); setResult(null); setStage('plan')
  }
  const handlePlan = async () => {
    setLoading(true); setError(null)
    try { const r = await planSurgery(selected.id); setPlan(r.data); setStage('simulate') }
    catch (e) { setError('Failed to generate plan. Try again.') } finally { setLoading(false) }
  }
  const handleSimulate = async () => {
    setLoading(true); setError(null)
    try { const r = await simulateSurgery(plan.plan_id); setSimulation(r.data) }
    catch (e) { setError('Simulation failed. Try again.') } finally { setLoading(false) }
  }
  const handleExecute = async () => {
    setLoading(true); setError(null)
    try {
      const r = await executeSurgery(plan.plan_id); setResult(r.data); setStage('done')
      const d = await getDiagnosis(); setDiseases(d.data.diseases || [])
    } catch (e) { setError('Surgery execution failed.') } finally { setLoading(false) }
  }
  const handleRollback = async () => {
    if (!result?.snapshot_id) return
    setLoading(true)
    try { await rollbackSurgery(result.snapshot_id); setResult(null); setStage('select'); setSelected(null) }
    catch (e) { console.error(e) } finally { setLoading(false) }
  }
  const reset = () => { setSelected(null); setPlan(null); setSimulation(null); setResult(null); setStage('select') }

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-border-dim bg-bg-secondary flex flex-col shrink-0">
        <div className="px-4 h-11 border-b border-border-dim flex items-center gap-2 shrink-0">
          <Scissors size={13} className="text-zinc-400" />
          <span className="text-xs font-medium text-zinc-900">Surgery</span>
          <span className="ml-auto text-2xs font-mono text-zinc-400">{diseases.length} pathologies</span>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {diseases.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10">
              <CheckCircle2 size={18} className="text-accent-green" />
              <p className="text-xs text-zinc-500">Memory is healthy</p>
            </div>
          ) : diseases.map((d) => (
            <button
              key={d.id}
              onClick={() => handleSelect(d)}
              className={`w-full text-left px-4 py-2.5 border-b border-border-dim hover:bg-bg-hover transition-colors
                ${selected?.id === d.id ? 'bg-accent-purple/5 border-l-2 border-l-accent-purple' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-zinc-900">{DISEASE_LABELS[d.type] || d.type}</span>
                <span className={`text-2xs font-mono px-1.5 py-0.5 rounded border ${sevColor(d.severity)}`}>
                  {(d.severity * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-2xs text-zinc-500 line-clamp-1">{d.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Workspace */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 h-11 border-b border-border-dim flex items-center shrink-0">
          <span className="text-sm font-medium text-zinc-900">
            {selected ? DISEASE_LABELS[selected.type] || selected.type : 'Select a pathology'}
          </span>
          {selected && (
            <span className="ml-2 text-2xs text-zinc-400 font-mono">
              {(selected.severity * 100).toFixed(0)}% severity
            </span>
          )}
        </div>

        {error && (
          <div className="mx-5 mt-3 px-3 py-2 rounded-md border border-accent-red/25 bg-accent-red/8 text-xs text-accent-red">
            {error}
          </div>
        )}

        {stage === 'select' && (
          <div className="flex flex-col items-center justify-center h-[calc(100%-44px)] text-center">
            <Scissors size={28} className="text-zinc-300 mb-3" />
            <p className="text-sm text-zinc-500">Select a pathology from the left to begin</p>
            <p className="text-xs text-zinc-400 mt-1">Plan → Simulate → Execute</p>
          </div>
        )}

        {stage !== 'select' && selected && (
          <div className="p-5 max-w-2xl space-y-4">
            {/* Description */}
            <div className="bg-bg-card border border-border-dim rounded-lg p-4">
              <p className="text-sm text-zinc-700 leading-relaxed mb-3">{selected.description}</p>
              <div className="flex items-start gap-2 bg-bg-secondary border border-border-dim rounded-md px-3 py-2">
                <Zap size={11} className="text-accent-purple mt-0.5 shrink-0" />
                <p className="text-xs text-zinc-700">{selected.suggestion}</p>
              </div>
            </div>

            {/* Step 1 */}
            <div className="bg-bg-card border border-border-dim rounded-lg p-4">
              <Step n="1" label="Generate Repair Plan" active={!plan} done={!!plan} />
              {!plan ? (
                <button onClick={handlePlan} disabled={loading}
                  className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-accent-purple text-white hover:bg-accent-purple/80 disabled:opacity-40 transition-colors">
                  {loading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                  Plan Surgery
                </button>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-2xs text-zinc-500 font-mono mb-2">
                    {plan.operations.length} ops · +{plan.estimated_improvement}pts · {plan.risk_level} risk
                  </p>
                  {plan.operations.map((op) => (
                    <div key={op.op_id} className="flex gap-3 text-xs bg-bg-secondary border border-border-dim rounded-md px-3 py-1.5">
                      <span className="font-mono text-accent-purple text-2xs uppercase shrink-0 mt-0.5">{op.op_type}</span>
                      <span className="text-zinc-600">{op.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2 */}
            {plan && (
              <div className="bg-bg-card border border-border-dim rounded-lg p-4">
                <Step n="2" label="Dry Run Simulation" active={!simulation} done={!!simulation} />
                {!simulation ? (
                  <button onClick={handleSimulate} disabled={loading}
                    className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border border-border-mid text-zinc-600 hover:text-zinc-900 hover:border-border-mid disabled:opacity-40 transition-colors">
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <FlaskConical size={12} />}
                    Run Simulation
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-2xs font-mono">
                      <span className="text-accent-green">+{simulation.predicted_score_change}pts</span>
                      <span className={simulation.safe_to_execute ? 'text-accent-green' : 'text-accent-red'}>
                        {simulation.safe_to_execute ? '✓ safe' : '⚠ high risk'}
                      </span>
                    </div>
                    {simulation.risks.length > 0 && (
                      <div className="border border-accent-amber/25 bg-accent-amber/5 rounded-md p-2.5 space-y-1">
                        {simulation.risks.map((r, i) => (
                          <p key={i} className="text-2xs text-accent-amber">⚠ {r}</p>
                        ))}
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-2xs text-zinc-400 font-mono uppercase mb-1">Diff</p>
                      {simulation.diff.map((d, i) => (
                        <div key={i} className="flex items-start gap-2 text-2xs font-mono bg-bg-secondary border border-border-dim rounded-md px-3 py-1.5">
                          <span className={d.change_type === 'removed' ? 'text-accent-red' : d.change_type === 'added' ? 'text-accent-green' : 'text-accent-amber'}>
                            {d.change_type === 'removed' ? '−' : d.change_type === 'added' ? '+' : '~'}
                          </span>
                          <span className="text-zinc-500">{d.field}:</span>
                          {d.change_type !== 'removed' && d.before != null && (
                            <span className="text-accent-red/70 line-through">{String(d.before).slice(0, 40)}</span>
                          )}
                          <span className="text-accent-green">{String(d.after).slice(0, 40)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3 */}
            {simulation && stage !== 'done' && (
              <div className="bg-bg-card border border-border-dim rounded-lg p-4">
                <Step n="3" label="Execute Surgery" active done={false} />
                <button onClick={handleExecute} disabled={loading || !simulation.safe_to_execute}
                  className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border border-border-mid text-zinc-600 hover:text-accent-green hover:border-accent-green/40 disabled:opacity-40 transition-colors">
                  {loading ? <Loader2 size={12} className="animate-spin" /> : <Scissors size={12} />}
                  {simulation.safe_to_execute ? 'Execute Surgery' : 'Too risky'}
                </button>
              </div>
            )}

            {/* Result */}
            <AnimatePresence>
              {result && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="border border-accent-green/25 bg-accent-green/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={14} className="text-accent-green" />
                    <span className="text-sm font-medium text-accent-green">Surgery Complete</span>
                  </div>
                  <p className="text-xs text-zinc-600 mb-3">{result.message}</p>
                  <div className="flex gap-2">
                    <button onClick={reset} className="text-xs px-3 py-1.5 rounded-md border border-border-dim text-zinc-500 hover:text-zinc-900 transition-colors">
                      New Surgery
                    </button>
                    <button onClick={handleRollback} disabled={loading}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-accent-amber/30 text-accent-amber hover:bg-accent-amber/8 disabled:opacity-40 transition-colors">
                      <RotateCcw size={11} />Rollback
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
