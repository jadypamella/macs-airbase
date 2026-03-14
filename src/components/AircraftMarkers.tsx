import { useMemo, useState, useCallback } from 'react'
import { Marker } from 'react-map-gl/maplibre'
import type { AircraftState, AircraftPhase } from '../constants'
import {
  RWY01_THRESHOLD,
  RWY19_THRESHOLD,
  RWY_EXIT_MID,
  RWY_EXIT_NORTH,
  RWY_NORTH_HP,
  RWY_SOUTH_HP,
  APRON_NORTH,
  APRON_CENTRAL,
} from '../data/runway-geometry'


const AC_STORAGE_KEY = 'aircraft-marker-positions'

interface AircraftMarkersProps {
  aircraft: Record<string, AircraftState> | undefined
  draggable?: boolean
  onAircraftClick?: (ac: AircraftState, screenPos: { x: number; y: number }) => void
  hideIds?: Set<string>
}

function loadSavedAc(): Record<string, [number, number]> {
  try {
    const raw = localStorage.getItem(AC_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

/* ── Phase-based positions — all on the EAST side (apron/hangars area) ── */
const SHELTER_POSITIONS: [number, number][] = [
  [15.2720, 56.2695],
  [15.2735, 56.2695],
  [15.2750, 56.2695],
  [15.2720, 56.2688],
  [15.2735, 56.2688],
  [15.2750, 56.2688],
]

const FUEL_POSITIONS: [number, number][] = [
  [15.2730, 56.2640],
  [15.2740, 56.2643],
  [15.2735, 56.2637],
  [15.2745, 56.2640],
  [15.2725, 56.2645],
  [15.2750, 56.2637],
]

const ARMING_POSITIONS: [number, number][] = [
  [15.2725, 56.2662],
  [15.2735, 56.2665],
  [15.2730, 56.2658],
  [15.2740, 56.2660],
  [15.2720, 56.2667],
  [15.2745, 56.2657],
]

const MAINT_POSITIONS: [number, number][] = [
  [15.2698, 56.2644],
  [15.2708, 56.2647],
  [15.2703, 56.2650],
  [15.2713, 56.2650],
  [15.2693, 56.2648],
  [15.2718, 56.2647],
]

// Runway centerline for TAXI / TAKEOFF / LANDING — real ESDF coordinates
const RUNWAY_SW = RWY01_THRESHOLD  // south threshold
const RUNWAY_NE = RWY19_THRESHOLD  // north threshold

function lerpRunway(t: number): [number, number] {
  return [
    RUNWAY_SW[0] + (RUNWAY_NE[0] - RUNWAY_SW[0]) * t,
    RUNWAY_SW[1] + (RUNWAY_NE[1] - RUNWAY_SW[1]) * t,
  ]
}

// Base center for airborne orbit (midpoint of runway)
const BASE_CENTER: [number, number] = [
  (RWY01_THRESHOLD[0] + RWY19_THRESHOLD[0]) / 2,
  (RWY01_THRESHOLD[1] + RWY19_THRESHOLD[1]) / 2,
]

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
      // On the parallel taxiway, between shelter and runway
      return [APRON_CENTRAL[0] + (slotIndex * 0.0005), APRON_CENTRAL[1] + (slotIndex * 0.0003)]

    case 'TAXI':
      // Positioned along taxiway route: apron → holding point → runway
      // Space aircraft along the taxiway network using real waypoints
      const taxiPoints: [number, number][] = [APRON_CENTRAL, RWY_EXIT_MID, RWY_NORTH_HP]
      const taxiIdx = slotIndex % taxiPoints.length
      return taxiPoints[taxiIdx]

    case 'TAKEOFF':
      // On the runway, rolling toward north end
      return lerpRunway(0.75 + (slotIndex * 0.08))

    case 'LANDING':
      // On the runway after touchdown, decelerating toward exit
      return lerpRunway(0.35 + (slotIndex * 0.1))

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

const GROUND_PHASES = new Set(['SHELTER', 'POST_FLIGHT', 'FUELING', 'ARMING', 'MAINTENANCE', 'GROUNDED', 'PRE_FLIGHT', 'TAXI', 'TAKEOFF', 'LANDING', 'AIRBORNE', 'RTB'])

/* Fixed position overrides set by user */
const POSITION_OVERRIDES: Record<string, [number, number]> = {
  'Gripen-01': [15.275611, 56.268341],
  'Gripen-02': [15.270269, 56.266204],
  'Gripen-03': [15.264073, 56.262692],
  'Gripen-04': [15.264410, 56.264218],
  'Gripen-05': [15.270799, 56.270064],
  'Gripen-06': [15.264870, 56.265781],
}

export function AircraftMarkers({ aircraft, draggable = false, onAircraftClick, hideIds }: AircraftMarkersProps) {
  const [overrides, setOverrides] = useState<Record<string, [number, number]>>(() => {
    const saved = loadSavedAc()
    // Merge: POSITION_OVERRIDES always wins, saved only for non-overridden aircraft
    const merged: Record<string, [number, number]> = {}
    for (const [k, v] of Object.entries(saved)) {
      if (!(k in POSITION_OVERRIDES)) merged[k] = v
    }
    return { ...merged, ...POSITION_OVERRIDES }
  })

  const markers = useMemo(() => {
    if (!aircraft) return []
    const entries = Object.values(aircraft)
      .filter(ac => GROUND_PHASES.has(ac.phase))
      .filter(ac => !hideIds || !hideIds.has(ac.id))
    const phaseCounters: Record<string, number> = {}
    return entries.map((ac, globalIndex) => {
      const phase = ac.phase
      const slotIndex = phaseCounters[phase] || 0
      phaseCounters[phase] = slotIndex + 1
      const position = overrides[ac.id] || getPhasePosition(phase, slotIndex, ac.heading, globalIndex, 0)
      return { ...ac, position }
    })
  }, [aircraft, overrides])

  const handleDragEnd = useCallback((id: string, e: any) => {
    const { lng, lat } = e.lngLat
    setOverrides(prev => {
      const next = { ...prev, [id]: [lng, lat] as [number, number] }
      localStorage.setItem(AC_STORAGE_KEY, JSON.stringify(next))
      console.log(`AIRCRAFT_POSITION ${id}: [${lng.toFixed(6)}, ${lat.toFixed(6)}]`)
      return next
    })
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
            <div
              className="relative group cursor-pointer"
              onClick={(clickEvt) => {
                if (onAircraftClick) {
                  const el = clickEvt.currentTarget as HTMLElement
                  const rect = el.getBoundingClientRect()
                  const mapEl = document.querySelector('.relative.flex-1.overflow-hidden')
                  const mapRect = mapEl ? mapEl.getBoundingClientRect() : { left: 0, top: 0 }
                  onAircraftClick(ac, {
                    x: rect.left - mapRect.left + rect.width / 2 - 110,
                    y: rect.top - mapRect.top - 100,
                  })
                }
              }}
            >
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

            </div>
          </Marker>
        )
      })}
    </>
  )
}
