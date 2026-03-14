import { useState, useEffect, useRef, useCallback } from 'react'
import type { SwarmEvent, AgentState, WorldState } from '../constants'

const WS_URL = import.meta.env.VITE_WS_URL || 'wss://macs-airbase.duckdns.org/ws'
const MAX_EVENTS = 300

export function useSwarm() {
  const [events, setEvents] = useState<SwarmEvent[]>([])
  const [agents, setAgents] = useState<Record<string, AgentState>>({
    OPS:    { status: 'unknown', lastSeen: null, actionCount: 0 },
    FUEL:   { status: 'unknown', lastSeen: null, actionCount: 0 },
    ARMING: { status: 'unknown', lastSeen: null, actionCount: 0 },
    MAINT:  { status: 'unknown', lastSeen: null, actionCount: 0 },
    THREAT: { status: 'unknown', lastSeen: null, actionCount: 0 },
  })
  const [connected, setConnected] = useState(false)
  const [scenario, setScenario] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const processEvent = useCallback((event: SwarmEvent) => {
    if (event.source !== 'SYSTEM') {
      setAgents(prev => {
        const id = event.source
        if (!prev[id]) return prev
        const prevStatus = prev[id].status
        const nextStatus =
          event.event_type === 'AGENT_OFFLINE' ? 'offline'
          : event.event_type === 'AGENT_ONLINE' ? 'online'
          : 'active'
        return {
          ...prev,
          [id]: {
            ...prev[id],
            status: prevStatus === 'offline' && event.event_type !== 'AGENT_ONLINE'
              ? 'offline' : nextStatus,
            lastSeen: event.timestamp,
            actionCount: event.event_type === 'ACTION_TAKEN'
              ? prev[id].actionCount + 1 : prev[id].actionCount,
          },
        }
      })
    }
    if (event.event_type === 'SCENARIO_START') {
      setScenario(event.payload?.scenario || 'unknown')
    }
  }, [])

  useEffect(() => {
    let dead = false
    function connect() {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws
      ws.onopen = () => setConnected(true)
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data)
          if (data.type === 'history') {
            setEvents(prev => {
              const seen = new Set(prev.map(e => e.id))
              const fresh = (data.events as SwarmEvent[]).filter(e => !seen.has(e.id))
              return [...prev, ...fresh].slice(-MAX_EVENTS)
            })
            ;(data.events as SwarmEvent[]).forEach(processEvent)
          } else {
            const evt = data as SwarmEvent
            processEvent(evt)
            setEvents(prev => {
              if (prev.some(e => e.id === evt.id)) return prev
              const next = [...prev, evt]
              return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next
            })
          }
        } catch { /* ignore parse errors */ }
      }
      ws.onclose = () => {
        setConnected(false)
        if (!dead) setTimeout(connect, 2000)
      }
      ws.onerror = () => ws.close()
    }
    connect()
    return () => { dead = true; wsRef.current?.close() }
  }, [processEvent])

  const worldState: WorldState | null = events
    .filter(e => e.event_type === 'WORLD_STATE_UPDATE')
    .at(-1)?.payload?.state || null

  const threatLevel: string = events
    .filter(e => e.domain === 'THREAT' && e.payload?.threat_level)
    .at(-1)?.payload?.threat_level || 'GREEN'

  const sendCommand = useCallback((command: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(command))
    }
  }, [])

  return { events, agents, connected, scenario, worldState, threatLevel, sendCommand }
}
