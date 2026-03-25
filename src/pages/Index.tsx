import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { ChartBarIcon } from '@heroicons/react/24/solid'
import { useSwarm } from '@/hooks/useSwarm'
import { useSummary } from '@/hooks/useSummary'
import { LangProvider } from '@/hooks/useLang'
import { Header } from '@/components/Header'
import { MacSidebar } from '@/components/MacSidebar'
import { TacticalMap } from '@/components/TacticalMap'
import { EventFeed } from '@/components/EventFeed'
import { WorldStateGauges } from '@/components/WorldStateGauges'
import { TimelineBar } from '@/components/TimelineBar'
import { ScrambleOverlay } from '@/components/ScrambleOverlay'
import { EmergenceGraph } from '@/components/EmergenceGraph'
import { AgentReasoningDrawer } from '@/components/AgentReasoningDrawer'
import { CausalChainView } from '@/components/CausalChainView'
import { SummaryDashboard } from '@/components/SummaryDashboard'
import { MAC_POSITIONS } from '@/data/locations'
import { MAC_NAMES, SEVERITY_COLORS } from '@/constants'
import type { SwarmEvent } from '@/constants'

const Index = () => {
  const { events, agents, connected, scenario, worldState, threatLevel, controlAgent } = useSwarm()
  const summary = useSummary(10000)
  const [scrambleActive, setScrambleActive] = useState(false)
  const [flyToTarget, setFlyToTarget] = useState<{ lng: number; lat: number; event: SwarmEvent } | null>(null)
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [gaugesOpen, setGaugesOpen] = useState(true)
  const [mapSelectedSource, setMapSelectedSource] = useState<string | null>(null)

  // New UI states
  const [reasoningAgentId, setReasoningAgentId] = useState<string | null>(null)
  const [chainEventId, setChainEventId] = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)

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
    setExpandedEventId(prev => prev === event.id ? null : event.id)
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

  const handleOpenReasoning = useCallback((agentId: string) => {
    setReasoningAgentId(agentId)
  }, [])

  const handleOpenChain = useCallback((eventId: string) => {
    setReasoningAgentId(null) // close reasoning drawer if open
    setChainEventId(eventId)
  }, [])

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
            <MacSidebar
              agents={agents}
              events={events}
              summary={summary}
              onKill={handleKill}
              onRevive={handleRevive}
              onOpenReasoning={handleOpenReasoning}
            />
          </div>

          {/* Left toggle */}
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
              onMarkerSelect={(sourceId: string) => {
                setMapSelectedSource(prev => (!sourceId || prev === sourceId) ? null : sourceId)
              }}
            />
            <div className="relative">
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

          {/* Right toggle */}
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
              <EventFeed events={events} onEventClick={handleEventClick} onOpenChain={handleOpenChain} expandedEventId={expandedEventId} mapSelectedSource={mapSelectedSource} onClearMapFilter={() => setMapSelectedSource(null)} />
            </div>
            <div className="border-t border-white/5 w-[280px]">
              <EmergenceGraph events={events} />
            </div>
          </div>
        </div>

        {/* Summary dashboard toggle button */}
        <button
          onClick={() => setShowSummary(true)}
          className="fixed bottom-14 right-4 z-30 flex items-center gap-1.5 px-3 py-1.5 bg-surface-card/90 border border-white/10 hover:border-cyan-500/40 hover:bg-surface-elevated/80 transition-colors"
        >
          <ChartBarIcon className="w-4 h-4 text-cyan-400" />
          <span className="text-[9px] font-bold tracking-[0.15em] text-text-muted uppercase">SUMMARY</span>
        </button>

        <TimelineBar events={events} scenario={scenario} />
        <ScrambleOverlay active={scrambleActive} />

        {/* Reasoning drawer */}
        {reasoningAgentId && (
          <AgentReasoningDrawer
            agentId={reasoningAgentId}
            onClose={() => setReasoningAgentId(null)}
            onOpenChain={handleOpenChain}
          />
        )}

        {/* Causal chain modal */}
        {chainEventId && (
          <CausalChainView
            eventId={chainEventId}
            onClose={() => setChainEventId(null)}
          />
        )}

        {/* Summary dashboard modal */}
        {showSummary && summary && (
          <SummaryDashboard
            summary={summary}
            onClose={() => setShowSummary(false)}
          />
        )}
      </div>
    </LangProvider>
  )
}

export default Index
