import { XMarkIcon, ChartBarIcon } from '@heroicons/react/24/solid'
import { MAC_NAMES, SEVERITY_COLORS } from '@/constants'
import { useLang } from '@/hooks/useLang'
import type { SummaryData } from '@/hooks/useSummary'

interface Props {
  summary: SummaryData
  onClose: () => void
}

const MODE_COLORS: Record<string, string> = {
  gemini: '#a78bfa',
  claude: '#f97316',
  openrouter: '#22d3ee',
  mock: '#6b7280',
}

export function SummaryDashboard({ summary, onClose }: Props) {
  const { lang } = useLang()

  const domainEntries = Object.entries(summary.domains)
  const agentEntries = Object.entries(summary.agents)
  const sevEntries = Object.entries(summary.severity_5min).filter(([, v]) => v > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-[90vw] max-w-[800px] max-h-[85vh] bg-surface-card border border-white/10 flex flex-col animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <ChartBarIcon className="w-5 h-5 text-cyan-400" />
          <div className="flex-1">
            <div className="text-xs font-bold tracking-[0.15em] text-text-primary uppercase">
              {lang === 'sv' ? 'ÖVERSIKTSDASHBOARD' : 'SUMMARY DASHBOARD'}
            </div>
            <div className="text-[10px] text-text-muted">
              {summary.overall.total_events} {lang === 'sv' ? 'händelser totalt' : 'total events'}
              {summary.missions && <span className="ml-3">{summary.missions.active} {lang === 'sv' ? 'aktiva uppdrag' : 'active missions'}</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 transition-colors">
            <XMarkIcon className="w-4 h-4 text-text-dim" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Severity 5-min breakdown */}
          {sevEntries.length > 0 && (
            <div>
              <div className="text-[9px] font-bold tracking-[0.15em] text-text-muted uppercase mb-2">
                {lang === 'sv' ? 'ALLVARLIGHET (5 MIN)' : 'SEVERITY (5 MIN)'}
              </div>
              <div className="flex gap-3">
                {sevEntries.map(([sev, count]) => (
                  <div key={sev} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[sev] }} />
                    <span className="text-[10px] font-bold" style={{ color: SEVERITY_COLORS[sev] }}>{sev}</span>
                    <span className="text-[10px] text-text-dim">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agent status cards */}
          <div>
            <div className="text-[9px] font-bold tracking-[0.15em] text-text-muted uppercase mb-2">
              {lang === 'sv' ? 'AGENTSTATUS' : 'AGENT STATUS'}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {agentEntries.map(([id, agent]) => {
                const mac = MAC_NAMES[id]
                if (!mac) return null
                return (
                  <div key={id} className={`p-2 border border-white/10 ${agent.alive ? '' : 'opacity-50'}`}
                    style={{ borderLeftWidth: 3, borderLeftColor: mac.color }}>
                    <div className="flex items-center gap-1 mb-1">
                      <mac.Icon className="w-3 h-3" style={{ color: mac.color }} />
                      <span className="text-[9px] font-bold tracking-wider text-text-primary">{id}</span>
                    </div>
                    {/* Mode badge */}
                    <div className="flex items-center gap-1 mb-1">
                      <span
                        className="text-[7px] font-bold tracking-wider px-1.5 py-0.5 uppercase"
                        style={{
                          color: MODE_COLORS[agent.mode] || '#6b7280',
                          background: `${MODE_COLORS[agent.mode] || '#6b7280'}20`,
                          border: `1px solid ${MODE_COLORS[agent.mode] || '#6b7280'}40`,
                        }}
                      >
                        {agent.mode || '?'}
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full ${agent.alive ? 'bg-status-green' : 'bg-status-red'}`} />
                    </div>
                    <div className="text-[8px] text-text-dim">
                      {agent.seconds_since_action < 60
                        ? `${Math.round(agent.seconds_since_action)}s ago`
                        : `${Math.round(agent.seconds_since_action / 60)}m ago`
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Domain activity */}
          <div>
            <div className="text-[9px] font-bold tracking-[0.15em] text-text-muted uppercase mb-2">
              {lang === 'sv' ? 'DOMÄNAKTIVITET' : 'DOMAIN ACTIVITY'}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {domainEntries.map(([name, domain]) => (
                <div key={name} className="p-2 border border-white/10 bg-surface-primary/40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold tracking-wider text-text-primary">{name}</span>
                    <span className="text-[9px] text-text-dim">{domain.total_events} total</span>
                  </div>
                  <div className="flex items-center gap-3 text-[9px]">
                    <span className="text-text-muted">5m: <span className="text-text-primary font-bold">{domain.events_5min}</span></span>
                    <span className="text-text-muted">30m: <span className="text-text-primary font-bold">{domain.events_30min}</span></span>
                    {domain.compensations > 0 && (
                      <span className="text-status-amber font-bold">{domain.compensations} COMP</span>
                    )}
                  </div>
                  {/* Mini activity bar */}
                  <div className="w-full h-1 bg-surface-primary mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-cyan-500/60 transition-all duration-1000"
                      style={{ width: `${Math.min((domain.events_5min / Math.max(domain.events_30min, 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active missions */}
          {summary.missions && summary.missions.list.length > 0 && (
            <div>
              <div className="text-[9px] font-bold tracking-[0.15em] text-text-muted uppercase mb-2">
                {lang === 'sv' ? 'AKTIVA UPPDRAG' : 'ACTIVE MISSIONS'}
              </div>
              <div className="space-y-1.5">
                {summary.missions.list.map(m => (
                  <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 border border-white/5 bg-surface-primary/40">
                    <span className="text-[9px] font-mono text-text-dim">{m.id}</span>
                    <span className="text-[10px] text-text-primary font-bold flex-1 truncate">{m.name}</span>
                    <span
                      className="text-[8px] font-bold tracking-wider px-1 py-px"
                      style={{ color: SEVERITY_COLORS[m.priority] || '#64748b', background: `${SEVERITY_COLORS[m.priority] || '#64748b'}18` }}
                    >
                      {m.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
