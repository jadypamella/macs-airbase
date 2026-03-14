import { useEffect, useState } from 'react'
import { useMap } from 'react-map-gl/maplibre'
import { LOCATIONS } from '../data/locations'

interface RadarSweepProps {
  ewJamming: boolean
}

export function RadarSweep({ ewJamming }: RadarSweepProps) {
  const { current: map } = useMap()
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const radarLoc = LOCATIONS['radar-tower']

  useEffect(() => {
    if (!map) return
    const update = () => {
      const p = map.project([radarLoc.lng, radarLoc.lat])
      setPos({ x: p.x, y: p.y })
    }
    update()
    map.on('move', update)
    map.on('zoom', update)
    return () => { map.off('move', update); map.off('zoom', update) }
  }, [map, radarLoc.lng, radarLoc.lat])

  const sweepColor = ewJamming ? 'rgba(239,68,68,0.6)' : 'rgba(34,197,94,0.6)'
  const ringColor = ewJamming ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)'
  const animClass = ewJamming ? 'animate-radar-sweep-fast' : 'animate-radar-sweep'

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 5 }}>
      <svg
        width="320"
        height="320"
        viewBox="-160 -160 320 320"
        className={animClass}
        style={{
          position: 'absolute',
          left: pos.x - 160,
          top: pos.y - 160,
        }}
      >
        {[40, 80, 120, 160].map(r => (
          <circle key={r} cx="0" cy="0" r={r} fill="none" stroke={ringColor} strokeWidth="1" />
        ))}
        <line x1="0" y1="0" x2="0" y2="-150" stroke={sweepColor} strokeWidth="2" />
        <path
          d="M 0 0 L -20 -150 A 150 150 0 0 1 20 -150 Z"
          fill={sweepColor.replace('0.6', '0.15')}
        />
      </svg>
    </div>
  )
}
