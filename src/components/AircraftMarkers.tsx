import { useMemo } from 'react'
import { Marker } from 'react-map-gl/maplibre'
import type { AircraftState } from '../constants'


interface AircraftMarkersProps {
  aircraft: Record<string, AircraftState> | undefined
}

// Positions along the takeoff runway centerline (west ↔ east)
// Linha de dispersão solicitada (SW → NE), ajustável por 2 pontos
const RED_LINE_START: [number, number] = [15.2595, 56.2618]
const RED_LINE_END: [number, number] = [15.2758, 56.2706]

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

function getAircraftPosition(index: number, total: number): [number, number] {
  const t = total > 1 ? index / (total - 1) : 0.5
  const lng = RED_LINE_START[0] + (RED_LINE_END[0] - RED_LINE_START[0]) * t
  const lat = RED_LINE_START[1] + (RED_LINE_END[1] - RED_LINE_START[1]) * t
  return [lng, lat]
}

export function AircraftMarkers({ aircraft }: AircraftMarkersProps) {
  const markers = useMemo(() => {
    if (!aircraft) return []
    const entries = Object.values(aircraft)
    const total = entries.length
    return entries.map((ac, i) => ({
      ...ac,
      position: getAircraftPosition(i, total),
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
                  {/* Fighter jet silhouette - top-down view */}
                  <path
                    d="M12 3L11 7L11 9L4 13L4 15L11 13L11 17L8 19L8 21L12 19.5L16 21L16 19L13 17L13 13L20 15L20 13L13 9L13 7L12 3Z"
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
