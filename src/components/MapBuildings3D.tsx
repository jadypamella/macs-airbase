import { Source, Layer } from 'react-map-gl/maplibre'
import buildingsData from '../data/base-buildings.json'

interface MapBuildings3DProps {
  visible: boolean
}

export function MapBuildings3D({ visible }: MapBuildings3DProps) {
  if (!visible) return null

  return (
    <Source id="base-buildings" type="geojson" data={buildingsData as GeoJSON.FeatureCollection}>
      <Layer
        id="buildings-3d"
        type="fill-extrusion"
        paint={{
          'fill-extrusion-color': [
            'match',
            ['get', 'type'],
            'tower', '#0e7490',
            'fuel', '#92400e',
            'bunker', '#991b1b',
            'hangar', '#1e40af',
            '#1e293b',
          ],
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.75,
        }}
      />
    </Source>
  )
}
