import { Source, Layer } from 'react-map-gl/maplibre'
import { Marker } from 'react-map-gl/maplibre'
import { DISPERSAL_ROUTE_BRAVO, DISPERSAL_ROUTE_CHARLIE } from '../data/routes'
import { LOCATIONS } from '../data/locations'


interface DispersalRoutesProps {
  active: boolean
}

export function DispersalRoutes({ active }: DispersalRoutesProps) {
  if (!active) return null

  const bravoLoc = LOCATIONS['base-bravo']
  const charlieLoc = LOCATIONS['base-charlie']

  return (
    <>
      <Source id="route-bravo" type="geojson" data={DISPERSAL_ROUTE_BRAVO as GeoJSON.Feature}>
        <Layer
          id="route-bravo-line"
          type="line"
          paint={{
            'line-color': '#8b5cf6',
            'line-width': 3,
            'line-dasharray': [8, 4],
          } as any}
        />
      </Source>
      <Source id="route-charlie" type="geojson" data={DISPERSAL_ROUTE_CHARLIE as GeoJSON.Feature}>
        <Layer
          id="route-charlie-line"
          type="line"
          paint={{
            'line-color': '#06b6d4',
            'line-width': 3,
            'line-dasharray': [8, 4],
          } as any}
        />
      </Source>
      {/* Alternate base markers */}
      <Marker latitude={bravoLoc.lat} longitude={bravoLoc.lng} anchor="center">
        <div className="w-5 h-5 rounded-sm border-2 border-threat bg-threat/20 animate-pulse-ring" />
      </Marker>
      <Marker latitude={charlieLoc.lat} longitude={charlieLoc.lng} anchor="center">
        <div className="w-5 h-5 rounded-sm border-2 border-status-cyan bg-status-cyan/20 animate-pulse-ring" />
      </Marker>
    </>
  )
}
