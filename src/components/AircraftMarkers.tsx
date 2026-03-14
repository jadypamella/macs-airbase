import { useMemo } from 'react'
import { Marker } from 'react-map-gl/maplibre'
import type { AircraftState } from '../constants'
import { DISPERSAL_ROUTE_BRAVO, DISPERSAL_ROUTE_CHARLIE } from '../data/routes'

interface AircraftMarkersProps {
  aircraft: Record<string, AircraftState> | undefined
}

// Combine both dispersal routes into a single path for ground positions
const GROUND_POSITIONS: [number, number][] = [
  // Along route bravo
  [15.265, 56.267],
  [15.255, 56.271],
  [15.245, 56.275],
  [15.230, 56.280],
  // Along route charlie
  [15.275, 56.263],
  [15.285, 56.259],
  [15.295, 56.255],
  [15.305, 56.250],
  // Near apron/runway
  [15.260, 56.270],
  [15.268, 56.268],
  [15.262, 56.265],
  [15.270, 56.266],
]

const PHASE_COLORS: Record<string, string> = {
  AIRBORNE: '#22d3ee',
  RTB: '#facc15',
  TAXI: '#fb923c',
  TAKEOFF: '#22d3ee',
  LANDING: '#facc15',
  FUELING: '#f97316',
  ARMING: '#ef4444',
  SHELTER: '#64748b',
  PRE_FLIGHT: '#a3e635',
  POST_FLIGHT: '#94a3b8',
  MAINTENANCE: '#8b5cf6',
  GROUNDED: '#ef4444',
}

function getAircraftPosition(ac: AircraftState, index: number): [number, number] {
  if (ac.phase === 'AIRBORNE' || ac.phase === 'RTB') {
    // Use heading to place airborne aircraft around the base
    const rad = (ac.heading * Math.PI) / 180
    const dist = 0.02 + (index * 0.008)
    return [15.265 + Math.sin(rad) * dist, 56.267 + Math.cos(rad) * dist * 0.6]
  }
  // Ground aircraft along the dispersal roads
  return GROUND_POSITIONS[index % GROUND_POSITIONS.length]
}

export function AircraftMarkers({ aircraft }: AircraftMarkersProps) {
  const markers = useMemo(() => {
    if (!aircraft) return []
    return Object.values(aircraft).map((ac, i) => ({
      ...ac,
      position: getAircraftPosition(ac, i),
    }))
  }, [aircraft])

  return (
    <>
      {markers.map((ac) => {
        const [lng, lat] = ac.position
        const color = PHASE_COLORS[ac.phase] || '#64748b'
        const isAirborne = ac.phase === 'AIRBORNE' || ac.phase === 'RTB' || ac.phase === 'TAKEOFF'
        const rotation = ac.heading || 0

        return (
          <Marker key={ac.id} latitude={lat} longitude={lng} anchor="center">
            <div className="relative group cursor-pointer">
              {/* Aircraft icon */}
              <div
                className="relative"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <svg
                  width={isAirborne ? 28 : 22}
                  height={isAirborne ? 28 : 22}
                  viewBox="0 0 24 24"
                  fill="none"
                  className={isAirborne ? 'drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]' : ''}
                >
                  {/* Fighter jet silhouette */}
                  <path
                    d="M12 2L10 8L3 10L5 12L3 14L10 16L12 22L14 16L21 14L19 12L21 10L14 8L12 2Z"
                    fill={color}
                    fillOpacity={ac.serviceable ? 0.9 : 0.4}
                    stroke={color}
                    strokeWidth="0.5"
                  />
                </svg>
                {isAirborne && (
                  <div
                    className="absolute inset-0 animate-ping rounded-full"
                    style={{
                      backgroundColor: `${color}20`,
                      animationDuration: '2s',
                    }}
                  />
                )}
              </div>

              {/* Label */}
              <div
                className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[7px] font-bold tracking-wider"
                style={{ color }}
              >
                {ac.id}
              </div>

              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                <div className="bg-surface-card/95 border border-white/10 px-2 py-1.5 text-[9px] whitespace-nowrap backdrop-blur-sm">
                  <div className="font-bold text-text-primary">{ac.id} — {ac.phase}</div>
                  <div className="text-text-muted">
                    Fuel: {ac.fuel_pct.toFixed(0)}% | {ac.loadout}
                  </div>
                  {isAirborne && (
                    <div className="text-text-muted">
                      FL{Math.round(ac.altitude_ft / 100)} | {ac.speed_kts}kts | HDG {ac.heading}°
                    </div>
                  )}
                  <div className="text-text-dim">
                    Pilot: {ac.pilot} | Pad: {ac.pad}
                  </div>
                </div>
              </div>
            </div>
          </Marker>
        )
      })}
    </>
  )
}
