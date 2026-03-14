import { useState, useEffect, useCallback } from 'react'
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
  const [now, setNow] = useState(Date.now())
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [paused])

  const startEvent = events.find(e => e.event_type === 'SCENARIO_START')
  const startTime = startEvent?.timestamp || 0
  const elapsed = startTime ? Math.round(now / 1000 - startTime) : 0
  const maxDuration = 600
  const pct = Math.min((elapsed / maxDuration) * 100, 100)

  // Format clock time
  const clockTime = new Date(now).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  // Event dots on timeline
  const eventDots = events
    .filter(e => e.severity === 'CRITICAL' || e.severity === 'HIGH')
    .map(e => {
      const evtElapsed = startTime ? e.timestamp - startTime : 0
      const evtPct = Math.min((evtElapsed / maxDuration) * 100, 100)
      return { id: e.id, pct: evtPct, severity: e.severity }
    })
    .filter(d => d.pct >= 0 && d.pct <= 100)

  return (
    <div className="h-[32px] bg-surface-primary border-t border-white/5 flex items-center px-3 gap-3 shrink-0">
      {/* Play/Pause */}
      <button
        onClick={() => setPaused(p => !p)}
        className="text-text-muted hover:text-text-primary transition-colors"
      >
        {paused ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <polygon points="2,0 12,6 2,12" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect x="1" y="0" width="3.5" height="12" />
            <rect x="7.5" y="0" width="3.5" height="12" />
          </svg>
        )}
      </button>

      {/* Timeline track */}
      <div className="flex-1 relative h-2 group cursor-pointer">
        {/* Background track */}
        <div className="absolute inset-0 rounded-full" style={{ background: 'hsl(215 40% 12%)' }} />

        {/* Progress fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(190 95% 50%))',
          }}
        />

        {/* Critical/High event markers */}
        {eventDots.map(d => (
          <div
            key={d.id}
            className="absolute top-1/2 -translate-y-1/2 w-1 h-3 rounded-full"
            style={{
              left: `${d.pct}%`,
              backgroundColor: d.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
              opacity: 0.7,
            }}
          />
        ))}

        {/* Scrubber dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 transition-all duration-1000"
          style={{
            left: `${pct}%`,
            transform: `translate(-50%, -50%)`,
            backgroundColor: 'hsl(190 95% 50%)',
            borderColor: 'hsl(215 40% 8%)',
            boxShadow: '0 0 6px hsl(190 95% 50% / 0.5)',
          }}
        />
      </div>

      {/* Clock + LIVE */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-text-muted">
          {clockTime}
        </span>
        <div className="flex items-center gap-1">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: paused ? '#f59e0b' : '#22c55e',
              boxShadow: paused ? 'none' : '0 0 4px #22c55e',
            }}
          />
          <span className="text-[9px] font-bold tracking-wider" style={{ color: paused ? '#f59e0b' : '#22c55e' }}>
            {paused ? (lang === 'sv' ? 'PAUSAD' : 'PAUSED') : 'LIVE'}
          </span>
        </div>
      </div>
    </div>
  )
}
