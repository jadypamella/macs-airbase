import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
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
import { AircraftMarkers } from './AircraftMarkers'
import { MapBuildings3D } from './MapBuildings3D'
import { ThreatHeatmap } from './ThreatHeatmap'
import { DraggableEventPanel } from './DraggableEventPanel'
import { EVENT_LOCATION_MAP, LOCATIONS } from '../data/locations'
import { detectCrossDomainRefs, MAC_NAMES, SEVERITY_COLORS } from '../constants'
import type { AgentState, SwarmEvent, WorldState } from '../constants'

interface TacticalMapProps {
  events: SwarmEvent[]
  agents: Record<string, AgentState>
  worldState: WorldState | null
  flyToTarget: { lng: number; lat: number; event: SwarmEvent } | null
  onPopupClose?: () => void
}

const PULSE_COLORS: Record<string, string> = {
  SCRAMBLE_ORDER: '#ef4444',
  THREAT_ESCALATION: '#ef4444',
  RADAR_CONTACT: '#8b5cf6',
  FUEL_LOW: '#f97316',
  AIRCRAFT_GROUNDED: '#eab308',
  TASKING_ORDER: '#3b82f6',
}

export function TacticalMap({ events, agents, worldState, flyToTarget, onPopupClose }: TacticalMapProps) {
  const [pulseRings, setPulseRings] = useState<PulseRing[]>([])
  const [threatTracks, setThreatTracks] = useState<ThreatTrack[]>([])
  const [arcs, setArcs] = useState<Arc[]>([])
  const [ewJamming, setEwJamming] = useState(false)
  const [dispersalActive, setDispersalActive] = useState(false)
  const [zoneStatuses, setZoneStatuses] = useState<Record<string, string>>({})
  const [editMode, setEditMode] = useState(false)
  
  const mapRef = useRef<MapRef>(null)
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

  const SATELLITE_STYLE = useMemo(() => ({
    version: 8 as const,
    sources: {
      'esri-satellite': {
        type: 'raster' as const,
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: '© Esri',
      },
    },
    layers: [
      {
        id: 'esri-satellite-layer',
        type: 'raster' as const,
        source: 'esri-satellite',
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  }), [])

  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite'>('satellite')

  const activeStyle = mapStyle === 'dark'
    ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
    : SATELLITE_STYLE

  const [panelScreenPos, setPanelScreenPos] = useState<{ x: number; y: number } | null>(null)

  // Fly to target when event is clicked, then project to screen coords
  useEffect(() => {
    if (flyToTarget && mapRef.current) {
      mapRef.current.flyTo({ center: [flyToTarget.lng, flyToTarget.lat], zoom: 15, duration: 1200 })
      setTimeout(() => {
        if (mapRef.current) {
          const pt = mapRef.current.project([flyToTarget.lng, flyToTarget.lat])
          // Position panel centered above the marker
          setPanelScreenPos({ x: pt.x - 120, y: pt.y - 160 })
        }
      }, 1300)
    } else {
      setPanelScreenPos(null)
    }
  }, [flyToTarget])

  return (
    <div className="relative flex-1 overflow-hidden">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 15.265,
          latitude: 56.267,
          zoom: 13.5,
          pitch: 40,
          bearing: -10,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={activeStyle as any}
      >
        <MapZones zoneStatuses={zoneStatuses} />
        <MapBuildings3D visible={true} />
        <ThreatHeatmap events={events} />
        <DispersalRoutes active={dispersalActive} />
        <MapMacMarkers agents={agents} draggable={editMode} />
        <MapPulse pulseRings={pulseRings} />
        <ThreatTracks tracks={threatTracks} />
        <RadarSweep ewJamming={ewJamming} />
        <ConnectionArcs arcs={arcs} />
        <AircraftMarkers aircraft={worldState?.aircraft} draggable={editMode} />

      </Map>

      {/* Draggable event detail panel */}
      {flyToTarget?.event && panelScreenPos && (
        <DraggableEventPanel event={flyToTarget.event} onClose={() => { onPopupClose?.(); setPanelScreenPos(null) }} initialPos={panelScreenPos} />
      )}

      {/* Map style toggle */}
      <div className="absolute top-4 left-4 z-30 flex gap-1">
        <button
          onClick={() => setMapStyle('dark')}
          className={`px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] uppercase border transition-colors ${
            mapStyle === 'dark'
              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
              : 'bg-surface-card/80 border-white/10 text-text-muted hover:border-white/30'
          }`}
        >
          TAKTISK
        </button>
        <button
          onClick={() => setMapStyle('satellite')}
          className={`px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] uppercase border transition-colors ${
            mapStyle === 'satellite'
              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
              : 'bg-surface-card/80 border-white/10 text-text-muted hover:border-white/30'
          }`}
        >
          SATELLIT
        </button>
        <button
          onClick={() => setEditMode(prev => !prev)}
          className={`px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] uppercase border transition-colors ${
            editMode
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
              : 'bg-surface-card/80 border-white/10 text-text-muted hover:border-white/30'
          }`}
        >
          EDIT
        </button>
      </div>

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
