import { Marker } from 'react-map-gl/maplibre'
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid'

interface ThreatTrack {
  id: string
  bearing?: number
  altitudeFt?: number
  speedKnots?: number
  threatLevel: string
  lng: number
  lat: number
}

interface ThreatTracksProps {
  tracks: ThreatTrack[]
}

export function ThreatTracks({ tracks }: ThreatTracksProps) {
  return (
    <>
      {tracks.map(track => {
        const color = track.threatLevel === 'RED' ? '#ef4444' : '#f59e0b'
        return (
          <Marker key={track.id} latitude={track.lat} longitude={track.lng} anchor="center">
            <div className="animate-threat-blink">
              <div className="relative">
                <ExclamationTriangleIcon className="w-5 h-5" style={{ color }} />
                <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[7px] font-mono whitespace-nowrap" style={{ color }}>
                  {track.bearing ?? 0}° FL{Math.round((track.altitudeFt || 0) / 1000)}
                </div>
              </div>
            </div>
          </Marker>
        )
      })}
    </>
  )
}

export type { ThreatTrack }
