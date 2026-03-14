import { useEffect, useRef } from 'react'
import { EventRow } from './EventRow'
import { MAC_NAMES } from '../constants'
import { useLang } from '@/hooks/useLang'
import type { SwarmEvent } from '../constants'

interface EventFeedProps {
  events: SwarmEvent[]
}

export function EventFeed({ events }: EventFeedProps) {
  const { lang } = useLang()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events.length])

  const domainCounts: Record<string, number> = {}
  for (const e of events) {
    if (e.source && e.source !== 'SYSTEM') {
      domainCounts[e.source] = (domainCounts[e.source] || 0) + 1
    }
  }

  const recentActions = events
    .filter(e => e.event_type === 'ACTION_TAKEN')
    .slice(-8)

  return (
    <aside className="w-[280px] bg-surface-card border-l border-white/5 flex flex-col shrink-0 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/5">
        <div className="text-[10px] font-bold tracking-[0.2em] text-text-muted uppercase">
          {lang === 'sv' ? 'ANSLAGSTAVLA' : 'BULLETIN BOARD'}
        </div>
      </div>

      <div className="px-3 py-1.5 border-b border-white/5 flex gap-3">
        {Object.entries(MAC_NAMES).map(([id, mac]) => (
          <div key={id} className="flex items-center gap-1">
            <mac.Icon className="w-3 h-3" style={{ color: mac.color }} />
            <span className="text-[9px] font-bold" style={{ color: mac.color }}>
              {domainCounts[id] || 0}
            </span>
          </div>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {events.slice(-50).map(event => (
          <EventRow key={event.id} event={event} />
        ))}
      </div>

      <div className="border-t border-white/5">
        <div className="px-3 py-1.5 border-b border-white/5">
          <div className="text-[9px] font-bold tracking-[0.15em] text-text-muted uppercase">
            {lang === 'sv' ? 'SENASTE ÅTGÄRDER' : 'RECENT ACTIONS'}
          </div>
        </div>
        <div className="max-h-[160px] overflow-y-auto">
          {recentActions.map(event => (
            <EventRow key={`action-${event.id}`} event={event} />
          ))}
        </div>
      </div>
    </aside>
  )
}
