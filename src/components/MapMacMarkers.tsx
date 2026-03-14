import { Marker } from 'react-map-gl/maplibre'
import { useState, useCallback, useEffect } from 'react'
import { MAC_NAMES } from '../constants'
import { MAC_POSITIONS } from '../data/locations'
import type { AgentState } from '../constants'

const STORAGE_KEY = 'mac-marker-positions'
const LON_MIN = 15.1
const LON_MAX = 15.55
const LAT_MIN = 56.15
const LAT_MAX = 56.42

interface MapMacMarkersProps {
  agents: Record<string, AgentState>
  draggable?: boolean
}

function toValidPosition(value: unknown): { lng: number; lat: number } | null {
  if (Array.isArray(value) && value.length >= 2) {
    const lng = Number(value[0])
    const lat = Number(value[1])
    if (Number.isFinite(lng) && Number.isFinite(lat) && lng >= LON_MIN && lng <= LON_MAX && lat >= LAT_MIN && lat <= LAT_MAX) {
      return { lng, lat }
    }
    return null
  }

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const lng = Number(obj.lng ?? obj.x)
    const lat = Number(obj.lat ?? obj.y)
    if (Number.isFinite(lng) && Number.isFinite(lat) && lng >= LON_MIN && lng <= LON_MAX && lat >= LAT_MIN && lat <= LAT_MAX) {
      return { lng, lat }
    }
  }

  return null
}

export function MapMacMarkers({ agents, draggable = false }: MapMacMarkersProps) {
  const [positions, setPositions] = useState<Record<string, { lng: number; lat: number }>>(() => {
    const init: Record<string, { lng: number; lat: number }> = {}
    Object.entries(MAC_POSITIONS).forEach(([id, pos]) => {
      init[id] = { lng: pos.lng, lat: pos.lat }
    })
    return init
  })

  const handleDragEnd = useCallback((agentId: string, e: any) => {
    const validPos = toValidPosition({ lng: e?.lngLat?.lng, lat: e?.lngLat?.lat })
    if (!validPos) return

    setPositions(prev => {
      const next = { ...prev, [agentId]: validPos }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      console.log(`MAC_POSITION ${agentId}: { lng: ${validPos.lng.toFixed(6)}, lat: ${validPos.lat.toFixed(6)} }`)
      return next
    })
  }, [])

  return (
    <>
      {Object.entries(positions).map(([agentId, pos]) => {
        const mac = MAC_NAMES[agentId]
        if (!mac) return null
        const agent = agents[agentId]
        const isOffline = agent?.status === 'offline'
        const isActive = agent?.status === 'active'
        const Icon = mac.Icon

        return (
          <Marker
            key={agentId}
            latitude={pos.lat}
            longitude={pos.lng}
            anchor="center"
            draggable={draggable}
            onDragEnd={(e) => handleDragEnd(agentId, e)}
          >
            <div className={`relative ${isOffline ? 'animate-agent-death' : ''}`}>
              <div
                className={`w-8 h-8 flex items-center justify-center rounded-sm ${draggable ? 'cursor-grab active:cursor-grabbing ring-1 ring-amber-400/50' : ''}`}
                style={{
                  backgroundColor: `${mac.color}20`,
                  border: `1.5px solid ${mac.color}`,
                  opacity: isOffline ? 0.3 : 1,
                }}
              >
                <Icon className="w-4 h-4" style={{ color: mac.color }} />
                {!isOffline && isActive && !draggable && (
                  <div
                    className="absolute inset-0 rounded-sm animate-pulse-ring"
                    style={{ borderColor: mac.color, borderWidth: 1 }}
                  />
                )}
              </div>
              <div
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[7px] font-bold tracking-wider whitespace-nowrap"
                style={{ color: mac.color }}
              >
                {mac.nameSv}
              </div>
            </div>
          </Marker>
        )
      })}
    </>
  )
}
