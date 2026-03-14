import { useEffect, useState } from 'react'
import { useMap } from 'react-map-gl/maplibre'
import { MAC_POSITIONS } from '../data/locations'

interface Arc {
  id: string
  fromId: string
  toId: string
  color: string
  createdAt: number
}

interface ConnectionArcsProps {
  arcs: Arc[]
}

export function ConnectionArcs({ arcs }: ConnectionArcsProps) {
  const { current: map } = useMap()
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})

  useEffect(() => {
    if (!map) return
    const update = () => {
      const pos: Record<string, { x: number; y: number }> = {}
      Object.entries(MAC_POSITIONS).forEach(([id, loc]) => {
        const p = map.project([loc.lng, loc.lat])
        pos[id] = { x: p.x, y: p.y }
      })
      setPositions(pos)
    }
    update()
    map.on('move', update)
    map.on('zoom', update)
    return () => { map.off('move', update); map.off('zoom', update) }
  }, [map])

  if (arcs.length === 0) return null

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      <defs>
        {arcs.map(arc => (
          <linearGradient key={`grad-${arc.id}`} id={`grad-${arc.id}`}>
            <stop offset="0%" stopColor={arc.color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={arc.color} stopOpacity="0.3" />
          </linearGradient>
        ))}
      </defs>
      {arcs.map(arc => {
        const from = positions[arc.fromId]
        const to = positions[arc.toId]
        if (!from || !to) return null
        const midX = (from.x + to.x) / 2
        const midY = Math.min(from.y, to.y) - 70
        const pathD = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`
        return (
          <path
            key={arc.id}
            d={pathD}
            fill="none"
            stroke={`url(#grad-${arc.id})`}
            strokeWidth="2"
            className="animate-arc-glow"
            style={{ filter: `drop-shadow(0 0 6px ${arc.color})` }}
          />
        )
      })}
    </svg>
  )
}

export type { Arc }
