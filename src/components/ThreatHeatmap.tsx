import { useMemo } from 'react'
import { Source, Layer } from 'react-map-gl/maplibre'
import { LOCATIONS } from '../data/locations'
import type { SwarmEvent } from '../constants'

interface ThreatHeatmapProps {
  events: SwarmEvent[]
}

const SEVERITY_WEIGHT: Record<string, number> = {
  CRITICAL: 1.0,
  HIGH: 0.7,
  AMBER: 0.5,
  MEDIUM: 0.3,
  LOW: 0.1,
}

export function ThreatHeatmap({ events }: ThreatHeatmapProps) {
  const geojson = useMemo<GeoJSON.FeatureCollection>(() => {
    const tl = LOCATIONS['threat-vector']
    const threatEvents = events.filter(
      e => e.event_type === 'RADAR_CONTACT' || e.event_type === 'THREAT_ESCALATION'
    )

    const features: GeoJSON.Feature[] = threatEvents.map((e, i) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [
          tl.lng + (Math.sin(i * 1.7) * 0.04),
          tl.lat + (Math.cos(i * 2.3) * 0.025),
        ],
      },
      properties: {
        weight: SEVERITY_WEIGHT[e.severity] || 0.3,
      },
    }))

    return { type: 'FeatureCollection', features }
  }, [events])

  if (geojson.features.length === 0) return null

  return (
    <Source id="threat-heatmap" type="geojson" data={geojson}>
      <Layer
        id="threat-heat"
        type="heatmap"
        paint={{
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': [
            'interpolate', ['linear'], ['zoom'],
            10, 0.8,
            15, 1.5,
          ],
          'heatmap-radius': [
            'interpolate', ['linear'], ['zoom'],
            10, 30,
            15, 60,
          ],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, 'rgba(254,240,138,0.4)',
            0.4, 'rgba(251,191,36,0.6)',
            0.6, 'rgba(245,158,11,0.7)',
            0.8, 'rgba(239,68,68,0.8)',
            1, 'rgba(220,38,38,0.9)',
          ],
          'heatmap-opacity': [
            'interpolate', ['linear'], ['zoom'],
            12, 0.8,
            16, 0.4,
          ],
        }}
      />
    </Source>
  )
}
