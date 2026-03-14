import { MacCard } from './MacCard'
import { SEVERITY_COLORS, SEVERITY_LABELS_SV } from '../constants'
import { useLang } from '@/hooks/useLang'
import type { AgentState, SwarmEvent } from '../constants'

const SEVERITY_LABELS_EN: Record<string, string> = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  AMBER: 'AMBER',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO',
}

interface MacSidebarProps {
  agents: Record<string, AgentState>
  events: SwarmEvent[]
  onKill?: (agentId: string) => void
  onRevive?: (agentId: string) => void
}

const AGENT_IDS = ['OPS', 'FUEL', 'ARMING', 'MAINT', 'THREAT']

export function MacSidebar({ agents, events, onKill, onRevive }: MacSidebarProps) {
  const { lang } = useLang()
  const severityCounts: Record<string, number> = {}
  for (const e of events) {
    if (e.severity) {
      severityCounts[e.severity] = (severityCounts[e.severity] || 0) + 1
    }
  }

  return (
    <aside className="w-[220px] bg-surface-card border-r border-white/5 flex flex-col shrink-0 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/5">
        <div className="text-[10px] font-bold tracking-[0.2em] text-text-muted uppercase">
          {lang === 'sv' ? 'MAC NODER' : 'MAC NODES'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {AGENT_IDS.map(id => (
          <MacCard key={id} agentId={id} agent={agents[id]} onKill={onKill} onRevive={onRevive} />
        ))}
      </div>

      <div className="px-3 py-2 border-t border-white/5">
        <div className="text-[9px] font-bold tracking-[0.15em] text-text-muted uppercase mb-1.5">
          {lang === 'sv' ? 'ALLVAR' : 'SEVERITY'}
        </div>
        <div className="space-y-1">
          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map(sev => {
            const count = severityCounts[sev] || 0
            if (count === 0) return null
            const labels = lang === 'sv' ? SEVERITY_LABELS_SV : SEVERITY_LABELS_EN
            return (
              <div key={sev} className="flex items-center justify-between text-[10px]">
                <span className="font-bold tracking-wider" style={{ color: SEVERITY_COLORS[sev] }}>
                  {labels[sev] || sev}
                </span>
                <span className="text-text-dim">{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
