import { useState, useEffect } from 'react'
import { useSwarm } from '@/hooks/useSwarm'
import { Header } from '@/components/Header'
import { MacSidebar } from '@/components/MacSidebar'
import { TacticalMap } from '@/components/TacticalMap'
import { EventFeed } from '@/components/EventFeed'
import { WorldStateGauges } from '@/components/WorldStateGauges'
import { TimelineBar } from '@/components/TimelineBar'
import { ScrambleOverlay } from '@/components/ScrambleOverlay'
import { EmergenceGraph } from '@/components/EmergenceGraph'

const Index = () => {
  const { events, agents, connected, scenario, worldState, threatLevel } = useSwarm()
  const [scrambleActive, setScrambleActive] = useState(false)

  // Watch for SCRAMBLE_ORDER
  useEffect(() => {
    const lastScramble = events.filter(e => e.event_type === 'SCRAMBLE_ORDER').at(-1)
    if (lastScramble && Date.now() / 1000 - lastScramble.timestamp < 5) {
      setScrambleActive(true)
      const timer = setTimeout(() => setScrambleActive(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [events])

  const criticalCount = events.filter(e => e.severity === 'CRITICAL').length

  return (
    <div className="h-screen w-screen flex flex-col bg-surface-primary overflow-hidden">
      <Header
        scenario={scenario}
        threatLevel={threatLevel}
        connected={connected}
        eventCount={events.length}
        criticalCount={criticalCount}
      />

      <div className="flex flex-1 min-h-0">
        <MacSidebar agents={agents} events={events} />

        <div className="flex-1 flex flex-col min-w-0">
          <TacticalMap events={events} agents={agents} />
          <WorldStateGauges worldState={worldState} />
        </div>

        <div className="w-[280px] bg-surface-card border-l border-white/5 flex flex-col shrink-0 overflow-hidden">
          <EventFeed events={events} />
          <EmergenceGraph events={events} />
        </div>
      </div>

      <TimelineBar events={events} scenario={scenario} />
      <ScrambleOverlay active={scrambleActive} />
    </div>
  )
}

export default Index
