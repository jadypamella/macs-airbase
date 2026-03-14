import { Marker } from 'react-map-gl/maplibre'
import { LOCATIONS } from '../data/locations'

interface PulseRing {
  id: string
  locationKey: string
  color: string
  createdAt: number
}

interface MapPulseProps {
  pulseRings: PulseRing[]
}

export function MapPulse({ pulseRings }: MapPulseProps) {
  return (
    <>
      {pulseRings.map(ring => {
        const loc = LOCATIONS[ring.locationKey]
        if (!loc) return null
        return (
          <Marker key={ring.id} latitude={loc.lat} longitude={loc.lng} anchor="center">
            <div
              className="w-6 h-6 rounded-full animate-pulse-ring"
              style={{ backgroundColor: `${ring.color}40`, borderColor: ring.color, borderWidth: 2 }}
            />
          </Marker>
        )
      })}
    </>
  )
}

export type { PulseRing }
