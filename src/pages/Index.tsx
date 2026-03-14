import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
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
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [gaugesOpen, setGaugesOpen] = useState(true)

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

        <div className="flex flex-1 min-h-0 relative">
          {/* Left sidebar */}
          <div className={`flex shrink-0 transition-all duration-300 overflow-hidden ${leftOpen ? 'w-[220px]' : 'w-0'}`}>
            <MacSidebar agents={agents} events={events} onKill={handleKill} onRevive={handleRevive} />
          </div>

          {/* Left toggle arrow */}
          <button
            onClick={() => setLeftOpen(v => !v)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-4 h-10 bg-surface-card/80 border border-white/10 border-l-0 rounded-r hover:bg-surface-elevated/80 transition-colors"
            style={{ left: leftOpen ? 220 : 0 }}
          >
            {leftOpen ? <ChevronLeft size={12} className="text-muted-foreground" /> : <ChevronRight size={12} className="text-muted-foreground" />}
          </button>

          <div className="flex-1 flex flex-col min-w-0">
            <TacticalMap
              events={events}
              agents={agents}
              worldState={worldState}
              flyToTarget={flyToTarget}
              onPopupClose={() => setFlyToTarget(null)}
            />
            <div className="relative">
              {/* Gauges toggle */}
              <button
                onClick={() => setGaugesOpen(v => !v)}
                className="absolute left-1/2 -translate-x-1/2 -top-4 z-20 flex items-center justify-center h-4 w-10 bg-surface-card/80 border border-white/10 border-b-0 rounded-t hover:bg-surface-elevated/80 transition-colors"
              >
                {gaugesOpen
                  ? <ChevronDown size={12} className="text-muted-foreground" />
                  : <ChevronUp size={12} className="text-muted-foreground" />}
              </button>
              <div className={`transition-all duration-300 overflow-hidden ${gaugesOpen ? 'h-[100px]' : 'h-0'}`}>
                <WorldStateGauges worldState={worldState} criticalCount={criticalCount} />
              </div>
            </div>
          </div>

          {/* Right toggle arrow */}
          <button
            onClick={() => setRightOpen(v => !v)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-4 h-10 bg-surface-card/80 border border-white/10 border-r-0 rounded-l hover:bg-surface-elevated/80 transition-colors"
            style={{ right: rightOpen ? 280 : 0 }}
          >
            {rightOpen ? <ChevronRight size={12} className="text-muted-foreground" /> : <ChevronLeft size={12} className="text-muted-foreground" />}
          </button>

          {/* Right sidebar */}
          <div className={`flex flex-col shrink-0 overflow-hidden bg-surface-card border-l border-white/5 transition-all duration-300 ${rightOpen ? 'w-[280px]' : 'w-0'}`}>
            <div className="flex-1 overflow-hidden w-[280px]">
              <EventFeed events={events} onEventClick={handleEventClick} expandedEventId={expandedEventId} />
            </div>
            <div className="border-t border-white/5 w-[280px]">
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
