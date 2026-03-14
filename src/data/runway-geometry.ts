/**
 * Precise runway & taxiway geometry for Ronneby Airport (ESDF / F17 Wing)
 * Source: SkyVector / Swedish AIP
 *
 * Runway 01/19 — 2,331 m × 45 m, heading 004°/184°, asphalt
 * Runway 12/30 — 600 m × 30 m (cross-runway)
 *
 * Coordinates are [longitude, latitude] (GeoJSON order).
 */

// ── Helper: offset a point along a bearing (degrees) by distance (km) ──
function offsetPoint(
  origin: [number, number],
  bearingDeg: number,
  distanceKm: number,
): [number, number] {
  const R = 6371
  const lat1 = (origin[1] * Math.PI) / 180
  const lon1 = (origin[0] * Math.PI) / 180
  const brng = (bearingDeg * Math.PI) / 180
  const d = distanceKm / R

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng),
  )
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    )

  return [(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI]
}

function lerp(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

// ── Runway 01/19 thresholds (exact from SkyVector) ───────────────
export const RWY01_THRESHOLD: [number, number] = [15.26250, 56.25700]
export const RWY19_THRESHOLD: [number, number] = [15.26817, 56.27767]

// ── Runway 12/30 thresholds ──────────────────────────────────────
export const RWY12_THRESHOLD: [number, number] = [15.26683, 56.25683]
export const RWY30_THRESHOLD: [number, number] = [15.27583, 56.25483]

// ── Runway constants ─────────────────────────────────────────────
export const RWY_01_19_HEADING = 4
export const RWY_01_19_WIDTH_M = 45

// ── Key points along runway 01/19 ───────────────────────────────
// t=0 is RWY01 (south), t=1 is RWY19 (north)
const RWY_POINT = (t: number) => lerp(RWY01_THRESHOLD, RWY19_THRESHOLD, t)

// Named points on the runway for taxiway connections
const RWY_SOUTH_HP = RWY_POINT(0.05)     // Holding point south (near RWY01 threshold)
const RWY_EXIT_SOUTH = RWY_POINT(0.20)   // Southern taxiway exit
const RWY_EXIT_MID = RWY_POINT(0.50)     // Central taxiway exit
const RWY_EXIT_NORTH = RWY_POINT(0.78)   // Northern taxiway exit
const RWY_NORTH_HP = RWY_POINT(0.95)     // Holding point north (near RWY19 threshold)

// ── Runway centerlines as GeoJSON ────────────────────────────────
export const RUNWAY_01_19_LINE = {
  type: 'Feature' as const,
  properties: { id: 'rwy-01-19', label: '01/19', primary: true },
  geometry: {
    type: 'LineString' as const,
    coordinates: [RWY01_THRESHOLD, RWY19_THRESHOLD],
  },
}

export const RUNWAY_12_30_LINE = {
  type: 'Feature' as const,
  properties: { id: 'rwy-12-30', label: '12/30', primary: false },
  geometry: {
    type: 'LineString' as const,
    coordinates: [RWY12_THRESHOLD, RWY30_THRESHOLD],
  },
}

// ── Runway polygon (surface with real width) ─────────────────────
function runwayPolygon(
  t1: [number, number],
  t2: [number, number],
  headingDeg: number,
  widthM: number,
): [number, number][] {
  const hw = widthM / 2000
  const tl = offsetPoint(t1, headingDeg + 90, hw)
  const tr = offsetPoint(t1, headingDeg - 90, hw)
  const br = offsetPoint(t2, headingDeg - 90, hw)
  const bl = offsetPoint(t2, headingDeg + 90, hw)
  return [tl, tr, br, bl, tl]
}

export const RUNWAY_01_19_POLYGON = {
  type: 'Feature' as const,
  properties: { id: 'rwy-01-19-surface', label: '01/19' },
  geometry: {
    type: 'Polygon' as const,
    coordinates: [runwayPolygon(RWY01_THRESHOLD, RWY19_THRESHOLD, 4, 45)],
  },
}

// ══════════════════════════════════════════════════════════════════
// TAXIWAYS — ground movement routes (east side of runway)
// ══════════════════════════════════════════════════════════════════
// The apron, shelters, fuel depot, and arming pads are all EAST of the
// runway. Taxiways connect perpendicular from the runway to a parallel
// taxiway that runs north–south along the eastern infrastructure.

// ── Apron/infrastructure reference points (from existing data) ──
const APRON_NORTH: [number, number] = [15.2730, 56.2695]   // Shelters area
const APRON_CENTRAL: [number, number] = [15.2725, 56.2673]  // Main apron
const APRON_SOUTH: [number, number] = [15.2720, 56.2645]   // Fuel/maintenance

// ── Parallel taxiway (runs N-S east of runway) ──────────────────
// This is the "backbone" — aircraft taxi along this to reach any exit
const PARALLEL_TWY_NORTH: [number, number] = [15.2718, 56.2710]
const PARALLEL_TWY_SOUTH: [number, number] = [15.2700, 56.2590]

export const TAXIWAY_PARALLEL = {
  type: 'Feature' as const,
  properties: { id: 'twy-parallel', label: 'TWY α', type: 'taxiway' },
  geometry: {
    type: 'LineString' as const,
    coordinates: [
      PARALLEL_TWY_SOUTH,
      [15.2705, 56.2620],
      APRON_SOUTH,
      APRON_CENTRAL,
      APRON_NORTH,
      PARALLEL_TWY_NORTH,
    ],
  },
}

// ── Taxiway A — south exit (connects runway to parallel TWY) ────
const TWY_A_RWY = RWY_EXIT_SOUTH
const TWY_A_MID = offsetPoint(TWY_A_RWY, 94, 0.12)  // 120m east
const TWY_A_END: [number, number] = [15.2700, 56.2610]

export const TAXIWAY_A = {
  type: 'Feature' as const,
  properties: { id: 'twy-a', label: 'TWY A', type: 'taxiway' },
  geometry: {
    type: 'LineString' as const,
    coordinates: [TWY_A_RWY, TWY_A_MID, TWY_A_END],
  },
}

// ── Taxiway B — central exit (main entry/exit to apron) ─────────
const TWY_B_RWY = RWY_EXIT_MID
const TWY_B_MID = offsetPoint(TWY_B_RWY, 94, 0.15)  // 150m east

export const TAXIWAY_B = {
  type: 'Feature' as const,
  properties: { id: 'twy-b', label: 'TWY B', type: 'taxiway' },
  geometry: {
    type: 'LineString' as const,
    coordinates: [TWY_B_RWY, TWY_B_MID, APRON_CENTRAL],
  },
}

// ── Taxiway C — north exit (connects to shelters) ───────────────
const TWY_C_RWY = RWY_EXIT_NORTH
const TWY_C_MID = offsetPoint(TWY_C_RWY, 94, 0.12)  // 120m east

export const TAXIWAY_C = {
  type: 'Feature' as const,
  properties: { id: 'twy-c', label: 'TWY C', type: 'taxiway' },
  geometry: {
    type: 'LineString' as const,
    coordinates: [TWY_C_RWY, TWY_C_MID, APRON_NORTH],
  },
}

// ── Taxiway D — end-of-runway turnaround (south) ────────────────
const TWY_D_TURN = offsetPoint(RWY01_THRESHOLD, 94, 0.08)

export const TAXIWAY_D = {
  type: 'Feature' as const,
  properties: { id: 'twy-d', label: 'TWY D', type: 'taxiway' },
  geometry: {
    type: 'LineString' as const,
    coordinates: [RWY_SOUTH_HP, TWY_D_TURN, PARALLEL_TWY_SOUTH],
  },
}

// ── Taxiway E — end-of-runway turnaround (north) ────────────────
const TWY_E_TURN = offsetPoint(RWY19_THRESHOLD, 94, 0.08)

export const TAXIWAY_E = {
  type: 'Feature' as const,
  properties: { id: 'twy-e', label: 'TWY E', type: 'taxiway' },
  geometry: {
    type: 'LineString' as const,
    coordinates: [RWY_NORTH_HP, TWY_E_TURN, PARALLEL_TWY_NORTH],
  },
}

// ══════════════════════════════════════════════════════════════════
// AIRCRAFT GROUND ROUTES — complete paths for each movement
// ══════════════════════════════════════════════════════════════════
// These are the full taxi routes a Gripen would follow for each phase

// Shelter → Runway (takeoff preparation)
export const ROUTE_SHELTER_TO_RUNWAY: [number, number][] = [
  APRON_NORTH,                 // Leave shelter area
  APRON_CENTRAL,               // Taxi south on parallel TWY
  APRON_CENTRAL,               // Hold at apron
  TWY_B_MID,                   // Turn onto TWY B
  TWY_B_RWY,                   // Reach runway
  RWY_NORTH_HP,                // Taxi to departure end (runway 01 → north end)
]

// Runway → Shelter (after landing)
export const ROUTE_RUNWAY_TO_SHELTER: [number, number][] = [
  RWY_EXIT_NORTH,              // Exit runway at north exit
  TWY_C_MID,                   // Taxiway C
  APRON_NORTH,                 // Arrive at shelter area
]

// Shelter → Fuel Depot
export const ROUTE_SHELTER_TO_FUEL: [number, number][] = [
  APRON_NORTH,
  APRON_CENTRAL,
  APRON_SOUTH,                 // Fuel depot area
]

// Shelter → Arming Pad
export const ROUTE_SHELTER_TO_ARMING: [number, number][] = [
  APRON_NORTH,
  [15.2730, 56.2685],          // Slight detour east
  [15.2735, 56.2665],          // Arming pad area
]

// Fuel → Runway (post-fuel, heading to takeoff)
export const ROUTE_FUEL_TO_RUNWAY: [number, number][] = [
  APRON_SOUTH,
  APRON_CENTRAL,
  TWY_B_MID,
  TWY_B_RWY,                   // Enter runway
]

// ── Holding points (where aircraft wait before entering runway) ──
export const HOLDING_POINTS = [
  { id: 'hp-south', position: RWY_SOUTH_HP, label: 'HP 01', runway: '01' },
  { id: 'hp-north', position: RWY_NORTH_HP, label: 'HP 19', runway: '19' },
  { id: 'hp-b', position: TWY_B_MID, label: 'HP B', runway: '01/19' },
]

// ══════════════════════════════════════════════════════════════════
// GeoJSON COLLECTIONS for MapLibre rendering
// ══════════════════════════════════════════════════════════════════

export const ALL_RUNWAY_FEATURES = {
  type: 'FeatureCollection' as const,
  features: [RUNWAY_01_19_LINE, RUNWAY_12_30_LINE],
}

export const ALL_TAXIWAY_FEATURES = {
  type: 'FeatureCollection' as const,
  features: [
    TAXIWAY_PARALLEL,
    TAXIWAY_A,
    TAXIWAY_B,
    TAXIWAY_C,
    TAXIWAY_D,
    TAXIWAY_E,
  ],
}

export const ALL_RUNWAY_SURFACES = {
  type: 'FeatureCollection' as const,
  features: [RUNWAY_01_19_POLYGON],
}

// Export key points for AircraftMarkers to use
export { RWY_POINT, RWY_SOUTH_HP, RWY_EXIT_SOUTH, RWY_EXIT_MID, RWY_EXIT_NORTH, RWY_NORTH_HP }
export { APRON_NORTH, APRON_CENTRAL, APRON_SOUTH }
export { PARALLEL_TWY_NORTH, PARALLEL_TWY_SOUTH }
