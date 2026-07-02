import { NavLink } from 'react-router-dom'
import {
  Brain, MessageSquare, Share2, Activity, Scissors,
  Dna, Compass, Cloud, HardDrive, AlertTriangle,
} from 'lucide-react'
import { useStatus } from '../../hooks/useStatus'

const NAV = [
  { to: '/',          icon: MessageSquare, label: 'Chat',      desc: 'Probe memory' },
  { to: '/graph',     icon: Share2,        label: 'Graph',     desc: 'Knowledge map' },
  { to: '/health',    icon: Activity,      label: 'Health',    desc: 'MRI & diagnosis' },
  { to: '/surgery',   icon: Scissors,      label: 'Surgery',   desc: 'Repair pathologies' },
  { to: '/evolution', icon: Dna,           label: 'Evolution', desc: 'Auto-optimization' },
  { to: '/explorer',  icon: Compass,       label: 'Explorer',  desc: 'Browse memories' },
]

const GRADE_COLOR = { A: '#16a34a', B: '#16a34a', C: '#d97706', D: '#ea580c', F: '#dc2626' }

export default function Sidebar() {
  const status = useStatus()
  const healthScore = status?.health_score ?? null
  const grade = status?.health_grade ?? null
  const gradeColor = grade ? GRADE_COLOR[grade] ?? '#71717a' : '#71717a'

  return (
    <aside className="w-14 lg:w-56 flex flex-col bg-bg-card border-r border-border-dim shrink-0 h-screen">
      {/* Logo */}
      <div className="px-3 lg:px-4 h-11 flex items-center gap-2.5 border-b border-border-dim shrink-0">
        <div className="w-6 h-6 rounded-md bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center shrink-0">
          <Brain size={12} className="text-accent-purple" />
        </div>
        <div className="hidden lg:flex items-baseline gap-2 min-w-0">
          <span className="text-sm font-semibold text-zinc-900 tracking-tight">Eluvion</span>
          <span className="text-2xs text-zinc-400 font-mono">v2.1</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-0.5">
        {NAV.map(({ to, icon: Icon, label, desc }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2 py-2 rounded-md transition-colors group
               ${isActive
                 ? 'bg-accent-purple/8 text-accent-purple'
                 : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
               }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={15} className={`shrink-0 ${isActive ? 'text-accent-purple' : ''}`} />
                <div className="hidden lg:block min-w-0">
                  <div className="text-sm leading-none font-medium">{label}</div>
                  <div className="text-2xs text-zinc-400 mt-0.5 leading-none group-hover:text-zinc-500 transition-colors">{desc}</div>
                </div>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Status footer */}
      <div className="hidden lg:block border-t border-border-dim px-4 py-3 space-y-3">
        {/* Backend */}
        {status && (
          <div className="flex items-center gap-2">
            {status.memory_backend?.includes('cloud')
              ? <Cloud size={11} className="text-zinc-400 shrink-0" />
              : <HardDrive size={11} className="text-zinc-400 shrink-0" />
            }
            <span className="text-2xs text-zinc-400 font-mono truncate">
              {status.memory_backend === 'cognee-cloud' ? 'Cognee Cloud'
                : status.memory_backend === 'cognee-local' ? 'Cognee Local'
                : 'Local store'}
            </span>
            <span className={`ml-auto w-1.5 h-1.5 rounded-full shrink-0 ${
              status.memory_backend?.includes('cognee') ? 'bg-accent-green' : 'bg-zinc-300'
            }`} />
          </div>
        )}

        {/* Health */}
        {healthScore != null && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-2xs text-zinc-400 uppercase tracking-wider font-medium">Memory Health</span>
              <span className="text-2xs font-mono font-semibold" style={{ color: gradeColor }}>
                {grade} · {Math.round(healthScore)}
              </span>
            </div>
            <div className="h-px w-full bg-border-dim overflow-hidden">
              <div
                className="h-full transition-all duration-700"
                style={{ width: `${healthScore}%`, backgroundColor: gradeColor }}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        {status && (
          <div className="flex items-center justify-between text-2xs font-mono text-zinc-400">
            <span>{status.node_count ?? 0}n · {status.edge_count ?? 0}e</span>
            {status.pending_contradictions > 0 && (
              <span className="flex items-center gap-1 text-accent-amber">
                <AlertTriangle size={9} />
                {status.pending_contradictions}
              </span>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
