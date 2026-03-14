import { Marker } from 'react-map-gl/maplibre'
import { Marker } from 'react-map-gl/maplibre'
import { MAC_NAMES } from '../constants'
import { MAC_POSITIONS } from '../data/locations'
import type { AgentState } from '../constants'

interface MapMacMarkersProps {
  agents: Record<string, AgentState>
}

export function MapMacMarkers({ agents }: MapMacMarkersProps) {
  const [positions, setPositions] = useState<Record<string, { lng: number; lat: number }>>(() => {
    const init: Record<string, { lng: number; lat: number }> = {}
    Object.entries(MAC_POSITIONS).forEach(([id, pos]) => {
      init[id] = { lng: pos.lng, lat: pos.lat }
    })
    return init
  })

  const handleDragEnd = useCallback((agentId: string, e: any) => {
    const { lng, lat } = e.lngLat
    setPositions(prev => ({ ...prev, [agentId]: { lng, lat } }))
    console.log(`MAC_POSITION ${agentId}: [${lng.toFixed(6)}, ${lat.toFixed(6)}]  // lng, lat`)
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
            draggable
            onDragEnd={(e) => handleDragEnd(agentId, e)}
          >
            <div className={`relative ${isOffline ? 'animate-agent-death' : ''}`}>
              <div
                className="w-8 h-8 flex items-center justify-center rounded-sm cursor-grab active:cursor-grabbing"
                style={{
                  backgroundColor: `${mac.color}20`,
                  border: `1.5px solid ${mac.color}`,
                  opacity: isOffline ? 0.3 : 1,
                }}
              >
                <Icon className="w-4 h-4" style={{ color: mac.color }} />
                {!isOffline && isActive && (
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
