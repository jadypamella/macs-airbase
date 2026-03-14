import { useLang } from '@/hooks/useLang'
import type { SwarmEvent } from '../constants'

const SCENARIO_NAMES: Record<string, { sv: string; en: string }> = {
  surge: { sv: 'Uppdragssurge', en: 'Sortie Surge' },
  scramble: { sv: 'Beredskapsstart', en: 'CAP Scramble' },
  disperse: { sv: 'Nödspridning', en: 'Base Dispersal' },
}

interface TimelineBarProps {
  events: SwarmEvent[]
  scenario: string | null
}

export function TimelineBar({ events, scenario }: TimelineBarProps) {
  const { lang } = useLang()
  const startEvent = events.find(e => e.event_type === 'SCENARIO_START')
  const startTime = startEvent?.timestamp || 0
  const elapsed = startTime ? Math.round(Date.now() / 1000 - startTime) : 0
  const maxDuration = 600
  const pct = Math.min((elapsed / maxDuration) * 100, 100)
  const barColor = pct > 75 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#3b82f6'

  return (
    <div className="h-[40px] bg-surface-primary border-t border-white/5 flex items-center px-4 gap-4 shrink-0">
      <span className="text-[9px] font-bold tracking-[0.15em] text-text-muted uppercase">
        {lang === 'sv' ? 'TIDSLINJE' : 'TIMELINE'}
      </span>
      <div className="flex-1 h-1.5 bg-surface-card overflow-hidden">
        <div className="h-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>
      <span className="text-[10px] font-mono text-text-muted">
        T+{elapsed}s / {scenario ? (SCENARIO_NAMES[scenario]?.[lang] || scenario) : '--'}
      </span>
    </div>
  )
}
