import { useMemo } from 'react'
import { Marker, Source, Layer } from 'react-map-gl/maplibre'
import type { SimAircraft } from '../hooks/useScrambleSimulation'

interface ScrambleAircraftProps {
  aircraft: SimAircraft[]
  elapsedMs: number
}

// Per-aircraft unique colors
const AC_COLORS: string[] = [
  '#22d3ee',  // cyan
  '#a3e635',  // lime
  '#f472b6',  // pink
  '#facc15',  // yellow
  '#818cf8',  // indigo
  '#fb923c',  // orange
]

const PHASE_LABELS: Record<string, string> = {
  IDLE:       'SKYDD',
  TAXI_OUT:   'TAXI',
  HOLDING:    'HOLD',
  LINEUP:     'LINEUP',
  TAKEOFF:    'TKOFF',
  CLIMB:      'CLB',
  ENROUTE:    'TRANSIT',
  ON_STATION: 'ON STA',
  RTB:        'RTB',
  APPROACH:   'APP',
  LANDING:    'LDG',
  TAXI_IN:    'TAXI IN',
  PARKED:     'SKYDD',
}

// Phases where the aircraft is off the ground
const AIRBORNE_PHASES = new Set(['TAKEOFF', 'CLIMB', 'ENROUTE', 'ON_STATION', 'RTB', 'APPROACH'])
// Phases where the aircraft has left its shelter (show ghost marker at dislocation)
const DEPARTED_PHASES = new Set(['TAXI_OUT', 'HOLDING', 'LINEUP', 'TAKEOFF', 'CLIMB', 'ENROUTE', 'ON_STATION', 'RTB', 'APPROACH', 'LANDING', 'TAXI_IN'])

export function ScrambleAircraft({ aircraft, elapsedMs }: ScrambleAircraftProps) {
  // Build trail GeoJSON with fading segments
  const trailData = useMemo(() => {
    const features: GeoJSON.Feature[] = []
    for (let i = 0; i < aircraft.length; i++) {
      const ac = aircraft[i]
      if (ac.trail.length < 2) continue
      const color = AC_COLORS[i % AC_COLORS.length]
      const chunkSize = 10
      const totalChunks = Math.ceil(ac.trail.length / chunkSize)
      for (let c = 0; c < totalChunks; c++) {
        const start = c * chunkSize
        const end = Math.min(start + chunkSize + 1, ac.trail.length)
        const seg = ac.trail.slice(start, end)
        if (seg.length < 2) continue
        const age = c / totalChunks
        features.push({
          type: 'Feature',
          properties: { color, opacity: 0.08 + age * 0.55, width: 1.2 + age * 1.3 },
          geometry: { type: 'LineString', coordinates: seg },
        })
      }
    }
    return { type: 'FeatureCollection' as const, features }
  }, [aircraft])

  // Visible moving aircraft (started and not parked idle)
  const visible = useMemo(
    () => aircraft.filter(ac => ac.started),
    [aircraft],
  )

  // Aircraft that have left their shelters — show ghost marker at dislocation point
  const departed = useMemo(
    () => aircraft.filter(ac => DEPARTED_PHASES.has(ac.phase)),
    [aircraft],
  )

  return (
    <>
      {/* ── Trail lines ── */}
      <Source id="scramble-trails" type="geojson" data={trailData as GeoJSON.FeatureCollection}>
        <Layer
          id="scramble-trail-glow"
          type="line"
          paint={{
            'line-color': ['get', 'color'],
            'line-width': ['*', ['get', 'width'], 2.5],
            'line-blur': 5,
            'line-opacity': ['*', ['get', 'opacity'], 0.1],
          } as any}
        />
        <Layer
          id="scramble-trail-line"
          type="line"
          paint={{
            'line-color': ['get', 'color'],
            'line-width': ['get', 'width'],
            'line-opacity': ['get', 'opacity'],
          } as any}
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        />
      </Source>

      {/* ── Empty shelter markers (ghost) — shows where plane was parked ── */}
      {departed.map((ac, _idx) => {
        const acIdx = aircraft.indexOf(ac)
        const color = AC_COLORS[acIdx % AC_COLORS.length]
        return (
          <Marker
            key={`ghost-${ac.id}`}
            latitude={ac.shelterPos[1]}
            longitude={ac.shelterPos[0]}
            anchor="center"
          >
            <div className="relative">
              {/* Dashed outline of the plane that was here */}
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
                <path
                  d="M12 3L11 7L11 9L4 13L4 15L11 13L11 17L8 19L8 21L12 19.5L16 21L16 19L13 17L13 13L20 15L20 13L13 9L13 7L12 3Z"
                  fill="none"
                  stroke={color}
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              </svg>
              <div
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap"
                style={{ fontSize: 6, color: `${color}60`, fontWeight: 600, letterSpacing: '0.05em' }}
              >
                {ac.id}
              </div>
            </div>
          </Marker>
        )
      })}

      {/* ── Active aircraft markers ── */}
      {visible.map(ac => {
        const [lng, lat] = ac.position
        const acIdx = aircraft.indexOf(ac)
        const color = AC_COLORS[acIdx % AC_COLORS.length]
        const isFlying = AIRBORNE_PHASES.has(ac.phase)
        const size = isFlying ? 32 : 24

        const altDisplay = ac.altitude > 500
          ? `FL${Math.round(ac.altitude / 100)}`
          : ac.altitude > 0 ? `${Math.round(ac.altitude)}ft` : ''

        const infoText = isFlying
          ? `${altDisplay} ${Math.round(ac.speed)}kt`
          : ac.speed > 1
            ? `${PHASE_LABELS[ac.phase]} ${Math.round(ac.speed)}kt`
            : PHASE_LABELS[ac.phase] || ac.phase

        return (
          <Marker key={`sim-${ac.id}`} latitude={lat} longitude={lng} anchor="center">
            <div className="relative" style={{ willChange: 'transform' }}>
              {/* Altitude ring for flying aircraft */}
              {isFlying && (
                <div
                  className="absolute rounded-full"
                  style={{
                    width: size + 10, height: size + 10,
                    left: -5, top: -5,
                    border: `1px solid ${color}25`,
                    background: `radial-gradient(circle, ${color}06 0%, transparent 70%)`,
                  }}
                />
              )}

              {/* Aircraft SVG */}
              <div style={{
                transform: `rotate(${ac.heading}deg)`,
                transition: 'transform 0.2s linear',
                willChange: 'transform',
              }}>
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
                  style={{ filter: isFlying ? `drop-shadow(0 0 5px ${color}70)` : `drop-shadow(0 0 2px ${color}50)` }}>
                  <path
                    d="M12 3L11 7L11 9L4 13L4 15L11 13L11 17L8 19L8 21L12 19.5L16 21L16 19L13 17L13 13L20 15L20 13L13 9L13 7L12 3Z"
                    fill={color} fillOpacity={0.9} stroke="white" strokeWidth="0.3" strokeOpacity={0.3}
                  />
                </svg>
              </div>

              {/* Callsign */}
              <div className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-bold tracking-wider"
                style={{ bottom: -12, fontSize: 7, color, textShadow: '0 0 4px rgba(0,0,0,0.9)' }}>
                {ac.id}
              </div>

              {/* Data tag */}
              <div className="absolute whitespace-nowrap font-mono tracking-wide rounded-sm px-1"
                style={{
                  top: -16, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 6.5, color: 'white', backgroundColor: `${color}20`,
                  border: `1px solid ${color}25`, textShadow: '0 0 3px rgba(0,0,0,0.9)', lineHeight: '11px',
                }}>
                {infoText}
              </div>
            </div>
          </Marker>
        )
      })}
    </>
  )
}
