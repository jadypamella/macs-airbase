import { Source, Layer } from 'react-map-gl/maplibre'
import type { FillPaint, LinePaint } from 'maplibre-gl'
import baseZonesData from '../data/base-zones.json'

interface MapZonesProps {
  zoneStatuses: Record<string, string>
}

const STATUS_COLORS: Record<string, string> = {
  active: 'rgba(59, 130, 246, 0.06)',
  warning: 'rgba(245, 158, 11, 0.10)',
  critical: 'rgba(239, 68, 68, 0.15)',
  dispersal: 'rgba(139, 92, 246, 0.12)',
  safe: 'rgba(34, 197, 94, 0.04)',
}

const STATUS_BORDER_COLORS: Record<string, string> = {
  active: 'rgba(59, 130, 246, 0.3)',
  warning: 'rgba(245, 158, 11, 0.4)',
  critical: 'rgba(239, 68, 68, 0.5)',
  dispersal: 'rgba(139, 92, 246, 0.4)',
  safe: 'rgba(34, 197, 94, 0.15)',
}

export function MapZones({ zoneStatuses }: MapZonesProps) {
  // Update feature statuses
  const updatedData = {
    ...baseZonesData,
    features: baseZonesData.features.map(f => ({
      ...f,
      properties: {
        ...f.properties,
        status: zoneStatuses[f.properties.id] || f.properties.status,
      },
    })),
  }

  return (
    <Source id="base-zones" type="geojson" data={updatedData as GeoJSON.FeatureCollection}>
      <Layer
        id="zone-fill"
        type="fill"
        paint={{
          'fill-color': [
            'match', ['get', 'status'],
            'active', STATUS_COLORS.active,
            'warning', STATUS_COLORS.warning,
            'critical', STATUS_COLORS.critical,
            'dispersal', STATUS_COLORS.dispersal,
            'safe', STATUS_COLORS.safe,
            STATUS_COLORS.active,
          ],
          'fill-opacity': 1,
        } as FillPaint}
      />
      <Layer
        id="zone-border"
        type="line"
        paint={{
          'line-color': [
            'match', ['get', 'status'],
            'active', STATUS_BORDER_COLORS.active,
            'warning', STATUS_BORDER_COLORS.warning,
            'critical', STATUS_BORDER_COLORS.critical,
            'dispersal', STATUS_BORDER_COLORS.dispersal,
            'safe', STATUS_BORDER_COLORS.safe,
            STATUS_BORDER_COLORS.active,
          ],
          'line-width': 1.5,
          'line-dasharray': [4, 2],
        } as LinePaint}
      />
    </Source>
  )
}
