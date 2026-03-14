import { Source, Layer, Marker } from 'react-map-gl/maplibre'
import {
  ALL_RUNWAY_FEATURES,
  ALL_TAXIWAY_FEATURES,
  ALL_RUNWAY_SURFACES,
  HOLDING_POINTS,
  RWY01_THRESHOLD,
  RWY19_THRESHOLD,
} from '../data/runway-geometry'

export function RunwayRoutes() {
  return (
    <>
      {/* ── Runway surface (filled polygon with real width) ── */}
      <Source id="rwy-surface" type="geojson" data={ALL_RUNWAY_SURFACES as GeoJSON.FeatureCollection}>
        <Layer
          id="rwy-surface-fill"
          type="fill"
          paint={{
            'fill-color': 'rgba(200, 200, 200, 0.12)',
            'fill-opacity': 1,
          }}
        />
      </Source>

      {/* ── Runway centerlines ── */}
      <Source id="rwy-lines" type="geojson" data={ALL_RUNWAY_FEATURES as GeoJSON.FeatureCollection}>
        {/* Glow behind */}
        <Layer
          id="rwy-line-glow"
          type="line"
          paint={{
            'line-color': [
              'case',
              ['get', 'primary'], 'rgba(255, 255, 255, 0.08)',
              'rgba(255, 255, 255, 0.04)',
            ],
            'line-width': 12,
            'line-blur': 6,
          } as any}
        />
        {/* Solid centerline */}
        <Layer
          id="rwy-line-center"
          type="line"
          paint={{
            'line-color': [
              'case',
              ['get', 'primary'], 'rgba(255, 255, 255, 0.6)',
              'rgba(255, 255, 255, 0.25)',
            ],
            'line-width': [
              'case',
              ['get', 'primary'], 2.5,
              1.5,
            ],
          } as any}
        />
        {/* Dashed center marking (like real runway) */}
        <Layer
          id="rwy-line-dashes"
          type="line"
          paint={{
            'line-color': 'rgba(255, 255, 255, 0.4)',
            'line-width': 1,
            'line-dasharray': [6, 8],
          } as any}
          filter={['==', ['get', 'primary'], true]}
        />
      </Source>

      {/* ── Taxiway lines ── */}
      <Source id="twy-lines" type="geojson" data={ALL_TAXIWAY_FEATURES as GeoJSON.FeatureCollection}>
        {/* Taxiway glow */}
        <Layer
          id="twy-line-glow"
          type="line"
          paint={{
            'line-color': 'rgba(250, 204, 21, 0.06)',
            'line-width': 8,
            'line-blur': 4,
          }}
        />
        {/* Taxiway line */}
        <Layer
          id="twy-line-main"
          type="line"
          paint={{
            'line-color': 'rgba(250, 204, 21, 0.45)',
            'line-width': 1.5,
          }}
        />
        {/* Taxiway edge dashes */}
        <Layer
          id="twy-line-dash"
          type="line"
          paint={{
            'line-color': 'rgba(250, 204, 21, 0.25)',
            'line-width': 1,
            'line-dasharray': [3, 4],
          } as any}
        />
      </Source>

      {/* ── Runway threshold labels ── */}
      <Marker
        latitude={RWY01_THRESHOLD[1]}
        longitude={RWY01_THRESHOLD[0]}
        anchor="center"
      >
        <div className="flex flex-col items-center gap-0.5">
          <div className="px-1.5 py-0.5 bg-black/60 border border-white/20 rounded-sm">
            <span className="text-[8px] font-bold tracking-[0.2em] text-white/80">01</span>
          </div>
        </div>
      </Marker>

      <Marker
        latitude={RWY19_THRESHOLD[1]}
        longitude={RWY19_THRESHOLD[0]}
        anchor="center"
      >
        <div className="flex flex-col items-center gap-0.5">
          <div className="px-1.5 py-0.5 bg-black/60 border border-white/20 rounded-sm">
            <span className="text-[8px] font-bold tracking-[0.2em] text-white/80">19</span>
          </div>
        </div>
      </Marker>

      {/* ── Holding point markers ── */}
      {HOLDING_POINTS.map(hp => (
        <Marker
          key={hp.id}
          latitude={hp.position[1]}
          longitude={hp.position[0]}
          anchor="center"
        >
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400/70 ring-1 ring-amber-400/30" />
            <span className="text-[6px] font-bold tracking-wider text-amber-400/60 whitespace-nowrap">
              {hp.label}
            </span>
          </div>
        </Marker>
      ))}
    </>
  )
}
