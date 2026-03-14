import { useMemo, useState, useCallback, useEffect } from 'react'
import { Marker } from 'react-map-gl/maplibre'
import type { AircraftState, AircraftPhase } from '../constants'


const AC_STORAGE_KEY = 'aircraft-marker-positions'

interface AircraftMarkersProps {
  aircraft: Record<string, AircraftState> | undefined
  draggable?: boolean
}

function loadSavedAc(): Record<string, [number, number]> {
  try {
    const raw = localStorage.getItem(AC_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

/* ── Phase-based positions — all on the EAST side (apron/hangars area) ── */
const SHELTER_POSITIONS: [number, number][] = [
  [15.2720, 56.2700],
  [15.2735, 56.2705],
  [15.2750, 56.2700],
  [15.2725, 56.2693],
  [15.2740, 56.2693],
  [15.2755, 56.2693],
]

const FUEL_POSITIONS: [number, number][] = [
  [15.2700, 56.2680],
  [15.2715, 56.2683],
  [15.2710, 56.2675],
  [15.2725, 56.2678],
  [15.2695, 56.2685],
  [15.2730, 56.2673],
]

const ARMING_POSITIONS: [number, number][] = [
  [15.2755, 56.2680],
  [15.2770, 56.2683],
  [15.2760, 56.2675],
  [15.2775, 56.2678],
  [15.2750, 56.2685],
  [15.2780, 56.2673],
]

const MAINT_POSITIONS: [number, number][] = [
  [15.2710, 56.2710],
  [15.2725, 56.2713],
  [15.2715, 56.2718],
  [15.2730, 56.2718],
  [15.2705, 56.2715],
  [15.2740, 56.2715],
]

// Runway centerline for TAXI / TAKEOFF / LANDING
const RUNWAY_SW: [number, number] = [15.2480, 56.2635]
const RUNWAY_NE: [number, number] = [15.2830, 56.2720]

function lerpRunway(t: number): [number, number] {
  return [
    RUNWAY_SW[0] + (RUNWAY_NE[0] - RUNWAY_SW[0]) * t,
    RUNWAY_SW[1] + (RUNWAY_NE[1] - RUNWAY_SW[1]) * t,
  ]
}

// Base center for airborne orbit
const BASE_CENTER: [number, number] = [15.265, 56.267]

/* ── Phase → color ── */
const PHASE_COLORS: Record<string, string> = {
  AIRBORNE:    '#a3e635',
  RTB:         '#facc15',
  TAXI:        '#fb923c',
  TAKEOFF:     '#a3e635',
  LANDING:     '#facc15',
  FUELING:     '#f97316',
  ARMING:      '#ef4444',
  SHELTER:     '#94a3b8',
  PRE_FLIGHT:  '#a3e635',
  POST_FLIGHT: '#94a3b8',
  MAINTENANCE: '#8b5cf6',
  GROUNDED:    '#ef4444',
}

const PHASE_LABELS: Record<string, string> = {
  AIRBORNE: 'LUFTEN',
  RTB: 'RETUR',
  TAXI: 'TAXI',
  TAKEOFF: 'START',
  LANDING: 'LANDNING',
  FUELING: 'TANKNING',
  ARMING: 'BEVÄPNING',
  SHELTER: 'SKYDD',
  PRE_FLIGHT: 'FÖRFLYGN.',
  POST_FLIGHT: 'EFTERFLYGN.',
  MAINTENANCE: 'UNDERHÅLL',
  GROUNDED: 'MARKBUNDEN',
}

/* ── Per-phase index counters for slot allocation ── */
function getPhasePosition(
  phase: AircraftPhase,
  slotIndex: number,
  heading: number,
  acIndex: number,
  time: number,
): [number, number] {
  switch (phase) {
    case 'SHELTER':
    case 'POST_FLIGHT':
      return SHELTER_POSITIONS[slotIndex % SHELTER_POSITIONS.length]

    case 'FUELING':
      return FUEL_POSITIONS[slotIndex % FUEL_POSITIONS.length]

    case 'ARMING':
      return ARMING_POSITIONS[slotIndex % ARMING_POSITIONS.length]

    case 'MAINTENANCE':
    case 'GROUNDED':
      return MAINT_POSITIONS[slotIndex % MAINT_POSITIONS.length]

    case 'PRE_FLIGHT':
      // Near shelter, slightly toward runway
      const shelter = SHELTER_POSITIONS[slotIndex % SHELTER_POSITIONS.length]
      return [shelter[0] + 0.003, shelter[1] - 0.002]

    case 'TAXI':
      // Moving along runway - use slot to space them
      return lerpRunway(0.1 + (slotIndex * 0.15))

    case 'TAKEOFF':
      // Far end of runway
      return lerpRunway(0.7 + (slotIndex * 0.1))

    case 'LANDING':
      // Approaching runway
      return lerpRunway(0.3 + (slotIndex * 0.1))

    case 'AIRBORNE':
    case 'RTB': {
      // Orbit around base using heading + time for animation
      const rad = ((heading + time * 0.5) * Math.PI) / 180
      const dist = 0.025 + (acIndex * 0.008)
      return [
        BASE_CENTER[0] + Math.sin(rad) * dist,
        BASE_CENTER[1] + Math.cos(rad) * dist * 0.6,
      ]
    }

    default:
      return SHELTER_POSITIONS[slotIndex % SHELTER_POSITIONS.length]
  }
}

const GROUND_PHASES = new Set(['SHELTER', 'POST_FLIGHT', 'FUELING', 'ARMING', 'MAINTENANCE', 'GROUNDED', 'PRE_FLIGHT', 'TAXI', 'TAKEOFF', 'LANDING'])

/* Fixed position overrides set by user */
const POSITION_OVERRIDES: Record<string, [number, number]> = {
  'Gripen-03': [15.263333, 56.260772],
  'Gripen-04': [15.264146, 56.264281],
  'Gripen-05': [15.274118, 56.271807],
}

export function AircraftMarkers({ aircraft, draggable = false }: AircraftMarkersProps) {
  const [overrides, setOverrides] = useState<Record<string, [number, number]>>(() => ({
    ...POSITION_OVERRIDES,
    ...loadSavedAc(),
  }))

  const markers = useMemo(() => {
    if (!aircraft) return []
    const entries = Object.values(aircraft).filter(ac => GROUND_PHASES.has(ac.phase))
    const phaseCounters: Record<string, number> = {}
    return entries.map((ac, globalIndex) => {
      const phase = ac.phase
      const slotIndex = phaseCounters[phase] || 0
      phaseCounters[phase] = slotIndex + 1
      const position = overrides[ac.id] || getPhasePosition(phase, slotIndex, ac.heading, globalIndex, 0)
      return { ...ac, position }
    })
  }, [aircraft, overrides])

  useEffect(() => {
    if (!draggable) {
      localStorage.setItem(AC_STORAGE_KEY, JSON.stringify(overrides))
    }
  }, [draggable, overrides])

  const handleDragEnd = useCallback((id: string, e: any) => {
    const { lng, lat } = e.lngLat
    setOverrides(prev => ({ ...prev, [id]: [lng, lat] }))
  }, [])

  return (
    <>
      {markers.map((ac) => {
        const [lng, lat] = ac.position
        const color = PHASE_COLORS[ac.phase] || '#94a3b8'
        const isAirborne = ac.phase === 'AIRBORNE' || ac.phase === 'RTB' || ac.phase === 'TAKEOFF'
        const rotation = ac.heading || 0

        return (
          <Marker
            key={ac.id}
            latitude={lat}
            longitude={lng}
            anchor="center"
            draggable={draggable}
            onDragEnd={(e) => handleDragEnd(ac.id, e)}
          >
            <div className="relative group cursor-pointer">
              {/* Aircraft icon */}
              <div
                className="relative transition-transform duration-300"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <svg
                  width={isAirborne ? 30 : 24}
                  height={isAirborne ? 30 : 24}
                  viewBox="0 0 24 24"
                  fill="none"
                  className={isAirborne ? 'drop-shadow-[0_0_8px_rgba(163,230,53,0.5)]' : ''}
                >
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

              {/* Callsign label */}
              <div
                className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[7px] font-bold tracking-wider"
                style={{ color }}
              >
                {ac.id}
              </div>

              {/* Real-time info floating label */}
              <div
                className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[6px] font-mono tracking-wide px-1 rounded-sm"
                style={{
                  color,
                  backgroundColor: `${color}15`,
                }}
              >
                {isAirborne ? (
                  `FL${Math.round(ac.altitude_ft / 100)} ${ac.speed_kts}kt`
                ) : (
                  `${PHASE_LABELS[ac.phase] || ac.phase} ${ac.fuel_pct.toFixed(0)}%`
                )}
              </div>

              {/* Detailed tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-6 hidden group-hover:block z-50">
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
