import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import Map from 'react-map-gl/maplibre'
import { MapZones } from './MapZones'
import { MapMacMarkers } from './MapMacMarkers'
import { MapPulse } from './MapPulse'
import type { PulseRing } from './MapPulse'
import { RadarSweep } from './RadarSweep'
import { ThreatTracks } from './ThreatTracks'
import type { ThreatTrack } from './ThreatTracks'
import { ConnectionArcs } from './ConnectionArcs'
import type { Arc } from './ConnectionArcs'
import { DispersalRoutes } from './DispersalRoutes'
import { EVENT_LOCATION_MAP, LOCATIONS } from '../data/locations'
import { detectCrossDomainRefs, MAC_NAMES } from '../constants'
import type { AgentState, SwarmEvent } from '../constants'

interface TacticalMapProps {
  events: SwarmEvent[]
  agents: Record<string, AgentState>
}

const PULSE_COLORS: Record<string, string> = {
  SCRAMBLE_ORDER: '#ef4444',
  THREAT_ESCALATION: '#ef4444',
  RADAR_CONTACT: '#8b5cf6',
  FUEL_LOW: '#f97316',
  AIRCRAFT_GROUNDED: '#eab308',
  TASKING_ORDER: '#3b82f6',
}

export function TacticalMap({ events, agents }: TacticalMapProps) {
  const [pulseRings, setPulseRings] = useState<PulseRing[]>([])
  const [threatTracks, setThreatTracks] = useState<ThreatTrack[]>([])
  const [arcs, setArcs] = useState<Arc[]>([])
  const [ewJamming, setEwJamming] = useState(false)
  const [dispersalActive, setDispersalActive] = useState(false)
  const [zoneStatuses, setZoneStatuses] = useState<Record<string, string>>({})
  const processedRef = useRef<Set<string>>(new Set())

  const processNewEvent = useCallback((event: SwarmEvent) => {
    if (processedRef.current.has(event.id)) return
    processedRef.current.add(event.id)

    // Pulse rings for system events
    const locKey = EVENT_LOCATION_MAP[event.event_type]
    if (locKey) {
      const ring: PulseRing = {
        id: `pulse-${event.id}`,
        locationKey: locKey,
        color: PULSE_COLORS[event.event_type] || '#64748b',
        createdAt: Date.now(),
      }
      setPulseRings(prev => [...prev, ring])
      setTimeout(() => {
        setPulseRings(prev => prev.filter(r => r.id !== ring.id))
      }, 2500)
    }

    // Threat tracks
    if (event.event_type === 'RADAR_CONTACT' || event.event_type === 'THREAT_ESCALATION') {
      const tl = LOCATIONS['threat-vector']
      setThreatTracks(prev => [
        ...prev,
        {
          id: `track-${event.id}`,
          bearing: event.payload?.bearing || Math.floor(Math.random() * 360),
          altitudeFt: event.payload?.altitude_ft || 25000,
          speedKnots: event.payload?.speed_knots || 450,
          threatLevel: event.payload?.threat_level || 'AMBER',
          lng: tl.lng + (Math.random() - 0.5) * 0.05,
          lat: tl.lat + (Math.random() - 0.5) * 0.03,
        },
      ])
      setZoneStatuses(prev => ({ ...prev, 'threat-zone': 'critical' }))
    }
    if (event.event_type === 'THREAT_RESOLVED') {
      setThreatTracks([])
      setZoneStatuses(prev => ({ ...prev, 'threat-zone': 'safe' }))
    }

    // EW Jamming
    if (event.event_type === 'EW_JAMMING') {
      setEwJamming(true)
    }

    // Dispersal
    if (event.event_type === 'DISPERSAL_ORDER') {
      setDispersalActive(true)
    }

    // Zone updates
    if (event.event_type === 'SCRAMBLE_ORDER' || event.event_type === 'TASKING_ORDER') {
      setZoneStatuses(prev => ({ ...prev, 'runway-zone': 'warning' }))
    }

    // Connection arcs
    if (event.event_type === 'ACTION_TAKEN' && event.source !== 'SYSTEM') {
      const refs = detectCrossDomainRefs(event)
      refs.forEach(refId => {
        const arc: Arc = {
          id: `arc-${event.id}-${refId}`,
          fromId: event.source,
          toId: refId,
          color: MAC_NAMES[event.source]?.color || '#64748b',
          createdAt: Date.now(),
        }
        setArcs(prev => [...prev, arc])
        setTimeout(() => {
          setArcs(prev => prev.filter(a => a.id !== arc.id))
        }, 4500)
      })
    }
  }, [])

  // Process events
  useEffect(() => {
    events.forEach(processNewEvent)
  }, [events, processNewEvent])

  const MAP_STYLES = useMemo(() => ({
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    satellite: 'https://api.maptiler.com/maps/hybrid/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL',
  }), [])

  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite'>('dark')

  return (
    <div className="relative flex-1 overflow-hidden">
      <Map
        initialViewState={{
          longitude: 15.265,
          latitude: 56.267,
          zoom: 13.5,
          pitch: 40,
          bearing: -10,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLES[mapStyle]}
      >
        <MapZones zoneStatuses={zoneStatuses} />
        <DispersalRoutes active={dispersalActive} />
        <MapMacMarkers agents={agents} />
        <MapPulse pulseRings={pulseRings} />
        <ThreatTracks tracks={threatTracks} />
        <RadarSweep ewJamming={ewJamming} />
        <ConnectionArcs arcs={arcs} />
      </Map>

      {/* Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-20 opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(6,10,18,0.8) 100%)',
        }}
      />

      {/* EW Jamming badge */}
      {ewJamming && (
        <div className="absolute top-4 right-4 z-30 px-3 py-1.5 bg-status-red/20 border border-status-red/40 animate-threat-blink">
          <span className="text-[10px] font-bold tracking-[0.2em] text-status-red">STÖRNING / JAMMING</span>
        </div>
      )}
    </div>
  )
}
