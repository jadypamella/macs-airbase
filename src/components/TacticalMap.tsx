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
import { DispersalRoutes } from './DispersalRoutes'
import { AircraftMarkers } from './AircraftMarkers'
import { ScrambleAircraft } from './ScrambleAircraft'
import { ScrambleSelector } from './ScrambleSelector'
import { MapBuildings3D } from './MapBuildings3D'
import { RunwayRoutes } from './RunwayRoutes'
import { ThreatHeatmap } from './ThreatHeatmap'
import { useScrambleSimulation } from '../hooks/useScrambleSimulation'
import { DraggableEventPanel } from './DraggableEventPanel'
import { DraggableAircraftPanel } from './DraggableAircraftPanel'
import { EVENT_LOCATION_MAP, LOCATIONS } from '../data/locations'
import { MAC_NAMES, SEVERITY_COLORS } from '../constants'
import type { AgentState, SwarmEvent, WorldState, AircraftState } from '../constants'

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

type ActivePanel =
  | { type: 'event'; event: SwarmEvent; pos: { x: number; y: number } }
  | { type: 'aircraft'; aircraft: AircraftState; pos: { x: number; y: number } }

export function TacticalMap({ events, agents, worldState, flyToTarget, onPopupClose }: TacticalMapProps) {
  const [pulseRings, setPulseRings] = useState<PulseRing[]>([])
  const [threatTracks, setThreatTracks] = useState<ThreatTrack[]>([])
  const [ewJamming, setEwJamming] = useState(false)
  const [dispersalActive, setDispersalActive] = useState(false)
  const [zoneStatuses, setZoneStatuses] = useState<Record<string, string>>({})
  const [editMode, setEditMode] = useState(false)
  const [activePanel, setActivePanel] = useState<ActivePanel | null>(null)

  const mapRef = useRef<MapRef>(null)
  const processedRef = useRef<Set<string>>(new Set())

  // Scramble simulation
  const scrambleSim = useScrambleSimulation()
  const scrambleTriggeredRef = useRef<Set<string>>(new Set())

  const processNewEvent = useCallback((event: SwarmEvent) => {
    if (processedRef.current.has(event.id)) return
    processedRef.current.add(event.id)

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

    if (event.event_type === 'EW_JAMMING') setEwJamming(true)
    if (event.event_type === 'DISPERSAL_ORDER') setDispersalActive(true)

    if (event.event_type === 'SCRAMBLE_ORDER' || event.event_type === 'TASKING_ORDER') {
      setZoneStatuses(prev => ({ ...prev, 'runway-zone': 'warning' }))
    }

    // Auto-trigger scramble simulation on SCRAMBLE_ORDER
    if (event.event_type === 'SCRAMBLE_ORDER' && !scrambleTriggeredRef.current.has(event.id)) {
      scrambleTriggeredRef.current.add(event.id)
      if (!scrambleSim.isRunning) {
        scrambleSim.startScramble()
      }
    }
  }, [scrambleSim])

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

  // Fly to target — close existing panel first, then fly, then open new panel
  useEffect(() => {
    if (flyToTarget && mapRef.current) {
      // 1) Close any existing panel immediately
      setActivePanel(null)

      // 2) Fly to the new location
      mapRef.current.flyTo({ center: [flyToTarget.lng, flyToTarget.lat], zoom: 15, duration: 1200 })

      // 3) Open new panel after flight animation completes
      setTimeout(() => {
        if (mapRef.current) {
          const pt = mapRef.current.project([flyToTarget.lng, flyToTarget.lat])
          setActivePanel({
            type: 'event',
            event: flyToTarget.event,
            pos: { x: pt.x - 120, y: pt.y - 160 },
          })
        }
      }, 1300)
    }
  }, [flyToTarget])

  const latestAgentEvents = useMemo(() => {
    const latest: Record<string, SwarmEvent | undefined> = {}
    for (const event of events) {
      if (MAC_NAMES[event.source]) latest[event.source] = event
    }
    return latest
  }, [events])

  const handleAircraftClick = useCallback((ac: AircraftState, screenPos: { x: number; y: number }) => {
    setActivePanel({
      type: 'aircraft',
      aircraft: ac,
      pos: screenPos,
    })
  }, [])

  const handleAgentClick = useCallback((agentId: string, screenPos: { x: number; y: number }) => {
    const latest = latestAgentEvents[agentId]
    if (!latest) return
    setActivePanel({
      type: 'event',
      event: latest,
      pos: screenPos,
    })
  }, [latestAgentEvents])

  const closePanel = useCallback(() => {
    setActivePanel(null)
    onPopupClose?.()
  }, [onPopupClose])

  const handleCopyAllPositions = useCallback(() => {
    // MAC positions from localStorage (saved by MapMacMarkers on drag)
    const macRaw = localStorage.getItem('mac-marker-positions')
    const macPositions = macRaw ? JSON.parse(macRaw) : {}
    const macText = Object.entries(macPositions).map(([id, pos]) => {
      const p = pos as { lng: number; lat: number }
      return `  ${id}: { lat: ${p.lat.toFixed(6)}, lng: ${p.lng.toFixed(6)} }`
    }).join(',\n')

    // Aircraft positions from localStorage
    const acRaw = localStorage.getItem('aircraft-marker-positions')
    const acPositions = acRaw ? JSON.parse(acRaw) : {}
    const acText = Object.entries(acPositions).map(([id, pos]) => {
      const p = pos as [number, number]
      return `  '${id}': [${p[0].toFixed(6)}, ${p[1].toFixed(6)}]`
    }).join(',\n')

    const parts: string[] = []
    if (macText) parts.push(`MAC_POSITIONS:\n{\n${macText}\n}`)
    if (acText) parts.push(`AIRCRAFT_OVERRIDES:\n{\n${acText}\n}`)
    const output = parts.join('\n\n') || 'No positions changed yet. Drag markers first.'
    navigator.clipboard.writeText(output)
    alert('Positions copied to clipboard!')
    console.log('📍 ALL POSITIONS:', output)
  }, [])

  return (
    <div className="relative flex-1 overflow-hidden">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 15.2715,
          latitude: 56.2673,
          zoom: 14.5,
          pitch: 40,
          bearing: -10,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={activeStyle as any}
      >
        <MapZones zoneStatuses={zoneStatuses} />
        <RunwayRoutes />
        <MapBuildings3D visible={true} />
        <ThreatHeatmap events={events} />
        <DispersalRoutes active={dispersalActive} />
        <MapMacMarkers agents={agents} draggable={editMode} onAgentClick={handleAgentClick} />
        <MapPulse pulseRings={pulseRings} />
        <ThreatTracks tracks={threatTracks} />
        <RadarSweep ewJamming={ewJamming} />
        <AircraftMarkers
          aircraft={worldState?.aircraft}
          draggable={editMode}
          onAircraftClick={handleAircraftClick}
          hideIds={scrambleSim.simulatedIds}
        />
        {scrambleSim.aircraft.length > 0 && (
          <ScrambleAircraft
            aircraft={scrambleSim.aircraft}
            elapsedMs={scrambleSim.elapsedMs}
          />
        )}
      </Map>

      {/* Single active panel */}
      {activePanel?.type === 'event' && activePanel.event && (
        <DraggableEventPanel
          key={activePanel.event.id}
          event={activePanel.event}
          onClose={closePanel}
          initialPos={activePanel.pos}
        />
      )}
      {activePanel?.type === 'aircraft' && activePanel.aircraft && (
        <DraggableAircraftPanel
          key={activePanel.aircraft.id}
          ac={activePanel.aircraft}
          initialPos={activePanel.pos}
          onClose={closePanel}
        />
      )}

      {/* Map style toggle + EDIT + COPY */}
      <div className="absolute top-4 left-4 z-30 flex gap-1">
        <button
          onClick={() => setMapStyle('dark')}
          className={`px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] uppercase border transition-colors ${
            mapStyle === 'dark'
              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
              : 'bg-surface-card/80 border-white/10 text-text-muted hover:border-white/30'
          }`}
        >
          TACTICAL
        </button>
        <button
          onClick={() => setMapStyle('satellite')}
          className={`px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] uppercase border transition-colors ${
            mapStyle === 'satellite'
              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
              : 'bg-surface-card/80 border-white/10 text-text-muted hover:border-white/30'
          }`}
        >
          SATELLITE
        </button>
        {/* <button
          onClick={() => setEditMode(prev => !prev)}
          className={`px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] uppercase border transition-colors ${
            editMode
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
              : 'bg-surface-card/80 border-white/10 text-text-muted hover:border-white/30'
          }`}
        >
          EDIT
        </button>
        {editMode && (
          <button
            onClick={handleCopyAllPositions}
            className="px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] uppercase border transition-colors bg-cyan-500/20 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30"
          >
            COPY
          </button>
        )} */}
        {/* Scramble simulation controls */}
        <div className="ml-2 border-l border-white/10 pl-2 flex gap-1">
          {!scrambleSim.isRunning ? (
            <ScrambleSelector
              aircraft={worldState?.aircraft}
              onScramble={(ids) => scrambleSim.startScramble(ids)}
            />
          ) : (
            <>
              {!scrambleSim.isReturning ? (
                <button
                  onClick={scrambleSim.recallScramble}
                  className="px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] uppercase border transition-colors bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30"
                >
                  RECALL
                </button>
              ) : (
                <div className="px-2 py-1.5 text-[9px] font-mono text-amber-400/80 border border-amber-500/20 bg-amber-500/5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  RTB
                </div>
              )}
              <div className="px-2 py-1.5 text-[9px] font-mono text-red-400/80 border border-red-500/20 bg-red-500/5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                LIVE {Math.floor(scrambleSim.elapsedMs / 1000)}s
              </div>
            </>
          )}
        </div>
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
