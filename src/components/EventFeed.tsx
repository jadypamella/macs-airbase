import { useState, useEffect, useRef, useMemo } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { EventRow } from './EventRow'
import { MAC_NAMES, SEVERITY_COLORS } from '../constants'
import { useLang } from '@/hooks/useLang'
import type { SwarmEvent } from '../constants'

interface EventFeedProps {
  events: SwarmEvent[]
  onEventClick?: (event: SwarmEvent) => void
  expandedEventId?: string | null
}

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']
const AGENT_IDS = ['OPS', 'FUEL', 'ARMING', 'MAINT', 'THREAT']

export function EventFeed({ events, onEventClick, expandedEventId }: EventFeedProps) {
  const { lang } = useLang()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [activeSeverities, setActiveSeverities] = useState<Set<string>>(new Set())
  const [activeAgents, setActiveAgents] = useState<Set<string>>(new Set())
  const [activeAircraft, setActiveAircraft] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [events.length])

  const toggleSeverity = (sev: string) => {
    setActiveSeverities(prev => {
      const next = new Set(prev)
      if (next.has(sev)) next.delete(sev)
      else next.add(sev)
      return next
    })
  }

  const toggleAgent = (id: string) => {
    setActiveAgents(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAircraft = (id: string) => {
    setActiveAircraft(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Extract aircraft IDs mentioned in events (normalize to Gripen-XX format)
  const aircraftIds = useMemo(() => {
    const ids = new Set<string>()
    for (const e of events) {
      const msg = e.payload?.message || ''
      const matches = msg.match(/Gripen-\d+/gi)
      if (matches) matches.forEach((m: string) => {
        // Normalize: capitalize first letter
        const normalized = m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()
        ids.add(normalized.replace('ripen', 'ripen'))
      })
    }
    return Array.from(ids).sort()
  }, [events])

  // Count events per aircraft
  const aircraftCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of events) {
      const msg = e.payload?.message || ''
      const matches = msg.match(/Gripen-\d+/gi)
      if (matches) matches.forEach((m: string) => { counts[m] = (counts[m] || 0) + 1 })
    }
    return counts
  }, [events])

  const filtered = events.filter(e => {
    if (activeSeverities.size > 0 && !activeSeverities.has(e.severity)) return false
    if (activeAgents.size > 0 && !activeAgents.has(e.source) && e.source !== 'SYSTEM') return false
    if (activeAircraft.size > 0) {
      const msg = (e.payload?.message || '').toLowerCase()
      const found = Array.from(activeAircraft).some(acId => msg.includes(acId.toLowerCase()))
      if (!found) return false
    }
    if (search) {
      const q = search.toLowerCase()
      const msg = (e.payload?.message || '').toLowerCase()
      const src = (e.source || '').toLowerCase()
      const type = (e.event_type || '').toLowerCase()
      if (!msg.includes(q) && !src.includes(q) && !type.includes(q)) return false
    }
    return true
  })

  // Count severities and agents for badges
  const sevCounts: Record<string, number> = {}
  const agentCounts: Record<string, number> = {}
  for (const e of events) {
    if (e.severity) sevCounts[e.severity] = (sevCounts[e.severity] || 0) + 1
    if (e.source && e.source !== 'SYSTEM') agentCounts[e.source] = (agentCounts[e.source] || 0) + 1
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-white/5">
        <div className="text-[10px] font-bold tracking-[0.2em] text-text-muted uppercase">
          {lang === 'sv' ? 'ANSLAGSTAVLA — DIREKTSÄNDNING' : 'BULLETIN BOARD — LIVE FEED'}
        </div>
      </div>

      {/* Filter row: Aircraft */}
      {aircraftIds.length > 0 && (
        <div className="px-3 py-1.5 border-b border-white/5 flex items-center gap-1.5 flex-wrap">
          {aircraftIds.map(acId => {
            const isActive = activeAircraft.has(acId)
            return (
              <button
                key={acId}
                onClick={() => toggleAircraft(acId)}
                className={`flex items-center gap-1 px-1.5 py-0.5 border transition-all ${
                  isActive
                    ? 'border-status-green/60 bg-status-green/15'
                    : 'border-white/5 bg-transparent hover:border-white/15'
                }`}
              >
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3L11 7L11 9L4 13L4 15L11 13L11 17L8 19L8 21L12 19.5L16 21L16 19L13 17L13 13L20 15L20 13L13 9L13 7L12 3Z"
                    fill={isActive ? '#a3e635' : '#64748b'}
                  />
                </svg>
                <span className="text-[8px] font-bold text-text-dim">{acId.replace('Gripen-', 'G')}</span>
                <span className="text-[8px] text-text-dim">{aircraftCounts[acId] || 0}</span>
              </button>
            )
          })}
        </div>
      )}
      {/* Filter row: Agent icons */}
      <div className="px-3 py-1.5 border-b border-white/5 flex items-center gap-1.5 flex-wrap">
        {AGENT_IDS.map(id => {
          const mac = MAC_NAMES[id]
          const isActive = activeAgents.has(id)
          return (
            <button
              key={id}
              onClick={() => toggleAgent(id)}
              className={`flex items-center gap-1 px-1.5 py-0.5 border transition-all ${
                isActive
                  ? 'border-cyan-500/60 bg-cyan-500/15'
                  : 'border-white/5 bg-transparent hover:border-white/15'
              }`}
              title={lang === 'sv' ? mac.nameSv : mac.name}
            >
              <mac.Icon className="w-3 h-3" style={{ color: mac.color }} />
              <span className="text-[9px] font-bold text-text-dim">
                {agentCounts[id] || 0}
              </span>
            </button>
          )
        })}
      </div>

      {/* Filter row: Severity dots */}
      <div className="px-3 py-1.5 border-b border-white/5 flex items-center gap-2">
        {SEVERITY_ORDER.map(sev => {
          const count = sevCounts[sev] || 0
          const isActive = activeSeverities.has(sev)
          return (
            <button
              key={sev}
              onClick={() => toggleSeverity(sev)}
              className={`flex items-center gap-1 px-1.5 py-0.5 border transition-all ${
                isActive
                  ? 'border-white/20 bg-white/5'
                  : 'border-transparent hover:border-white/10'
              }`}
              title={sev}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: SEVERITY_COLORS[sev],
                  opacity: isActive || activeSeverities.size === 0 ? 1 : 0.3,
                }}
              />
              <span className="text-[9px] font-bold text-text-dim">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="px-3 py-1.5 border-b border-white/5">
        <div className="flex items-center gap-1.5 bg-surface-primary/50 border border-white/5 px-2 py-1">
          <MagnifyingGlassIcon className="w-3.5 h-3.5 text-text-dim" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === 'sv' ? 'Sök händelser...' : 'Search events...'}
            className="bg-transparent text-[10px] text-text-primary placeholder:text-text-dim outline-none w-full font-mono"
          />
        </div>
      </div>

      {/* Event list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-8 text-center text-[10px] text-text-dim">
            {lang === 'sv' ? 'Väntar på MACS-aktivitet...' : 'Waiting for MACS activity...'}
          </div>
        ) : (
          [...filtered].reverse().slice(0, 80).map(event => (
            <EventRow key={event.id} event={event} onClick={onEventClick} />
          ))
        )}
      </div>
    </div>
  )
}
