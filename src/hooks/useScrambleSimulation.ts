import { useState, useRef, useCallback, useEffect } from 'react'
import {
  RWY01_THRESHOLD,
  RWY19_THRESHOLD,
  RWY_EXIT_MID,
  APRON_CENTRAL,
} from '../data/runway-geometry'

// ── Types ────────────────────────────────────────────────────────
export type SimPhase =
  | 'IDLE'         // parked at dislocation point
  | 'TAXI_OUT'     // taxi to runway
  | 'HOLDING'      // waiting at holding point
  | 'LINEUP'       // entering runway
  | 'TAKEOFF'      // acceleration roll
  | 'CLIMB'        // climbing out
  | 'ENROUTE'      // transit to mission
  | 'ON_STATION'   // orbiting mission area
  // ── Return phases ──
  | 'RTB'          // flying back toward base
  | 'APPROACH'     // descending on approach to runway
  | 'LANDING'      // decelerating on runway
  | 'TAXI_IN'      // taxi back to shelter
  | 'PARKED'       // back at dislocation point — done

export interface SimAircraft {
  id: string
  phase: SimPhase
  position: [number, number]
  heading: number
  speed: number
  altitude: number
  routeProgress: number
  trail: [number, number][]
  startDelay: number
  started: boolean
  phaseStartTime: number
  shelterPos: [number, number]
  returning: boolean           // true when recall has been issued
}

export interface ScrambleSimulation {
  aircraft: SimAircraft[]
  isRunning: boolean
  isReturning: boolean
  elapsedMs: number
  startScramble: (ids?: string[]) => void
  recallScramble: () => void
  simulatedIds: Set<string>
}

// ── Math ─────────────────────────────────────────────────────────
function bearingDeg(from: [number, number], to: [number, number]): number {
  const dLng = ((to[0] - from[0]) * Math.PI) / 180
  const lat1 = (from[1] * Math.PI) / 180
  const lat2 = (to[1] * Math.PI) / 180
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}
function lerpN(a: number, b: number, t: number): number { return a + (b - a) * t }
function lerpPt(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}
function geodist(a: [number, number], b: [number, number]): number {
  const dx = a[0] - b[0], dy = a[1] - b[1]; return Math.sqrt(dx * dx + dy * dy)
}
function offsetPoint(origin: [number, number], brng: number, km: number): [number, number] {
  const R = 6371, lat1 = (origin[1] * Math.PI) / 180, lon1 = (origin[0] * Math.PI) / 180
  const b = (brng * Math.PI) / 180, d = km / R
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b))
  const lon2 = lon1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2))
  return [(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI]
}
function lerpAngle(from: number, to: number, t: number): number {
  const diff = ((to - from + 540) % 360) - 180
  return ((from + diff * t) + 360) % 360
}
function catmullRom(p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], t: number): [number, number] {
  const t2 = t * t, t3 = t2 * t
  return [
    0.5 * ((2*p1[0]) + (-p0[0]+p2[0])*t + (2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2 + (-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
    0.5 * ((2*p1[1]) + (-p0[1]+p2[1])*t + (2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2 + (-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3),
  ]
}
function sampleRoute(route: [number, number][], t: number): { pos: [number, number]; hdg: number } {
  if (route.length < 2) return { pos: route[0] || [0, 0], hdg: 0 }
  const segLens: number[] = []; let totalLen = 0
  for (let i = 0; i < route.length - 1; i++) { const d = geodist(route[i], route[i+1]); segLens.push(d); totalLen += d }
  const target = Math.max(0, Math.min(1, t)) * totalLen
  let acc = 0
  for (let i = 0; i < segLens.length; i++) {
    if (acc + segLens[i] >= target || i === segLens.length - 1) {
      const segT = segLens[i] > 0 ? (target - acc) / segLens[i] : 0
      const p0 = route[Math.max(0,i-1)], p1 = route[i], p2 = route[Math.min(route.length-1,i+1)], p3 = route[Math.min(route.length-1,i+2)]
      const pos = catmullRom(p0, p1, p2, p3, segT)
      const fwd = Math.min(1, t + 0.008) * totalLen; let fa = 0; let fp = pos
      for (let j = 0; j < segLens.length; j++) {
        if (fa + segLens[j] >= fwd || j === segLens.length - 1) {
          const ft = segLens[j] > 0 ? (fwd-fa)/segLens[j] : 0
          fp = catmullRom(route[Math.max(0,j-1)], route[j], route[Math.min(route.length-1,j+1)], route[Math.min(route.length-1,j+2)], ft)
          break
        }
        fa += segLens[j]
      }
      return { pos, hdg: bearingDeg(pos, fp) }
    }
    acc += segLens[i]
  }
  return { pos: route[route.length-1], hdg: 0 }
}

// ── Positions ────────────────────────────────────────────────────
const DISLOCATION_POINTS: Record<string, [number, number]> = {
  'Gripen-01': [15.275611, 56.268341],
  'Gripen-02': [15.270269, 56.266204],
  'Gripen-03': [15.264073, 56.262692],
  'Gripen-04': [15.264410, 56.264218],
  'Gripen-05': [15.270799, 56.270064],
  'Gripen-06': [15.264870, 56.265781],
}
const THREAT_AREA: [number, number] = [15.520, 56.380]
const BASE_CENTER: [number, number] = [
  (RWY01_THRESHOLD[0] + RWY19_THRESHOLD[0]) / 2,
  (RWY01_THRESHOLD[1] + RWY19_THRESHOLD[1]) / 2,
]

// ── Outbound routes ──────────────────────────────────────────────
function taxiRoute(startPos: [number, number]): [number, number][] {
  return [
    startPos,
    [startPos[0] + (APRON_CENTRAL[0]-startPos[0])*0.3, startPos[1] + (APRON_CENTRAL[1]-startPos[1])*0.3],
    [startPos[0] + (APRON_CENTRAL[0]-startPos[0])*0.6, startPos[1] + (APRON_CENTRAL[1]-startPos[1])*0.6],
    APRON_CENTRAL,
    [15.2720, 56.2670], [15.2712, 56.2668],
    [15.2700, 56.2667], [15.2690, 56.2667],
    RWY_EXIT_MID,
  ]
}
function lineupRoute(): [number, number][] {
  return [RWY_EXIT_MID, lerpPt(RWY01_THRESHOLD, RWY19_THRESHOLD, 0.48), lerpPt(RWY01_THRESHOLD, RWY19_THRESHOLD, 0.44)]
}
function takeoffRoute(): [number, number][] {
  const pts: [number, number][] = []
  for (let t = 0.44; t <= 1.0; t += 0.04) pts.push(lerpPt(RWY01_THRESHOLD, RWY19_THRESHOLD, Math.min(t, 1)))
  return pts
}
function climbRoute(acIdx: number): [number, number][] {
  const rwyHdg = 4
  const p1 = offsetPoint(RWY19_THRESHOLD, rwyHdg, 1.0)
  const p2 = offsetPoint(RWY19_THRESHOLD, rwyHdg, 2.5)
  const threatBrg = bearingDeg(p2, THREAT_AREA)
  const turnOff = (acIdx - 2.5) * 3
  const p3 = offsetPoint(p2, lerpN(rwyHdg, threatBrg+turnOff, 0.4), 3.0)
  const p4 = offsetPoint(p3, lerpN(rwyHdg, threatBrg+turnOff, 0.7), 4.0)
  const p5 = offsetPoint(p4, threatBrg+turnOff, 5.0)
  return [RWY19_THRESHOLD, p1, p2, p3, p4, p5]
}
function enrouteRoute(acIdx: number, climbEnd: [number, number]): [number, number][] {
  const turnOff = (acIdx - 2.5) * 3
  const brg = bearingDeg(climbEnd, THREAT_AREA) + turnOff
  const p1 = offsetPoint(climbEnd, brg, 5), p2 = offsetPoint(p1, brg, 6)
  const mission = offsetPoint(THREAT_AREA, brg+180, 5+acIdx*2)
  return [climbEnd, p1, p2, mission]
}

// ── Return routes ────────────────────────────────────────────────
// RTB: from current position, fly back toward base
function rtbRoute(fromPos: [number, number], acIdx: number): [number, number][] {
  const brg = bearingDeg(fromPos, BASE_CENTER)
  const d = geodist(fromPos, BASE_CENTER) * 111  // rough km
  const p1 = offsetPoint(fromPos, brg, d * 0.3)
  const p2 = offsetPoint(p1, brg, d * 0.3)
  // Arrive at approach entry point (south of runway, offset for ILS approach)
  const approachEntry = offsetPoint(RWY19_THRESHOLD, 184 + 4, 8)  // 8km south on runway extended
  return [fromPos, p1, p2, approachEntry]
}

// Approach: descend from 8km south straight in to runway 19
function approachRoute(): [number, number][] {
  const rwyHdg = 4  // landing on RWY 19 = heading 184, approach from 004
  return [
    offsetPoint(RWY19_THRESHOLD, 184 + rwyHdg, 8),     // 8km final
    offsetPoint(RWY19_THRESHOLD, 184 + rwyHdg, 5),     // 5km
    offsetPoint(RWY19_THRESHOLD, 184 + rwyHdg, 2.5),   // 2.5km
    offsetPoint(RWY19_THRESHOLD, 184 + rwyHdg, 1),     // 1km short final
    lerpPt(RWY01_THRESHOLD, RWY19_THRESHOLD, 0.85),    // touchdown zone
  ]
}

// Landing roll: decelerate on runway
function landingRoute(): [number, number][] {
  return [
    lerpPt(RWY01_THRESHOLD, RWY19_THRESHOLD, 0.85),
    lerpPt(RWY01_THRESHOLD, RWY19_THRESHOLD, 0.75),
    lerpPt(RWY01_THRESHOLD, RWY19_THRESHOLD, 0.65),
    lerpPt(RWY01_THRESHOLD, RWY19_THRESHOLD, 0.55),
    RWY_EXIT_MID,                                       // exit at TWY B
  ]
}

// Taxi in: from runway exit back to shelter (reverse of taxi out)
function taxiInRoute(shelterPos: [number, number]): [number, number][] {
  return [
    RWY_EXIT_MID,
    [15.2690, 56.2667], [15.2700, 56.2667],
    [15.2712, 56.2668], [15.2720, 56.2670],
    APRON_CENTRAL,
    [shelterPos[0] + (APRON_CENTRAL[0]-shelterPos[0])*0.6, shelterPos[1] + (APRON_CENTRAL[1]-shelterPos[1])*0.6],
    [shelterPos[0] + (APRON_CENTRAL[0]-shelterPos[0])*0.3, shelterPos[1] + (APRON_CENTRAL[1]-shelterPos[1])*0.3],
    shelterPos,
  ]
}

// ── Phase durations ──────────────────────────────────────────────
const PHASE_DURATION: Record<SimPhase, number> = {
  IDLE: 0, TAXI_OUT: 40000, HOLDING: 4000, LINEUP: 6000,
  TAKEOFF: 10000, CLIMB: 18000, ENROUTE: 25000, ON_STATION: Infinity,
  RTB: 20000, APPROACH: 18000, LANDING: 10000, TAXI_IN: 35000, PARKED: Infinity,
}
const PHASE_SPEED: Record<SimPhase, [number, number]> = {
  IDLE: [0,0], TAXI_OUT: [0,18], HOLDING: [0,0], LINEUP: [5,8],
  TAKEOFF: [8,160], CLIMB: [160,400], ENROUTE: [400,520], ON_STATION: [480,500],
  RTB: [480,350], APPROACH: [300,145], LANDING: [140,15], TAXI_IN: [15,0], PARKED: [0,0],
}
const PHASE_ALT: Record<SimPhase, [number, number]> = {
  IDLE: [0,0], TAXI_OUT: [0,0], HOLDING: [0,0], LINEUP: [0,0],
  TAKEOFF: [0,100], CLIMB: [100,18000], ENROUTE: [18000,30000], ON_STATION: [30000,32000],
  RTB: [30000,5000], APPROACH: [5000,100], LANDING: [100,0], TAXI_IN: [0,0], PARKED: [0,0],
}

const STAGGER_SCHEDULE = [0, 3000, 12000, 15000, 24000, 27000]
// Stagger for return — pairs return together, spaced ~8s
const RETURN_STAGGER = [0, 3000, 8000, 11000, 16000, 19000]

// ── Orbit on station ─────────────────────────────────────────────
function onStationPos(acIdx: number, phaseElapsed: number): { pos: [number, number]; hdg: number } {
  const angle = ((phaseElapsed * 0.012) + acIdx * 60) % 360
  const rad = (angle * Math.PI) / 180
  const off = (acIdx - 2.5) * 3
  const center = offsetPoint(THREAT_AREA, 180 + off, 8 + acIdx * 1.5)
  const r = 0.025 + (acIdx % 3) * 0.005
  return { pos: [center[0]+Math.sin(rad)*r, center[1]+Math.cos(rad)*r*0.55], hdg: (angle+90)%360 }
}

// ── Easing functions ─────────────────────────────────────────────
function easePhase(phase: SimPhase, rawP: number): number {
  switch (phase) {
    case 'TAXI_OUT': case 'TAXI_IN':
      return rawP < 0.1 ? rawP*rawP*10 : rawP > 0.9 ? 1-(1-rawP)*(1-rawP)*10 : rawP
    case 'LINEUP':
      return rawP * rawP
    case 'TAKEOFF':
      return rawP * rawP * rawP
    case 'CLIMB': case 'ENROUTE': case 'RTB':
      return 1 - Math.pow(1-rawP, 2)
    case 'APPROACH':
      // Slow approach, decelerate toward end
      return rawP < 0.3 ? rawP*rawP/0.3 : rawP
    case 'LANDING':
      // Rapid initial decel, then slow
      return 1 - Math.pow(1-rawP, 1.5)
    default:
      return rawP
  }
}

// ══════════════════════════════════════════════════════════════════
export function useScrambleSimulation(): ScrambleSimulation {
  const [aircraft, setAircraft] = useState<SimAircraft[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [isReturning, setIsReturning] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const rafRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const prevTimeRef = useRef<number>(0)
  const climbEndCache = useRef<Record<string, [number, number]>>({})
  const rtbStartCache = useRef<Record<string, [number, number]>>({})
  const recallTimeRef = useRef<number>(0)
  const activeIdsRef = useRef<string[]>([])

  const simulatedIds = new Set(
    isRunning ? aircraft.filter(ac => ac.phase !== 'PARKED').map(ac => ac.id) : []
  )

  function buildAircraft(ids: string[]): SimAircraft[] {
    return ids.map((id, i) => {
      const pos = DISLOCATION_POINTS[id] || [15.270+i*0.002, 56.267]
      return {
        id, phase: 'IDLE' as SimPhase, position: pos, heading: 180,
        speed: 0, altitude: 0, routeProgress: 0, trail: [],
        startDelay: STAGGER_SCHEDULE[i] || i * 10000,
        started: false, phaseStartTime: 0, shelterPos: pos, returning: false,
      }
    })
  }

  // ── Outbound phase order ──
  const OUT_PHASES: SimPhase[] = ['IDLE','TAXI_OUT','HOLDING','LINEUP','TAKEOFF','CLIMB','ENROUTE','ON_STATION']
  // ── Return phase order ──
  const RET_PHASES: SimPhase[] = ['RTB','APPROACH','LANDING','TAXI_IN','PARKED']

  function getRoute(ac: SimAircraft, acIdx: number): [number, number][] {
    switch (ac.phase) {
      case 'TAXI_OUT': return taxiRoute(ac.shelterPos)
      case 'LINEUP':   return lineupRoute()
      case 'TAKEOFF':  return takeoffRoute()
      case 'CLIMB':    return climbRoute(acIdx)
      case 'ENROUTE': {
        const end = climbEndCache.current[ac.id] || ac.trail[ac.trail.length-1] || ac.position
        return enrouteRoute(acIdx, end)
      }
      case 'RTB': {
        const start = rtbStartCache.current[ac.id] || ac.position
        return rtbRoute(start, acIdx)
      }
      case 'APPROACH': return approachRoute()
      case 'LANDING':  return landingRoute()
      case 'TAXI_IN':  return taxiInRoute(ac.shelterPos)
      default: return []
    }
  }

  function advancePhase(ac: SimAircraft, acIdx: number, timestamp: number): SimAircraft {
    if (ac.returning) {
      const idx = RET_PHASES.indexOf(ac.phase)
      if (idx < RET_PHASES.length - 1) {
        return { ...ac, phase: RET_PHASES[idx+1], routeProgress: 0, phaseStartTime: timestamp }
      }
      return ac // already PARKED
    }
    const idx = OUT_PHASES.indexOf(ac.phase)
    if (idx < OUT_PHASES.length - 1) {
      const nextP = OUT_PHASES[idx+1]
      if (ac.phase === 'CLIMB') climbEndCache.current[ac.id] = ac.position
      return { ...ac, phase: nextP, routeProgress: 0, phaseStartTime: timestamp, started: true }
    }
    return ac
  }

  // Initiate return for an aircraft (can be called from any airborne phase)
  function initiateReturn(ac: SimAircraft, acIdx: number, timestamp: number, delay: number): SimAircraft {
    if (ac.returning || ac.phase === 'PARKED') return ac
    // If still on ground (not yet airborne), skip RTB/approach — just stop and go back
    const groundPhases: SimPhase[] = ['IDLE','TAXI_OUT','HOLDING','LINEUP']
    if (groundPhases.includes(ac.phase)) {
      // Reverse taxi directly back to shelter
      return { ...ac, returning: true, phase: 'TAXI_IN', routeProgress: 0, phaseStartTime: timestamp + delay, trail: [] }
    }
    // If on takeoff/climb, let them continue to a safe point then RTB
    if (ac.phase === 'TAKEOFF') {
      // Let takeoff complete naturally, it will advance to CLIMB, then we'll catch it
      return { ...ac, returning: true }
    }
    // Airborne phases: initiate RTB
    rtbStartCache.current[ac.id] = ac.position
    return { ...ac, returning: true, phase: 'RTB', routeProgress: 0, phaseStartTime: timestamp + delay, trail: [] }
  }

  const tick = useCallback((timestamp: number) => {
    if (!startTimeRef.current) { startTimeRef.current = timestamp; prevTimeRef.current = timestamp }
    const elapsed = timestamp - startTimeRef.current
    const dt = Math.min(timestamp - prevTimeRef.current, 50)
    prevTimeRef.current = timestamp
    setElapsedMs(elapsed)

    setAircraft(prev => {
      const next = prev.map((ac, acIdx) => {
        // ── PARKED: done, no updates ──
        if (ac.phase === 'PARKED') return ac

        // ── Stagger delay (outbound only) ──
        if (!ac.started && !ac.returning && elapsed < ac.startDelay) return ac
        if (!ac.started && ac.phase === 'IDLE' && !ac.returning) return advancePhase(ac, acIdx, timestamp)

        // ── If returning flag set during CLIMB, initiate RTB once climb ends ──
        if (ac.returning && ['CLIMB', 'ENROUTE', 'ON_STATION'].includes(ac.phase)) {
          // For ON_STATION/ENROUTE, start RTB now
          if (ac.phase !== 'CLIMB') {
            rtbStartCache.current[ac.id] = ac.position
            return { ...ac, phase: 'RTB' as SimPhase, routeProgress: 0, phaseStartTime: timestamp, trail: [] }
          }
          // For CLIMB, let it finish naturally — advancePhase will handle it
        }

        // ── Override: if returning and phase advances past ON_STATION to something wrong ──
        if (ac.returning && ac.phase === 'ON_STATION') {
          rtbStartCache.current[ac.id] = ac.position
          return { ...ac, phase: 'RTB' as SimPhase, routeProgress: 0, phaseStartTime: timestamp, trail: [] }
        }

        // ── ON_STATION orbit ──
        if (ac.phase === 'ON_STATION' && !ac.returning) {
          const { pos, hdg } = onStationPos(acIdx, timestamp - ac.phaseStartTime)
          const sH = lerpAngle(ac.heading, hdg, Math.min(1, dt*0.004))
          const spd = lerpN(ac.speed, 490, Math.min(1, dt*0.001))
          const alt = lerpN(ac.altitude, 31000, Math.min(1, dt*0.0005))
          const shouldT = ac.trail.length === 0 || geodist(pos, ac.trail[ac.trail.length-1]) > 0.0008
          return { ...ac, position: pos, heading: sH, speed: spd, altitude: alt, trail: shouldT ? [...ac.trail.slice(-200), pos] : ac.trail }
        }

        // ── HOLDING: wait then advance ──
        if (ac.phase === 'HOLDING') {
          const pe = timestamp - ac.phaseStartTime
          if (pe >= PHASE_DURATION.HOLDING) return advancePhase(ac, acIdx, timestamp)
          return { ...ac, speed: lerpN(ac.speed, 0, Math.min(1, dt*0.005)) }
        }

        // ── Route-following ──
        const dur = PHASE_DURATION[ac.phase]
        const pe = timestamp - ac.phaseStartTime
        if (pe < 0) return ac  // waiting for staggered return start
        const route = getRoute(ac, acIdx)
        if (route.length < 2) {
          if (pe > 200) return advancePhase(ac, acIdx, timestamp)
          return ac
        }
        const rawP = dur > 0 && dur < Infinity ? pe / dur : (pe > 200 ? 1 : 0)
        const progress = Math.max(0, Math.min(1, easePhase(ac.phase, rawP)))

        if (rawP >= 1) {
          // On return: if CLIMB completes while returning, go to RTB
          if (ac.returning && ac.phase === 'CLIMB') {
            rtbStartCache.current[ac.id] = ac.position
            return { ...ac, phase: 'RTB' as SimPhase, routeProgress: 0, phaseStartTime: timestamp, trail: [] }
          }
          return advancePhase(ac, acIdx, timestamp)
        }

        const { pos, hdg: targetHdg } = sampleRoute(route, progress)
        const hdgRate = ['TAKEOFF','LANDING'].includes(ac.phase) ? 0.006 : ['TAXI_OUT','TAXI_IN','LINEUP'].includes(ac.phase) ? 0.003 : 0.004
        const sH = lerpAngle(ac.heading, targetHdg, Math.min(1, dt*hdgRate))
        const [sMin, sMax] = PHASE_SPEED[ac.phase]
        const [aMin, aMax] = PHASE_ALT[ac.phase]
        const spd = lerpN(ac.speed, lerpN(sMin, sMax, progress), Math.min(1, dt*0.002))
        const alt = lerpN(ac.altitude, lerpN(aMin, aMax, progress), Math.min(1, dt*0.002))
        const trailD = ['TAXI_OUT','TAXI_IN','LINEUP','LANDING'].includes(ac.phase) ? 0.00012 : 0.0005
        const shouldT = ac.trail.length === 0 || geodist(pos, ac.trail[ac.trail.length-1]) > trailD
        const trail = shouldT ? [...ac.trail.slice(-250), pos] : ac.trail

        return { ...ac, position: pos, heading: sH, speed: spd, altitude: alt, routeProgress: progress, trail }
      })

      // Check if all returned — auto-stop
      if (next.every(ac => ac.phase === 'PARKED' || ac.phase === 'IDLE')) {
        // All back — will stop on next frame check
      }

      return next
    })

    // Check if we should stop
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  // Auto-stop when all aircraft are PARKED
  useEffect(() => {
    if (isRunning && isReturning && aircraft.length > 0 && aircraft.every(ac => ac.phase === 'PARKED')) {
      cancelAnimationFrame(rafRef.current)
      setIsRunning(false)
      setIsReturning(false)
      setAircraft([])
    }
  }, [aircraft, isRunning, isReturning])

  const startScramble = useCallback((ids?: string[]) => {
    if (isRunning) return
    const selectedIds = ids || Object.keys(DISLOCATION_POINTS)
    activeIdsRef.current = selectedIds
    climbEndCache.current = {}; rtbStartCache.current = {}
    setAircraft(buildAircraft(selectedIds))
    setIsRunning(true); setIsReturning(false)
    startTimeRef.current = 0; prevTimeRef.current = 0
    rafRef.current = requestAnimationFrame(tick)
  }, [isRunning, tick])

  const recallScramble = useCallback(() => {
    if (!isRunning || isReturning) return
    setIsReturning(true)
    recallTimeRef.current = performance.now()
    // Trigger return for all aircraft with staggered delays
    setAircraft(prev => prev.map((ac, i) => {
      const delay = RETURN_STAGGER[i] || i * 5000
      return initiateReturn(ac, i, performance.now(), delay)
    }))
  }, [isRunning, isReturning])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  return { aircraft, isRunning, isReturning, elapsedMs, startScramble, recallScramble, simulatedIds }
}
