import { Marker } from 'react-map-gl/maplibre'
import { useState, useCallback, useEffect } from 'react'
import { MAC_NAMES } from '../constants'
import { MAC_POSITIONS } from '../data/locations'
import type { AgentState } from '../constants'

const STORAGE_KEY = 'mac-marker-positions'

interface MapMacMarkersProps {
  agents: Record<string, AgentState>
  draggable?: boolean
}

function loadSaved(): Record<string, { lng: number; lat: number }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export function MapMacMarkers({ agents, draggable = false }: MapMacMarkersProps) {
  const [positions, setPositions] = useState<Record<string, { lng: number; lat: number }>>(() => {
    const saved = loadSaved()
    const init: Record<string, { lng: number; lat: number }> = {}
    Object.entries(MAC_POSITIONS).forEach(([id, pos]) => {
      init[id] = saved[id] || { lng: pos.lng, lat: pos.lat }
    })
    return init
  })

  // Save when drag mode is turned off
  useEffect(() => {
    if (!draggable) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(positions))
    }
  }, [draggable, positions])

  const handleDragEnd = useCallback((agentId: string, e: any) => {
    const { lng, lat } = e.lngLat
    setPositions(prev => ({ ...prev, [agentId]: { lng, lat } }))
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