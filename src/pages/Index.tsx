import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useSwarm } from '@/hooks/useSwarm'
import { LangProvider } from '@/hooks/useLang'
import { Header } from '@/components/Header'
import { MacSidebar } from '@/components/MacSidebar'
import { TacticalMap } from '@/components/TacticalMap'
import { EventFeed } from '@/components/EventFeed'
import { WorldStateGauges } from '@/components/WorldStateGauges'
import { TimelineBar } from '@/components/TimelineBar'
import { ScrambleOverlay } from '@/components/ScrambleOverlay'
import { EmergenceGraph } from '@/components/EmergenceGraph'
import { MAC_POSITIONS } from '@/data/locations'
import { MAC_NAMES, SEVERITY_COLORS } from '@/constants'
import type { SwarmEvent } from '@/constants'

const Index = () => {
  const { events, agents, connected, scenario, worldState, threatLevel, controlAgent } = useSwarm()
  const [scrambleActive, setScrambleActive] = useState(false)
  const [flyToTarget, setFlyToTarget] = useState<{ lng: number; lat: number; event: SwarmEvent } | null>(null)
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)

  useEffect(() => {
    const lastScramble = events.filter(e => e.event_type === 'SCRAMBLE_ORDER').at(-1)
    if (lastScramble && Date.now() / 1000 - lastScramble.timestamp < 5) {
      setScrambleActive(true)
      const timer = setTimeout(() => setScrambleActive(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [events])

  const criticalCount = events.filter(e => e.severity === 'CRITICAL').length

  const handleEventClick = useCallback((event: SwarmEvent) => {
    // Toggle expand in list — collapse if same event clicked again
    setExpandedEventId(prev => prev === event.id ? null : event.id)

    // Fly to MAC agent position if available
    const macPos = MAC_POSITIONS[event.source]
    if (macPos) {
      setFlyToTarget({ lng: macPos.lng, lat: macPos.lat, event })
    }
  }, [])

  const handleKill = useCallback((agentId: string) => {
    controlAgent('kill_agent', agentId)
  }, [controlAgent])

  const handleRevive = useCallback((agentId: string) => {
    controlAgent('revive_agent', agentId)
  }, [controlAgent])

  return (
    <LangProvider>
      <div className="h-screen w-screen flex flex-col bg-surface-primary overflow-hidden">
        <Header
          scenario={scenario}
          threatLevel={threatLevel}
          connected={connected}
          eventCount={events.length}
          criticalCount={criticalCount}
        />

        <div className="flex flex-1 min-h-0">
          <MacSidebar agents={agents} events={events} onKill={handleKill} onRevive={handleRevive} />

          <div className="flex-1 flex flex-col min-w-0">
            <TacticalMap
              events={events}
              agents={agents}
              worldState={worldState}
              flyToTarget={flyToTarget}
              onPopupClose={() => setFlyToTarget(null)}
            />
            <WorldStateGauges worldState={worldState} />
          </div>

          <div className="w-[280px] flex flex-col shrink-0 overflow-hidden bg-surface-card border-l border-white/5">
            <div className="flex-1 overflow-hidden">
              <EventFeed events={events} onEventClick={handleEventClick} expandedEventId={expandedEventId} />
            </div>
            <div className="border-t border-white/5">
              <EmergenceGraph events={events} />
            </div>
          </div>
        </div>

        <TimelineBar events={events} scenario={scenario} />
        <ScrambleOverlay active={scrambleActive} />
      </div>
    </LangProvider>
  )
}

export default Index
